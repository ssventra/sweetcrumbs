// filters.js: Menu page entry module. Category filter + search (FR-009 – FR-011).
// Import rule: may import site.js, menu.js, cart.js; nothing imports filters.js.

import { loadMenu, renderMenuError } from './site.js';
import { CATEGORY_LABELS, GROUP_ORDER, renderCardList } from './menu.js';
import { wireAddButtons, getCart, showCartNotice } from './cart.js';

// ------------------------------------------------------------ pure helpers

/**
 * Filter normalized items by category ('all' or a group key) and a text query
 * matched against name, description, and category (case-insensitive).
 */
export function filterItems(items, { category = 'all', query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== 'all' && item.group !== category) return false;
    if (!q) return true;
    return [item.name, item.description, item.category].some((field) => (field ?? '').toLowerCase().includes(q));
  });
}

// --------------------------------------------------------------------- DOM

const CARD_OPTIONS = { headingLevel: 3, addButton: true };

function initMenuPage() {
  const list = document.getElementById('menu-list');
  const count = document.getElementById('results-count');
  const search = document.getElementById('menu-search');
  const buttons = [...document.querySelectorAll('[data-category]')];
  const state = { category: 'all', query: '' };
  let menu = null;

  const setCount = (n) => {
    count.textContent = `${n} item${n === 1 ? '' : 's'} shown`;
  };

  const render = () => {
    const matches = filterItems(menu.items, state);
    list.replaceChildren();
    setCount(matches.length);

    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const p = document.createElement('p');
      p.textContent = state.category !== 'all' && !state.query && !menu.items.some((i) => i.group === state.category)
        ? 'Nothing here today. Check back tomorrow!'
        : 'No items found.';
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'button button--ghost';
      clear.textContent = 'Clear search and filters';
      clear.addEventListener('click', () => {
        state.category = 'all';
        state.query = '';
        search.value = '';
        syncButtons();
        render();
        search.focus();
      });
      empty.append(p, clear);
      list.append(empty);
      return;
    }

    const groups = state.category === 'all' ? GROUP_ORDER : [state.category];
    for (const group of groups) {
      const inGroup = matches.filter((i) => i.group === group);
      const knownEmpty = group !== 'other' && !menu.items.some((i) => i.group === group);
      if (inGroup.length === 0 && !(knownEmpty && !state.query)) continue;

      const section = document.createElement('section');
      section.className = 'menu-group';
      section.setAttribute('aria-labelledby', `group-${group}`);
      const h2 = document.createElement('h2');
      h2.id = `group-${group}`;
      h2.textContent = CATEGORY_LABELS[group];
      section.append(h2);
      if (inGroup.length) {
        section.append(renderCardList(inGroup, CARD_OPTIONS));
      } else {
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'Nothing here today. Check back tomorrow!';
        section.append(p);
      }
      list.append(section);
    }
  };

  const syncButtons = () => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.category === state.category));
  };

  for (const b of buttons) {
    b.addEventListener('click', () => {
      state.category = b.dataset.category;
      syncButtons();
      render();
    });
  }

  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.query = search.value;
      render();
    }, 150);
  });
  search.closest('form')?.addEventListener('submit', (e) => e.preventDefault());

  loadMenu().then((result) => {
    if (result.error) {
      count.textContent = '';
      renderMenuError(list);
      return;
    }
    menu = result;
    syncButtons();
    render();
    wireAddButtons(list, menu.items, document.getElementById('menu-live'));
    showCartNotice(getCart().notice);
    document.dispatchEvent(new CustomEvent('menu:rendered'));
  });
}

if (typeof document !== 'undefined' && document.body?.dataset.page === 'menu') initMenuPage();
