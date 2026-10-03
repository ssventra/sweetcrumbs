// US4 tests for the cart in site/js/cart.js (task T039).
// Read rules (corrupt data, clamping on read, blocked reads) are tested in site.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCart, reconcile, totals } from '../../site/js/cart.js';
import { PREORDER_KEY } from '../../site/js/site.js';

function memoryStorage(initial = null, { failWrites = false } = {}) {
  const data = new Map(initial === null ? [] : [[PREORDER_KEY, initial]]);
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem(k, v) {
      if (failWrites) throw new Error('QuotaExceededError');
      data.set(k, String(v));
    },
    removeItem(k) {
      if (failWrites) throw new Error('SecurityError');
      data.delete(k);
    },
  };
}
const saved = (s) => JSON.parse(s.data.get(PREORDER_KEY));
const item = (id, extra = {}) => ({ id, name: id.toUpperCase(), priceCents: 250, unit: 'each', soldOut: false, ...extra });

test('empty storage → empty cart, no notice', () => {
  const cart = createCart(memoryStorage());
  assert.deepEqual(cart.items(), []);
  assert.equal(cart.notice, null);
});

test('createCart exposes the notice from readSavedPreorder', () => {
  assert.equal(createCart(memoryStorage('{oops')).notice, 'restore-failed');
});

test('add: new item → qty 1, again → 2; saves version 1 with updatedAt', () => {
  const s = memoryStorage();
  const cart = createCart(s);
  assert.deepEqual(cart.add(item('a')), { ok: true, qty: 1, capped: false });
  assert.deepEqual(cart.add(item('a')), { ok: true, qty: 2, capped: false });
  const value = saved(s);
  assert.equal(value.version, 1);
  assert.deepEqual(value.items, [{ id: 'a', qty: 2 }]);
  assert.ok(!Number.isNaN(Date.parse(value.updatedAt)));
});

test('add at 99 stays at 99 and reports capped', () => {
  const cart = createCart(memoryStorage(JSON.stringify({ version: 1, items: [{ id: 'a', qty: 99 }] })));
  assert.deepEqual(cart.add(item('a')), { ok: true, qty: 99, capped: true });
  assert.deepEqual(cart.items(), [{ id: 'a', qty: 99 }]);
});

test('add rejects sold-out and unknown items', () => {
  const cart = createCart(memoryStorage());
  assert.deepEqual(cart.add(item('a', { soldOut: true })), { ok: false, reason: 'sold-out' });
  assert.deepEqual(cart.add(undefined), { ok: false, reason: 'unknown' });
  assert.deepEqual(cart.items(), []);
});

test('setQty clamps to 1–99', () => {
  const cart = createCart(memoryStorage());
  cart.add(item('a'));
  cart.setQty('a', 0);
  assert.equal(cart.items()[0].qty, 1);
  cart.setQty('a', 150);
  assert.equal(cart.items()[0].qty, 99);
  cart.setQty('a', 7);
  assert.equal(cart.items()[0].qty, 7);
});

test('remove and clear (clear removes the key)', () => {
  const s = memoryStorage();
  const cart = createCart(s);
  cart.add(item('a'));
  cart.add(item('b'));
  cart.remove('a');
  assert.deepEqual(cart.items(), [{ id: 'b', qty: 1 }]);
  cart.clear();
  assert.deepEqual(cart.items(), []);
  assert.equal(s.data.has(PREORDER_KEY), false);
});

test('storage that throws on write → list keeps working in memory, notice not-saved', () => {
  const cart = createCart(memoryStorage(null, { failWrites: true }));
  assert.deepEqual(cart.add(item('a')), { ok: true, qty: 1, capped: false });
  cart.add(item('a'));
  assert.deepEqual(cart.items(), [{ id: 'a', qty: 2 }]);
  assert.equal(cart.notice, 'not-saved');
});

test('reconcile marks available, sold-out, and removed entries', () => {
  const menuItems = [item('a', { priceCents: 700, unit: 'per loaf' }), item('b', { soldOut: true })];
  const lines = reconcile([{ id: 'a', qty: 2 }, { id: 'b', qty: 1 }, { id: 'gone', qty: 3 }], menuItems);
  assert.deepEqual(lines.map((l) => [l.id, l.status]), [['a', 'available'], ['b', 'soldOut'], ['gone', 'removed']]);
  assert.equal(lines[0].lineCents, 1400);
  assert.equal(lines[0].item.unit, 'per loaf');
  assert.equal(lines[2].item, null);
});

test('totals uses integer cents and excludes unavailable lines', () => {
  const menuItems = [item('a', { priceCents: 375 }), item('b', { priceCents: 250 }), item('c', { soldOut: true, priceCents: 999 })];
  const lines = reconcile([{ id: 'a', qty: 3 }, { id: 'b', qty: 6 }, { id: 'c', qty: 1 }, { id: 'x', qty: 2 }], menuItems);
  assert.deepEqual(totals(lines), { cents: 1125 + 1500, count: 9 });
});
