#!/usr/bin/env node
// bakery-qa: site-audit
// 1. Unit tests (node --test qa/unit/*.test.mjs)
// 2. Static audit of every site/**/*.html page (rules: contracts/qa-cli.md)
// 3. With --lighthouse: Lighthouse CI (lighthouserc.json)

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createReport, cannotRun } from './lib/report.mjs';
import { listHtmlFiles, findTags, textOf, resolveRef, stripNonMarkup, lineOf, parseAttrs } from './lib/html.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const IMG_DIR = join(SITE, 'assets', 'img');
const NAME = 'site-audit';
const RASTER = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff', '.avif', '.webp'];
const KB = 1024;

const rel = (p) => relative(ROOT, p);

// ---------------------------------------------------------------- unit tests
function runUnitTests() {
  const dir = join(ROOT, 'qa', 'unit');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).map((f) => join(dir, f)) : [];
  if (files.length === 0) {
    console.log('… unit tests: none yet');
    return true;
  }
  console.log(`… unit tests: ${files.length} file(s)`);
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=dot', ...files], { stdio: 'inherit', cwd: ROOT });
  return r.status === 0;
}

// -------------------------------------------------------------- static audit
function formatAddress(a) {
  return `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`;
}

function imageBudget(file, menuImages) {
  const name = basename(file);
  if (menuImages.has(name)) return { limit: 120 * KB, label: 'menu photo' };
  if (name.startsWith('hero-')) return { limit: 200 * KB, label: 'hero image' };
  return { limit: 150 * KB, label: 'image' };
}

function listFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

function auditImages(report, menuImages) {
  for (const file of listFiles(IMG_DIR)) {
    const ext = extname(file).toLowerCase();
    if (!RASTER.includes(ext)) continue;
    if (ext !== '.webp') {
      report.error(rel(file), `raster images must be WebP (found ${ext})`);
      continue;
    }
    const { limit, label } = imageBudget(file, menuImages);
    const size = statSync(file).size;
    if (size > limit) report.error(rel(file), `${label} is ${Math.round(size / KB)} KB; budget is ${limit / KB} KB`);
  }
}

function hasLabel(html, control) {
  const a = control.attrs;
  if (a['aria-label'] || a['aria-labelledby']) return true;
  if (a.id && new RegExp(`<label\\b[^>]*\\bfor\\s*=\\s*["']?${a.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\\s>]`, 'i').test(html)) return true;
  // Wrapped in a <label>: the nearest preceding <label> opens after the nearest preceding </label>.
  const before = html.slice(0, control.index).toLowerCase();
  return before.lastIndexOf('<label') > before.lastIndexOf('</label>');
}

function auditPage(file, menu, report) {
  const html = readFileSync(file, 'utf8');
  const clean = stripNonMarkup(html);
  const where = (line) => `${rel(file)}${line ? `:${line}` : ''}`;
  const isAbout = basename(file) === 'about.html';

  // Document metadata
  if (!/^\s*<!doctype html>/i.test(html)) report.error(where(1), 'must start with <!doctype html>');
  const htmlTag = findTags(html, 'html')[0];
  if (!htmlTag?.attrs.lang) report.error(where(htmlTag?.line), '<html> needs a lang attribute');
  const title = findTags(html, 'title')[0];
  if (!title || !textOf(title.inner)) report.error(where(), 'missing <title>');
  const metas = findTags(html, 'meta');
  if (!metas.some((m) => m.attrs.name === 'description' && m.attrs.content)) report.error(where(), 'missing meta description');
  if (!metas.some((m) => m.attrs.name === 'viewport' && /width=device-width/.test(m.attrs.content ?? ''))) report.error(where(), 'missing responsive viewport meta');

  // Landmarks and headings
  const h1s = findTags(html, 'h1');
  if (h1s.length !== 1) report.error(where(h1s[1]?.line), `must have exactly one <h1> (found ${h1s.length})`);
  for (const tag of ['header', 'nav', 'main', 'footer']) {
    if (findTags(html, tag).length === 0) report.error(where(), `missing <${tag}> landmark`);
  }
  const main = findTags(html, 'main')[0];
  if (main && main.attrs.id !== 'main') report.error(where(main.line), '<main> must have id="main" (skip link target)');
  const links = findTags(html, 'a');
  if (!links.some((a) => a.attrs.href === '#main')) report.error(where(), 'missing skip link to #main');

  // Images
  for (const img of findTags(html, 'img')) {
    const a = img.attrs;
    if (!('alt' in a)) report.error(where(img.line), `<img src="${a.src}"> missing alt`);
    if (!a.width || !a.height) report.error(where(img.line), `<img src="${a.src}"> needs width and height`);
    const eager = a.fetchpriority === 'high';
    if (!eager && a.loading !== 'lazy') report.error(where(img.line), `<img src="${a.src}"> must use loading="lazy" (only the fetchpriority="high" image may load eagerly)`);
    if (eager && a.loading === 'lazy') report.error(where(img.line), 'the fetchpriority="high" image must not be lazy-loaded');
  }

  // Scripts and inline handlers
  const scripts = findTags(html, 'script');
  let moduleScripts = 0;
  for (const s of scripts) {
    if (s.attrs.type === 'module') moduleScripts++;
    else if (!('defer' in s.attrs)) report.error(where(s.line), '<script> must be type="module" or use defer');
  }
  if (moduleScripts !== 1) report.error(where(), `must load exactly one module script (found ${moduleScripts})`);
  for (const m of clean.matchAll(/<[a-z][a-z0-9-]*\b([^>]*)>/gi)) {
    const attrs = parseAttrs(m[1]);
    for (const name of Object.keys(attrs)) {
      if (/^on[a-z]+$/.test(name)) report.error(where(lineOf(clean, m.index)), `inline event handler "${name}" is not allowed`);
    }
  }

  // References
  const checkRef = (ref, line) => {
    const r = resolveRef(file, ref);
    if (r.kind === 'absolute') report.error(where(line), `"${ref}" must be a relative URL (no leading "/" or non-https scheme)`);
    else if (r.kind === 'file' && !existsSync(r.path)) report.error(where(line), `"${ref}" points to a missing file`);
  };
  for (const tag of ['a', 'link', 'img', 'script', 'iframe', 'source']) {
    for (const t of findTags(html, tag)) {
      if (t.attrs.href !== undefined) checkRef(t.attrs.href, t.line);
      if (t.attrs.src !== undefined) checkRef(t.attrs.src, t.line);
      if (t.attrs.srcset) for (const c of t.attrs.srcset.split(',')) checkRef(c.trim().split(/\s+/)[0], t.line);
    }
  }

  // Stylesheet
  const sheets = findTags(html, 'link').filter((l) => (l.attrs.rel ?? '').split(/\s+/).includes('stylesheet'));
  if (sheets.length !== 1 || sheets[0].attrs.href !== 'css/styles.css') report.error(where(), 'must link exactly one stylesheet: css/styles.css');

  // No hard-coded menu items (constitution II); about.html's story may mention items
  let auditable = html;
  if (isAbout) {
    const story = findTags(html, 'section').find((s) => s.attrs.id === 'our-story');
    if (story) auditable = html.slice(0, story.index) + html.slice(story.index + story.inner.length);
  }
  const pageText = textOf(auditable).toLowerCase();
  for (const item of menu.items ?? []) {
    if (item.name && pageText.includes(item.name.toLowerCase())) {
      report.error(where(), `menu item "${item.name}" is written into the HTML; menu items must come from data/menu.json`);
    }
  }

  // Footer fallback must match business info exactly (FR-004, SC-009)
  const footer = findTags(html, 'footer')[0];
  if (footer && menu.business) {
    const ft = textOf(footer.inner);
    if (!ft.includes(menu.business.phone)) report.error(where(footer.line), `footer must contain the phone "${menu.business.phone}" exactly`);
    const addr = formatAddress(menu.business.address);
    if (!ft.includes(addr)) report.error(where(footer.line), `footer must contain the address "${addr}" exactly`);
  }

  // Form controls need labels
  for (const tag of ['input', 'select', 'textarea']) {
    for (const c of findTags(html, tag)) {
      const type = (c.attrs.type ?? '').toLowerCase();
      if (tag === 'input' && ['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;
      if (!hasLabel(clean, c)) report.error(where(c.line), `<${tag}${c.attrs.id ? ` id="${c.attrs.id}"` : ''}> has no associated <label>`);
    }
  }

  // Iframes
  for (const f of findTags(html, 'iframe')) {
    if (!f.attrs.title) report.error(where(f.line), '<iframe> needs a title');
    if (f.attrs.loading !== 'lazy') report.error(where(f.line), '<iframe> must use loading="lazy"');
  }
}

function staticAudit() {
  const report = createReport('static audit');
  const menuPath = join(SITE, 'data', 'menu.json');
  let menu = { items: [] };
  try {
    menu = JSON.parse(readFileSync(menuPath, 'utf8'));
  } catch (e) {
    cannotRun(NAME, `cannot read ${rel(menuPath)} (run npm run menu-check): ${e.message}`);
  }
  const menuImages = new Set((menu.items ?? []).filter((i) => i.image).map((i) => basename(i.image)));
  auditImages(report, menuImages);
  const pages = existsSync(SITE) ? listHtmlFiles(SITE) : [];
  if (pages.length === 0) cannotRun(NAME, 'no HTML pages found in site/');
  for (const page of pages) auditPage(page, menu, report);
  report.summary(`${pages.length} pages`);
  return report.exitCode() === 0;
}

// ---------------------------------------------------------------- lighthouse
function runLighthouse() {
  const bin = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'lhci.cmd' : 'lhci');
  if (!existsSync(bin)) cannotRun(NAME, 'Lighthouse CI is not installed; run npm ci first');
  console.log('… lighthouse: running Lighthouse CI (this takes a few minutes)');
  const r = spawnSync(bin, ['autorun'], { stdio: 'inherit', cwd: ROOT });
  if (r.error) cannotRun(NAME, r.error.message);
  return r.status === 0;
}

function main() {
  const withLighthouse = process.argv.includes('--lighthouse');
  const results = [];
  results.push(['unit tests', runUnitTests()]);
  results.push(['static audit', staticAudit()]);
  if (withLighthouse) results.push(['lighthouse', runLighthouse()]);
  const failed = results.filter(([, ok]) => !ok).map(([n]) => n);
  if (failed.length) {
    console.log(`✖ ${NAME}: failed: ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log(`✔ ${NAME}: ${results.map(([n]) => n).join(', ')} passed`);
}

main();
