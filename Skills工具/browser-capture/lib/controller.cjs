'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { normalizeProvider } = require('./providers/index.cjs');
const { normalizeMode } = require('./modes.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const defaultRoot = () => path.join(os.homedir(), 'browser-captures');

function paths(options) {
  const provider = normalizeProvider(options.provider);
  const root = path.resolve(options.stateRoot || defaultRoot());
  const controlDir = path.join(root, 'controllers', `${provider}-window-${options.windowSeq}`);
  return {
    provider,
    root,
    controlDir,
    lock: path.join(controlDir, 'controller.lock'),
    activation: path.join(controlDir, 'activation.json'),
    status: path.join(controlDir, 'status.json'),
    stop: path.join(controlDir, 'stop.request'),
    commands: path.join(controlDir, 'commands'),
  };
}

const backoff = new Int32Array(new SharedArrayBuffer(4));
function retryIo(work) {
  for (let n = 0; ; n++) {
    try { return work(); }
    catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code) || n >= 8) throw e;
      Atomics.wait(backoff, 0, 0, Math.min(5 * 2 ** n, 50));
    }
  }
}

function readJson(file) {
  try { return JSON.parse(retryIo(() => fs.readFileSync(file, 'utf8'))); }
  catch (e) { if (e.code === 'ENOENT' || e instanceof SyntaxError) return null; throw e; }
}

function atomic(file, value) {
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  try { retryIo(() => fs.renameSync(temp, file)); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}

function alive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code === 'EPERM'; }
}

function status(options) {
  const p = paths(options);
  const s = readJson(p.status);
  const l = readJson(p.lock);
  if (!s || (l && s.runId !== l.runId)) {
    return {
      provider: p.provider,
      windowSeq: options.windowSeq,
      phase: l ? 'starting' : 'inactive',
      active: !!l && alive(l.pid),
      collectorArmed: false,
      navigationSent: false,
      documentHookObserved: false,
      runId: l?.runId || null,
    };
  }
  return {
    provider: p.provider,
    ...s,
    active: !!l && l.runId === s.runId && alive(l.pid) && !['stopped', 'failed'].includes(s.phase),
  };
}

function release(p, runId) {
  if (readJson(p.lock)?.runId === runId) retryIo(() => fs.unlinkSync(p.lock));
}

function acquire(options) {
  const p = paths(options);
  fs.mkdirSync(p.commands, { recursive: true });
  const l = { runId: randomUUID(), pid: process.pid, provider: p.provider, windowSeq: options.windowSeq, at: new Date().toISOString() };
  const create = () => {
    const fd = fs.openSync(p.lock, 'wx');
    fs.writeFileSync(fd, JSON.stringify(l));
    fs.closeSync(fd);
    return { ...p, ...l };
  };
  try { return create(); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  const old = readJson(p.lock);
  if (!old || alive(old.pid)) return null; // Partial lock publication is occupied, not stale.
  const gate = path.join(p.controlDir, 'recovery.lock');
  let fd;
  try { fd = fs.openSync(gate, 'wx'); } catch (e) { if (e.code === 'EEXIST') return null; throw e; }
  try {
    if (alive(readJson(p.lock)?.pid)) return null;
    if (fs.existsSync(p.lock)) fs.unlinkSync(p.lock);
    return create();
  } finally {
    fs.closeSync(fd);
    fs.unlinkSync(gate);
  }
}

async function waitFor(predicate, timeoutMs = 30000) {
  const until = Date.now() + timeoutMs;
  do {
    const value = await predicate();
    if (value) return value;
    await sleep(75);
  } while (Date.now() < until);
  throw Object.assign(Error('Controller acknowledgement timed out; inspect status and worker log'), { code: 'CONTROLLER_TIMEOUT' });
}

async function stop(options) {
  const p = paths(options);
  const lock = readJson(p.lock);
  if (!lock || !alive(lock.pid)) {
    return { ...status(options), stopped: true, stopResult: readJson(p.status)?.stopResult || null };
  }
  atomic(p.stop, { runId: lock.runId, requestedAt: new Date().toISOString() });
  return waitFor(() => {
    const s = readJson(p.status);
    return s?.runId === lock.runId && ['stopped', 'failed'].includes(s.phase) && s.stopResult
      ? { provider: p.provider, ...s, active: false }
      : null;
  }, 60000);
}

async function start(options) {
  const provider = normalizeProvider(options.provider);
  const mode = normalizeMode(options.mode, 'standard');
  const normalized = { ...options, provider, mode };
  if (normalized.restart) await stop(normalized);
  const held = acquire(normalized);
  if (!held) return status(normalized);
  const p = paths(normalized);
  const runDir = path.join(
    path.resolve(normalized.outDir || path.join(p.root, 'runs')),
    `${provider}-window-${normalized.windowSeq}`,
    held.runId,
  );
  const activation = {
    ...normalized,
    provider,
    mode,
    runId: held.runId,
    runDir,
    controlDir: p.controlDir,
    requestedAt: new Date().toISOString(),
  };
  try {
    atomic(p.activation, activation);
    atomic(p.status, {
      provider,
      mode,
      runId: held.runId,
      runDir,
      windowSeq: normalized.windowSeq,
      phase: 'starting',
      collectorArmed: false,
      navigationSent: false,
      documentHookObserved: false,
    });
    const log = fs.openSync(path.join(p.controlDir, `worker-${held.runId}.log`), 'a');
    let child;
    try {
      child = spawn(process.execPath, [path.join(__dirname, '..', 'bin', 'worker.cjs'), p.activation], {
        detached: true,
        windowsHide: true,
        stdio: ['ignore', log, log],
      });
    } finally {
      fs.closeSync(log);
    }
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
    atomic(p.lock, { ...held, pid: child.pid });
    child.unref();
  } catch (e) {
    release(p, held.runId);
    throw e;
  }
  return waitFor(() => {
    const s = readJson(p.status);
    if (s?.runId !== held.runId) return null;
    if (s.phase === 'failed') {
      throw Object.assign(Error('Collector startup failed; inspect worker log/status'), { code: s.errorCode || 'START_FAILED' });
    }
    return s.phase === 'running' ? { provider, mode, ...s, active: true } : null;
  }, 120000);
}

async function sendWorkerCommand(options, command, payload = {}, timeoutMs = 90000) {
  const p = paths(options);
  const s = status(options);
  if (!s.active || !s.collectorArmed) throw Error('Start the collector first');
  const id = randomUUID();
  const reply = path.join(p.commands, `${id}.reply.json`);
  atomic(path.join(p.commands, `${id}.request.json`), { id, runId: s.runId, command, ...payload });
  const result = await waitFor(() => readJson(reply), timeoutMs);
  if (result.error) throw Object.assign(Error(result.error), { code: result.code });
  return { ...result, provider: p.provider, runId: s.runId, runDir: s.runDir };
}

async function newTab(options) {
  return sendWorkerCommand(options, 'new-tab', { url: options.url }, 90000);
}

async function metrics(options) {
  return sendWorkerCommand(options, 'metrics', { targetId: options.targetId || null }, 30000);
}

async function memorySample(options) {
  const durationMs = Number(options.durationMs) || 3000;
  return sendWorkerCommand(
    options,
    'memory-sample',
    { targetId: options.targetId || null, durationMs, force: !!options.force },
    Math.max(durationMs + 30000, 45000),
  );
}

async function heapSnapshot(options) {
  return sendWorkerCommand(
    options,
    'heap-snapshot',
    { targetId: options.targetId || null, force: !!options.force },
    120000,
  );
}

module.exports = {
  paths,
  readJson,
  atomic,
  alive,
  status,
  acquire,
  release,
  waitFor,
  start,
  stop,
  newTab,
  metrics,
  memorySample,
  heapSnapshot,
  defaultRoot,
};
