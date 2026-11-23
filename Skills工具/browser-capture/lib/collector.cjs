'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { commandDiagnostic } = require('./cdp-client.cjs');
const { CdpRecorder } = require('./cdp-recorder.cjs');
const { installHookForSession, createPageHookRuntime, defaultStoreKey } = require('./page-hook.cjs');
const { getModeConfig, normalizeHooks, normalizeAsyncDepth } = require('./modes.cjs');
const { loadOverrideEngine } = require('./overrides.cjs');

const TYPES = ['tab', 'page', 'iframe', 'worker', 'service_worker', 'shared_worker'];
const FILTER = [...TYPES.map(type => ({ type, exclude: false })), { exclude: true }];
const auto = (enabled, rootTabs = false) => ({
  autoAttach: enabled,
  waitForDebuggerOnStart: enabled,
  flatten: true,
  ...(enabled ? { filter: [...TYPES.filter(type => type !== (rootTabs ? 'page' : 'tab')).map(type => ({ type, exclude: false })), { exclude: true }] } : {}),
});
const MAX_SCRIPT_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_SCRIPT_BYTES = 64 * 1024 * 1024;

function urlContext(value) {
  try {
    const u = new URL(value);
    return {
      scheme: u.protocol,
      host: u.hostname,
      category: /^https?:$/.test(u.protocol) ? 'http-document' : u.protocol === 'chrome-extension:' ? 'extension' : 'browser-or-other',
    };
  } catch {
    return { scheme: null, host: null, category: 'unknown' };
  }
}

const closed = e => e.code === 'CDP_SESSION_CLOSED' || /Session.*not found|No session|Target closed/i.test(e.protocolError?.message || e.message);

function sink(file) {
  const fd = fs.openSync(file, 'wx');
  let count = 0;
  let failure;
  let ended = false;
  return {
    append(value) {
      if (ended) throw Error('Output closed');
      try { fs.writeFileSync(fd, JSON.stringify(value) + '\n'); count++; }
      catch (e) { failure = e; throw e; }
    },
    close() {
      if (ended) return;
      ended = true;
      const state = { write: failure ? 'failed' : 'succeeded', fsync: 'succeeded', close: 'succeeded' };
      try { fs.fsyncSync(fd); } catch { state.fsync = 'failed'; }
      try { fs.closeSync(fd); } catch { state.close = 'failed'; }
      return state;
    },
    get count() { return count; },
  };
}

class Collector {
  constructor({ client, outDir, runId = randomUUID(), mode = 'standard', hooks, asyncDepth, stripDebugger = false, stripScriptDebugger = false, withRuntime = false, overrideFile = null, overrideEngine = null, onState = () => {}, Recorder = CdpRecorder, installHook = installHookForSession }) {
    this.client = client;
    this.outDir = outDir;
    this.runId = runId;
    this.modeConfig = getModeConfig(mode);
    this.mode = this.modeConfig.name;
    this.enabledHooks = normalizeHooks(hooks, this.mode);
    this.hookEnabled = this.modeConfig.hook && this.enabledHooks.length > 0;
    this.asyncStackDepth = normalizeAsyncDepth(asyncDepth, this.mode);
    this.runtimeEnable = this.modeConfig.runtimeEnable || (!!withRuntime && this.mode === 'deep');
    this.stripDebugger = !!stripDebugger && this.modeConfig.deepHooks && this.hookEnabled;
    this.stripScriptDebugger = !!stripScriptDebugger;
    this.overrideEngine = overrideEngine || loadOverrideEngine(overrideFile, { stripScriptDebugger: this.stripScriptDebugger });
    this.storeKey = defaultStoreKey(this.runId);
    this.onState = onState;
    this.installHook = installHook;
    this.recorder = new Recorder({ client, outDir, runId, maxBodyBytes: 16 * 1024 * 1024 });

    this.extraSinks = {};
    try {
      this.hookSink = sink(path.join(outDir, 'hook-events.jsonl'));
      this.coverageSink = sink(path.join(outDir, 'coverage.jsonl'));
      this.storageSink = sink(path.join(outDir, 'storage-events.jsonl'));
      if (this.modeConfig.captureRuntimeEvents || this.runtimeEnable || this.enabledHooks.includes('console')) {
        this.extraSinks.runtime = sink(path.join(outDir, 'runtime-events.jsonl'));
      }
      if (this.modeConfig.captureScripts) {
        this.extraSinks.scripts = sink(path.join(outDir, 'scripts.jsonl'));
      }
    } catch (e) {
      try { this.hookSink?.close(); } catch {}
      try { this.coverageSink?.close(); } catch {}
      try { this.storageSink?.close(); } catch {}
      for (const s of Object.values(this.extraSinks)) { try { s.close(); } catch {} }
      this.recorder.writer.close();
      throw e;
    }

    this.sessions = new Map();
    this.targets = new Map();
    this.attachments = new Map();
    this.tasks = new Set();
    this.navigationTasks = new Set();
    this.documents = new Set();
    this.savedScriptHashes = new Map();
    this.totalScriptBytes = 0;
    this.savedWasmHashes = new Map();
    this.totalWasmBytes = 0;
    this.nextGeneration = 0;
    this.rootTabMode = true;
    this.uncertainScripts = new Set();
    this.lateResponse = (diagnostic, result, resourceName) => {
      this.coverage('command-late-response', { ...diagnostic, targetId: this.sessions.get(diagnostic.sessionId)?.info.targetId || diagnostic.targetId || null });
      const uncertainKey = diagnostic.sessionId + ':' + diagnostic.commandId;
      if (diagnostic.method === 'Runtime.addBinding') {
        if (!diagnostic.succeeded) this.uncertainScripts.delete(uncertainKey);
        else if (resourceName) {
          this.track(
            this.client.send('Runtime.removeBinding', { name: resourceName }, diagnostic.sessionId)
              .then(() => this.uncertainScripts.delete(uncertainKey))
              .catch(e => this.diagnose('late-binding-remove-failed', e)),
          );
        }
      }
      if (diagnostic.method === 'Page.addScriptToEvaluateOnNewDocument') {
        if (!diagnostic.succeeded) this.uncertainScripts.delete(uncertainKey);
        else if (result.identifier) {
          this.track(
            this.client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: result.identifier }, diagnostic.sessionId)
              .then(() => { this.uncertainScripts.delete(uncertainKey); this.coverage('late-script-removed', { sessionId: diagnostic.sessionId }); })
              .catch(e => this.diagnose('late-script-remove-failed', e)),
          );
        }
      }
    };
    this.stopping = false;
    this.state = {
      mode: this.mode,
      enabledHooks: this.enabledHooks,
      asyncStackDepth: this.asyncStackDepth,
      runtimeEnable: this.runtimeEnable,
      stripScriptDebugger: this.stripScriptDebugger,
      overrideRulesCount: this.overrideEngine?.rules.length || 0,
      collectorArmed: false,
      navigationSent: false,
      documentHookObserved: false,
    };
    this.event = message => { try { this.handleEvent(message); } catch (e) { this.fatal = e; this.onFatal?.(e); } };
    this.disconnected = () => { if (!this.stopping) { this.fatal = Error('CDP disconnected'); this.onFatal?.(this.fatal); } };
    this.recorder.on('fatal', e => { this.fatal = e; this.onFatal?.(e); });
  }

  _ensureLazySink(name, filename) {
    if (this.outputClosed) throw Error('Output closed');
    if (!this.extraSinks[name]) this.extraSinks[name] = sink(path.join(this.outDir, filename));
    return this.extraSinks[name];
  }

  update(values = {}) {
    Object.assign(this.state, values);
    const targets = [...this.targets.values()].map(s => ({
      targetId: s.info.targetId,
      targetType: s.info.type,
      sessionId: s.id,
      networkEnabled: s.network,
      domStorageEnabled: !!s.domStorage,
      debuggerEnabled: !!s.debuggerEnabled,
      documentStartRegistered: s.hookRegistered,
      documentHookObserved: !!s.documentHookObserved,
      documentId: s.documentId || null,
      waitingForDebugger: s.waiting,
      installationAttempts: s.installationAttempts || 1,
      recoveryPending: !!s.recovering,
      businessHookObserved: !!s.businessHookObserved,
      observedTransports: [...(s.transports || [])],
    }));
    const docTargets = targets.filter(t => ['page', 'iframe'].includes(t.targetType));
    this.state.mode = this.mode;
    this.state.documentHookObserved = targets.some(t => t.documentHookObserved);
    this.state.documentTargets = docTargets.length;
    this.state.unarmedNetworkTargets = docTargets.filter(t => !t.networkEnabled).map(t => t.targetId);
    if (this.hookEnabled) {
      this.state.unregisteredDocumentTargets = docTargets.filter(t => !t.documentStartRegistered).map(t => t.targetId);
      this.state.coverageStatus = this.state.unregisteredDocumentTargets.length ? 'degraded' : 'registered';
    } else {
      this.state.unregisteredDocumentTargets = [];
      this.state.coverageStatus = this.state.unarmedNetworkTargets.length
        ? 'degraded'
        : (this.modeConfig.debugger ? 'cdp-debugger' : 'stealth-cdp');
    }
    this.onState({ ...this.state, targetCount: targets.length, observedDocumentCount: this.documents.size, targets });
  }

  coverage(kind, data = {}) { if (this.outputClosed) return; this.coverageSink.append({ at: new Date().toISOString(), kind, ...data }); }
  diagnose(kind, error, s, extra = {}) { this.coverage(kind, commandDiagnostic(error, { ...(s ? { sessionId: s.id, targetId: s.info.targetId, targetType: s.info.type } : {}), ...extra })); }
  track(promise) { this.tasks.add(promise); promise.catch(e => { this.fatal = e; this.onFatal?.(e); }).finally(() => this.tasks.delete(promise)); return promise; }

  _recordScriptParsed(session, params) {
    if (this.outputClosed || !this.extraSinks.scripts || !params?.scriptId) return;
    const url = params.url || '';
    const isDynamic = !url || url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('eval');
    const meta = {
      at: new Date().toISOString(),
      kind: 'script-parsed',
      sessionId: session.id,
      targetId: session.info.targetId,
      scriptId: params.scriptId,
      url: url || null,
      isDynamic,
      startLine: params.startLine ?? null,
      startColumn: params.startColumn ?? null,
      endLine: params.endLine ?? null,
      endColumn: params.endColumn ?? null,
      executionContextId: params.executionContextId ?? null,
      hash: params.hash || null,
      isModule: !!params.isModule,
      length: params.length ?? null,
      sourceMapURL: params.sourceMapURL || null,
    };
    this.extraSinks.scripts.append(meta);
    if (this.stopping || session.closed || this.totalScriptBytes >= MAX_TOTAL_SCRIPT_BYTES) return;
    // Skip internal chrome-extension:// or empty scripts? Keep http/https/dynamic scripts.
    if (url.startsWith('chrome-extension://') || url.startsWith('chrome://')) return;
    this.track((async () => {
      try {
        const res = await this.client.send('Debugger.getScriptSource', { scriptId: params.scriptId }, session.id);
        if (this.outputClosed || typeof res?.scriptSource !== 'string') return;
        const fullBuf = Buffer.from(res.scriptSource, 'utf8');
        const truncated = fullBuf.length > MAX_SCRIPT_BYTES;
        const slice = truncated ? fullBuf.subarray(0, MAX_SCRIPT_BYTES) : fullBuf;
        const sha256 = createHash('sha256').update(slice).digest('hex');
        let relFile = this.savedScriptHashes.get(sha256);
        if (!relFile) {
          if (this.totalScriptBytes + slice.length > MAX_TOTAL_SCRIPT_BYTES) {
            this.coverage('script-source-budget-exhausted', { sessionId: session.id, scriptId: params.scriptId });
            return;
          }
          const dir = path.join(this.outDir, 'scripts');
          fs.mkdirSync(dir, { recursive: true });
          const filename = `${sha256.slice(0, 12)}.js`;
          relFile = path.join('scripts', filename);
          const abs = path.join(dir, filename);
          if (!fs.existsSync(abs)) {
            const fd = fs.openSync(abs, 'wx');
            try { fs.writeFileSync(fd, slice); fs.fsyncSync(fd); }
            finally { fs.closeSync(fd); }
          }
          this.savedScriptHashes.set(sha256, relFile);
          this.totalScriptBytes += slice.length;
        }
        if (!this.outputClosed) {
          this.extraSinks.scripts.append({
            at: new Date().toISOString(),
            kind: 'script-source',
            sessionId: session.id,
            targetId: session.info.targetId,
            scriptId: params.scriptId,
            url: url || null,
            isDynamic,
            sha256,
            originalBytes: fullBuf.length,
            capturedBytes: slice.length,
            truncated,
            sourceFile: relFile,
          });
        }
      } catch (e) {
        if (!closed(e)) this.diagnose('script-source-unavailable', e, session, { scriptId: params.scriptId });
      }
    })());
  }

  handleEvent(message) {
    if (message.method === 'Target.attachedToTarget') {
      const p = message.params; if (!p?.sessionId) return;
      this.track(this.enable(p.sessionId, p.targetInfo || {}, !!p.waitingForDebugger)); return;
    }
    if (message.method === 'Target.detachedFromTarget' || message.method === 'Inspector.detached') {
      const id = message.params?.sessionId || message.sessionId; const s = this.sessions.get(id);
      if (s) {
        s.closed = true; s.waiting = false;
        if (!s.detaching) this.recorder.sessionClosed(id, 'target-detached');
        if (this.targets.get(s.info.targetId) === s) this.targets.delete(s.info.targetId);
      }
      return;
    }
    if (message.method === 'Target.targetCreated' && !this.stopping && message.params?.targetInfo?.type === 'page') {
      const info = message.params.targetInfo;
      this.track((async () => {
        await new Promise(resolve => setImmediate(resolve));
        if (!this.stopping && !this.targets.has(info.targetId)) {
          this.coverage('page-discovery-fallback', { targetId: info.targetId, initialNetwork: 'not-guaranteed' });
          try { await this.attach(info); } catch (e) { if (!closed(e)) throw e; }
        }
      })());
    }
    if (message.method === 'Target.targetInfoChanged') {
      const info = message.params?.targetInfo; const s = this.targets.get(info?.targetId);
      if (s) {
        const changed = info.url !== s.info.url;
        s.info = info;
        if (changed && /^https?:/.test(info.url || '')) this.scheduleRecovery(s, 'target-info-changed', 'url:' + info.url);
      }
    }
    if (message.method === 'Runtime.executionContextsCleared') {
      const s = this.sessions.get(message.sessionId);
      if (s) { s.documentHookObserved = false; s.businessHookObserved = false; s.transports = new Set(); s.documentId = null; this.update(); }
    }
    if (message.method === 'Network.requestWillBeSent' && message.params?.type === 'Document' && message.params.loaderId) {
      const s = this.sessions.get(message.sessionId);
      if (s) this.scheduleRecovery(s, 'document-navigation', 'loader:' + message.params.loaderId);
    }
    if (typeof message.method === 'string' && message.method.startsWith('DOMStorage.') && !this.outputClosed) {
      const s = this.sessions.get(message.sessionId);
      if (s) {
        this.storageSink.append({
          at: new Date().toISOString(),
          sessionId: s.id,
          targetId: s.info.targetId,
          event: message.method,
          params: message.params || {},
        });
      }
      return;
    }
    if (this.extraSinks.runtime && (message.method === 'Runtime.consoleAPICalled' || message.method === 'Runtime.exceptionThrown') && !this.outputClosed) {
      const s = this.sessions.get(message.sessionId);
      if (s) {
        this.extraSinks.runtime.append({
          at: new Date().toISOString(),
          sessionId: s.id,
          targetId: s.info.targetId,
          event: message.method,
          params: message.params || {},
        });
      }
      return;
    }
    if (this.modeConfig.captureScripts && message.method === 'Debugger.scriptParsed') {
      const s = this.sessions.get(message.sessionId);
      if (s) this._recordScriptParsed(s, message.params);
      return;
    }
    if (this.overrideEngine && message.method === 'Fetch.requestPaused') {
      const s = this.sessions.get(message.sessionId);
      if (s && !s.closed) this.track(this._handleFetchPaused(s, message.params || {}));
      return;
    }
    this.recorder.record(message);
  }

  async _handleFetchPaused(session, params) {
    const requestId = params.requestId;
    if (!requestId) return;
    const isResponseStage = params.responseStatusCode !== undefined || params.responseErrorReason !== undefined;
    const fallbackContinue = async () => {
      if (session.closed) return;
      try {
        if (isResponseStage) await this.client.send('Fetch.continueResponse', { requestId }, session.id);
        else await this.client.send('Fetch.continueRequest', { requestId }, session.id);
      } catch (e) {
        if (!closed(e)) this.diagnose('override-continue-failed', e, session);
      }
    };

    try {
      if (this.stopping || params.responseErrorReason) { await fallbackContinue(); return; }
      const url = params.request?.url || '';
      const isScript = String(params.resourceType || '').toLowerCase() === 'script';
      const rule = this.overrideEngine.match(url, params.resourceType);
      const shouldStripScript = this.overrideEngine.stripScriptDebugger && isScript;
      if (!rule && !shouldStripScript) { await fallbackContinue(); return; }

      let originalBuf = null;
      const needsOriginalBody = !rule || (!rule.filePath && rule.staticBody === null);
      if (needsOriginalBody) {
        const res = await this.client.send('Fetch.getResponseBody', { requestId }, session.id);
        if (typeof res?.body !== 'string') { await fallbackContinue(); return; }
        originalBuf = Buffer.from(res.body, res.base64Encoded ? 'base64' : 'utf8');
      }
      const { bodyBuffer, replacementsApplied, strippedDebuggers, modified } = this.overrideEngine.applyRule(rule, originalBuf, { isScript });
      if (!modified) { await fallbackContinue(); return; }

      const responseHeaders = this.overrideEngine.sanitizeHeaders(params.responseHeaders, rule?.contentType || null, bodyBuffer.length);
      await this.client.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: rule?.statusCode || params.responseStatusCode || 200,
        responseHeaders,
        body: bodyBuffer.toString('base64'),
      }, session.id);
      this.coverage(rule ? 'override-applied' : 'script-debugger-stripped', {
        sessionId: session.id,
        targetId: session.info.targetId,
        rule: rule ? rule.name : 'strip-script-debugger',
        urlContext: urlContext(url),
        originalBytes: originalBuf ? originalBuf.length : null,
        replacedBytes: bodyBuffer.length,
        replacementsApplied,
        strippedDebuggers,
      });
    } catch (e) {
      if (!closed(e)) this.diagnose('override-apply-failed', e, session);
      await fallbackContinue();
    }
  }

  async resume(s, force = false) {
    if ((!s.waiting && !force) || s.closed) return;
    try { await this.client.send('Runtime.runIfWaitingForDebugger', {}, s.id); s.waiting = false; s.resumed = true; }
    catch (e) { if (closed(e)) { s.closed = true; s.waiting = false; } else { this.diagnose('resume-failed', e, s); throw e; } }
  }

  _saveWasmBinary(record) {
    if (record.phase !== 'wasm_module' || typeof record.wasmBase64 !== 'string' || !record.wasmBase64.length) return record;
    const { wasmBase64, ...rest } = record;
    try {
      const buf = Buffer.from(wasmBase64, 'base64');
      const sha256 = createHash('sha256').update(buf).digest('hex');
      let relFile = this.savedWasmHashes.get(sha256);
      if (!relFile) {
        if (this.totalWasmBytes + buf.length > MAX_TOTAL_SCRIPT_BYTES) {
          return { ...rest, sha256, bytes: buf.length, wasmFile: null, reason: 'wasm-budget-exhausted' };
        }
        const dir = path.join(this.outDir, 'wasm');
        fs.mkdirSync(dir, { recursive: true });
        const filename = `${sha256.slice(0, 12)}.wasm`;
        relFile = path.join('wasm', filename);
        const abs = path.join(dir, filename);
        if (!fs.existsSync(abs)) {
          const fd = fs.openSync(abs, 'wx');
          try { fs.writeFileSync(fd, buf); fs.fsyncSync(fd); }
          finally { fs.closeSync(fd); }
        }
        this.savedWasmHashes.set(sha256, relFile);
        this.totalWasmBytes += buf.length;
      }
      return { ...rest, sha256, bytes: buf.length, wasmFile: relFile };
    } catch (e) {
      this.diagnose('wasm-save-failed', e);
      return { ...rest, wasmFile: null };
    }
  }

  _buildHookOptions(id, s, generation) {
    return {
      runId: this.runId,
      storeKey: this.storeKey,
      generation,
      enableRuntime: this.runtimeEnable,
      stealth: this.modeConfig.stealthHook,
      captureStack: this.modeConfig.captureStack,
      deepHooks: this.modeConfig.deepHooks,
      enabledHooks: this.enabledHooks,
      stripDebugger: this.stripDebugger,
      filter: { sameOrigin: false, captureAllPaths: true },
      deferCurrentEvaluation: true,
      bindingName: '__bc_' + this.runId.replace(/-/g, '').slice(0, 12) + '_g' + generation,
      onHandle: h => { s.hook = h; },
      onError: e => this.diagnose('hook-error', e, s),
      onUncertainRegistration: e => this.uncertainScripts.add(id + ':' + e.commandId),
      onRecord: record => {
        if (this.outputClosed) return;
        const normalized = this._saveWasmBinary(record);
        if (this.extraSinks.runtime && ['runtime_console', 'runtime_exception', 'runtime_rejection'].includes(normalized.phase)) {
          this.extraSinks.runtime.append({
            at: normalized.recordedAt?.wallTimeMs ? new Date(normalized.recordedAt.wallTimeMs).toISOString() : new Date().toISOString(),
            sessionId: id,
            targetId: s.info.targetId,
            targetType: s.info.type,
            event: normalized.phase,
            ...normalized,
          });
          return;
        }
        this.hookSink.append({ ...normalized, targetId: s.info.targetId, targetType: s.info.type });
        if (normalized.phase === 'hook_ready' && s.documentId !== normalized.documentId) {
          s.businessHookObserved = false; s.transports = new Set();
        }
        if (normalized.transport && !s.transports.has(normalized.transport)) {
          s.transports.add(normalized.transport); s.businessHookObserved = true; this.update();
        }
        if (normalized.phase === 'hook_ready') {
          s.documentHookObserved = true; s.documentId = normalized.documentId;
          this.documents.add(`${id}:${normalized.documentId}`);
          this.update({ lastDocument: { documentId: normalized.documentId, sessionId: id, frameId: normalized.frameId || null, contextId: normalized.contextId || null } });
        }
      },
    };
  }

  enable(id, info, waiting = false) {
    const old = this.sessions.get(id);
    if (old) { if (waiting && !old.resumed) old.waiting = true; return old.promise; }
    const s = { id, info, waiting, network: false, domStorage: false, debuggerEnabled: false, hookRegistered: false, closed: false, installationAttempts: 1, transports: new Set() };
    s.armed = new Promise(resolve => { s.resolveArmed = resolve; });
    this.sessions.set(id, s);
    const duplicate = this.targets.get(info.targetId);
    if (!duplicate) this.targets.set(info.targetId, s);
    s.promise = (async () => {
      try {
        if (duplicate) { await duplicate.armed; return; }
        if (this.stopping || !TYPES.includes(info.type)) return;
        this.coverage('target-attached', { mode: this.mode, sessionId: id, targetId: info.targetId, targetType: info.type, waitingForDebugger: waiting, urlContext: urlContext(info.url) });
        if (info.type === 'tab') {
          await this.client.send('Target.setAutoAttach', auto(true), id);
          this.coverage('tab-container-armed', { sessionId: id, targetId: info.targetId, coverage: 'recursive-container-only' });
          return;
        }
        this.recorder.addSession(id, info);
        try { await this.client.send('Network.enable', { maxPostDataSize: 16 * 1024 * 1024 }, id); s.network = true; }
        catch (e) { if (closed(e)) { s.closed = true; return; } this.diagnose('network-unavailable', e, s); s.networkError = e; }
        if (this.stopping) return;
        if (this.overrideEngine) {
          try { await this.client.send('Network.setCacheDisabled', { cacheDisabled: true }, id); s.cacheDisabled = true; }
          catch (e) { if (!closed(e)) this.diagnose('cache-disable-unavailable', e, s); }
          try { await this.client.send('Fetch.enable', { patterns: this.overrideEngine.cdpPatterns }, id); s.fetchEnabled = true; }
          catch (e) { if (!closed(e)) this.diagnose('fetch-override-unavailable', e, s); }
        }
        if (this.stopping) return;
        // Recursive autoattach handles OOPIFs and workers, before the parent resumes.
        try { await this.client.send('Target.setAutoAttach', auto(true), id); }
        catch (e) { this.diagnose('recursive-autoattach-unavailable', e, s); }
        if (this.stopping) return;

        if (['page', 'iframe'].includes(info.type)) {
          if (this.modeConfig.domStorage) {
            try { await this.client.send('DOMStorage.enable', {}, id); s.domStorage = true; }
            catch (e) { if (!closed(e)) this.diagnose('domstorage-unavailable', e, s); }
          }
          if (this.stopping) return;
          if (this.modeConfig.debugger) {
            try {
              await this.client.send('Debugger.enable', {}, id);
              s.debuggerEnabled = true;
              await this.client.send('Debugger.setSkipAllPauses', { skip: true }, id);
              if (this.asyncStackDepth > 0) {
                await this.client.send('Debugger.setAsyncCallStackDepth', { maxDepth: this.asyncStackDepth }, id);
              }
            } catch (e) {
              if (!closed(e)) this.diagnose('debugger-unavailable', e, s);
            }
          }
          if (this.stopping) return;
          if (this.hookEnabled) {
            const generation = ++this.nextGeneration;
            s.options = this._buildHookOptions(id, s, generation);
            try { s.hook = await this.installHook(this.client, id, s.options); s.hookRegistered = !!s.hook?.registered; }
            catch (e) {
              s.hookError = e;
              if (['CDP_TIMEOUT', 'CDP_COMMAND_CANCELLED', 'CDP_SESSION_CLOSED', 'CDP_DISCONNECTED'].includes(e.code) && ['Page.addScriptToEvaluateOnNewDocument', 'Runtime.addBinding'].includes(e.method)) {
                this.uncertainScripts.add(id + ':' + e.commandId);
              }
              this.diagnose('CDP-only', e, s, { reason: 'document-hook-install-failed' });
            }
          } else {
            this.coverage('stealth-cdp-only', { sessionId: id, targetId: info.targetId, targetType: info.type, reason: this.modeConfig.hook ? 'hooks-disabled-by-option' : 'stealth-mode-no-js-hook' });
          }
        } else {
          // Worker / ServiceWorker / SharedWorker: in deep mode arm Debugger (and Runtime only when --with-runtime is set).
          if (this.runtimeEnable) {
            try { await this.client.send('Runtime.enable', {}, id); }
            catch (e) { if (!closed(e)) this.diagnose('worker-runtime-unavailable', e, s); }
          }
          if (this.stopping) return;
          if (this.modeConfig.debugger) {
            try {
              await this.client.send('Debugger.enable', {}, id);
              s.debuggerEnabled = true;
              await this.client.send('Debugger.setSkipAllPauses', { skip: true }, id);
              if (this.asyncStackDepth > 0) {
                await this.client.send('Debugger.setAsyncCallStackDepth', { maxDepth: this.asyncStackDepth }, id);
              }
            } catch (e) {
              if (!closed(e)) this.diagnose('worker-debugger-unavailable', e, s);
            }
          }
          this.coverage('CDP-only', { sessionId: id, reason: 'worker-no-document', targetType: info.type, debuggerEnabled: s.debuggerEnabled });
        }
        this.coverage('target-armed', {
          mode: this.mode,
          sessionId: id,
          targetId: info.targetId,
          targetType: info.type,
          networkEnabled: s.network,
          domStorageEnabled: s.domStorage,
          debuggerEnabled: s.debuggerEnabled,
          hookRegistered: s.hookRegistered,
          documentHookObserved: !!s.documentHookObserved,
          coverage: s.hookRegistered ? 'document-start-registered' : this.hookEnabled ? 'CDP-only' : (this.modeConfig.debugger ? 'cdp-debugger' : 'stealth-cdp'),
        });
      } finally {
        s.resolveArmed();
        await this.resume(s, true);
        if (duplicate && !s.closed) {
          await this.client.send('Target.detachFromTarget', { sessionId: id }).catch(e => { if (!closed(e)) this.coverage('duplicate-detach-failed', { sessionId: id }); });
        }
      }
      if (!duplicate && !this.stopping && !s.closed && s.info.type !== 'tab' && (!s.network || (this.hookEnabled && s.options && !s.hookRegistered))) {
        await this.recover(s, 'initial-install-failed');
      }
      if (!duplicate && !this.stopping && !s.closed && this.hookEnabled && s.hookRegistered) {
        try {
          const result = await this.client.send('Runtime.evaluate', { expression: createPageHookRuntime(s.options), returnByValue: true }, id);
          if (result.exceptionDetails) throw Error('Hook evaluation exception');
        } catch (e) { this.diagnose('current-document-evaluation-failed', e, s); }
      }
    })();
    return s.promise;
  }

  scheduleRecovery(s, reason, epoch) {
    if (this.stopping || s.closed || !['page', 'iframe'].includes(s.info.type) || s.recoveryEpoch === epoch) return;
    s.recoveryEpoch = epoch; s.recoveryAttempts = 0;
    this.track(Promise.resolve(s.promise).then(() => {
      const needsHook = this.hookEnabled && !s.hookRegistered;
      if (!s.network || needsHook) return this.recover(s, reason);
    }));
  }

  async recover(s, reason) {
    if (this.stopping || s.closed || s.recovering || (s.recoveryAttempts || 0) >= 2) return;
    s.recovering = true; s.installationAttempts++; s.recoveryAttempts = (s.recoveryAttempts || 0) + 1;
    try {
      this.coverage('target-recovery-start', { sessionId: s.id, targetId: s.info.targetId, reason, attempt: s.installationAttempts, urlContext: urlContext(s.info.url) });
      await this.resume(s, true);
      if (!s.network) {
        try { await this.client.send('Network.enable', { maxPostDataSize: 16 * 1024 * 1024 }, s.id); s.network = true; }
        catch (e) { this.diagnose('network-retry-failed', e, s); }
      }
      if (this.stopping) return;
      if (this.hookEnabled && s.options && !s.hookRegistered) {
        if (s.hook) {
          const result = await s.hook.uninstall();
          this.coverage('hook-cleanup-result', { sessionId: s.id, targetId: s.info.targetId, cleanupComplete: result?.cleanupComplete, dataComplete: result?.dataComplete, cleanupErrors: result?.coverage?.cleanupErrors || [] });
          if (result?.cleanupComplete === false || result?.dataComplete === false) {
            this.coverage('retry-cleanup-incomplete', { sessionId: s.id, targetId: s.info.targetId });
            return;
          }
          s.hook = null;
        }
        if (this.stopping) return;
        const generation = ++this.nextGeneration;
        s.options = { ...s.options, generation, bindingName: '__bc_' + this.runId.replace(/-/g, '').slice(0, 12) + '_g' + generation };
        try { s.hook = await this.installHook(this.client, s.id, s.options); s.hookRegistered = !!s.hook?.registered; }
        catch (e) {
          s.hookError = e;
          if (['CDP_TIMEOUT', 'CDP_COMMAND_CANCELLED', 'CDP_SESSION_CLOSED', 'CDP_DISCONNECTED'].includes(e.code) && ['Page.addScriptToEvaluateOnNewDocument', 'Runtime.addBinding'].includes(e.method)) {
            this.uncertainScripts.add(s.id + ':' + e.commandId);
          }
          this.diagnose('hook-retry-failed', e, s);
        }
      }
      this.coverage('target-recovery-result', { sessionId: s.id, targetId: s.info.targetId, attempt: s.installationAttempts, networkEnabled: s.network, hookRegistered: s.hookRegistered });
      if (this.hookEnabled && s.hookRegistered && reason !== 'initial-install-failed') {
        await this.client.send('Runtime.evaluate', { expression: createPageHookRuntime(s.options), returnByValue: true }, s.id);
      }
    } catch (e) { this.diagnose('target-recovery-failed', e, s); }
    finally { s.recovering = false; await this.resume(s); this.update(); }
  }

  async attach(info) {
    if (this.targets.has(info.targetId)) { const s = this.targets.get(info.targetId); await s.promise; return s; }
    if (this.attachments.has(info.targetId)) return this.attachments.get(info.targetId);
    const p = (async () => {
      const r = await this.client.send('Target.attachToTarget', { targetId: info.targetId, flatten: true });
      await this.enable(r.sessionId, info);
      return this.targets.get(info.targetId);
    })();
    this.attachments.set(info.targetId, p);
    return p.finally(() => this.attachments.delete(info.targetId));
  }

  async start() {
    this.client.on('event', this.event); this.client.on('close', this.disconnected); this.client.on('lateResponse', this.lateResponse);
    await this.client.send('Target.setAutoAttach', auto(true, this.rootTabMode));
    await this.client.send('Target.setDiscoverTargets', { discover: true, filter: FILTER });
    const result = await this.client.send('Target.getTargets', { filter: FILTER });
    if (!(result.targetInfos || []).some(info => info.type === 'tab')) {
      this.rootTabMode = false;
      this.coverage('page-root-compatibility-mode');
      await this.client.send('Target.setAutoAttach', auto(true));
    }
    await Promise.all((result.targetInfos || []).filter(info => TYPES.includes(info.type)).map(async info => {
      try { await this.attach(info); } catch (e) { if (!closed(e)) throw e; }
    }));
    for (;;) { const tasks = [...this.tasks]; if (!tasks.length) break; await Promise.all(tasks); }
    if (this.fatal) throw this.fatal;
    this.update({ collectorArmed: true });
    return this;
  }

  async newTab(url) {
    if (!this.state.collectorArmed || this.stopping) throw Error('Collector is not armed');
    if (url && !['http:', 'https:'].includes(new URL(url).protocol)) throw Error('HTTP(S) navigation required');
    const { targetId } = await this.client.send('Target.createTarget', { url: 'about:blank' });
    const s = await this.attach({ targetId, type: 'page', url: 'about:blank' });
    if (!s?.network || (this.hookEnabled && !s.hookRegistered) || s.closed) {
      throw Error(this.hookEnabled ? 'New tab did not arm Network and document hook' : 'New tab did not arm Network');
    }
    let navigation = { navigationSent: false, navigationAcknowledged: false, documentHookObserved: !!s.documentHookObserved };
    if (url) {
      navigation.navigationSent = true; this.update({ navigationSent: true });
      navigation.navigationOutcome = 'acknowledgement-pending';
      const pending = this.client.send('Page.navigate', { url }, s.id).then(result => {
        if (result.errorText) throw Object.assign(Error('Navigation failed'), { code: 'NAVIGATION_FAILED' });
        this.update({ navigationAcknowledged: true, navigationOutcome: 'acknowledged', navigationError: null });
      }).catch(e => {
        const timeout = /timed out/i.test(e.message) || e.name === 'TimeoutError';
        const outcome = this.stopping ? 'stop-cancelled' : timeout ? 'acknowledgement-timeout' : 'navigation-error';
        this.update({ navigationOutcome: outcome, navigationError: !timeout && !this.stopping ? e.code || 'CDP_ERROR' : null });
        this.coverage(outcome, { targetId, code: e.code || 'CDP_ERROR' });
      }).finally(() => this.navigationTasks.delete(pending));
      this.navigationTasks.add(pending);
    }
    this.update({ lastTargetId: targetId, navigationSent: navigation.navigationSent, navigationAcknowledged: navigation.navigationAcknowledged });
    this.coverage('new-tab', { mode: this.mode, targetId, ...navigation, loaded: 'not-asserted' });
    return { targetId, mode: this.mode, collectorArmed: true, ...navigation, loaded: 'not-asserted' };
  }

  _selectLiveTarget(targetId) {
    if (targetId) {
      const s = this.targets.get(targetId);
      if (!s || s.closed) throw Object.assign(Error(`Target not found or closed: ${targetId}`), { code: 'TARGET_NOT_FOUND' });
      return s;
    }
    const pages = [...this.targets.values()].filter(s => !s.closed && s.info.type === 'page');
    if (!pages.length) throw Object.assign(Error('No live page target available'), { code: 'TARGET_NOT_FOUND' });
    return pages.at(-1);
  }

  async metrics(options = {}) {
    if (!this.state.collectorArmed || this.stopping) throw Error('Collector is not armed');
    const targets = options.targetId
      ? [this._selectLiveTarget(options.targetId)]
      : [...this.targets.values()].filter(s => !s.closed && ['page', 'iframe'].includes(s.info.type));
    const at = new Date().toISOString();
    const results = [];
    for (const s of targets) {
      let domCounters = null;
      let perfMetrics = null;
      try { domCounters = await this.client.send('Memory.getDOMCounters', {}, s.id); } catch {}
      try {
        await this.client.send('Performance.enable', {}, s.id);
        const res = await this.client.send('Performance.getMetrics', {}, s.id);
        perfMetrics = Object.fromEntries((res?.metrics || []).map(m => [m.name, m.value]));
      } catch {}
      finally {
        await this.client.send('Performance.disable', {}, s.id).catch(() => {});
      }
      results.push({
        targetId: s.info.targetId,
        targetType: s.info.type,
        sessionId: s.id,
        urlContext: urlContext(s.info.url),
        domCounters,
        performance: perfMetrics,
      });
    }
    const record = { at, mode: this.mode, targets: results };
    const mSink = this._ensureLazySink('metrics', 'metrics.jsonl');
    mSink.append(record);
    return record;
  }

  async memorySample({ targetId, durationMs = 3000, samplingInterval = 32768, force = false } = {}) {
    if (!this.state.collectorArmed || this.stopping) throw Error('Collector is not armed');
    if (!this.modeConfig.allowMemorySample && !force) {
      throw Object.assign(
        Error('memory-sample is disabled in stealth mode to avoid HeapProfiler footprint; use --mode standard/deep or pass --force'),
        { code: 'MODE_GUARD' },
      );
    }
    const dur = Math.min(Math.max(Number(durationMs) || 3000, 100), 60000);
    const interval = Math.max(Number(samplingInterval) || 32768, 1024);
    const s = this._selectLiveTarget(targetId);
    let profile;
    await this.client.send('HeapProfiler.enable', {}, s.id);
    try {
      await this.client.send('HeapProfiler.startSampling', { samplingInterval: interval }, s.id);
      await new Promise(r => setTimeout(r, dur));
      const res = await this.client.send('HeapProfiler.stopSampling', {}, s.id, { timeoutMs: 30000 });
      profile = res?.profile || null;
    } finally {
      await this.client.send('HeapProfiler.disable', {}, s.id).catch(() => {});
    }
    const dir = path.join(this.outDir, 'snapshots');
    fs.mkdirSync(dir, { recursive: true });
    const safeId = String(s.info.targetId).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 32);
    const filename = `alloc-${safeId}-${Date.now()}.heapprofile`;
    const abs = path.join(dir, filename);
    const payload = JSON.stringify(profile || {}, null, 2) + '\n';
    const fd = fs.openSync(abs, 'wx');
    try { fs.writeFileSync(fd, payload, 'utf8'); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    const rel = path.join('snapshots', filename);
    this.coverage('memory-sample-saved', { targetId: s.info.targetId, file: rel, durationMs: dur, bytes: Buffer.byteLength(payload) });
    return {
      mode: this.mode,
      targetId: s.info.targetId,
      sessionId: s.id,
      file: abs,
      relativeFile: rel,
      durationMs: dur,
      samplingInterval: interval,
      sampleCount: Array.isArray(profile?.samples) ? profile.samples.length : 0,
    };
  }

  async heapSnapshot({ targetId, force = false } = {}) {
    if (!this.state.collectorArmed || this.stopping) throw Error('Collector is not armed');
    if (!this.modeConfig.allowHeapSnapshot && !force) {
      throw Object.assign(
        Error('heap-snapshot pauses the renderer main thread (STW) and requires --mode deep (or pass --force to override)'),
        { code: 'MODE_GUARD' },
      );
    }
    const s = this._selectLiveTarget(targetId);
    const dir = path.join(this.outDir, 'snapshots');
    fs.mkdirSync(dir, { recursive: true });
    const safeId = String(s.info.targetId).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 32);
    const filename = `heap-${safeId}-${Date.now()}.heapsnapshot`;
    const abs = path.join(dir, filename);
    const fd = fs.openSync(abs, 'wx');
    let chunks = 0;
    let bytesWritten = 0;
    let writeErr = null;
    const onChunk = message => {
      if (message.method !== 'HeapProfiler.addHeapSnapshotChunk' || message.sessionId !== s.id) return;
      const chunk = message.params?.chunk;
      if (typeof chunk !== 'string' || writeErr) return;
      try {
        const buf = Buffer.from(chunk, 'utf8');
        fs.writeFileSync(fd, buf);
        bytesWritten += buf.length;
        chunks++;
      } catch (e) { writeErr = e; }
    };
    this.client.on('event', onChunk);
    try {
      await this.client.send('HeapProfiler.enable', {}, s.id);
      await this.client.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false }, s.id, { timeoutMs: 60000 });
      if (writeErr) throw writeErr;
      fs.fsyncSync(fd);
    } finally {
      this.client.off('event', onChunk);
      try { fs.closeSync(fd); } catch {}
      await this.client.send('HeapProfiler.disable', {}, s.id).catch(() => {});
    }
    const rel = path.join('snapshots', filename);
    this.coverage('heap-snapshot-saved', { targetId: s.info.targetId, file: rel, chunks, bytesWritten });
    return {
      mode: this.mode,
      targetId: s.info.targetId,
      sessionId: s.id,
      file: abs,
      relativeFile: rel,
      chunks,
      bytesWritten,
    };
  }

  stop(reason = 'stop.request') {
    if (this.stopPromise) return this.stopPromise;
    this.stopping = true; this.update({ collectorArmed: false });
    this.stopPromise = (async () => {
      const errors = [];
      const attempt = async (phase, work) => { try { return await work(); } catch (e) { if (!closed(e)) errors.push({ phase, ...commandDiagnostic(e) }); } };
      const quiesce = { ...auto(true), waitForDebuggerOnStart: false };
      await attempt('quiesce-root-autoattach', () => this.client.send('Target.setAutoAttach', { ...auto(true, this.rootTabMode), waitForDebuggerOnStart: false }));
      await Promise.all([...this.sessions.values()].map(async s => {
        if (!s.closed) {
          await attempt('resume', () => this.resume(s));
          await attempt('quiesce-child-autoattach', () => this.client.send('Target.setAutoAttach', quiesce, s.id));
        }
      }));
      const deadline = Date.now() + 15000;
      const drainTasks = async until => {
        while (this.tasks.size && Date.now() < until) {
          let timer;
          try { await Promise.race([Promise.allSettled([...this.tasks]), new Promise(resolve => { timer = setTimeout(resolve, Math.max(1, until - Date.now())); })]); }
          finally { clearTimeout(timer); }
        }
        return !this.tasks.size;
      };
      await drainTasks(deadline);
      if (this.tasks.size) errors.push({ phase: 'settle-installs', code: 'CLEANUP_TIMEOUT' });
      await Promise.all([...this.sessions.values()].map(async s => {
        await attempt('resume', () => this.resume(s));
        if (s.debuggerEnabled && !s.closed) await this.client.send('Debugger.disable', {}, s.id).catch(() => {});
        if (s.domStorage && !s.closed) await this.client.send('DOMStorage.disable', {}, s.id).catch(() => {});
        if (s.fetchEnabled && !s.closed) await this.client.send('Fetch.disable', {}, s.id).catch(() => {});
        if (s.cacheDisabled && !s.closed) await this.client.send('Network.setCacheDisabled', { cacheDisabled: false }, s.id).catch(() => {});
        if (s.hook) {
          const r = await attempt('uninstall-hook', () => s.hook.uninstall());
          this.coverage('hook-cleanup-result', { sessionId: s.id, targetId: s.info.targetId, cleanupComplete: r?.cleanupComplete, dataComplete: r?.dataComplete, cleanupErrors: r?.coverage?.cleanupErrors || [] });
          if (r?.dataComplete === false) this.fatal ||= Error('Hook data processing failed');
          if (r?.cleanupComplete === false) errors.push({ phase: 'uninstall-hook', code: 'CLEANUP_INCOMPLETE' });
        }
      }));
      let summary;
      try {
        summary = await this.recorder.stop({
          reason,
          incomplete: !!this.fatal,
          timeoutMs: 5000,
          beforeClose: async () => {
            for (const s of this.sessions.values()) s.detaching = true;
            await Promise.all([...this.sessions.values()].map(async s => { if (!s.closed) await attempt('disable-child-autoattach', () => this.client.send('Target.setAutoAttach', auto(false), s.id)); }));
            await attempt('disable-root-autoattach', () => this.client.send('Target.setAutoAttach', auto(false)));
            for (const s of this.sessions.values()) { await attempt('resume', () => this.resume(s)); this.client.cancelPendingForSession?.(s.id); }
            await Promise.allSettled([...this.navigationTasks]);
            if (!await drainTasks(Date.now() + 5000)) errors.push({ phase: 'settle-cancelled-installs', code: 'CLEANUP_TIMEOUT' });
            let detached = 0, failed = 0;
            for (const s of this.sessions.values()) if (!s.closed) { try { await this.client.send('Target.detachFromTarget', { sessionId: s.id }); detached++; } catch (e) { if (!closed(e)) failed++; } }
            this.client.off('lateResponse', this.lateResponse);
            if (!await drainTasks(Date.now() + 5000)) errors.push({ phase: 'late-cleanup-drain', code: 'CLEANUP_TIMEOUT' });
            return { detached, failed, timedOut: false };
          },
        });
      } catch (e) { summary = e.captureSummary; errors.push({ phase: 'recorder-stop', code: e.code || 'OUTPUT_ERROR' }); }
      if (this.uncertainScripts.size) errors.push({ phase: 'late-script-registration', code: 'UNCONFIRMED_SCRIPT_CLEANUP' });
      this.client.off('lateResponse', this.lateResponse);
      this.client.off('event', this.event); this.client.off('close', this.disconnected);
      this.outputClosed = true;
      const hook = this.hookSink.close();
      const coverage = this.coverageSink.close();
      const storage = this.storageSink.close();
      const dataStreams = { cdp: summary?.dataStreams || {}, hook, coverage, storage };
      for (const [name, s] of Object.entries(this.extraSinks)) dataStreams[name] = s.close();
      const states = Object.values(dataStreams);
      return {
        mode: this.mode,
        reason,
        recorder: summary,
        dataStreams,
        streamsClosed: states.every(s => s.close === 'succeeded'),
        dataFlushed: states.every(s => s.write === 'succeeded' && s.fsync === 'succeeded' && s.close === 'succeeded'),
        cleanupComplete: !errors.length && summary?.cleanupComplete === true,
        captureStatus: summary?.status || 'incomplete',
        errors,
      };
    })();
    return this.stopPromise;
  }
}

module.exports = { Collector, TYPES, FILTER, auto, sink };
