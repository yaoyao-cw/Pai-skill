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

function createSnippetReader(runDir) {
  const fileLines = new Map();
  return function readSnippet(relFile, line0, col0 = 0) {
    if (!relFile || !Number.isInteger(line0) || line0 < 0) return null;
    let lines = fileLines.get(relFile);
    if (lines === undefined) {
      const abs = path.join(runDir, relFile);
      if (!fs.existsSync(abs)) { fileLines.set(relFile, null); return null; }
      try { lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/); }
      catch { lines = null; }
      fileLines.set(relFile, lines);
    }
    if (!lines || line0 >= lines.length) return null;
    const rawLine = lines[line0] || '';
    if (rawLine.length <= 240) return rawLine.trim();
    // Minified/obfuscated single-line JS: slice around column so the snippet is immediately readable.
    const col = Number.isInteger(col0) && col0 >= 0 ? Math.min(col0, rawLine.length) : 0;
    const start = Math.max(0, col - 80);
    const end = Math.min(rawLine.length, col + 160);
    return (start > 0 ? '…' : '') + rawLine.slice(start, end) + (end < rawLine.length ? '…' : '');
  };
}

function buildScriptIndex(runDir) {
  const rows = readJsonl(path.join(runDir, 'scripts.jsonl'));
  const bySessionScript = new Map();
  const byUrl = new Map();
  const parsedIds = new Set();
  const dynamicIds = new Set();
  const uniqueSources = new Set();

  for (const row of rows) {
    const key = `${row.sessionId || ''}|${row.scriptId}`;
    if (row.kind === 'script-parsed') {
      parsedIds.add(key);
      if (row.isDynamic) dynamicIds.add(key);
      if (!bySessionScript.has(key)) {
        bySessionScript.set(key, {
          scriptId: row.scriptId,
          url: row.url || null,
          isDynamic: !!row.isDynamic,
          sourceFile: null,
          sha256: null,
        });
      }
    } else if (row.kind === 'script-source') {
      parsedIds.add(key);
      if (row.isDynamic) dynamicIds.add(key);
      const entry = {
        scriptId: row.scriptId,
        url: row.url || null,
        isDynamic: !!row.isDynamic,
        sourceFile: row.sourceFile || null,
        sha256: row.sha256 || null,
      };
      bySessionScript.set(key, entry);
      if (entry.url && entry.sourceFile) byUrl.set(entry.url, entry);
      if (entry.sourceFile) uniqueSources.add(entry.sourceFile);
    }
  }
  return { bySessionScript, byUrl, parsedCount: parsedIds.size, dynamicCount: dynamicIds.size, uniqueSourceCount: uniqueSources.size };
}

function resolveCdpStack(stack, sessionId, index, readSnippet) {
  if (!stack) return [];
  const frames = [];
  let current = stack;
  let depth = 0;
  while (current && depth < 40) {
    const asyncDescription = depth === 0 ? null : (current.description || 'async');
    for (const f of current.callFrames || []) {
      const matched = index.bySessionScript.get(`${sessionId || ''}|${f.scriptId}`)
        || (f.url ? index.byUrl.get(f.url) : null)
        || null;
      const lineNumber = Number.isInteger(f.lineNumber) ? f.lineNumber : null;
      const columnNumber = Number.isInteger(f.columnNumber) ? f.columnNumber : null;
      frames.push({
        asyncDepth: depth,
        asyncDescription,
        functionName: f.functionName || '(anonymous)',
        scriptId: f.scriptId || null,
        url: f.url || matched?.url || null,
        lineNumber: lineNumber !== null ? lineNumber + 1 : null,
        columnNumber: columnNumber !== null ? columnNumber + 1 : null,
        sourceFile: matched?.sourceFile || null,
        isDynamic: matched?.isDynamic ?? (!f.url),
        snippet: matched?.sourceFile && lineNumber !== null ? readSnippet(matched.sourceFile, lineNumber, columnNumber ?? 0) : null,
      });
    }
    current = current.parent || null;
    depth++;
  }
  return frames;
}

function resolveJsStackLines(lines, index, readSnippet) {
  if (!Array.isArray(lines)) return [];
  const frames = [];
  for (const raw of lines) {
    const text = String(raw || '').trim();
    // Matches "at fn (https://host/a.js:10:20)" or "at https://host/a.js:10:20"
    const m = text.match(/^at\s+(?:([^\s(]+)\s+\()?(https?:\/\/[^\s)]+|blob:[^\s)]+|file:\/\/[^\s)]+):(\d+):(\d+)\)?$/);
    if (!m) {
      frames.push({ raw: text, functionName: null, url: null, lineNumber: null, columnNumber: null, sourceFile: null, snippet: null });
      continue;
    }
    const [, fn, url, lineStr, colStr] = m;
    const line1 = Number(lineStr);
    const col1 = Number(colStr);
    const matched = index.byUrl.get(url) || null;
    frames.push({
      functionName: fn || '(anonymous)',
      url,
      lineNumber: line1,
      columnNumber: col1,
      sourceFile: matched?.sourceFile || null,
      isDynamic: matched?.isDynamic ?? false,
      snippet: matched?.sourceFile ? readSnippet(matched.sourceFile, line1 - 1, col1 - 1) : null,
    });
  }
  return frames;
}

function correlateRun(runDir) {
  const absRun = path.resolve(runDir);
  if (!fs.existsSync(absRun)) {
    throw Object.assign(Error(`Run directory not found: ${absRun}`), { code: 'RUN_DIR_NOT_FOUND' });
  }
  const index = buildScriptIndex(absRun);
  const readSnippet = createSnippetReader(absRun);
  const records = readJsonl(path.join(absRun, 'records.jsonl'));
  const hooks = readJsonl(path.join(absRun, 'hook-events.jsonl'));
  const storage = readJsonl(path.join(absRun, 'storage-events.jsonl'));
  const runtime = readJsonl(path.join(absRun, 'runtime-events.jsonl'));

  const timeline = [];
  const hosts = new Set();
  const callSites = new Map();
  const stats = {
    requests: 0,
    wsFrames: 0,
    sseMessages: 0,
    hookEvents: 0,
    wasmModules: 0,
    cryptoCalls: 0,
    cookieWrites: 0,
    domNodesAdded: 0,
    storageEvents: storage.length,
    runtimeConsole: 0,
    runtimeExceptions: 0,
    scriptsParsed: index.parsedCount,
    dynamicScripts: index.dynamicCount,
    uniqueScriptFiles: index.uniqueSourceCount,
  };

  const trackCallSite = (frame, url) => {
    if (!frame || (!frame.sourceFile && !frame.url)) return;
    const loc = `${frame.sourceFile || frame.url}:${frame.lineNumber || 0}:${frame.columnNumber || 0}`;
    const cur = callSites.get(loc) || { location: loc, functionName: frame.functionName, sourceFile: frame.sourceFile, url: frame.url, snippet: frame.snippet, count: 0, sampleUrls: [] };
    cur.count++;
    if (url && cur.sampleUrls.length < 5 && !cur.sampleUrls.includes(url)) cur.sampleUrls.push(url);
    callSites.set(loc, cur);
  };

  for (const r of records) {
    if (r.kind === 'request') {
      stats.requests++;
      const url = r.request?.url || null;
      try { if (url) hosts.add(new URL(url).host); } catch {}
      const resolvedStack = resolveCdpStack(r.initiator?.stack, r.sessionId, index, readSnippet);
      if (resolvedStack.length) trackCallSite(resolvedStack[0], url);
      timeline.push({
        at: r.receivedAt,
        source: 'cdp-network',
        kind: 'request',
        hopId: r.hopId,
        targetId: r.targetId,
        method: r.request?.method || null,
        url,
        resourceType: r.resourceType || null,
        initiatorType: r.initiator?.type || null,
        resolvedStack,
      });
    } else if (r.kind === 'ws-created' || r.kind === 'ws-frame-sent' || r.kind === 'ws-frame-received' || r.kind === 'ws-closed') {
      if (r.kind === 'ws-frame-sent' || r.kind === 'ws-frame-received') stats.wsFrames++;
      const resolvedStack = r.kind === 'ws-created' ? resolveCdpStack(r.initiator?.stack, r.sessionId, index, readSnippet) : [];
      timeline.push({
        at: r.receivedAt,
        source: 'cdp-network',
        kind: r.kind,
        targetId: r.targetId,
        requestId: r.requestId,
        url: r.url || null,
        opcode: r.opcode ?? null,
        bytes: r.originalBytes ?? null,
        payloadPreview: typeof r.payloadData === 'string' ? r.payloadData.slice(0, 512) : null,
        ...(resolvedStack.length ? { resolvedStack } : {}),
      });
    } else if (r.kind === 'sse-message') {
      stats.sseMessages++;
      timeline.push({
        at: r.receivedAt,
        source: 'cdp-network',
        kind: 'sse-message',
        targetId: r.targetId,
        requestId: r.requestId,
        eventName: r.eventName,
        dataPreview: typeof r.data === 'string' ? r.data.slice(0, 512) : null,
      });
    }
  }

  for (const h of hooks) {
    if (h.phase === 'hook_ready' || h.phase === 'hook_uninstalled') continue;
    stats.hookEvents++;
    if (h.phase === 'wasm_module') stats.wasmModules++;
    if (h.phase === 'crypto_subtle') stats.cryptoCalls++;
    if (h.phase === 'cookie_set') stats.cookieWrites++;
    if (h.phase === 'dom_node_added') stats.domNodesAdded++;
    const resolvedStack = resolveJsStackLines(h.callStack, index, readSnippet);
    if (resolvedStack.length) trackCallSite(resolvedStack[0], h.request?.url || h.url || h.phase);
    const at = h.recordedAt?.wallTimeMs ? new Date(h.recordedAt.wallTimeMs).toISOString()
      : h.hostReceivedAt ? new Date(h.hostReceivedAt).toISOString() : null;
    timeline.push({
      at,
      source: 'page-hook',
      kind: h.phase,
      transport: h.transport || null,
      targetId: h.targetId || null,
      url: h.request?.url || h.url || null,
      method: h.request?.method || h.method || null,
      algorithm: h.algorithm || null,
      wasmFile: h.wasmFile || null,
      exportNames: h.exportNames || null,
      ...(resolvedStack.length ? { resolvedStack } : {}),
    });
  }

  for (const st of storage) {
    timeline.push({
      at: st.at,
      source: 'cdp-storage',
      kind: st.event,
      targetId: st.targetId,
      params: st.params,
    });
  }

  for (const rt of runtime) {
    if (rt.event === 'Runtime.consoleAPICalled' || rt.event === 'runtime_console') stats.runtimeConsole++;
    if (rt.event === 'Runtime.exceptionThrown' || rt.event === 'runtime_exception' || rt.event === 'runtime_rejection') stats.runtimeExceptions++;
    const cdpStack = rt.params?.stackTrace || rt.params?.exceptionDetails?.stackTrace || null;
    const resolvedStack = cdpStack
      ? resolveCdpStack(cdpStack, rt.sessionId, index, readSnippet)
      : resolveJsStackLines(rt.errorStack || rt.callStack, index, readSnippet);
    timeline.push({
      at: rt.at,
      source: rt.event?.startsWith('Runtime.') ? 'cdp-runtime' : 'safe-runtime-hook',
      kind: rt.event,
      targetId: rt.targetId,
      level: rt.level || rt.params?.type || null,
      text: rt.message || rt.params?.exceptionDetails?.text || rt.params?.type || null,
      ...(rt.args ? { args: rt.args } : {}),
      ...(rt.reason !== undefined ? { reason: rt.reason } : {}),
      ...(resolvedStack.length ? { resolvedStack } : {}),
    });
  }

  timeline.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));

  const analysisDir = path.join(absRun, 'analysis');
  fs.mkdirSync(analysisDir, { recursive: true });
  const timelineFile = path.join(analysisDir, 'correlated-timeline.jsonl');
  const indexFile = path.join(analysisDir, 'summary-index.json');

  const topCallSites = [...callSites.values()].sort((a, b) => b.count - a.count).slice(0, 50);
  const summary = {
    generatedAt: new Date().toISOString(),
    runDir: absRun,
    stats: { ...stats, uniqueHosts: hosts.size, timelineEntries: timeline.length },
    hosts: [...hosts].sort(),
    topCallSites,
    files: { timeline: timelineFile, summaryIndex: indexFile },
  };

  fs.writeFileSync(timelineFile, timeline.map(x => JSON.stringify(x)).join('\n') + (timeline.length ? '\n' : ''), 'utf8');
  fs.writeFileSync(indexFile, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  return summary;
}

module.exports = { correlateRun, buildScriptIndex, resolveCdpStack, resolveJsStackLines };
