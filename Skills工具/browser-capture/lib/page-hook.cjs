'use strict';

const fs = require('node:fs');
const { commandDiagnostic } = require('./cdp-client.cjs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const HOOK_VERSION = '4.0.0';
const DEFAULT_MAX_BODY_BYTES = 16 * 1024 * 1024;
const installations = new WeakMap();
const dispatchers = new WeakMap();

function defaultStoreKey(runId) {
  return '_bc_' + String(runId || 'default').replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
}

// One event/close listener pair per client, even with many concurrent iframes.
function subscribeSession(client, key, listener, onClosed) {
  let dispatcher = dispatchers.get(client);
  if (!dispatcher) {
    const subscribers = new Map();
    const event = message => {
      const detached = message.method === 'Target.detachedFromTarget' ? message.params?.sessionId
        : message.method === 'Inspector.detached' ? message.sessionId : undefined;
      if (detached !== undefined) subscribers.get(detached || '')?.onClosed('session-detached');
      else subscribers.get(message.sessionId || '')?.listener(message);
    };
    const close = () => { for (const subscriber of [...subscribers.values()]) subscriber.onClosed('client-disconnected'); };
    dispatcher = { subscribers, event, close };
    dispatchers.set(client, dispatcher);
    client.on('event', event);
    client.on('close', close);
  }
  dispatcher.subscribers.set(key, { listener, onClosed });
  return () => {
    dispatcher.subscribers.delete(key);
    if (!dispatcher.subscribers.size) {
      const off = typeof client.off === 'function' ? client.off.bind(client) : client.removeListener.bind(client);
      off('event', dispatcher.event);
      off('close', dispatcher.close);
      dispatchers.delete(client);
    }
  };
}

function closedProtocolError(error, context = false) {
  if (error.code === 'CDP_SESSION_CLOSED') return 'session';
  const message = error.protocolError?.message || error.message || '';
  if (/^(?:Session with given id not found|No session with given id)[.!]?$/.test(message)) return 'session';
  if (context && /^(?:Cannot find context with specified id|Cannot find execution context with id|Execution context was destroyed)[.!]?$/.test(message)) return 'context';
  return null;
}

// This function is serialized, so it must not reference module-scope values.
function pageRuntime(settings) {
  'use strict';
  const g = globalThis;
  const VERSION = '4.0.0';
  const stealth = settings.stealth !== false;
  const captureStackEnabled = !!settings.captureStack;
  const deepHooksEnabled = !!settings.deepHooks;
  const enabledSet = new Set(Array.isArray(settings.enabledHooks)
    ? settings.enabledHooks
    : (deepHooksEnabled ? ['fetch', 'xhr', 'beacon', 'ws', 'sse', 'cookie', 'crypto', 'wasm', 'dom', 'console'] : ['fetch', 'xhr', 'beacon']));
  const hasHook = name => enabledSet.has(name);
  const safeRuntimeHooksEnabled = hasHook('console') && !settings.cdpRuntimeEnabled;
  const stripDebuggerEnabled = !!settings.stripDebugger;
  const exposeGlobal = !!settings.exposeGlobal;

  if (!g.document || !g.window) {
    return { version: VERSION, installed: false, ready: false, coverage: { mainWorldOnly: true, workers: 'not_injected', limitations: ['non_document_context'] } };
  }

  const STORE_SYM = g.Symbol.for(settings.storeKey);
  let store = g[STORE_SYM];
  if (!store || typeof store !== 'object') {
    store = { generations: Object.create(null), controller: null };
    try {
      Object.defineProperty(g, STORE_SYM, { value: store, writable: true, enumerable: false, configurable: true });
    } catch (_) {
      g[STORE_SYM] = store;
    }
  }
  const generations = store.generations;
  const generation = settings.generation || 1;
  const previous = generations[settings.runId];
  if (previous && (previous.generation > generation || (previous.retired && previous.generation >= generation))) {
    return { installed: false, ready: false, staleGeneration: true };
  }
  generations[settings.runId] = { generation, retired: false };

  const existing = store.controller;
  if (existing && existing.version === VERSION && existing.status().installed) {
    if (existing.runId === settings.runId && (existing.captureGeneration || 1) > (settings.generation || 1)) return existing.status();
    return existing.configure(settings);
  }

  const maxBytes = settings.maxBodyBytes;
  const clock = () => ({ wallTimeMs: Date.now(), monotonicTimeMs: g.performance && typeof g.performance.now === 'function' ? g.performance.now() : null });
  const errorInfo = error => ({ name: String(error && error.name || 'Error'), message: String(error && error.message || error || 'unknown') });
  const documentId = 'doc-' + (g.crypto && typeof g.crypto.randomUUID === 'function' ? g.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  let sequence = 0;
  let installed = true;
  let bindingName = settings.bindingName;
  let hostBinding = null;
  let runId = settings.runId;
  let ringBytes = 0;
  const ring = [];
  const tasks = new Set();
  const cancelReads = new Set();
  const xhrCleanups = new Set();
  const cancelTasks = new Set();
  let domObserver = null;
  let domReadyListener = null;
  let lastUninstall;
  const counters = { emitted: 0, bindingSent: 0, bindingFailures: 0, fallbackDroppedRecords: 0, fallbackDroppedBytes: 0, observerErrors: 0, readFailures: 0, capacitySkipped: 0, activeReads: 0, cancelledReads: 0 };
  const legacy = !!g.__caaHooked;
  const coverage = {
    mainWorldOnly: true,
    workers: 'not_injected',
    responseHeaders: 'script_visible_only',
    rawWireBytes: false,
    hostPrimary: true,
    stealthHardened: stealth,
    captureStack: captureStackEnabled,
    deepHooks: deepHooksEnabled,
    bindingAcknowledgement: 'not_available',
    legacyHookPresent: legacy,
    limitations: legacy ? ['legacy_hook_present', 'existing_wrappers_retained_native_recovery_unavailable'] : [],
  };
  try { if (g.location.origin === 'null') coverage.limitations.push('opaque_origin_filter_scope'); } catch (_) { coverage.limitations.push('document_origin_unavailable'); }

  const originals = {};
  const descriptors = {};
  const wrappers = {};
  const xhrStates = new WeakMap();
  const wsUrls = new WeakMap();
  const encoder = new g.TextEncoder();
  const decoder = () => new g.TextDecoder('utf-8', { fatal: false });
  const filter = settings.filter || {};
  let patterns = [];
  try { patterns = (filter.pathPatterns || []).map(p => new RegExp(p)); } catch (_) { coverage.limitations.push('invalid_path_pattern'); }

  // Stealth native-toString disguise via WeakMap + Proxy so wrapped APIs report [native code].
  const nativeToStringMap = new WeakMap();
  const origFnToString = g.Function && g.Function.prototype && g.Function.prototype.toString;
  let toStringProxy = null;
  if (stealth && typeof origFnToString === 'function' && typeof g.Proxy === 'function') {
    try {
      descriptors.fnToString = Object.getOwnPropertyDescriptor(g.Function.prototype, 'toString');
      toStringProxy = new g.Proxy(origFnToString, {
        apply(target, thisArg, argArray) {
          const orig = nativeToStringMap.get(thisArg);
          return Reflect.apply(target, orig || thisArg, argArray);
        },
      });
      nativeToStringMap.set(toStringProxy, origFnToString);
      Object.defineProperty(g.Function.prototype, 'toString', {
        ...(descriptors.fnToString || { writable: true, enumerable: false, configurable: true }),
        value: toStringProxy,
      });
    } catch (_) {
      toStringProxy = null;
    }
  }

  function wrapNative(origFn, invoke) {
    if (!stealth || typeof g.Proxy !== 'function') return invoke;
    const proxy = new g.Proxy(origFn, {
      apply(target, thisArg, argArray) {
        return invoke.apply(thisArg, argArray);
      },
    });
    nativeToStringMap.set(proxy, origFn);
    return proxy;
  }

  function installProp(owner, key, wrapped, descKey) {
    try {
      const desc = Object.getOwnPropertyDescriptor(owner, key);
      if (descKey) descriptors[descKey] = desc || null;
      if (desc && desc.configurable && !desc.get && !desc.set) {
        Object.defineProperty(owner, key, { ...desc, value: wrapped });
        return;
      }
    } catch (_) { /* fall through to direct assignment */ }
    owner[key] = wrapped;
  }

  function captureBinding() {
    if (typeof g[bindingName] === 'function') {
      hostBinding = g[bindingName];
      if (stealth) {
        try { delete g[bindingName]; } catch (_) {}
      }
    }
  }
  captureBinding();

  const applyDrop = stealth && typeof g.Proxy === 'function' ? 3 : 2;
  const captureStack = (drop = applyDrop) => {
    if (!captureStackEnabled) return null;
    try {
      const raw = String((new g.Error()).stack || '');
      const lines = raw.split('\n');
      const frames = [];
      let skipped = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (skipped < drop) { skipped++; continue; }
        frames.push(line);
        if (frames.length >= 25) break;
      }
      return frames;
    } catch (_) { return null; }
  };

  function status() {
    return { version: VERSION, runId, documentId, installed, ready: installed, coverage, counters: { ...counters, fallbackRecords: ring.length, fallbackBytes: ringBytes, pendingTasks: tasks.size } };
  }
  function retain(record, json) {
    const bytes = json.length * 2;
    if (bytes > settings.fallbackMaxBytes || settings.fallbackMaxRecords === 0) {
      counters.fallbackDroppedRecords++;
      counters.fallbackDroppedBytes += bytes;
      return;
    }
    while (ring.length && (ring.length >= settings.fallbackMaxRecords || ringBytes + bytes > settings.fallbackMaxBytes)) {
      const old = ring.shift();
      ringBytes -= old.bytes;
      counters.fallbackDroppedRecords++;
      counters.fallbackDroppedBytes += old.bytes;
    }
    ring.push({ record, json, bytes });
    ringBytes += bytes;
  }
  function deliver(json) {
    if (!hostBinding || !stealth) captureBinding();
    if (typeof hostBinding !== 'function') throw new Error('host_binding_unavailable');
    hostBinding(json);
    counters.bindingSent++;
  }
  function emit(record) {
    counters.emitted++;
    const complete = { source: 'muse-page-hook', schemaVersion: 1, hookVersion: VERSION, runId, documentId, recordedAt: clock(), ...record };
    try {
      const json = JSON.stringify(complete);
      try { deliver(json); } catch (_) { counters.bindingFailures++; retain(complete, json); }
    } catch (_) { counters.observerErrors++; }
  }
  function flushFallback() {
    captureBinding();
    while (ring.length) {
      try { deliver(ring[0].json); } catch (_) { counters.bindingFailures++; break; }
      ringBytes -= ring.shift().bytes;
    }
    return status();
  }
  function observe(fn) {
    try { return fn(); } catch (_) { counters.observerErrors++; return null; }
  }
  function selected(rawUrl, method) {
    try {
      const url = new g.URL(rawUrl, g.location.href);
      const hosts = filter.hosts || [];
      if (hosts.length) {
        if (!hosts.some(host => host.startsWith('*.') ? url.hostname.endsWith(host.slice(1)) && url.hostname !== host.slice(2) : url.host === host || url.hostname === host)) return null;
      } else if (filter.sameOrigin !== false && url.origin !== g.location.origin) return null;
      const pathname = url.pathname;
      const defaults = /^\/(?:api(?:\/|$)|view(?:\/|$)|monitoring(?:\/|$)|caa-events(?:\/|$)|native(?:\/|$))/;
      const custom = (filter.pathPrefixes || []).length || patterns.length;
      const pathMatches = filter.captureAllPaths || (custom ? (filter.pathPrefixes || []).some(p => pathname.startsWith(p)) || patterns.some(p => p.test(pathname)) : defaults.test(pathname));
      if (!pathMatches && !(filter.rootPost !== false && pathname === '/' && method.toUpperCase() === 'POST')) return null;
      return url.href;
    } catch (_) { return null; }
  }
  function headers(value) {
    try {
      const entries = [];
      new g.Headers(value).forEach((v, k) => entries.push([k, v]));
      return { status: 'captured', scope: 'script_visible', entries, unobservableHeadersNotInferred: ['set-cookie'] };
    } catch (error) { return { status: 'unknown', scope: 'script_visible', reason: 'headers_unavailable', error: errorInfo(error) }; }
  }
  function normalizeMethod(value) {
    const method = String(value);
    return /^(delete|get|head|options|post|put)$/i.test(method) ? method.toUpperCase() : method;
  }
  function createRecord(transport, method, rawUrl, requestHeaders, startedAt, callStack) {
    const url = selected(rawUrl, method);
    if (!url) return null;
    return {
      eventId: documentId + ':' + (++sequence),
      transport,
      startedAt: startedAt || clock(),
      ...(callStack ? { callStack } : {}),
      request: { method, url, headers: requestHeaders, body: { status: 'pending' } },
    };
  }
  function event(record, phase, fields) {
    emit({ eventId: record.eventId, transport: record.transport, startedAt: record.startedAt, phase, ...(phase === 'start' && record.callStack ? { callStack: record.callStack } : {}), ...fields });
  }
  function fail(record, phase, error) { if (record) event(record, phase, { error: errorInfo(error) }); }
  function finishBody(body) { return { ...body, completedAt: clock() }; }
  function utf8Size(text) {
    let bytes = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 0x80) bytes++;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) { bytes += 4; i++; }
      else bytes += 3;
    }
    return bytes;
  }
  function textBody(text, source, contentType, extra) {
    const bytesTotal = utf8Size(text);
    const buffer = new Uint8Array(Math.min(maxBytes, bytesTotal));
    const result = encoder.encodeInto(text, buffer);
    return { status: bytesTotal > maxBytes ? 'truncated' : 'captured', encoding: 'utf8', data: decoder().decode(buffer.subarray(0, result.written)), source, contentType: contentType || null, bytesTotal, bytesCaptured: result.written, truncated: bytesTotal > maxBytes, byteCountSource: 'utf8_reencoded_script_text', ...extra };
  }
  function toBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      const part = bytes.subarray(i, Math.min(i + 8192, bytes.length));
      for (let j = 0; j < part.length; j++) binary += String.fromCharCode(part[j]);
    }
    return g.btoa(binary);
  }
  function textual(contentType) { return /(?:^text\/|json|javascript|xml|x-www-form-urlencoded|graphql|svg)/i.test(contentType || ''); }
  function bytesBody(bytes, source, contentType, bytesTotal, bytesObserved, truncated) {
    const text = textual(contentType);
    return { status: truncated ? 'truncated' : 'captured', encoding: text ? 'utf8' : 'base64', data: text ? decoder().decode(bytes) : toBase64(bytes), source, contentType: contentType || null, bytesTotal, bytesObserved, bytesCaptured: bytes.length, truncated: !!truncated, byteCountSource: 'script_visible_body_bytes', rawWireBytes: false };
  }
  function cancelStream(stream) {
    try { const promise = stream.cancel(); if (promise && typeof promise.catch === 'function') promise.catch(() => {}); } catch (_) { counters.readFailures++; }
  }
  async function readStream(stream, source, contentType, streamRecord) {
    let reader, stopped = false, finished = false, timer, cancelResolve;
    const deadline = new Promise(resolve => { cancelResolve = resolve; timer = g.setTimeout(() => resolve({ stop: 'read_timeout' }), settings.maxReadMs); });
    const cancel = () => { counters.cancelledReads++; cancelResolve({ stop: 'capture_stopped' }); };
    cancelReads.add(cancel);
    let captured = 0, observed = 0, chunkIndex = 0;
    const emitLiveChunks = hasHook('sse') && !!streamRecord && /(?:event-stream|ndjson|stream-json)/i.test(contentType || '');
    const chunks = [];
    try {
      reader = stream.getReader();
      while (true) {
        const result = await Promise.race([reader.read(), deadline]);
        if (result.stop) {
          stopped = true;
          return { status: captured ? 'truncated' : 'unavailable', reason: result.stop, source, contentType: contentType || null, bytesTotal: null, bytesObserved: observed, bytesCaptured: captured, truncated: !!captured, ...capturedData() };
        }
        if (result.done) { finished = true; return bytesBody(join(), source, contentType, observed, observed, false); }
        const bytes = result.value instanceof Uint8Array ? result.value : new Uint8Array(result.value);
        observed += bytes.byteLength;
        if (emitLiveChunks && bytes.byteLength > 0) {
          const previewSlice = bytes.byteLength > 65536 ? bytes.subarray(0, 65536) : bytes;
          observe(() => event(streamRecord, 'response_chunk', {
            chunkIndex: chunkIndex++,
            bytes: bytes.byteLength,
            truncated: bytes.byteLength > 65536,
            encoding: 'utf8',
            data: decoder().decode(previewSlice),
          }));
        }
        const take = Math.min(bytes.byteLength, Math.max(0, maxBytes - captured));
        if (take) { chunks.push(bytes.slice(0, take)); captured += take; }
        if (observed > maxBytes) return bytesBody(join(), source, contentType, null, observed, true);
      }
    } catch (error) {
      counters.readFailures++;
      return { status: captured ? 'truncated' : 'unavailable', reason: 'body_read_error', error: errorInfo(error), source, contentType: contentType || null, bytesTotal: null, bytesObserved: observed, bytesCaptured: captured, truncated: !!captured, ...capturedData() };
    } finally {
      g.clearTimeout(timer);
      cancelReads.delete(cancel);
      if (reader && !finished) {
        try { const promise = reader.cancel(stopped ? 'capture_stopped' : 'capture_limit'); if (promise && typeof promise.catch === 'function') promise.catch(() => {}); } catch (_) { counters.readFailures++; }
      }
    }
    function join() {
      const result = new Uint8Array(captured); let offset = 0;
      for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
      return result;
    }
    function capturedData() {
      if (!captured) return {};
      const bytes = join();
      return { encoding: textual(contentType) ? 'utf8' : 'base64', data: textual(contentType) ? decoder().decode(bytes) : toBase64(bytes) };
    }
  }
  function describeBody(value, source) {
    if (value === undefined || value === null) return { kind: 'state', body: { status: 'none', reason: 'no_body', source, bytesTotal: 0, bytesCaptured: 0, truncated: false } };
    if (typeof value === 'string') return { kind: 'text', value, source, contentType: 'text/plain;charset=UTF-8' };
    if (g.ReadableStream && value instanceof g.ReadableStream) return { kind: 'state', body: { status: 'unavailable_stream', reason: 'original_stream_not_consumed_or_teed', source, bytesTotal: null, bytesCaptured: 0 } };
    if (g.URLSearchParams && value instanceof g.URLSearchParams) return { kind: 'text', value: value.toString(), source, contentType: 'application/x-www-form-urlencoded;charset=UTF-8' };
    if (g.Blob && value instanceof g.Blob) return { kind: 'blob', value, source, contentType: value.type || null };
    if (g.FormData && value instanceof g.FormData) return { kind: 'formdata', entries: Array.from(value.entries()), source };
    if (g.ArrayBuffer && value instanceof g.ArrayBuffer) return { kind: 'bytes', value: new Uint8Array(value.slice(0, maxBytes)), bytesTotal: value.byteLength, source };
    if (g.ArrayBuffer && g.ArrayBuffer.isView(value)) return { kind: 'bytes', value: new Uint8Array(value.buffer, value.byteOffset, Math.min(value.byteLength, maxBytes)).slice(), bytesTotal: value.byteLength, source };
    return { kind: 'state', body: { status: 'unsupported', reason: 'body_type_not_observed', source, type: Object.prototype.toString.call(value), bytesTotal: null, bytesCaptured: 0 } };
  }
  async function readBody(spec) {
    if (spec.kind === 'state') return spec.body;
    if (spec.kind === 'text') return textBody(spec.value, spec.source, spec.contentType, spec.extra);
    if (spec.kind === 'bytes') return bytesBody(spec.value, spec.source, spec.contentType, spec.bytesTotal, spec.bytesTotal, spec.bytesTotal > maxBytes);
    if (spec.kind === 'stream') return readStream(spec.value, spec.source, spec.contentType, spec.streamRecord);
    if (spec.kind === 'blob') {
      const bytes = new Uint8Array(await spec.value.slice(0, maxBytes).arrayBuffer());
      return bytesBody(bytes, spec.source, spec.contentType, spec.value.size, spec.value.size, spec.value.size > maxBytes);
    }
    if (spec.kind === 'formdata') {
      const entries = []; let bytesTotal = 0, bytesCaptured = 0, truncated = false;
      for (const [name, value] of spec.entries) {
        const field = typeof value === 'string' ? { name, kind: 'text', value } : { name, kind: 'file', filename: String(value.name || ''), contentType: value.type || '', size: value.size, lastModified: value.lastModified === undefined ? null : value.lastModified, contents: 'not_read' };
        const size = utf8Size(JSON.stringify(field)); bytesTotal += size;
        if (bytesCaptured + size <= maxBytes) { entries.push(field); bytesCaptured += size; } else truncated = true;
      }
      return { status: truncated ? 'truncated' : 'captured', source: spec.source, encoding: 'formdata', representation: 'formdata_entries', entries, bytesTotal, bytesCaptured, byteCountSource: 'serialized_field_metadata', truncated, rawMultipartAvailable: false, contentType: 'multipart/form-data; boundary=not_observed' };
    }
    return { status: 'unknown', reason: 'unrecognized_body_descriptor', source: spec.source };
  }
  function queueBody(record, side, spec) {
    const phase = side === 'request' ? 'request_body' : 'response_body';
    if (counters.activeReads >= settings.maxPendingReads) {
      counters.capacitySkipped++;
      if (spec.kind === 'stream') cancelStream(spec.value);
      event(record, phase, { [side]: { body: finishBody({ status: 'unavailable_capacity', reason: 'max_pending_reads', source: spec.source, bytesTotal: null, bytesCaptured: 0 }) } });
      return;
    }
    counters.activeReads++;
    let cancelTask;
    const stoppedTask = new Promise(resolve => {
      cancelTask = () => resolve({ status: 'unavailable', reason: 'capture_stopped', source: spec.source, bytesTotal: null, bytesCaptured: 0 });
    });
    cancelTasks.add(cancelTask);
    const task = Promise.race([
      Promise.resolve().then(() => {
        if (installed) return readBody(spec);
        if (spec.kind === 'stream') cancelStream(spec.value);
        return { status: 'unavailable', reason: 'capture_stopped', source: spec.source, bytesTotal: null, bytesCaptured: 0 };
      }),
      stoppedTask,
    ]).catch(error => {
      counters.readFailures++;
      return { status: 'unavailable', reason: 'body_read_error', error: errorInfo(error), source: spec.source, bytesTotal: null, bytesCaptured: 0 };
    }).then(body => observe(() => event(record, phase, { [side]: { body: finishBody(body) } }))).finally(() => { counters.activeReads--; tasks.delete(task); cancelTasks.delete(cancelTask); });
    tasks.add(task);
  }
  function fetchDescription(input, init, startedAt, callStack) {
    const request = g.Request && input instanceof g.Request ? input : null;
    const methodInput = init && init.method !== undefined ? init.method : request ? request.method : 'GET';
    const method = normalizeMethod(methodInput);
    const rawUrl = request ? request.url : input instanceof g.URL ? input.href : String(input);
    const requestHeaders = init && init.headers !== undefined ? headers(init.headers) : request ? headers(request.headers) : headers(undefined);
    const record = createRecord('fetch', method, rawUrl, requestHeaders, startedAt, callStack);
    if (!record) return null;
    let body;
    if (init && init.body !== undefined && init.body !== null) body = describeBody(init.body, 'fetch_init_body');
    else if (request && request.body !== null) {
      try {
        const clone = request.clone();
        body = { kind: 'stream', value: clone.body, source: 'request_clone', contentType: (init && init.headers !== undefined ? new g.Headers(init.headers) : request.headers).get('content-type') };
      } catch (error) { body = { kind: 'state', body: { status: 'unavailable', reason: 'request_clone_failed', source: 'request_clone', error: errorInfo(error), bytesTotal: null, bytesCaptured: 0 } }; }
    } else body = describeBody(null, 'fetch_request');
    return { record, body };
  }
  function observeFetchResponse(record, response) {
    const meta = { status: response.status, statusText: response.statusText, url: response.url, type: response.type, redirected: !!response.redirected, headers: headers(response.headers), body: { status: 'pending' } };
    event(record, 'response', { response: meta });
    if (response.type === 'opaque' || response.type === 'opaqueredirect') {
      queueBody(record, 'response', { kind: 'state', body: { status: 'opaque', reason: 'response_not_script_readable', source: 'response_clone', bytesTotal: null, bytesCaptured: 0 } });
    } else if (response.body === null) {
      queueBody(record, 'response', { kind: 'state', body: { status: 'none', reason: 'response_has_no_body', source: 'response_clone', bytesTotal: 0, bytesCaptured: 0, truncated: false } });
    } else if (counters.activeReads >= settings.maxPendingReads) {
      queueBody(record, 'response', { kind: 'state', body: { status: 'unavailable_capacity', reason: 'max_pending_reads', source: 'response_clone' } });
    } else {
      try {
        const clone = response.clone();
        queueBody(record, 'response', { kind: 'stream', value: clone.body, source: 'response_clone', contentType: response.headers.get('content-type'), streamRecord: record });
      } catch (error) { queueBody(record, 'response', { kind: 'state', body: { status: 'unavailable', reason: 'response_clone_failed', source: 'response_clone', error: errorInfo(error), bytesTotal: null, bytesCaptured: 0 } }); }
    }
  }

  // 1) fetch hook
  if (hasHook('fetch') && typeof g.fetch === 'function') {
    originals.fetch = g.fetch;
    wrappers.fetch = wrapNative(originals.fetch, function () {
      if (!installed) return originals.fetch.apply(this, arguments);
      const calledAt = observe(clock);
      const stack = captureStack();
      const details = observe(() => fetchDescription(arguments[0], arguments[1], calledAt, stack));
      if (details) observe(() => event(details.record, 'start', { request: details.record.request }));
      let result;
      try { result = originals.fetch.apply(this, arguments); }
      catch (error) {
        if (details) {
          observe(() => fail(details.record, 'sync_throw', error));
          if (details.body.kind === 'stream') cancelStream(details.body.value);
          observe(() => event(details.record, 'request_body', { request: { body: finishBody({ status: 'unavailable', reason: 'native_fetch_sync_throw', source: details.body.source }) } }));
        }
        throw error;
      }
      if (details) {
        observe(() => queueBody(details.record, 'request', details.body));
        observe(() => {
          const observer = result.then(response => { if (installed) observe(() => observeFetchResponse(details.record, response)); }, error => { if (installed) observe(() => fail(details.record, 'rejected', error)); });
          if (observer && typeof observer.catch === 'function') observer.catch(() => { counters.observerErrors++; });
        });
      }
      return result;
    });
    observe(() => installProp(g, 'fetch', wrappers.fetch, 'fetch'));
    coverage.fetch = g.fetch === wrappers.fetch ? 'installed' : 'unavailable';
  } else coverage.fetch = 'absent';

  // 2) XMLHttpRequest hook
  function xhrResponseSpec(xhr, responseType) {
    const type = responseType || 'text';
    let contentType = null;
    try { contentType = xhr.getResponseHeader('content-type'); } catch (_) {}
    if (type === 'text') return { kind: 'text', value: xhr.responseText, source: 'xhr.responseText', contentType: contentType || 'text/plain', extra: { rawTextAvailable: true, rawWireBytes: false } };
    if (type === 'json') {
      if (xhr.response === null) return { kind: 'state', body: { status: 'unknown', reason: 'json_null_or_parse_failure_not_distinguishable', source: 'xhr.response', representation: 'parsed_json', rawTextAvailable: false, value: null, bytesTotal: null } };
      return { kind: 'text', value: JSON.stringify(xhr.response), source: 'xhr.response', contentType: 'application/json', extra: { representation: 'parsed_json_reserialized', rawTextAvailable: false } };
    }
    if (type === 'arraybuffer') {
      if (xhr.response === null) return { kind: 'state', body: { status: 'unknown', reason: 'null_arraybuffer_response', source: 'xhr.response', bytesTotal: null } };
      return { ...describeBody(xhr.response, 'xhr.response'), contentType: contentType || 'application/octet-stream' };
    }
    if (type === 'blob') return xhr.response === null ? { kind: 'state', body: { status: 'unknown', reason: 'null_blob_response', source: 'xhr.response' } } : describeBody(xhr.response, 'xhr.response');
    if (type === 'document') {
      const doc = xhr.responseXML || xhr.response;
      if (!doc) return { kind: 'state', body: { status: 'unknown', reason: 'document_response_unavailable', source: 'xhr.responseXML', rawTextAvailable: false } };
      const value = g.XMLSerializer ? new g.XMLSerializer().serializeToString(doc) : doc.documentElement && doc.documentElement.outerHTML;
      return value === undefined ? { kind: 'state', body: { status: 'unavailable', reason: 'document_serialization_unavailable', source: 'xhr.responseXML', rawTextAvailable: false } } : { kind: 'text', value, source: 'xhr.responseXML', contentType: contentType || 'text/xml', extra: { representation: 'serialized_dom', rawTextAvailable: false } };
    }
    return { kind: 'state', body: { status: 'unsupported', reason: 'xhr_response_type', responseType: type, source: 'xhr.response', bytesTotal: null } };
  }
  function xhrHeaders(xhr) {
    try {
      const raw = xhr.getAllResponseHeaders();
      return { status: 'captured', scope: 'script_visible', entries: raw.trim() ? raw.trim().split(/[\r\n]+/).map(line => { const at = line.indexOf(':'); return [line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim()]; }) : [], unobservableHeadersNotInferred: ['set-cookie'] };
    } catch (error) { return { status: 'unknown', scope: 'script_visible', reason: 'xhr_headers_unavailable', error: errorInfo(error) }; }
  }
  if (hasHook('xhr') && g.XMLHttpRequest && g.XMLHttpRequest.prototype) {
    const proto = g.XMLHttpRequest.prototype;
    originals.xhrOpen = proto.open;
    originals.xhrSend = proto.send;
    originals.xhrSetRequestHeader = proto.setRequestHeader;
    wrappers.xhrOpen = wrapNative(originals.xhrOpen, function (method, url) {
      if (!installed) return originals.xhrOpen.apply(this, arguments);
      const previous = xhrStates.get(this);
      observe(() => { if (previous && previous.active && this.readyState === 4) previous.active.finish('loadend', 'snapshot_before_reopen'); });
      let result;
      try { result = originals.xhrOpen.apply(this, arguments); }
      catch (error) {
        const stack = captureStack();
        observe(() => { const rec = createRecord('xhr', String(method), String(url), headers(undefined), null, stack); if (rec) { event(rec, 'start', { request: rec.request }); event(rec, 'request_body', { request: { body: finishBody({ status: 'unavailable', reason: 'xhr_open_throw', source: 'xhr.open' }) } }); fail(rec, 'open_throw', error); } });
        throw error;
      }
      observe(() => {
        if (previous && previous.active) previous.active.finish('reused', 'unavailable_reused');
        xhrStates.set(this, { method: normalizeMethod(method), url: String(url), headers: [], active: null });
      });
      return result;
    });
    if (typeof originals.xhrSetRequestHeader === 'function') {
      wrappers.xhrSetRequestHeader = wrapNative(originals.xhrSetRequestHeader, function (name, value) {
        if (!installed) return originals.xhrSetRequestHeader.apply(this, arguments);
        const result = originals.xhrSetRequestHeader.apply(this, arguments);
        observe(() => { const state = xhrStates.get(this); if (state) state.headers.push([String(name), String(value)]); });
        return result;
      });
    }
    wrappers.xhrSend = wrapNative(originals.xhrSend, function (body) {
      if (!installed) return originals.xhrSend.apply(this, arguments);
      const xhr = this;
      const state = xhrStates.get(xhr);
      const previousActive = state && state.active;
      const stack = captureStack();
      const rec = observe(() => state && createRecord('xhr', state.method, state.url, headers(state.headers), null, stack));
      const requestBody = rec ? observe(() => /^(GET|HEAD)$/.test(state.method)
        ? { kind: 'state', body: { status: 'none', reason: 'method_ignores_send_body', ignoredArgument: body !== null && body !== undefined, source: 'xhr.send', bytesTotal: 0, bytesCaptured: 0, truncated: false } }
        : describeBody(body, 'xhr.send')) || { kind: 'state', body: { status: 'unavailable', reason: 'body_snapshot_failed', source: 'xhr.send', bytesTotal: null } } : null;
      let cleanup = () => {};
      if (rec) observe(() => {
        event(rec, 'start', { request: rec.request });
        let done = false;
        const finish = (type, boundary) => {
          if (done) return;
          done = true;
          observe(cleanup);
          observe(() => {
            const meta = type === 'reused'
              ? { status: null, statusSource: 'unavailable_on_reuse', url: rec.request.url, headers: { status: 'unknown', reason: 'xhr_reused' }, outcome: type, body: { status: 'pending' } }
              : { status: xhr.status, statusText: xhr.statusText, url: xhr.responseURL || rec.request.url, responseType: xhr.responseType || 'text', headers: xhrHeaders(xhr), outcome: type, snapshotBoundary: boundary || 'event', body: { status: 'pending' } };
            event(rec, 'response', { response: meta });
            let spec;
            if (type === 'reused') spec = { kind: 'state', body: { status: 'unavailable_reused', reason: 'xhr_reused_before_response_snapshot', source: 'xhr.response', bytesTotal: null, bytesCaptured: 0 } };
            else if (type === 'error' || type === 'abort' || type === 'timeout') spec = { kind: 'state', body: { status: 'unavailable', reason: 'xhr_' + type, source: 'xhr.response', bytesTotal: null, bytesCaptured: 0 } };
            else {
              try { spec = xhrResponseSpec(xhr, xhr.responseType); }
              catch (error) { spec = { kind: 'state', body: { status: 'unavailable', reason: 'xhr_response_read_error', source: 'xhr.response', error: errorInfo(error), bytesTotal: null } }; }
            }
            queueBody(rec, 'response', spec);
          });
        };
        const handler = e => { if (e.type === 'loadend' && typeof xhr.readyState === 'number' && xhr.readyState !== 4) return; finish(e.type); };
        state.active = { eventId: rec.eventId, finish };
        const names = ['loadend', 'error', 'abort', 'timeout'];
        cleanup = () => {
          for (const name of names) xhr.removeEventListener(name, handler);
          xhrCleanups.delete(cleanup);
          if (state.active && state.active.eventId === rec.eventId) state.active = null;
        };
        xhrCleanups.add(cleanup);
        for (const name of names) xhr.addEventListener(name, handler);
      });
      let result;
      try { result = originals.xhrSend.apply(this, arguments); }
      catch (error) {
        observe(cleanup);
        observe(() => { if (rec && state.active && state.active.eventId === rec.eventId) state.active = previousActive; });
        observe(() => { if (rec) { fail(rec, 'send_throw', error); event(rec, 'request_body', { request: { body: finishBody({ status: 'unavailable', reason: 'xhr_send_throw', source: 'xhr.send' }) } }); } });
        throw error;
      }
      if (rec) observe(() => queueBody(rec, 'request', requestBody));
      return result;
    });
    observe(() => {
      installProp(proto, 'open', wrappers.xhrOpen, 'xhrOpen');
      installProp(proto, 'send', wrappers.xhrSend, 'xhrSend');
      if (wrappers.xhrSetRequestHeader) installProp(proto, 'setRequestHeader', wrappers.xhrSetRequestHeader, 'xhrSetRequestHeader');
    });
    coverage.xhr = proto.open === wrappers.xhrOpen && proto.send === wrappers.xhrSend ? 'installed' : 'unavailable';
  } else coverage.xhr = 'absent';

  // 3) navigator.sendBeacon hook
  if (hasHook('beacon') && g.navigator && typeof g.navigator.sendBeacon === 'function') {
    originals.beacon = g.navigator.sendBeacon;
    wrappers.beacon = wrapNative(originals.beacon, function (url, data) {
      if (!installed) return originals.beacon.apply(this, arguments);
      const stack = captureStack();
      const rec = observe(() => createRecord('beacon', 'POST', String(url), { status: 'unknown', scope: 'script_visible', reason: 'beacon_headers_managed_by_browser' }, null, stack));
      if (rec) observe(() => event(rec, 'start', { request: rec.request }));
      let result;
      try { result = originals.beacon.apply(this, arguments); }
      catch (error) {
        if (rec) observe(() => { fail(rec, 'sync_throw', error); event(rec, 'request_body', { request: { body: finishBody({ status: 'unavailable', reason: 'beacon_sync_throw', source: 'beacon.data' }) } }); });
        throw error;
      }
      if (rec) observe(() => { event(rec, 'settled', { beaconAccepted: result }); queueBody(rec, 'request', describeBody(data, 'beacon.data')); });
      return result;
    });
    observe(() => installProp(g.navigator, 'sendBeacon', wrappers.beacon, 'beacon'));
    coverage.beacon = g.navigator.sendBeacon === wrappers.beacon ? 'installed' : 'unavailable';
  } else coverage.beacon = 'absent';

  // 4) Deep mode extra JS hooks: WebSocket, document.cookie, crypto.subtle, DOM, EventSource, WebAssembly, safe runtime, optional stripDebugger
  const cryptoRestores = [];
  const wasmRestores = [];
  const consoleRestores = [];
  let winErrorListener = null;
  let winRejectionListener = null;
  let origCookieDesc = null;
  let cookieProto = null;
  let strippedTraps = 0;

  // 4a) WebSocket constructor + send
  if (hasHook('ws')) {
    if (typeof g.WebSocket === 'function' && g.WebSocket.prototype) {
      originals.WebSocket = g.WebSocket;
      originals.wsSend = g.WebSocket.prototype.send;
      wrappers.wsSend = wrapNative(originals.wsSend, function (data) {
        if (installed) {
          const stack = captureStack();
          observe(() => {
            let bytesTotal = null, preview = null, encoding = 'utf8';
            if (typeof data === 'string') {
              bytesTotal = utf8Size(data);
              preview = data.slice(0, 4096);
            } else if (g.ArrayBuffer && data instanceof g.ArrayBuffer) {
              bytesTotal = data.byteLength; encoding = 'base64';
              preview = toBase64(new Uint8Array(data.slice(0, 4096)));
            } else if (g.ArrayBuffer && g.ArrayBuffer.isView(data)) {
              bytesTotal = data.byteLength; encoding = 'base64';
              preview = toBase64(new Uint8Array(data.buffer, data.byteOffset, Math.min(data.byteLength, 4096)));
            }
            emit({
              eventId: documentId + ':' + (++sequence),
              transport: 'websocket',
              phase: 'ws_send',
              url: this.url || wsUrls.get(this) || null,
              bytesTotal,
              encoding,
              preview,
              ...(stack ? { callStack: stack } : {}),
            });
          });
        }
        return originals.wsSend.apply(this, arguments);
      });
      if (typeof g.Proxy === 'function') {
        wrappers.WebSocket = new g.Proxy(originals.WebSocket, {
          construct(target, argArray, newTarget) {
            const instance = Reflect.construct(target, argArray, newTarget);
            if (installed) {
              const stack = captureStack(2);
              observe(() => {
                const url = String(argArray[0] || '');
                wsUrls.set(instance, url);
                emit({
                  eventId: documentId + ':' + (++sequence),
                  transport: 'websocket',
                  phase: 'ws_open',
                  url,
                  protocols: argArray[1] || null,
                  ...(stack ? { callStack: stack } : {}),
                });
              });
            }
            return instance;
          },
        });
        nativeToStringMap.set(wrappers.WebSocket, originals.WebSocket);
        observe(() => {
          installProp(g, 'WebSocket', wrappers.WebSocket, 'WebSocket');
          installProp(originals.WebSocket.prototype, 'send', wrappers.wsSend, 'wsSend');
        });
        coverage.websocket = g.WebSocket === wrappers.WebSocket ? 'installed' : 'unavailable';
      }
    } else coverage.websocket = 'absent';
  }

  // 4b) document.cookie setter
  if (hasHook('cookie')) {
    observe(() => {
      const proto = g.Document && g.Document.prototype;
      const desc = proto && Object.getOwnPropertyDescriptor(proto, 'cookie');
      if (desc && typeof desc.set === 'function' && desc.configurable) {
        cookieProto = proto;
        origCookieDesc = desc;
        wrappers.cookieSet = wrapNative(desc.set, function (value) {
          if (installed) {
            const stack = captureStack();
            observe(() => {
              emit({
                eventId: documentId + ':' + (++sequence),
                transport: 'cookie',
                phase: 'cookie_set',
                value: String(value),
                ...(stack ? { callStack: stack } : {}),
              });
            });
          }
          return desc.set.call(this, value);
        });
        Object.defineProperty(proto, 'cookie', { ...desc, set: wrappers.cookieSet });
        coverage.cookie = 'installed';
      } else coverage.cookie = 'unavailable';
    });
  }

  // 4c) crypto.subtle methods
  if (hasHook('crypto')) {
    observe(() => {
      const subtleTarget = (g.SubtleCrypto && g.SubtleCrypto.prototype) || (g.crypto && g.crypto.subtle);
      if (!subtleTarget) { coverage.crypto = 'absent'; return; }
      const methods = ['encrypt', 'decrypt', 'sign', 'verify', 'digest', 'importKey', 'deriveBits', 'deriveKey'];
      const previewBuffer = val => {
        try {
          const isBuf = val && ((g.ArrayBuffer && val instanceof g.ArrayBuffer) || Object.prototype.toString.call(val) === '[object ArrayBuffer]');
          if (isBuf) {
            const slice = new Uint8Array(val.slice(0, 4096));
            return { bytes: val.byteLength, previewBase64: toBase64(slice), truncated: val.byteLength > 4096 };
          }
          if (g.ArrayBuffer && g.ArrayBuffer.isView(val)) {
            const slice = new Uint8Array(val.buffer, val.byteOffset, Math.min(val.byteLength, 4096));
            return { bytes: val.byteLength, previewBase64: toBase64(slice), truncated: val.byteLength > 4096 };
          }
        } catch (_) {}
        return null;
      };
      for (const name of methods) {
        const orig = subtleTarget[name];
        if (typeof orig !== 'function') continue;
        const desc = Object.getOwnPropertyDescriptor(subtleTarget, name);
        const wrapped = wrapNative(orig, function () {
          if (!installed) return orig.apply(this, arguments);
          const stack = captureStack();
          const args = Array.from(arguments);
          const algo = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].name ? String(args[0].name) : null);
          const bufArg = args.find(a => (g.ArrayBuffer && (a instanceof g.ArrayBuffer || g.ArrayBuffer.isView(a))));
          const inputMeta = bufArg ? previewBuffer(bufArg) : null;
          const result = orig.apply(this, arguments);
          const eventId = documentId + ':' + (++sequence);
          if (result && typeof result.then === 'function') {
            result.then(out => {
              if (!installed) return;
              observe(() => emit({
                eventId,
                transport: 'crypto',
                phase: 'crypto_subtle',
                method: name,
                algorithm: algo,
                input: inputMeta,
                output: previewBuffer(out),
                ...(stack ? { callStack: stack } : {}),
              }));
            }, err => {
              if (!installed) return;
              observe(() => emit({
                eventId,
                transport: 'crypto',
                phase: 'crypto_subtle_error',
                method: name,
                algorithm: algo,
                error: errorInfo(err),
                ...(stack ? { callStack: stack } : {}),
              }));
            });
          }
          return result;
        });
        installProp(subtleTarget, name, wrapped);
        cryptoRestores.push(() => {
          if (subtleTarget[name] !== wrapped) return;
          if (desc && desc.configurable) Object.defineProperty(subtleTarget, name, desc);
          else subtleTarget[name] = orig;
        });
      }
      coverage.crypto = cryptoRestores.length ? 'installed' : 'unavailable';
    });
  }

  // 4d) Lightweight DOM script/iframe injection observer
  if (hasHook('dom')) {
    observe(() => {
      if (typeof g.MutationObserver !== 'function') { coverage.domObserver = 'absent'; return; }
      const reportNode = node => {
        if (!node || node.nodeType !== 1) return;
        const tag = String(node.tagName || '').toUpperCase();
        if (tag === 'SCRIPT' || tag === 'IFRAME') {
          const text = tag === 'SCRIPT' && !node.src ? String(node.textContent || '') : '';
          emit({
            eventId: documentId + ':' + (++sequence),
            transport: 'dom',
            phase: 'dom_node_added',
            tagName: tag,
            src: node.src || null,
            type: node.type || null,
            inlineLength: text ? text.length : 0,
            inlinePreview: text ? text.slice(0, 2048) : null,
          });
        }
        if (typeof node.querySelectorAll === 'function') {
          const nested = node.querySelectorAll('script,iframe');
          for (let i = 0; i < nested.length; i++) reportNode(nested[i]);
        }
      };
      domObserver = new g.MutationObserver(mutations => {
        if (!installed) return;
        observe(() => {
          for (let i = 0; i < mutations.length; i++) {
            const added = mutations[i].addedNodes;
            if (!added) continue;
            for (let j = 0; j < added.length; j++) reportNode(added[j]);
          }
        });
      });
      const attachDom = () => {
        if (!installed || !domObserver) return;
        const root = g.document.documentElement || g.document;
        if (root) domObserver.observe(root, { childList: true, subtree: true });
      };
      if (g.document.documentElement) attachDom();
      else if (typeof g.document.addEventListener === 'function') {
        domReadyListener = () => attachDom();
        g.document.addEventListener('DOMContentLoaded', domReadyListener, { once: true });
      }
      coverage.domObserver = 'installed';
    });
  }

  // 4e) EventSource (SSE) constructor hook
  if (hasHook('sse')) {
    observe(() => {
      if (typeof g.EventSource === 'function' && typeof g.Proxy === 'function') {
        originals.EventSource = g.EventSource;
        wrappers.EventSource = new g.Proxy(originals.EventSource, {
          construct(target, argArray, newTarget) {
            const instance = Reflect.construct(target, argArray, newTarget);
            if (installed) {
              const stack = captureStack(2);
              observe(() => {
                const url = String(argArray[0] || '');
                emit({
                  eventId: documentId + ':' + (++sequence),
                  transport: 'sse',
                  phase: 'sse_open',
                  url,
                  withCredentials: !!(argArray[1] && argArray[1].withCredentials),
                  ...(stack ? { callStack: stack } : {}),
                });
                if (typeof instance.addEventListener === 'function') {
                  instance.addEventListener('message', e => {
                    if (!installed) return;
                    observe(() => {
                      const data = typeof e.data === 'string' ? e.data : String(e.data ?? '');
                      emit({
                        eventId: documentId + ':' + (++sequence),
                        transport: 'sse',
                        phase: 'sse_message',
                        url,
                        lastEventId: e.lastEventId || null,
                        bytesTotal: utf8Size(data),
                        data: data.slice(0, 65536),
                        truncated: data.length > 65536,
                      });
                    });
                  });
                }
              });
            }
            return instance;
          },
        });
        nativeToStringMap.set(wrappers.EventSource, originals.EventSource);
        installProp(g, 'EventSource', wrappers.EventSource, 'EventSource');
        coverage.eventSource = g.EventSource === wrappers.EventSource ? 'installed' : 'unavailable';
      } else coverage.eventSource = 'absent';
    });
  }

  // 4f) WebAssembly binary capture (compile / compileStreaming / instantiate / instantiateStreaming)
  if (hasHook('wasm')) {
    observe(() => {
      const wa = g.WebAssembly;
      if (!wa || typeof wa !== 'object') { coverage.wasm = 'absent'; return; }
      const toWasmBytes = source => {
        if (!source) return null;
        if ((g.ArrayBuffer && source instanceof g.ArrayBuffer) || Object.prototype.toString.call(source) === '[object ArrayBuffer]') {
          return new Uint8Array(source);
        }
        if (g.ArrayBuffer && g.ArrayBuffer.isView(source)) {
          return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
        }
        return null;
      };
      const emitWasm = (method, bytes, resolved, stack) => {
        if (!installed) return;
        const instance = resolved && resolved.instance ? resolved.instance : (resolved && resolved.exports ? resolved : null);
        let exportNames = [];
        try {
          if (instance && instance.exports) exportNames = Object.keys(instance.exports);
        } catch (_) {}
        const bytesTotal = bytes ? bytes.byteLength : null;
        const canEncode = bytes && bytes.byteLength > 0 && bytes.byteLength <= maxBytes;
        emit({
          eventId: documentId + ':' + (++sequence),
          transport: 'wasm',
          phase: 'wasm_module',
          method,
          bytesTotal,
          truncated: !!(bytes && bytes.byteLength > maxBytes),
          wasmBase64: canEncode ? toBase64(bytes) : null,
          exportNames,
          ...(stack ? { callStack: stack } : {}),
        });
      };
      for (const method of ['compile', 'instantiate']) {
        const orig = wa[method];
        if (typeof orig !== 'function') continue;
        const desc = Object.getOwnPropertyDescriptor(wa, method);
        const wrapped = wrapNative(orig, function () {
          if (!installed) return orig.apply(this, arguments);
          const stack = captureStack();
          const bytes = observe(() => {
            const raw = toWasmBytes(arguments[0]);
            return raw ? raw.slice() : null;
          });
          const promise = orig.apply(this, arguments);
          if (promise && typeof promise.then === 'function') {
            promise.then(res => observe(() => emitWasm(method, bytes, res, stack)), () => {});
          }
          return promise;
        });
        installProp(wa, method, wrapped);
        wasmRestores.push(() => {
          if (wa[method] !== wrapped) return;
          if (desc && desc.configurable) Object.defineProperty(wa, method, desc);
          else wa[method] = orig;
        });
      }
      for (const method of ['compileStreaming', 'instantiateStreaming']) {
        const orig = wa[method];
        if (typeof orig !== 'function') continue;
        const desc = Object.getOwnPropertyDescriptor(wa, method);
        const wrapped = wrapNative(orig, function () {
          if (!installed) return orig.apply(this, arguments);
          const stack = captureStack();
          const srcPromise = Promise.resolve(arguments[0]);
          const cloneBytesPromise = srcPromise.then(resp => {
            if (resp && typeof resp.clone === 'function') return resp.clone().arrayBuffer().then(ab => new Uint8Array(ab));
            return null;
          }).catch(() => null);
          const resultPromise = orig.apply(this, arguments);
          if (resultPromise && typeof resultPromise.then === 'function') {
            Promise.all([resultPromise, cloneBytesPromise]).then(([res, bytes]) => {
              observe(() => emitWasm(method, bytes, res, stack));
            }, () => {});
          }
          return resultPromise;
        });
        installProp(wa, method, wrapped);
        wasmRestores.push(() => {
          if (wa[method] !== wrapped) return;
          if (desc && desc.configurable) Object.defineProperty(wa, method, desc);
          else wa[method] = orig;
        });
      }
      coverage.wasm = wasmRestores.length ? 'installed' : 'unavailable';
    });
  }

  // 4g) Optional opt-in anti-anti-debug guard neutralizing Function('debugger') / eval('debugger') traps
  if (stripDebuggerEnabled) {
    const stripPattern = /\bdebugger\b/g;
    const cleanSource = (kind, code) => {
      if (typeof code !== 'string' || !/\bdebugger\b/.test(code)) return code;
      const replaced = code.replace(stripPattern, 'void 0  ');
      if (replaced !== code && strippedTraps < 20) {
        strippedTraps++;
        observe(() => emit({
          eventId: documentId + ':' + (++sequence),
          transport: 'antidebug',
          phase: 'debugger_trap_stripped',
          kind,
          originalLength: code.length,
        }));
      }
      return replaced;
    };
    observe(() => {
      if (typeof g.Function === 'function' && typeof g.Proxy === 'function') {
        originals.Function = g.Function;
        wrappers.Function = new g.Proxy(originals.Function, {
          construct(target, argArray, newTarget) {
            if (installed && argArray.length > 0) {
              const next = argArray.slice();
              next[next.length - 1] = cleanSource('Function', next[next.length - 1]);
              return Reflect.construct(target, next, newTarget);
            }
            return Reflect.construct(target, argArray, newTarget);
          },
          apply(target, thisArg, argArray) {
            if (installed && argArray.length > 0) {
              const next = argArray.slice();
              next[next.length - 1] = cleanSource('Function', next[next.length - 1]);
              return Reflect.apply(target, thisArg, next);
            }
            return Reflect.apply(target, thisArg, argArray);
          },
        });
        nativeToStringMap.set(wrappers.Function, originals.Function);
        installProp(g, 'Function', wrappers.Function, 'Function');
      }
      if (typeof g.eval === 'function') {
        originals.eval = g.eval;
        wrappers.eval = wrapNative(originals.eval, function (code) {
          if (installed && typeof code === 'string') return originals.eval.call(this, cleanSource('eval', code));
          return originals.eval.apply(this, arguments);
        });
        installProp(g, 'eval', wrappers.eval, 'eval');
      }
      coverage.stripDebugger = 'installed';
    });
  }

  // 4h) Getter-safe console & uncaught error/rejection capture (replaces Runtime.enable without triggering console getter traps!)
  if (safeRuntimeHooksEnabled) {
      const safeTag = val => {
        try {
          if (g.Symbol && g.Symbol.toStringTag) {
            const d = Object.getOwnPropertyDescriptor(val, g.Symbol.toStringTag);
            if (d && d.get) return '[object TaggedGetter]';
          }
          return Object.prototype.toString.call(val);
        } catch (_) {
          return '[object Uninspectable]';
        }
      };
      const safeOwnString = (obj, prop, maxLen = 1024) => {
        try {
          const d = Object.getOwnPropertyDescriptor(obj, prop);
          if (d && 'value' in d && typeof d.value === 'string') {
            return d.value.length > maxLen ? d.value.slice(0, maxLen) + '…' : d.value;
          }
        } catch (_) {}
        return null;
      };
      const safeSerialize = (val, depth = 0) => {
        if (val === null) return null;
        const t = typeof val;
        if (t === 'string') return val.length > 4096 ? val.slice(0, 4096) + '…' : val;
        if (t === 'number' || t === 'boolean' || t === 'undefined') return val;
        if (t === 'bigint') return String(val) + 'n';
        if (t === 'symbol') return Object.prototype.toString.call(val);
        if (t === 'function') return '[Function]';
        const tag = safeTag(val);
        if (tag === '[object Error]' || (g.Error && val instanceof g.Error)) {
          // NEVER invoke custom .stack or .message getter on Error passed to console.*
          return {
            __type: 'Error',
            name: safeOwnString(val, 'name', 128) || 'Error',
            message: safeOwnString(val, 'message', 1024),
          };
        }
        if (tag === '[object RegExp]' || tag === '[object Date]' || /^\[object (?:HTML|SVG|Window|Document|Element|Node|Text|Comment)/.test(tag)) {
          // NEVER invoke DOM .id/.outerHTML getters or custom RegExp.prototype.toString
          return tag;
        }
        if (depth >= 2) return tag;
        if (Array.isArray(val)) {
          const out = [];
          const len = Math.min(val.length, 32);
          for (let i = 0; i < len; i++) {
            const desc = Object.getOwnPropertyDescriptor(val, i);
            if (!desc) out.push(undefined);
            else if (desc.get) out.push('[Getter]');
            else out.push(safeSerialize(desc.value, depth + 1));
          }
          if (val.length > len) out.push(`…(+${val.length - len})`);
          return out;
        }
        let keys;
        try { keys = Object.keys(val); } catch (_) { return tag; }
        const out = {};
        const limit = Math.min(keys.length, 32);
        for (let i = 0; i < limit; i++) {
          const k = keys[i];
          const desc = Object.getOwnPropertyDescriptor(val, k);
          if (!desc) continue;
          if (desc.get) out[k] = '[Getter]';
          else out[k] = safeSerialize(desc.value, depth + 1);
        }
        if (keys.length > limit) out.__truncatedKeys = keys.length - limit;
        return out;
      };

      observe(() => {
        if (g.console && typeof g.console === 'object') {
          for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
            const orig = g.console[level];
            if (typeof orig !== 'function') continue;
            const desc = Object.getOwnPropertyDescriptor(g.console, level);
            const wrapped = wrapNative(orig, function () {
              if (installed) {
                const stack = captureStack();
                observe(() => {
                  const args = [];
                  for (let i = 0; i < arguments.length && i < 16; i++) args.push(safeSerialize(arguments[i], 0));
                  emit({
                    eventId: documentId + ':' + (++sequence),
                    transport: 'runtime',
                    phase: 'runtime_console',
                    level,
                    args,
                    ...(stack ? { callStack: stack } : {}),
                  });
                });
              }
              return orig.apply(this, arguments);
            });
            installProp(g.console, level, wrapped);
            consoleRestores.push(() => {
              if (g.console[level] !== wrapped) return;
              if (desc && desc.configurable) Object.defineProperty(g.console, level, desc);
              else g.console[level] = orig;
            });
          }
          coverage.safeConsole = consoleRestores.length ? 'installed' : 'unavailable';
        }
        if (g.window && typeof g.window.addEventListener === 'function') {
          winErrorListener = e => {
            if (!installed) return;
            observe(() => {
              const err = e && e.error;
              const stackText = err && typeof err === 'object' ? safeOwnString(err, 'stack', 4096) : null;
              emit({
                eventId: documentId + ':' + (++sequence),
                transport: 'runtime',
                phase: 'runtime_exception',
                message: String((e && e.message) || (err && safeOwnString(err, 'message', 1024)) || 'Uncaught error'),
                filename: (e && e.filename) || null,
                lineno: (e && e.lineno) || null,
                colno: (e && e.colno) || null,
                errorStack: stackText ? stackText.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 25) : null,
              });
            });
          };
          winRejectionListener = e => {
            if (!installed) return;
            observe(() => {
              const reason = e && e.reason;
              const stackText = reason && typeof reason === 'object' ? safeOwnString(reason, 'stack', 4096) : null;
              emit({
                eventId: documentId + ':' + (++sequence),
                transport: 'runtime',
                phase: 'runtime_rejection',
                reason: safeSerialize(reason, 0),
                errorStack: stackText ? stackText.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 25) : null,
              });
            });
          };
          g.window.addEventListener('error', winErrorListener);
          g.window.addEventListener('unhandledrejection', winRejectionListener);
          coverage.safeExceptions = 'installed';
        }
      });
  }

  const controller = {
    version: VERSION,
    runId,
    captureGeneration: settings.generation || 1,
    status,
    export(options) {
      const result = { ...status(), records: ring.map(item => item.record) };
      if (options && options.clear) { ring.length = 0; ringBytes = 0; }
      return result;
    },
    flush: flushFallback,
    configure(next) {
      if (runId === next.runId && controller.captureGeneration > (next.generation || 1)) return status();
      controller.captureGeneration = next.generation || 1;
      controller.runId = next.runId || runId;
      if (next.bindingName) { bindingName = next.bindingName; hostBinding = null; }
      if (next.runId) runId = next.runId;
      flushFallback();
      emit({ phase: 'hook_ready', eventId: null, coverage, alreadyInstalled: true, counters: status().counters });
      return status();
    },
    async uninstall(expectedBinding) {
      if (expectedBinding && expectedBinding !== bindingName) return { ...status(), cleanup: 'binding_owner_changed' };
      if (!installed) return lastUninstall || { ...status(), deactivated: true };
      generations[runId] = { generation: controller.captureGeneration, retired: true };
      installed = false;
      const restored = {};
      const wrapperOutcomes = {};
      function restore(owner, key, own, original, name, descKey) {
        try {
          if (owner[key] === own) {
            const desc = descKey ? descriptors[descKey] : null;
            if (desc && desc.configurable && !desc.get && !desc.set) Object.defineProperty(owner, key, desc);
            else owner[key] = original;
            restored[name] = owner[key] === original ? 'restored' : 'failed';
            wrapperOutcomes[name] = { deactivated: true, state: restored[name] === 'restored' ? 'restored' : 'actual_restore_error' };
          } else {
            restored[name] = 'later_wrapper_preserved';
            wrapperOutcomes[name] = { deactivated: true, state: 'later_wrapper_present' };
          }
        } catch (error) {
          restored[name] = 'failed';
          wrapperOutcomes[name] = { deactivated: true, state: 'actual_restore_error', error: errorInfo(error) };
          counters.observerErrors++;
        }
      }
      if (wrappers.fetch) restore(g, 'fetch', wrappers.fetch, originals.fetch, 'fetch', 'fetch');
      if (wrappers.beacon) restore(g.navigator, 'sendBeacon', wrappers.beacon, originals.beacon, 'beacon', 'beacon');
      if (wrappers.xhrOpen) {
        const proto = g.XMLHttpRequest.prototype;
        restore(proto, 'open', wrappers.xhrOpen, originals.xhrOpen, 'xhrOpen', 'xhrOpen');
        restore(proto, 'send', wrappers.xhrSend, originals.xhrSend, 'xhrSend', 'xhrSend');
        if (wrappers.xhrSetRequestHeader) restore(proto, 'setRequestHeader', wrappers.xhrSetRequestHeader, originals.xhrSetRequestHeader, 'xhrSetRequestHeader', 'xhrSetRequestHeader');
      }
      if (wrappers.WebSocket) {
        restore(g, 'WebSocket', wrappers.WebSocket, originals.WebSocket, 'WebSocket', 'WebSocket');
        if (wrappers.wsSend) restore(originals.WebSocket.prototype, 'send', wrappers.wsSend, originals.wsSend, 'wsSend', 'wsSend');
      }
      if (cookieProto && origCookieDesc) {
        observe(() => {
          const cur = Object.getOwnPropertyDescriptor(cookieProto, 'cookie');
          if (cur && cur.set === wrappers.cookieSet) Object.defineProperty(cookieProto, 'cookie', origCookieDesc);
        });
      }
      for (const fn of cryptoRestores) observe(fn);
      for (const fn of wasmRestores) observe(fn);
      for (const fn of consoleRestores) observe(fn);
      if (winErrorListener && g.window && typeof g.window.removeEventListener === 'function') {
        observe(() => g.window.removeEventListener('error', winErrorListener));
        winErrorListener = null;
      }
      if (winRejectionListener && g.window && typeof g.window.removeEventListener === 'function') {
        observe(() => g.window.removeEventListener('unhandledrejection', winRejectionListener));
        winRejectionListener = null;
      }
      if (wrappers.EventSource) restore(g, 'EventSource', wrappers.EventSource, originals.EventSource, 'EventSource', 'EventSource');
      if (wrappers.Function) restore(g, 'Function', wrappers.Function, originals.Function, 'Function', 'Function');
      if (wrappers.eval) restore(g, 'eval', wrappers.eval, originals.eval, 'eval', 'eval');
      if (domObserver) { observe(() => domObserver.disconnect()); domObserver = null; }
      if (domReadyListener && g.document && typeof g.document.removeEventListener === 'function') {
        observe(() => g.document.removeEventListener('DOMContentLoaded', domReadyListener));
        domReadyListener = null;
      }
      if (toStringProxy && g.Function && g.Function.prototype) {
        restore(g.Function.prototype, 'toString', toStringProxy, origFnToString, 'fnToString', 'fnToString');
      }
      for (const cleanup of Array.from(xhrCleanups)) observe(cleanup);
      for (const cancel of Array.from(cancelReads)) observe(cancel);
      for (const cancel of Array.from(cancelTasks)) observe(cancel);
      await Promise.allSettled(Array.from(tasks));
      emit({ phase: 'hook_uninstalled', eventId: null, deactivated: true, restored, wrapperOutcomes, counters: status().counters });
      if (exposeGlobal && g.__museCapture === controller) {
        try { delete g.__museCapture; } catch (_) {}
      }
      lastUninstall = { ...status(), deactivated: true, restored, wrapperOutcomes };
      return lastUninstall;
    },
  };

  store.controller = controller;
  if (exposeGlobal) {
    try { g.__museCapture = controller; }
    catch (_) { coverage.limitations.push('capture_controller_unavailable'); }
  }
  emit({ phase: 'hook_ready', eventId: null, coverage, counters: status().counters });
  return status();
}

function positiveInteger(value, fallback, allowZero = false) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) throw new TypeError('Invalid capture limit');
  return value;
}

function createPageHookRuntime(options = {}) {
  const runId = options.runId || randomUUID();
  const bindingName = options.bindingName || '__bcHost';
  if (!/^[A-Za-z_$][\w$]*$/.test(bindingName)) throw new TypeError('Invalid binding name');
  const storeKey = options.storeKey || defaultStoreKey(runId);
  const settings = {
    runId,
    storeKey,
    bindingName,
    generation: positiveInteger(options.generation, 1),
    stealth: options.stealth !== false,
    captureStack: !!options.captureStack,
    deepHooks: !!options.deepHooks,
    ...(Array.isArray(options.enabledHooks) ? { enabledHooks: options.enabledHooks } : {}),
    cdpRuntimeEnabled: !!options.enableRuntime,
    stripDebugger: !!options.stripDebugger,
    exposeGlobal: !!options.exposeGlobal,
    maxBodyBytes: positiveInteger(options.maxBodyBytes, DEFAULT_MAX_BODY_BYTES),
    maxPendingReads: positiveInteger(options.maxPendingReads, 8),
    maxReadMs: positiveInteger(options.maxReadMs, 30000),
    fallbackMaxRecords: positiveInteger(options.fallbackMaxRecords, 256, true),
    fallbackMaxBytes: positiveInteger(options.fallbackMaxBytes, 4 * 1024 * 1024, true),
    filter: options.filter || {},
  };
  return `(${pageRuntime.toString()})(${JSON.stringify(settings)})`;
}

function createJsonlWriter(filePath, options = {}) {
  const io = options.fs || fs;
  const resolvedPath = path.resolve(filePath);
  const fd = io.openSync(resolvedPath, 'wx', 0o600);
  let closed = false;
  let error = null;
  let count = 0;
  let bytesWritten = 0;
  function check() { if (error) throw error; if (closed) throw new Error('JSONL writer is closed'); }
  return {
    path: resolvedPath,
    get count() { return count; },
    get bytesWritten() { return bytesWritten; },
    get error() { return error; },
    append(record) {
      check();
      try {
        const buffer = Buffer.from(JSON.stringify(record) + '\n');
        let offset = 0;
        while (offset < buffer.length) {
          const written = io.writeSync(fd, buffer, offset, buffer.length - offset);
          if (!written) throw new Error('JSONL write made no progress');
          offset += written;
          bytesWritten += written;
        }
        count++;
      } catch (cause) { error = cause; throw cause; }
    },
    flush() { check(); try { io.fsyncSync(fd); } catch (cause) { error = cause; throw cause; } },
    close() {
      if (closed) { if (error) throw error; return; }
      let failure = error;
      try { if (!failure) io.fsyncSync(fd); } catch (cause) { failure = cause; }
      try { io.closeSync(fd); } catch (cause) { if (!failure) failure = cause; }
      closed = true;
      if (failure) { error = failure; throw failure; }
    },
  };
}

async function installHookForSession(client, sessionId, options = {}) {
  if (!client || typeof client.send !== 'function' || typeof client.on !== 'function') throw new TypeError('CDP EventEmitter client required');
  if (typeof options.onRecord !== 'function') throw new TypeError('onRecord callback required');
  let bySession = installations.get(client);
  if (!bySession) { bySession = new Map(); installations.set(client, bySession); }
  const key = sessionId || '';
  if (bySession.has(key)) return bySession.get(key);

  const runId = options.runId || randomUUID();
  const storeKey = options.storeKey || defaultStoreKey(runId);
  const bindingName = options.bindingName || '__bcHost';
  const enableRuntime = options.enableRuntime === true;
  const source = createPageHookRuntime({ ...options, runId, storeKey, bindingName });
  const contexts = new Map();
  const pending = new Map();
  const pendingWrites = new Set();
  const rebindTasks = new Set();
  let firstError = null;
  let installationError = null;
  let bindingAttempted = false;
  let runtimeMayBeInstalled = false;
  let removed = false;
  let sessionDead = false;
  let contextsObserved = false;
  let bindingInstalled = false;
  let unsubscribe = () => {};
  let uninstallPromise = null;

  const coverage = {
    mainWorldOnly: true,
    workers: 'not_injected',
    runtimeEnableUsed: enableRuntime,
    stealthHardened: options.stealth !== false,
    opaqueContexts: 'best_effort_explicit_results',
    allContexts: false,
    hostPrimary: true,
    currentContexts: [],
    contextsCreated: 0,
    contextsDestroyed: 0,
    pendingBodies: 0,
    incompleteBodies: 0,
    parseErrors: 0,
    legacyHookPresent: false,
    recordsReceived: 0,
    cleanupErrors: [],
    cleanupActions: [],
    wrapperOutcomes: [],
    sessionState: 'live',
  };

  const handle = {
    scriptIdentifier: null,
    ready: false,
    coverage,
    runId,
    storeKey,
    bindingName,
    sessionId,
    flush,
    uninstall,
    close: uninstall,
    get error() { return firstError || installationError; },
    get installationError() { return installationError; },
  };
  bySession.set(key, handle);
  if (options.onHandle) options.onHandle(handle);

  function reportError(error) {
    if (!firstError) firstError = error;
    if (typeof options.onError === 'function') {
      try { options.onError(error); } catch (cause) { if (!firstError) firstError = cause; }
    }
  }
  function write(record) {
    try {
      const result = options.onRecord(record);
      if (result && typeof result.then === 'function') {
        const tracked = Promise.resolve(result).catch(reportError).finally(() => pendingWrites.delete(tracked));
        pendingWrites.add(tracked);
      }
    } catch (error) { reportError(error); }
  }
  function contextMeta(contextId, context) {
    const item = context || contexts.get(contextId);
    return { sessionId: sessionId || null, contextId: contextId === undefined ? null : contextId, executionContextUniqueId: item && item.uniqueId || null, frameId: item && item.frameId || null, contextOrigin: item && item.origin || null };
  }
  function track(record) {
    if (!record.eventId) return;
    const id = [record.contextId, record.documentId, record.eventId].join('|');
    let item = pending.get(id);
    for (const side of ['request', 'response']) {
      if (!record[side] || !record[side].body) continue;
      if (record[side].body.status === 'pending') {
        if (!item) { item = { base: { source: 'muse-page-hook', schemaVersion: 1, hookVersion: HOOK_VERSION, runId, documentId: record.documentId, eventId: record.eventId, transport: record.transport, startedAt: record.startedAt, ...contextMeta(record.contextId) }, sides: new Set() }; pending.set(id, item); }
        item.sides.add(side);
      } else if (item) item.sides.delete(side);
    }
    if (item && !item.sides.size) pending.delete(id);
    coverage.pendingBodies = Array.from(pending.values()).reduce((sum, item) => sum + item.sides.size, 0);
  }
  function finishPending(reason, contextId) {
    for (const [id, item] of pending) {
      if (contextId !== undefined && item.base.contextId !== contextId) continue;
      for (const side of item.sides) {
        coverage.incompleteBodies++;
        write({ ...item.base, recordedAt: { wallTimeMs: Date.now(), monotonicTimeMs: null }, hostGenerated: true, phase: side === 'request' ? 'request_body' : 'response_body', [side]: { body: { status: reason, reason, source: 'host_context_lifecycle', bytesTotal: null, bytesCaptured: 0, completedAt: { wallTimeMs: Date.now(), monotonicTimeMs: null } } } });
      }
      pending.delete(id);
    }
    coverage.pendingBodies = Array.from(pending.values()).reduce((sum, item) => sum + item.sides.size, 0);
  }

  // Without Runtime.enable, Chromium may not auto-rebind Runtime.addBinding across navigations.
  // Re-adding the binding on Page.frameNavigated and calling flush() keeps bindings alive without Runtime.enable.
  function rebindAfterNavigation() {
    if (enableRuntime || removed || sessionDead || !bindingInstalled) return;
    const flushExpr = `(globalThis[Symbol.for(${JSON.stringify(storeKey)})]?.controller?.flush?.() || null)`;
    const task = (async () => {
      try {
        await client.send('Runtime.addBinding', { name: bindingName }, sessionId);
        if (removed || sessionDead) return;
        await client.send('Runtime.evaluate', { expression: flushExpr, returnByValue: true }, sessionId);
      } catch (error) {
        if (closedProtocolError(error)) sessionClosed('rebind-session-closed');
      }
    })().finally(() => rebindTasks.delete(task));
    rebindTasks.add(task);
  }

  function listener(message) {
    if (removed || (message.sessionId || '') !== key) return;
    const params = message.params || {};
    if (message.method === 'Runtime.executionContextCreated') {
      contextsObserved = true;
      const context = params.context;
      if (!context) return;
      const aux = context.auxData || {};
      contexts.set(context.id, { id: context.id, uniqueId: context.uniqueId || null, origin: context.origin || null, frameId: aux.frameId || null, isDefault: aux.isDefault === true || aux.type === 'default', active: true });
      coverage.contextsCreated++;
    } else if (message.method === 'Runtime.executionContextDestroyed') {
      contextsObserved = true;
      coverage.contextsDestroyed++;
      finishPending('unavailable_context_destroyed', params.executionContextId);
      contexts.delete(params.executionContextId);
    } else if (message.method === 'Runtime.executionContextsCleared') {
      contextsObserved = true;
      coverage.contextsDestroyed += contexts.size;
      finishPending('unavailable_context_destroyed');
      contexts.clear();
    } else if (!enableRuntime && (message.method === 'Page.frameNavigated' || message.method === 'Page.domContentEventFired')) {
      rebindAfterNavigation();
    } else if (message.method === 'Runtime.bindingCalled' && params.name === bindingName) {
      let data;
      try { data = JSON.parse(params.payload); if (!data || data.source !== 'muse-page-hook' || data.schemaVersion !== 1) throw new Error('Unexpected page hook payload'); }
      catch (error) { coverage.parseErrors++; reportError(error); return; }
      const record = { ...data, pageRunId: data.runId, runId, ...contextMeta(params.executionContextId), hostReceivedAt: Date.now() };
      coverage.recordsReceived++;
      if (data.phase === 'hook_ready') { handle.ready = !!data.coverage; if (data.coverage && data.coverage.legacyHookPresent) coverage.legacyHookPresent = true; }
      track(record);
      write(record);
    }
  }
  function releaseLocal() {
    removed = true;
    handle.ready = false;
    unsubscribe();
    if (bySession.get(key) === handle) bySession.delete(key);
  }
  function sessionClosed(reason) {
    if (sessionDead) return;
    sessionDead = true;
    coverage.sessionState = 'alreadyClosed';
    coverage.closedReason = reason;
    finishPending('unavailable_session_closed');
    contexts.clear();
    releaseLocal();
    if (typeof client.cancelSession === 'function') client.cancelSession(sessionId);
  }
  unsubscribe = subscribeSession(client, key, listener, sessionClosed);

  async function flush() {
    while (pendingWrites.size) await Promise.all(Array.from(pendingWrites));
    if (firstError) throw firstError;
    return { recordsReceived: coverage.recordsReceived, pendingBodies: coverage.pendingBodies };
  }

  function uninstall(stopOptions = {}) {
    if (uninstallPromise) return uninstallPromise;
    const deadline = Math.min(stopOptions.deadline || Infinity, Date.now() + (options.cleanupTimeoutMs || 5000));
    const bounded = async work => {
      if (Date.now() >= deadline) throw Object.assign(new Error('Hook cleanup deadline exceeded'), { code: 'CLEANUP_TIMEOUT' });
      let timer;
      try {
        return await Promise.race([Promise.resolve().then(work), new Promise((_, reject) => {
          timer = setTimeout(() => reject(Object.assign(new Error('Hook cleanup deadline exceeded'), { code: 'CLEANUP_TIMEOUT' })), Math.max(1, deadline - Date.now()));
        })]);
      } finally { clearTimeout(timer); }
    };
    const command = async (stage, method, params, contextId) => {
      if (sessionDead || (contextId !== undefined && contextsObserved && !contexts.has(contextId))) {
        coverage.cleanupActions.push({ stage, contextId: contextId ?? null, status: 'alreadyClosed' });
        return null;
      }
      try {
        const result = await bounded(() => client.send(method, params, sessionId));
        coverage.cleanupActions.push({ stage, contextId: contextId ?? null, status: 'succeeded' });
        return result;
      } catch (error) {
        const closed = closedProtocolError(error, contextId !== undefined);
        if (sessionDead || closed) {
          if (closed === 'session') sessionClosed('protocol-session-closed');
          else if (closed === 'context') { finishPending('unavailable_context_destroyed', contextId); contexts.delete(contextId); }
          coverage.cleanupActions.push({ stage, contextId: contextId ?? null, status: 'alreadyClosed', code: error.code || null });
        } else coverage.cleanupErrors.push({ stage, contextId: contextId ?? null, ...commandDiagnostic(error, { method: error.method || method, sessionId: sessionId || null }) });
        return null;
      }
    };
    uninstallPromise = (async () => {
      try {
        if (rebindTasks.size) await Promise.allSettled(Array.from(rebindTasks));
        const retire = `(() => { const sym = Symbol.for(${JSON.stringify(storeKey)}); let s = globalThis[sym]; if (!s || typeof s !== 'object') { s = { generations: Object.create(null), controller: null }; Object.defineProperty(globalThis, sym, { value: s, writable: true, enumerable: false, configurable: true }); } const id = ${JSON.stringify(runId)}; if (!s.generations[id] || s.generations[id].generation <= ${options.generation || 1}) s.generations[id] = { generation: ${options.generation || 1}, retired: true }; return s.controller; })();`;
        const expression = `(() => { const ctrl = ${retire} return (ctrl && ctrl.version === ${JSON.stringify(HOOK_VERSION)}) ? ctrl.uninstall(${JSON.stringify(bindingName)}) : ({installed:false,cleanup:'controller_unavailable'}); })()`;
        const current = runtimeMayBeInstalled ? Array.from(contexts.values()).filter(context => context.isDefault) : [];
        const destinations = current.map(context => ({ contextId: context.id }));
        if (!contextsObserved && !sessionDead && runtimeMayBeInstalled) destinations.push({});
        if (sessionDead || (contextsObserved && !destinations.length)) coverage.cleanupActions.push({ stage: 'restore_wrappers', status: 'alreadyClosed' });
        for (const destination of destinations) {
          const result = await command('restore_wrappers', 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, ...destination }, destination.contextId);
          if (!result) continue;
          const value = result.result?.value;
          const outcomes = value?.wrapperOutcomes || Object.fromEntries(Object.entries(value?.restored || {}).map(([name, state]) => [name, { deactivated: value?.deactivated ?? null, state: state === 'later_wrapper_preserved' ? 'later_wrapper_present' : state === 'restored' ? 'restored' : 'actual_restore_error' }]));
          coverage.wrapperOutcomes.push({ contextId: destination.contextId ?? null, deactivated: value?.deactivated ?? null, outcomes });
          if (result.exceptionDetails || !value || value.cleanup === 'binding_owner_changed' || (value.cleanup === 'controller_unavailable' && handle.ready) || Object.values(outcomes).some(item => item.state === 'actual_restore_error' || (item.state === 'later_wrapper_present' && item.deactivated !== true))) {
            coverage.cleanupErrors.push({ stage: 'restore_wrappers', contextId: destination.contextId ?? null, reason: value?.cleanup || 'actual_restore_error' });
          }
        }
        if (handle.scriptIdentifier) await command('remove_script', 'Page.removeScriptToEvaluateOnNewDocument', { identifier: handle.scriptIdentifier });
        if (bindingInstalled || bindingAttempted) await command('remove_binding', 'Runtime.removeBinding', { name: bindingName });
      } finally {
        finishPending(sessionDead ? 'unavailable_session_closed' : 'unavailable_capture_stopped');
        releaseLocal();
        contexts.clear();
        if (typeof client.cancelPendingForSession === 'function') client.cancelPendingForSession(sessionId);
      }
      try { await bounded(flush); } catch (error) { reportError(error); }
      return {
        ready: false,
        coverage,
        alreadyClosed: sessionDead,
        installationError: installationError ? { code: installationError.code || 'CDP_ERROR', method: installationError.method || null } : null,
        dataError: firstError ? { code: firstError.code || 'HOOK_DATA_ERROR' } : null,
        cleanupComplete: coverage.cleanupErrors.length === 0,
        dataComplete: !firstError,
      };
    })();
    return uninstallPromise;
  }

  const sendLive = async (method, params) => {
    if (sessionDead) throw Object.assign(new Error('CDP session already closed'), { code: 'CDP_SESSION_CLOSED', method, sessionId });
    try { return await client.send(method, params, sessionId); }
    catch (error) {
      error.method ||= method; error.sessionId ||= sessionId;
      if (['CDP_TIMEOUT', 'CDP_COMMAND_CANCELLED', 'CDP_SESSION_CLOSED', 'CDP_DISCONNECTED'].includes(error.code) && ['Runtime.addBinding', 'Page.addScriptToEvaluateOnNewDocument'].includes(method)) options.onUncertainRegistration?.(error);
      throw error;
    }
  };

  try {
    if (enableRuntime) await sendLive('Runtime.enable', {});
    await sendLive('Page.enable', {});
    bindingAttempted = true;
    await sendLive('Runtime.addBinding', { name: bindingName });
    bindingInstalled = true;
    if (sessionDead) throw Object.assign(new Error('CDP session already closed'), { code: 'CDP_SESSION_CLOSED' });
    runtimeMayBeInstalled = true;
    const script = await sendLive('Page.addScriptToEvaluateOnNewDocument', { source, ...(options.deferCurrentEvaluation ? { runImmediately: true } : {}) });
    handle.scriptIdentifier = script.identifier;
    if (!script.identifier) throw new Error('CDP did not return a script identifier');
    const current = Array.from(contexts.values()).filter(context => context.isDefault);
    const destinations = options.deferCurrentEvaluation ? [] : current.map(context => ({ contextId: context.id }));
    if (!options.deferCurrentEvaluation && !contextsObserved && !sessionDead) destinations.push({});
    handle.registered = true;
    for (const destination of destinations) {
      try {
        const result = await sendLive('Runtime.evaluate', { expression: source, returnByValue: true, ...destination });
        if (result.exceptionDetails) throw new Error('Page hook evaluation failed');
        const value = result.result && result.result.value;
        const ready = !!(value && value.installed && value.ready);
        coverage.currentContexts.push({ contextId: destination.contextId || null, ready, status: value || null });
        if (ready) handle.ready = true;
        if (value && value.coverage && value.coverage.legacyHookPresent) coverage.legacyHookPresent = true;
      } catch (error) {
        const closed = closedProtocolError(error, destination.contextId !== undefined);
        if (closed === 'session') sessionClosed('session-closed-during-install');
        else if (closed === 'context') { finishPending('unavailable_context_destroyed', destination.contextId); contexts.delete(destination.contextId); }
        coverage.currentContexts.push({ contextId: destination.contextId ?? null, ready: false, reason: closed ? 'alreadyClosed' : 'context_evaluation_failed', code: error.code || 'CDP_ERROR' });
      }
    }
    await flush();
    return handle;
  } catch (error) {
    if (sessionDead || closedProtocolError(error)) {
      sessionClosed('session-closed-during-install');
      await uninstall();
      return handle;
    }
    installationError = error;
    options.onError?.(error);
    if (!options.deferCurrentEvaluation) await uninstall().catch(() => {});
    throw error;
  }
}

module.exports = {
  HOOK_VERSION,
  DEFAULT_MAX_BODY_BYTES,
  defaultStoreKey,
  createPageHookRuntime,
  generatePageHookSource: createPageHookRuntime,
  installHookForSession,
  createJsonlWriter,
};
