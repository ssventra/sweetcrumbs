// cart.js: pre-order list writes and the Pre-order page (contracts/storage.md).
// Import rule: imports only site.js and form.js. Reads go through site.js.

import {
  PREORDER_KEY,
  readSavedPreorder,
  browserStorage,
  clampQty,
  MAX_QTY,
  totalQuantity,
  loadMenu,
  renderMenuError,
  bakeryNow,
  formatPrice,
  hoursSummary,
  telHref,
} from './site.js';
import { pickupSlots, validatePreorder, buildPreorderEmail, showErrors, copySummary } from './form.js';

// ------------------------------------------------------------ pure parts

/**
 * A pre-order cart on top of `storage` (window.localStorage in the browser).
 * Every write is wrapped in try/catch; on failure the list keeps working in memory
 * and `notice` becomes 'not-saved'.
 */
export function createCart(storage = browserStorage()) {
  const initial = readSavedPreorder(storage);
  let entries = initial.items.map((e) => ({ ...e }));
  const cart = {
    notice: initial.notice,
    items: () => entries.map((e) => ({ ...e })),
    count: () => totalQuantity(entries),
    reload() {
      const r = readSavedPreorder(storage);
      entries = r.items.map((e) => ({ ...e }));
      if (r.notice) cart.notice = r.notice;
    },
    add(item) {
      if (!item) return { ok: false, reason: 'unknown' };
      if (item.soldOut) return { ok: false, reason: 'sold-out' };
      const existing = entries.find((e) => e.id === item.id);
      let capped = false;
      if (existing) {
        capped = existing.qty >= MAX_QTY;
        existing.qty = clampQty(existing.qty + 1);
      } else {
        entries.push({ id: item.id, qty: 1 });
      }
      save();
      return { ok: true, qty: entries.find((e) => e.id === item.id).qty, capped };
    },
    setQty(id, qty) {
      const e = entries.find((x) => x.id === id);
      if (!e) return;
      e.qty = clampQty(qty);
      save();
    },
    remove(id) {
      entries = entries.filter((e) => e.id !== id);
      save();
    },
    clear() {
      entries = [];
      try {
        if (!storage) throw new Error('no storage');
        storage.removeItem(PREORDER_KEY);
      } catch {
        cart.notice = 'not-saved';
      }
    },
  };

  function save() {
    try {
      if (!storage) throw new Error('no storage');
      storage.setItem(PREORDER_KEY, JSON.stringify({ version: 1, items: entries, updatedAt: new Date().toISOString() }));
    } catch {
      cart.notice = 'not-saved';
    }
  }

  return cart;
}

/** Match saved entries against the current menu (data-model §4). */
export function reconcile(entries, menuItems) {
  const byId = new Map(menuItems.map((i) => [i.id, i]));
  return entries.map((e) => {
    const item = byId.get(e.id) ?? null;
    const status = !item ? 'removed' : item.soldOut ? 'soldOut' : 'available';
    return { id: e.id, qty: e.qty, item, status, lineCents: item ? item.priceCents * e.qty : 0 };
  });
}

/** Estimated total in integer cents and item count, available lines only. */
export function totals(lines) {
  const ok = lines.filter((l) => l.status === 'available');
  return { cents: ok.reduce((s, l) => s + l.lineCents, 0), count: ok.reduce((s, l) => s + l.qty, 0) };
}

// --------------------------------------------------------------------- DOM

let sharedCart = null;
/** The page's cart over window.localStorage (created on first use). */
export function getCart() {
  if (!sharedCart) {
    sharedCart = createCart();
    // Another tab changed the list: reload so our next write doesn't overwrite it.
    window.addEventListener('storage', (e) => {
      if (e.key === PREORDER_KEY || e.key === null) {
        sharedCart.reload();
        document.dispatchEvent(new CustomEvent('preorder:external'));
      }
    });
  }
  return sharedCart;
}

const NOTICE_TEXT = {
  'not-saved': "Your browser isn't letting us save your list, so it will only be kept while this page is open.",
  'restore-failed': "We couldn't restore your saved list, so it has been started fresh.",
};
const shownNotices = new Set();

/** Show the one-time not-saved / restore-failed notice (storage contract). */
export function showCartNotice(kind) {
  if (!kind || shownNotices.has(kind) || !NOTICE_TEXT[kind]) return;
  shownNotices.add(kind);
  const host = document.getElementById('cart-notices') ?? document.querySelector('main .container, main .section');
  if (!host) return;
  const p = document.createElement('p');
  p.className = 'notice';
  p.setAttribute('role', 'status');
  p.textContent = NOTICE_TEXT[kind];
  if (host.id === 'cart-notices') host.append(p);
  else host.prepend(p);
}

export function notifyChange(cart = getCart()) {
  document.dispatchEvent(new CustomEvent('preorder:change', { detail: { count: cart.count() } }));
  showCartNotice(cart.notice);
}

/** Add an item from a card button; announce the result in `live` (FR-018). */
export function addToPreorder(item, live) {
  const cart = getCart();
  const result = cart.add(item);
  notifyChange(cart);
  if (!live) return result;
  if (!result.ok) {
    live.textContent = result.reason === 'sold-out' ? `${item.name} is sold out today.` : 'That item is no longer on the menu.';
  } else if (result.capped) {
    live.textContent = `You already have 99 ${item.name}. Call us for larger orders.`;
  } else {
    const n = cart.count();
    live.textContent = `Added ${item.name}. ${n} item${n === 1 ? '' : 's'} in your pre-order list.`;
  }
  clearTimeout(live.clearTimer);
  live.clearTimer = setTimeout(() => {
    live.textContent = '';
  }, 6000);
  return result;
}

/** Event delegation for [data-add] buttons inside `container`. */
export function wireAddButtons(container, items, live) {
  if (!container) return;
  const byId = new Map(items.map((i) => [i.id, i]));
  container.addEventListener('click', (e) => {
    const button = e.target.closest('[data-add]');
    if (!button) return;
    addToPreorder(byId.get(button.dataset.add), live);
    button.classList.add('is-added');
  });
}

// --------------------------------------------------------- pre-order page

const PREORDER_ORDER = ['customerName', 'email', 'phone', 'pickupDate', 'pickupTime', 'notes'];
const PREORDER_LABELS = {
  customerName: 'Name',
  email: 'Email',
  phone: 'Phone',
  pickupDate: 'Pickup date',
  pickupTime: 'Pickup time',
  notes: 'Notes',
  items: 'Items',
};

function initPreorderPage() {
  const cart = getCart();
  const listHost = document.getElementById('preorder-list');
  const listTitle = document.getElementById('list-title');
  const estimate = document.getElementById('estimate');
  const estimateValue = document.getElementById('estimate-value');
  const sendSection = document.getElementById('send-section');
  const form = document.getElementById('preorder-form');
  const summary = document.getElementById('error-summary');
  const dateInput = document.getElementById('pickupDate');
  const timeSelect = document.getElementById('pickupTime');
  const sentPanel = document.getElementById('sent-panel');
  const summaryText = document.getElementById('summary-text');
  const copyStatus = document.getElementById('copy-status');
  let menu = null;

  showCartNotice(cart.notice);

  const lines = () => reconcile(cart.items(), menu.items);

  function updateTotals() {
    const t = totals(lines());
    estimateValue.textContent = formatPrice(t.cents);
    listTitle.textContent = `Items (${t.count})`;
    estimate.hidden = cart.items().length === 0;
    sendSection.hidden = t.count === 0 || !sentPanel.hidden;
  }

  function renderList(focusAfter = null) {
    const all = lines();
    listHost.replaceChildren();
    if (all.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const p = document.createElement('p');
      p.textContent = 'Your list is empty.';
      const a = document.createElement('a');
      a.className = 'button';
      a.href = 'menu.html';
      a.textContent = 'Browse the menu';
      empty.append(p, a);
      listHost.append(empty);
      updateTotals();
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'preorder-list';
    for (const line of all) ul.append(renderLine(line));
    listHost.append(ul);
    updateTotals();
    if (focusAfter) document.getElementById(focusAfter)?.focus();
  }

  function renderLine(line) {
    const li = document.createElement('li');
    li.className = `preorder-line${line.status === 'available' ? '' : ' preorder-line--unavailable'}`;
    const info = document.createElement('div');
    info.className = 'line-info';
    const h3 = document.createElement('h3');
    h3.textContent = line.item?.name ?? line.id;
    info.append(h3);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'button button--ghost button--small';
    removeBtn.textContent = 'Remove';
    removeBtn.setAttribute('aria-label', `Remove ${line.item?.name ?? 'this item'}`);
    removeBtn.addEventListener('click', () => {
      cart.remove(line.id);
      notifyChange(cart);
      renderList('list-title');
    });

    if (line.status !== 'available') {
      const flag = document.createElement('p');
      flag.className = 'line-flag';
      flag.textContent = line.status === 'soldOut' ? 'Sold out — will not be sent' : 'No longer on the menu';
      info.append(flag);
      li.append(info, removeBtn);
      return li;
    }

    const unit = document.createElement('p');
    unit.textContent = `${formatPrice(line.item.priceCents)} ${line.item.unit || 'each'}`;
    info.append(unit);

    const qtyId = `qty-${line.id}`;
    const qty = document.createElement('div');
    qty.className = 'qty';
    const label = document.createElement('label');
    label.className = 'visually-hidden';
    label.htmlFor = qtyId;
    label.textContent = `Quantity of ${line.item.name}`;
    const input = document.createElement('input');
    input.type = 'number';
    input.id = qtyId;
    input.min = '1';
    input.max = '99';
    input.inputMode = 'numeric';
    input.value = String(line.qty);
    const total = document.createElement('p');
    total.className = 'line-total';
    total.textContent = formatPrice(line.lineCents);

    const apply = (n) => {
      cart.setQty(line.id, n);
      const q = cart.items().find((e) => e.id === line.id)?.qty ?? 1;
      input.value = String(q);
      total.textContent = formatPrice(q * line.item.priceCents);
      notifyChange(cart);
      updateTotals();
    };
    const step = (delta, text) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'qty-button';
      b.textContent = text;
      b.setAttribute('aria-label', `${delta < 0 ? 'Decrease' : 'Increase'} quantity of ${line.item.name}`);
      b.addEventListener('click', () => apply(Number(input.value) + delta));
      return b;
    };
    input.addEventListener('change', () => apply(Number(input.value)));
    qty.append(label, step(-1, '−'), input, step(1, '+'));

    const controls = document.createElement('div');
    controls.className = 'actions';
    controls.append(qty, removeBtn);
    li.append(info, controls, total);
    return li;
  }

  function fillTimes() {
    const now = bakeryNow(menu.business.timeZone);
    const slots = pickupSlots(menu.business, dateInput.value, now);
    const previous = timeSelect.value;
    timeSelect.replaceChildren();
    const first = document.createElement('option');
    first.value = '';
    first.textContent = !dateInput.value ? 'Choose a date first' : slots.length ? 'Choose a time' : 'No times available';
    timeSelect.append(first);
    for (const s of slots) {
      const o = document.createElement('option');
      o.value = s.value;
      o.textContent = s.label;
      timeSelect.append(o);
    }
    if (slots.some((s) => s.value === previous)) timeSelect.value = previous;
    const msg = document.getElementById('pickupDate-error');
    if (dateInput.value && slots.length === 0) {
      msg.textContent = `No pickup times left that day — please choose another date. Our hours: ${hoursSummary(menu.business.hours)}.`;
      msg.hidden = false;
    } else if (!dateInput.hasAttribute('aria-invalid')) {
      msg.hidden = true;
    }
  }

  loadMenu().then((result) => {
    if (result.error) {
      renderMenuError(listHost);
      sendSection.hidden = true;
      return;
    }
    menu = result;
    const b = menu.business;
    document.getElementById('bakery-email').textContent = b.email;
    const phone = document.getElementById('bakery-phone');
    phone.href = telHref(b.phone);
    phone.textContent = b.phone;
    document.querySelectorAll('[data-lead-hours]').forEach((el) => {
      el.textContent = String(b.leadTimes.preorderHours);
    });
    dateInput.min = bakeryNow(b.timeZone).ymd;
    renderList();
    fillTimes();

    document.addEventListener('preorder:external', () => renderList());
    dateInput.addEventListener('change', fillTimes);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const now = bakeryNow(b.timeZone);
      const currentLines = lines();
      const errors = validatePreorder(data, { business: b, now, lines: currentLines });
      if (errors.pickupDate) errors.pickupDate += ` Our hours: ${hoursSummary(b.hours)}.`;
      if (showErrors(form, summary, errors, { order: PREORDER_ORDER, labels: PREORDER_LABELS, anchors: { items: 'list-title' } })) return;

      const email = buildPreorderEmail({ lines: currentLines, fields: data, business: b });
      summaryText.value = email.full;
      document.getElementById('truncated-note').hidden = !email.truncated;
      sendSection.hidden = true;
      sentPanel.hidden = false;
      sentPanel.focus();
      window.location.href = email.href;
    });

    document.getElementById('copy-summary').addEventListener('click', () => copySummary(summaryText, copyStatus));
    document.getElementById('clear-list').addEventListener('click', () => {
      cart.clear();
      notifyChange(cart);
      sentPanel.hidden = true;
      form.reset();
      renderList('list-title');
      copyStatus.textContent = '';
    });
  });
}

if (typeof document !== 'undefined' && document.body?.dataset.page === 'preorder') initPreorderPage();
