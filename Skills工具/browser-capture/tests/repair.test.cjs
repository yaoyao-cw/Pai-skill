'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { Collector } = require('../lib/collector.cjs');
const { installHookForSession, createPageHookRuntime } = require('../lib/page-hook.cjs');
const { CdpClient, commandDiagnostic } = require('../lib/cdp-client.cjs');

globalThis.fetch = () => { throw Error('OFFLINE_ONLY'); };
globalThis.WebSocket = class { constructor() { throw Error('OFFLINE_ONLY'); } };

class Fake extends EventEmitter {
  constructor() { super(); this.calls = []; this.infos = []; }
  emitTarget(info, waiting = false) {
    this.emit('event', { method: 'Target.attachedToTarget', params: { sessionId: 's-' + info.targetId, targetInfo: info, waitingForDebugger: waiting } });
  }
  async send(method, params = {}, sid) {
    this.calls.push({ method, params, sid });
    const v = this.override?.(method, params, sid);
    if (v !== undefined) return v;
    if (method === 'Target.getTargets') return { targetInfos: this.infos };
    if (method === 'Target.attachToTarget') {
      const info = this.infos.find(x => x.targetId === params.targetId);
      this.emitTarget(info);
      return { sessionId: 's-' + info.targetId };
    }
    if (method === 'Page.addScriptToEvaluateOnNewDocument') return { identifier: 'script-' + sid };
    if (method === 'Runtime.evaluate') return { result: { value: params.awaitPromise ? { deactivated: true, restored: {} } : { installed: true, ready: true } } };
    return {};
  }
}

async function settle(c) { while (c.tasks.size) await Promise.all([...c.tasks]); }
async function fixture(t, client = new Fake(), installHook = installHookForSession) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-repair-test-'));
  const c = new Collector({ client, outDir: path.join(root, 'run'), installHook });
  await c.start();
  t.after(async () => {
    await c.stop();
    assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(root), /^browser-repair-test-/);
    fs.rmSync(root, { recursive: true });
  });
  return { c, client, root };
}
const calls = (c, m, sid) => c.calls.filter(x => x.method === m && (sid === undefined || x.sid === sid));

test('real installer recovers existing page Page.enable timeout after unknown-pause release', async t => {
  const client = new Fake(); client.infos = [{ targetId: 'existing', type: 'page', url: 'http://localhost/test' }];
  let n = 0;
  client.override = (m, p, sid) => m === 'Page.enable' && sid === 's-existing' && n++ === 0
    ? Promise.reject(Object.assign(Error('timed out'), { code: 'CDP_TIMEOUT', method: m, sessionId: sid, timeoutMs: 5000 })) : undefined;
  const { c } = await fixture(t, client); const s = c.targets.get('existing');
  assert.equal(s.hookRegistered, true); assert.equal(s.installationAttempts, 2);
  const resume = client.calls.findIndex(x => x.method === 'Runtime.runIfWaitingForDebugger' && x.sid === s.id);
  const retry = client.calls.findLastIndex(x => x.method === 'Page.enable' && x.sid === s.id);
  assert.ok(resume >= 0 && resume < retry); assert.equal((await c.stop()).cleanupComplete, true);
});

test('failure budgets reset on real navigation, not same URL title changes', async t => {
  const client = new Fake(); let allowed = false;
  client.override = m => m === 'Page.enable' && !allowed ? Promise.reject(Object.assign(Error('initial document rejected'), { method: m, code: -32000 })) : undefined;
  const { c } = await fixture(t, client);
  client.emitTarget({ targetId: 'later', type: 'page', url: 'http://initial.example/' }); await settle(c);
  await c.recover(c.targets.get('later'), 'test-exhaust');
  assert.equal(c.targets.get('later').installationAttempts, 3);
  for (let i = 0; i < 4; i++) {
    client.emit('event', { method: 'Target.targetInfoChanged', params: { targetInfo: { targetId: 'later', type: 'page', url: 'http://initial.example/', title: String(i) } } });
  }
  await settle(c); assert.equal(c.targets.get('later').installationAttempts, 3);
  allowed = true;
  client.emit('event', { method: 'Target.targetInfoChanged', params: { targetInfo: { targetId: 'later', type: 'page', url: 'https://business.example/path?token=secret' } } });
  await settle(c); assert.equal(c.targets.get('later').hookRegistered, true);
  assert.equal(c.targets.get('later').installationAttempts, 4); assert.equal(calls(client, 'Page.navigate').length, 0);
});

test('historical installer error does not poison cleanup but real remove failures do', async () => {
  const c = new Fake(); let fail = true;
  c.override = m => m === 'Page.enable' && fail ? Promise.reject(Object.assign(Error('install failed'), { method: m })) : undefined;
  let h; await assert.rejects(installHookForSession(c, 'f', { deferCurrentEvaluation: true, onRecord: () => {}, onHandle: x => { h = x; } }));
  assert.equal((await h.uninstall()).cleanupComplete, true);
  fail = false; h = await installHookForSession(c, 'f', { deferCurrentEvaluation: true, onRecord: () => {} });
  assert.equal(h.registered, true);
  c.override = m => m === 'Runtime.removeBinding' ? Promise.reject(Object.assign(Error('remove failed'), { code: -32000 })) : undefined;
  const r = await h.uninstall(); assert.equal(r.cleanupComplete, false);
  assert.ok(r.coverage.cleanupErrors.some(e => e.stage === 'remove_binding'));
});

test('hook writer error remains dataComplete false with actual successful browser cleanup', async () => {
  const c = new Fake();
  const h = await installHookForSession(c, 'write', { deferCurrentEvaluation: true, onRecord: () => { throw Error('disk write failed'); } });
  c.emit('event', { method: 'Runtime.bindingCalled', sessionId: 'write', params: { name: h.bindingName, executionContextId: 1, payload: JSON.stringify({ source: 'muse-page-hook', schemaVersion: 1, phase: 'hook_ready', documentId: 'x', coverage: {} }) } });
  const r = await h.uninstall(); assert.equal(r.cleanupComplete, true); assert.equal(r.dataComplete, false); assert.ok(r.dataError);
});

test('blank success cannot hide failed business target; status updates on transports and resets per document', async t => {
  let snapshot; const client = new Fake();
  const { c } = await fixture(t, client, async (cl, s, o) => {
    if (s === 's-business') throw Error('failed');
    const h = { registered: true, uninstall: async () => ({ cleanupComplete: true }) };
    o.onHandle(h); client.hookOptions = o; return h;
  });
  c.onState = x => { snapshot = x; };
  client.emitTarget({ targetId: 'blank', type: 'page', url: 'about:blank' });
  client.emitTarget({ targetId: 'business', type: 'page', url: 'https://business.example/' }); await settle(c);
  client.hookOptions.onRecord({ phase: 'hook_ready', documentId: 'blank-doc' });
  assert.equal(c.state.documentHookObserved, true); assert.equal(c.state.coverageStatus, 'degraded');
  assert.deepEqual(c.state.unregisteredDocumentTargets, ['business']);
  client.hookOptions.onRecord({ phase: 'start', documentId: 'blank-doc', transport: 'fetch' });
  assert.equal(snapshot.targets.find(x => x.targetId === 'blank').businessHookObserved, true);
  client.hookOptions.onRecord({ phase: 'hook_ready', documentId: 'second-doc' });
  assert.equal(snapshot.targets.find(x => x.targetId === 'blank').businessHookObserved, false);
});

test('tab containers use only recursive attach/resume, no document Network commands', async t => {
  const { c, client } = await fixture(t);
  client.emitTarget({ targetId: 'container', type: 'tab' }, true); await settle(c);
  assert.equal(calls(client, 'Target.setAutoAttach', 's-container').length, 1);
  assert.equal(calls(client, 'Runtime.runIfWaitingForDebugger', 's-container').length, 1);
  for (const m of ['Network.enable', 'Runtime.enable', 'Page.enable', 'Runtime.evaluate']) {
    assert.equal(calls(client, m, 's-container').length, 0);
  }
});

function runtimeContext() {
  const vm = require('node:vm'), sent = [];
  const context = vm.createContext({
    document: {}, window: {}, location: { origin: 'http://localhost', href: 'http://localhost/' },
    performance, crypto: require('node:crypto').webcrypto, TextEncoder, TextDecoder, Headers, Request, Response, URL, URLSearchParams, ArrayBuffer, Uint8Array,
    fetch: () => Promise.resolve(new Response('ok')), setTimeout, clearTimeout,
    oldBinding: x => sent.push(['old', JSON.parse(x)]), newBinding: x => sent.push(['new', JSON.parse(x)]),
  });
  return { vm, context, sent };
}

test('older source cannot rebind live generation or reinstall wrappers after stop retirement', async () => {
  const { defaultStoreKey } = require('../lib/page-hook.cjs');
  const { vm, context, sent } = runtimeContext();
  const getCtrl = () => vm.runInContext(`globalThis[Symbol.for(${JSON.stringify(defaultStoreKey('retry'))})]?.controller`, context);
  vm.runInContext(createPageHookRuntime({ runId: 'retry', generation: 2, bindingName: 'newBinding', stealth: false }), context);
  vm.runInContext(createPageHookRuntime({ runId: 'retry', generation: 1, bindingName: 'oldBinding', stealth: false }), context);
  assert.equal(getCtrl().captureGeneration, 2); assert.equal(sent.filter(x => x[0] === 'old').length, 0);
  await getCtrl().uninstall('newBinding');
  vm.runInContext(createPageHookRuntime({ runId: 'retry', generation: 1, bindingName: 'oldBinding', stealth: false }), context);
  assert.equal(getCtrl().status().installed, false);
  vm.runInContext(createPageHookRuntime({ runId: 'retry', generation: 3, bindingName: 'newBinding', stealth: false }), context);
  assert.equal(getCtrl().status().installed, true);
  await getCtrl().uninstall('newBinding');
});

test('CDP timeout/late response keeps command identity and sanitized diagnostics', async () => {
  const c = new CdpClient('ws://127.0.0.1:1', { timeoutMs: 5 });
  c.connected = true; let wire; c.socket = { send: x => { wire = JSON.parse(x); }, readyState: 3 };
  let error; try { await c.send('Page.addScriptToEvaluateOnNewDocument', { source: 'token=secret' }, 'session'); } catch (e) { error = e; }
  assert.equal(error.code, 'CDP_TIMEOUT'); assert.equal(error.method, 'Page.addScriptToEvaluateOnNewDocument'); assert.equal(error.timeoutMs, 5);
  let late; c.on('lateResponse', (d, r) => { late = { d, r }; });
  c._message(JSON.stringify({ id: wire.id, result: { identifier: 'late-script' } }));
  assert.equal(late.r.identifier, 'late-script'); assert.equal(late.d.sessionId, 'session');
  const d = commandDiagnostic(Object.assign(error, { protocolError: { code: -32000, message: 'bad https://example.test/path?token=secret Cookie=abc' } }));
  assert.doesNotMatch(JSON.stringify(d), /secret|abc|example.test/); c.close();
});

test('late old binding cleanup uses old name and closed-session uncertainty remains visible', async t => {
  const { c, client } = await fixture(t);
  client.emitTarget({ targetId: 'late-binding', type: 'page' }); await settle(c);
  c.uncertainScripts.add('s-late-binding:42');
  client.emit('lateResponse', { commandId: 42, sessionId: 's-late-binding', method: 'Runtime.addBinding', succeeded: true }, {}, 'oldAttemptBinding');
  await settle(c); assert.deepEqual(calls(client, 'Runtime.removeBinding').map(x => x.params.name), ['oldAttemptBinding']);
  assert.equal(c.uncertainScripts.size, 0);
  c.uncertainScripts.add('s-late-binding:43');
  client.emit('event', { method: 'Target.detachedFromTarget', params: { sessionId: 's-late-binding' } });
  const r = await c.stop(); assert.equal(r.cleanupComplete, false);
  assert.ok(r.errors.some(x => x.code === 'UNCONFIRMED_SCRIPT_CLEANUP'));
});

test('successful registration releases unknown pause before current evaluation', async t => {
  const client = new Fake(); let resumed = false;
  client.override = (m, p, sid) => {
    if (m === 'Runtime.runIfWaitingForDebugger' && sid === 's-hidden') resumed = true;
    if (m === 'Runtime.evaluate' && sid === 's-hidden' && !resumed) throw Error('Evaluation before hidden pause released');
  };
  const { c } = await fixture(t, client);
  client.emitTarget({ targetId: 'hidden', type: 'page' }, false); await settle(c);
  assert.equal(resumed, true); assert.equal(c.targets.get('hidden').hookRegistered, true); assert.equal(c.fatal, undefined);
});

test('stop drains late cleanup spawned during detach before closing sinks', async t => {
  const { c, client } = await fixture(t);
  client.emitTarget({ targetId: 'late-stop', type: 'page' }); await settle(c);
  let release, started; const gate = new Promise(r => { release = r; }), began = new Promise(r => { started = r; });
  let emitted = false;
  client.override = (m, p) => {
    if (m === 'Target.detachFromTarget' && !emitted) {
      emitted = true; c.uncertainScripts.add('s-late-stop:88');
      client.emit('lateResponse', { commandId: 88, sessionId: 's-late-stop', method: 'Page.addScriptToEvaluateOnNewDocument', succeeded: true }, { identifier: 'late-stop-script' });
    }
    if (m === 'Page.removeScriptToEvaluateOnNewDocument' && p.identifier === 'late-stop-script') { started(); return gate; }
  };
  const stopping = c.stop(); await began; assert.equal(c.outputClosed, undefined); release({});
  const result = await stopping; assert.equal(result.cleanupComplete, true); assert.equal(c.outputClosed, true);
  assert.equal(c.tasks.size, 0); assert.equal(c.fatal, undefined);
});

test('new session generations remain monotonic across the same document', async t => {
  const { c, client } = await fixture(t);
  client.emitTarget({ targetId: 'reattach', type: 'page' }); await settle(c);
  const original = c.targets.get('reattach').options.generation;
  client.emit('event', { method: 'Target.detachedFromTarget', params: { sessionId: 's-reattach' } });
  client.emit('event', { method: 'Target.attachedToTarget', params: { sessionId: 'replacement', targetInfo: { targetId: 'reattach', type: 'page' }, waitingForDebugger: false } });
  await settle(c); assert.ok(c.targets.get('reattach').options.generation > original);
});

test('real five-second command deadline keeps a 5.1-second late registration observable', async () => {
  const c = new CdpClient('ws://127.0.0.1:1', { timeoutMs: 5000 });
  c.connected = true;
  c.socket = { readyState: 3, send: wire => { const { id } = JSON.parse(wire); setTimeout(() => c._message(JSON.stringify({ id, result: { identifier: 'after-five-seconds' } })), 5100); } };
  const late = new Promise(resolve => c.once('lateResponse', (d, r) => resolve({ d, r })));
  await assert.rejects(c.send('Page.addScriptToEvaluateOnNewDocument', { source: 'local-test' }, 'delayed'), { code: 'CDP_TIMEOUT' });
  const value = await late;
  assert.ok(value.d.elapsedMs >= 5000); assert.equal(value.r.identifier, 'after-five-seconds');
  assert.equal(value.d.method, 'Page.addScriptToEvaluateOnNewDocument'); c.close();
});

test('verification CLI rejects missing provider, missing windows and business navigation before side effects', t => {
  const { spawnSync } = require('node:child_process');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-repair-cli-'));
  t.after(() => {
    assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(root), /^browser-repair-cli-/);
    fs.rmSync(root, { recursive: true });
  });
  for (const name of ['verify-repair.cjs', 'verify-cold-start.cjs']) {
    for (const args of [
      [],
      ['--window', '1030'],
      ['--provider', 'bitbrowser', '--window', '0'],
      ['--provider', 'bitbrowser', '--window', '1030', '--restart'],
      ['--provider', 'adspower', '--window', '12', '--url', 'https://business.example/'],
    ]) {
      const evidence = path.join(root, name + '-evidence');
      const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', name), evidence, ...args], { stdio: 'ignore' });
      assert.equal(r.status, 1); assert.equal(fs.existsSync(evidence), false);
    }
  }
});

test('cold verifier rejects an already open BitBrowser mock profile without calling close or open', async t => {
  const http = require('node:http'), { spawn } = require('node:child_process');
  const routes = [];
  const server = http.createServer((req, res) => {
    routes.push(req.url); req.resume(); res.setHeader('Content-Type', 'application/json');
    const data = req.url === '/browser/list' ? { list: [{ id: 'mock-open', seq: 7 }], total: 1 }
      : req.url === '/browser/detail' ? { id: 'mock-open', seq: 7 } : { 'mock-open': 23456 };
    res.end(JSON.stringify({ success: true, data }));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-repair-closed-bb-'));
  t.after(async () => {
    server.closeAllConnections?.(); await new Promise(r => server.close(r));
    assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(root), /^browser-repair-closed-bb-/);
    fs.rmSync(root, { recursive: true });
  });
  const child = spawn(process.execPath, [
    path.join(__dirname, '..', 'bin', 'verify-cold-start.cjs'), path.join(root, 'evidence'),
    '--provider', 'bitbrowser', '--window', '7',
    '--api-url', 'http://127.0.0.1:' + server.address().port, '--state-root', path.join(root, 'state'),
  ], { stdio: 'ignore' });
  const exit = await new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
  assert.equal(exit, 1); assert.deepEqual(routes, ['/browser/list', '/browser/detail', '/browser/ports']);
});

test('cold verifier rejects an already open AdsPower mock profile without calling stop or start', async t => {
  const http = require('node:http'), { spawn } = require('node:child_process');
  const routes = [];
  const server = http.createServer((req, res) => {
    routes.push(req.url); req.resume(); res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ code: 0, data: { status: 'Active', ws: { puppeteer: 'ws://127.0.0.1:23456/devtools/browser/abc' } } }));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-repair-closed-ads-'));
  t.after(async () => {
    server.closeAllConnections?.(); await new Promise(r => server.close(r));
    assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(root), /^browser-repair-closed-ads-/);
    fs.rmSync(root, { recursive: true });
  });
  const child = spawn(process.execPath, [
    path.join(__dirname, '..', 'bin', 'verify-cold-start.cjs'), path.join(root, 'evidence'),
    '--provider', 'adspower', '--window', '12',
    '--api-url', 'http://127.0.0.1:' + server.address().port, '--state-root', path.join(root, 'state'),
  ], { stdio: 'ignore' });
  const exit = await new Promise((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
  assert.equal(exit, 1); assert.deepEqual(routes, ['/api/v1/browser/active?serial_number=12']);
});

test('provider cold-start open/start gets dedicated 45s timeout without changing query request budget', async () => {
  const bb = require('../lib/providers/bitbrowser.cjs');
  const ads = require('../lib/providers/adspower.cjs');

  const bbSeen = [];
  const post = bb.apiClient({ requestJson: async (u, i, o) => { bbSeen.push([new URL(u).pathname, o]); return { success: true, data: {} }; } });
  await post('/browser/list', {});
  await post('/browser/open', { id: 'profile', args: ['about:blank'] });
  assert.deepEqual(bbSeen, [['/browser/list', {}], ['/browser/open', { timeoutMs: 45000 }]]);

  const adsSeen = [];
  const get = ads.apiClient({ requestJson: async (u, i, o) => { adsSeen.push([new URL(u).pathname, o]); return { code: 0, data: {} }; } });
  await get('/api/v1/browser/active?serial_number=12');
  await get('/api/v1/browser/start?serial_number=12');
  assert.deepEqual(adsSeen, [
    ['/api/v1/browser/active', { allowQuery: true }],
    ['/api/v1/browser/start', { timeoutMs: 45000, allowQuery: true }],
  ]);
});
