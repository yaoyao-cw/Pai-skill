'use strict';
const { fail } = require('./loopback.cjs');

const ALL_HOOKS = Object.freeze(['fetch', 'xhr', 'beacon', 'ws', 'sse', 'cookie', 'crypto', 'wasm', 'dom', 'console']);
const NETWORK_HOOKS = Object.freeze(['fetch', 'xhr', 'beacon']);

const HOOK_ALIASES = Object.freeze({
  fetch: ['fetch'],
  xhr: ['xhr'],
  beacon: ['beacon'],
  network: NETWORK_HOOKS,
  ws: ['ws'],
  websocket: ['ws'],
  sse: ['sse'],
  eventsource: ['sse'],
  cookie: ['cookie'],
  crypto: ['crypto'],
  wasm: ['wasm'],
  webassembly: ['wasm'],
  dom: ['dom'],
  console: ['console'],
  runtime: ['console'],
  all: ALL_HOOKS,
  none: [],
});

const MODES = Object.freeze({
  stealth: Object.freeze({
    name: 'stealth',
    hook: false,
    defaultHooks: Object.freeze([]),
    stealthHook: false,
    runtimeEnable: false,
    captureRuntimeEvents: false,
    pageEnable: false,
    domStorage: true,
    debugger: false,
    asyncStackDepth: 0,
    captureScripts: false,
    captureStack: false,
    deepHooks: false,
    allowMemorySample: false,
    allowHeapSnapshot: false,
  }),
  standard: Object.freeze({
    name: 'standard',
    hook: true,
    defaultHooks: NETWORK_HOOKS,
    stealthHook: true,
    runtimeEnable: false,
    captureRuntimeEvents: false,
    pageEnable: true,
    domStorage: true,
    debugger: false,
    asyncStackDepth: 0,
    captureScripts: false,
    captureStack: false,
    deepHooks: false,
    allowMemorySample: true,
    allowHeapSnapshot: false,
  }),
  deep: Object.freeze({
    name: 'deep',
    hook: true,
    defaultHooks: ALL_HOOKS,
    stealthHook: true,
    // Default false to avoid the Runtime.enable console-getter anti-debug leak;
    // console & uncaught errors are captured via getter-safe JS hooks instead (pass --with-runtime to opt in).
    runtimeEnable: false,
    captureRuntimeEvents: true,
    pageEnable: true,
    domStorage: true,
    debugger: true,
    asyncStackDepth: 32,
    captureScripts: true,
    captureStack: true,
    deepHooks: true,
    allowMemorySample: true,
    allowHeapSnapshot: true,
  }),
});

const ALIASES = Object.freeze({
  stealth: 'stealth',
  silent: 'stealth',
  cdp: 'stealth',
  'cdp-only': 'stealth',
  standard: 'standard',
  std: 'standard',
  default: 'standard',
  deep: 'deep',
  reverse: 'deep',
  debug: 'deep',
  full: 'deep',
});

function listModes() {
  return Object.keys(MODES);
}

function listHooks() {
  return [...ALL_HOOKS];
}

function normalizeMode(value, fallback = 'standard') {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') fail('INVALID_MODE', `Mode must be one of: ${listModes().join(', ')}`);
  const canonical = ALIASES[value.trim().toLowerCase()];
  if (!canonical) fail('INVALID_MODE', `Unknown mode "${value}". Supported: ${listModes().join(', ')}`);
  return canonical;
}

function getModeConfig(value) {
  return MODES[normalizeMode(value)];
}

function normalizeHooks(value, modeName = 'standard') {
  const modeCfg = getModeConfig(modeName);
  if (value === undefined || value === null || value === '') {
    return [...modeCfg.defaultHooks];
  }
  const tokens = Array.isArray(value)
    ? value.map(v => String(v).trim().toLowerCase()).filter(Boolean)
    : String(value).split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  if (!tokens.length) fail('INVALID_OPTION', `--hooks cannot be empty; use "none", "all", "network", or comma-separated: ${ALL_HOOKS.join(',')}`);
  if (tokens.includes('none') && tokens.length > 1) {
    fail('INVALID_OPTION', '--hooks "none" cannot be combined with other hook names');
  }
  const resolved = new Set();
  for (const tok of tokens) {
    const mapped = HOOK_ALIASES[tok];
    if (!mapped) fail('INVALID_OPTION', `Unknown hook "${tok}". Supported: none, all, network, ${ALL_HOOKS.join(', ')}`);
    for (const h of mapped) resolved.add(h);
  }
  if (modeCfg.name === 'stealth' && resolved.size > 0) {
    fail('UNSUPPORTED_OPTION', '--hooks cannot enable JS hooks in stealth mode; use --mode standard or --mode deep');
  }
  return ALL_HOOKS.filter(h => resolved.has(h));
}

function normalizeAsyncDepth(value, modeName = 'standard') {
  const modeCfg = getModeConfig(modeName);
  if (value === undefined || value === null || value === '') return modeCfg.asyncStackDepth;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > 64) {
    fail('INVALID_OPTION', '--async-depth must be an integer between 0 and 64');
  }
  if (!modeCfg.debugger && n > 0) {
    fail('UNSUPPORTED_OPTION', '--async-depth applies only to --mode deep');
  }
  return n;
}

module.exports = {
  MODES,
  ALL_HOOKS,
  NETWORK_HOOKS,
  listModes,
  listHooks,
  normalizeMode,
  getModeConfig,
  normalizeHooks,
  normalizeAsyncDepth,
};
