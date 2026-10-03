// Zero-dependency HTML helpers for site-audit. The site's HTML is hand-written
// in a consistent style, so targeted tag scanning is enough (research.md R2).

import { readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

/** Recursively list *.html files under dir. */
export function listHtmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listHtmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out.sort();
}

/** 1-based line number of a character index. */
export function lineOf(html, index) {
  let line = 1;
  for (let i = 0; i < index && i < html.length; i++) if (html[i] === '\n') line++;
  return line;
}

const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

export function parseAttrs(src) {
  const attrs = {};
  for (const m of src.matchAll(ATTR_RE)) {
    const name = m[1].toLowerCase();
    attrs[name] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

/** Remove comments, and the contents of <script>/<style>, keeping line positions. */
export function stripNonMarkup(html) {
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  return html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, a, b, c) => a + blank(b) + c)
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, a, b, c) => a + blank(b) + c);
}

/**
 * Find opening tags by name. Returns [{ attrs, line, index, inner }]; `inner` is
 * the text up to the matching close tag for non-void elements (non-nested match).
 */
export function findTags(html, tagName) {
  const clean = stripNonMarkup(html);
  const re = new RegExp(`<${tagName}(?=[\\s>/])([^>]*)>`, 'gi');
  const results = [];
  for (const m of clean.matchAll(re)) {
    const start = m.index + m[0].length;
    const close = clean.toLowerCase().indexOf(`</${tagName.toLowerCase()}>`, start);
    results.push({
      attrs: parseAttrs(m[1]),
      line: lineOf(clean, m.index),
      index: m.index,
      inner: close === -1 ? '' : html.slice(start, close),
    });
  }
  return results;
}

/** Visible text of an HTML fragment (tags removed, whitespace collapsed). */
export function textOf(fragment) {
  return stripNonMarkup(fragment).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Classify a reference found in href/src.
 * Returns { kind: 'external'|'anchor'|'absolute'|'file', path? }.
 */
export function resolveRef(fromFile, ref) {
  const value = ref.trim();
  if (/^(https:|mailto:|tel:|data:)/i.test(value)) return { kind: 'external' };
  if (value.startsWith('#') || value === '') return { kind: 'anchor' };
  if (value.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(value)) return { kind: 'absolute' };
  const clean = value.split('#')[0].split('?')[0];
  return { kind: 'file', path: resolve(dirname(fromFile), decodeURIComponent(clean)) };
}
