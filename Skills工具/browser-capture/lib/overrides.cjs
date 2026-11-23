'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { fail } = require('./loopback.cjs');
const { stripDebuggerStatements } = require('./strip-debugger.cjs');

const STRIP_HEADERS = new Set(['content-length', 'content-encoding', 'etag', 'content-md5']);

function globToRegExp(pattern) {
  const escaped = String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp('^' + escaped + '$');
}

function loadOverrideEngine(configPath, { stripScriptDebugger = false } = {}) {
  if (!configPath && !stripScriptDebugger) return null;

  let absConfig = null;
  const rules = [];

  if (configPath) {
    absConfig = path.resolve(configPath);
    if (!fs.existsSync(absConfig)) fail('OVERRIDE_FILE_NOT_FOUND', `Override config not found: ${absConfig}`);
    let raw;
    try { raw = JSON.parse(fs.readFileSync(absConfig, 'utf8')); }
    catch (e) { fail('INVALID_OVERRIDE_CONFIG', `Invalid JSON in override config: ${e.message}`); }

    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.rules) ? raw.rules : null;
    if (!list || !list.length) fail('INVALID_OVERRIDE_CONFIG', 'Override config must be a non-empty array or { rules: [...] }');

    const baseDir = path.dirname(absConfig);
    list.forEach((item, idx) => {
      if (!item || typeof item !== 'object') fail('INVALID_OVERRIDE_CONFIG', `Override rule #${idx} must be an object`);
      const urlPattern = typeof item.urlPattern === 'string' && item.urlPattern.trim() ? item.urlPattern.trim() : null;
      if (!urlPattern) fail('INVALID_OVERRIDE_CONFIG', `Override rule #${idx} requires urlPattern`);
      const name = item.name ? String(item.name) : `rule-${idx + 1}`;
      const resourceType = item.resourceType ? String(item.resourceType) : null;
      const contentType = item.contentType ? String(item.contentType) : null;
      const statusCode = Number.isInteger(item.statusCode) ? item.statusCode : null;

      let filePath = null;
      let staticBody = null;
      if (typeof item.file === 'string' && item.file.trim()) {
        filePath = path.resolve(baseDir, item.file.trim());
        if (!fs.existsSync(filePath)) fail('OVERRIDE_FILE_NOT_FOUND', `Override rule "${name}" file not found: ${filePath}`);
      } else if (typeof item.body === 'string') {
        staticBody = item.body;
      }

      let replacements = null;
      if (Array.isArray(item.replace) && item.replace.length) {
        replacements = item.replace.map((r, rIdx) => {
          if (!r || typeof r !== 'object' || typeof r.with !== 'string') {
            fail('INVALID_OVERRIDE_CONFIG', `Override rule "${name}" replace #${rIdx} requires "with" string`);
          }
          if (typeof r.regex === 'string') {
            let compiled;
            try { compiled = new RegExp(r.regex, typeof r.flags === 'string' ? r.flags : 'g'); }
            catch (e) { fail('INVALID_OVERRIDE_CONFIG', `Override rule "${name}" invalid regex: ${e.message}`); }
            return { kind: 'regex', regex: compiled, replacement: r.with };
          }
          if (typeof r.match === 'string' && r.match.length) {
            return { kind: 'string', match: r.match, replacement: r.with };
          }
          fail('INVALID_OVERRIDE_CONFIG', `Override rule "${name}" replace #${rIdx} requires "match" or "regex"`);
        });
      }

      if (!filePath && staticBody === null && !replacements) {
        fail('INVALID_OVERRIDE_CONFIG', `Override rule "${name}" must specify "file", "body", or "replace"`);
      }

      rules.push({
        name,
        urlPattern,
        matcher: globToRegExp(urlPattern),
        resourceType,
        contentType,
        statusCode,
        filePath,
        staticBody,
        replacements,
      });
    });
  }

  const cdpPatterns = rules.map(r => ({
    urlPattern: r.urlPattern,
    ...(r.resourceType ? { resourceType: r.resourceType } : {}),
    requestStage: 'Response',
  }));
  if (stripScriptDebugger) {
    cdpPatterns.push({ urlPattern: '*', resourceType: 'Script', requestStage: 'Response' });
  }

  function match(url, resourceType) {
    for (const r of rules) {
      if (r.resourceType && resourceType && r.resourceType.toLowerCase() !== String(resourceType).toLowerCase()) continue;
      if (r.matcher.test(url)) return r;
    }
    return null;
  }

  function sanitizeHeaders(rawHeaders = [], contentTypeOverride = null, byteLength = null) {
    const out = [];
    let hasContentType = false;
    for (const h of rawHeaders || []) {
      const name = String(h?.name || '');
      if (!name) continue;
      const low = name.toLowerCase();
      if (STRIP_HEADERS.has(low)) continue;
      if (low === 'content-type') {
        hasContentType = true;
        out.push({ name, value: contentTypeOverride || String(h.value ?? '') });
      } else {
        out.push({ name, value: String(h.value ?? '') });
      }
    }
    if (contentTypeOverride && !hasContentType) {
      out.push({ name: 'Content-Type', value: contentTypeOverride });
    }
    if (Number.isSafeInteger(byteLength) && byteLength >= 0) {
      out.push({ name: 'Content-Length', value: String(byteLength) });
    }
    return out;
  }

  function applyRule(rule, originalBuf, { isScript = false } = {}) {
    let buf;
    let replacementsApplied = 0;
    let strippedDebuggers = 0;
    let modified = false;

    if (rule) {
      if (rule.filePath) {
        buf = fs.readFileSync(rule.filePath);
        modified = true;
      } else if (rule.staticBody !== null) {
        buf = Buffer.from(rule.staticBody, 'utf8');
        modified = true;
      } else {
        buf = originalBuf || Buffer.alloc(0);
      }
      if (rule.replacements) {
        let text = buf.toString('utf8');
        for (const rep of rule.replacements) {
          if (rep.kind === 'string') {
            if (text.includes(rep.match)) {
              const parts = text.split(rep.match);
              replacementsApplied += parts.length - 1;
              text = parts.join(rep.replacement);
              modified = true;
            }
          } else {
            rep.regex.lastIndex = 0;
            text = text.replace(rep.regex, (...args) => {
              replacementsApplied++;
              modified = true;
              return rep.replacement.replace(/\$\$|\$&|\$\d+/g, tok => {
                if (tok === '$$') return '$';
                if (tok === '$&') return args[0];
                const group = Number(tok.slice(1));
                return args[group] ?? '';
              });
            });
          }
        }
        buf = Buffer.from(text, 'utf8');
      }
    } else {
      buf = originalBuf || Buffer.alloc(0);
    }

    if (stripScriptDebugger && isScript) {
      const res = stripDebuggerStatements(buf.toString('utf8'));
      if (res.count > 0) {
        buf = Buffer.from(res.code, 'utf8');
        strippedDebuggers = res.count;
        modified = true;
      }
    }

    return { bodyBuffer: buf, replacementsApplied, strippedDebuggers, modified };
  }

  return {
    configPath: absConfig,
    stripScriptDebugger: !!stripScriptDebugger,
    rules,
    cdpPatterns,
    match,
    sanitizeHeaders,
    applyRule,
  };
}

module.exports = { loadOverrideEngine, globToRegExp, stripDebuggerStatements };
