// US3 tests: specials, featured, hours rows, open status (task T031).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specialsFor, featured } from '../../site/js/menu.js';
import { hoursRows, openStatus } from '../../site/js/site.js';

const item = (id, extra = {}) => ({ id, soldOut: false, featured: false, specialDays: [], ...extra });
const items = [
  item('daily', { specialDays: ['daily'] }),
  item('sat-only', { specialDays: ['sat'] }),
  item('sold-special', { specialDays: ['daily'], soldOut: true }),
  item('feat-a', { featured: true }),
  item('feat-sold', { featured: true, soldOut: true }),
  item('plain'),
  item('feat-b', { featured: true }),
];
const ids = (list) => list.map((i) => i.id);

const hours = {
  mon: null,
  tue: { open: '07:00', close: '15:00' },
  wed: { open: '07:00', close: '15:00' },
  thu: { open: '07:00', close: '15:00' },
  fri: { open: '07:00', close: '15:00' },
  sat: { open: '07:00', close: '16:00' },
  sun: { open: '08:00', close: '14:00' },
};

test('specialsFor includes daily items and items for that day, excluding sold out', () => {
  assert.deepEqual(ids(specialsFor(items, 'sat')), ['daily', 'sat-only']);
  assert.deepEqual(ids(specialsFor(items, 'tue')), ['daily']);
  assert.deepEqual(specialsFor([item('x')], 'tue'), []);
});

test('featured returns featured, not-sold-out items in file order', () => {
  assert.deepEqual(ids(featured(items)), ['feat-a', 'feat-b']);
});

test('hoursRows: seven rows Mon→Sun, closed days, 12-hour times, one today row', () => {
  const rows = hoursRows(hours, 'sat');
  assert.deepEqual(rows.map((r) => r.dayKey), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  assert.equal(rows[0].text, 'Closed');
  assert.equal(rows[0].closed, true);
  assert.equal(rows[1].text, '7:00 AM – 3:00 PM');
  assert.equal(rows[5].text, '7:00 AM – 4:00 PM');
  assert.deepEqual(rows.filter((r) => r.isToday).map((r) => r.dayKey), ['sat']);
});

test('openStatus covers open, before opening, after closing, and a closed day', () => {
  assert.deepEqual(openStatus(hours, { dayKey: 'tue', minutes: 10 * 60 }), { open: true, text: 'Open now — until 3:00 PM' });
  assert.equal(openStatus(hours, { dayKey: 'tue', minutes: 6 * 60 }).text, 'Closed now — opens today at 7:00 AM');
  assert.equal(openStatus(hours, { dayKey: 'tue', minutes: 16 * 60 }).text, 'Closed now — opens tomorrow at 7:00 AM');
  assert.equal(openStatus(hours, { dayKey: 'sun', minutes: 15 * 60 }).text, 'Closed now — opens Tue at 7:00 AM');
  assert.equal(openStatus(hours, { dayKey: 'mon', minutes: 10 * 60 }).text, 'Closed now — opens tomorrow at 7:00 AM');
});
