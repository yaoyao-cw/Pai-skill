'use strict';
// End-to-end loopback test spawning real detached bin/worker.cjs for BitBrowser (stealth) & AdsPower (deep) simultaneously.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const control = require('../lib/controller.cjs');

function encodeWsText(text) {
  const payload = Buffer.from(text, 'utf8');
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  if (payload.length < 65536) {
    const hdr = Buffer.alloc(4); hdr[0] = 0x81; hdr[1] = 126; hdr.writeUInt16BE(payload.length, 2);
    return Buffer.concat([hdr, payload]);
  }
  const hdr = Buffer.alloc(10); hdr[0] = 0x81; hdr[1] = 127; hdr.writeBigUInt64BE(BigInt(payload.length), 2);
  return Buffer.concat([hdr, payload]);
}

function createMockCdpServer(browserPath) {
  const sockets = new Set();
  const seenMethods = [];
  let counter = 0;
  const server = http.createServer((req, res) => {
    if (req.url === '/json/version') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ webSocketDebuggerUrl: `ws://127.0.0.1:${server.address().port}${browserPath}` }));
      return;
    }
    res.statusCode = 404; res.end();
  });

  server.on('upgrade', (req, socket) => {
    if (req.url !== browserPath) { socket.destroy(); return; }
    const key = req.headers['sec-websocket-key'];
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));

    let buf = Buffer.alloc(0);
    const sendJson = obj => { if (!socket.destroyed) socket.write(encodeWsText(JSON.stringify(obj))); };

    socket.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 2) {
        const opcode = buf[0] & 0x0f;
        const masked = (buf[1] & 0x80) !== 0;
        let len = buf[1] & 0x7f;
        let offset = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); offset = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); offset = 10; }
        const maskLen = masked ? 4 : 0;
        if (buf.length < offset + maskLen + len) return;
        const mask = masked ? buf.subarray(offset, offset + 4) : null;
        const raw = Buffer.from(buf.subarray(offset + maskLen, offset + maskLen + len));
        buf = buf.subarray(offset + maskLen + len);
        if (mask) for (let i = 0; i < raw.length; i++) raw[i] ^= mask[i & 3];
        if (opcode === 0x8) { socket.end(); return; }
        if (opcode !== 0x1) continue;

        const msg = JSON.parse(raw.toString('utf8'));
        seenMethods.push(msg.method);
        let result = {};
        if (msg.method === 'Target.getTargets') result = { targetInfos: [] };
        else if (msg.method === 'Target.createTarget') {
          const targetId = 'mock-t-' + ++counter;
          const sessionId = 'mock-s-' + targetId;
          sendJson({
            method: 'Target.attachedToTarget',
            params: { sessionId, targetInfo: { targetId, type: 'page', url: msg.params.url }, waitingForDebugger: true },
          });
          result = { targetId };
        } else if (msg.method === 'Page.addScriptToEvaluateOnNewDocument') {
          result = { identifier: 'script-' + (msg.sessionId || 'root') };
        } else if (msg.method === 'Runtime.evaluate') {
          result = { result: { value: msg.params.awaitPromise ? { deactivated: true, restored: {} } : { installed: true, ready: true } } };
        } else if (msg.method === 'Memory.getDOMCounters') {
          result = { documents: 1, nodes: 55, jsEventListeners: 4 };
        } else if (msg.method === 'Performance.getMetrics') {
          result = { metrics: [{ name: 'JSHeapUsedSize', value: 2048000 }] };
        } else if (msg.method === 'HeapProfiler.stopSampling') {
          result = { profile: { head: { callFrame: { functionName: '(root)' }, children: [] }, samples: [{ size: 512, nodeId: 1 }] } };
        } else if (msg.method === 'HeapProfiler.takeHeapSnapshot') {
          sendJson({ method: 'HeapProfiler.addHeapSnapshotChunk', sessionId: msg.sessionId, params: { chunk: '{"snapshot":{},"nodes":[9]}' } });
        }
        sendJson({ id: msg.id, result });
      }
    });
  });

  return {
    server,
    seenMethods,
    async listen() { await new Promise(r => server.listen(0, '127.0.0.1', r)); return server.address().port; },
    async close() {
      for (const s of sockets) s.destroy();
      server.closeAllConnections?.();
      await new Promise(r => server.close(r));
    },
  };
}

test('detached worker E2E runs bitbrowser (stealth) and adspower (deep) simultaneously on the same window number with metrics & snapshots', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-capture-e2e-'));
  const bbCdp = createMockCdpServer('/devtools/browser/bb-mock');
  const adsCdp = createMockCdpServer('/devtools/browser/ads-mock');
  const bbCdpPort = await bbCdp.listen();
  const adsCdpPort = await adsCdp.listen();

  let bbOpen = false;
  const bbApi = http.createServer((req, res) => {
    req.resume(); res.setHeader('Content-Type', 'application/json');
    if (req.url === '/browser/list') return res.end(JSON.stringify({ success: true, data: { list: [{ id: 'bb-profile-77', seq: 77 }], total: 1 } }));
    if (req.url === '/browser/detail') return res.end(JSON.stringify({ success: true, data: { id: 'bb-profile-77', seq: 77 } }));
    if (req.url === '/browser/ports') return res.end(JSON.stringify({ success: true, data: bbOpen ? { 'bb-profile-77': bbCdpPort } : {} }));
    if (req.url === '/browser/open') { bbOpen = true; return res.end(JSON.stringify({ success: true, data: { http: `127.0.0.1:${bbCdpPort}` } })); }
    res.statusCode = 404; res.end();
  });
  await new Promise(r => bbApi.listen(0, '127.0.0.1', r));

  let adsActive = false;
  const adsApi = http.createServer((req, res) => {
    req.resume(); res.setHeader('Content-Type', 'application/json');
    const ws = `ws://127.0.0.1:${adsCdpPort}/devtools/browser/ads-mock`;
    if (req.url === '/api/v1/browser/active?serial_number=77') {
      return res.end(JSON.stringify({ code: 0, data: adsActive ? { status: 'Active', ws: { puppeteer: ws } } : { status: 'Inactive' } }));
    }
    if (req.url === '/api/v1/browser/start?serial_number=77') {
      adsActive = true;
      return res.end(JSON.stringify({ code: 0, data: { ws: { puppeteer: ws } } }));
    }
    res.statusCode = 404; res.end();
  });
  await new Promise(r => adsApi.listen(0, '127.0.0.1', r));

  const bbOpts = { provider: 'bitbrowser', windowSeq: 77, stateRoot: root, apiUrl: `http://127.0.0.1:${bbApi.address().port}` };
  const adsOpts = { provider: 'adspower', windowSeq: 77, stateRoot: root, apiUrl: `http://127.0.0.1:${adsApi.address().port}` };

  t.after(async () => {
    if (control.status(bbOpts).active) await control.stop(bbOpts).catch(() => {});
    if (control.status(adsOpts).active) await control.stop(adsOpts).catch(() => {});
    bbApi.closeAllConnections?.(); adsApi.closeAllConnections?.();
    await new Promise(r => bbApi.close(r));
    await new Promise(r => adsApi.close(r));
    await bbCdp.close(); await adsCdp.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const [bbStart, adsStart] = await Promise.all([
    control.start({ ...bbOpts, mode: 'stealth', url: 'https://bb.example/' }),
    control.start({ ...adsOpts, mode: 'deep', url: 'https://ads.example/' }),
  ]);

  assert.equal(bbStart.active, true);
  assert.equal(bbStart.mode, 'stealth');
  assert.equal(bbStart.browserId, 'bb-profile-77');
  assert.equal(bbCdp.seenMethods.includes('Runtime.enable'), false, 'stealth worker must NEVER send Runtime.enable');
  assert.equal(bbCdp.seenMethods.includes('Debugger.enable'), false, 'stealth worker must NEVER send Debugger.enable');

  assert.equal(adsStart.active, true);
  assert.equal(adsStart.mode, 'deep');
  assert.equal(adsStart.serialNumber, 77);
  assert.equal(adsCdp.seenMethods.includes('Debugger.enable'), true);
  assert.equal(adsCdp.seenMethods.includes('Debugger.setSkipAllPauses'), true);
  assert.notEqual(bbStart.runDir, adsStart.runDir);

  // Worker RPC: new-tab, metrics (works in stealth), memory-sample & heap-snapshot (work in deep, guarded in stealth)
  const [bbTab, adsTab] = await Promise.all([
    control.newTab({ ...bbOpts, url: 'https://bb-next.example/' }),
    control.newTab({ ...adsOpts, url: 'https://ads-next.example/' }),
  ]);
  assert.equal(bbTab.mode, 'stealth');
  assert.equal(adsTab.mode, 'deep');

  const bbMetrics = await control.metrics(bbOpts);
  assert.equal(bbMetrics.targets[0].performance.JSHeapUsedSize, 2048000);
  await assert.rejects(control.heapSnapshot(bbOpts), { code: 'MODE_GUARD' });

  const adsSample = await control.memorySample({ ...adsOpts, durationMs: 120 });
  assert.equal(adsSample.sampleCount, 1);
  assert.equal(fs.existsSync(adsSample.file), true);

  const adsSnap = await control.heapSnapshot(adsOpts);
  assert.equal(fs.existsSync(adsSnap.file), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(adsSnap.file, 'utf8')).nodes, [9]);

  const [bbStop, adsStop] = await Promise.all([control.stop(bbOpts), control.stop(adsOpts)]);
  for (const [stopped, expectedMode] of [[bbStop, 'stealth'], [adsStop, 'deep']]) {
    assert.equal(stopped.active, false);
    assert.equal(stopped.mode, expectedMode);
    assert.equal(stopped.phase, 'stopped');
    assert.equal(stopped.stopResult.streamsClosed, true);
    assert.equal(stopped.stopResult.dataFlushed, true);
    assert.equal(stopped.stopResult.cleanupComplete, true);
    assert.equal(stopped.stopResult.metadataWritten, true);
    assert.equal(stopped.stopResult.captureStatus, 'complete');
    const summary = JSON.parse(fs.readFileSync(path.join(stopped.runDir, 'summary.json'), 'utf8'));
    assert.equal(summary.provider, stopped.provider);
    assert.equal(summary.mode, expectedMode);
  }
});

test('detached worker E2E connects directly via provider chrome (--ws-url) in stealth mode, then runs correlate & export-har', async t => {
  const { correlateRun } = require('../lib/correlate.cjs');
  const { exportHar } = require('../lib/har-exporter.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-capture-chrome-e2e-'));
  const cdp = createMockCdpServer('/devtools/browser/vv8-direct');
  const port = await cdp.listen();
  const wsUrl = `ws://127.0.0.1:${port}/devtools/browser/vv8-direct`;
  const opts = { provider: 'chrome', windowSeq: port, wsUrl, stateRoot: root, mode: 'stealth' };

  t.after(async () => {
    if (control.status(opts).active) await control.stop(opts).catch(() => {});
    await cdp.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const started = await control.start({ ...opts, url: 'https://vv8.example/' });
  assert.equal(started.active, true);
  assert.equal(started.provider, 'chrome');
  assert.equal(started.mode, 'stealth');
  assert.equal(started.debugPort, port);
  assert.equal(cdp.seenMethods.includes('Runtime.enable'), false);

  const stopped = await control.stop(opts);
  assert.equal(stopped.stopResult.streamsClosed, true);
  assert.equal(stopped.stopResult.dataFlushed, true);
  assert.equal(stopped.stopResult.cleanupComplete, true);

  const summary = JSON.parse(fs.readFileSync(path.join(stopped.runDir, 'summary.json'), 'utf8'));
  assert.equal(summary.wsUrl, undefined, 'wsUrl must be dropped from public summary.json');

  const corr = correlateRun(stopped.runDir);
  assert.equal(fs.existsSync(corr.files.timeline), true);
  const har = exportHar(stopped.runDir);
  assert.equal(fs.existsSync(har.harFile), true);
});
