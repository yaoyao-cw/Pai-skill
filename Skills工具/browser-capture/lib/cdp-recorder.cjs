'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { EventEmitter } = require('node:events');

const DEFAULT_BODY_LIMIT = 16 * 1024 * 1024;
const LIMITATIONS = [
  'Only selected targets and their discovered related contexts are enabled.',
  'Requests that predate Network.enable, attachment races, and already-running workers may be absent.',
  'CDP body retrieval can fail for redirects, cache eviction, failed requests, and closed targets.',
  'Raw CDP Network events are not a packet capture; native traffic, WebRTC media, and unexposed channels are not covered.',
  'ExtraInfo associations are append-only revisions; consumers must use the latest revision, including unresolved revocations.'
];

function captureError(message, cause) {
  const error = new Error(message);
  error.code = 'CAPTURE_WRITE_FAILED';
  if (cause) error.cause = cause;
  return error;
}

/** Exclusive, synchronous JSONL appends: raw events reach the writer before derivation. */
class JsonlWriter {
  constructor({ outDir, outputFile } = {}) {
    if (!outDir) throw new Error('outDir is required');
    this.files = {
      raw: path.resolve(outputFile || path.join(outDir, 'raw.jsonl')),
      records: path.resolve(outDir, 'records.jsonl'),
      metadata: path.resolve(outDir, 'metadata.jsonl')
    };
    this.handles = new Map();
    this.closed = false;
    this.failed = null;
    this.closeState = { write: 'not_run', fsync: 'not_run', close: 'not_run' };
    // Test before creating anything, and still use wx to protect against races.
    if (Object.values(this.files).some((file) => fs.existsSync(file)) || fs.existsSync(outDir)) {
      const error = new Error('Capture output already exists; select a new output file and session directory');
      error.code = 'CAPTURE_OUTPUT_EXISTS';
      throw error;
    }
    try {
      fs.mkdirSync(path.dirname(path.resolve(outDir)), { recursive: true });
      fs.mkdirSync(path.resolve(outDir));
      fs.mkdirSync(path.dirname(this.files.raw), { recursive: true });
      for (const [name, file] of Object.entries(this.files)) this.handles.set(name, fs.openSync(file, 'wx'));
    } catch (cause) {
      for (const fd of this.handles.values()) { try { fs.closeSync(fd); } catch {} }
      this.handles.clear();
      throw captureError('Capture output creation failed', cause);
    }
  }

  append(channel, record) {
    if (this.failed) throw this.failed;
    if (this.closed) throw captureError('Capture writer is closed');
    try {
      const fd = this.handles.get(channel);
      if (fd === undefined) throw new Error('Unknown capture stream');
      fs.writeFileSync(fd, JSON.stringify(record) + '\n', 'utf8');
      this.closeState.write = 'succeeded';
    } catch (cause) {
      this.closeState.write = 'failed';
      this.failed = captureError('Capture append failed', cause);
      throw this.failed;
    }
  }

  close() {
    if (this.closed) { if (this.failed) throw this.failed; return; }
    this.closed = true;
    this.closeState.fsync = 'succeeded';
    this.closeState.close = 'succeeded';
    for (const fd of this.handles.values()) {
      try { fs.fsyncSync(fd); } catch (cause) { this.closeState.fsync = 'failed'; this.failed ||= captureError('Capture flush failed', cause); }
      try { fs.closeSync(fd); } catch (cause) { this.closeState.close = 'failed'; this.failed ||= captureError('Capture close failed', cause); }
    }
    this.handles.clear();
    if (this.failed) throw this.failed;
  }
}

function headerMap(headers = {}) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]));
}

function headersCompatible(headers, hop) {
  const supplied = headerMap(headers);
  let url;
  try { url = new URL(hop.request.url); } catch { return { ok: false, reason: 'unparseable-request-url' }; }
  if (supplied[':method'] !== undefined && supplied[':method'] !== hop.request.method) {
    return { ok: false, reason: 'method-header-mismatch' };
  }
  if (supplied[':path'] !== undefined && supplied[':path'] !== url.pathname + url.search) {
    return { ok: false, reason: 'path-header-mismatch' };
  }
  for (const key of [':authority', 'host']) {
    if (supplied[key] === undefined) continue;
    let host;
    try { host = new URL(`${url.protocol}//${supplied[key]}`).host.toLowerCase(); }
    catch { return { ok: false, reason: 'authority-header-invalid' }; }
    if (host !== url.host.toLowerCase()) return { ok: false, reason: 'authority-header-mismatch' };
  }
  return { ok: true, checkedHeaders: [':authority', 'host', ':path', ':method'].filter((key) => key in supplied) };
}

function bodyValue(body, base64Encoded, limit) {
  const bytes = Buffer.from(body, base64Encoded ? 'base64' : 'utf8');
  let captured = bytes.subarray(0, limit);
  let value;
  if (base64Encoded) value = captured.toString('base64');
  else {
    // Truncate on a valid UTF-8 boundary, rather than introduce replacement bytes.
    const decoder = new TextDecoder('utf-8', { fatal: true });
    for (;;) {
      try { value = decoder.decode(captured); break; }
      catch {
        if (!captured.length) { value = ''; break; }
        captured = captured.subarray(0, captured.length - 1);
      }
    }
  }
  return {
    body: value, base64Encoded: !!base64Encoded,
    originalBytes: bytes.length, capturedBytes: captured.length,
    truncated: captured.length < bytes.length,
    bodyState: captured.length < bytes.length ? 'truncated' : 'captured'
  };
}

class CdpRecorder extends EventEmitter {
  constructor({ client, outDir, outputFile, writer, runId = randomUUID(), maxBodyBytes = DEFAULT_BODY_LIMIT, skipMedia = true } = {}) {
    super();
    if (!client || typeof client.send !== 'function') throw new Error('A supplied CDP client is required');
    if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1) throw new Error('maxBodyBytes must be a positive safe integer');
    this.client = client;
    this.runId = runId;
    this.maxBodyBytes = maxBodyBytes;
    this.skipMedia = skipMedia;
    this.writer = writer || new JsonlWriter({ outDir, outputFile });
    this.files = this.writer.files;
    this.sessions = new Map();
    this.buckets = new Map();
    this.pending = new Set();
    this.eventSeq = 0;
    this.recordSeq = 0;
    this.accepting = true;
    this.finalized = false;
    this.fatalError = null;
    this.incompleteSessions = new Set();
    try {
      this.metadata('capture-start', { maxBodyBytes, skipMedia, rawPolicy: 'all-selected-session-Network-events', limitations: LIMITATIONS });
    } catch (error) {
      try { this.writer.close(); } catch {}
      throw error;
    }
  }

  metadata(kind, values = {}) {
    if (this.finalized) return;
    this.writer.append('metadata', { kind, runId: this.runId, receivedAt: new Date().toISOString(), ...values });
  }

  addSession(sessionId, targetInfo) {
    if (this.sessions.has(sessionId)) return;
    this.sessions.set(sessionId, { targetId: targetInfo.targetId, type: targetInfo.type });
    this.metadata('session-selected', { sessionId, targetId: targetInfo.targetId, targetType: targetInfo.type });
  }

  _append(kind, values = {}) {
    if (this.finalized) return;
    this.writer.append('records', { kind, runId: this.runId, recordSeq: ++this.recordSeq, receivedAt: new Date().toISOString(), ...values });
  }

  _ref(hop) {
    return { hopId: hop.hopId, sessionId: hop.bucket.sessionId, targetId: hop.targetId,
      requestId: hop.bucket.requestId, generation: hop.generation, hopIndex: hop.hopIndex };
  }

  _bucket(sessionId, requestId) {
    const key = JSON.stringify([sessionId, requestId]);
    if (!this.buckets.has(key)) this.buckets.set(key, {
      sessionId, requestId, generations: [], current: null, orphanRedirect: false,
      extras: { request: [], response: [] }, revisions: { request: 0, response: 0 }, signatures: {}
    });
    return this.buckets.get(key);
  }

  record(message) {
    if (!this.accepting || typeof message.method !== 'string' || !message.method.startsWith('Network.')) return false;
    const sessionId = message.sessionId ?? null;
    if (!this.sessions.has(sessionId)) return false; // Never enable or save unselected login contexts.
    const params = message.params || {};
    const raw = {
      kind: 'cdp-event', runId: this.runId, eventSeq: ++this.eventSeq,
      receivedAt: new Date().toISOString(), receivedAtMonotonicNs: process.hrtime.bigint().toString(),
      sessionId, targetId: this.sessions.get(sessionId).targetId,
      method: message.method, params
    };
    this.writer.append('raw', raw); // The untouched CDP params are persisted before any map update or await.
    if (params.requestId === undefined) return true;
    const sourceEventSeq = raw.eventSeq;
    // Derive WebSocket records before touching HTTP buckets so open sockets never mark HTTP requests unfinished.
    if (message.method.startsWith('Network.webSocket')) {
      this._webSocket(sessionId, raw.targetId, message.method, params, sourceEventSeq);
      return true;
    }
    if (message.method === 'Network.eventSourceMessageReceived') {
      const payload = typeof params.data === 'string'
        ? bodyValue(params.data, false, this.maxBodyBytes)
        : { body: '', originalBytes: 0, capturedBytes: 0, truncated: false, bodyState: 'empty' };
      this._append('sse-message', {
        sessionId,
        targetId: raw.targetId,
        requestId: params.requestId,
        sourceEventSeq,
        timestamp: params.timestamp ?? null,
        eventName: params.eventName || 'message',
        eventId: params.eventId || null,
        data: payload.body,
        originalBytes: payload.originalBytes,
        capturedBytes: payload.capturedBytes,
        truncated: payload.truncated,
      });
      return true;
    }
    const bucket = this._bucket(sessionId, params.requestId);
    switch (message.method) {
      case 'Network.requestWillBeSent': this._request(bucket, params, sourceEventSeq); break;
      case 'Network.responseReceived': this._response(bucket, params, sourceEventSeq); break;
      case 'Network.requestWillBeSentExtraInfo':
      case 'Network.responseReceivedExtraInfo': {
        const type = message.method === 'Network.requestWillBeSentExtraInfo' ? 'request' : 'response';
        bucket.extras[type].push({ sourceEventSeq, params });
        this._reconcile(bucket);
        break;
      }
      case 'Network.loadingFinished': this._finished(bucket, params, sourceEventSeq); break;
      case 'Network.loadingFailed': this._failed(bucket, params, sourceEventSeq); break;
      case 'Network.requestServedFromCache':
        if (bucket.current) bucket.current.servedFromCache = true;
        break;
    }
    return true;
  }

  _webSocket(sessionId, targetId, method, params, sourceEventSeq) {
    const base = { sessionId, targetId, requestId: params.requestId, sourceEventSeq, timestamp: params.timestamp ?? null };
    if (method === 'Network.webSocketCreated') {
      this._append('ws-created', { ...base, url: params.url || null, initiator: params.initiator || null });
    } else if (method === 'Network.webSocketWillSendHandshakeRequest') {
      this._append('ws-handshake-request', { ...base, wallTime: params.wallTime ?? null, request: params.request || {} });
    } else if (method === 'Network.webSocketHandshakeResponseReceived') {
      this._append('ws-handshake-response', { ...base, response: params.response || {} });
    } else if (method === 'Network.webSocketFrameSent' || method === 'Network.webSocketFrameReceived') {
      const frame = params.response || {};
      const payload = typeof frame.payloadData === 'string'
        ? bodyValue(frame.payloadData, frame.opcode === 2, this.maxBodyBytes)
        : { body: '', base64Encoded: false, originalBytes: 0, capturedBytes: 0, truncated: false, bodyState: 'empty' };
      this._append(method === 'Network.webSocketFrameSent' ? 'ws-frame-sent' : 'ws-frame-received', {
        ...base,
        opcode: frame.opcode ?? null,
        mask: frame.mask ?? null,
        payloadData: payload.body,
        base64Encoded: payload.base64Encoded,
        originalBytes: payload.originalBytes,
        capturedBytes: payload.capturedBytes,
        truncated: payload.truncated,
        bodyState: payload.bodyState,
      });
    } else if (method === 'Network.webSocketFrameError') {
      this._append('ws-frame-error', { ...base, errorMessage: params.errorMessage || null });
    } else if (method === 'Network.webSocketClosed') {
      this._append('ws-closed', base);
    }
  }

  _flag(hop, value, sourceEventSeq) {
    if (typeof value !== 'boolean') return;
    if (typeof hop.hasExtraInfo === 'boolean' && hop.hasExtraInfo !== value) hop.flagConflict = true;
    hop.hasExtraInfo = value;
    hop.flagEventSeqs.push(sourceEventSeq);
  }

  _request(bucket, params, sourceEventSeq) {
    let generation;
    let hopIndex = 0;
    if (params.redirectResponse && bucket.current) {
      const previous = bucket.current;
      previous.response = params.redirectResponse;
      previous.terminal = true;
      previous.redirected = true;
      this._flag(previous, params.redirectHasExtraInfo, sourceEventSeq);
      if (typeof params.redirectHasExtraInfo !== 'boolean') previous.unknownRedirectFlag = true;
      this._append('redirect-response', {
        ...this._ref(previous), sourceEventSeq, response: params.redirectResponse,
        redirectHasExtraInfo: params.redirectHasExtraInfo,
        serverEndpoint: { role: 'server-endpoint', address: params.redirectResponse.remoteIPAddress ?? null, port: params.redirectResponse.remotePort ?? null }
      });
      this._bodyUnavailable(previous, 'redirect-body-not-addressable', sourceEventSeq);
      generation = bucket.generations[previous.generation];
      hopIndex = previous.hopIndex + 1;
    } else {
      generation = { generation: bucket.generations.length, hops: [] };
      bucket.generations.push(generation);
      if (params.redirectResponse) {
        bucket.orphanRedirect = true;
        this._append('orphan-redirect-response', { sessionId: bucket.sessionId, requestId: bucket.requestId,
          sourceEventSeq, response: params.redirectResponse, reason: 'redirect-request-not-observed' });
      }
    }
    const hop = {
      bucket, targetId: this.sessions.get(bucket.sessionId).targetId,
      generation: generation.generation, hopIndex,
      hopId: `${this.runId}:${bucket.sessionId}:${bucket.requestId}:g${generation.generation}:h${hopIndex}`,
      request: params.request || {}, resourceType: params.type,
      sourceEventSeq, flagEventSeqs: [], terminal: false, bodyRecorded: false, postDataRecorded: false
    };
    generation.hops.push(hop);
    bucket.current = hop;
    this._append('request', { ...this._ref(hop), sourceEventSeq, request: hop.request,
      timestamp: params.timestamp, wallTime: params.wallTime, loaderId: params.loaderId, frameId: params.frameId,
      resourceType: params.type, initiator: params.initiator });
    this._reconcile(bucket);
    if (hop.request.hasPostData && !Object.prototype.hasOwnProperty.call(hop.request, 'postData')) {
      this._launch('post-data', hop, (token) => this._postData(hop, token));
    }
  }

  _response(bucket, params, sourceEventSeq) {
    const hop = bucket.current;
    if (!hop) {
      this._append('unresolved-response', { sessionId: bucket.sessionId, requestId: bucket.requestId,
        sourceEventSeq, reason: 'request-not-observed' });
      return;
    }
    hop.response = params.response || {};
    hop.resourceType = params.type || hop.resourceType;
    this._flag(hop, params.hasExtraInfo, sourceEventSeq);
    this._append('response', { ...this._ref(hop), sourceEventSeq, response: params.response,
      hasExtraInfo: params.hasExtraInfo, timestamp: params.timestamp,
      serverEndpoint: { role: 'server-endpoint', address: hop.response.remoteIPAddress ?? null, port: hop.response.remotePort ?? null } });
    this._reconcile(bucket);
  }

  _finished(bucket, params, sourceEventSeq) {
    const hop = bucket.current;
    if (!hop) {
      this._append('body', { sessionId: bucket.sessionId, requestId: bucket.requestId, sourceEventSeq,
        bodyState: 'unavailable', reason: 'request-not-observed' });
      return;
    }
    hop.terminal = true;
    hop.finished = true;
    this._append('loading-finished', { ...this._ref(hop), sourceEventSeq, timestamp: params.timestamp,
      encodedDataLength: params.encodedDataLength });
    this._reconcile(bucket);
    if (hop.bodyRecorded || hop.bodyPending) return;
    if (!hop.response) { this._bodyUnavailable(hop, 'response-not-observed', sourceEventSeq); return; }
    const mime = String(hop.response.mimeType || '').toLowerCase();
    if (this.skipMedia && (/^(audio|video)\//.test(mime) || hop.resourceType === 'Media')) {
      hop.bodyRecorded = true;
      this._append('body', { ...this._ref(hop), sourceEventSeq, bodyState: 'skipped', reason: 'media-policy', mimeType: mime });
      return;
    }
    hop.bodyPending = true;
    this._launch('body', hop, (token) => this._responseBody(hop, token, sourceEventSeq));
  }

  _failed(bucket, params, sourceEventSeq) {
    const hop = bucket.current;
    if (!hop) return;
    hop.terminal = true;
    hop.failed = true;
    this._append('loading-failed', { ...this._ref(hop), sourceEventSeq, failure: params });
    this._bodyUnavailable(hop, 'network-loading-failed', sourceEventSeq);
    this._reconcile(bucket);
  }

  _bodyUnavailable(hop, reason, sourceEventSeq) {
    if (hop.bodyRecorded) return;
    hop.bodyRecorded = true;
    this._append('body', { ...this._ref(hop), sourceEventSeq, bodyState: 'unavailable', reason });
  }

  _launch(kind, hop, work) {
    const token = { kind, hop, cancelled: false };
    this.pending.add(token);
    token.promise = work(token).catch((error) => {
      this.fatalError ||= error;
      this.emit('fatal', error);
    }).finally(() => this.pending.delete(token));
  }

  async _responseBody(hop, token, sourceEventSeq) {
    let result;
    try { result = await this.client.send('Network.getResponseBody', { requestId: hop.bucket.requestId }, hop.bucket.sessionId); }
    catch {
      if (token.cancelled || this.finalized) return;
      const cached = hop.servedFromCache || hop.response?.fromDiskCache || hop.response?.fromServiceWorker || hop.response?.fromPrefetchCache;
      this._bodyUnavailable(hop, cached ? 'cache-body-unavailable' : 'cdp-get-response-body-failed', sourceEventSeq);
      return;
    }
    if (token.cancelled || this.finalized || hop.bodyRecorded) return;
    if (hop.bucket.current !== hop || hop.redirected) {
      this._bodyUnavailable(hop, 'request-id-advanced-while-body-pending', sourceEventSeq);
      return;
    }
    if (!result || typeof result.body !== 'string') {
      this._bodyUnavailable(hop, 'cdp-response-body-missing', sourceEventSeq);
      return;
    }
    hop.bodyRecorded = true;
    this._append('body', { ...this._ref(hop), sourceEventSeq, ...bodyValue(result.body, result.base64Encoded, this.maxBodyBytes) });
  }

  async _postData(hop, token) {
    let result;
    try { result = await this.client.send('Network.getRequestPostData', { requestId: hop.bucket.requestId }, hop.bucket.sessionId); }
    catch {
      if (!token.cancelled && !this.finalized) {
        hop.postDataRecorded = true;
        this._append('request-post-data', { ...this._ref(hop), sourceEventSeq: hop.sourceEventSeq,
          postDataState: hop.bucket.current !== hop ? 'ambiguous' : 'unavailable', reason: 'cdp-get-request-post-data-failed' });
      }
      return;
    }
    if (token.cancelled || this.finalized) return;
    hop.postDataRecorded = true;
    if (hop.bucket.current !== hop || hop.redirected) {
      this._append('request-post-data', { ...this._ref(hop), sourceEventSeq: hop.sourceEventSeq,
        postDataState: 'ambiguous', reason: 'request-id-advanced-while-post-data-pending' });
      return;
    }
    if (!result || typeof result.postData !== 'string') {
      this._append('request-post-data', { ...this._ref(hop), sourceEventSeq: hop.sourceEventSeq,
        postDataState: 'unavailable', reason: 'cdp-request-post-data-missing' });
      return;
    }
    const value = bodyValue(result.postData, false, this.maxBodyBytes);
    const { body, bodyState, ...sizes } = value;
    this._append('request-post-data', { ...this._ref(hop), sourceEventSeq: hop.sourceEventSeq,
      postDataState: bodyState, postData: body, ...sizes });
  }

  _reconcile(bucket) {
    const hops = bucket.generations.flatMap((generation) => generation.hops);
    const flags = hops.map((hop) => ({ hopId: hop.hopId, hasExtraInfo: hop.hasExtraInfo ?? null,
      sourceEventSeqs: hop.flagEventSeqs }));
    for (const type of ['request', 'response']) {
      const extras = bucket.extras[type];
      let reason;
      if (bucket.generations.length > 1) reason = 'request-id-reused-across-generations';
      else if (bucket.orphanRedirect) reason = 'redirect-prefix-not-observed';
      else if (!hops.length) reason = 'request-not-yet-observed';
      else if (hops.some((hop) => hop.flagConflict)) reason = 'conflicting-extra-info-flags';
      else if (hops.some((hop) => typeof hop.hasExtraInfo !== 'boolean' || hop.unknownRedirectFlag)) reason = 'unknown-extra-info-flags';
      else if (!bucket.current.terminal) reason = 'chain-open';
      const expected = hops.filter((hop) => hop.hasExtraInfo === true);
      if (!reason && extras.length !== expected.length) reason = 'extra-info-count-mismatch';
      const assignments = [];
      if (!reason) {
        for (let index = 0; index < extras.length; index++) {
          const check = headersCompatible(extras[index].params.headers, expected[index]);
          if (!check.ok) { reason = check.reason; break; }
          assignments.push({ sourceEventSeq: extras[index].sourceEventSeq, ...this._ref(expected[index]),
            evidence: 'complete-chain-known-flags-equal-count-fifo', checkedHeaders: check.checkedHeaders });
        }
      }
      const payload = {
        sessionId: bucket.sessionId, requestId: bucket.requestId, extraType: type,
        status: reason ? 'unresolved' : 'associated', reason: reason || null, flags,
        observedCount: extras.length, expectedCount: expected.length,
        extraEventSeqs: extras.map((extra) => extra.sourceEventSeq), assignments: reason ? [] : assignments
      };
      const signature = JSON.stringify(payload);
      if (signature === bucket.signatures[type]) continue;
      bucket.signatures[type] = signature;
      this._append('extra-info-association', { ...payload, revision: ++bucket.revisions[type] });
    }
  }

  sessionClosed(sessionId, reason = 'target-detached') {
    if (!this.sessions.has(sessionId) || this.finalized || this.sessions.get(sessionId).closed) return;
    Object.assign(this.sessions.get(sessionId), { closed: true, closedReason: reason });
    const unfinished = [...this.buckets.values()].some(bucket => bucket.sessionId === sessionId && bucket.current && !bucket.current.terminal);
    const pendingBody = [...this.pending].some(token => token.hop.bucket.sessionId === sessionId);
    if (unfinished || pendingBody) this.incompleteSessions.add(sessionId);
    this.metadata(unfinished || pendingBody ? 'session-incomplete' : 'session-closed', { sessionId, reason });
    for (const token of this.pending) {
      if (token.hop.bucket.sessionId !== sessionId) continue;
      token.cancelled = true;
      this.pending.delete(token);
      if (token.kind === 'body') this._bodyUnavailable(token.hop, reason);
      else if (!token.hop.postDataRecorded) {
        token.hop.postDataRecorded = true;
        this._append('request-post-data', { ...this._ref(token.hop), postDataState: 'unavailable', reason });
      }
    }
    for (const bucket of this.buckets.values()) {
      if (bucket.sessionId === sessionId && bucket.current && !bucket.current.terminal) this._bodyUnavailable(bucket.current, reason);
    }
  }

  stop({ timeoutMs = 5000, incomplete = false, reason = 'user-stop', beforeClose } = {}) {
    if (this.stopPromise) return this.stopPromise;
    this.accepting = false;
    this.stopPromise = this._stop({ timeoutMs, incomplete, reason, beforeClose });
    return this.stopPromise;
  }

  async _stop({ timeoutMs, incomplete, reason, beforeClose }) {
    let timer;
    let timedOut = false;
    let unfinishedRequests = 0;
    let failure = this.fatalError;
    let cleanup;
    try {
      if (this.pending.size) {
        await Promise.race([
          Promise.allSettled([...this.pending].map((token) => token.promise)),
          new Promise((resolve) => { timer = setTimeout(() => { timedOut = true; resolve(); }, timeoutMs); })
        ]);
      }
      // Cancel first: even a writer error must prevent late body callbacks.
      for (const token of this.pending) token.cancelled = true;
      for (const token of this.pending) {
        if (token.kind === 'body') this._bodyUnavailable(token.hop, 'capture-stop-timeout');
        else if (!token.hop.postDataRecorded) {
          token.hop.postDataRecorded = true;
          this._append('request-post-data', { ...this._ref(token.hop), postDataState: 'unavailable', reason: 'capture-stop-timeout' });
        }
      }
      for (const bucket of this.buckets.values()) {
        for (const generation of bucket.generations) for (const hop of generation.hops) {
          if (!hop.terminal) {
            unfinishedRequests++;
            this._bodyUnavailable(hop, 'capture-ended-before-loading-finished');
          }
        }
      }
    } catch (error) { failure ||= error; }
    finally {
      clearTimeout(timer);
      for (const token of this.pending) token.cancelled = true;
    }
    // Session detachment still runs when appending failed, and never closes a page.
    if (beforeClose) {
      try { cleanup = await beforeClose(); } catch (error) { failure ||= error; }
    }
    failure ||= this.fatalError;
    const summary = { status: incomplete || timedOut || unfinishedRequests || this.incompleteSessions.size || failure || cleanup?.failed || cleanup?.timedOut || cleanup?.skipped ? 'incomplete' : 'complete',
      reason, rawEventCount: this.eventSeq, unfinishedRequests, pendingTimedOut: timedOut, cleanup };
    try { this.metadata('capture-stop', summary); } catch (error) { failure ||= error; }
    this.finalized = true;
    const dataStreams = { write: failure?.code === 'CAPTURE_WRITE_FAILED' ? 'failed' : 'succeeded', close: 'not_run', fsync: 'unknown' };
    try { this.writer.close(); dataStreams.close = 'succeeded'; }
    catch (error) { dataStreams.close = 'failed'; failure ||= error; }
    if (this.writer.closeState) Object.assign(dataStreams, this.writer.closeState);
    summary.dataStreams = dataStreams;
    summary.streamsClosed = dataStreams.close === 'succeeded';
    summary.dataFlushed = dataStreams.write === 'failed' || dataStreams.close === 'failed' || dataStreams.fsync === 'failed' ? false
      : dataStreams.write === 'succeeded' && dataStreams.close === 'succeeded' && dataStreams.fsync === 'succeeded' ? true : null;
    summary.cleanupComplete = cleanup?.skipped ? false : Number.isSafeInteger(cleanup?.failed) && typeof cleanup?.timedOut === 'boolean' ? cleanup.failed === 0 && cleanup.timedOut === false : null;
    this.pending.clear();
    if (failure) { summary.status = 'incomplete'; failure.captureSummary = summary; throw failure; }
    return summary;
  }
}

// Target lifecycle is implemented by collector.cjs for this profile-wide skill.
module.exports = { CdpRecorder, JsonlWriter, DEFAULT_BODY_LIMIT, LIMITATIONS };
