'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { Collector } = require('../lib/collector.cjs');
const { installHookForSession, createPageHookRuntime } = require('../lib/page-hook.cjs');
const { resolveProfile, resolveBrowserConnection } = require('../lib/providers/index.cjs');
const control = require('../lib/controller.cjs');
const { parse } = require('../bin/capture.cjs');

// No test in this file uses a browser, local API, account or live website.
globalThis.fetch = () => { throw Error('OFFLINE_ONLY'); };
globalThis.WebSocket = class { constructor() { throw Error('OFFLINE_ONLY'); } };

const tick = () => new Promise(r => setImmediate(r));
function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-capture-test-'));
  const real = fs.realpathSync(dir);
  t.after(() => {
    assert.equal(fs.realpathSync(dir), real);
    assert.equal(path.dirname(real), fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(real), /^browser-capture-test-/);
    fs.rmSync(real, { recursive: true });
  });
  return dir;
}

class Fake extends EventEmitter {
  constructor() { super(); this.calls = []; this.infos = []; this.counter = 0; this.hooks = new Map(); }
  emitTarget(info, waiting = true) {
    const id = 's-' + info.targetId;
    this.emit('event', { method: 'Target.attachedToTarget', params: { sessionId: id, targetInfo: info, waitingForDebugger: waiting } });
    return id;
  }
  async send(method, params = {}, sid) {
    this.calls.push({ method, params, sid });
    if (this.override) { const value = this.override(method, params, sid); if (value !== undefined) return value; }
    if (method === 'Target.getTargets') return { targetInfos: this.infos };
    if (method === 'Target.createTarget') {
      const info = { targetId: 'new' + ++this.counter, type: 'page', url: params.url };
      this.infos.push(info); this.emitTarget(info); return { targetId: info.targetId };
    }
    if (method === 'Target.attachToTarget') {
      const info = this.infos.find(i => i.targetId === params.targetId);
      const s = this.emitTarget(info || { targetId: params.targetId, type: 'page' }, false);
      return { sessionId: s };
    }
    if (method === 'Page.addScriptToEvaluateOnNewDocument') return { identifier: 'script-' + sid };
    if (method === 'Runtime.evaluate') return { result: { value: { installed: true, ready: true } } };
    return {};
  }
}

async function fakeInstall(client, sid, options) {
  await client.send('Runtime.addBinding', { name: options.bindingName }, sid);
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: 'offline' }, sid);
  const h = { registered: true, uninstall: async () => { await client.send('TEST.uninstall', {}, sid); return { cleanupComplete: true }; } };
  options.onHandle?.(h); client.hooks.set(sid, options); return h;
}

async function fixture(t, options = {}) {
  const root = temp(t);
  const client = options.client || new Fake();
  const collector = new Collector({ client, outDir: path.join(root, 'run'), installHook: options.installHook || fakeInstall });
  await collector.start();
  t.after(async () => { await collector.stop(); });
  return { root, client, collector };
}

function index(client, method, sid) {
  return client.calls.findIndex(c => c.method === method && (sid === undefined || c.sid === sid));
}
async function settle(collector) { while (collector.tasks.size) await Promise.all([...collector.tasks]); }

test('first-hop blank -> Network -> binding -> document-start -> resume -> navigate; navigation acknowledgement does not block', async t => {
  const { client, collector } = await fixture(t);
  client.override = method => method === 'Page.navigate' ? new Promise(() => {}) : undefined;
  const tab = await collector.newTab('https://arbitrary.example/a'); const sid = 's-' + tab.targetId;
  assert.equal(tab.navigationSent, true); assert.equal(tab.navigationAcknowledged, false);
  assert.equal(client.calls.find(c => c.method === 'Target.createTarget').params.url, 'about:blank');
  const positions = ['Network.enable', 'Runtime.addBinding', 'Page.addScriptToEvaluateOnNewDocument', 'Runtime.runIfWaitingForDebugger', 'Page.navigate'].map(m => index(client, m, sid));
  assert.ok(positions.every(i => i >= 0)); assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  collector.navigationTasks.clear();
});

test('browser-level listener installed before autoattach; Ctrl+T page with no opener or context is selected', async t => {
  const client = new Fake(); let listenerSeen = false;
  client.override = (m, p, sid) => {
    if (m === 'Target.setAutoAttach' && !sid && p.autoAttach) {
      listenerSeen ||= client.listenerCount('event') > 0;
      client.emitTarget({ targetId: 'ctrlT', type: 'page', url: 'about:blank', browserContextId: 'default-not-root' });
    }
  };
  const { collector } = await fixture(t, { client }); await settle(collector);
  assert.equal(listenerSeen, true); assert.equal(collector.targets.get('ctrlT').hookRegistered, true);
  const rootAuto = client.calls.find(c => c.method === 'Target.setAutoAttach' && !c.sid);
  assert.equal(rootAuto.params.waitForDebuggerOnStart, true); assert.equal(rootAuto.params.flatten, true);
});

test('cross-domain navigation retains selected session; all HTTP paths enabled', async t => {
  const { client, collector } = await fixture(t);
  client.emitTarget({ targetId: 'cross', type: 'page', url: 'https://one.example/' }); await settle(collector);
  client.emit('event', { method: 'Target.targetInfoChanged', params: { targetInfo: { targetId: 'cross', type: 'page', url: 'https://two.example/free/path' } } });
  assert.equal(collector.targets.get('cross').info.url, 'https://two.example/free/path');
  const options = client.hooks.get('s-cross'); assert.equal(options.filter.sameOrigin, false); assert.equal(options.filter.captureAllPaths, true);
  client.emit('event', { method: 'Network.requestWillBeSent', sessionId: 's-cross', params: { requestId: 'x', request: { url: 'https://third.example/not-api', method: 'GET', headers: {} }, timestamp: 1 } });
  assert.equal(collector.recorder.eventSeq, 1);
});

test('worker and unsupported Network domain always resume, without document evaluation', async t => {
  const client = new Fake();
  client.override = (m, p, sid) => { if (m === 'Network.enable' && sid === 's-worker') return Promise.reject(Object.assign(Error('unsupported'), { code: -32601 })); };
  const { collector, root } = await fixture(t, { client });
  client.emitTarget({ targetId: 'worker', type: 'worker', url: 'blob:https://any.example/id' }); await settle(collector);
  assert.ok(index(client, 'Runtime.runIfWaitingForDebugger', 's-worker') >= 0);
  assert.equal(index(client, 'Page.addScriptToEvaluateOnNewDocument', 's-worker'), -1);
  assert.match(fs.readFileSync(path.join(root, 'run', 'coverage.jsonl'), 'utf8'), /CDP-only/);
});

test('hook registration failure still resumes paused page', async t => {
  const { client, collector } = await fixture(t, { installHook: async () => { throw Error('synthetic install failure'); } });
  client.emitTarget({ targetId: 'fail', type: 'page', url: 'https://f.example/' }); await settle(collector);
  assert.ok(index(client, 'Runtime.runIfWaitingForDebugger', 's-fail') >= 0);
  assert.equal(collector.targets.get('fail').hookRegistered, false);
});

test('actual vendored installer deferred mode registers without evaluating paused target', async () => {
  const client = new Fake();
  const hook = await installHookForSession(client, 'paused', { deferCurrentEvaluation: true, onRecord: () => {}, filter: { sameOrigin: false, captureAllPaths: true } });
  assert.equal(hook.registered, true); assert.equal(hook.ready, false); assert.equal(index(client, 'Runtime.evaluate', 'paused'), -1);
  assert.equal(client.calls.find(c => c.method === 'Page.addScriptToEvaluateOnNewDocument').params.runImmediately, true);
  client.override = m => m === 'Runtime.evaluate' ? { result: { value: { deactivated: true, restored: {} } } } : undefined;
  await hook.uninstall();
});

test('duplicate auto/manual attachment resumes extra session before detach', async t => {
  const { client, collector } = await fixture(t);
  const info = { targetId: 'dup', type: 'page', url: 'about:blank' };
  client.emitTarget(info); await settle(collector);
  client.emit('event', { method: 'Target.attachedToTarget', params: { sessionId: 'duplicate-session', targetInfo: info, waitingForDebugger: true } }); await settle(collector);
  const resume = index(client, 'Runtime.runIfWaitingForDebugger', 'duplicate-session');
  const detach = client.calls.findIndex(c => c.method === 'Target.detachFromTarget' && c.params.sessionId === 'duplicate-session');
  assert.ok(resume >= 0 && detach > resume);
});

test('stop quiesces and removes live wrappers before autoattach:false; late paused target is resumed', async t => {
  const { client, collector } = await fixture(t);
  client.emitTarget({ targetId: 'live', type: 'page', url: 'https://any.example/' }); await settle(collector);
  client.override = (m, p, sid) => {
    if (m === 'Target.setAutoAttach' && !sid && p.autoAttach && p.waitForDebuggerOnStart === false) {
      client.emitTarget({ targetId: 'late', type: 'page', url: 'about:blank' });
    }
  };
  const result = await collector.stop();
  const uninstall = index(client, 'TEST.uninstall', 's-live');
  const disable = client.calls.findIndex(c => c.method === 'Target.setAutoAttach' && c.params.autoAttach === false);
  assert.ok(disable > uninstall && uninstall >= 0); assert.ok(index(client, 'Runtime.runIfWaitingForDebugger', 's-late') >= 0);
  assert.equal(result.streamsClosed, true); assert.equal(result.dataFlushed, true); assert.equal(result.cleanupComplete, true);
});

test('hook_ready observation is separate from registration and includes document metadata', async t => {
  const { client, collector } = await fixture(t);
  client.emitTarget({ targetId: 'observed', type: 'page', url: 'about:blank' }); await settle(collector);
  assert.equal(collector.state.documentHookObserved, false);
  client.hooks.get('s-observed').onRecord({ phase: 'hook_ready', documentId: 'document-a', sessionId: 's-observed' });
  assert.equal(collector.state.documentHookObserved, true);
});

test('bitbrowser profile seq resolution paginates and verifies detail; explicit mismatched id rejected', async () => {
  const requests = [];
  const requestJson = async (url, init) => {
    const b = JSON.parse(init.body); requests.push([new URL(url).pathname, b]);
    if (url.endsWith('/browser/list')) return { success: true, data: { list: [{ id: 'correct', seq: 1030 }], total: 1 } };
    return { success: true, data: { id: b.id, seq: b.id === 'wrong' ? 1031 : 1030 } };
  };
  assert.deepEqual(await resolveProfile({ provider: 'bitbrowser', windowSeq: 1030, requestJson }), { provider: 'bitbrowser', browserId: 'correct', windowSeq: 1030 });
  await assert.rejects(resolveProfile({ provider: 'bitbrowser', windowSeq: 1030, browserId: 'wrong', requestJson }), { code: 'WINDOW_SEQ_MISMATCH' });
  assert.equal(requests[0][0], '/browser/list');
});

test('bitbrowser restart closes and reopens only resolved profile with blank process argument', async () => {
  const calls = [];
  const requestJson = async (url, init) => {
    const route = new URL(url).pathname; const b = init?.body ? JSON.parse(init.body) : {}; calls.push([route, b]);
    if (route === '/json/version') return { webSocketDebuggerUrl: 'ws://127.0.0.1:23456/devtools/browser/test' };
    if (route === '/browser/detail') return { success: true, data: { id: 'selected', seq: 1030 } };
    if (route === '/browser/ports') return { success: true, data: { selected: 23456, other: 23457 } };
    if (route === '/browser/open') return { success: true, data: { http: '127.0.0.1:23456' } };
    return { success: true, data: {} };
  };
  await resolveBrowserConnection({ provider: 'bitbrowser', windowSeq: 1030, browserId: 'selected', restart: true, requestJson });
  assert.deepEqual(calls.filter(([r]) => ['/browser/close', '/browser/open'].includes(r)).map(([r, b]) => [r, b.id]), [['/browser/close', 'selected'], ['/browser/open', 'selected']]);
  assert.deepEqual(calls.find(([r]) => r === '/browser/open')[1].args, ['about:blank']);
});

test('persistent same-window lock returns active run; different windows and different providers are isolated', async t => {
  const root = temp(t);
  const bbA = { provider: 'bitbrowser', stateRoot: root, windowSeq: 1030 };
  const bbB = { provider: 'bitbrowser', stateRoot: root, windowSeq: 1031 };
  const adsSameNum = { provider: 'adspower', stateRoot: root, windowSeq: 1030 };

  const first = control.acquire(bbA); assert.ok(first);
  assert.equal(control.acquire(bbA), null);
  assert.ok(control.acquire(bbB));
  const adsLock = control.acquire(adsSameNum);
  assert.ok(adsLock, 'Same window number under another provider must acquire independently');
  assert.notEqual(control.paths(bbA).controlDir, control.paths(adsSameNum).controlDir);

  control.atomic(control.paths(bbA).status, { provider: 'bitbrowser', runId: first.runId, runDir: 'bb-only', phase: 'running', collectorArmed: true });
  control.atomic(control.paths(adsSameNum).status, { provider: 'adspower', runId: adsLock.runId, runDir: 'ads-only', phase: 'running', collectorArmed: true });

  const again = await control.start(bbA);
  assert.equal(again.runDir, 'bb-only'); assert.equal(again.runId, first.runId);
  assert.equal(control.status(bbB).runDir, undefined);
  assert.equal(control.status(adsSameNum).runDir, 'ads-only');

  control.release(control.paths(bbA), first.runId);
  assert.equal(fs.existsSync(control.paths(bbB).lock), true);
  assert.equal(fs.existsSync(control.paths(adsSameNum).lock), true);
});

test('stop request carries matching runId and waits for graceful five-field result without killing', async t => {
  const root = temp(t);
  const a = { provider: 'adspower', stateRoot: root, windowSeq: 12 };
  const l = control.acquire(a); const p = control.paths(a);
  control.atomic(p.status, { provider: 'adspower', runId: l.runId, phase: 'running', collectorArmed: true });
  const promise = control.stop(a); assert.equal(control.readJson(p.stop).runId, l.runId);
  const stopResult = { streamsClosed: true, dataFlushed: true, cleanupComplete: true, metadataWritten: true, captureStatus: 'complete' };
  control.atomic(p.status, { provider: 'adspower', runId: l.runId, phase: 'stopped', stopResult });
  assert.deepEqual((await promise).stopResult, stopResult);
});

test('same browser data never enters another endpoint collector output', async t => {
  const root = temp(t); const ca = new Fake(); const cb = new Fake();
  const a = new Collector({ client: ca, outDir: path.join(root, 'a'), installHook: fakeInstall });
  const b = new Collector({ client: cb, outDir: path.join(root, 'b'), installHook: fakeInstall });
  await a.start(); await b.start();
  ca.emitTarget({ targetId: 'a', type: 'page', url: 'about:blank' });
  cb.emitTarget({ targetId: 'b', type: 'page', url: 'about:blank' });
  await settle(a); await settle(b);
  ca.emit('event', { method: 'Network.requestWillBeSent', sessionId: 's-a', params: { requestId: 'a', request: { url: 'https://only-a.example/', method: 'GET' }, timestamp: 1 } });
  await a.stop(); await b.stop();
  assert.match(fs.readFileSync(path.join(root, 'a', 'raw.jsonl'), 'utf8'), /only-a/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'b', 'raw.jsonl'), 'utf8'), /only-a/);
});

test('CLI validates provider, window, URL scheme and loopback API', () => {
  assert.equal(parse(['start', '--provider', 'bitbrowser', '--window', '1030']).windowSeq, 1030);
  assert.equal(parse(['start', '-p', 'ads', '--window', '12']).provider, 'adspower');
  assert.throws(() => parse(['start', '--window', '1030']), { code: 'INVALID_PROVIDER' });
  assert.throws(() => parse(['start', '--provider', 'bitbrowser', '--window', '0']), { code: 'INVALID_WINDOW' });
  assert.throws(() => parse(['start', '--provider', 'bitbrowser', '--window', '1030', '--api-url', 'https://remote.example']));
  assert.throws(() => parse(['new-tab', '--provider', 'adspower', '--window', '12', '--url', 'javascript:1']));
  assert.match(createPageHookRuntime({ filter: { sameOrigin: false, captureAllPaths: true } }), /captureAllPaths/);
});

test('browser autoattach selects tab containers and pages with separate domain handling; disabled autoattach omits filter', async t => {
  const { client, collector } = await fixture(t);
  const auto = client.calls.find(c => c.method === 'Target.setAutoAttach' && !c.sid);
  assert.equal(auto.params.filter.some(f => f.type === 'page' && f.exclude === false), false);
  assert.equal(auto.params.filter.some(f => f.type === 'tab' && f.exclude === false), true);
  client.emitTarget({ targetId: 'renderer', type: 'page', url: 'about:blank' }, true); await settle(collector);
  assert.ok(index(client, 'Page.addScriptToEvaluateOnNewDocument', 's-renderer') < index(client, 'Runtime.runIfWaitingForDebugger', 's-renderer'));
  await collector.stop();
  assert.ok(client.calls.filter(c => c.method === 'Target.setAutoAttach' && c.params.autoAttach === false).every(c => !Object.hasOwn(c.params, 'filter')));
});

test('duplicate paused target cannot resume before canonical hook registration completes', async t => {
  let release; const gate = new Promise(r => { release = r; }); const client = new Fake();
  const { collector } = await fixture(t, { client, installHook: async (...args) => { await gate; return fakeInstall(...args); } });
  const info = { targetId: 'barrier', type: 'page', url: 'about:blank' }; client.emitTarget(info); await tick();
  client.emit('event', { method: 'Target.attachedToTarget', params: { sessionId: 'extra', targetInfo: info, waitingForDebugger: true } }); await tick();
  assert.equal(index(client, 'Runtime.runIfWaitingForDebugger', 'extra'), -1);
  release(); await settle(collector);
  assert.ok(index(client, 'Runtime.runIfWaitingForDebugger', 'extra') > index(client, 'Page.addScriptToEvaluateOnNewDocument', 's-barrier'));
});

test('recorder drains cross-origin body before disabling/detaching sessions; clean closed tab is not incomplete', async t => {
  const { client, collector, root } = await fixture(t);
  client.emitTarget({ targetId: 'body', type: 'page', url: 'about:blank' }); await settle(collector);
  let finishBody; client.override = m => m === 'Network.getResponseBody' ? new Promise(r => { finishBody = r; }) : undefined;
  const emit = (method, params) => client.emit('event', { method, params, sessionId: 's-body' });
  emit('Network.requestWillBeSent', { requestId: 'r', request: { url: 'https://cross.example/free/path', method: 'GET', headers: {} }, timestamp: 1 });
  emit('Network.responseReceived', { requestId: 'r', type: 'Fetch', hasExtraInfo: false, response: { url: 'https://cross.example/free/path', status: 200, mimeType: 'text/plain', headers: {} }, timestamp: 2 });
  emit('Network.loadingFinished', { requestId: 'r', timestamp: 3, encodedDataLength: 9 });
  const stopping = collector.stop(); await tick();
  assert.equal(client.calls.some(c => c.method === 'Target.setAutoAttach' && c.params.autoAttach === false), false);
  finishBody({ body: 'cross-body', base64Encoded: false }); const result = await stopping;
  assert.equal(result.cleanupComplete, true);
  assert.match(fs.readFileSync(path.join(root, 'run', 'records.jsonl'), 'utf8'), /cross-body/);
});

test('legacy page discovery fallback attaches later no-opener page after startup', async t => {
  const { client, collector } = await fixture(t);
  const info = { targetId: 'legacy', type: 'page', url: 'https://any.example/' }; client.infos.push(info);
  client.emit('event', { method: 'Target.targetCreated', params: { targetInfo: info } }); await settle(collector);
  assert.equal(collector.targets.get('legacy').hookRegistered, true);
});

test('asynchronous navigation protocol errors and lost replies are distinguishable in status', async t => {
  const { client, collector } = await fixture(t);
  client.override = m => m === 'Page.navigate' ? Promise.reject(Object.assign(Error('protocol failed'), { code: -32000 })) : undefined;
  await collector.newTab('https://arbitrary.example/'); await tick();
  assert.equal(collector.state.navigationError, -32000); assert.equal(collector.state.navigationOutcome, 'navigation-error');
  client.override = m => m === 'Page.navigate' ? Promise.reject(Error('CDP command timed out: Page.navigate')) : undefined;
  await collector.newTab('https://another.example/'); await tick();
  assert.equal(collector.state.navigationOutcome, 'acknowledgement-timeout');
});

test('half-published controller lock is treated as occupied, not stolen', t => {
  const root = temp(t);
  const options = { provider: 'bitbrowser', windowSeq: 99, stateRoot: root };
  const p = control.paths(options);
  fs.mkdirSync(p.controlDir, { recursive: true }); fs.writeFileSync(p.lock, '{');
  assert.equal(control.acquire(options), null); assert.equal(fs.readFileSync(p.lock, 'utf8'), '{');
});
