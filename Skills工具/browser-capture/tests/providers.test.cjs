'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProvider, getProvider, listProviders, resolveProfile, resolveBrowserConnection, isProfileOpen, closeProfile } = require('../lib/providers/index.cjs');
const { assertLoopbackUrl } = require('../lib/loopback.cjs');
const { parse } = require('../bin/capture.cjs');

globalThis.fetch = () => { throw Error('OFFLINE_ONLY'); };
globalThis.WebSocket = class { constructor() { throw Error('OFFLINE_ONLY'); } };

test('provider registry normalizes names and aliases and rejects unknown/missing providers', () => {
  assert.deepEqual(listProviders(), ['bitbrowser', 'adspower', 'chrome']);
  assert.equal(normalizeProvider('bitbrowser'), 'bitbrowser');
  assert.equal(normalizeProvider('BIT'), 'bitbrowser');
  assert.equal(normalizeProvider('bb'), 'bitbrowser');
  assert.equal(normalizeProvider('adspower'), 'adspower');
  assert.equal(normalizeProvider('ADS'), 'adspower');
  assert.equal(normalizeProvider('chrome'), 'chrome');
  assert.equal(normalizeProvider('vv8'), 'chrome');
  assert.equal(normalizeProvider('visiblev8'), 'chrome');
  assert.equal(getProvider('bb').DEFAULT_API_URL, 'http://127.0.0.1:54348');
  assert.equal(getProvider('ads').DEFAULT_API_URL, 'http://127.0.0.1:50325');
  assert.equal(getProvider('chrome').DEFAULT_API_URL, 'http://127.0.0.1:9222');
  assert.throws(() => normalizeProvider(''), { code: 'INVALID_PROVIDER' });
  assert.throws(() => normalizeProvider(undefined), { code: 'INVALID_PROVIDER' });
  assert.throws(() => normalizeProvider('dolphin'), { code: 'INVALID_PROVIDER' });
});

test('adspower active window reuses existing ws without calling start or stop', async () => {
  const seen = [];
  const ws = 'ws://127.0.0.1:31001/devtools/browser/ads-active-1';
  const requestJson = async url => {
    seen.push(url);
    if (url.includes('/api/v1/browser/active?serial_number=12')) {
      return { code: 0, data: { status: 'Active', ws: { puppeteer: ws } } };
    }
    if (url === 'http://127.0.0.1:31001/json/version') {
      return { webSocketDebuggerUrl: ws };
    }
    throw Error('Unexpected route: ' + url);
  };
  const conn = await resolveBrowserConnection({ provider: 'adspower', windowSeq: 12, requestJson });
  assert.equal(conn.provider, 'adspower');
  assert.equal(conn.serialNumber, 12);
  assert.equal(conn.wsUrl, ws);
  assert.deepEqual(conn.profileMeta, { serialNumber: 12 });
  assert.deepEqual(seen, [
    'http://127.0.0.1:50325/api/v1/browser/active?serial_number=12',
    'http://127.0.0.1:31001/json/version',
  ]);
});

test('adspower inactive window cold-starts via /api/v1/browser/start and verifies /json/version', async () => {
  const seen = [];
  const ws = 'ws://127.0.0.1:31002/devtools/browser/ads-cold-1';
  const requestJson = async (url, init, opts) => {
    seen.push([new URL(url).pathname + new URL(url).search, opts?.timeoutMs || null]);
    if (url.includes('/api/v1/browser/active')) return { code: 0, data: { status: 'Inactive' } };
    if (url.includes('/api/v1/browser/start')) return { code: 0, data: { ws: { puppeteer: ws } } };
    if (url === 'http://127.0.0.1:31002/json/version') return { webSocketDebuggerUrl: ws };
    throw Error('Unexpected route: ' + url);
  };
  const conn = await resolveBrowserConnection({ provider: 'adspower', windowSeq: 8, requestJson });
  assert.equal(conn.wsUrl, ws);
  assert.deepEqual(seen, [
    ['/api/v1/browser/active?serial_number=8', null],
    ['/api/v1/browser/start?serial_number=8', 45000],
    ['/json/version', null],
  ]);
});

test('adspower restart stops active profile before starting; skips stop if already inactive', async () => {
  const ws = 'ws://127.0.0.1:31003/devtools/browser/ads-restarted';
  const callsActive = [];
  const requestActive = async url => {
    callsActive.push(new URL(url).pathname);
    if (url.includes('/active')) return { code: 0, data: { status: 'Active', ws: { puppeteer: 'ws://127.0.0.1:31000/devtools/browser/old' } } };
    if (url.includes('/stop')) return { code: 0, data: {} };
    if (url.includes('/start')) return { code: 0, data: { ws: { puppeteer: ws } } };
    if (url.endsWith('/json/version')) return { webSocketDebuggerUrl: ws };
    throw Error('Unexpected: ' + url);
  };
  const conn1 = await resolveBrowserConnection({ provider: 'adspower', windowSeq: 5, restart: true, requestJson: requestActive });
  assert.equal(conn1.wsUrl, ws);
  assert.deepEqual(callsActive, ['/api/v1/browser/active', '/api/v1/browser/stop', '/api/v1/browser/start', '/json/version']);

  const callsInactive = [];
  const requestInactive = async url => {
    callsInactive.push(new URL(url).pathname);
    if (url.includes('/active')) return { code: 0, data: { status: 'Inactive' } };
    if (url.includes('/start')) return { code: 0, data: { ws: { puppeteer: ws } } };
    if (url.endsWith('/json/version')) return { webSocketDebuggerUrl: ws };
    throw Error('Unexpected: ' + url);
  };
  const conn2 = await resolveBrowserConnection({ provider: 'adspower', windowSeq: 5, restart: true, requestJson: requestInactive });
  assert.equal(conn2.wsUrl, ws);
  assert.deepEqual(callsInactive, ['/api/v1/browser/active', '/api/v1/browser/start', '/json/version']);
});

test('adspower rejects mismatched /json/version wsUrl and non-loopback endpoints', async () => {
  const requestJson = async url => {
    if (url.includes('/active')) return { code: 0, data: { status: 'Active', ws: { puppeteer: 'ws://127.0.0.1:31004/devtools/browser/a' } } };
    return { webSocketDebuggerUrl: 'ws://127.0.0.1:31004/devtools/browser/different' };
  };
  await assert.rejects(resolveBrowserConnection({ provider: 'adspower', windowSeq: 9, requestJson }), { code: 'INVALID_BROWSER_WS' });

  const nonLoopback = async () => ({ code: 0, data: { status: 'Active', ws: { puppeteer: 'ws://192.168.1.5:31004/devtools/browser/a' } } });
  await assert.rejects(resolveBrowserConnection({ provider: 'adspower', windowSeq: 9, requestJson: nonLoopback }), { code: 'NON_LOOPBACK_ENDPOINT' });
});

test('adspower isProfileOpen and closeProfile work via provider dispatcher', async () => {
  let state = 'Active';
  const requestJson = async url => {
    if (url.includes('/active')) return { code: 0, data: { status: state } };
    if (url.includes('/stop')) { state = 'Inactive'; return { code: 0, data: {} }; }
    throw Error('Unexpected: ' + url);
  };
  assert.equal((await isProfileOpen({ provider: 'ads', windowSeq: 3, requestJson })).open, true);
  assert.equal((await closeProfile({ provider: 'ads', windowSeq: 3, requestJson })).closed, true);
  assert.equal((await isProfileOpen({ provider: 'ads', windowSeq: 3, requestJson })).open, false);
});

test('CLI and provider reject --browser-id for adspower but accept it for bitbrowser', async () => {
  assert.equal(parse(['start', '--provider', 'bitbrowser', '--window', '10', '--browser-id', 'abc']).browserId, 'abc');
  assert.throws(() => parse(['start', '--provider', 'adspower', '--window', '10', '--browser-id', 'abc']), { code: 'UNSUPPORTED_OPTION' });
  await assert.rejects(resolveProfile({ provider: 'adspower', windowSeq: 10, browserId: 'abc' }), { code: 'UNSUPPORTED_OPTION' });
});

test('loopback guard blocks remote hosts, credentials, fragments, and unexpected queries', () => {
  assert.equal(assertLoopbackUrl('http://127.0.0.1:50325').hostname, '127.0.0.1');
  assert.equal(assertLoopbackUrl('http://127.0.0.1:50325/api?serial_number=1', ['http:'], { allowQuery: true }).search, '?serial_number=1');
  assert.throws(() => assertLoopbackUrl('http://127.0.0.1:50325/api?serial_number=1'), { code: 'NON_LOOPBACK_ENDPOINT' });
  assert.throws(() => assertLoopbackUrl('http://10.0.0.2:50325'), { code: 'NON_LOOPBACK_ENDPOINT' });
  assert.throws(() => assertLoopbackUrl('http://user:pass@127.0.0.1:50325'), { code: 'NON_LOOPBACK_ENDPOINT' });
  assert.throws(() => parse(['start', '-p', 'bb', '--window', '1', '--api-url', 'http://127.0.0.1:54348/subpath']), { code: 'INVALID_ENDPOINT' });
});
