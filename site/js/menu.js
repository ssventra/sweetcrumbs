// menu.js: item cards, featured items, and today's specials.
// Imports only from site.js (and, for pre-order buttons, cart.js) per the plan's import rule.

import { formatPrice, loadMenu, renderMenuError, bakeryNow, renderHours } from './site.js';
import { wireAddButtons } from './cart.js';

export const CATEGORY_LABELS = {
  breads: 'Breads',
  pastries: 'Pastries',
  cakes: 'Cakes',
  cookies: 'Cookies',
  other: 'Other',
};
export const GROUP_ORDER = ['breads', 'pastries', 'cakes', 'cookies', 'other'];

const ALLERGEN_LABELS = {
  milk: 'Milk',
  eggs: 'Eggs',
  wheat: 'Wheat/Gluten',
  soy: 'Soy',
  peanuts: 'Peanuts',
  'tree-nuts': 'Tree nuts',
  sesame: 'Sesame',
};

export function allergenLabel(value) {
  return ALLERGEN_LABELS[value] ?? value;
}

// ------------------------------------------------------------ pure helpers

/** Featured items that are not sold out, in file order (FR-015). */
export function featured(items) {
  return items.filter((i) => i.featured && !i.soldOut);
}

/** Items that are specials on `dayKey` ('daily' or that weekday), excluding sold out (FR-016). */
export function specialsFor(items, dayKey) {
  return items.filter((i) => !i.soldOut && (i.specialDays.includes('daily') || i.specialDays.includes(dayKey)));
}

// --------------------------------------------------------------------- DOM

let cardSeq = 0; // keeps ids unique when an item appears twice on a page (featured + special)

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * <article class="card"> for one normalized menu item.
 * Options: { headingLevel = 3, addButton = false } (the add button is wired by cart-aware pages).
 */
export function renderItemCard(item, { headingLevel = 3, addButton = false } = {}) {
  const card = el('article', `card${item.soldOut ? ' card--soldout' : ''}`);
  card.dataset.itemId = item.id;

  const img = el('img');
  img.src = item.image;
  img.alt = item.imageAlt;
  img.width = 800;
  img.height = 600;
  img.loading = 'lazy';
  img.decoding = 'async';
  card.append(img);

  const body = el('div', 'card-body');
  body.append(el(`h${headingLevel}`, '', item.name));
  if (item.soldOut) body.append(el('p', 'soldout-label', 'Sold out'));
  if (item.description) body.append(el('p', 'card-description', item.description));

  const price = el('p', 'card-price');
  price.append(formatPrice(item.priceCents));
  if (item.unit) price.append(' ', el('span', 'unit', item.unit));
  body.append(price);

  if (item.allergens.length) {
    const wrap = el('div');
    const id = `allergens-${item.id}-${++cardSeq}`;
    const label = el('span', 'badges-label', 'Contains:');
    label.id = id;
    const list = el('ul', 'badges');
    list.setAttribute('aria-labelledby', id);
    for (const a of item.allergens) list.append(el('li', 'badge', allergenLabel(a)));
    wrap.append(label, list);
    body.append(wrap);
  }

  if (addButton) {
    const footer = el('div', 'card-footer');
    const button = el('button', 'button button--small');
    button.type = 'button';
    if (item.soldOut) {
      button.disabled = true;
      button.append('Sold out');
      button.append(el('span', 'visually-hidden', `: ${item.name} can't be pre-ordered today`));
    } else {
      button.dataset.add = item.id;
      button.append('Add to pre-order');
      button.append(el('span', 'visually-hidden', `: ${item.name}`));
    }
    footer.append(button);
    body.append(footer);
  }

  card.append(body);
  return card;
}

/** <ul class="card-grid"> of cards. */
export function renderCardList(items, options) {
  const list = el('ul', 'card-grid');
  for (const item of items) {
    const li = el('li');
    li.append(renderItemCard(item, options));
    list.append(li);
  }
  return list;
}

// --------------------------------------------------------------- home page

function initHomePage() {
  const featuredList = document.getElementById('featured-list');
  const specialsList = document.getElementById('specials-list');
  const hoursTable = document.getElementById('hours-table');
  const status = document.getElementById('open-status');

  loadMenu().then((menu) => {
    if (menu.error) {
      renderMenuError(featuredList);
      renderMenuError(specialsList);
      return;
    }
    const { business, items } = menu;
    const tagline = document.querySelector('[data-tagline]');
    if (tagline && business.tagline) tagline.textContent = business.tagline;

    const feat = featured(items);
    featuredList.replaceChildren(feat.length ? renderCardList(feat, HOME_CARD_OPTIONS) : emptyNote('New favorites are on their way. See the full menu for today\'s bakes.'));

    const today = bakeryNow(business.timeZone).dayKey;
    const specials = specialsFor(items, today);
    specialsList.replaceChildren(specials.length ? renderCardList(specials, HOME_CARD_OPTIONS) : emptyNote('Fresh specials daily — ask at the counter.'));

    renderHours(hoursTable, business, status);
    const live = document.getElementById('menu-live');
    wireAddButtons(featuredList, items, live);
    wireAddButtons(specialsList, items, live);
    document.dispatchEvent(new CustomEvent('menu:rendered'));
  });
}

function emptyNote(text) {
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = text;
  return p;
}

const HOME_CARD_OPTIONS = { headingLevel: 3, addButton: true };

if (typeof document !== 'undefined' && document.body?.dataset.page === 'home') initHomePage();
