'use strict';
// AdsPower local API profile resolver; no stored account or browser ID.
// Local API differences from BitBrowser:
//  - Default API origin: http://127.0.0.1:50325
//  - Windows are identified by positive integer serial_number
//  - GET /api/v1/browser/active?serial_number=N checks active status + ws.puppeteer
//  - GET /api/v1/browser/start?serial_number=N starts (or returns) profile + ws.puppeteer
//  - GET /api/v1/browser/stop?serial_number=N closes the profile
const { ConnectionError, fail, isLoopbackHost, assertLoopbackUrl, makeRequestJson } = require('../loopback.cjs');

const PROVIDER_NAME = 'adspower';
const DEFAULT_API_URL = 'http://127.0.0.1:50325';
const SUPPORTS_BROWSER_ID = false;
const WINDOW_LABEL = 'serial_number';

function apiClient(options = {}) {
  const base = assertLoopbackUrl(options.apiUrl || DEFAULT_API_URL);
  if (base.pathname !== '/') fail('INVALID_ENDPOINT', 'API must be an origin');
  const request = options.requestJson || makeRequestJson({ ...options, allowQuery: true });
  return async route => {
    const url = new URL(route, base);
    const isStart = url.pathname === '/api/v1/browser/start';
    return request(
      url.href,
      {},
      isStart ? { timeoutMs: options.openTimeoutMs || 45000, allowQuery: true } : { allowQuery: true },
    );
  };
}

async function resolveProfile(options = {}) {
  if (options.browserId) fail('UNSUPPORTED_OPTION', '--browser-id is not supported for provider "adspower"');
  const serial = Number(options.windowSeq);
  if (!Number.isSafeInteger(serial) || serial < 1) fail('INVALID_WINDOW', '--window must be a positive serial_number');
  return { provider: PROVIDER_NAME, serialNumber: serial, windowSeq: serial };
}

async function resolveBrowserConnection(options = {}) {
  const profile = options.profile || await resolveProfile(options);
  const get = apiClient(options);

  // 1) Check whether the window is already active (do not restart an active window unless requested).
  let isActive = false;
  let wsUrl = null;
  try {
    const active = await get(`/api/v1/browser/active?serial_number=${profile.serialNumber}`);
    if (active?.code === 0 && active?.data?.status === 'Active') {
      isActive = true;
      if (active?.data?.ws?.puppeteer) wsUrl = active.data.ws.puppeteer;
    }
  } catch (e) {
    if (e.code === 'LOCAL_HTTP_ERROR') fail('ADSPOWER_API_ERROR', 'AdsPower /api/v1/browser/active unreachable');
    throw e;
  }

  if (options.restart) {
    // Only stop when active; if already inactive, proceed directly to start.
    if (isActive) {
      const stop = await get(`/api/v1/browser/stop?serial_number=${profile.serialNumber}`);
      if (stop?.code !== 0) fail('ADSPOWER_API_ERROR', 'AdsPower /api/v1/browser/stop failed');
    }
    wsUrl = null;
  }

  // 2) Start (or attach) the window: the start response carries data.ws.puppeteer.
  if (!wsUrl) {
    const started = await get(`/api/v1/browser/start?serial_number=${profile.serialNumber}`);
    if (started?.code !== 0 || !started?.data?.ws?.puppeteer) {
      fail('ADSPOWER_API_ERROR', 'AdsPower /api/v1/browser/start failed or missing ws.puppeteer');
    }
    wsUrl = started.data.ws.puppeteer;
  }

  const ws = assertLoopbackUrl(wsUrl, ['ws:', 'wss:']);
  if (!ws.pathname.startsWith('/devtools/browser/')) {
    fail('INVALID_BROWSER_WS', 'Browser endpoint mismatch');
  }
  const versionRequest = options.requestJson || makeRequestJson(options);
  const version = await versionRequest(new URL('/json/version', `http://${ws.host}`).href);
  const verified = assertLoopbackUrl(version.webSocketDebuggerUrl, ['ws:', 'wss:']);
  if (verified.href !== ws.href) {
    fail('INVALID_BROWSER_WS', 'Browser endpoint mismatch');
  }
  return { ...profile, provider: PROVIDER_NAME, wsUrl: ws.href, verifiedWindow: true, profileMeta: { serialNumber: profile.serialNumber } };
}

async function isProfileOpen(options = {}) {
  const profile = options.profile || await resolveProfile(options);
  const get = apiClient(options);
  const active = await get(`/api/v1/browser/active?serial_number=${profile.serialNumber}`);
  if (active?.code !== 0) fail('ADSPOWER_API_ERROR', 'AdsPower /api/v1/browser/active failed');
  return { open: active?.data?.status === 'Active', raw: active, profile };
}

async function closeProfile(options = {}) {
  const profile = options.profile || await resolveProfile(options);
  const get = apiClient(options);
  const stop = await get(`/api/v1/browser/stop?serial_number=${profile.serialNumber}`);
  if (stop?.code !== 0) fail('ADSPOWER_API_ERROR', 'AdsPower /api/v1/browser/stop failed');
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
  apiClient,
  resolveProfile,
  resolveBrowserConnection,
  isProfileOpen,
  closeProfile,
};
