// US1 tests for filterItems in site/js/filters.js (task T020).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterItems } from '../../site/js/filters.js';

const items = [
  { id: 'sour', name: 'Country Sourdough', description: 'Tangy crumb', category: 'breads', group: 'breads' },
  { id: 'choc-cake', name: 'Chocolate Layer Cake', description: 'Ganache', category: 'cakes', group: 'cakes' },
  { id: 'cookie', name: 'Chip Cookie', description: 'Dark CHOCOLATE chunks', category: 'cookies', group: 'cookies' },
  { id: 'croissant', name: 'Butter Croissant', description: 'Flaky', category: 'pastries', group: 'pastries' },
  { id: 'pie', name: 'Apple Pie', description: 'Seasonal', category: 'pies', group: 'other' },
];
const ids = (list) => list.map((i) => i.id);

test('category "all" with no query returns everything in order', () => {
  assert.deepEqual(ids(filterItems(items, { category: 'all', query: '' })), ['sour', 'choc-cake', 'cookie', 'croissant', 'pie']);
});

test('a single category returns only that category', () => {
  assert.deepEqual(ids(filterItems(items, { category: 'pastries', query: '' })), ['croissant']);
});

test('"other" returns unknown-category items', () => {
  assert.deepEqual(ids(filterItems(items, { category: 'other', query: '' })), ['pie']);
});

test('query matches name, description, or category, ignoring case and surrounding spaces', () => {
  assert.deepEqual(ids(filterItems(items, { category: 'all', query: '  CHOC ' })), ['choc-cake', 'cookie']);
  assert.deepEqual(ids(filterItems(items, { category: 'all', query: 'flaky' })), ['croissant']);
  assert.deepEqual(ids(filterItems(items, { category: 'all', query: 'bread' })), ['sour']);
});

test('category and query combine with AND', () => {
  assert.deepEqual(ids(filterItems(items, { category: 'cookies', query: 'choc' })), ['cookie']);
  assert.deepEqual(ids(filterItems(items, { category: 'breads', query: 'choc' })), []);
});

test('no matches returns an empty list; missing options mean no filtering', () => {
  assert.deepEqual(filterItems(items, { category: 'all', query: 'zzz' }), []);
  assert.equal(filterItems(items).length, items.length);
});
