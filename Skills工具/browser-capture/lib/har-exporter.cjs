'use strict';
const fs = require('node:fs');
const path = require('node:path');

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) return [];
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch {}
  }
  return rows;
}

function headerPairs(obj = {}) {
  const out = [];
  for (const [name, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null) continue;
    const str = String(value);
    // Split multi-line Set-Cookie headers cleanly if joined with \n by CDP
    if (name.toLowerCase() === 'set-cookie' && str.includes('\n')) {
      for (const part of str.split('\n')) if (part.length) out.push({ name, value: part });
    } else {
      out.push({ name, value: str });
    }
  }
  return out;
}

function mergeHeaders(baseObj, extraObj) {
  if (!extraObj) return headerPairs(baseObj);
  const merged = new Map();
  const extras = [];
  for (const [k, v] of Object.entries(baseObj || {})) merged.set(k.toLowerCase(), { name: k, value: String(v) });
  for (const [k, v] of Object.entries(extraObj || {})) {
    const low = k.toLowerCase();
    if (low === 'set-cookie') {
      for (const part of String(v).split('\n')) if (part.length) extras.push({ name: k, value: part });
      merged.delete(low);
    } else {
      merged.set(low, { name: k, value: String(v) });
    }
  }
  return [...merged.values(), ...extras];
}

function parseQueryString(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return [...u.searchParams.entries()].map(([name, value]) => ({ name, value }));
  } catch {
    return [];
  }
}

function parseRequestCookies(headers) {
  const cookies = [];
  for (const h of headers) {
    if (h.name.toLowerCase() !== 'cookie') continue;
    for (const part of h.value.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      cookies.push({ name: part.slice(0, eq).trim(), value: part.slice(eq + 1).trim() });
    }
  }
  return cookies;
}

function parseResponseCookies(headers) {
  const cookies = [];
  for (const h of headers) {
    if (h.name.toLowerCase() !== 'set-cookie') continue;
    const first = h.value.split(';')[0] || '';
    const eq = first.indexOf('=');
    if (eq < 0) continue;
    cookies.push({ name: first.slice(0, eq).trim(), value: first.slice(eq + 1).trim() });
  }
  return cookies;
}

function exportHar(runDir, outFile) {
  const absRun = path.resolve(runDir);
  if (!fs.existsSync(absRun)) {
    throw Object.assign(Error(`Run directory not found: ${absRun}`), { code: 'RUN_DIR_NOT_FOUND' });
  }

  const rawEvents = readJsonl(path.join(absRun, 'raw.jsonl'));
  const records = readJsonl(path.join(absRun, 'records.jsonl'));

  const rawBySeq = new Map();
  for (const e of rawEvents) rawBySeq.set(e.eventSeq, e);

  // Track latest extra-info-association revision per (sessionId, requestId, extraType)
  const latestExtra = new Map();
  for (const r of records) {
    if (r.kind !== 'extra-info-association') continue;
    const key = `${r.sessionId}|${r.requestId}|${r.extraType}`;
    const prev = latestExtra.get(key);
    if (!prev || r.revision > prev.revision) latestExtra.set(key, r);
  }
  const extraHeadersByHop = new Map();
  for (const assoc of latestExtra.values()) {
    if (assoc.status !== 'associated') continue;
    for (const a of assoc.assignments || []) {
      const raw = rawBySeq.get(a.sourceEventSeq);
      if (!raw?.params?.headers) continue;
      const cur = extraHeadersByHop.get(a.hopId) || {};
      cur[assoc.extraType] = raw.params.headers;
      extraHeadersByHop.set(a.hopId, cur);
    }
  }

  const hops = new Map();
  const hopOrder = [];
  const wsSessions = new Map();
  const wsOrder = [];

  for (const r of records) {
    if (r.kind === 'request') {
      const entry = { hopId: r.hopId, request: r, response: null, finished: null, failed: null, body: null, postData: null };
      hops.set(r.hopId, entry);
      hopOrder.push(r.hopId);
    } else if (r.kind === 'response' || r.kind === 'redirect-response') {
      const h = hops.get(r.hopId);
      if (h) h.response = r;
    } else if (r.kind === 'loading-finished') {
      const h = hops.get(r.hopId);
      if (h) h.finished = r;
    } else if (r.kind === 'loading-failed') {
      const h = hops.get(r.hopId);
      if (h) h.failed = r;
    } else if (r.kind === 'body') {
      const h = hops.get(r.hopId);
      if (h) h.body = r;
    } else if (r.kind === 'request-post-data') {
      const h = hops.get(r.hopId);
      if (h) h.postData = r;
    } else if (r.kind === 'ws-created') {
      const key = `${r.sessionId}|${r.requestId}`;
      const ws = { created: r, req: null, res: null, messages: [] };
      wsSessions.set(key, ws);
      wsOrder.push(key);
    } else if (r.kind === 'ws-handshake-request') {
      const ws = wsSessions.get(`${r.sessionId}|${r.requestId}`);
      if (ws) ws.req = r;
    } else if (r.kind === 'ws-handshake-response') {
      const ws = wsSessions.get(`${r.sessionId}|${r.requestId}`);
      if (ws) ws.res = r;
    } else if (r.kind === 'ws-frame-sent' || r.kind === 'ws-frame-received') {
      const ws = wsSessions.get(`${r.sessionId}|${r.requestId}`);
      if (ws) {
        ws.messages.push({
          type: r.kind === 'ws-frame-sent' ? 'send' : 'receive',
          time: r.timestamp ?? 0,
          opcode: r.opcode ?? 1,
          data: r.payloadData ?? '',
        });
      }
    }
  }

  const entries = [];
  let bodyCapturedCount = 0;

  for (const hopId of hopOrder) {
    const h = hops.get(hopId);
    const reqRec = h.request;
    const req = reqRec.request || {};
    const resRec = h.response;
    const res = resRec?.response || {};
    const extras = extraHeadersByHop.get(hopId) || {};

    const reqHeaders = mergeHeaders(req.headers, extras.request);
    const resHeaders = mergeHeaders(res.headers, extras.response);
    const postText = typeof h.postData?.postData === 'string'
      ? h.postData.postData
      : typeof req.postData === 'string' ? req.postData : null;
    const reqMime = reqHeaders.find(x => x.name.toLowerCase() === 'content-type')?.value || '';
    const resMime = res.mimeType || resHeaders.find(x => x.name.toLowerCase() === 'content-type')?.value || '';
    const redirectURL = resHeaders.find(x => x.name.toLowerCase() === 'location')?.value || '';

    const startedDateTime = Number.isFinite(reqRec.wallTime)
      ? new Date(reqRec.wallTime * 1000).toISOString()
      : (reqRec.receivedAt || new Date().toISOString());
    const endTs = h.finished?.timestamp ?? resRec?.timestamp ?? reqRec.timestamp ?? 0;
    const startTs = reqRec.timestamp ?? endTs;
    const elapsedMs = Math.max(0, Math.round((endTs - startTs) * 100000) / 100);

    const content = { size: h.body?.originalBytes ?? h.finished?.encodedDataLength ?? 0, mimeType: resMime };
    if (h.body && typeof h.body.body === 'string' && ['captured', 'truncated'].includes(h.body.bodyState)) {
      content.text = h.body.body;
      if (h.body.base64Encoded) content.encoding = 'base64';
      bodyCapturedCount++;
    }

    entries.push({
      startedDateTime,
      time: elapsedMs,
      request: {
        method: req.method || 'GET',
        url: req.url || '',
        httpVersion: res.protocol || 'HTTP/1.1',
        cookies: parseRequestCookies(reqHeaders),
        headers: reqHeaders,
        queryString: parseQueryString(req.url || ''),
        ...(postText !== null ? { postData: { mimeType: reqMime, text: postText } } : {}),
        headersSize: -1,
        bodySize: postText !== null ? Buffer.byteLength(postText, 'utf8') : 0,
      },
      response: {
        status: Number.isInteger(res.status) ? res.status : 0,
        statusText: res.statusText || (h.failed ? String(h.failed.failure?.errorText || 'FAILED') : ''),
        httpVersion: res.protocol || 'HTTP/1.1',
        cookies: parseResponseCookies(resHeaders),
        headers: resHeaders,
        content,
        redirectURL,
        headersSize: -1,
        bodySize: h.finished?.encodedDataLength ?? -1,
      },
      cache: {},
      timings: { send: 0, wait: elapsedMs, receive: 0 },
      ...(resRec?.serverEndpoint?.address ? { serverIPAddress: resRec.serverEndpoint.address } : {}),
      _resourceType: reqRec.resourceType || null,
      _initiator: reqRec.initiator || null,
      _targetId: reqRec.targetId || null,
      _hopId: hopId,
    });
  }

  let wsEntriesCount = 0;
  for (const key of wsOrder) {
    const ws = wsSessions.get(key);
    const reqHeaders = headerPairs(ws.req?.request?.headers || {});
    const resHeaders = headerPairs(ws.res?.response?.headers || {});
    entries.push({
      startedDateTime: ws.created.receivedAt || new Date().toISOString(),
      time: 0,
      request: {
        method: 'GET',
        url: ws.created.url || '',
        httpVersion: 'HTTP/1.1',
        cookies: parseRequestCookies(reqHeaders),
        headers: reqHeaders,
        queryString: parseQueryString(ws.created.url || ''),
        headersSize: -1,
        bodySize: 0,
      },
      response: {
        status: ws.res?.response?.status ?? 101,
        statusText: ws.res?.response?.statusText || 'Switching Protocols',
        httpVersion: 'HTTP/1.1',
        cookies: parseResponseCookies(resHeaders),
        headers: resHeaders,
        content: { size: 0, mimeType: '' },
        redirectURL: '',
        headersSize: -1,
        bodySize: 0,
      },
      cache: {},
      timings: { send: 0, wait: 0, receive: 0 },
      _resourceType: 'websocket',
      _initiator: ws.created.initiator || null,
      _targetId: ws.created.targetId || null,
      _webSocketMessages: ws.messages,
    });
    wsEntriesCount++;
  }

  const har = {
    log: {
      version: '1.2',
      creator: { name: 'browser-capture', version: '4.0.0' },
      pages: [],
      entries,
    },
  };

  const targetFile = path.resolve(outFile || path.join(absRun, 'capture.har'));
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  const fd = fs.openSync(targetFile, 'w');
  try { fs.writeFileSync(fd, JSON.stringify(har, null, 2) + '\n', 'utf8'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }

  return {
    harFile: targetFile,
    runDir: absRun,
    entriesCount: entries.length,
    httpEntriesCount: entries.length - wsEntriesCount,
    wsEntriesCount,
    bodyCapturedCount,
  };
}

module.exports = { exportHar };
