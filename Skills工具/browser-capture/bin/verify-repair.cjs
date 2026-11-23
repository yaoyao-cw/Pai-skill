#!/usr/bin/env node
'use strict';
// Local-only regression for any supported provider. Never navigates/reloads/closes a target it did not create.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { CdpClient } = require('../lib/cdp-client.cjs');
const { Collector } = require('../lib/collector.cjs');
const { resolveBrowserConnection } = require('../lib/providers/index.cjs');
const control = require('../lib/controller.cjs');

const args = process.argv.slice(2);
const root = args.shift();
if (!root) throw Error('Evidence output directory required');
const cliOptions = require('./capture.cjs').parse(['start', ...args]);
if (cliOptions.help || cliOptions.restart || cliOptions.url) {
  throw Error('Verification requires --provider and --window, and accepts no --restart or --url');
}
fs.mkdirSync(root, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, why) {
  const end = Date.now() + 20000;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(60);
  }
  throw Error('Timed out: ' + why);
}
const readLines = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];

async function main() {
  const options = { ...cliOptions, outDir: cliOptions.outDir || path.join(root, 'worker-runs') };
  assert.equal(control.status(options).active, false, 'An existing collector must be preserved; abort verification');
  let client, collector, worker = false;
  const own = new Set(), hits = [];
  const report = { at: new Date().toISOString(), provider: options.provider, localOnly: true };
  let originA, originB;

  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Access-Control-Allow-Origin', '*');
    const u = new URL(req.url, originA || 'http://127.0.0.1');
    if (u.pathname === '/event') {
      req.resume(); res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('repair-body-' + u.searchParams.get('kind')); return;
    }
    if (u.pathname === '/first') { hits.push(Object.fromEntries(u.searchParams)); res.end('ok'); return; }
    if (u.pathname === '/worker.js') {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(`fetch('/event?kind=worker').then(()=>postMessage('done'))`); return;
    }
    const kind = u.searchParams.get('kind') || 'page';
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><script>globalThis.firstHook=Object.getOwnPropertySymbols(globalThis).some(s=>String(s).startsWith('Symbol(_bc_')&&!!globalThis[s]?.controller?.status?.().installed);globalThis.fire=()=>{fetch('/event?kind=${kind}-fetch',{method:'POST',body:'fetch-'+${JSON.stringify(kind)}});const x=new XMLHttpRequest();x.open('POST','/event?kind=${kind}-xhr');x.send('xhr-'+${JSON.stringify(kind)});navigator.sendBeacon('/event?kind=${kind}-beacon','beacon-'+${JSON.stringify(kind)});return true};fetch('/first?kind=${kind}&hook='+firstHook);fire()</script><title>Local repair verification</title>${kind === 'managed' ? `<iframe src="${originB}/page?kind=iframe"></iframe><script>new Worker('/worker.js')</script>` : ''}`);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  originA = 'http://127.0.0.1:' + server.address().port;
  originB = 'http://localhost:' + server.address().port;

  async function attach(targetId) {
    assert.ok(own.has(targetId));
    return (await client.send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
  }
  async function evalOwn(targetId, expression) {
    const sid = await attach(targetId);
    try { return await client.send('Runtime.evaluate', { expression, returnByValue: true }, sid); }
    finally { await client.send('Target.detachFromTarget', { sessionId: sid }).catch(() => {}); }
  }
  async function first(kind) { return until(() => hits.find(h => h.kind === kind), 'first script ' + kind); }
  async function covered(runDir, targetId, kind) {
    return until(() => {
      const records = readLines(path.join(runDir, 'hook-events.jsonl')).filter(r => r.targetId === targetId);
      const ready = records.filter(r => r.phase === 'hook_ready').at(-1);
      if (!ready) return null;
      const doc = records.filter(r => r.documentId === ready.documentId);
      const starts = doc.filter(r => r.phase === 'start');
      const transports = ['fetch', 'xhr', 'beacon'];
      if (!transports.every(t => starts.some(r => r.transport === t && r.request.url.includes('/event?kind=' + kind + '-' + t)))) return null;
      if (!['fetch', 'xhr'].every(t => doc.some(r => r.transport === t && r.phase === 'response_body' && r.response?.body?.data?.includes('repair-body-' + kind + '-' + t)))) return null;
      if (!transports.every(t => doc.some(r => r.transport === t && r.phase === 'request_body' && r.request?.body?.data === t + '-' + kind))) return null;
      return { targetId, documentId: ready.documentId, transports, requestBodies: true, responseBodies: ['fetch', 'xhr'], businessStarts: starts.length };
    }, 'actual business hook ' + kind);
  }

  try {
    const connection = await resolveBrowserConnection(options);
    client = new CdpClient(connection.wsUrl, { timeoutMs: 5000 });
    await client.connect();
    const created = await client.send('Target.createTarget', { url: originA + '/page?kind=existing' });
    own.add(created.targetId);
    await first('existing');

    const actualSend = client.send.bind(client);
    let networkFault = false, runtimeFault = false;
    const targetSessions = new Set();
    const observe = m => { if (m.method === 'Target.attachedToTarget' && m.params.targetInfo?.targetId === created.targetId) targetSessions.add(m.params.sessionId); };
    client.on('event', observe);
    client.send = async (m, p, sid) => {
      if (targetSessions.has(sid) && m === 'Network.enable' && !networkFault) {
        networkFault = true; await actualSend(m, p, sid);
        throw Object.assign(Error('Injected lost reply after actual Network.enable'), { code: 'CDP_TIMEOUT', method: m, sessionId: sid, timeoutMs: 5000 });
      }
      if (targetSessions.has(sid) && m === 'Runtime.enable' && !runtimeFault) {
        runtimeFault = true;
        throw Object.assign(Error('Injected transient Runtime.enable reply timeout'), { code: 'CDP_TIMEOUT', method: m, sessionId: sid, timeoutMs: 5000 });
      }
      return actualSend(m, p, sid);
    };
    const faultDir = path.join(root, 'real-existing-recovery');
    collector = new Collector({ client, outDir: faultDir, runId: 'repair-existing-' + Date.now() });
    await collector.start();
    assert.ok(networkFault && runtimeFault);
    assert.equal(collector.targets.get(created.targetId).hookRegistered, true);
    await actualSend('Runtime.evaluate', { expression: 'fire()', returnByValue: true }, collector.targets.get(created.targetId).id);
    report.existingPageRecovery = await covered(faultDir, created.targetId, 'existing');
    report.existingPageRecovery.injectedFaults = ['Network.enable-lost-reply', 'Runtime.enable-timeout'];
    report.existingPageRecovery.actualHistoricalFailureReproduced = false;
    report.directCollectorStop = await collector.stop('local-verification');
    collector = null; client.send = actualSend; client.off('event', observe);

    const active = await control.start(options); worker = true; report.workerRunDir = active.runDir;
    if (active.initialTargetId) own.add(active.initialTargetId);
    await evalOwn(created.targetId, 'fire()');
    report.workerExisting = await covered(active.runDir, created.targetId, 'existing');

    const managed = await control.newTab({ ...options, url: originA + '/page?kind=managed' });
    own.add(managed.targetId);
    report.managedFirstScript = (await first('managed')).hook === 'true';
    assert.equal(report.managedFirstScript, true);
    report.managed = await covered(active.runDir, managed.targetId, 'managed');

    const noopener = await client.send('Target.createTarget', { url: originA + '/page?kind=noopener' });
    own.add(noopener.targetId);
    report.noOpenerFirstScript = (await first('noopener')).hook === 'true';
    await until(() => control.status(options).targets?.some(t => t.targetId === noopener.targetId && t.documentHookObserved), 'noopener installed');
    await evalOwn(noopener.targetId, 'fire()');
    report.noOpener = await covered(active.runDir, noopener.targetId, 'noopener');

    await evalOwn(managed.targetId, `window.open(${JSON.stringify(originA + '/page?kind=popup')},'_blank');true`);
    report.popupFirstScript = (await first('popup')).hook === 'true';
    const popup = await until(async () => {
      const r = await client.send('Target.getTargets');
      return r.targetInfos.find(t => t.url === originA + '/page?kind=popup');
    }, 'popup target');
    own.add(popup.targetId);
    await until(() => control.status(options).targets?.some(t => t.targetId === popup.targetId && t.documentHookObserved), 'popup installed');
    await evalOwn(popup.targetId, 'fire()');
    report.popup = await covered(active.runDir, popup.targetId, 'popup');

    const before = report.managed.documentId;
    const sid = await attach(managed.targetId);
    try {
      await client.send('Page.reload', {}, sid);
      await until(() => {
        const t = control.status(options).targets?.find(x => x.targetId === managed.targetId);
        return t?.documentId && t.documentId !== before;
      }, 'new document after refresh');
      report.refresh = await covered(active.runDir, managed.targetId, 'managed');
      assert.notEqual(report.refresh.documentId, before);
      await client.send('Page.navigate', { url: originB + '/page?kind=crossnav' }, sid);
      report.crossNavigationFirstScript = (await first('crossnav')).hook === 'true';
      assert.equal(report.crossNavigationFirstScript, true);
      report.crossNavigation = await covered(active.runDir, managed.targetId, 'crossnav');
    } finally {
      await client.send('Target.detachFromTarget', { sessionId: sid }).catch(() => {});
    }

    report.iframeFirstScript = (await first('iframe')).hook === 'true';
    assert.equal(report.iframeFirstScript, true);
    const records = readLines(path.join(active.runDir, 'hook-events.jsonl'));
    const iframeStart = records.find(r => r.phase === 'start' && r.request?.url.includes('kind=iframe-fetch'));
    assert.ok(iframeStart);
    report.iframe = await covered(active.runDir, iframeStart.targetId, 'iframe');
    const cov = readLines(path.join(active.runDir, 'coverage.jsonl'));
    assert.ok(cov.some(r => r.kind === 'CDP-only' && r.reason === 'worker-no-document'));
    assert.ok(readLines(path.join(active.runDir, 'raw.jsonl')).some(r => JSON.stringify(r).includes('kind=worker')));
    report.workerCDPOnly = true;

    report.status = control.status(options);
    for (const id of own) await client.send('Target.closeTarget', { targetId: id }).catch(() => {});
    own.clear();
    const stopped = await control.stop(options); worker = false;
    report.stopResult = stopped.stopResult;
    assert.equal(report.stopResult.streamsClosed, true);
    assert.equal(report.stopResult.dataFlushed, true);
    assert.equal(report.stopResult.cleanupComplete, true);
    assert.equal(report.stopResult.metadataWritten, true);
    assert.ok(['complete', 'incomplete'].includes(report.stopResult.captureStatus));
    report.passed = true;
  } catch (e) {
    report.passed = false;
    report.error = { message: e.message, code: e.code || null };
    process.exitCode = 1;
  } finally {
    if (collector) report.emergencyCollectorStop = await collector.stop('verification-finally');
    if (client) {
      for (const id of own) await client.send('Target.closeTarget', { targetId: id }).catch(() => {});
      client.close();
    }
    if (worker) report.emergencyWorkerStop = await control.stop(options);
    server.closeAllConnections?.();
    await new Promise(r => server.close(r));
    report.finalCollectorActive = control.status(options).active;
    fs.writeFileSync(path.join(root, 'live-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
