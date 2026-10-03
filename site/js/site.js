// site.js: the base module. It imports nothing; every other module imports from it.
// Import rule (plan.md): site.js ← form.js ← cart.js ← menu.js ← filters.js
//
// Pure exports are importable from Node (qa/unit) because DOM code runs only
// when `document` exists.

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_NAMES = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
export const DAY_SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
export const KNOWN_CATEGORIES = ['breads', 'pastries', 'cakes', 'cookies'];
export const PLACEHOLDER_IMAGE = 'assets/img/placeholder.webp';
export const PREORDER_KEY = 'sweetcrumb.preorder.v1';
export const MAX_QTY = 99;

// ------------------------------------------------------------------ money

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Dollars (as typed by the owner) → integer cents. */
export function toCents(price) {
  return Math.round(Number((price * 100).toFixed(4)));
}

/** Integer cents → "$4.50". */
export function formatPrice(cents) {
  return usd.format(cents / 100);
}

/** "$18.00 per dozen" or "$4.50". */
export function formatPriceWithUnit(cents, unit) {
  return unit ? `${formatPrice(cents)} ${unit}` : formatPrice(cents);
}

// ------------------------------------------------------------------- time

/**
 * The bakery's wall-clock "now" in its own time zone (research.md R6).
 * Returns { dayKey: 'mon'…'sun', minutes: minutes since midnight, ymd: 'YYYY-MM-DD' }.
 */
export function bakeryNow(timeZone, date = new Date()) {
  const parts = {};
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  const hour = Number(parts.hour) % 24;
  return {
    dayKey: parts.weekday.slice(0, 3).toLowerCase(),
    minutes: hour * 60 + Number(parts.minute),
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/** "07:30" → 450 */
export function parseHHMM(value) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/** 450 → "7:30 AM" */
export function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Open at `minutes` on `dayKey`? Open at the opening minute, closed at the closing minute. */
export function isOpenAt(hours, dayKey, minutes) {
  const day = hours?.[dayKey];
  if (!day) return false;
  return minutes >= parseHHMM(day.open) && minutes < parseHHMM(day.close);
}

/** Weekday key for a 'YYYY-MM-DD' calendar date (time-zone independent). */
export function dayKeyOfYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return DAY_KEYS[(js + 6) % 7];
}

/** Add whole days to a 'YYYY-MM-DD' date. */
export function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Wall-clock minutes since the epoch, for comparing bakery-local times (R6). */
export function wallMinutes(ymd, minutes) {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 60000 + minutes;
}

/** "Sat, Oct 10" for a 'YYYY-MM-DD' date. */
export function formatYmd(ymd, { long = false } = {}) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: long ? 'long' : 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * Seven rows Mon→Sun for display: { dayKey, day, text, closed, isToday }.
 * Times read "7:00 AM – 3:00 PM"; closed days read "Closed".
 */
export function hoursRows(hours, todayKey) {
  return DAY_KEYS.map((dayKey) => {
    const h = hours?.[dayKey];
    return {
      dayKey,
      day: DAY_NAMES[dayKey],
      closed: !h,
      text: h ? `${formatTime(parseHHMM(h.open))} – ${formatTime(parseHHMM(h.close))}` : 'Closed',
      isToday: dayKey === todayKey,
    };
  });
}

/** Compact one-line summary, e.g. "Mon Closed · Tue–Fri 7:00 AM – 3:00 PM · Sat …". */
export function hoursSummary(hours) {
  const rows = hoursRows(hours, null);
  const groups = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.text === row.text) last.to = row.dayKey;
    else groups.push({ from: row.dayKey, to: row.dayKey, text: row.text });
  }
  return groups
    .map((g) => `${DAY_SHORT[g.from]}${g.from === g.to ? '' : `–${DAY_SHORT[g.to]}`} ${g.text}`)
    .join(' · ');
}

// ----------------------------------------------------------- business info

export function formatAddress(address) {
  return `${address.street}, ${address.city}, ${address.region} ${address.postalCode}`;
}

export function telHref(phone) {
  return `tel:${String(phone).replace(/\D/g, '')}`;
}

// ------------------------------------------------------------------- menu

/** Apply defaults and derived values to the raw menu file (data-model.md §3). */
export function normalizeMenu(raw) {
  const items = (raw?.items ?? []).map((item) => {
    const hasImage = typeof item.image === 'string' && item.image.length > 0;
    return {
      ...item,
      description: item.description ?? '',
      unit: item.unit ?? '',
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      specialDays: Array.isArray(item.specialDays) ? item.specialDays : [],
      soldOut: item.soldOut === true,
      featured: item.featured === true,
      priceCents: toCents(item.price),
      group: KNOWN_CATEGORIES.includes(item.category) ? item.category : 'other',
      image: hasImage ? item.image : PLACEHOLDER_IMAGE,
      imageAlt: hasImage ? item.imageAlt ?? '' : '',
    };
  });
  return { business: raw?.business ?? null, items };
}

let menuPromise = null;

/** Fetch data/menu.json once per page (cached). Resolves to the normalized menu or { error: true }. */
export function loadMenu(url = 'data/menu.json') {
  if (!menuPromise) {
    menuPromise = fetch(url, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((raw) => {
        if (!raw || !raw.business || !Array.isArray(raw.items)) throw new Error('unexpected menu format');
        return normalizeMenu(raw);
      })
      .catch((e) => {
        console.warn('Sweet Crumb: could not load the menu.', e);
        return { error: true };
      });
  }
  return menuPromise;
}

/** The phone number written into the static footer (fallback when menu.json fails). */
export function footerPhone() {
  if (typeof document === 'undefined') return '';
  return document.querySelector('.site-footer a[href^="tel:"]')?.textContent.trim() ?? '';
}

/** Polite FR-008 message inside `container`. */
export function renderMenuError(container, phone = footerPhone()) {
  if (!container) return;
  container.replaceChildren();
  const p = document.createElement('p');
  p.className = 'notice notice--error';
  p.append('Our menu is being updated. Please call us at ');
  const a = document.createElement('a');
  a.href = telHref(phone);
  a.textContent = phone;
  p.append(a, '.');
  container.append(p);
}

// -------------------------------------------------------- saved pre-order

export function clampQty(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.round(n)));
}

/** window.localStorage, or null when access itself throws (blocked storage). */
export function browserStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Read the saved pre-order list per contracts/storage.md.
 * Returns { items: [{ id, qty }], notice } where notice is
 * null | 'restore-failed' | 'not-saved'.
 */
export function readSavedPreorder(storage = browserStorage()) {
  let raw;
  try {
    if (!storage) return { items: [], notice: 'not-saved' };
    raw = storage.getItem(PREORDER_KEY);
  } catch {
    return { items: [], notice: 'not-saved' };
  }
  if (raw === null || raw === undefined) return { items: [], notice: null };
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { items: [], notice: 'restore-failed' };
  }
  if (!data || data.version !== 1 || !Array.isArray(data.items)) return { items: [], notice: 'restore-failed' };
  const merged = new Map();
  for (const entry of data.items) {
    if (!entry || typeof entry.id !== 'string' || entry.id === '') continue;
    const qty = typeof entry.qty === 'number' && Number.isFinite(entry.qty) ? entry.qty : 1;
    merged.set(entry.id, (merged.get(entry.id) ?? 0) + qty);
  }
  return { items: [...merged].map(([id, qty]) => ({ id, qty: clampQty(qty) })), notice: null };
}

export function totalQuantity(items) {
  return items.reduce((sum, e) => sum + e.qty, 0);
}

// -------------------------------------------------------------------- DOM

/** Update every header count badge and the Pre-order link's accessible name. */
export function setPreorderCount(count) {
  const label = `Pre-order list, ${count} item${count === 1 ? '' : 's'}`;
  document.querySelectorAll('[data-preorder-count]').forEach((el) => {
    el.textContent = String(count);
  });
  document.querySelectorAll('[data-preorder-link]').forEach((el) => el.setAttribute('aria-label', label));
}

/** Fill every [data-announcement] slot (FR-017a); leave hidden when empty. */
export function renderAnnouncements(business) {
  const text = business?.announcement?.trim();
  document.querySelectorAll('[data-announcement]').forEach((el) => {
    if (text) {
      el.textContent = text;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  });
}

/** Accessible hours table + open-status line (FR-017, research R6). */
export function renderHours(container, business, statusEl = null) {
  if (!container || !business) return;
  const now = bakeryNow(business.timeZone);
  const table = document.createElement('table');
  table.className = 'hours-table';
  const caption = table.createCaption();
  caption.textContent = 'Opening hours';
  const tbody = table.createTBody();
  for (const row of hoursRows(business.hours, now.dayKey)) {
    const tr = tbody.insertRow();
    if (row.isToday) tr.className = 'is-today';
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = row.day;
    if (row.isToday) {
      const tag = document.createElement('span');
      tag.className = 'today-label';
      tag.textContent = 'Today';
      th.append(' ', tag);
    }
    const td = document.createElement('td');
    td.textContent = row.text;
    tr.append(th, td);
  }
  container.replaceChildren(table);
  if (statusEl) {
    const status = openStatus(business.hours, now);
    statusEl.textContent = status.text;
    statusEl.dataset.open = String(status.open);
  }
}

/** { open, text } e.g. "Open now — until 3:00 PM" / "Closed now — opens Tue 7:00 AM". */
export function openStatus(hours, now) {
  const today = hours?.[now.dayKey];
  if (isOpenAt(hours, now.dayKey, now.minutes)) {
    return { open: true, text: `Open now — until ${formatTime(parseHHMM(today.close))}` };
  }
  if (today && now.minutes < parseHHMM(today.open)) {
    return { open: false, text: `Closed now — opens today at ${formatTime(parseHHMM(today.open))}` };
  }
  const start = DAY_KEYS.indexOf(now.dayKey);
  for (let i = 1; i <= 7; i++) {
    const key = DAY_KEYS[(start + i) % 7];
    const h = hours?.[key];
    if (h) {
      const when = i === 1 ? 'tomorrow' : DAY_SHORT[key];
      return { open: false, text: `Closed now — opens ${when} at ${formatTime(parseHHMM(h.open))}` };
    }
  }
  return { open: false, text: 'Closed now' };
}

/** OpenStreetMap embed URL for a pin (research.md R11). */
export function osmEmbedUrl({ lat, lon, zoom = 16 }) {
  const dLon = 0.0055 * 2 ** (16 - zoom);
  const dLat = dLon * 0.6;
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}

export function directionsUrl(address) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(formatAddress(address))}`;
}

function initVisitPage() {
  loadMenu().then((menu) => {
    if (menu.error) return; // the static footer still shows address and phone
    const b = menu.business;
    const block = document.getElementById('contact-block');
    block.replaceChildren();
    const street = document.createElement('span');
    street.textContent = b.address.street;
    const city = document.createElement('span');
    city.textContent = `${b.address.city}, ${b.address.region} ${b.address.postalCode}`;
    const tel = document.createElement('a');
    tel.href = telHref(b.phone);
    tel.textContent = b.phone;
    const mail = document.createElement('a');
    mail.href = `mailto:${b.email}`;
    mail.textContent = b.email;
    block.append(street, document.createElement('br'), city, document.createElement('br'), tel, document.createElement('br'), mail);
    document.getElementById('directions-link').href = directionsUrl(b.address);
    document.getElementById('map-frame').src = osmEmbedUrl(b.map);
    renderHours(document.getElementById('hours-table'), b, document.getElementById('open-status'));
  });
}

function initSite() {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  const refreshCount = () => setPreorderCount(totalQuantity(readSavedPreorder().items));
  refreshCount();
  document.addEventListener('preorder:change', (e) => {
    if (typeof e.detail?.count === 'number') setPreorderCount(e.detail.count);
    else refreshCount();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === PREORDER_KEY || e.key === null) refreshCount();
  });

  if (document.body.dataset.page === 'visit') initVisitPage();

  if (document.querySelector('[data-announcement]')) {
    loadMenu().then((menu) => {
      if (!menu.error) renderAnnouncements(menu.business);
    });
  }
}

if (typeof document !== 'undefined') initSite();
