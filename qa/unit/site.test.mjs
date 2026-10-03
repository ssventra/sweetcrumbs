// Foundation tests for site/js/site.js (tasks T018).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPrice,
  toCents,
  bakeryNow,
  isOpenAt,
  normalizeMenu,
  readSavedPreorder,
  PREORDER_KEY,
  PLACEHOLDER_IMAGE,
} from '../../site/js/site.js';

const stub = (value, { throws = false } = {}) => ({
  getItem(key) {
    if (throws) throw new Error('SecurityError');
    return key === PREORDER_KEY ? value : null;
  },
});

test('formatPrice formats integer cents as USD', () => {
  assert.equal(formatPrice(450), '$4.50');
  assert.equal(formatPrice(4200), '$42.00');
  assert.equal(formatPrice(0), '$0.00');
});

test('toCents converts dollars without floating-point drift', () => {
  assert.equal(toCents(4.5), 450);
  assert.equal(toCents(2.675), 268);
  assert.equal(toCents(3.75), 375);
  assert.equal(toCents(0.1 + 0.2), 30);
});

test('bakeryNow uses the bakery time zone, not the machine clock', () => {
  // 2026-10-03T14:30:00Z is a Saturday: 10:30 in New York, 23:30 in Tokyo
  const date = new Date('2026-10-03T14:30:00Z');
  assert.deepEqual(bakeryNow('America/New_York', date), { dayKey: 'sat', minutes: 10 * 60 + 30, ymd: '2026-10-03' });
  assert.deepEqual(bakeryNow('Asia/Tokyo', date), { dayKey: 'sat', minutes: 23 * 60 + 30, ymd: '2026-10-03' });
  // 2026-10-04T02:00:00Z: still Saturday evening in New York, already Sunday in Tokyo
  const late = new Date('2026-10-04T02:00:00Z');
  assert.equal(bakeryNow('America/New_York', late).dayKey, 'sat');
  assert.equal(bakeryNow('Asia/Tokyo', late).dayKey, 'sun');
});

test('isOpenAt: open at opening time, closed at closing time, closed on null days', () => {
  const hours = { mon: null, tue: { open: '07:00', close: '15:00' } };
  assert.equal(isOpenAt(hours, 'tue', 7 * 60), true);
  assert.equal(isOpenAt(hours, 'tue', 15 * 60 - 1), true);
  assert.equal(isOpenAt(hours, 'tue', 15 * 60), false);
  assert.equal(isOpenAt(hours, 'tue', 6 * 60 + 59), false);
  assert.equal(isOpenAt(hours, 'mon', 10 * 60), false);
  assert.equal(isOpenAt(hours, 'wed', 10 * 60), false);
});

test('normalizeMenu applies defaults, cents, groups, and the placeholder image', () => {
  const { items } = normalizeMenu({
    business: { name: 'x' },
    items: [
      { id: 'a', name: 'A', category: 'breads', price: 4.5, image: 'assets/img/a.webp', imageAlt: 'A loaf' },
      { id: 'b', name: 'B', category: 'pies', price: 3 },
    ],
  });
  const [a, b] = items;
  assert.equal(a.priceCents, 450);
  assert.equal(a.group, 'breads');
  assert.equal(a.image, 'assets/img/a.webp');
  assert.equal(a.imageAlt, 'A loaf');
  assert.deepEqual(
    { soldOut: b.soldOut, featured: b.featured, allergens: b.allergens, specialDays: b.specialDays },
    { soldOut: false, featured: false, allergens: [], specialDays: [] },
  );
  assert.equal(b.group, 'other');
  assert.equal(b.image, PLACEHOLDER_IMAGE);
  assert.equal(b.imageAlt, '');
});

test('readSavedPreorder: absent key → empty, no notice', () => {
  assert.deepEqual(readSavedPreorder(stub(null)), { items: [], notice: null });
});

test('readSavedPreorder: corrupt or unknown data → restore-failed', () => {
  for (const raw of ['{not json', JSON.stringify({ version: 2, items: [] }), JSON.stringify({ version: 1, items: 'x' })]) {
    assert.deepEqual(readSavedPreorder(stub(raw)), { items: [], notice: 'restore-failed' });
  }
});

test('readSavedPreorder: merges duplicates, clamps qty to 1–99, drops bad ids', () => {
  const raw = JSON.stringify({
    version: 1,
    items: [
      { id: 'a', qty: 60 },
      { id: 'a', qty: 60 },
      { id: 'b', qty: 0 },
      { id: 'c', qty: 'lots' },
      { id: 42, qty: 1 },
      { id: 'd', qty: 2.6 },
    ],
    updatedAt: '2026-10-03T00:00:00Z',
  });
  assert.deepEqual(readSavedPreorder(stub(raw)), {
    items: [
      { id: 'a', qty: 99 },
      { id: 'b', qty: 1 },
      { id: 'c', qty: 1 },
      { id: 'd', qty: 3 },
    ],
    notice: null,
  });
});

test('readSavedPreorder: storage that throws (or is missing) → not-saved', () => {
  assert.deepEqual(readSavedPreorder(stub(null, { throws: true })), { items: [], notice: 'not-saved' });
  assert.deepEqual(readSavedPreorder(null), { items: [], notice: 'not-saved' });
});
