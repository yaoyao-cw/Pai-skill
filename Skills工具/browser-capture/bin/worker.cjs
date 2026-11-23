#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { CdpClient, commandDiagnostic } = require('../lib/cdp-client.cjs');
const { Collector } = require('../lib/collector.cjs');
const { resolveBrowserConnection } = require('../lib/providers/index.cjs');
const { normalizeMode } = require('../lib/modes.cjs');
const { paths, readJson, atomic, release } = require('../lib/controller.cjs');

async function main(file) {
  const a = readJson(file); if (!a) throw Error('Activation missing');
  const p = paths(a); if (readJson(p.lock)?.runId !== a.runId) throw Error('Activation ownership lost');
  const mode = normalizeMode(a.mode, 'standard');
  let state = {
    provider: p.provider,
    mode,
    runId: a.runId,
    runDir: a.runDir,
    windowSeq: a.windowSeq,
    pid: process.pid,
    phase: 'starting',
    collectorArmed: false,
    navigationSent: false,
    documentHookObserved: false,
    startedAt: new Date().toISOString(),
  };
  const update = values => { state = { ...state, ...values, updatedAt: new Date().toISOString() }; atomic(p.status, state); };
  let client, collector, timer, stopPromise, busy = false, stopping = false, startup = true;
  const interrupted = () => { if (stopping || readJson(p.stop)?.runId === a.runId) throw Object.assign(Error('Stop requested'), { code: 'STOP_REQUESTED' }); };

  function finish(reason, error) {
    if (stopPromise) return stopPromise;
    stopping = true; clearInterval(timer);
    stopPromise = (async () => {
      update({ phase: 'stopping', collectorArmed: false });
      let result;
      try {
        result = collector
          ? await collector.stop(reason)
          : { mode, streamsClosed: null, dataFlushed: null, cleanupComplete: null, captureStatus: 'not-started', dataStreams: { state: 'not-established-or-partial-construction' } };
      } catch (e) {
        error ||= e;
        result = { mode, streamsClosed: false, dataFlushed: false, cleanupComplete: false, captureStatus: 'incomplete', code: e.code || 'STOP_FAILED' };
      }
      client?.close();
      result.metadataWritten = false; result.metadataWrite = { status: 'not_run' };
      try {
        fs.mkdirSync(a.runDir, { recursive: true });
        const metadata = {
          ...a,
          provider: p.provider,
          mode,
          url: undefined,
          apiUrl: undefined,
          wsUrl: undefined,
          stateRoot: undefined,
          stopResult: { ...result, metadataWritten: true, metadataWrite: { status: 'succeeded' } },
          stoppedAt: new Date().toISOString(),
        };
        const meta = path.join(a.runDir, 'summary.json');
        const fd = fs.openSync(meta, 'wx');
        try { fs.writeFileSync(fd, JSON.stringify(metadata, null, 2) + '\n'); fs.fsyncSync(fd); }
        finally { fs.closeSync(fd); }
        result.metadataWritten = true; result.metadataWrite = { status: 'succeeded' };
      } catch (e) {
        result.metadataWrite = { status: 'failed', code: e.code || 'OUTPUT_ERROR' };
        error ||= e;
      }
      update({
        phase: error ? 'failed' : 'stopped',
        collectorArmed: false,
        stopResult: result,
        stoppedAt: new Date().toISOString(),
        ...(error ? { errorCode: error.code || 'CAPTURE_FAILED' } : {}),
      });
      release(p, a.runId);
      process.exitCode = error ? 1 : 0;
      return result;
    })();
    return stopPromise;
  }

  async function executeCommand(request) {
    if (request.command === 'new-tab') return collector.newTab(request.url);
    if (request.command === 'metrics') return collector.metrics({ targetId: request.targetId });
    if (request.command === 'memory-sample') {
      return collector.memorySample({ targetId: request.targetId, durationMs: request.durationMs, force: !!request.force });
    }
    if (request.command === 'heap-snapshot') {
      return collector.heapSnapshot({ targetId: request.targetId, force: !!request.force });
    }
    throw Object.assign(Error(`Unknown worker command: ${request.command}`), { code: 'UNKNOWN_COMMAND' });
  }

  async function tick() {
    if (busy || stopping) return; busy = true;
    try {
      if (readJson(p.stop)?.runId === a.runId) { await finish('stop.request'); return; }
      if (!collector?.state.collectorArmed) return;
      for (const name of fs.readdirSync(p.commands).filter(n => n.endsWith('.request.json'))) {
        const requestFile = path.join(p.commands, name); const request = readJson(requestFile);
        if (!request || request.runId !== a.runId) continue;
        const replyFile = requestFile.replace(/\.request\.json$/, '.reply.json');
        if (fs.existsSync(replyFile)) continue;
        let reply;
        try { reply = await executeCommand(request); }
        catch (e) { reply = { error: e.message || 'Worker command failed; inspect coverage.jsonl', code: e.code || 'WORKER_COMMAND_FAILED' }; }
        atomic(replyFile, reply);
      }
    } catch (e) {
      await finish('worker-control-failed', e);
    } finally {
      busy = false;
    }
  }

  const signal = () => {
    atomic(p.stop, { runId: a.runId, requestedAt: new Date().toISOString(), reason: 'signal' });
    if (!startup) void finish('signal');
  };
  process.on('SIGINT', signal); process.on('SIGTERM', signal);

  try {
    interrupted();
    const connection = await resolveBrowserConnection(a);
    interrupted();
    if (connection.profileMeta) update(connection.profileMeta);
    client = new CdpClient(connection.wsUrl, { timeoutMs: 5000 });
    await client.connect();
    interrupted();
    collector = new Collector({
      client,
      outDir: a.runDir,
      runId: a.runId,
      mode,
      hooks: a.hooks,
      asyncDepth: a.asyncDepth,
      stripDebugger: !!a.stripDebugger,
      stripScriptDebugger: !!a.stripScriptDebugger,
      withRuntime: !!a.withRuntime,
      overrideFile: a.overrideFile || null,
      onState: values => update(values),
    });
    collector.onFatal = error => { if (!stopping) void finish('collector-failed', error); };
    await collector.start();
    interrupted();
    // Always create our own blank tab. Existing user tabs are never navigated or refreshed.
    const tab = await collector.newTab(a.url);
    interrupted();
    update({
      phase: 'running',
      initialTargetId: tab.targetId,
      navigationSent: tab.navigationSent,
      navigationAcknowledged: tab.navigationAcknowledged,
      loaded: 'not-asserted',
    });
    startup = false;
    timer = setInterval(() => { void tick(); }, 150);
    await tick();
  } catch (e) {
    if (e.code !== 'STOP_REQUESTED') console.error(JSON.stringify({ phase: 'worker-error', ...commandDiagnostic(e) }));
    await finish(e.code === 'STOP_REQUESTED' ? 'stop.request-during-startup' : 'startup-failed', e.code === 'STOP_REQUESTED' ? undefined : e);
  }
}

if (require.main === module) {
  main(process.argv[2]).catch(e => { console.error(e.code || e.message); process.exitCode = 1; });
}
module.exports = { main };
