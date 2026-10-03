#!/usr/bin/env node
// bakery-qa: menu-check
// Validates site/data/menu.json against contracts/menu.schema.json (structure)
// plus the semantic rules in contracts/qa-cli.md. Node built-ins only.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReport, cannotRun } from './lib/report.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const NAME = 'menu-check';

export const KNOWN_CATEGORIES = ['breads', 'pastries', 'cakes', 'cookies'];
export const KNOWN_ALLERGENS = ['milk', 'eggs', 'wheat', 'soy', 'peanuts', 'tree-nuts', 'sesame'];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMAGE_RE = /^assets\/img\/[a-z0-9-]+\.webp$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9()+\-. ]{7,20}$/;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';
const isNonEmptyStr = (v) => isStr(v) && v.length > 0;

/**
 * Validate a parsed menu object. Returns nothing; findings go to `report`.
 * `siteDir` is used to check that image files exist.
 */
export function checkMenu(menu, report, { siteDir = SITE } = {}) {
  const err = report.error.bind(report);
  const warn = report.warn.bind(report);

  const allowOnly = (obj, allowed, where) => {
    for (const key of Object.keys(obj)) {
      if (!allowed.includes(key)) err(where, `unknown field "${key}" (allowed: ${allowed.join(', ')})`);
    }
  };

  if (!isObj(menu)) {
    err('menu', 'the file must contain a JSON object with "business" and "items"');
    return;
  }
  allowOnly(menu, ['business', 'items'], 'menu');

  // ---- business -----------------------------------------------------------
  const b = menu.business;
  if (!isObj(b)) {
    err('business', 'missing or not an object');
  } else {
    allowOnly(b, ['name', 'tagline', 'phone', 'email', 'address', 'map', 'timeZone', 'hours', 'leadTimes', 'cakeFormEndpoint', 'announcement'], 'business');
    for (const f of ['name', 'tagline', 'phone', 'email', 'address', 'map', 'timeZone', 'hours', 'leadTimes']) {
      if (!(f in b)) err('business', `missing required field "${f}"`);
    }
    if ('name' in b && !isNonEmptyStr(b.name)) err('business.name', 'must be non-empty text');
    if ('tagline' in b && !isNonEmptyStr(b.tagline)) err('business.tagline', 'must be non-empty text');
    if ('phone' in b && !(isStr(b.phone) && PHONE_RE.test(b.phone))) err('business.phone', `"${b.phone}" is not a valid phone number (7–20 digits/spaces/()+-.)`);
    if ('email' in b && !(isStr(b.email) && EMAIL_RE.test(b.email))) err('business.email', `"${b.email}" is not a valid email address`);

    if ('address' in b) {
      if (!isObj(b.address)) err('business.address', 'must be an object');
      else {
        allowOnly(b.address, ['street', 'city', 'region', 'postalCode'], 'business.address');
        for (const f of ['street', 'city', 'region', 'postalCode']) {
          if (!isNonEmptyStr(b.address[f])) err('business.address', `"${f}" is required text`);
        }
      }
    }

    if ('map' in b) {
      if (!isObj(b.map)) err('business.map', 'must be an object');
      else {
        allowOnly(b.map, ['lat', 'lon', 'zoom'], 'business.map');
        const { lat, lon, zoom } = b.map;
        if (typeof lat !== 'number' || lat < -90 || lat > 90) err('business.map.lat', 'must be a number between -90 and 90');
        if (typeof lon !== 'number' || lon < -180 || lon > 180) err('business.map.lon', 'must be a number between -180 and 180');
        if (zoom !== undefined && !(Number.isInteger(zoom) && zoom >= 1 && zoom <= 19)) err('business.map.zoom', 'must be a whole number from 1 to 19');
      }
    }

    if ('timeZone' in b) {
      let ok = isNonEmptyStr(b.timeZone);
      if (ok) {
        try {
          new Intl.DateTimeFormat('en-US', { timeZone: b.timeZone });
        } catch {
          ok = false;
        }
      }
      if (!ok) err('business.timeZone', `"${b.timeZone}" is not a valid time zone (example: "America/New_York")`);
    }

    if ('hours' in b) {
      if (!isObj(b.hours)) err('business.hours', 'must be an object with mon…sun');
      else {
        allowOnly(b.hours, DAYS, 'business.hours');
        let openDays = 0;
        for (const d of DAYS) {
          const where = `business.hours.${d}`;
          if (!(d in b.hours)) {
            err('business.hours', `missing "${d}" (use null for a closed day)`);
            continue;
          }
          const h = b.hours[d];
          if (h === null) continue;
          if (!isObj(h)) {
            err(where, 'must be null (closed) or { "open": "HH:MM", "close": "HH:MM" }');
            continue;
          }
          allowOnly(h, ['open', 'close'], where);
          const okOpen = isStr(h.open) && TIME_RE.test(h.open);
          const okClose = isStr(h.close) && TIME_RE.test(h.close);
          if (!okOpen) err(where, `open "${h.open}" must be 24-hour "HH:MM"`);
          if (!okClose) err(where, `close "${h.close}" must be 24-hour "HH:MM"`);
          if (okOpen && okClose) {
            if (h.open >= h.close) err(where, `open ${h.open} must be earlier than close ${h.close}`);
            else openDays++;
          }
        }
        if (openDays === 0) err('business.hours', 'at least one day must be open');
      }
    }

    if ('leadTimes' in b) {
      if (!isObj(b.leadTimes)) err('business.leadTimes', 'must be an object');
      else {
        allowOnly(b.leadTimes, ['preorderHours', 'cakeHours'], 'business.leadTimes');
        for (const f of ['preorderHours', 'cakeHours']) {
          const v = b.leadTimes[f];
          if (!(Number.isInteger(v) && v >= 0)) err(`business.leadTimes.${f}`, 'must be a whole number of hours (0 or more)');
        }
      }
    }

    if ('cakeFormEndpoint' in b) {
      const v = b.cakeFormEndpoint;
      if (!(isStr(v) && (v === '' || v.startsWith('https://')))) err('business.cakeFormEndpoint', 'must be "" or an https:// address');
    }
    if ('announcement' in b && !(isStr(b.announcement) && b.announcement.length <= 280)) {
      err('business.announcement', 'must be text of at most 280 characters');
    }
  }

  // ---- items --------------------------------------------------------------
  if (!Array.isArray(menu.items)) {
    err('items', 'missing or not a list');
    return;
  }
  const seenIds = new Map();
  const categoryCounts = Object.fromEntries(KNOWN_CATEGORIES.map((c) => [c, 0]));

  menu.items.forEach((item, i) => {
    const label = isObj(item) && isStr(item.name) ? `items[${i}] "${item.name}"` : `items[${i}]`;
    if (!isObj(item)) {
      err(label, 'must be an object');
      return;
    }
    allowOnly(item, ['id', 'name', 'category', 'description', 'price', 'unit', 'image', 'imageAlt', 'allergens', 'soldOut', 'featured', 'specialDays'], label);
    for (const f of ['id', 'name', 'category', 'price']) {
      if (!(f in item)) err(label, `missing required field "${f}"`);
    }

    if ('id' in item) {
      if (!(isStr(item.id) && ID_RE.test(item.id))) err(label, `id "${item.id}" must be lowercase words joined by hyphens (e.g. "rye-loaf")`);
      else if (seenIds.has(item.id)) err(label, `id "${item.id}" is already used by items[${seenIds.get(item.id)}]; ids must be unique`);
      else seenIds.set(item.id, i);
    }
    if ('name' in item && !(isNonEmptyStr(item.name) && item.name.length <= 60)) err(label, 'name must be 1–60 characters');
    if ('category' in item) {
      if (!isNonEmptyStr(item.category)) err(label, 'category must be text');
      else if (!KNOWN_CATEGORIES.includes(item.category)) warn(label, `unknown category "${item.category}" (will show under "Other"; known: ${KNOWN_CATEGORIES.join(', ')})`);
      else categoryCounts[item.category]++;
    }
    if ('description' in item && !(isStr(item.description) && item.description.length <= 200)) err(label, 'description must be text of at most 200 characters');
    if ('price' in item) {
      const p = item.price;
      if (typeof p !== 'number' || !Number.isFinite(p) || p <= 0) err(label, `price ${JSON.stringify(p)} must be a number greater than 0`);
      else if (Math.abs(p * 100 - Math.round(p * 100)) > 1e-6) err(label, `price ${p} has more than 2 decimal places`);
    }
    if ('unit' in item && !(isStr(item.unit) && item.unit.length <= 24)) err(label, 'unit must be text of at most 24 characters');
    if ('image' in item) {
      if (!(isStr(item.image) && IMAGE_RE.test(item.image))) err(label, `image "${item.image}" must look like "assets/img/name.webp"`);
      else if (!existsSync(join(siteDir, item.image))) err(label, `image file site/${item.image} does not exist`);
      if (!isNonEmptyStr(item.imageAlt)) err(label, 'imageAlt (a short description of the photo) is required when image is set');
    } else if ('imageAlt' in item && !isNonEmptyStr(item.imageAlt)) {
      err(label, 'imageAlt must be non-empty text');
    }
    if ('allergens' in item) {
      if (!Array.isArray(item.allergens) || !item.allergens.every(isNonEmptyStr)) err(label, 'allergens must be a list of words');
      else {
        if (new Set(item.allergens).size !== item.allergens.length) err(label, 'allergens contains duplicates');
        for (const a of item.allergens) {
          if (!KNOWN_ALLERGENS.includes(a)) warn(label, `unknown allergen "${a}" (will show as a plain badge; known: ${KNOWN_ALLERGENS.join(', ')})`);
        }
      }
    }
    for (const f of ['soldOut', 'featured']) {
      if (f in item && typeof item[f] !== 'boolean') err(label, `${f} must be true or false`);
    }
    if ('specialDays' in item) {
      const sd = item.specialDays;
      if (!Array.isArray(sd) || !sd.every((d) => d === 'daily' || DAYS.includes(d))) err(label, 'specialDays must be a list of "daily" or "mon"…"sun"');
      else {
        if (new Set(sd).size !== sd.length) err(label, 'specialDays contains duplicates');
        if (sd.includes('daily') && sd.length > 1) err(label, 'specialDays cannot mix "daily" with day names');
      }
    }
    if (item.featured === true && item.soldOut === true) warn(label, 'is featured but sold out, so it will be hidden from the Home page');
  });

  for (const [cat, n] of Object.entries(categoryCounts)) {
    if (n === 0) warn('items', `no items in category "${cat}" (the Menu page will say "Nothing here today")`);
  }
  return { itemCount: menu.items.length };
}

/** Parse JSON, turning a SyntaxError into a friendly message with line/column. */
export function parseMenuText(text) {
  try {
    return { menu: JSON.parse(text) };
  } catch (e) {
    let msg = e.message;
    const pos = /position (\d+)/.exec(msg);
    if (pos && !/line \d+/.test(msg)) {
      const idx = Number(pos[1]);
      const before = text.slice(0, idx);
      const line = before.split('\n').length;
      const col = idx - before.lastIndexOf('\n');
      msg += ` (line ${line} column ${col})`;
    }
    return { error: msg };
  }
}

function main() {
  const path = resolve(process.argv[2] ?? join(SITE, 'data', 'menu.json'));
  if (!existsSync(path)) cannotRun(NAME, `file not found: ${path}`);
  const { menu, error } = parseMenuText(readFileSync(path, 'utf8'));
  if (error) cannotRun(NAME, `${path} is not valid JSON: ${error}`);
  const report = createReport(NAME);
  const result = checkMenu(menu, report, { siteDir: SITE });
  report.summary(result ? `${result.itemCount} items` : '');
  process.exit(report.exitCode());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
