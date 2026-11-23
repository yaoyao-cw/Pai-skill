'use strict';
// Direct Chrome / Chromium / VisibleV8 / Brave CDP provider (no fingerprint manager API required).
// Connects via explicit --ws-url or loopback HTTP debugging endpoint (/json/version).
const { ConnectionError, fail, isLoopbackHost, assertLoopbackUrl, makeRequestJson } = require('../loopback.cjs');

const PROVIDER_NAME = 'chrome';
const DEFAULT_PORT = 9222;
const DEFAULT_API_URL = `http://127.0.0.1:${DEFAULT_PORT}`;
const SUPPORTS_BROWSER_ID = false;
const SUPPORTS_WS_URL = true;
const WINDOW_LABEL = 'debug_port';

function inferPort(options = {}) {
  if (options.wsUrl) {
    const ws = assertLoopbackUrl(options.wsUrl, ['ws:', 'wss:']);
    if (ws.port) return Number(ws.port);
  }
  if (options.apiUrl) {
    const api = assertLoopbackUrl(options.apiUrl, ['http:', 'https:']);
    if (api.port) return Number(api.port);
  }
  const n = Number(options.windowSeq);
  if (Number.isSafeInteger(n) && n >= 1 && n <= 65535) return n;
  return DEFAULT_PORT;
}

async function resolveProfile(options = {}) {
  if (options.browserId) fail('UNSUPPORTED_OPTION', '--browser-id is not supported for provider "chrome"');
  if (options.restart) fail('UNSUPPORTED_OPTION', '--restart is not supported for direct provider "chrome" (restart the browser process directly)');
  const port = inferPort(options);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    fail('INVALID_WINDOW', '--window must be a valid TCP port (1-65535) or provide --ws-url / --api-url');
  }
  return { provider: PROVIDER_NAME, debugPort: port, windowSeq: port };
}

async function resolveBrowserConnection(options = {}) {
  const profile = options.profile || await resolveProfile(options);
  const request = options.requestJson || makeRequestJson(options);

  if (options.wsUrl) {
    const ws = assertLoopbackUrl(options.wsUrl, ['ws:', 'wss:']);
    if (!ws.pathname.startsWith('/devtools/browser/')) {
      fail('INVALID_BROWSER_WS', '--ws-url must point to /devtools/browser/...');
    }
    // Verify against /json/version when an HTTP host:port is reachable; if explicit wsUrl matches, return it.
    if (options.verifyVersion !== false) {
      const version = await request(new URL('/json/version', `http://${ws.host}`).href);
      const verified = assertLoopbackUrl(version.webSocketDebuggerUrl, ['ws:', 'wss:']);
      if (verified.href !== ws.href) fail('INVALID_BROWSER_WS', 'Browser endpoint mismatch');
    }
    return {
      ...profile,
      provider: PROVIDER_NAME,
      wsUrl: ws.href,
      verifiedWindow: true,
      profileMeta: { debugPort: profile.debugPort },
    };
  }

  const base = assertLoopbackUrl(options.apiUrl || `http://127.0.0.1:${profile.debugPort}`);
  if (base.pathname !== '/') fail('INVALID_ENDPOINT', 'API must be an origin');
  const version = await request(new URL('/json/version', base).href);
  if (!version?.webSocketDebuggerUrl) fail('MISSING_WINDOW', 'Debugging endpoint did not return webSocketDebuggerUrl');
  const ws = assertLoopbackUrl(version.webSocketDebuggerUrl, ['ws:', 'wss:']);
  if (!ws.pathname.startsWith('/devtools/browser/')) {
    fail('INVALID_BROWSER_WS', 'Browser endpoint mismatch');
  }
  return {
    ...profile,
    provider: PROVIDER_NAME,
    wsUrl: ws.href,
    verifiedWindow: true,
    profileMeta: { debugPort: Number(ws.port) || profile.debugPort, browser: version.Browser || null },
  };
}

async function isProfileOpen(options = {}) {
  const profile = options.profile || await resolveProfile(options);
  const base = assertLoopbackUrl(options.apiUrl || `http://127.0.0.1:${profile.debugPort}`);
  const request = options.requestJson || makeRequestJson({ ...options, timeoutMs: 3000 });
  try {
    const version = await request(new URL('/json/version', base).href);
    return { open: Boolean(version?.webSocketDebuggerUrl), raw: version, profile };
  } catch {
    return { open: false, raw: null, profile };
  }
}

async function closeProfile() {
  fail('UNSUPPORTED_OPTION', 'Direct provider "chrome" does not manage browser process lifecycle');
}

module.exports = {
  name: PROVIDER_NAME,
  DEFAULT_API_URL,
  DEFAULT_PORT,
  SUPPORTS_BROWSER_ID,
  SUPPORTS_WS_URL,
  WINDOW_LABEL,
  ConnectionError,
  isLoopbackHost,
  assertLoopbackUrl,
  makeRequestJson,
  inferPort,
  resolveProfile,
  resolveBrowserConnection,
  isProfileOpen,
  closeProfile,
};
