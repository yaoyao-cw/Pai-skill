'use strict';
const { EventEmitter } = require('node:events');

/** Import-safe CDP transport. Only connect() constructs the supplied WebSocket. */
function safeMessage(value) {
  return String(value || '').replace(/(?:https?|wss?):\/\/[^\s"'<>]+/gi, '[url-redacted]').replace(/\b(cookie|authorization|token|password|secret)\b\s*[:=]\s*\S+/gi, '$1=[redacted]').slice(0, 600);
}
function commandDiagnostic(error, extra = {}) {
  return { at: new Date().toISOString(), commandId: error.commandId ?? null, method: error.method || null, sessionId: error.sessionId || null, targetId: error.targetId || null,
    code: error.code || 'CDP_ERROR', protocolCode: error.protocolError?.code ?? null, message: safeMessage(error.protocolError?.message || error.message),
    timeoutMs: error.timeoutMs ?? null, startedAt: error.startedAt || null, elapsedMs: error.elapsedMs ?? null, ...extra };
}
class CdpClient extends EventEmitter {
  constructor(wsUrl, { WebSocketImpl = globalThis.WebSocket, timeoutMs = 15000 } = {}) {
    super();
    this.wsUrl = wsUrl;
    this.WebSocketImpl = WebSocketImpl;
    this.timeoutMs = timeoutMs;
    this.pending = new Map();
    this.late = new Map();
    this.closedSessions = new Set();
    this.nextId = 0;
    this.connected = false;
    this.closed = false;
    this.socket = null;
    this.listeners = [];
    this.connectTimer = null;
    this.connectPromise = null;
    this.connectReject = null;
  }

  connect() {
    if (this.connected) return Promise.resolve(this);
    if (this.closed) return Promise.reject(new Error('CDP client is closed'));
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = new Promise((resolve, reject) => {
      this.connectReject = reject;
      if (typeof this.WebSocketImpl !== 'function') {
        this._shutdown(new Error('A WebSocket implementation is required'));
        return;
      }
      try { this.socket = new this.WebSocketImpl(this.wsUrl); }
      catch { this._shutdown(new Error('CDP transport construction failed')); return; }
      try {
      this._listen('open', () => {
        clearTimeout(this.connectTimer);
        this.connectTimer = null;
        this.connectReject = null;
        this.connected = true;
        resolve(this);
      });
      this._listen('message', (event) => {
        const data = event && typeof event === 'object' && 'data' in event ? event.data : event;
        this._message(data);
      });
      this._listen('error', () => this._shutdown(new Error('CDP transport error')));
      this._listen('close', () => this._shutdown(new Error('CDP transport disconnected')));
      } catch {
        this._shutdown(new Error('Unsupported WebSocket event interface'));
        return;
      }
      this.connectTimer = setTimeout(() => this._shutdown(new Error('CDP connection timed out')), this.timeoutMs);
      // Some injected transports are already open when constructed.
      if (this.socket.readyState === 1) queueMicrotask(() => {
        if (this.closed || this.connected) return;
        clearTimeout(this.connectTimer);
        this.connectTimer = null;
        this.connectReject = null;
        this.connected = true;
        resolve(this);
      });
    });
    return this.connectPromise;
  }

  _listen(name, fn) {
    if (typeof this.socket.addEventListener === 'function') {
      this.socket.addEventListener(name, fn);
      this.listeners.push(() => this.socket.removeEventListener(name, fn));
    } else if (typeof this.socket.on === 'function') {
      this.socket.on(name, fn);
      this.listeners.push(() => this.socket.off(name, fn));
    } else {
      throw new Error('Unsupported WebSocket event interface');
    }
  }

  _message(data) {
    let message;
    try {
      const text = typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
      message = JSON.parse(text);
    } catch {
      this.emit('protocolError', new Error('Invalid CDP JSON message'));
      return;
    }
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      this.emit('protocolError', new Error('Invalid CDP message envelope'));
      return;
    }
    if (Object.prototype.hasOwnProperty.call(message, 'id')) {
      const entry = this.pending.get(message.id);
      if (!entry) {
        const late = this.late.get(message.id);
        if (late) { this.late.delete(message.id); clearTimeout(late.expiry); this.emit('lateResponse', { ...late.context, elapsedMs: Date.now() - late.started, protocolCode: message.error?.code ?? null, message: safeMessage(message.error?.message), succeeded: !message.error }, message.result || {}, late.resourceName); }
        return;
      }
      this.pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) {
        const error = new Error(`CDP command failed: ${entry.method}`);
        error.code = message.error.code;
        // The raw protocol error is retained in memory, never interpolated into CLI logs.
        error.protocolError = message.error;
        Object.assign(error, entry.context, { elapsedMs: Date.now() - entry.started });
        entry.reject(error);
      } else entry.resolve(message.result || {});
      return;
    }
    if (message.method === 'Target.detachedFromTarget' && message.params?.sessionId) this.cancelSession(message.params.sessionId);
    if (message.method === 'Inspector.detached' && message.sessionId) this.cancelSession(message.sessionId);
    if (typeof message.method === 'string') this.emit('event', message);
  }

  send(method, params = {}, sessionId, options = {}) {
    if (!this.connected || this.closed) return Promise.reject(new Error('CDP client is not connected'));
    const commandSession = sessionId ?? (method === 'Target.detachFromTarget' ? params.sessionId : undefined);
    if (this.closedSessions.has(commandSession)) return Promise.reject(Object.assign(new Error('CDP session already closed'), { code: 'CDP_SESSION_CLOSED' }));
    const message = { id: ++this.nextId, method, params };
    if (sessionId !== undefined && sessionId !== null) message.sessionId = sessionId;
    const timeoutMs = Number.isSafeInteger(options?.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : this.timeoutMs;
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const context = { commandId: message.id, method, sessionId: commandSession || null, targetId: method === 'Target.attachToTarget' ? params.targetId : null, startedAt: new Date(started).toISOString(), timeoutMs };
      const timer = setTimeout(() => {
        this.pending.delete(message.id);
        const expiry = setTimeout(() => this.late.delete(message.id), 60000); expiry.unref?.();
        this.late.set(message.id, { context, started, expiry, resourceName: method === 'Runtime.addBinding' ? params.name : null });
        reject(Object.assign(new Error(`CDP command timed out: ${method}`), context, { code: 'CDP_TIMEOUT', elapsedMs: Date.now() - started }));
      }, timeoutMs);
      this.pending.set(message.id, { resolve, reject, timer, method, context, started, sessionId: commandSession, targetId: context.targetId, resourceName: method === 'Runtime.addBinding' ? params.name : null });
      try { this.socket.send(JSON.stringify(message)); }
      catch {
        clearTimeout(timer);
        this.pending.delete(message.id);
        reject(Object.assign(new Error(`CDP send failed: ${method}`), context, { code: 'CDP_SEND_FAILED', elapsedMs: Date.now() - started }));
      }
    });
  }

  cancelSession(sessionId) {
    this.closedSessions.add(sessionId);
    this.cancelPendingForSession(sessionId, 'CDP_SESSION_CLOSED');
  }

  cancelPendingForSession(sessionId, code = 'CDP_COMMAND_CANCELLED') {
    for (const [id, entry] of this.pending) {
      if (entry.sessionId !== sessionId) continue;
      this.pending.delete(id);
      clearTimeout(entry.timer);
      if (['Runtime.addBinding', 'Page.addScriptToEvaluateOnNewDocument'].includes(entry.method)) { const expiry = setTimeout(() => this.late.delete(id), 60000); expiry.unref?.(); this.late.set(id, { context: entry.context, started: entry.started, resourceName: entry.resourceName, expiry }); }
      entry.reject(Object.assign(new Error(code === 'CDP_SESSION_CLOSED' ? 'CDP session already closed' : 'CDP command cancelled during cleanup'), entry.context, { code, elapsedMs: Date.now() - entry.started }));
    }
  }

  cancelPendingForTarget(targetId) {
    for (const [id, entry] of this.pending) {
      if (entry.method !== 'Target.attachToTarget' || entry.targetId !== targetId) continue;
      this.pending.delete(id);
      clearTimeout(entry.timer);
      entry.reject(Object.assign(new Error('CDP attachment cancelled during cleanup'), { code: 'CDP_COMMAND_CANCELLED' }));
    }
  }

  _shutdown(error) {
    if (this.closed) return;
    this.closed = true;
    this.connected = false;
    clearTimeout(this.connectTimer);
    this.connectTimer = null;
    const reject = this.connectReject;
    this.connectReject = null;
    if (reject) reject(error);
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(Object.assign(new Error(error.message), entry.context, { code: 'CDP_DISCONNECTED', elapsedMs: Date.now() - entry.started }));
    }
    this.pending.clear();
    for (const entry of this.late.values()) clearTimeout(entry.expiry);
    this.late.clear();
    for (const remove of this.listeners.splice(0)) remove();
    if (this.socket && this.socket.readyState !== 3) {
      try { this.socket.close(); } catch { /* Already closed by the transport. */ }
    }
    this.emit('close', error);
  }

  close() { this._shutdown(new Error('CDP client closed')); }
}

module.exports = { CdpClient, commandDiagnostic, safeMessage };
