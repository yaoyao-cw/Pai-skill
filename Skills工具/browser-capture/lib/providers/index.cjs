'use strict';
const { fail } = require('../loopback.cjs');
const bitbrowser = require('./bitbrowser.cjs');
const adspower = require('./adspower.cjs');
const chrome = require('./chrome.cjs');

const PROVIDERS = Object.freeze({
  bitbrowser,
  adspower,
  chrome,
});

const ALIASES = Object.freeze({
  bitbrowser: 'bitbrowser',
  bit: 'bitbrowser',
  bb: 'bitbrowser',
  adspower: 'adspower',
  ads: 'adspower',
  chrome: 'chrome',
  chromium: 'chrome',
  cdp: 'chrome',
  direct: 'chrome',
  vv8: 'chrome',
  visiblev8: 'chrome',
});

function listProviders() {
  return Object.keys(PROVIDERS);
}

function normalizeProvider(value) {
  if (typeof value !== 'string' || !value.trim()) {
    fail('INVALID_PROVIDER', `--provider is required (${listProviders().join(' | ')})`);
  }
  const canonical = ALIASES[value.trim().toLowerCase()];
  if (!canonical) {
    fail('INVALID_PROVIDER', `Unknown provider "${value}". Supported: ${listProviders().join(', ')}`);
  }
  return canonical;
}

function getProvider(value) {
  return PROVIDERS[normalizeProvider(value)];
}

async function resolveProfile(options = {}) {
  const provider = getProvider(options.provider);
  return provider.resolveProfile({ ...options, provider: provider.name });
}

async function resolveBrowserConnection(options = {}) {
  const provider = getProvider(options.provider);
  return provider.resolveBrowserConnection({ ...options, provider: provider.name });
}

async function isProfileOpen(options = {}) {
  const provider = getProvider(options.provider);
  return provider.isProfileOpen({ ...options, provider: provider.name });
}

async function closeProfile(options = {}) {
  const provider = getProvider(options.provider);
  return provider.closeProfile({ ...options, provider: provider.name });
}

module.exports = {
  PROVIDERS,
  listProviders,
  normalizeProvider,
  getProvider,
  resolveProfile,
  resolveBrowserConnection,
  isProfileOpen,
  closeProfile,
};
