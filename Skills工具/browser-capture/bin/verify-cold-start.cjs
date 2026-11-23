#!/usr/bin/env node
'use strict';
// Invoke only when verification owns the current profile lifetime (it was initially closed).
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const control = require('../lib/controller.cjs');
const { resolveProfile, resolveBrowserConnection, isProfileOpen, closeProfile } = require('../lib/providers/index.cjs');
const { CdpClient } = require('../lib/cdp-client.cjs');

const args = process.argv.slice(2);
const root = args.shift();
if (!root) throw Error('Evidence directory required');
const cliOptions = require('./capture.cjs').parse(['start', ...args]);
if (cliOptions.help || cliOptions.restart || cliOptions.url) {
  throw Error('Cold verification requires --provider and --window, and accepts no --restart or --url');
}
fs.mkdirSync(root, { recursive: true });

async function main() {
  const profile = await resolveProfile(cliOptions);
  const options = { ...cliOptions, ...profile, outDir: cliOptions.outDir || path.join(root, 'runs') };
  const providerOptions = { ...options, profile };
  assert.equal(control.status(options).active, false, 'An active collector exists for this window');
  const before = await isProfileOpen(providerOptions);
  assert.equal(before.open, false, 'Cold verification requires this profile to be closed before invocation');

  const report = { startedAt: new Date().toISOString(), provider: options.provider, restoresClosedState: true, beforeState: before.raw };
  let client, ownTarget, started = false, seen;
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    if (req.url.startsWith('/seen')) {
      seen = new URL(req.url, 'http://127.0.0.1').searchParams.get('hook');
      res.end('ok');
    } else {
      res.end('<!doctype html><script>const ok=Object.getOwnPropertySymbols(globalThis).some(s=>String(s).startsWith("Symbol(_bc_")&&!!globalThis[s]?.controller?.status?.().installed);fetch("/seen?hook="+ok)</script>');
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  try {
    const start = Date.now();
    const active = await control.start({ ...options, url: 'http://127.0.0.1:' + server.address().port + '/page' });
    started = true;
    ownTarget = active.initialTargetId;
    report.coldStartupElapsedMs = Date.now() - start;
    report.runDir = active.runDir;
    report.collectorArmed = active.collectorArmed;
    const deadline = Date.now() + 10000;
    while (seen === undefined && Date.now() < deadline) await new Promise(r => setTimeout(r, 50));
    report.managedFirstScript = seen === 'true';
    assert.equal(report.managedFirstScript, true);

    const c = await resolveBrowserConnection(providerOptions);
    client = new CdpClient(c.wsUrl);
    await client.connect();
    if (ownTarget) await client.send('Target.closeTarget', { targetId: ownTarget });
    ownTarget = null;
    report.stopResult = (await control.stop(options)).stopResult;
    started = false;
    for (const key of ['streamsClosed', 'dataFlushed', 'cleanupComplete', 'metadataWritten']) {
      assert.equal(report.stopResult[key], true);
    }
    report.passed = true;
  } catch (e) {
    report.passed = false;
    report.error = { message: e.message, code: e.code || null };
    process.exitCode = 1;
  } finally {
    if (client) {
      if (ownTarget) await client.send('Target.closeTarget', { targetId: ownTarget }).catch(() => {});
      client.close();
    }
    if (started || control.status(options).active) report.finalStop = await control.stop(options);
    await closeProfile(providerOptions);
    const after = await isProfileOpen(providerOptions);
    report.finalState = after.raw;
    report.finalProfileClosed = !after.open;
    report.finalCollectorActive = control.status(options).active;
    server.closeAllConnections?.();
    await new Promise(r => server.close(r));
    fs.writeFileSync(path.join(root, 'cold-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
