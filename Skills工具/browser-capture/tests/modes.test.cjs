'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { Collector } = require('../lib/collector.cjs');
const { createPageHookRuntime, installHookForSession, defaultStoreKey } = require('../lib/page-hook.cjs');
const { normalizeMode, getModeConfig, listModes } = require('../lib/modes.cjs');
const { parse } = require('../bin/capture.cjs');

globalThis.fetch = () => { throw Error('OFFLINE_ONLY'); };
globalThis.WebSocket = class { constructor() { throw Error('OFFLINE_ONLY'); } };

function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-modes-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

class FakeCdp extends EventEmitter {
  constructor() { super(); this.calls = []; this.infos = []; this.counter = 0; this.scripts = new Map(); }
  emitTarget(info, waiting = false) {
    const sid = 's-' + info.targetId;
    this.emit('event', { method: 'Target.attachedToTarget', params: { sessionId: sid, targetInfo: info, waitingForDebugger: waiting } });
    return sid;
  }
  async send(method, params = {}, sid, opts) {
    this.calls.push({ method, params, sid, opts });
    if (this.override) { const v = this.override(method, params, sid, opts); if (v !== undefined) return v; }
    if (method === 'Target.getTargets') return { targetInfos: this.infos };
    if (method === 'Target.createTarget') {
      const info = { targetId: 'tab-' + ++this.counter, type: 'page', url: params.url };
      this.infos.push(info);
      this.emitTarget(info, true);
      return { targetId: info.targetId };
    }
    if (method === 'Target.attachToTarget') {
      const info = this.infos.find(i => i.targetId === params.targetId) || { targetId: params.targetId, type: 'page' };
      return { sessionId: this.emitTarget(info, false) };
    }
    if (method === 'Page.addScriptToEvaluateOnNewDocument') return { identifier: 'script-' + sid };
    if (method === 'Runtime.evaluate') return { result: { value: params.awaitPromise ? { deactivated: true, restored: {} } : { installed: true, ready: true } } };
    if (method === 'Memory.getDOMCounters') return { documents: 2, nodes: 120, jsEventListeners: 15 };
    if (method === 'Performance.getMetrics') return { metrics: [{ name: 'JSHeapUsedSize', value: 1234567 }, { name: 'JSHeapTotalSize', value: 4567890 }] };
    if (method === 'Debugger.getScriptSource') return { scriptSource: this.scripts.get(params.scriptId) || '' };
    if (method === 'HeapProfiler.stopSampling') return { profile: { head: { callFrame: { functionName: '(root)' }, children: [] }, samples: [{ size: 1024, nodeId: 1 }] } };
    if (method === 'HeapProfiler.takeHeapSnapshot') {
      this.emit('event', { method: 'HeapProfiler.addHeapSnapshotChunk', sessionId: sid, params: { chunk: '{"snapshot":{"meta":{}},' } });
      this.emit('event', { method: 'HeapProfiler.addHeapSnapshotChunk', sessionId: sid, params: { chunk: '"nodes":[1,2,3]}' } });
      return {};
    }
    return {};
  }
}

async function settle(c) { while (c.tasks.size) await Promise.all([...c.tasks]); }

test('mode registry and CLI parse all 3 modes and memory commands cleanly', () => {
  assert.deepEqual(listModes(), ['stealth', 'standard', 'deep']);
  assert.equal(normalizeMode(undefined), 'standard');
  assert.equal(normalizeMode('silent'), 'stealth');
  assert.equal(normalizeMode('cdp-only'), 'stealth');
  assert.equal(normalizeMode('reverse'), 'deep');
  assert.throws(() => normalizeMode('unknown-mode'), { code: 'INVALID_MODE' });

  assert.equal(parse(['start', '-p', 'bb', '--window', '10']).mode, 'standard');
  assert.equal(parse(['start', '-p', 'bb', '--window', '10', '--mode', 'stealth']).mode, 'stealth');
  assert.equal(parse(['start', '-p', 'ads', '--window', '12', '-m', 'deep']).mode, 'deep');
  assert.throws(() => parse(['status', '-p', 'bb', '--window', '10', '--mode', 'deep']), { code: 'UNSUPPORTED_OPTION' });
  assert.equal(parse(['metrics', '-p', 'bb', '--window', '10']).command, 'metrics');
  assert.equal(parse(['memory-sample', '-p', 'ads', '--window', '12', '--duration', '500']).durationMs, 500);
  assert.equal(parse(['heap-snapshot', '-p', 'bb', '--window', '10', '--force']).force, true);
  assert.throws(() => parse(['memory-sample', '-p', 'ads', '--window', '12', '--duration', '10']), { code: 'INVALID_OPTION' });
  assert.throws(() => parse(['metrics', '-p', 'bb', '--window', '10', '--force']));
  assert.equal(getModeConfig('stealth').runtimeEnable, false);
  assert.equal(getModeConfig('standard').runtimeEnable, false);
  assert.equal(getModeConfig('deep').runtimeEnable, false);
  assert.equal(getModeConfig('deep').captureRuntimeEvents, true);
  assert.equal(parse(['start', '-p', 'bb', '--window', '10', '--mode', 'deep', '--with-runtime']).withRuntime, true);
  assert.throws(() => parse(['start', '-p', 'bb', '--window', '10', '--mode', 'stealth', '--with-runtime']), { code: 'UNSUPPORTED_OPTION' });
});

test('STEALTH mode sends ZERO Runtime.enable / Debugger / Page.addScript / Runtime.evaluate; records Network, WebSocket frames, DOMStorage, and metrics', async t => {
  const root = temp(t);
  const client = new FakeCdp();
  const c = new Collector({ client, outDir: path.join(root, 'run'), mode: 'stealth' });
  await c.start();

  const tab = await c.newTab('https://stealth.example/');
  assert.equal(tab.mode, 'stealth');
  assert.equal(tab.navigationSent, true);
  assert.equal(c.state.coverageStatus, 'stealth-cdp');
  assert.deepEqual(c.state.unregisteredDocumentTargets, []);

  // Verify NO anti-debug sensitive commands were ever issued
  const forbidden = ['Runtime.enable', 'Runtime.addBinding', 'Page.enable', 'Page.addScriptToEvaluateOnNewDocument', 'Runtime.evaluate', 'Debugger.enable', 'HeapProfiler.enable'];
  for (const method of forbidden) {
    assert.equal(client.calls.some(call => call.method === method), false, `stealth mode must NEVER call ${method}`);
  }
  assert.ok(client.calls.some(call => call.method === 'Network.enable'));
  assert.ok(client.calls.some(call => call.method === 'DOMStorage.enable'));

  const sid = 's-' + tab.targetId;
  // WebSocket derived records + DOMStorage events
  client.emit('event', { method: 'Network.webSocketCreated', sessionId: sid, params: { requestId: 'ws1', url: 'wss://stealth.example/ws' } });
  client.emit('event', { method: 'Network.webSocketFrameSent', sessionId: sid, params: { requestId: 'ws1', timestamp: 1, response: { opcode: 1, mask: true, payloadData: '{"ping":1}' } } });
  client.emit('event', { method: 'Network.webSocketFrameReceived', sessionId: sid, params: { requestId: 'ws1', timestamp: 2, response: { opcode: 1, mask: false, payloadData: '{"pong":1}' } } });
  client.emit('event', { method: 'DOMStorage.domStorageItemAdded', sessionId: sid, params: { storageId: { securityOrigin: 'https://stealth.example', isLocalStorage: true }, key: 'token', newValue: 'v1' } });

  // Non-blocking metrics work in stealth mode
  const m = await c.metrics();
  assert.equal(m.mode, 'stealth');
  assert.equal(m.targets[0].domCounters.nodes, 120);
  assert.equal(m.targets[0].performance.JSHeapUsedSize, 1234567);

  // HeapProfiler operations are blocked by mode guard in stealth mode unless forced
  await assert.rejects(c.memorySample({ durationMs: 100 }), { code: 'MODE_GUARD' });
  await assert.rejects(c.heapSnapshot(), { code: 'MODE_GUARD' });

  const stop = await c.stop();
  assert.equal(stop.mode, 'stealth');
  assert.equal(stop.streamsClosed, true);
  assert.equal(stop.dataFlushed, true);
  assert.equal(stop.cleanupComplete, true);
  // Open WebSocket did NOT mark HTTP capture incomplete!
  assert.equal(stop.captureStatus, 'complete');

  const records = fs.readFileSync(path.join(root, 'run', 'records.jsonl'), 'utf8');
  assert.match(records, /"kind":"ws-created"/);
  assert.match(records, /"kind":"ws-frame-sent"/);
  assert.match(records, /"kind":"ws-frame-received"/);
  const storage = fs.readFileSync(path.join(root, 'run', 'storage-events.jsonl'), 'utf8');
  assert.match(storage, /domStorageItemAdded/);
  const metricsLog = fs.readFileSync(path.join(root, 'run', 'metrics.jsonl'), 'utf8');
  assert.match(metricsLog, /JSHeapUsedSize/);
});

test('STANDARD mode avoids Runtime.enable, hides window globals/binding, disguises [native code], and rebinds across Page.frameNavigated', async t => {
  const root = temp(t);
  const client = new FakeCdp();
  const c = new Collector({ client, outDir: path.join(root, 'run'), mode: 'standard' });
  await c.start();
  const tab = await c.newTab('https://standard.example/');
  await settle(c);

  assert.equal(client.calls.some(x => x.method === 'Runtime.enable'), false, 'standard mode must NOT call Runtime.enable');
  assert.equal(client.calls.some(x => x.method === 'Debugger.enable'), false, 'standard mode must NOT call Debugger.enable');
  assert.ok(client.calls.some(x => x.method === 'Page.enable'));
  assert.ok(client.calls.some(x => x.method === 'Runtime.addBinding'));
  assert.ok(client.calls.some(x => x.method === 'Page.addScriptToEvaluateOnNewDocument'));

  // Simulate cross-document navigation: host re-adds binding without Runtime.enable and flushes
  const beforeBind = client.calls.filter(x => x.method === 'Runtime.addBinding').length;
  client.emit('event', { method: 'Page.frameNavigated', sessionId: 's-' + tab.targetId, params: { frame: { id: 'main', url: 'https://next.example/' } } });
  await new Promise(r => setImmediate(r));
  const afterBind = client.calls.filter(x => x.method === 'Runtime.addBinding').length;
  assert.ok(afterBind > beforeBind, 'standard mode must re-add binding on Page.frameNavigated');

  // heapSnapshot blocked in standard mode by default (STW guard)
  await assert.rejects(c.heapSnapshot(), { code: 'MODE_GUARD' });

  const stop = await c.stop();
  assert.equal(stop.streamsClosed, true);
  assert.equal(stop.cleanupComplete, true);
});

test('STANDARD stealth pageRuntime leaves zero named globals, deletes binding from window, and preserves [native code] toString', async () => {
  const sent = [];
  const context = vm.createContext({
    document: {},
    window: {},
    location: { origin: 'https://site.example', href: 'https://site.example/' },
    performance,
    crypto: require('node:crypto').webcrypto,
    TextEncoder, TextDecoder, Headers, Request, Response, URL, URLSearchParams, ArrayBuffer, Uint8Array,
    setTimeout, clearTimeout,
    __bc_hidden: x => sent.push(JSON.parse(x)),
  });
  // Define native-like functions inside the VM realm so Function.prototype.toString works authentically
  vm.runInContext(`
    globalThis.fetch = function fetch() { return Promise.resolve(new Response('ok')); };
    globalThis.navigator = { sendBeacon: function sendBeacon() { return true; } };
  `, context);
  const origFetchStr = vm.runInContext('Function.prototype.toString.call(fetch)', context);
  const origToStringStr = vm.runInContext('Function.prototype.toString.toString()', context);

  const beforeNames = new Set(vm.runInContext('Object.getOwnPropertyNames(globalThis)', context));
  beforeNames.delete('__bc_hidden');

  const code = createPageHookRuntime({
    runId: 'stealth-vm-1',
    bindingName: '__bc_hidden',
    stealth: true,
    filter: { sameOrigin: false, captureAllPaths: true },
  });
  vm.runInContext(code, context);

  // 1) Binding deleted from window, NO __museCapture or __bitbrowser* globals leaked
  const afterNames = vm.runInContext('Object.getOwnPropertyNames(globalThis)', context);
  assert.equal(afterNames.includes('__bc_hidden'), false, 'binding must be deleted from window into closure');
  assert.equal(afterNames.includes('__museCapture'), false, '__museCapture must not be exposed');
  assert.equal(afterNames.some(n => /bitbrowser|muse/i.test(n)), false, 'no brand globals allowed');

  // 2) Function.prototype.toString disguised
  assert.equal(vm.runInContext('fetch.name', context), 'fetch');
  assert.equal(vm.runInContext('fetch.toString()', context), origFetchStr);
  assert.equal(vm.runInContext('Function.prototype.toString.call(fetch)', context), origFetchStr);
  assert.equal(vm.runInContext('Function.prototype.toString.toString()', context), origToStringStr);

  // 3) Closure-captured binding still delivers fetch records even after deleting window.__bc_hidden
  await vm.runInContext(`fetch('https://site.example/api/ping', { method: 'POST', body: 'hi' })`, context);
  await new Promise(r => setImmediate(r));
  assert.ok(sent.some(r => r.phase === 'hook_ready'));
  assert.ok(sent.some(r => r.phase === 'start' && r.transport === 'fetch' && r.request.url === 'https://site.example/api/ping'));

  // 4) Uninstall restores fetch and Function.prototype.toString
  const key = defaultStoreKey('stealth-vm-1');
  const res = await vm.runInContext(`globalThis[Symbol.for(${JSON.stringify(key)})].controller.uninstall('__bc_hidden')`, context);
  assert.equal(res.deactivated, true);
  assert.equal(res.restored.fetch, 'restored');
  assert.equal(res.restored.fnToString, 'restored');
});

test('DEEP mode defaults to NO Runtime.enable, enables Debugger (skipAllPauses + asyncStackDepth), captures script sources, memorySample, and heapSnapshot; --with-runtime opts in', async t => {
  const root = temp(t);
  const client = new FakeCdp();
  client.scripts.set('scr-1', 'function secretSign(x){return x+"!"}');
  client.scripts.set('scr-2', 'function secretSign(x){return x+"!"}'); // duplicate content tests SHA256 dedup
  const c = new Collector({ client, outDir: path.join(root, 'run'), mode: 'deep' });
  await c.start();
  const tab = await c.newTab('https://deep.example/');
  await settle(c);
  const sid = 's-' + tab.targetId;

  // Verify deep mode defaults to ZERO Runtime.enable (avoids console getter anti-debug leak) while arming Debugger
  assert.equal(client.calls.some(x => x.method === 'Runtime.enable' && x.sid === sid), false, 'deep default must NOT call Runtime.enable');
  assert.ok(client.calls.some(x => x.method === 'Debugger.enable' && x.sid === sid));
  assert.ok(client.calls.some(x => x.method === 'Debugger.setSkipAllPauses' && x.params.skip === true && x.sid === sid));
  assert.ok(client.calls.some(x => x.method === 'Debugger.setAsyncCallStackDepth' && x.params.maxDepth === 32 && x.sid === sid));

  // Script parsing + dynamic eval source extraction + dedup
  client.emit('event', { method: 'Debugger.scriptParsed', sessionId: sid, params: { scriptId: 'scr-1', url: '', startLine: 0, endLine: 1 } });
  client.emit('event', { method: 'Debugger.scriptParsed', sessionId: sid, params: { scriptId: 'scr-2', url: 'https://deep.example/app.js', startLine: 0, endLine: 1 } });
  // Safe runtime hook events routed via binding -> runtime-events.jsonl
  c.targets.get(tab.targetId).options.onRecord({ phase: 'runtime_console', transport: 'runtime', level: 'log', args: ['debug-msg'] });
  c.targets.get(tab.targetId).options.onRecord({ phase: 'runtime_exception', transport: 'runtime', message: 'Uncaught Boom' });
  await settle(c);

  // Memory sampling (.heapprofile) & heap snapshot (.heapsnapshot)
  const sample = await c.memorySample({ durationMs: 100 });
  assert.equal(sample.sampleCount, 1);
  assert.equal(fs.existsSync(sample.file), true);

  const snap = await c.heapSnapshot();
  assert.equal(snap.chunks, 2);
  assert.ok(snap.bytesWritten > 0);
  const snapContent = JSON.parse(fs.readFileSync(snap.file, 'utf8'));
  assert.deepEqual(snapContent.nodes, [1, 2, 3]);

  const stop = await c.stop();
  assert.equal(stop.mode, 'deep');
  assert.equal(stop.streamsClosed, true);
  assert.equal(stop.dataFlushed, true);
  assert.equal(stop.cleanupComplete, true);
  assert.ok(client.calls.some(x => x.method === 'Debugger.disable' && x.sid === sid));

  const runtimeLog = fs.readFileSync(path.join(root, 'run', 'runtime-events.jsonl'), 'utf8');
  assert.match(runtimeLog, /debug-msg/);
  assert.match(runtimeLog, /Uncaught Boom/);

  const scriptsLog = fs.readFileSync(path.join(root, 'run', 'scripts.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const sources = scriptsLog.filter(x => x.kind === 'script-source');
  assert.equal(sources.length, 2);
  assert.equal(sources[0].isDynamic, true);
  assert.equal(sources[0].sourceFile, sources[1].sourceFile, 'identical script content must deduplicate to one file');
  assert.equal(fs.readFileSync(path.join(root, 'run', sources[0].sourceFile), 'utf8'), 'function secretSign(x){return x+"!"}');

  // Opt-in --with-runtime restores native CDP Runtime.enable
  const client2 = new FakeCdp();
  const c2 = new Collector({ client: client2, outDir: path.join(root, 'run-rt'), mode: 'deep', withRuntime: true });
  await c2.start();
  const tab2 = await c2.newTab('https://deep-rt.example/');
  await settle(c2);
  assert.ok(client2.calls.some(x => x.method === 'Runtime.enable' && x.sid === 's-' + tab2.targetId));
  await c2.stop();
});

test('DEEP pageRuntime captures callStack on fetch/cookie/crypto.subtle/WebSocket and restores all wrappers on uninstall', async () => {
  const sent = [];
  const nodeCrypto = require('node:crypto').webcrypto;
  const context = vm.createContext({
    location: { origin: 'https://deep.example', href: 'https://deep.example/' },
    performance,
    btoa,
    TextEncoder, TextDecoder, Headers, Request, Response, URL, URLSearchParams, ArrayBuffer, Uint8Array,
    setTimeout, clearTimeout,
    __bc_deep: x => sent.push(JSON.parse(x)),
  });
  vm.runInContext(`
    globalThis.window = globalThis;
    function Document() { this.documentElement = {}; }
    let _cookie = '';
    Object.defineProperty(Document.prototype, 'cookie', {
      configurable: true, enumerable: true,
      get() { return _cookie; },
      set(v) { _cookie = v; }
    });
    globalThis.Document = Document;
    globalThis.document = new Document();
    globalThis._domCallbacks = [];
    globalThis.MutationObserver = class MutationObserver {
      constructor(cb) { this.cb = cb; this.disconnected = false; globalThis._domCallbacks.push(this); }
      observe() {}
      disconnect() { this.disconnected = true; }
    };
    globalThis.fetch = function fetch() { return Promise.resolve(new Response('ok')); };
    function MockWS(url) { this.url = url; this.sent = []; }
    MockWS.prototype.send = function send(d) { this.sent.push(d); };
    globalThis.WebSocket = MockWS;
    function MockSubtle() {}
    MockSubtle.prototype.digest = async function digest(algo, data) { return new Uint8Array([1, 2, 3, 4]).buffer; };
    globalThis.SubtleCrypto = MockSubtle;
    globalThis.crypto = { subtle: new MockSubtle(), randomUUID: () => '11111111-1111-4111-8111-111111111111' };
  `, context);

  vm.runInContext(createPageHookRuntime({
    runId: 'deep-vm-1',
    bindingName: '__bc_deep',
    stealth: true,
    captureStack: true,
    deepHooks: true,
    filter: { sameOrigin: false, captureAllPaths: true },
  }), context);

  await vm.runInContext(`
    (async function userSignFlow() {
      document.cookie = 'sid=abc123; path=/';
      await crypto.subtle.digest('SHA-256', new Uint8Array([9, 8, 7]));
      const ws = new WebSocket('wss://deep.example/live');
      ws.send('hello-ws');
      await fetch('https://deep.example/api/sign', { method: 'POST', body: 'payload' });
      globalThis._domCallbacks[0].cb([{ addedNodes: [{ nodeType: 1, tagName: 'SCRIPT', src: 'https://deep.example/injected.js', type: 'text/javascript' }] }]);
    })();
  `, context);
  await new Promise(r => setImmediate(r));

  const domEvt = sent.find(e => e.phase === 'dom_node_added');
  assert.equal(domEvt.tagName, 'SCRIPT');
  assert.equal(domEvt.src, 'https://deep.example/injected.js');

  const fetchStart = sent.find(e => e.phase === 'start' && e.transport === 'fetch');
  assert.ok(fetchStart && Array.isArray(fetchStart.callStack) && fetchStart.callStack.some(l => l.includes('userSignFlow')));

  const cookieEvt = sent.find(e => e.phase === 'cookie_set');
  assert.equal(cookieEvt.value, 'sid=abc123; path=/');
  assert.ok(cookieEvt.callStack.some(l => l.includes('userSignFlow')));

  const cryptoEvt = sent.find(e => e.phase === 'crypto_subtle' && e.method === 'digest');
  assert.equal(cryptoEvt.algorithm, 'SHA-256');
  assert.equal(cryptoEvt.output.bytes, 4);
  assert.ok(cryptoEvt.callStack.some(l => l.includes('userSignFlow')));

  const wsOpen = sent.find(e => e.phase === 'ws_open');
  const wsSend = sent.find(e => e.phase === 'ws_send');
  assert.equal(wsOpen.url, 'wss://deep.example/live');
  assert.equal(wsSend.preview, 'hello-ws');
  assert.ok(wsSend.callStack.some(l => l.includes('userSignFlow')));

  const key = defaultStoreKey('deep-vm-1');
  const res = await vm.runInContext(`globalThis[Symbol.for(${JSON.stringify(key)})].controller.uninstall('__bc_deep')`, context);
  assert.equal(res.deactivated, true);
  assert.equal(res.restored.fetch, 'restored');
  assert.equal(res.restored.WebSocket, 'restored');
  assert.equal(res.restored.fnToString, 'restored');
});
