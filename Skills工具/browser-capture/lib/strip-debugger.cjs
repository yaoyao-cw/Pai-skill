'use strict';

// Lexer-safe static `debugger` statement stripper.
// Replaces standalone `debugger` keyword statements with equal-length `void 0  ` (8 chars)
// so line numbers, column offsets, .length, and ASI/if-else grammar all remain intact,
// without ever modifying strings, template literals, comments, regexes, or property names.

const VALUE_KEYWORDS = new Set(['this', 'true', 'false', 'null', 'super', 'undefined']);
const REGEX_PRECEDING_KEYWORDS = new Set([
  'return', 'case', 'throw', 'typeof', 'void', 'delete', 'in', 'instanceof', 'new', 'else', 'do', 'yield', 'await', 'of',
]);
const REGEX_PRECEDING_PUNCT = new Set(['(', '[', '{', ',', ';', ':', '=', '!', '?', '&', '|', '^', '+', '-', '*', '%', '<', '>', '~', '\n']);

const isIdentStart = c => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36;
const isIdentPart = c => isIdentStart(c) || (c >= 48 && c <= 57);
const isWs = c => c === 32 || c === 9 || c === 10 || c === 13 || c === 12 || c === 11;

function stripDebuggerStatements(code) {
  if (typeof code !== 'string' || !code.includes('debugger')) {
    return { code, count: 0 };
  }
  const n = code.length;
  const out = [];
  let lastEmit = 0;
  let count = 0;
  let i = 0;
  let prevTokenKind = 'punct'; // 'punct' | 'dot' | 'ident' | 'value' | 'regex-ok-kw'
  let prevPunct = ';';
  const templateBraceDepth = [];

  const peekNextNonWs = pos => {
    let p = pos;
    let hasNewline = false;
    while (p < n) {
      const c = code.charCodeAt(p);
      if (isWs(c)) {
        if (c === 10 || c === 13) hasNewline = true;
        p++;
        continue;
      }
      if (c === 47 && p + 1 < n) {
        const next = code.charCodeAt(p + 1);
        if (next === 47) { p += 2; while (p < n && code.charCodeAt(p) !== 10) p++; continue; }
        if (next === 42) {
          p += 2;
          while (p + 1 < n && !(code.charCodeAt(p) === 42 && code.charCodeAt(p + 1) === 47)) {
            if (code.charCodeAt(p) === 10 || code.charCodeAt(p) === 13) hasNewline = true;
            p++;
          }
          p += 2;
          continue;
        }
      }
      return { ch: code[p], hasNewline };
    }
    return { ch: '', hasNewline };
  };

  const skipQuoted = quote => {
    i++;
    while (i < n) {
      const c = code.charCodeAt(i);
      if (c === 92) { i += 2; continue; } // backslash escape
      if (c === quote) { i++; break; }
      i++;
    }
    prevTokenKind = 'value';
  };

  const scanTemplateTail = () => {
    while (i < n) {
      const c = code.charCodeAt(i);
      if (c === 92) { i += 2; continue; }
      if (c === 96) { i++; prevTokenKind = 'value'; return; }
      if (c === 36 && i + 1 < n && code.charCodeAt(i + 1) === 123) {
        i += 2;
        templateBraceDepth.push(0);
        prevTokenKind = 'punct';
        prevPunct = '{';
        return;
      }
      i++;
    }
    prevTokenKind = 'value';
  };

  while (i < n) {
    const c = code.charCodeAt(i);

    if (isWs(c)) { i++; continue; }

    // Comments or regex or division
    if (c === 47) { // '/'
      const next = i + 1 < n ? code.charCodeAt(i + 1) : 0;
      if (next === 47) { // //
        i += 2;
        while (i < n && code.charCodeAt(i) !== 10) i++;
        continue;
      }
      if (next === 42) { // /*
        i += 2;
        while (i + 1 < n && !(code.charCodeAt(i) === 42 && code.charCodeAt(i + 1) === 47)) i++;
        i = Math.min(n, i + 2);
        continue;
      }
      const canBeRegex = prevTokenKind === 'regex-ok-kw'
        || (prevTokenKind === 'punct' && REGEX_PRECEDING_PUNCT.has(prevPunct));
      if (canBeRegex) {
        i++;
        let inClass = false;
        while (i < n) {
          const rc = code.charCodeAt(i);
          if (rc === 92) { i += 2; continue; }
          if (rc === 91) { inClass = true; i++; continue; }
          if (rc === 93) { inClass = false; i++; continue; }
          if (rc === 47 && !inClass) {
            i++;
            while (i < n && isIdentPart(code.charCodeAt(i))) i++;
            break;
          }
          if (rc === 10 || rc === 13) break;
          i++;
        }
        prevTokenKind = 'value';
        continue;
      }
      prevTokenKind = 'punct';
      prevPunct = '/';
      i++;
      continue;
    }

    // String literals
    if (c === 39 || c === 34) { skipQuoted(c); continue; }

    // Template literal start
    if (c === 96) { i++; scanTemplateTail(); continue; }

    // Braces (track nested template `${ ... }`)
    if (c === 123) { // '{'
      if (templateBraceDepth.length) templateBraceDepth[templateBraceDepth.length - 1]++;
      prevTokenKind = 'punct'; prevPunct = '{'; i++; continue;
    }
    if (c === 125) { // '}'
      if (templateBraceDepth.length) {
        if (templateBraceDepth[templateBraceDepth.length - 1] === 0) {
          templateBraceDepth.pop();
          i++;
          scanTemplateTail();
          continue;
        }
        templateBraceDepth[templateBraceDepth.length - 1]--;
      }
      prevTokenKind = 'punct'; prevPunct = '}'; i++; continue;
    }

    // Numbers
    if (c >= 48 && c <= 57) {
      i++;
      while (i < n && (isIdentPart(code.charCodeAt(i)) || code.charCodeAt(i) === 46)) i++;
      prevTokenKind = 'value';
      continue;
    }

    // Identifiers & keywords
    if (isIdentStart(c)) {
      const start = i;
      i++;
      while (i < n && isIdentPart(code.charCodeAt(i))) i++;
      const ident = code.slice(start, i);
      if (ident === 'debugger' && prevTokenKind !== 'dot') {
        const next = peekNextNonWs(i);
        // Guard against object literal property key `{ debugger: 1 }` and method `{ debugger() {} }`
        if (next.ch !== ':' && !(next.ch === '(' && !next.hasNewline)) {
          // Use `void 0  ` (8 chars) when followed by `;` (preserves `if (x) debugger; else y()`),
          // and `{      }` (8 chars empty BlockStatement) otherwise (immune to ASI hazards like `debugger\n(fn)()` or `debugger\n[1,2]`).
          const replacement = next.ch === ';' ? 'void 0  ' : '{      }';
          out.push(code.slice(lastEmit, start), replacement);
          lastEmit = i;
          count++;
          prevTokenKind = next.ch === ';' ? 'value' : 'punct';
          if (next.ch !== ';') prevPunct = '}';
          continue;
        }
      }
      if (REGEX_PRECEDING_KEYWORDS.has(ident)) prevTokenKind = 'regex-ok-kw';
      else if (VALUE_KEYWORDS.has(ident)) prevTokenKind = 'value';
      else prevTokenKind = 'ident';
      continue;
    }

    // Punctuation
    if (c === 46) { // '.'
      prevTokenKind = 'dot';
      prevPunct = '.';
      i++;
      continue;
    }
    if (c === 63 && i + 1 < n && code.charCodeAt(i + 1) === 46) { // '?.'
      prevTokenKind = 'dot';
      prevPunct = '.';
      i += 2;
      continue;
    }
    const ch = code[i];
    if (ch === ')' || ch === ']') {
      prevTokenKind = 'value';
    } else {
      prevTokenKind = 'punct';
      prevPunct = ch;
    }
    i++;
  }

  if (count === 0) return { code, count: 0 };
  out.push(code.slice(lastEmit));
  return { code: out.join(''), count };
}

module.exports = { stripDebuggerStatements };
