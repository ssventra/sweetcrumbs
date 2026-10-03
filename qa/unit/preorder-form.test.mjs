// US4 tests for pickup slots, validation, and the pre-order email (task T040).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickupSlots, validatePreorder, buildPreorderEmail, MAILTO_LIMIT } from '../../site/js/form.js';

const business = {
  name: 'Sweet Crumb Bakery',
  email: 'hello@sweetcrumb.example',
  hours: {
    mon: null,
    tue: { open: '07:00', close: '15:00' },
    wed: { open: '07:00', close: '15:00' },
    thu: { open: '07:00', close: '15:00' },
    fri: { open: '07:00', close: '15:00' },
    sat: { open: '07:00', close: '16:00' },
    sun: { open: '08:00', close: '14:00' },
  },
  leadTimes: { preorderHours: 24, cakeHours: 72 },
};
// Bakery-local "now": Friday 2026-10-09 at 09:00
const now = { dayKey: 'fri', minutes: 9 * 60, ymd: '2026-10-09' };
const values = (slots) => slots.map((s) => s.value);

const line = (id, name, priceCents, qty, unit = 'each', status = 'available') => ({
  id, qty, status, item: { id, name, priceCents, unit }, lineCents: priceCents * qty,
});
const lines = [line('sour', 'Country Sourdough', 700, 2, 'per loaf'), line('cookie', 'Chocolate Chip Cookie', 250, 6)];
const fields = {
  customerName: 'Jamie Rivera',
  email: 'jamie@example.com',
  phone: '(555) 987-6543',
  pickupDate: '2026-10-10',
  pickupTime: '09:30',
  notes: 'Sliced sourdough, please.',
};

test('pickupSlots: 30-minute slots from open to close − 30 min', () => {
  const slots = pickupSlots(business, '2026-10-13', now); // Tuesday
  assert.equal(slots[0].value, '07:00');
  assert.equal(slots[0].label, '7:00 AM');
  assert.equal(slots.at(-1).value, '14:30');
  assert.equal(slots.length, 16);
});

test('pickupSlots: only slots at least the lead time ahead', () => {
  // Saturday 2026-10-10: now + 24h = Sat 09:00
  assert.equal(values(pickupSlots(business, '2026-10-10', now))[0], '09:00');
  // Tomorrow before the lead time window, today, and the past → none
  assert.deepEqual(pickupSlots(business, '2026-10-09', now), []);
  assert.deepEqual(pickupSlots(business, '2026-10-01', now), []);
});

test('pickupSlots: none on a closed day', () => {
  assert.deepEqual(pickupSlots(business, '2026-10-12', now), []); // Monday
});

test('validatePreorder accepts a complete request', () => {
  assert.deepEqual(validatePreorder(fields, { business, now, lines }), {});
});

test('validatePreorder: name 1–80 chars, email or phone required, formats checked', () => {
  const ctx = { business, now, lines };
  assert.ok(validatePreorder({ ...fields, customerName: '  ' }, ctx).customerName);
  assert.ok(validatePreorder({ ...fields, customerName: 'x'.repeat(81) }, ctx).customerName);
  const none = validatePreorder({ ...fields, email: '', phone: '' }, ctx);
  assert.ok(none.email && !none.phone, 'missing contact is reported once, on email');
  assert.ok(validatePreorder({ ...fields, email: 'not-an-email' }, ctx).email);
  assert.ok(validatePreorder({ ...fields, email: '', phone: '12345' }, ctx).phone);
  assert.deepEqual(validatePreorder({ ...fields, email: '', phone: '555-9876' }, ctx), {});
});

test('validatePreorder: pickup date must be an open day with slots; time from the slot list', () => {
  const ctx = { business, now, lines };
  assert.ok(validatePreorder({ ...fields, pickupDate: '' }, ctx).pickupDate);
  assert.match(validatePreorder({ ...fields, pickupDate: '2026-10-12' }, ctx).pickupDate, /closed/i);
  assert.match(validatePreorder({ ...fields, pickupDate: '2026-10-01' }, ctx).pickupDate, /past/i);
  assert.ok(validatePreorder({ ...fields, pickupTime: '08:30' }, ctx).pickupTime, '08:30 Saturday is inside the 24h lead time');
  assert.ok(validatePreorder({ ...fields, pickupTime: '' }, ctx).pickupTime);
});

test('validatePreorder: notes ≤ 500 chars and at least one available item', () => {
  assert.ok(validatePreorder({ ...fields, notes: 'x'.repeat(501) }, { business, now, lines }).notes);
  const soldOnly = [line('x', 'X', 100, 1, 'each', 'soldOut')];
  assert.ok(validatePreorder(fields, { business, now, lines: soldOnly }).items);
});

test('buildPreorderEmail matches the contract format exactly', () => {
  const all = [...lines, line('gone', 'Old Item', 100, 1, 'each', 'removed')];
  const email = buildPreorderEmail({ lines: all, fields, business });
  assert.equal(email.subject, 'Pre-order request — Jamie Rivera — pickup Sat, Oct 10 at 9:30 AM');
  assert.equal(
    email.body,
    [
      'Hello Sweet Crumb Bakery,',
      '',
      "I'd like to pre-order the following for pickup on Saturday, Oct 10 at 9:30 AM:",
      '',
      '- 2 × Country Sourdough ($7.00 per loaf) = $14.00',
      '- 6 × Chocolate Chip Cookie ($2.50 each) = $15.00',
      '',
      'Estimated total: $29.00 (before tax; payment at pickup)',
      '',
      'Name: Jamie Rivera',
      'Email: jamie@example.com',
      'Phone: (555) 987-6543',
      'Notes: Sliced sourdough, please.',
      '',
      'I understand this is a request and will wait for your confirmation.',
    ].join('\r\n'),
  );
  assert.equal(email.truncated, false);
  assert.ok(email.href.startsWith('mailto:hello@sweetcrumb.example?subject='));
  assert.ok(decodeURIComponent(email.href).includes('Country Sourdough'));
  assert.ok(!email.body.includes('Old Item'), 'removed items are left out');
});

test('buildPreorderEmail applies the 1,800-character mailto length guard', () => {
  const many = Array.from({ length: 40 }, (_, i) => line(`i${i}`, `Very Long Pastry Name Number ${i}`, 450, 3));
  const email = buildPreorderEmail({ lines: many, fields, business });
  assert.equal(email.truncated, true);
  assert.ok(email.href.length <= MAILTO_LIMIT);
  assert.match(email.body, /Full list: please paste from the website \(Copy summary\)\./);
  assert.ok(email.full.includes('Very Long Pastry Name Number 39'), 'full text is kept for the copy panel');
});
