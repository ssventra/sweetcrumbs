// US2 tests: run qa/menu-check.mjs against fixture files (task T026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'qa', 'menu-check.mjs');
const SEED = JSON.parse(readFileSync(join(ROOT, 'site', 'data', 'menu.json'), 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'menu-check-'));
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));

let n = 0;
function run(contents) {
  const file = join(dir, `menu-${++n}.json`);
  writeFileSync(file, typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2));
  const r = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}
const seed = () => structuredClone(SEED);

test('valid seed → exit 0', () => {
  const r = run(seed());
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /✔ menu-check/);
});

test('malformed JSON → exit 2 with the position', () => {
  const text = JSON.stringify(seed(), null, 2).replace('"price": 7,', '"price": 7');
  const r = run(text);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /line \d+ column \d+/);
});

const failing = [
  ['duplicate id', (m) => { m.items[1].id = m.items[0].id; }, /already used by items\[0\]/],
  ['price with 3 decimals', (m) => { m.items[0].price = 3.555; }, /more than 2 decimal places/],
  ['image without imageAlt', (m) => { delete m.items[0].imageAlt; }, /imageAlt .* is required/],
  ['missing sun in hours', (m) => { delete m.business.hours.sun; }, /missing "sun"/],
  ['open not before close', (m) => { m.business.hours.tue = { open: '15:00', close: '07:00' }; }, /must be earlier than close/],
  ['invalid time zone', (m) => { m.business.timeZone = 'Mars/Base'; }, /not a valid time zone/],
  ['daily mixed with weekdays', (m) => { m.items[0].specialDays = ['daily', 'mon']; }, /cannot mix "daily"/],
];

for (const [name, mutate, message] of failing) {
  test(`${name} → exit 1 with a clear message`, () => {
    const m = seed();
    mutate(m);
    const r = run(m);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, message);
  });
}

test('unknown allergen → exit 0 with a warning', () => {
  const m = seed();
  m.items[0].allergens = ['wheat', 'mustard'];
  const r = run(m);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /⚠ WARN .*unknown allergen "mustard"/);
});
