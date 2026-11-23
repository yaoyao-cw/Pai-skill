'use strict';
class ConnectionError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const fail = (code, message) => { throw new ConnectionError(code, message); };

function isLoopbackHost(host) {
  return /^(localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)$/i.test(host);
}

function assertLoopbackUrl(value, protocols = ['http:', 'https:'], { allowQuery = false } = {}) {
  let u;
  try { u = new URL(value); } catch { fail('INVALID_ENDPOINT', 'Invalid endpoint'); }
  if (!protocols.includes(u.protocol) || !isLoopbackHost(u.hostname) || u.username || u.password || u.hash) {
    fail('NON_LOOPBACK_ENDPOINT', 'Loopback endpoint required');
  }
  if (!allowQuery && u.search) {
    fail('NON_LOOPBACK_ENDPOINT', 'Loopback endpoint required');
  }
  return u;
}

function makeRequestJson({ fetch: impl = globalThis.fetch, timeoutMs = 10000, allowQuery = false } = {}) {
  return async (url, init = {}, requestOptions = {}) => {
    const queryAllowed = requestOptions.allowQuery ?? allowQuery;
    assertLoopbackUrl(url, ['http:', 'https:'], { allowQuery: queryAllowed });
    const res = await impl(url, {
      ...init,
      signal: AbortSignal.timeout(requestOptions.timeoutMs || timeoutMs),
      redirect: 'error',
    });
    if (!res.ok) fail('LOCAL_HTTP_ERROR', 'Local endpoint HTTP error');
    return res.json();
  };
}

module.exports = { ConnectionError, fail, isLoopbackHost, assertLoopbackUrl, makeRequestJson };
