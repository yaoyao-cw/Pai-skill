#!/usr/bin/env node
'use strict';
// Optional live verification: local HTTP only. Never restart a profile or touch its old tabs.
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { parse } = require('./capture.cjs');
const control = require('../lib/controller.cjs');
const { CdpClient } = require('../lib/cdp-client.cjs');
const { resolveBrowserConnection } = require('../lib/providers/index.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main(argv) {
  const options = parse(['start', ...argv]);
  if (options.help || options.restart || options.url) {
    throw Error('Verification requires --provider and --window (optional --browser-id/--api-url/--state-root/--out), without --restart or --url');
  }
  const nonce = randomUUID(); const seen = []; const own = new Set(); let client; let ownCollector = false;
  let originA, originB;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, originA || 'http://127.0.0.1');
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/seen') { seen.push(Object.fromEntries(url.searchParams)); res.end('ok'); return; }
    if (url.pathname === '/worker.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(`fetch(${JSON.stringify(originA + '/seen?kind=worker&nonce=' + nonce)}).then(()=>postMessage('done'))`);
      return;
    }
    if (url.pathname === '/body') { res.end('cross-origin-local-body-' + nonce); return; }
    const kind = url.searchParams.get('kind') || 'managed';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const report = `/seen?nonce=${nonce}&kind=${encodeURIComponent(kind)}&hook=`;
    const extras = kind === 'managed'
      ? `<iframe src="${originB}/page?kind=iframe"></iframe><script>new Worker('/worker.js');fetch(${JSON.stringify(originB + '/body')}).then(r=>r.text()).then(t=>globalThis.crossBody=t)</script>`
      : '';
    res.end(`<!doctype html><script>globalThis.firstHook=Object.getOwnPropertySymbols(globalThis).some(s=>String(s).startsWith('Symbol(_bc_')&&!!globalThis[s]?.controller?.status?.().installed);fetch(${JSON.stringify(report)}+firstHook)</script><title>Local capture verification</title>${extras}`);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  originA = 'http://127.0.0.1:' + server.address().port;
  originB = 'http://localhost:' + server.address().port;

  async function waitSeen(kind) {
    const until = Date.now() + 12000;
    while (Date.now() < until) {
      const hit = seen.find(x => x.nonce === nonce && x.kind === kind);
      if (hit) return hit;
      await sleep(80);
    }
    throw Error('Local browser reachability/capture check timed out: ' + kind + '; verify loopback proxy bypass manually (script did not change it)');
  }

  try {
    const before = control.status(options); ownCollector = !before.active;
    const active = await control.start(options); if (ownCollector && active.initialTargetId) own.add(active.initialTargetId);
    const connection = await resolveBrowserConnection(options);
    client = new CdpClient(connection.wsUrl, { timeoutMs: 5000 }); await client.connect();
    client.on('event', message => {
      const info = message.params?.targetInfo;
      if (info?.type === 'page' && info.url?.startsWith(originA + '/page?') && new URL(info.url).searchParams.get('test') === nonce) {
        own.add(info.targetId);
      }
    });
    await client.send('Target.setDiscoverTargets', { discover: true });
    const managed = await control.newTab({ ...options, url: originA + '/page?kind=managed&test=' + nonce }); own.add(managed.targetId);
    const first = await waitSeen('managed'); if (first.hook !== 'true') throw Error('Managed blank->armed->navigate first-script hook absent');
    const none = await client.send('Target.createTarget', { url: originA + '/page?kind=noopener&test=' + nonce }); own.add(none.targetId);
    const noopener = await waitSeen('noopener');
    const { sessionId } = await client.send('Target.attachToTarget', { targetId: managed.targetId, flatten: true });
    await client.send('Runtime.evaluate', { expression: `window.open(${JSON.stringify(originA + '/page?kind=popup&test=' + nonce)},'_blank');true`, returnByValue: true }, sessionId);
    const popup = await waitSeen('popup'); const iframe = await waitSeen('iframe'); await waitSeen('worker');
    const targets = await client.send('Target.getTargets');
    for (const t of targets.targetInfos || []) if (t.url === originA + '/page?kind=popup&test=' + nonce) own.add(t.targetId);
    await client.send('Page.navigate', { url: originB + '/page?kind=crossnav' }, sessionId);
    const crossnav = await waitSeen('crossnav');
    await client.send('Page.reload', {}, sessionId); await sleep(400);
    const result = {
      provider: options.provider,
      runDir: active.runDir,
      loopbackBrowserReachable: true,
      managedFirstScript: first.hook === 'true',
      automaticNoOpenerFirstScript: noopener.hook === 'true',
      popupFirstScript: popup.hook === 'true',
      crossIframeFirstScript: iframe.hook === 'true',
      workerRequestSeen: true,
      crossNavigationFirstScript: crossnav.hook === 'true',
      status: control.status(options),
      ownTestTargetIds: [...own],
    };
    for (const targetId of own) await client.send('Target.closeTarget', { targetId }); own.clear();
    if (ownCollector) result.stop = await control.stop(options);
    console.log(JSON.stringify(result, null, 2));
    if (!result.automaticNoOpenerFirstScript || !result.popupFirstScript || !result.crossIframeFirstScript || !result.crossNavigationFirstScript) {
      process.exitCode = 1;
    }
  } finally {
    if (client) {
      for (const targetId of own) await client.send('Target.closeTarget', { targetId }).catch(() => {});
      client.close();
    }
    if (ownCollector && control.status(options).active) await control.stop(options);
    await new Promise(r => server.close(r));
  }
}

if (require.main === module) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { main };
