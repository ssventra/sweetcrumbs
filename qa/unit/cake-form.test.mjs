// US5 tests for the custom cake form helpers in site/js/form.js (task T049).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCake, buildCakePayload, buildCakeEmail, earliestCakeDate } from '../../site/js/form.js';

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
// Bakery-local "now": Wednesday 2026-10-07 at 10:00 → +72h = Saturday 2026-10-10
const now = { dayKey: 'wed', minutes: 600, ymd: '2026-10-07' };

const fields = {
  name: 'Jamie Rivera',
  email: 'jamie@example.com',
  phone: '(555) 987-6543',
  occasion: 'Birthday',
  pickupDate: '2026-10-10',
  servings: '15–20',
  flavor: 'Chocolate',
  flavorOther: '',
  filling: 'Raspberry',
  frosting: 'Buttercream',
  decoration: "Pastel sprinkles, gold '7' topper",
  cakeMessage: 'Happy 7th, Maya!',
  dietary: ['nut-free'],
  dietaryOther: '',
  budget: '$50–100',
  consent: 'yes',
  _gotcha: '',
};

test('earliestCakeDate is now + lead time, moved past closed days', () => {
  assert.equal(earliestCakeDate(business, now), '2026-10-10');
  // Friday 10:00 + 72h = Monday (closed) → Tuesday
  assert.equal(earliestCakeDate(business, { dayKey: 'fri', minutes: 600, ymd: '2026-10-09' }), '2026-10-13');
});

test('validateCake accepts a complete request', () => {
  assert.deepEqual(validateCake(fields, business, now), {});
});

test('validateCake: required fields', () => {
  const errors = validateCake({ ...fields, name: '', email: '', phone: '', pickupDate: '', servings: '', flavor: '', consent: '' }, business, now);
  for (const key of ['name', 'email', 'pickupDate', 'servings', 'flavor', 'consent']) assert.ok(errors[key], `${key} required`);
});

test('validateCake: "Other" flavor needs a description', () => {
  assert.ok(validateCake({ ...fields, flavor: 'Other', flavorOther: '' }, business, now).flavorOther);
  assert.deepEqual(validateCake({ ...fields, flavor: 'Other', flavorOther: 'Earl Grey' }, business, now), {});
});

test('validateCake: too soon → earliest valid date and a call-us note', () => {
  const msg = validateCake({ ...fields, pickupDate: '2026-10-09' }, business, now).pickupDate;
  assert.match(msg, /Sat, Oct 10/);
  assert.match(msg, /call us for urgent orders/i);
});

test('validateCake: closed weekday and past dates are rejected', () => {
  assert.match(validateCake({ ...fields, pickupDate: '2026-10-12' }, business, now).pickupDate, /closed/i);
  assert.match(validateCake({ ...fields, pickupDate: '2026-10-01' }, business, now).pickupDate, /past/i);
});

test('validateCake: length limits', () => {
  assert.ok(validateCake({ ...fields, name: 'x'.repeat(81) }, business, now).name);
  assert.ok(validateCake({ ...fields, decoration: 'x'.repeat(301) }, business, now).decoration);
  assert.ok(validateCake({ ...fields, cakeMessage: 'x'.repeat(61) }, business, now).cakeMessage);
  assert.ok(validateCake({ ...fields, dietaryOther: 'x'.repeat(201) }, business, now).dietaryOther);
});

test('buildCakePayload matches contracts/outbound-messages.md §2', () => {
  const payload = buildCakePayload(fields);
  assert.deepEqual(Object.keys(payload), [
    '_subject', '_replyto', '_gotcha', 'name', 'email', 'phone', 'occasion', 'pickupDate', 'servings',
    'flavor', 'filling', 'frosting', 'decoration', 'cakeMessage', 'dietary', 'budget', 'consent',
  ]);
  assert.deepEqual(payload, {
    _subject: 'Custom cake request — Birthday — pickup 2026-10-10',
    _replyto: 'jamie@example.com',
    _gotcha: '',
    name: 'Jamie Rivera',
    email: 'jamie@example.com',
    phone: '(555) 987-6543',
    occasion: 'Birthday',
    pickupDate: '2026-10-10',
    servings: '15–20',
    flavor: 'Chocolate',
    filling: 'Raspberry',
    frosting: 'Buttercream',
    decoration: "Pastel sprinkles, gold '7' topper",
    cakeMessage: 'Happy 7th, Maya!',
    dietary: 'nut-free',
    budget: '$50–100',
    consent: 'yes',
  });
});

test('buildCakePayload: empty optionals as "", Other flavor and extra dietary text combined', () => {
  const p = buildCakePayload({ ...fields, occasion: '', filling: '', flavor: 'Other', flavorOther: 'Earl Grey', dietary: ['vegan', 'nut-free'], dietaryOther: 'no coconut', phone: '' });
  assert.equal(p.occasion, '');
  assert.equal(p.filling, '');
  assert.equal(p.phone, '');
  assert.equal(p.flavor, 'Other: Earl Grey');
  assert.equal(p.dietary, 'vegan, nut-free; no coconut');
  assert.equal(p._subject, 'Custom cake request — Cake — pickup 2026-10-10');
});

test('buildCakeEmail matches §3: labelled lines, "(not specified)", closing sentence', () => {
  const email = buildCakeEmail({ ...fields, filling: '', budget: '' }, business);
  assert.equal(email.subject, 'Custom cake request — Birthday — pickup 2026-10-10');
  assert.equal(
    email.body,
    [
      'Name: Jamie Rivera',
      'Email: jamie@example.com',
      'Phone: (555) 987-6543',
      'Occasion: Birthday',
      'Pickup date: Saturday, Oct 10 (2026-10-10)',
      'Servings: 15–20',
      'Flavor: Chocolate',
      'Filling: (not specified)',
      'Frosting: Buttercream',
      "Decoration: Pastel sprinkles, gold '7' topper",
      'Message on cake: Happy 7th, Maya!',
      'Dietary needs: nut-free',
      'Budget: (not specified)',
      'Agreed to be contacted: Yes',
      '',
      'I understand this is a request and will wait for your confirmation and quote.',
    ].join('\r\n'),
  );
  assert.ok(email.href.startsWith('mailto:hello@sweetcrumb.example?subject=Custom%20cake%20request'));
});
