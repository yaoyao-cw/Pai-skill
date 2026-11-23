'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { Collector } = require('../lib/collector.cjs');
const { createPageHookRuntime, defaultStoreKey } = require('../lib/page-hook.cjs');
const { resolveProfile, resolveBrowserConnection, isProfileOpen } = require('../lib/providers/index.cjs');
const { correlateRun } = require('../lib/correlate.cjs');
const { exportHar } = require('../lib/har-exporter.cjs');
const { parse } = require('../bin/capture.cjs');
const { stripDebuggerStatements } = require('../lib/strip-debugger.cjs');

globalThis.fetch = () => { throw Error('OFFLINE_ONLY'); };
globalThis.WebSocket = class { constructor() { throw Error('OFFLINE_ONLY'); } };

function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-reverse-kit-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

class FakeCdp extends EventEmitter {
  constructor() { super(); this.calls = []; this.infos = []; this.scripts = new Map(); }
  emitTarget(info, waiting = false) {
    const sid = 's-' + info.targetId;
    this.emit('event', { method: 'Target.attachedToTarget', params: { sessionId: sid, targetInfo: info, waitingForDebugger: waiting } });
    return sid;
  }
  async send(method, params = {}, sid) {
    this.calls.push({ method, params, sid });
    if (method === 'Target.getTargets') return { targetInfos: this.infos };
    if (method === 'Page.addScriptToEvaluateOnNewDocument') return { identifier: 'script-' + sid };
    if (method === 'Runtime.evaluate') return { result: { value: params.awaitPromise ? { deactivated: true, restored: {} } : { installed: true, ready: true } } };
    if (method === 'Debugger.getScriptSource') return { scriptSource: this.scripts.get(params.scriptId) || '' };
    return {};
  }
}

async function settle(c) { while (c.tasks.size) await Promise.all([...c.tasks]); }

test('direct chrome/visiblev8 provider resolves /json/version and --ws-url, and enforces CLI guards', async () => {
  const ws = 'ws://127.0.0.1:9222/devtools/browser/vv8-direct-1';
  const requestJson = async url => {
    if (url === 'http://127.0.0.1:9222/json/version') return { Browser: 'Chrome/147.0', webSocketDebuggerUrl: ws };
    throw Error('Unexpected: ' + url);
  };

  // Connect by port (--window 9222)
  const c1 = await resolveBrowserConnection({ provider: 'vv8', windowSeq: 9222, requestJson });
  assert.equal(c1.provider, 'chrome');
  assert.equal(c1.wsUrl, ws);
  assert.equal(c1.debugPort, 9222);

  // Connect by explicit --ws-url (auto-infers windowSeq = 9222)
  const parsed = parse(['start', '-p', 'visiblev8', '--ws-url', ws, '--mode', 'stealth']);
  assert.equal(parsed.provider, 'chrome');
  assert.equal(parsed.windowSeq, 9222);
  assert.equal(parsed.mode, 'stealth');
  const c2 = await resolveBrowserConnection({ ...parsed, requestJson });
  assert.equal(c2.wsUrl, ws);

  assert.equal((await isProfileOpen({ provider: 'chrome', windowSeq: 9222, requestJson })).open, true);

  // Guards
  assert.throws(() => parse(['start', '-p', 'chrome', '--window', '9222', '--restart']), { code: 'UNSUPPORTED_OPTION' });
  assert.throws(() => parse(['start', '-p', 'chrome', '--window', '9222', '--browser-id', 'x']), { code: 'UNSUPPORTED_OPTION' });
  assert.throws(() => parse(['start', '-p', 'bitbrowser', '--window', '10', '--ws-url', ws]), { code: 'UNSUPPORTED_OPTION' });
  assert.throws(() => parse(['start', '-p', 'chrome', '--mode', 'stealth', '--strip-debugger']), { code: 'UNSUPPORTED_OPTION' });
  assert.equal(parse(['start', '-p', 'chrome', '--mode', 'deep', '--strip-debugger']).stripDebugger, true);
  assert.equal(parse(['correlate', '--run-dir', 'C:\\tmp\\run1']).command, 'correlate');
  assert.equal(parse(['export-har', '--run-dir', 'C:\\tmp\\run1', '--out', 'C:\\tmp\\out.har']).outDir, 'C:\\tmp\\out.har');
  await assert.rejects(resolveProfile({ provider: 'chrome', browserId: 'bad' }), { code: 'UNSUPPORTED_OPTION' });
});

test('deep mode arms Debugger on WebWorker and ServiceWorker without Runtime.enable by default, and extracts worker JS sources', async t => {
  const root = temp(t);
  const client = new FakeCdp();
  client.scripts.set('w-scr-1', 'self.onmessage = e => postMessage(signPow(e.data));');
  const c = new Collector({ client, outDir: path.join(root, 'run'), mode: 'deep' });
  await c.start();

  const wSid = client.emitTarget({ targetId: 'pow-worker', type: 'worker', url: 'https://target.example/pow.js' }, true);
  const swSid = client.emitTarget({ targetId: 'sw-1', type: 'service_worker', url: 'https://target.example/sw.js' }, true);
  await settle(c);

  for (const sid of [wSid, swSid]) {
    assert.equal(client.calls.some(x => x.method === 'Runtime.enable' && x.sid === sid), false);
    assert.ok(client.calls.some(x => x.method === 'Debugger.enable' && x.sid === sid));
    assert.ok(client.calls.some(x => x.method === 'Debugger.setSkipAllPauses' && x.params.skip === true && x.sid === sid));
    assert.ok(client.calls.some(x => x.method === 'Debugger.setAsyncCallStackDepth' && x.params.maxDepth === 32 && x.sid === sid));
  }

  client.emit('event', { method: 'Debugger.scriptParsed', sessionId: wSid, params: { scriptId: 'w-scr-1', url: 'https://target.example/pow.js', startLine: 0, endLine: 1 } });
  await settle(c);
  await c.stop();

  const scriptRows = fs.readFileSync(path.join(root, 'run', 'scripts.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const src = scriptRows.find(r => r.kind === 'script-source' && r.scriptId === 'w-scr-1');
  assert.ok(src && src.sourceFile);
  assert.match(fs.readFileSync(path.join(root, 'run', src.sourceFile), 'utf8'), /signPow/);
});

test('WASM hook extracts real .wasm binaries (deduplicated to wasm/*.wasm), EventSource + SSE fetch chunks + stripDebugger work & restore cleanly', async t => {
  const root = temp(t);
  const sent = [];
  // Minimal valid WebAssembly module exporting () => 42 (magic + version + minimal sections)
  const wasmMagic = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
  const context = vm.createContext({
    location: { origin: 'https://rev.example', href: 'https://rev.example/' },
    performance,
    btoa,
    TextEncoder, TextDecoder, Headers, Request, Response, URL, URLSearchParams, ArrayBuffer, Uint8Array, ReadableStream,
    setTimeout, clearTimeout,
    __bc_rev: x => sent.push(JSON.parse(x)),
  });
  vm.runInContext(`
    globalThis.window = globalThis;
    globalThis.document = {};
    globalThis.EventSource = class EventSource {
      constructor(url, opts) { this.url = url; this.opts = opts; this._listeners = []; }
      addEventListener(type, fn) { if (type === 'message') this._listeners.push(fn); }
      _emitMessage(data, id) { for (const fn of this._listeners) fn({ data, lastEventId: id }); }
    };
    globalThis.WebAssembly = {
      async instantiate(bytes) { return { instance: { exports: { signToken() {}, verify() {} } }, module: {} }; },
      async instantiateStreaming(respPromise) {
        await respPromise;
        return { instance: { exports: { streamSign() {} } }, module: {} };
      },
      async compile(bytes) { return {}; },
    };
    globalThis.fetch = function fetch() {
      const enc = new TextEncoder();
      const body = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(enc.encode('data: {"delta":"he"}\\n\\n'));
          ctrl.enqueue(enc.encode('data: {"delta":"llo"}\\n\\n'));
          ctrl.close();
        }
      });
      return Promise.resolve(new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } }));
    };
  `, context);

  vm.runInContext(createPageHookRuntime({
    runId: 'rev-vm-1',
    bindingName: '__bc_rev',
    stealth: true,
    captureStack: true,
    deepHooks: true,
    stripDebugger: true,
    filter: { sameOrigin: false, captureAllPaths: true },
  }), context);

  context._wasmBytes = wasmMagic;
  await vm.runInContext(`
    (async function reverseFlow() {
      const es = new EventSource('https://rev.example/events', { withCredentials: true });
      es._emitMessage('{"tick":1}', 'evt-1');
      await WebAssembly.instantiate(_wasmBytes);
      await WebAssembly.instantiateStreaming(Promise.resolve(new Response(_wasmBytes)));
      const resp = await fetch('https://rev.example/api/chat-stream');
      await resp.text();
      globalThis._fnResult = (new Function('debugger; return 42;'))();
      globalThis._evalResult = eval('debugger; 99');
    })();
  `, context);
  await new Promise(r => setTimeout(r, 30));

  assert.equal(context._fnResult, 42);
  assert.equal(context._evalResult, 99);

  // Verify SSE EventSource + live fetch response_chunk + WASM + stripDebugger events
  assert.ok(sent.some(e => e.phase === 'sse_open' && e.url === 'https://rev.example/events' && e.callStack.some(l => l.includes('reverseFlow'))));
  assert.ok(sent.some(e => e.phase === 'sse_message' && e.data === '{"tick":1}' && e.lastEventId === 'evt-1'));
  const chunks = sent.filter(e => e.phase === 'response_chunk');
  assert.equal(chunks.length, 2);
  assert.match(chunks[0].data, /"delta":"he"/);
  assert.match(chunks[1].data, /"delta":"llo"/);
  assert.ok(sent.some(e => e.phase === 'debugger_trap_stripped' && e.kind === 'Function'));
  assert.ok(sent.some(e => e.phase === 'debugger_trap_stripped' && e.kind === 'eval'));

  const wasmEvents = sent.filter(e => e.phase === 'wasm_module');
  assert.equal(wasmEvents.length, 2);
  assert.deepEqual(wasmEvents[0].exportNames, ['signToken', 'verify']);
  assert.deepEqual(wasmEvents[1].exportNames, ['streamSign']);

  // Verify Collector._saveWasmBinary writes deduplicated binary .wasm files and strips base64 from hook-events.jsonl
  const client = new FakeCdp();
  const c = new Collector({ client, outDir: path.join(root, 'run'), mode: 'deep' });
  const saved1 = c._saveWasmBinary(wasmEvents[0]);
  const saved2 = c._saveWasmBinary(wasmEvents[1]);
  assert.equal(saved1.wasmBase64, undefined);
  assert.equal(saved1.wasmFile, saved2.wasmFile, 'identical WASM modules deduplicate to one .wasm file');
  assert.deepEqual(new Uint8Array(fs.readFileSync(path.join(root, 'run', saved1.wasmFile))), wasmMagic);
  await c.stop();

  // Verify clean uninstall of EventSource, WebAssembly, Function, eval
  const key = defaultStoreKey('rev-vm-1');
  const res = await vm.runInContext(`globalThis[Symbol.for(${JSON.stringify(key)})].controller.uninstall('__bc_rev')`, context);
  assert.equal(res.deactivated, true);
  assert.equal(res.restored.EventSource, 'restored');
  assert.equal(res.restored.Function, 'restored');
  assert.equal(res.restored.eval, 'restored');
});

test('stealth mode records CDP Network.eventSourceMessageReceived into records.jsonl', async t => {
  const root = temp(t);
  const client = new FakeCdp();
  const c = new Collector({ client, outDir: path.join(root, 'run'), mode: 'stealth' });
  await c.start();
  const sid = client.emitTarget({ targetId: 'sse-page', type: 'page', url: 'https://sse.example/' });
  await settle(c);
  client.emit('event', {
    method: 'Network.eventSourceMessageReceived',
    sessionId: sid,
    params: { requestId: 'req-sse', timestamp: 10.5, eventName: 'token', eventId: '42', data: '{"sig":"xyz"}' },
  });
  await c.stop();
  const records = fs.readFileSync(path.join(root, 'run', 'records.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const sse = records.find(r => r.kind === 'sse-message');
  assert.equal(sse.eventName, 'token');
  assert.equal(sse.eventId, '42');
  assert.equal(sse.data, '{"sig":"xyz"}');
});

test('correlateRun resolves nested async CDP initiator stacks + minified snippets + JS stacks, and exportHar produces valid HAR 1.2 with cookies & WS', async t => {
  const root = temp(t);
  const runDir = path.join(root, 'run');
  fs.mkdirSync(path.join(runDir, 'scripts'), { recursive: true });

  // One minified long line script + one multi-line dynamic eval script
  const minifiedCode = 'a'.repeat(120) + 'function buildSignature(p){return fetch("/api/order",{method:"POST",body:p})}' + 'b'.repeat(120);
  fs.writeFileSync(path.join(runDir, 'scripts', 'aaaaaaaaaaaa.js'), minifiedCode, 'utf8');
  fs.writeFileSync(path.join(runDir, 'scripts', 'bbbbbbbbbbbb.js'), 'line1();\nconst sig = runDynamicEval();\nline3();\n', 'utf8');

  fs.writeFileSync(path.join(runDir, 'scripts.jsonl'), [
    JSON.stringify({ kind: 'script-source', sessionId: 's1', scriptId: '10', url: 'https://app.example/bundle.min.js', isDynamic: false, sha256: 'aaaa', sourceFile: 'scripts/aaaaaaaaaaaa.js' }),
    JSON.stringify({ kind: 'script-source', sessionId: 's1', scriptId: '11', url: null, isDynamic: true, sha256: 'bbbb', sourceFile: 'scripts/bbbbbbbbbbbb.js' }),
  ].join('\n') + '\n');

  fs.writeFileSync(path.join(runDir, 'raw.jsonl'), [
    JSON.stringify({ eventSeq: 1, method: 'Network.requestWillBeSent', params: {} }),
    JSON.stringify({ eventSeq: 2, method: 'Network.requestWillBeSentExtraInfo', params: { headers: { cookie: 'session=s_token_1; theme=dark', 'x-sig': 'sig999' } } }),
    JSON.stringify({ eventSeq: 3, method: 'Network.responseReceivedExtraInfo', params: { headers: { 'set-cookie': 'sid=new_cookie; Path=/; HttpOnly' } } }),
  ].join('\n') + '\n');

  fs.writeFileSync(path.join(runDir, 'records.jsonl'), [
    JSON.stringify({
      kind: 'request', hopId: 'h1', sessionId: 's1', targetId: 't1', requestId: 'r1', receivedAt: '2026-11-23T00:00:01.000Z',
      wallTime: 1795305601, timestamp: 100.0, resourceType: 'Fetch',
      request: { method: 'POST', url: 'https://app.example/api/order?item=1', headers: { 'Content-Type': 'application/json' }, postData: '{"qty":2}' },
      initiator: {
        type: 'script',
        stack: {
          callFrames: [{ functionName: 'buildSignature', scriptId: '10', url: 'https://app.example/bundle.min.js', lineNumber: 0, columnNumber: 125 }],
          parent: {
            description: 'Promise.then',
            callFrames: [{ functionName: 'runDynamicEval', scriptId: '11', url: '', lineNumber: 1, columnNumber: 12 }],
          },
        },
      },
    }),
    JSON.stringify({
      kind: 'response', hopId: 'h1', sessionId: 's1', targetId: 't1', requestId: 'r1', timestamp: 100.15,
      response: { status: 200, statusText: 'OK', protocol: 'h2', mimeType: 'application/json', headers: { 'content-type': 'application/json' } },
      serverEndpoint: { address: '127.0.0.1', port: 443 },
    }),
    JSON.stringify({ kind: 'loading-finished', hopId: 'h1', sessionId: 's1', requestId: 'r1', timestamp: 100.2, encodedDataLength: 18 }),
    JSON.stringify({ kind: 'body', hopId: 'h1', bodyState: 'captured', body: '{"ok":true,"id":7}', base64Encoded: false, originalBytes: 18 }),
    JSON.stringify({ kind: 'extra-info-association', sessionId: 's1', requestId: 'r1', extraType: 'request', revision: 1, status: 'associated', assignments: [{ hopId: 'h1', sourceEventSeq: 2 }] }),
    JSON.stringify({ kind: 'extra-info-association', sessionId: 's1', requestId: 'r1', extraType: 'response', revision: 1, status: 'associated', assignments: [{ hopId: 'h1', sourceEventSeq: 3 }] }),
    JSON.stringify({ kind: 'ws-created', sessionId: 's1', targetId: 't1', requestId: 'ws1', receivedAt: '2026-11-23T00:00:02.000Z', url: 'wss://app.example/ws' }),
    JSON.stringify({ kind: 'ws-frame-sent', sessionId: 's1', targetId: 't1', requestId: 'ws1', receivedAt: '2026-11-23T00:00:02.100Z', timestamp: 101.1, opcode: 1, payloadData: '{"op":"sub"}', originalBytes: 12 }),
    JSON.stringify({ kind: 'ws-frame-received', sessionId: 's1', targetId: 't1', requestId: 'ws1', receivedAt: '2026-11-23T00:00:02.200Z', timestamp: 101.2, opcode: 1, payloadData: '{"op":"ack"}', originalBytes: 12 }),
  ].join('\n') + '\n');

  fs.writeFileSync(path.join(runDir, 'hook-events.jsonl'), [
    JSON.stringify({
      phase: 'crypto_subtle', transport: 'crypto', targetId: 't1', method: 'sign', algorithm: 'HMAC',
      recordedAt: { wallTimeMs: 1795305600500 },
      callStack: ['at buildSignature (https://app.example/bundle.min.js:1:126)'],
    }),
  ].join('\n') + '\n');

  // 1) Correlate
  const summary = correlateRun(runDir);
  assert.equal(summary.stats.requests, 1);
  assert.equal(summary.stats.wsFrames, 2);
  assert.equal(summary.stats.cryptoCalls, 1);
  assert.equal(summary.stats.dynamicScripts, 1);
  assert.ok(summary.topCallSites[0].sourceFile === 'scripts/aaaaaaaaaaaa.js');

  const timeline = fs.readFileSync(summary.files.timeline, 'utf8').trim().split('\n').map(JSON.parse);
  const reqEntry = timeline.find(e => e.kind === 'request');
  assert.equal(reqEntry.resolvedStack.length, 2);
  assert.equal(reqEntry.resolvedStack[0].sourceFile, 'scripts/aaaaaaaaaaaa.js');
  assert.match(reqEntry.resolvedStack[0].snippet, /buildSignature/);
  assert.equal(reqEntry.resolvedStack[1].asyncDescription, 'Promise.then');
  assert.equal(reqEntry.resolvedStack[1].sourceFile, 'scripts/bbbbbbbbbbbb.js');
  assert.equal(reqEntry.resolvedStack[1].isDynamic, true);
  assert.match(reqEntry.resolvedStack[1].snippet, /runDynamicEval/);

  // 2) Export HAR 1.2
  const harResult = exportHar(runDir);
  assert.equal(harResult.httpEntriesCount, 1);
  assert.equal(harResult.wsEntriesCount, 1);
  assert.equal(harResult.bodyCapturedCount, 1);
  const har = JSON.parse(fs.readFileSync(harResult.harFile, 'utf8'));
  assert.equal(har.log.version, '1.2');
  const httpEntry = har.log.entries[0];
  assert.equal(httpEntry.request.method, 'POST');
  assert.equal(httpEntry.request.postData.text, '{"qty":2}');
  assert.ok(httpEntry.request.cookies.some(c => c.name === 'session' && c.value === 's_token_1'));
  assert.ok(httpEntry.request.headers.some(h => h.name === 'x-sig' && h.value === 'sig999'));
  assert.ok(httpEntry.response.cookies.some(c => c.name === 'sid' && c.value === 'new_cookie'));
  assert.equal(httpEntry.response.content.text, '{"ok":true,"id":7}');
  const wsEntry = har.log.entries[1];
  assert.equal(wsEntry._resourceType, 'websocket');
  assert.equal(wsEntry._webSocketMessages.length, 2);
  assert.equal(wsEntry._webSocketMessages[0].type, 'send');
  assert.equal(wsEntry._webSocketMessages[1].data, '{"op":"ack"}');
});

test('deep mode getter-safe console & exception hook defeats all 5 console anti-debug getter traps while capturing real logs and errors', async () => {
  const sent = [];
  const context = vm.createContext({
    location: { origin: 'https://trap.example', href: 'https://trap.example/' },
    performance,
    btoa,
    TextEncoder, TextDecoder, Headers, Request, Response, URL, URLSearchParams, ArrayBuffer, Uint8Array,
    setTimeout, clearTimeout,
    __bc_safe: x => sent.push(JSON.parse(x)),
  });
  vm.runInContext(`
    globalThis.window = globalThis;
    globalThis.document = {};
    globalThis._listeners = {};
    globalThis.window.addEventListener = (t, fn) => { (globalThis._listeners[t] ||= []).push(fn); };
    globalThis.window.removeEventListener = (t, fn) => {
      const arr = globalThis._listeners[t];
      if (arr) globalThis._listeners[t] = arr.filter(x => x !== fn);
    };
    globalThis.console = {
      log() {}, info() {}, warn() {}, error() {}, debug() {}
    };
  `, context);

  vm.runInContext(createPageHookRuntime({
    runId: 'safe-rt-1',
    bindingName: '__bc_safe',
    stealth: true,
    captureStack: true,
    deepHooks: true,
    enableRuntime: false,
    filter: { sameOrigin: false, captureAllPaths: true },
  }), context);

  vm.runInContext(`
    globalThis.trapsTriggered = [];
    // Trap 1: Error with custom .stack getter
    const errTrap = new Error('decoy');
    Object.defineProperty(errTrap, 'stack', { get() { globalThis.trapsTriggered.push('error-stack'); return ''; } });
    console.debug(errTrap);

    // Trap 2: DOM-like element with custom .id getter
    const domTrap = {};
    Object.defineProperty(domTrap, Symbol.toStringTag, { value: 'HTMLDivElement' });
    Object.defineProperty(domTrap, 'id', { enumerable: true, get() { globalThis.trapsTriggered.push('dom-id'); return 'x'; } });
    console.log(domTrap);

    // Trap 3: RegExp with custom toString()
    const reTrap = /abc/;
    reTrap.toString = () => { globalThis.trapsTriggered.push('regexp-toString'); return ''; };
    console.log(reTrap);

    // Trap 4: Plain object with getter property
    const objTrap = { safeKey: 'ok' };
    Object.defineProperty(objTrap, 'evil', { enumerable: true, get() { globalThis.trapsTriggered.push('obj-getter'); return 1; } });
    console.info('payload:', objTrap);

    // Trap 5: Object with Symbol.toStringTag getter
    const tagTrap = {};
    Object.defineProperty(tagTrap, Symbol.toStringTag, { get() { globalThis.trapsTriggered.push('tag-getter'); return 'Evil'; } });
    console.warn(tagTrap);

    // Normal logs + uncaught error + unhandledrejection
    console.log('real-sign', 123, { token: 't_abc' });
    for (const fn of globalThis._listeners.error) {
      fn({ message: 'Uncaught ReferenceError: x', filename: 'https://trap.example/app.js', lineno: 9, colno: 4, error: { name: 'ReferenceError', message: 'x', stack: 'ReferenceError: x\\n    at calc (https://trap.example/app.js:9:4)' } });
    }
    for (const fn of globalThis._listeners.unhandledrejection) {
      fn({ reason: 'promise-failed' });
    }
  `, context);

  assert.deepEqual(Array.from(context.trapsTriggered), [], 'ZERO anti-debug console traps may be triggered');

  const realLog = sent.find(e => e.phase === 'runtime_console' && e.args?.[0] === 'real-sign');
  assert.ok(realLog);
  assert.deepEqual(realLog.args, ['real-sign', 123, { token: 't_abc' }]);

  const objLog = sent.find(e => e.phase === 'runtime_console' && e.args?.[0] === 'payload:');
  assert.equal(objLog.args[1].safeKey, 'ok');
  assert.equal(objLog.args[1].evil, '[Getter]');

  const exc = sent.find(e => e.phase === 'runtime_exception');
  assert.equal(exc.message, 'Uncaught ReferenceError: x');
  assert.ok(exc.errorStack.some(l => l.includes('calc')));

  const rej = sent.find(e => e.phase === 'runtime_rejection');
  assert.equal(rej.reason, 'promise-failed');

  // Verify clean uninstall removes listeners and restores console
  const key = defaultStoreKey('safe-rt-1');
  await vm.runInContext(`globalThis[Symbol.for(${JSON.stringify(key)})].controller.uninstall('__bc_safe')`, context);
  assert.equal(context._listeners.error.length, 0);
  assert.equal(context._listeners.unhandledrejection.length, 0);
});

test('--override CDP Fetch.enable performs file replacement, regex/string patching, header sanitization, cache disable, and safe continue/stop', async t => {
  const root = temp(t);
  const patchedFile = path.join(root, 'patched-sign.js');
  fs.writeFileSync(patchedFile, 'window.sign = x => "LOCAL_PATCH_" + x;\n', 'utf8');

  const rulesFile = path.join(root, 'rules.json');
  fs.writeFileSync(rulesFile, JSON.stringify({
    rules: [
      {
        name: 'swap-sign-file',
        urlPattern: 'https://target.example/sign.js*',
        resourceType: 'Script',
        file: './patched-sign.js',
        contentType: 'application/javascript; charset=utf-8',
      },
      {
        name: 'patch-antidebug-inline',
        urlPattern: 'https://target.example/app.js*',
        replace: [
          { match: 'debugger;', with: '/*clean*/' },
          { regex: 'isDevTools\\s*=\\s*true', flags: 'g', with: 'isDevTools=false' },
        ],
      },
    ],
  }, null, 2));

  // CLI validates --override immediately
  const parsed = parse(['start', '-p', 'chrome', '--window', '9222', '--mode', 'stealth', '--override', rulesFile]);
  assert.equal(parsed.overrideFile, rulesFile);
  assert.throws(() => parse(['start', '-p', 'chrome', '--window', '9222', '--override', path.join(root, 'missing.json')]), { code: 'OVERRIDE_FILE_NOT_FOUND' });

  const client = new FakeCdp();
  const origSend = client.send.bind(client);
  client.send = async (method, params = {}, sid) => {
    const base = await origSend(method, params, sid);
    if (method === 'Fetch.getResponseBody' && params.requestId === 'paused-app') {
      return { body: Buffer.from('function guard(){debugger; const isDevTools = true; return isDevTools;}').toString('base64'), base64Encoded: true };
    }
    return base;
  };

  const c = new Collector({ client, outDir: path.join(root, 'run'), mode: 'stealth', overrideFile: rulesFile });
  await c.start();
  const sid = client.emitTarget({ targetId: 'ov-page', type: 'page', url: 'https://target.example/' });
  await settle(c);

  assert.ok(client.calls.some(x => x.method === 'Network.setCacheDisabled' && x.params.cacheDisabled === true && x.sid === sid));
  assert.ok(client.calls.some(x => x.method === 'Fetch.enable' && x.params.patterns.length === 2 && x.sid === sid));

  // 1) Whole-file replacement with header sanitization (strips Content-Encoding/ETag/old Content-Length)
  client.emit('event', {
    method: 'Fetch.requestPaused',
    sessionId: sid,
    params: {
      requestId: 'paused-sign',
      request: { url: 'https://target.example/sign.js?v=9' },
      resourceType: 'Script',
      responseStatusCode: 200,
      responseHeaders: [
        { name: 'Content-Type', value: 'text/javascript' },
        { name: 'Content-Encoding', value: 'gzip' },
        { name: 'Content-Length', value: '9999' },
        { name: 'ETag', value: '"abc"' },
        { name: 'X-Keep', value: 'yes' },
      ],
    },
  });

  // 2) Inline string + regex patch
  client.emit('event', {
    method: 'Fetch.requestPaused',
    sessionId: sid,
    params: {
      requestId: 'paused-app',
      request: { url: 'https://target.example/app.js' },
      resourceType: 'Script',
      responseStatusCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }],
    },
  });

  // 3) Unmatched request -> must immediately continueResponse so page never hangs
  client.emit('event', {
    method: 'Fetch.requestPaused',
    sessionId: sid,
    params: {
      requestId: 'paused-other',
      request: { url: 'https://target.example/logo.png' },
      resourceType: 'Image',
      responseStatusCode: 200,
      responseHeaders: [],
    },
  });
  await settle(c);

  const fulfillSign = client.calls.find(x => x.method === 'Fetch.fulfillRequest' && x.params.requestId === 'paused-sign');
  assert.ok(fulfillSign);
  assert.equal(Buffer.from(fulfillSign.params.body, 'base64').toString('utf8'), 'window.sign = x => "LOCAL_PATCH_" + x;\n');
  assert.equal(fulfillSign.params.responseHeaders.some(h => h.name.toLowerCase() === 'content-encoding'), false);
  assert.equal(fulfillSign.params.responseHeaders.some(h => h.name.toLowerCase() === 'etag'), false);
  assert.ok(fulfillSign.params.responseHeaders.some(h => h.name === 'X-Keep' && h.value === 'yes'));

  const fulfillApp = client.calls.find(x => x.method === 'Fetch.fulfillRequest' && x.params.requestId === 'paused-app');
  assert.ok(fulfillApp);
  assert.equal(Buffer.from(fulfillApp.params.body, 'base64').toString('utf8'), 'function guard(){/*clean*/ const isDevTools=false; return isDevTools;}');

  const contOther = client.calls.find(x => x.method === 'Fetch.continueResponse' && x.params.requestId === 'paused-other');
  assert.ok(contOther);

  const stop = await c.stop();
  assert.equal(stop.streamsClosed, true);
  assert.equal(stop.cleanupComplete, true);
  assert.ok(client.calls.some(x => x.method === 'Fetch.disable' && x.sid === sid));
  assert.ok(client.calls.some(x => x.method === 'Network.setCacheDisabled' && x.params.cacheDisabled === false && x.sid === sid));

  const cov = fs.readFileSync(path.join(root, 'run', 'coverage.jsonl'), 'utf8');
  assert.match(cov, /"kind":"override-applied"/);
  assert.match(cov, /swap-sign-file/);
  assert.match(cov, /patch-antidebug-inline/);
});

test('stripDebuggerStatements lexer replaces only real debugger statements with equal-length statements and preserves ASI/if-else/offsets', () => {
  const src = [
    'function check(x) {',
    '  if (x) debugger',
    '  return runAfter();',
    '}',
    'function checkIfElse(x) {',
    '  if (x) debugger; else return 11;',
    '  if (x) debugger',
    '  else return 22;',
    '  return 33;',
    '}',
    'function checkAsi() {',
    '  let acc = 0;',
    '  debugger',
    '  (function () { acc += 10; })();',
    '  debugger',
    '  [1, 2, 3].forEach(v => { acc += v; });',
    '  return acc;',
    '}',
    'const s1 = "debugger;";',
    "const s2 = 'debugger;';",
    'const s3 = `debugger ${(() => { debugger; return 7; })()} end`;',
    '// debugger; line comment',
    '/* debugger; block comment */',
    'const re = /debugger/g;',
    'const obj = { debugger: 1 };',
    'const meth = { debugger() { return 9; } };',
    'const v = obj.debugger + (obj?.debugger || 0) + meth.debugger();',
    'const my_debugger = 10 / 2; debugger; const ok = /debugger/.test("debugger");',
    '{debugger}',
  ].join('\n');

  const res = stripDebuggerStatements(src);
  assert.equal(res.count, 8, 'should strip exactly 8 real debugger statements');
  assert.equal(res.code.length, src.length, 'must preserve exact byte/char length for source-map & col alignment');
  assert.equal(res.code.split('\n').length, src.split('\n').length, 'must preserve exact line count');

  // Verify strings, template literal text, comments, regex, and property/method names are completely untouched
  assert.match(res.code, /const s1 = "debugger;";/);
  assert.match(res.code, /const s2 = 'debugger;';/);
  assert.ok(res.code.includes('const s3 = `debugger ${(() => { void 0  ; return 7; })()} end`;'));
  assert.ok(res.code.includes('// debugger; line comment'));
  assert.ok(res.code.includes('/* debugger; block comment */'));
  assert.ok(res.code.includes('const re = /debugger/g;'));
  assert.ok(res.code.includes('const obj = { debugger: 1 };'));
  assert.ok(res.code.includes('const meth = { debugger() { return 9; } };'));
  assert.ok(res.code.includes('obj.debugger + (obj?.debugger || 0) + meth.debugger()'));
  assert.ok(res.code.includes('const my_debugger = 10 / 2; void 0  ; const ok = /debugger/.test("debugger");'));
  assert.ok(res.code.includes('{{      }}'));

  // Execute the rewritten code in a VM: critically, ASI (`debugger\n(fn)()` & `debugger\n[1,2]`) and `if/else` must ALL run cleanly!
  let called = 0;
  const ctx = vm.createContext({ runAfter() { called++; return 42; } });
  const out = vm.runInContext(res.code + '\n({ rFalse: check(false), rTrue: check(true), ieFalse: checkIfElse(false), ieTrue: checkIfElse(true), asi: checkAsi(), s1, s2, s3, v, ok, reTest: re.test("debugger") })', ctx);
  assert.equal(out.rFalse, 42);
  assert.equal(out.rTrue, 42);
  assert.equal(out.ieFalse, 11);
  assert.equal(out.ieTrue, 33);
  assert.equal(out.asi, 16);
  assert.equal(called, 2);
  assert.equal(out.s1, 'debugger;');
  assert.equal(out.s2, 'debugger;');
  assert.equal(out.s3, 'debugger 7 end');
  assert.equal(out.v, 11);
  assert.equal(out.ok, true);
  assert.equal(out.reTest, true);

  // Clean code produces zero count and identical reference
  const clean = 'const x = "debugger"; console.log(x.debugger);';
  const cleanRes = stripDebuggerStatements(clean);
  assert.equal(cleanRes.count, 0);
  assert.equal(cleanRes.code, clean);
});

test('--strip-script-debugger neutralizes debugger traps at CDP Fetch response layer in stealth mode and leaves clean scripts untouched', async t => {
  const root = temp(t);
  const client = new FakeCdp();
  const origSend = client.send.bind(client);
  const cleanCode = 'window.ok = "debugger";';
  const trapCode = 'function trap(){debugger;return "debugger";}';
  client.send = async (method, params = {}, sid) => {
    const base = await origSend(method, params, sid);
    if (method === 'Fetch.getResponseBody' && params.requestId === 'p-clean') {
      return { body: Buffer.from(cleanCode).toString('base64'), base64Encoded: true };
    }
    if (method === 'Fetch.getResponseBody' && params.requestId === 'p-trap') {
      return { body: Buffer.from(trapCode).toString('base64'), base64Encoded: true };
    }
    return base;
  };

  const c = new Collector({ client, outDir: path.join(root, 'run'), mode: 'stealth', stripScriptDebugger: true });
  await c.start();
  const sid = client.emitTarget({ targetId: 'strip-page', type: 'page', url: 'https://anti.example/' });
  await settle(c);

  const fetchEnable = client.calls.find(x => x.method === 'Fetch.enable' && x.sid === sid);
  assert.ok(fetchEnable);
  assert.ok(fetchEnable.params.patterns.some(p => p.urlPattern === '*' && p.resourceType === 'Script' && p.requestStage === 'Response'));
  assert.equal(client.calls.some(x => x.method === 'Page.addScriptToEvaluateOnNewDocument'), false, 'stealth mode injects zero JS');

  client.emit('event', {
    method: 'Fetch.requestPaused',
    sessionId: sid,
    params: {
      requestId: 'p-clean',
      request: { url: 'https://anti.example/clean.js' },
      resourceType: 'Script',
      responseStatusCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }],
    },
  });
  client.emit('event', {
    method: 'Fetch.requestPaused',
    sessionId: sid,
    params: {
      requestId: 'p-trap',
      request: { url: 'https://anti.example/trap.js' },
      resourceType: 'Script',
      responseStatusCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }, { name: 'Content-Encoding', value: 'br' }],
    },
  });
  await settle(c);

  // Clean script MUST use continueResponse (untouched)
  assert.ok(client.calls.some(x => x.method === 'Fetch.continueResponse' && x.params.requestId === 'p-clean'));
  assert.equal(client.calls.some(x => x.method === 'Fetch.fulfillRequest' && x.params.requestId === 'p-clean'), false);

  // Trap script MUST use fulfillRequest with equal-length void 0   and preserve string literal
  const fulfillTrap = client.calls.find(x => x.method === 'Fetch.fulfillRequest' && x.params.requestId === 'p-trap');
  assert.ok(fulfillTrap);
  const body = Buffer.from(fulfillTrap.params.body, 'base64').toString('utf8');
  assert.equal(body.length, trapCode.length);
  assert.equal(body, 'function trap(){void 0  ;return "debugger";}');
  assert.equal(fulfillTrap.params.responseHeaders.some(h => h.name.toLowerCase() === 'content-encoding'), false);

  await c.stop();
  const cov = fs.readFileSync(path.join(root, 'run', 'coverage.jsonl'), 'utf8');
  assert.match(cov, /"kind":"script-debugger-stripped"/);
});

test('--mode deep --hooks none --async-depth 0 runs zero main-world JS hooks while arming full CDP Network & Debugger', async t => {
  const root = temp(t);
  const client = new FakeCdp();
  const origSend = client.send.bind(client);
  client.send = async (method, params = {}, sid) => {
    const base = await origSend(method, params, sid);
    if (method === 'Target.createTarget') {
      const targetId = 'blank-1';
      queueMicrotask(() => client.emitTarget({ targetId, type: 'page', url: 'about:blank' }));
      return { targetId };
    }
    return base;
  };
  client.scripts.set('scr-zero-js', 'function sign(){return 123;}');

  const c = new Collector({ client, outDir: path.join(root, 'run'), mode: 'deep', hooks: 'none', asyncDepth: 0 });
  await c.start();
  const tab = await c.newTab('https://zero-js.example/');
  assert.equal(tab.navigationSent, true);
  await Promise.all([...c.navigationTasks]);
  assert.equal(c.state.navigationAcknowledged, true);

  const wSid = client.emitTarget({ targetId: 'w-zero', type: 'worker', url: 'https://zero-js.example/w.js' }, true);
  await settle(c);

  // Zero JS hook / Runtime / async-stack CDP calls
  for (const forbidden of [
    'Page.enable',
    'Runtime.enable',
    'Runtime.addBinding',
    'Page.addScriptToEvaluateOnNewDocument',
    'Runtime.evaluate',
    'Debugger.setAsyncCallStackDepth',
  ]) {
    assert.equal(client.calls.some(x => x.method === forbidden), false, `must not call ${forbidden}`);
  }

  // Full CDP Network + DOMStorage + Debugger armed
  assert.ok(client.calls.some(x => x.method === 'Network.enable' && x.sid === 's-blank-1'));
  assert.ok(client.calls.some(x => x.method === 'DOMStorage.enable' && x.sid === 's-blank-1'));
  assert.ok(client.calls.some(x => x.method === 'Debugger.enable' && x.sid === 's-blank-1'));
  assert.ok(client.calls.some(x => x.method === 'Debugger.setSkipAllPauses' && x.params.skip === true && x.sid === 's-blank-1'));
  assert.ok(client.calls.some(x => x.method === 'Debugger.enable' && x.sid === wSid));
  assert.equal(c.state.coverageStatus, 'cdp-debugger');
  assert.deepEqual(c.state.enabledHooks, []);
  assert.equal(c.state.asyncStackDepth, 0);

  client.emit('event', { method: 'Debugger.scriptParsed', sessionId: 's-blank-1', params: { scriptId: 'scr-zero-js', url: 'https://zero-js.example/sign.js', startLine: 0, endLine: 1 } });
  await settle(c);
  await c.stop();

  const scriptRows = fs.readFileSync(path.join(root, 'run', 'scripts.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(scriptRows.some(r => r.kind === 'script-source' && r.scriptId === 'scr-zero-js'));
});

test('modular --hooks wasm,crypto only hooks selected APIs and leaves fetch/WebSocket/EventSource/console/cookie untouched', async () => {
  const sent = [];
  const context = vm.createContext({
    location: { origin: 'https://mod.example', href: 'https://mod.example/' },
    performance,
    btoa,
    TextEncoder, TextDecoder, Headers, Request, Response, URL, URLSearchParams, ArrayBuffer, Uint8Array,
    setTimeout, clearTimeout,
    __bc_mod: x => sent.push(JSON.parse(x)),
  });
  vm.runInContext(`
    globalThis.window = globalThis;
    globalThis.Document = function Document() {};
    Object.defineProperty(Document.prototype, 'cookie', { configurable: true, get() { return ''; }, set(v) { this._c = v; } });
    globalThis.document = new Document();
    globalThis._origFetch = function fetch() { return Promise.resolve(new Response('ok')); };
    globalThis._origWS = class WebSocket {};
    globalThis._origES = class EventSource {};
    globalThis._origLog = function log() {};
    globalThis.fetch = globalThis._origFetch;
    globalThis.WebSocket = globalThis._origWS;
    globalThis.EventSource = globalThis._origES;
    globalThis.console = { log: globalThis._origLog };
    globalThis._origCookieSet = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie').set;
    globalThis.WebAssembly = {
      async instantiate(bytes) { return { instance: { exports: { hash() {} } }, module: {} }; },
    };
    globalThis.crypto = {
      subtle: {
        async digest(algo, data) { return new Uint8Array([1, 2, 3, 4]).buffer; },
      },
    };
  `, context);

  vm.runInContext(createPageHookRuntime({
    runId: 'mod-1',
    bindingName: '__bc_mod',
    stealth: true,
    captureStack: true,
    deepHooks: true,
    enabledHooks: ['wasm', 'crypto'],
    filter: { sameOrigin: false, captureAllPaths: true },
  }), context);

  // Unselected APIs must remain 100% original native references
  assert.equal(context.fetch, context._origFetch);
  assert.equal(context.WebSocket, context._origWS);
  assert.equal(context.EventSource, context._origES);
  assert.equal(context.console.log, context._origLog);
  assert.equal(Object.getOwnPropertyDescriptor(context.Document.prototype, 'cookie').set, context._origCookieSet);

  await vm.runInContext(`
    (async function modFlow() {
      await WebAssembly.instantiate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
      await crypto.subtle.digest('SHA-256', new Uint8Array([9, 8, 7]));
    })();
  `, context);
  await new Promise(r => setTimeout(r, 20));

  assert.ok(sent.some(e => e.phase === 'wasm_module' && e.exportNames.includes('hash')));
  assert.ok(sent.some(e => e.phase === 'crypto_subtle' && e.method === 'digest' && e.algorithm === 'SHA-256'));
});

test('anonymous wrappers leak zero __bc* frames in synchronous Error.stack and captureStack starts directly at caller frame', async () => {
  const sent = [];
  const context = vm.createContext({
    location: { origin: 'https://stack.example', href: 'https://stack.example/' },
    performance,
    btoa,
    TextEncoder, TextDecoder, Headers, Request, Response, URL, URLSearchParams, ArrayBuffer, Uint8Array,
    setTimeout, clearTimeout,
    __bc_stk: x => sent.push(JSON.parse(x)),
  });
  vm.runInContext(`
    globalThis.window = globalThis;
    globalThis.document = {};
    globalThis.fetch = function fetch(url) {
      if (String(url).includes('throw')) throw new TypeError('sync-fetch-boom');
      return Promise.resolve(new Response('ok'));
    };
    globalThis.WebSocket = class WebSocket {
      constructor(url) {
        if (String(url).includes('throw')) throw new SyntaxError('sync-ws-boom');
        this.url = url;
      }
      addEventListener() {}
      send() {}
    };
  `, context);

  vm.runInContext(createPageHookRuntime({
    runId: 'stk-1',
    bindingName: '__bc_stk',
    stealth: true,
    captureStack: true,
    deepHooks: true,
    filter: { sameOrigin: false, captureAllPaths: true },
  }), context);

  const result = await vm.runInContext(`
    (async function runChecks() {
      let fetchThrowStack = null;
      let wsThrowStack = null;
      function userFetchThrow() {
        try { fetch('https://stack.example/api/throw'); }
        catch (e) { fetchThrowStack = String(e.stack || ''); }
      }
      function userWsThrow() {
        try { new WebSocket('wss://stack.example/throw'); }
        catch (e) { wsThrowStack = String(e.stack || ''); }
      }
      async function userSignFlow() {
        await fetch('https://stack.example/api/sign');
      }
      function userWsFlow() {
        new WebSocket('wss://stack.example/live');
      }
      userFetchThrow();
      userWsThrow();
      await userSignFlow();
      userWsFlow();
      return { fetchThrowStack, wsThrowStack };
    })();
  `, context);
  await new Promise(r => setTimeout(r, 20));

  assert.ok(result.fetchThrowStack && result.fetchThrowStack.includes('userFetchThrow'));
  assert.doesNotMatch(result.fetchThrowStack, /__bc|museCapture|bitbrowser/i, 'sync fetch Error.stack must not leak internal names');
  assert.ok(result.wsThrowStack && result.wsThrowStack.includes('userWsThrow'));
  assert.doesNotMatch(result.wsThrowStack, /__bc|museCapture|bitbrowser/i, 'sync WebSocket Error.stack must not leak internal names');

  const fetchEvt = sent.find(e => e.transport === 'fetch' && e.phase === 'start' && e.request.url.includes('/api/sign'));
  assert.ok(fetchEvt && Array.isArray(fetchEvt.callStack) && fetchEvt.callStack.length > 0);
  assert.match(fetchEvt.callStack[0], /userSignFlow/, `first captured stack frame should be caller userSignFlow, got: ${fetchEvt.callStack[0]}`);
  assert.ok(fetchEvt.callStack.every(l => !/__bc/i.test(l)));

  const wsEvt = sent.find(e => e.transport === 'websocket' && e.phase === 'ws_open');
  assert.ok(wsEvt && Array.isArray(wsEvt.callStack) && wsEvt.callStack.length > 0);
  assert.match(wsEvt.callStack[0], /userWsFlow/, `first captured WS stack frame should be caller userWsFlow, got: ${wsEvt.callStack[0]}`);
  assert.ok(wsEvt.callStack.every(l => !/__bc/i.test(l)));
});

test('CLI parse validates --hooks, --async-depth, and --strip-script-debugger across modes', () => {
  assert.deepEqual(parse(['start', '-p', 'chrome', '--mode', 'deep', '--hooks', 'none']).hooks, []);
  assert.deepEqual(parse(['start', '-p', 'chrome', '--mode', 'deep', '--hooks', 'wasm,crypto']).hooks, ['crypto', 'wasm']);
  assert.deepEqual(parse(['start', '-p', 'chrome', '--mode', 'standard', '--hooks', 'network']).hooks, ['fetch', 'xhr', 'beacon']);
  assert.equal(parse(['start', '-p', 'chrome', '--mode', 'deep', '--hooks', 'all']).hooks.length, 10);
  assert.deepEqual(parse(['start', '-p', 'chrome', '--mode', 'stealth', '--hooks', 'none']).hooks, []);
  assert.throws(() => parse(['start', '-p', 'chrome', '--mode', 'deep', '--hooks', 'badhook']), { code: 'INVALID_OPTION' });
  assert.throws(() => parse(['start', '-p', 'chrome', '--mode', 'deep', '--hooks', 'none,fetch']), { code: 'INVALID_OPTION' });
  assert.throws(() => parse(['start', '-p', 'chrome', '--mode', 'stealth', '--hooks', 'fetch']), { code: 'UNSUPPORTED_OPTION' });
  assert.throws(() => parse(['status', '-p', 'chrome', '--hooks', 'none']), { code: 'UNSUPPORTED_OPTION' });

  assert.equal(parse(['start', '-p', 'chrome', '--mode', 'deep', '--async-depth', '0']).asyncDepth, 0);
  assert.equal(parse(['start', '-p', 'chrome', '--mode', 'deep', '--async-depth', '64']).asyncDepth, 64);
  assert.throws(() => parse(['start', '-p', 'chrome', '--mode', 'deep', '--async-depth', '65']), { code: 'INVALID_OPTION' });
  assert.throws(() => parse(['start', '-p', 'chrome', '--mode', 'deep', '--async-depth', '-1']), { code: 'INVALID_OPTION' });
  assert.throws(() => parse(['start', '-p', 'chrome', '--mode', 'standard', '--async-depth', '8']), { code: 'UNSUPPORTED_OPTION' });
  assert.throws(() => parse(['status', '-p', 'chrome', '--async-depth', '0']), { code: 'UNSUPPORTED_OPTION' });

  for (const mode of ['stealth', 'standard', 'deep']) {
    assert.equal(parse(['start', '-p', 'chrome', '--mode', mode, '--strip-script-debugger']).stripScriptDebugger, true);
  }
  assert.throws(() => parse(['status', '-p', 'chrome', '--strip-script-debugger']), { code: 'UNSUPPORTED_OPTION' });
  assert.throws(() => parse(['start', '-p', 'chrome', '--mode', 'deep', '--hooks', 'none', '--strip-debugger']), { code: 'UNSUPPORTED_OPTION' });
});
