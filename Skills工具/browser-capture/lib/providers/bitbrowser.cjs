'use strict';
// BitBrowser local API profile resolver; no stored account or browser ID.
const { ConnectionError, fail, isLoopbackHost, assertLoopbackUrl, makeRequestJson } = require('../loopback.cjs');

const PROVIDER_NAME = 'bitbrowser';
const DEFAULT_API_URL = 'http://127.0.0.1:54348';
const SUPPORTS_BROWSER_ID = true;
const WINDOW_LABEL = 'seq';

function extractDebugEndpoint(data, id) {
  function port(entry) {
    if (entry && typeof entry === 'object') {
      for (const key of ['http', 'port', 'httpPort', 'debugPort', 'debuggingPort', 'remoteDebuggingPort', 'debuggerAddress']) {
        if (entry[key]) return port(entry[key]);
      }
      return null;
    }
    if (typeof entry !== 'number' && typeof entry !== 'string') return null;
    const text = String(entry);
    if (/^\d+$/.test(text)) return new URL(`http://127.0.0.1:${text}`);
    const url = assertLoopbackUrl(text.includes('://') ? text : `http://${text}`, ['http:', 'https:', 'ws:', 'wss:']);
    url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'https:' : 'http:';
    url.pathname = '/';
    return url;
  }
  function visit(node, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 5) return null;
    if (Object.hasOwn(node, id)) return port(node[id]);
    if (node.id === id || node.browserId === id) return port(node);
    for (const item of Array.isArray(node) ? node : ['data', 'list', 'items', 'ports', 'browsers'].map(k => node[k])) {
      const found = visit(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  return visit(data);
}

function apiClient(options = {}) {
  const base = assertLoopbackUrl(options.apiUrl || DEFAULT_API_URL);
  if (base.pathname !== '/') fail('INVALID_ENDPOINT', 'API must be an origin');
  const request = options.requestJson || makeRequestJson(options);
  return async (route, body) => {
    const res = await request(
      new URL(route, base).href,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      route === '/browser/open' ? { timeoutMs: options.openTimeoutMs || 45000 } : {},
    );
    if (!res || res.success !== true) fail('BITBROWSER_API_ERROR', `Local API failed: ${route}`);
    return res.data;
  };
}

async function resolveProfile(options = {}) {
  const seq = Number(options.windowSeq);
  if (!Number.isSafeInteger(seq) || seq < 1) fail('INVALID_WINDOW', '--window must be a positive sequence');
  const post = apiClient(options);
  let id = options.browserId;
  if (!id) {
    const matches = new Map();
    for (let page = 0; page < 10000; page++) {
      const data = await post('/browser/list', { page, pageSize: 100 });
      const list = Array.isArray(data) ? data : data?.list || data?.items || [];
      for (const row of list) if (Number(row.seq) === seq && row.id) matches.set(row.id, row);
      if (list.length < 100 || (Number.isFinite(Number(data?.total)) && (page + 1) * 100 >= Number(data.total))) break;
      if (page === 9999) fail('LIST_LIMIT', 'Profile listing exceeded pagination limit');
    }
    if (matches.size !== 1) fail('WINDOW_LOOKUP_FAILED', 'Window sequence must resolve to exactly one profile');
    id = matches.keys().next().value;
  }
  const detail = await post('/browser/detail', { id });
  if (!detail || Number(detail.seq) !== seq || (detail.id !== undefined && detail.id !== id)) {
    fail('WINDOW_SEQ_MISMATCH', 'Profile ID and sequence differ');
  }
  return { provider: PROVIDER_NAME, browserId: id, windowSeq: seq };
}

async function resolveBrowserConnection(options = {}) {
  const profile = options.profile || await resolveProfile(options);
  const post = apiClient(options);
  let endpoint = extractDebugEndpoint(await post('/browser/ports', {}), profile.browserId);
  if (options.restart) {
    await post('/browser/close', { id: profile.browserId });
    endpoint = null;
  }
  if (!endpoint) {
    // BitBrowser args are process startup arguments, not a persisted profile update.
    const opened = await post('/browser/open', { id: profile.browserId, args: ['about:blank'] });
    endpoint = extractDebugEndpoint({ [profile.browserId]: opened }, profile.browserId);
    if (!endpoint) endpoint = extractDebugEndpoint(await post('/browser/ports', {}), profile.browserId);
  }
  if (!endpoint) fail('MISSING_WINDOW', 'Profile has no debugging endpoint');
  const request = options.requestJson || makeRequestJson(options);
  const version = await request(new URL('/json/version', endpoint).href);
  const ws = assertLoopbackUrl(version.webSocketDebuggerUrl, ['ws:', 'wss:']);
  if (!ws.pathname.startsWith('/devtools/browser/') || ws.port !== endpoint.port) {
    fail('INVALID_BROWSER_WS', 'Browser endpoint mismatch');
  }
  return { ...profile, provider: PROVIDER_NAME, wsUrl: ws.href, verifiedWindow: true, profileMeta: { browserId: profile.browserId } };
}

async function isProfileOpen(options = {}) {
  const profile = options.profile || await resolveProfile(options);
  const post = apiClient(options);
  const ports = await post('/browser/ports', {});
  return { open: Boolean(extractDebugEndpoint(ports, profile.browserId)), raw: ports, profile };
}

async function closeProfile(options = {}) {
  const profile = options.profile || await resolveProfile(options);
  const post = apiClient(options);
  await post('/browser/close', { id: profile.browserId });
  return { closed: true, profile };
}

module.exports = {
  name: PROVIDER_NAME,
  DEFAULT_API_URL,
  SUPPORTS_BROWSER_ID,
  WINDOW_LABEL,
  ConnectionError,
  isLoopbackHost,
  assertLoopbackUrl,
  makeRequestJson,
  extractDebugEndpoint,
  apiClient,
  resolveProfile,
  resolveBrowserConnection,
  isProfileOpen,
  closeProfile,
};
