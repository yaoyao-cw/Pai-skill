#!/usr/bin/env node
'use strict';
const controller = require('../lib/controller.cjs');
const { assertLoopbackUrl, fail } = require('../lib/loopback.cjs');
const { normalizeProvider, getProvider, listProviders } = require('../lib/providers/index.cjs');
const { normalizeMode, listModes, normalizeHooks, normalizeAsyncDepth, listHooks } = require('../lib/modes.cjs');
const { correlateRun } = require('../lib/correlate.cjs');
const { exportHar } = require('../lib/har-exporter.cjs');
const { loadOverrideEngine } = require('../lib/overrides.cjs');

const COMMANDS = ['start', 'status', 'stop', 'new-tab', 'metrics', 'memory-sample', 'heap-snapshot', 'correlate', 'export-har'];

const HELP = `Browser CDP + Hook capture & reverse-engineering kit (Node >=22, native fetch/WebSocket)
Providers: ${listProviders().join(' | ')} (aliases: bit/bb -> bitbrowser, ads -> adspower, chromium/cdp/direct/vv8/visiblev8 -> chrome)
Modes:     ${listModes().join(' | ')} (default: standard)

Usage:
  start         -p PROVIDER [--window N] [--mode stealth|standard|deep] [--hooks LIST|none] [--async-depth 0..64] [--with-runtime] [--strip-debugger] [--strip-script-debugger] [--override RULES.json] [--browser-id ID] [--ws-url URL] [--api-url URL] [--url URL] [--restart] [--out DIR]
  status        -p PROVIDER [--window N]
  new-tab       -p PROVIDER [--window N] --url https://example.org/
  metrics       -p PROVIDER [--window N] [--target TARGET_ID]
  memory-sample -p PROVIDER [--window N] [--target TARGET_ID] [--duration MS] [--force]
  heap-snapshot -p PROVIDER [--window N] [--target TARGET_ID] [--force]
  correlate     (--run-dir DIR | -p PROVIDER --window N)
  export-har    (--run-dir DIR | -p PROVIDER --window N) [--out FILE]
  stop          -p PROVIDER [--window N]

Modes:
  stealth  : Pure passive CDP (Network + WebSocket + SSE + DOMStorage). NO Runtime.enable, NO Debugger, NO JS Hook.
  standard : Stealth-hardened JS Hook (NO Runtime.enable, closure binding, Symbol store, [native code] Proxy) + Network + DOMStorage.
  deep     : Full reverse-engineering mode (NO Runtime.enable by default; getter-safe console/exception capture + Page & Worker Debugger async stacks & dynamic JS sources + WASM extraction + SSE/stream chunks + stack/cookie/crypto/WS/DOM hooks + heap snapshots).

Provider notes:
  bitbrowser : --window is UI seq; supports optional --browser-id ID; default API http://127.0.0.1:54348
  adspower   : --window is serial_number; --browser-id unsupported;   default API http://127.0.0.1:50325
  chrome     : Direct Chrome/Brave/VisibleV8 CDP; --window is debug port (default 9222 or inferred from --ws-url / --api-url)

Common options:
  -p, --provider PROVIDER  Target browser provider (required except --run-dir offline commands).
  -m, --mode MODE          Capture mode for start (stealth | standard | deep; default: standard).
  --hooks LIST|none        Modular JS hook selection for start: none | all | network | comma-separated (${listHooks().join(',')}).
                           Use "--mode deep --hooks none" for zero main-world JS injection + full CDP Network/Debugger/sources.
  --async-depth 0..64      CDP Debugger.setAsyncCallStackDepth for --mode deep (default 32; 0 disables async stack tracking).
  --with-runtime           Optional with --mode deep: enables native CDP Runtime.enable (e.g. for Worker console logs).
  --strip-debugger         Optional with --mode deep: strips Function('debugger') / eval('debugger') traps in JS hooks.
  --strip-script-debugger  Response-layer lexer-safe debugger neutralization via CDP Fetch.enable (works in all 3 modes; zero JS hooks needed).
  --override RULES.json    CDP Fetch.enable response hot-swap/patch rules JSON (works in all 3 modes).
  --state-root DIRECTORY   Isolated controller store (default: %USERPROFILE%/browser-captures).
  --out PATH               For start: run output root; for export-har: target .har file path.
  --api-url URL            Loopback API origin override.
  --ws-url URL             Direct loopback browser WebSocket URL (provider chrome only).

Stop waits for graceful flush and hook cleanup, keeping user tabs open.
`;

function parse(argv) {
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) return { help: true };
  const options = { command: argv[0] };
  if (!COMMANDS.includes(options.command)) throw Error(`Unknown command: ${options.command}`);
  const names = {
    '--provider': 'provider',
    '-p': 'provider',
    '--mode': 'mode',
    '-m': 'mode',
    '--window': 'windowSeq',
    '--browser-id': 'browserId',
    '--ws-url': 'wsUrl',
    '--url': 'url',
    '--out': 'outDir',
    '--api-url': 'apiUrl',
    '--state-root': 'stateRoot',
    '--run-dir': 'runDir',
    '--override': 'overrideFile',
    '--hooks': 'hooks',
    '--async-depth': 'asyncDepth',
    '--target': 'targetId',
    '--duration': 'durationMs',
  };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--restart') { options.restart = true; continue; }
    if (argv[i] === '--force') { options.force = true; continue; }
    if (argv[i] === '--strip-debugger') { options.stripDebugger = true; continue; }
    if (argv[i] === '--strip-script-debugger') { options.stripScriptDebugger = true; continue; }
    if (argv[i] === '--with-runtime') { options.withRuntime = true; continue; }
    const at = argv[i].indexOf('=');
    const flag = at < 0 ? argv[i] : argv[i].slice(0, at);
    const key = names[flag];
    if (!key) throw Error(`Unknown option: ${flag}`);
    const value = at < 0 ? argv[++i] : argv[i].slice(at + 1);
    if (!value || value.startsWith('--') || value === '-p' || value === '-m') throw Error(`Missing option value for ${flag}`);
    options[key] = value;
  }

  const isOfflineAnalysis = options.command === 'correlate' || options.command === 'export-har';
  if (isOfflineAnalysis && options.runDir) {
    if (options.provider) options.provider = normalizeProvider(options.provider);
    return options;
  }

  options.provider = normalizeProvider(options.provider);
  const providerMod = getProvider(options.provider);

  if (options.wsUrl) {
    if (!providerMod.SUPPORTS_WS_URL) {
      fail('UNSUPPORTED_OPTION', `--ws-url is only supported for provider "chrome"`);
    }
    const ws = assertLoopbackUrl(options.wsUrl, ['ws:', 'wss:']);
    if (!ws.pathname.startsWith('/devtools/browser/')) {
      fail('INVALID_BROWSER_WS', '--ws-url must point to /devtools/browser/...');
    }
  }
  if (options.apiUrl) {
    const api = assertLoopbackUrl(options.apiUrl);
    if (api.pathname !== '/') fail('INVALID_ENDPOINT', 'API must be an origin');
  }

  if (options.windowSeq === undefined && typeof providerMod.inferPort === 'function') {
    options.windowSeq = providerMod.inferPort(options);
  } else {
    options.windowSeq = Number(options.windowSeq);
  }
  if (!Number.isSafeInteger(options.windowSeq) || options.windowSeq < 1) {
    fail('INVALID_WINDOW', `--window is required and must be a positive integer (${providerMod.WINDOW_LABEL})`);
  }
  if (options.provider === 'chrome' && options.windowSeq > 65535) {
    fail('INVALID_WINDOW', '--window must be a valid TCP port (1-65535) for provider "chrome"');
  }
  if (options.mode !== undefined) {
    if (options.command !== 'start') fail('UNSUPPORTED_OPTION', '--mode applies only to start');
    options.mode = normalizeMode(options.mode);
  } else if (options.command === 'start') {
    options.mode = 'standard';
  }
  if (options.hooks !== undefined) {
    if (options.command !== 'start') fail('UNSUPPORTED_OPTION', '--hooks applies only to start');
    options.hooks = normalizeHooks(options.hooks, options.mode);
  }
  if (options.asyncDepth !== undefined) {
    if (options.command !== 'start') fail('UNSUPPORTED_OPTION', '--async-depth applies only to start');
    options.asyncDepth = normalizeAsyncDepth(options.asyncDepth, options.mode);
  }
  if (options.stripDebugger) {
    if (options.command !== 'start' || options.mode !== 'deep') {
      fail('UNSUPPORTED_OPTION', '--strip-debugger applies only to start --mode deep');
    }
    if (Array.isArray(options.hooks) && options.hooks.length === 0) {
      fail('UNSUPPORTED_OPTION', '--strip-debugger requires JS hooks; use --strip-script-debugger when --hooks none');
    }
  }
  if (options.stripScriptDebugger) {
    if (options.command !== 'start') {
      fail('UNSUPPORTED_OPTION', '--strip-script-debugger applies only to start');
    }
  }
  if (options.withRuntime) {
    if (options.command !== 'start' || options.mode !== 'deep') {
      fail('UNSUPPORTED_OPTION', '--with-runtime applies only to start --mode deep');
    }
  }
  if (options.overrideFile) {
    if (options.command !== 'start') fail('UNSUPPORTED_OPTION', '--override applies only to start');
    const engine = loadOverrideEngine(options.overrideFile);
    options.overrideFile = engine.configPath;
  }
  if (options.browserId && !providerMod.SUPPORTS_BROWSER_ID) {
    fail('UNSUPPORTED_OPTION', `--browser-id is not supported for provider "${options.provider}"`);
  }
  if (options.restart) {
    if (options.command !== 'start') throw Error('--restart applies to start');
    if (options.provider === 'chrome') fail('UNSUPPORTED_OPTION', '--restart is not supported for direct provider "chrome"');
  }
  if (options.force && !['memory-sample', 'heap-snapshot'].includes(options.command)) {
    throw Error('--force applies to memory-sample or heap-snapshot');
  }
  if (options.durationMs !== undefined) {
    if (options.command !== 'memory-sample') throw Error('--duration applies only to memory-sample');
    options.durationMs = Number(options.durationMs);
    if (!Number.isSafeInteger(options.durationMs) || options.durationMs < 100 || options.durationMs > 60000) {
      fail('INVALID_OPTION', '--duration must be an integer between 100 and 60000 ms');
    }
  }
  if (options.url && !['http:', 'https:'].includes(new URL(options.url).protocol)) throw Error('URL must use HTTP(S)');
  if (options.command === 'new-tab' && !options.url) throw Error('new-tab requires --url');
  return options;
}

function resolveTargetRunDir(options) {
  if (options.runDir) return options.runDir;
  const st = controller.status(options);
  if (!st?.runDir) fail('RUN_DIR_NOT_FOUND', 'No recorded run found for this provider/window; pass --run-dir DIRECTORY');
  return st.runDir;
}

async function main(argv = process.argv.slice(2)) {
  const options = parse(argv);
  if (options.help) { console.log(HELP); return; }
  const handlers = {
    start: controller.start,
    status: controller.status,
    stop: controller.stop,
    'new-tab': controller.newTab,
    metrics: controller.metrics,
    'memory-sample': controller.memorySample,
    'heap-snapshot': controller.heapSnapshot,
    correlate: opts => correlateRun(resolveTargetRunDir(opts)),
    'export-har': opts => exportHar(resolveTargetRunDir(opts), opts.outDir || null),
  };
  const result = await handlers[options.command](options);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch(e => {
    console.error(JSON.stringify({ error: e.message, code: e.code || 'COMMAND_FAILED' }));
    process.exitCode = 1;
  });
}

module.exports = { main, parse, HELP };
