---

description: "Task list for the Sweet Crumb Bakery static website"
---

# Tasks: Sweet Crumb Bakery Website

**Input**: Design documents from `/specs/001-sweet-crumb-website/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The constitution (Principle VI) and plan make bakery-qa, including
`node --test` unit tests of the pure module functions, the definition of done. Per-story unit
tests are written first and must fail before implementation. UI behavior is verified with the
manual scenarios in `quickstart.md`.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested
on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: The user story the task belongs to (US1–US6)
- Paths are relative to the repository root. The published site is `site/`; QA is `qa/` (see
  plan.md → Project Structure)

## Global rules for every task

- No frameworks, bundlers, transpilers, or runtime npm packages in `site/`. Vanilla ES modules
  only (constitution I).
- All URLs in `site/` are **relative** (no leading `/`), so the site works under a GitHub Pages
  sub-path.
- Every `<img>` has `alt`, `width`, and `height`; raster images are `.webp`; all except the
  hero use `loading="lazy"`.
- Never write a menu item name, price, or opening hour into HTML (constitution II). The only
  hard-coded business data allowed is the footer phone and address (FR-004).
- Pure logic is exported as functions with no DOM access so `qa/unit/*.test.mjs` can import it.
  DOM wiring runs only when `document.body.dataset.page` matches.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repository skeleton and tool configuration

- [X] T001 Create the directory layout from plan.md: `site/{css,js,data,assets/img/icons}`, `qa/{lib,unit}`, `.github/workflows/`; add a `.gitignore` at the repo root containing `node_modules/`, `.lighthouseci/`, `.DS_Store`
- [X] T002 Create the private root `package.json` (`"private": true`, `"type": "module"`, `"engines": { "node": ">=22" }`) with scripts `"menu-check": "node qa/menu-check.mjs"`, `"site-audit": "node qa/site-audit.mjs"`, `"qa": "npm run menu-check && npm run site-audit -- --lighthouse"`, and `@lhci/cli` as the only `devDependency`, pinned to an exact version (no `^`/`~`); run `npm install` to produce `package-lock.json`
- [X] T003 [P] Create `lighthouserc.json`: `ci.collect.staticDistDir: "site"`, `numberOfRuns: 3`, URLs for `index.html, menu.html, about.html, custom-cakes.html, visit.html, preorder.html`, default mobile preset; `ci.assert.assertions` = `categories:performance`, `categories:best-practices`, `categories:seo` each `["error", {"minScore": 0.9}]`, and `categories:accessibility` `["error", {"minScore": 1}]` (a score of 1 is reached only when every scored accessibility audit passes, which enforces SC-007's zero automated violations); `ci.upload.target: "filesystem"` with `outputDir: ".lighthouseci"` (no public upload)
- [X] T004 [P] Create the root `README.md` skeleton with sections: About the project, Run locally (`python3 -m http.server 8000 -d site`), bakery-qa commands, Deploy, Spec Kit docs (link to `specs/001-sweet-crumb-website/`), Prompt log (link to `PROMPT_LOG.md`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Seed data, bakery-qa gate, theme, page shells, and shared modules that every story needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Seed data and assets

- [X] T005 Create `site/data/menu.json` that validates against `specs/001-sweet-crumb-website/contracts/menu.schema.json`: `business` with name "Sweet Crumb Bakery", a tagline, placeholder phone "(555) 123-4567", email "hello@sweetcrumb.example", a placeholder address, `map` {lat, lon, zoom 16}, `timeZone` "America/New_York", `hours` for **all seven keys `mon`…`sun`** (set `mon` to `null` = closed; others `{ "open": "HH:MM", "close": "HH:MM" }`, 24-hour, open < close), `leadTimes` `{ "preorderHours": 24, "cakeHours": 72 }`, `cakeFormEndpoint` "", no `announcement`; and ~20 `items` covering all four categories `breads | pastries | cakes | cookies`, with: unique slug ids matching `^[a-z0-9]+(-[a-z0-9]+)*$`; `name` 1–60 chars; `description` ≤ 200 chars; `price` > 0 with at most 2 decimals; several items with `unit` (≤ 24 chars, e.g. "each", "per dozen", "9-inch whole"); allergens only from `milk, eggs, wheat, soy, peanuts, tree-nuts, sesame`; at least 2 `soldOut: true`, 4 `featured: true`, one `specialDays: ["daily"]`, three with single weekday `specialDays`; `image` "assets/img/<id>.webp" plus `imageAlt` for every item except one (to exercise the placeholder)
- [X] T006 [P] Produce placeholder WebP images in `site/assets/img/`: one 800×600 `<id>.webp` per item that has `image` in T005 (≤ 120 KB each), `placeholder.webp` 800×600, `hero-960.webp` (960×640) and `hero-1600.webp` (1600×1067) ≤ 200 KB each, `texture-paper.webp` tile ≤ 15 KB, and 3 team photos `team-<name>.webp` 400×400 ≤ 150 KB. Use any encoder (e.g. `cwebp`, Pillow); commit only the `.webp` outputs
- [X] T007 [P] Create SVG icons in `site/assets/img/icons/`: `divider.svg` (hand-drawn line), `basket.svg` (pre-order), `search.svg`; each with `viewBox`, no embedded raster, decorative ones referenced with `alt=""`

### bakery-qa (constitution Principle VI gate)

- [X] T008 [P] Implement `qa/lib/report.mjs`: a `createReport(name)` returning `{ error(where, msg), warn(where, msg), summary() }`. It prints `✖ ERROR  <where>: <msg>` / `⚠ WARN   <where>: <msg>` and a final `✔ <name>: …` or `✖ <name>: N errors, M warnings` line; `exitCode()` returns 0 if no errors, else 1 (exit code 2 is reserved for "could not run")
- [X] T009 [P] Implement `qa/lib/html.mjs`: zero-dependency helpers `listHtmlFiles(dir)`, `findTags(html, tagName)` returning `{ attrs, line, inner }` (attribute parsing for quoted/unquoted/boolean attributes), `lineOf(html, index)`, and `resolveRef(fromFile, ref)` that classifies refs as external (`https:`, `mailto:`, `tel:`, `#…`) vs. relative file paths
- [X] T010 Implement `qa/menu-check.mjs` per `contracts/qa-cli.md` → "menu-check rules": read `site/data/menu.json` (or argv path); on missing file/JSON parse error print the parser message with line/column and exit 2; validate the structure from `contracts/menu.schema.json` by hand (required fields, types, `additionalProperties: false`, patterns, `dependentRequired image → imageAlt`), then the semantic rules: unique ids (error), price ≤ 2 decimals (error), image file exists under `site/` (error), each day `open` < `close` (error), `timeZone` accepted by `new Intl.DateTimeFormat('en-US', { timeZone })` (error), `specialDays` doesn't mix `daily` with weekdays (error), at least one open day (error), unknown category (warn), unknown allergen (warn), known category with no items (warn), `featured` + `soldOut` (warn). Messages name `items[i] "Name"` (depends on T008)
- [X] T011 Implement `qa/site-audit.mjs`: step 1 runs `node --test` on every `qa/unit/*.test.mjs` file (passed explicitly) via `child_process.spawnSync` (fails if any test fails; passes if the folder holds no tests yet); step 2 runs every static check in the `contracts/qa-cli.md` → "site-audit rules" table over `site/**/*.html`, reading `site/data/menu.json` for the "no menu item name in HTML" check (which skips the text inside `about.html`'s `<section id="our-story">`) and the "footer phone/address exact match" checks, and checking image byte budgets (menu photos ≤ 120 KB, hero ≤ 200 KB, others ≤ 150 KB); step 3 runs only with `--lighthouse`: spawn `npx lhci autorun` and fail on non-zero (exit 2 if Chrome isn't found) (depends on T008, T009)
- [X] T012 Run `npm run menu-check` against the T005 seed and fix the seed until it passes with 0 errors (expected warnings only for intentional cases)

### Theme, layout, and page shells

- [X] T013 Create `site/css/styles.css` (the **only** stylesheet), mobile-first: a header comment listing every text/background token pair with its contrast ratio (each ≥ 4.5:1, or ≥ 3:1 for large text/UI); `:root` custom properties for the warm rustic palette (`--color-flour`, `--color-crust`, `--color-cocoa`, `--color-berry`, `--color-sage`, `--color-ink`, …), spacing scale, radii, shadows, font stacks (`--font-display: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`; system sans for body; no web fonts), `body` background with `url("../assets/img/texture-paper.webp")`; base element styles; `.skip-link`; `:focus-visible` outline; `.visually-hidden`; header/nav (wrapping, ≥ 44×44 px targets), footer, `.card`, `.badge`, `.button` variants, form fields + error states, `.notice`, `.live-region`; `min-width` media queries at 40em and 64em only; `@media (prefers-reduced-motion: reduce)` disabling transitions/animations
- [X] T014 Create the shared page shell in `site/index.html`: `<!doctype html>`, `<html lang="en">`, charset + responsive viewport meta, unique `<title>` and meta description, one `<link rel="stylesheet" href="css/styles.css">`, `<body data-page="home">`, skip link to `#main`, `<header>` with the logo as an **inline `<svg>`** (wheat/rolling-pin mark, `aria-hidden="true"`, `focusable="false"`) inside a Home link whose visible text is "Sweet Crumb Bakery" (no logo `<img>` file, so the lazy-loading audit rule needs no exception), and `<nav aria-label="Main">` linking Home, Menu, About, Custom Cakes, Visit, and a Pre-order link (`preorder.html`, basket icon, `<span class="preorder-count" data-preorder-count>0</span>` and accessible name "Pre-order list, 0 items"), `<main id="main">` with a single `<h1>`, and `<footer>` containing the **plain-text** phone (as `tel:` link) and address exactly matching `business.phone` and the address formatted as `street, city, region postalCode`, an "Hours & directions" link to `visit.html` (FR-002), and exactly one module script (no announcement slot in the shell; see T016), `<script type="module" src="js/site.js"></script>`. Pages that have their own entry module (see plan.md → Page → module map) replace this tag in their story task, so every page loads exactly one module script
- [X] T015 [P] Copy the shell from T014 into `site/menu.html` (`data-page="menu"`), `site/about.html` (`about`), `site/custom-cakes.html` (`cakes`), `site/visit.html` (`visit`), `site/preorder.html` (`preorder`), and `site/404.html` (`notfound`, with links back to Home and Menu), each with its own `<title>`, meta description, `<h1>`, and `aria-current="page"` on its own nav link (depends on T014)

### Shared modules

- [X] T016 Implement `site/js/site.js` as the **base module with no imports** (every other module imports from it; it imports nothing). Pure exports: `formatPrice(cents)` using `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`; `toCents(price)` = `Math.round(price * 100)`; `bakeryNow(timeZone, date = new Date())` returning `{ dayKey: 'mon'…'sun', minutes, ymd }` from `Intl.DateTimeFormat(…, { timeZone, hourCycle: 'h23' }).formatToParts`; `parseHHMM`; `isOpenAt(hours, dayKey, minutes)`; `formatAddress(address)`; `telHref(phone)` (digits only); the menu loader `loadMenu()`, which fetches `data/menu.json` once (cached promise, relative URL) and resolves to `normalizeMenu(raw)` or, on fetch/parse failure, `{ error: true }`; `normalizeMenu(raw)`, which applies defaults (`soldOut false`, `featured false`, `allergens []`, `specialDays []`), adds `priceCents`, maps unknown categories to group `"other"`, and sets a missing `image` to `assets/img/placeholder.webp` with `imageAlt ""`; `renderMenuError(container, phone)`, which renders the polite message "Our menu is being updated. Please call us at <phone>." (FR-008); and the pre-order read helpers `PREORDER_KEY = "sweetcrumb.preorder.v1"` and `readSavedPreorder(storage)`, which applies the read rules in `contracts/storage.md` (try/catch, clamping, merging, discard on bad version) and returns `{ items, notice }`, where `notice` is `null`, `"restore-failed"` (corrupt JSON, `version !== 1`, or non-array `items`), or `"not-saved"` (storage access threw). DOM part (runs on every page, because every entry module imports `site.js`): set footer year; set every `[data-preorder-count]` badge and the Pre-order link's accessible name ("Pre-order list, 3 items") from the total saved quantity; update them on the `preorder:change` event and on `window` `storage` events for `PREORDER_KEY` (cross-tab sync); and, only when the page contains `[data-announcement]` elements, call `loadMenu()` and, when `business.announcement` is non-empty, set each slot's `textContent` to it and unhide it (otherwise leave it hidden). Slots exist only where FR-017a requires them: next to the hours on Home (T033) and Visit (T036), and directly above the submit button on the Pre-order (T045) and Custom Cakes (T051) forms. No other page has one, so About, Menu, and 404 never load `menu.json` for it
- [X] T017 Implement `site/js/menu.js`, importing `loadMenu`, `formatPrice`, and `renderMenuError` from `./site.js` (never the reverse). Export `renderItemCard(item)`, returning an `<article class="card">` with photo (`loading="lazy"`, width 800, height 600), `<h3>` name, description, price + unit label ("$18.00 per dozen"), allergen badges as visible text using the labels milk → "Milk", eggs → "Eggs", wheat → "Wheat/Gluten", soy → "Soy", peanuts → "Peanuts", tree-nuts → "Tree nuts", sesame → "Sesame", unknown → raw text, and a "Sold out" label when `soldOut` (depends on T016)
- [X] T018 [P] Write foundation unit tests in `qa/unit/site.test.mjs` (`formatPrice`, `toCents` incl. `4.5 → 450` and `2.675 → 268`, `bakeryNow` for a fixed `Date` in `America/New_York` vs `Asia/Tokyo`, `isOpenAt` boundaries: open at `open`, closed at `close`, closed on `null` day; `normalizeMenu` defaults, cents, unknown category → `other`, missing image → placeholder; `readSavedPreorder` with a stub storage, asserting the `{ items, notice }` result: absent key → `{ items: [], notice: null }`; corrupt JSON, `version !== 1`, non-array `items` → `notice: "restore-failed"`; duplicate ids merged and `qty` clamped to 1–99; storage that throws → `notice: "not-saved"`), all imported from `site/js/site.js`
- [X] T019 Run `npm run site-audit` (without `--lighthouse`) and fix findings until it exits 0

**Checkpoint**: The foundation is ready: every page shell passes the static audit, the menu file validates, and the shared modules are unit-tested.

---

## Phase 3: User Story 1 - Browse the menu and find something safe to eat (Priority: P1) 🎯 MVP

**Goal**: The Menu page lists every item from `menu.json` with category filter, search, allergen badges, and sold-out state, fully accessible.

**Independent Test**: quickstart.md → "US1 — Browse the menu": filter, search, empty state, sold-out label, and keyboard/screen-reader operation all work with the seed menu.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T020 [P] [US1] Write `qa/unit/filters.test.mjs` for `filterItems(items, { category, query })`: category `all` returns everything; a single category returns only it; `other` returns unknown-category items; query matches name, description, or category, ignoring case and surrounding whitespace; category + query combine (AND); empty query = no text filter; no matches → `[]`; input order preserved

### Implementation for User Story 1

- [X] T021 [US1] Implement the pure `filterItems(items, { category, query })` export in `site/js/filters.js` to satisfy T020
- [X] T022 [US1] Build the Menu page markup in `site/menu.html`: intro, a labelled filter group (`<div role="group" aria-labelledby="filter-label">`) with buttons All, Breads, Pastries, Cakes, Cookies (`aria-pressed`, "All" pressed by default), `<label for="menu-search">Search the menu</label>` + `<input type="search" id="menu-search">`, a results count `<p id="results-count" aria-live="polite">`, `<div id="menu-list">` for cards grouped under `<h2>` category headings in the order Breads, Pastries, Cakes, Cookies, Other, the shared-kitchen allergen notice (FR-012), a `<noscript>` message with the phone number, and `<script type="module" src="js/filters.js">` **replacing** the shell's `js/site.js` tag (one module script per page)
- [X] T023 [US1] Implement the Menu page DOM wiring in `site/js/filters.js` (runs when `data-page="menu"`): `loadMenu()` → on error `renderMenuError`; else render grouped cards via `renderItemCard`; filter button clicks update `aria-pressed` and re-render; search input re-renders debounced 150 ms; update `#results-count` ("12 items shown" / "1 item shown"); a known category with no items shows "Nothing here today"; zero results show "No items found" with a **Clear search and filters** button that resets both and moves focus to the search field
- [X] T024 [US1] Add the Menu page styles to `site/css/styles.css`: responsive card grid (1 column base, 2 at 40em, 3 at 64em), filter buttons with clear pressed state (not color-only: add check icon or underline), badge styles, sold-out styling (label plus reduced emphasis, still ≥ 4.5:1 contrast), long names wrap without overflow at 320 px
- [X] T025 [US1] Run bakery-qa (`npm run menu-check && npm run site-audit`) and the quickstart US1 scenarios (including keyboard-only and screen reader); fix any failures

**Checkpoint**: The Menu page is fully functional and testable on its own (MVP).

---

## Phase 4: User Story 2 - Owner updates the menu without a developer (Priority: P2)

**Goal**: The owner changes only `site/data/menu.json` (using a plain-language guide), and every page reflects it. A broken file degrades politely.

**Independent Test**: quickstart.md → "US2 — Owner edits the menu": add/edit/sold-out/featured changes appear after reload; a broken file shows the polite message and `menu-check` pinpoints the error.

### Tests for User Story 2 ⚠️

- [X] T026 [P] [US2] Add fixture-based tests in `qa/unit/menu-check.test.mjs` that run `qa/menu-check.mjs` on temporary files written to `os.tmpdir()`: valid seed → exit 0; malformed JSON → exit 2 and message containing the position; duplicate id, `price: 3.555`, `image` without `imageAlt`, missing `sun` in hours, `open` ≥ `close`, `timeZone: "Mars/Base"`, `specialDays: ["daily","mon"]` → exit 1 with the matching message each; unknown allergen "mustard" → exit 0 with a warning

### Implementation for User Story 2

- [X] T027 [US2] Fix `qa/menu-check.mjs` until T026 passes (depends on T010, T026)
- [X] T028 [P] [US2] Write the owner guide `site/data/README.md` in plain language: what the file is; how to open and edit it safely (keep quotes and commas); a field table copied from data-model.md §2–3 in non-technical terms; step-by-step recipes for adding an item, changing a price (dollars, max 2 decimals, e.g. `4.5`), marking sold out, featuring, setting specials (`"daily"` or `"mon"`…`"sun"`), removing an item, **never renaming an item's `id`**, adding a photo (800×600 WebP in `assets/img/`, plus `imageAlt`), changing hours (`null` = closed), and setting/clearing the `announcement` (≤ 280 chars); how to run `npm run menu-check` (or rely on the CI check) and what its messages mean
- [X] T029 [US2] Make every page that uses the menu degrade per FR-008: in `site/js/site.js` (`loadMenu`) and its callers ensure `loadMenu()` failure leaves header, nav, footer, and static content working, and each data-driven region (`#menu-list`, Home sections, pre-order list) shows `renderMenuError` with `business` phone from the footer text (since `menu.json` itself failed to load); verify by temporarily breaking the JSON
- [X] T030 [US2] Verify owner edits propagate end to end per quickstart US2 steps 1–4 (add an item, change a price, sold out, featured, special) and record the date, steps, and timing against SC-003 (< 10 minutes using only `site/data/README.md`) in `specs/001-sweet-crumb-website/checklists/owner-edit-verification.md`. `site/data/README.md` stays instructions-only (it is published with the site)

**Checkpoint**: US1 and US2 both work independently. The owner can maintain the menu.

---

## Phase 5: User Story 3 - Plan a visit (Priority: P3)

**Goal**: Home shows the hero, featured items, today's specials, hours with today highlighted, and Open/Closed now (in the bakery's time zone), plus the announcement. Visit shows the address, phone, email, hours, a lazy map, and directions.

**Independent Test**: quickstart.md → "US3 — Plan a visit": hours identical on Home and Visit; specials follow the bakery-local weekday; Open/Closed doesn't change with the OS time zone; directions work with the map blocked.

### Tests for User Story 3 ⚠️

- [X] T031 [P] [US3] Write `qa/unit/home.test.mjs` for `specialsFor(items, dayKey)` (includes `daily` items and items listing `dayKey`; excludes sold-out; empty → `[]`), `featured(items)` (featured and not sold out, in file order), and `hoursRows(hours, todayKey)` (seven rows Mon→Sun, closed days labelled "Closed", times formatted "7:00 AM – 3:00 PM", exactly one row flagged `isToday`)

### Implementation for User Story 3

- [X] T032 [US3] Implement the pure `specialsFor`, `featured` (in `site/js/menu.js`) and `hoursRows` (in `site/js/site.js`) exports to satisfy T031
- [X] T033 [US3] Build the Home page markup in `site/index.html`: hero with `<h1>` (bakery name), tagline slot, `<picture>`/`<img src="assets/img/hero-960.webp" srcset="assets/img/hero-960.webp 960w, assets/img/hero-1600.webp 1600w" sizes="100vw" width="960" height="640" fetchpriority="high">` with descriptive alt and **no** `loading="lazy"`, CTA links "See the menu" (`menu.html`) and "Order a custom cake" (`custom-cakes.html`); sections with `<h2>` "Featured", "Today's specials", "Opening hours" (table container + `<p id="open-status">` + `<div class="notice" data-announcement hidden></div>` next to the hours); `<noscript>` with the phone number; `<script type="module" src="js/menu.js">` **replacing** the shell's `js/site.js` tag
- [X] T034 [US3] Implement Home DOM wiring in `site/js/menu.js` (when `data-page="home"`): fill the tagline; render featured cards (`renderItemCard`) and today's specials using `bakeryNow(business.timeZone).dayKey`; if there are no specials, show "Fresh specials daily — ask at the counter"; on load error use `renderMenuError` for these sections
- [X] T035 [US3] Implement the shared hours renderer in `site/js/site.js`: `renderHours(container, business)` builds an accessible `<table>` (caption "Opening hours", `<th scope="row">` day names) from `hoursRows`, marks today's row with a visible "Today" label (not color-only), and sets `#open-status` to "Open now — until 3:00 PM" / "Closed now — opens Tue 7:00 AM" using `isOpenAt` with `bakeryNow(business.timeZone)` (FR-017, research R6); the announcement slot next to the hours is filled by `site.js` (T016), not here
- [X] T036 [US3] Build `site/visit.html`: `<h1>`, an `<address>` block (street address, `tel:` phone link, `mailto:` email) rendered from `business` by `site.js` with the static footer as fallback, an hours container using `renderHours` with `<div class="notice" data-announcement hidden></div>` next to it, a "Get directions" link (`https://www.openstreetmap.org/search?query=<encoded address>` opened normally), and an OSM `<iframe>` (`src` built from `business.map` lat/lon/zoom as an `openstreetmap.org/export/embed.html?bbox=…&layer=mapnik&marker=lat,lon` URL, `title="Map showing Sweet Crumb Bakery's location"`, `loading="lazy"`, `width="600" height="400"`, CSS `aspect-ratio: 3/2; width: 100%`) placed after the address and hours (FR-032, FR-033, research R11)
- [X] T037 [US3] Add Home and Visit styles to `site/css/styles.css`: hero layout with text over a darkened image overlay meeting contrast, featured/specials card rows, hours table with highlighted today row, announcement `.notice` style, map container
- [X] T038 [US3] Run bakery-qa and quickstart US3 scenarios (including changing the OS time zone and blocking openstreetmap.org); fix any failures

**Checkpoint**: US1–US3 work independently. Visitors can browse and plan a visit.

---

## Phase 6: User Story 4 - Build a pre-order list and send it (Priority: P4)

**Goal**: Visitors add available items to a saved pre-order list, adjust it on its own page, and send it as an email summary with valid pickup details.

**Independent Test**: quickstart.md → "US4 — Pre-order list": add/adjust/remove, persistence across restart, sold-out reconciliation, validation summary, slots ≥ 24 h within hours, email format, and storage-blocked fallback.

### Tests for User Story 4 ⚠️

- [X] T039 [P] [US4] Write `qa/unit/cart.test.mjs` against an injectable storage stub, per `contracts/storage.md`: reads go through `readSavedPreorder` and its rules are tested only in T018; here test the cart on top of it: `createCart` exposes the `notice` returned by `readSavedPreorder`; `add` new → qty 1, existing → +1, at 99 stays 99; `add` of a sold-out or unknown id is rejected; `setQty` clamps to **1–99**; `remove`, `clear` (removes key); storage that throws on **write** → in-memory list keeps working + `notice: "not-saved"`; `reconcile(list, menu)` produces statuses `available | soldOut | removed` per data-model §4; `totals` in integer cents excludes non-available lines
- [X] T040 [P] [US4] Write `qa/unit/preorder-form.test.mjs`: `pickupSlots(business, ymd, now)` yields 30-minute slots from `open` to `close − 30 min`, only those ≥ now + `leadTimes.preorderHours`, none on a `null` day; `validatePreorder(fields, context)` requires `customerName` 1–80 chars, at least one of email (valid format) or phone (≥ 7 digits), an open-day `pickupDate`, a `pickupTime` from the slot list, `notes` ≤ 500 chars, and ≥ 1 available item, with errors keyed by field; `buildPreorderEmail(...)` matches the subject/body format in `contracts/outbound-messages.md` §1 exactly (CRLF, unit labels, "Estimated total: … (before tax; payment at pickup)"), leaves out non-available items, and applies the 1,800-character `mailto:` length guard

### Implementation for User Story 4

- [X] T041 [US4] Implement the pure parts of `site/js/cart.js` (`createCart(storage)`, `add`, `setQty`, `remove`, `clear`, `reconcile`, `totals`) per `contracts/storage.md` (key `sweetcrumb.preorder.v1`, value `{ version: 1, items: [{ id, qty }], updatedAt }`, every storage access in try/catch with in-memory fallback); reuse `PREORDER_KEY` and `readSavedPreorder` imported from `./site.js` for reads, and keep writes in `cart.js`. `cart.js` imports only `site.js` and `form.js`. Must satisfy T039
- [X] T042 [US4] Implement `pickupSlots`, `validatePreorder`, and `buildPreorderEmail` in `site/js/form.js` to satisfy T040
- [X] T043 [US4] Add cart DOM wiring in `site/js/cart.js`: after each mutation dispatch `preorder:change` on `document` with `{ count }`, where `count` is the total saved quantity (`site.js` from T016 listens for this event and for cross-tab `storage` events, and updates the header badge on every page, so `site.js` never imports `cart.js`); show the one-time not-saved / restore-failed notices in `.notice` regions
- [X] T044 [US4] Add "Add to pre-order" to item cards: extend `renderItemCard` in `site/js/menu.js` with a `<button type="button" data-add="<id>">Add to pre-order<span class="visually-hidden">: <name></span></button>`, rendered `disabled` with text "Sold out" for sold-out items (FR-013); wire clicks on Menu (`site/js/filters.js`) and Home (`site/js/menu.js`) to `cart.add` (`menu.js` and `filters.js` may import `cart.js`; `cart.js` must not import either), announcing "Added <name>. 3 items in your pre-order list." in a polite live region; at 99 announce "Call us for larger orders"
- [X] T045 [US4] Build `site/preorder.html` markup: `<h1>Your pre-order list</h1>`, list region `#preorder-list`, empty state ("Your list is empty", link to Menu), estimate total line labelled "Estimated total (before tax)", the send form (`novalidate`): error-summary container (`role="alert"`, `tabindex="-1"`), labelled fields Name, Email, Phone (hint "Email or phone required"), Pickup date (`type="date"`), Pickup time (`<select>` filled from `pickupSlots`), Notes (`maxlength="500"`), `<div class="notice" data-announcement hidden></div>` directly above the submit button "Send pre-order"; post-send panel (hidden) with confirmation text per FR-024, read-only summary `<textarea>`, **Copy summary** button, the bakery email in text, and a **Clear my list** button; `<noscript>` with the phone number; `<script type="module" src="js/cart.js">` **replacing** the shell's `js/site.js` tag
- [X] T046 [US4] Implement Pre-order page DOM wiring in `site/js/cart.js` (when `data-page="preorder"`): render reconciled lines (name, unit price + unit, number input `min=1 max=99` with labelled − / + buttons, line total, Remove); flag `soldOut` lines "Sold out — will not be sent" and `removed` lines "No longer on the menu" with Remove; recompute totals on change; refill the time `<select>` when the date changes (message "No pickup times left that day — please choose another date"); every pickup-date error (past date, closed day, no slots left) appends the weekly opening hours built from `hoursRows` (imported from `./site.js`), e.g. "Our hours: Mon Closed · Tue–Sun 7:00 AM – 3:00 PM" (spec edge case "Pickup in the past or on a closed day"); on submit run `validatePreorder`, render the error summary with links to each field plus per-field messages (`id="<field>-error"`, `aria-describedby`, `aria-invalid="true"`), focus the summary; on success set `location.href` to the `mailto:` from `buildPreorderEmail`, show the post-send panel and move focus to it; **Copy summary** uses `navigator.clipboard.writeText` and falls back to selecting the textarea text
- [X] T047 [US4] Add pre-order styles to `site/css/styles.css`: list rows that stack on mobile, quantity stepper with ≥ 44 px targets, header count badge, error summary and field error styles, post-send panel
- [X] T048 [US4] Run bakery-qa and quickstart US4 scenarios (including browser restart, a sold-out reconciliation, and a private window with storage blocked); fix any failures

**Checkpoint**: US1–US4 work independently. Pre-ordering is complete.

---

## Phase 7: User Story 5 - Request a custom cake (Priority: P5)

**Goal**: A validated custom cake form sends through the configured form service, or falls back to a pre-filled email with identical content.

**Independent Test**: quickstart.md → "US5 — Custom cake request": mailto path with no endpoint, the lead-time message, success with a test endpoint, fallback on an unreachable endpoint, and the honeypot sending nothing.

### Tests for User Story 5 ⚠️

- [X] T049 [P] [US5] Write `qa/unit/cake-form.test.mjs`: `validateCake(fields, business, now)` per data-model §6: required `name` (1–80), email or phone, `pickupDate` on an open weekday and ≥ now + `leadTimes.cakeHours` (when too early, the error includes the earliest valid date and "call us for urgent orders"), `servings`, `flavor`, `consent`; `decoration` ≤ 300, `cakeMessage` ≤ 60, dietary free text ≤ 200; `buildCakePayload(fields)` matches the JSON in `contracts/outbound-messages.md` §2 (field order, `_subject`, `_replyto`, empty optionals as `""`); `buildCakeEmail(fields, business)` matches §3 (`Label: value` lines in the same order, "(not specified)" for empty optionals, closing sentence)

### Implementation for User Story 5

- [X] T050 [US5] Implement `validateCake`, `buildCakePayload`, and `buildCakeEmail` in `site/js/form.js` to satisfy T049
- [X] T051 [US5] Build `site/custom-cakes.html`: `<h1>`, short how-it-works text (72-hour notice, reply within 1 business day, no online payment), and a `novalidate` form (with `<div class="notice" data-announcement hidden></div>` directly above its submit button) with an error-summary container and labelled controls exactly as in data-model §6. That includes `occasion` select (Birthday, Wedding, Anniversary, Baby shower, Graduation, Other), `pickupDate` date, `servings` select (6–8, 10–12, 15–20, 25–30, 40+ (call to discuss)), `flavor` select (Vanilla, Chocolate, Red velvet, Lemon, Carrot, Other + conditional text), `filling` select including "None", `frosting` select (Buttercream, Cream cheese, Ganache, Whipped cream, Fondant), `decoration` textarea `maxlength="300"` (hint: describe the design in words; no images or links), `cakeMessage` `maxlength="60"`, `dietary` `<fieldset>` checkboxes (egg-free, dairy-free, nut-free, vegan) + text `maxlength="200"`, `budget` select (under $50, $50–100, $100–200, $200+), required `consent` checkbox, and a honeypot `_gotcha` input wrapped in a container with `aria-hidden="true"`, positioned off-screen, `tabindex="-1"`, `autocomplete="off"`. Also a hidden confirmation panel, the copy panel (as on pre-order), a `<noscript>` message with phone and email, and `<script type="module" src="js/form.js">` **replacing** the shell's `js/site.js` tag
- [X] T052 [US5] Implement cake form DOM wiring in `site/js/form.js` (when `data-page="cakes"`): set the date input's `min` to the earliest valid date; on submit run `validateCake` → error summary + per-field errors (same pattern as T046); every pickup-date error (past date, closed day, sooner than the 72-hour lead time) appends the weekly opening hours built from `hoursRows` (imported from `./site.js`), alongside the earliest valid date where applicable; if `_gotcha` is filled → show success and send nothing; if `business.cakeFormEndpoint` is non-empty → `fetch` POST JSON with `Accept: application/json` and a 10 s `AbortController` timeout; on 2xx show the confirmation ("We'll reply within 1 business day to confirm and quote"), move focus to it, and reset the form; on empty endpoint, non-2xx, network error, or timeout → show "We couldn't send that online…" (only if a POST was attempted), open the `buildCakeEmail` `mailto:`, show the copy panel, and keep all answers
- [X] T053 [US5] Run bakery-qa and quickstart US5 scenarios (empty endpoint, test endpoint, unreachable endpoint, honeypot); fix any failures

**Checkpoint**: US1–US5 work independently.

---

## Phase 8: User Story 6 - Get to know the bakery (Priority: P6)

**Goal**: An About page with the bakery's story and team.

**Independent Test**: quickstart.md → "US6 — About": story and team (photo, name, role, bio) readable at 320 px; a missing photo uses the placeholder without breaking the layout.

### Implementation for User Story 6

- [X] T054 [US6] Write `site/about.html` content as static HTML (placeholder text marked with HTML comments `<!-- REPLACE: … -->`): a story section `<section id="our-story">` (`<h2>Our story</h2>`, 2–3 paragraphs; site-audit's menu-name check skips this section, so it may mention items by name) and a team section (`<h2>Meet the team</h2>`) with a list of 3 `<article>`s, each with `<img src="assets/img/team-<name>.webp" width="400" height="400" loading="lazy" alt="Portrait of <name>">`, `<h3>` name, role, and a 1–2 sentence bio
- [X] T055 [US6] Add About styles to `site/css/styles.css` (team grid 1/2/3 columns at base/40em/64em, round portraits with a crust-colored border) and a placeholder strategy that needs no inline event handlers (forbidden by site-audit): a CSS background of `placeholder.webp` on the portrait frame so a missing image still shows the placeholder
- [X] T056 [US6] Run bakery-qa and the quickstart US6 scenario; fix any failures

**Checkpoint**: All six user stories are independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Deployment, performance and accessibility hardening, documentation

- [X] T057 Create `.github/workflows/deploy.yml` per research R14: triggers `push` to `main`, `pull_request`, `workflow_dispatch`; top-level `permissions: { contents: read }` only; the `deploy` job alone adds `permissions: { contents: read, pages: write, id-token: write }`, so the `qa` job, which also runs on pull requests, gets read-only access; `concurrency: { group: "pages", cancel-in-progress: false }`; job `qa` on `ubuntu-latest`: `actions/checkout`, `actions/setup-node` (`node-version: lts/*`, `cache: npm`), `npm ci`, `npm run menu-check`, `npm run site-audit -- --lighthouse`; job `deploy` (`needs: qa`, `if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'`, `environment: github-pages` with `url: ${{ steps.deployment.outputs.page_url }}`): `actions/configure-pages`, `actions/upload-pages-artifact` with `path: site`, `actions/deploy-pages` (`id: deployment`). Use each action's current major version tag
- [X] T058 [P] Add `netlify.toml` at the repo root with `[build] publish = "site"` and an empty `command`, so Netlify deploys as-is (constitution deployability)
- [X] T059 Run `npm run qa` (with Lighthouse) locally; fix any category below 0.90 on any page (likely levers: image sizes, hero `fetchpriority`, map iframe placement, contrast, tap-target spacing, meta descriptions) until it passes
- [ ] T060 [P] Do a full manual accessibility pass per constitution workflow gate 3 and spec SC-007: keyboard-only walkthrough of every user story, screen reader (VoiceOver or NVDA) check of filters, live regions, form errors, and pre-order count; 200% zoom; widths 320/768/1280 px with no horizontal scroll; `prefers-reduced-motion`. Record any issues found and fixed in `specs/001-sweet-crumb-website/checklists/accessibility-pass.md`
- [X] T061 [P] Complete the root `README.md`: project summary, screenshots placeholder, tech decisions (link research.md), local run, `npm run qa`, deployment (GitHub Pages Settings → Pages → Source: GitHub Actions; Netlify alternative), owner guide link (`site/data/README.md`), Spec Kit workflow used (constitution → specify → clarify → plan → tasks → implement), and a link to `PROMPT_LOG.md`
- [X] T062 Remove the temporary Sync Impact Report HTML comment from `.specify/memory/constitution.md` (per its own instructions) and, as a PATCH amendment to v1.0.1 dated the day of the change, replace the TODO(BAKERY_QA_EXTENSION) reference by stating that bakery-qa is the `qa/` suite run via `npm run qa`
- [ ] T063 Run the full `specs/001-sweet-crumb-website/quickstart.md` validation from a clean clone (`npm ci`, static server, all scenarios, `npm run qa`) and confirm every success criterion SC-001…SC-009. Include a cross-browser pass on the constitution's supported browsers (current and previous Chrome, Edge, Firefox, Safari, plus iOS Safari): pre-order list survives a browser restart (SC-008); the pickup date field and the time `<select>` work and validate; **Copy summary** copies, or falls back to selected text; and "Open now"/"Closed now" matches the bakery time zone. Record results in `specs/001-sweet-crumb-website/checklists/cross-browser.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories**
- **User Stories (Phases 3–8)**: Each depends only on Foundational; take them in priority order (P1 → P6) when working solo
- **Polish (Phase 9)**: Depends on all desired stories. T057/T058 can be done any time after Phase 2 if early deploys are wanted

### User Story Dependencies

- **US1 (P1)**: After Phase 2. No dependency on other stories
- **US2 (P2)**: After Phase 2. Exercises loader/error paths from Phase 2; independent of US1 (verifiable on Home/Menu shells)
- **US3 (P3)**: After Phase 2. Reuses `renderItemCard` (Phase 2) for featured/specials; independent of US1
- **US4 (P4)**: After Phase 2. Adds buttons to cards rendered by US1 (Menu) and US3 (Home); if those aren't built yet, the Pre-order page itself is still testable by seeding storage with valid ids
- **US5 (P5)**: After Phase 2. Fully independent
- **US6 (P6)**: After Phase 2. Fully independent

### Within Each User Story

- Unit tests are written first and must fail → pure logic → markup → DOM wiring → styles → bakery-qa + quickstart run
- Edits to `site/css/styles.css`, `site/js/menu.js`, `site/js/site.js`, and `site/js/form.js` are shared across stories, so tasks touching the same file are **not** parallel with each other

---

## Parallel Opportunities

- **Phase 1**: T003 and T004 in parallel after T001–T002
- **Phase 2**: T006, T007, T008, T009 in parallel; T015 page copies in parallel once T014 is done; T018 in parallel with T017's DOM work
- **Across stories** (with more than one person after Phase 2): US1, US3, US5, and US6 touch mostly different files and can proceed in parallel; coordinate on `styles.css` sections
- **Test-writing tasks** marked [P] (T020, T026, T031, T039, T040, T049) can all be written in parallel, since each is its own file

## Parallel Example: User Story 4

```bash
# Write both US4 test files together (different files):
Task: "T039 Write qa/unit/cart.test.mjs per contracts/storage.md"
Task: "T040 Write qa/unit/preorder-form.test.mjs (pickupSlots, validatePreorder, buildPreorderEmail)"

# Then implement the two pure modules together (different files):
Task: "T041 Implement pure cart functions in site/js/cart.js"
Task: "T042 Implement pickupSlots/validatePreorder/buildPreorderEmail in site/js/form.js"
```

## Parallel Example: Foundational

```bash
Task: "T006 Produce placeholder WebP images in site/assets/img/"
Task: "T007 Create SVG icons in site/assets/img/icons/"
Task: "T008 Implement qa/lib/report.mjs"
Task: "T009 Implement qa/lib/html.mjs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational (bakery-qa gate working, shells pass the audit)
2. Phase 3 (US1) → **STOP and VALIDATE** with quickstart US1 + `npm run qa`
3. Optionally do T057 early to deploy the MVP to GitHub Pages

### Incremental Delivery

1. Foundation → US1 (menu) → deploy
2. + US2 (owner guide, resilient loading) → deploy
3. + US3 (Home + Visit) → deploy: a complete brochure site
4. + US4 (pre-order) → deploy
5. + US5 (cake requests) → deploy
6. + US6 (About) → Polish → final deploy

Each increment must pass bakery-qa before it's called done (constitution VI).

---

## Notes

- [P] = different files, no dependency on incomplete tasks
- [USn] maps each task to its user story for traceability
- Commit after each task or logical group (initialize git first if the repo isn't one yet)
- Stop at any checkpoint to validate a story independently
- Avoid: hard-coding menu data in HTML, absolute URLs, web fonts, inline event handlers, and any `site/` dependency on `node_modules`
