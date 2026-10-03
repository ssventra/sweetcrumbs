# Research: Sweet Crumb Bakery Website

**Feature**: `001-sweet-crumb-website` | **Date**: 2026-10-03 | **Plan**: [plan.md](./plan.md)

Each entry resolves an open point from the Technical Context or the spec. User-mandated choices
(semantic HTML5, one CSS file with custom properties, ES modules, `fetch` of `data/menu.json`,
`localStorage` with try/catch, WebP in `assets/img`, Node only for bakery-qa, GitHub Actions →
GitHub Pages running menu-check and site-audit) are taken as fixed inputs.

---

## R1. What "bakery-qa" is

- **Decision**: bakery-qa is a project-local QA suite in `qa/`, run with Node, made of two
  commands: `menu-check` (validates `site/data/menu.json` against the
  [menu contract](./contracts/menu.schema.json) plus semantic rules) and `site-audit` (static
  checks of every HTML page and asset, plus a Lighthouse run). Pure-logic unit tests run with
  Node's built-in test runner as part of `site-audit`. The CLI contract is in
  [contracts/qa-cli.md](./contracts/qa-cli.md).
- **Rationale**: The constitution (Principle VI) requires a bakery-qa gate, but no such
  extension was installed. The user said "Use a Node script for the bakery-qa checks only",
  which defines it. Keeping it in-repo means the same checks run locally and in CI.
- **Alternatives considered**: Packaging it as a Spec Kit extension registered in
  `.specify/extensions.yml`. Deferred: it adds packaging work without changing what is checked.
  The scripts can be wrapped in an extension later.

## R2. Which third-party packages bakery-qa uses

- **Decision**: `menu-check`, the static part of `site-audit`, and the unit tests use **Node
  built-ins only** (`node:fs`, `node:path`, `node:test`, `node:assert`, `Intl`). The only npm
  dependency is **Lighthouse CI (`@lhci/cli`)**, declared as a `devDependency` in a private
  root `package.json` with an exact pinned version. `site-audit --lighthouse` uses it.
- **Rationale**: Principle IV requires Lighthouse ≥ 90 in all four categories (the plan raises
  accessibility to 100 to meet SC-007). Lighthouse's
  Accessibility category runs axe-core, so it also covers WCAG checks. Everything else can be
  checked without packages, which keeps the QA suite fast and easy to review.
- **Alternatives considered**: Playwright + axe-core for full browser accessibility tests,
  rejected as heavier with mostly overlapping coverage. A hand-written HTML parser library
  (e.g. parse5) was rejected; the site's HTML is authored in a consistent style, so targeted
  checks are enough.
- **Constitution note**: The npm package is used only for QA. Nothing under `site/` depends on
  it, and viewing the site never requires `npm install`. Principle I is unaffected.

## R3. Repository layout: public site in `site/`

- **Decision**: Everything that is published lives in `site/` (`site/index.html`,
  `site/data/menu.json`, `site/assets/img/…`, `site/css/…`, `site/js/…`). Specs, QA scripts,
  `.claude/`, `PROMPT_LOG.md`, and `package.json` stay outside it. GitHub Pages publishes
  `site/` as the artifact; Netlify uses `site` as its publish directory with no build command.
- **Rationale**: This prevents publishing internal files (specs, the prompt log,
  `node_modules`). Choosing a publish folder is configuration, not a build step, so "deployable
  as-is" still holds. The user's paths (`data/menu.json`, `assets/img`) are unchanged
  relative to the site root.
- **Alternatives considered**: Site files at the repo root, with a copy step in CI to exclude
  internal files. Rejected: the copy step is a hidden build step, and Netlify would publish
  everything.

## R4. Serving requirement (fetch + ES modules)

- **Decision**: The site is viewed through any static server (`npx serve site`,
  `python3 -m http.server -d site`). Opening the files directly via `file://` is unsupported,
  as the constitution already states.
- **Rationale**: Browsers block both `fetch()` of local files and ES module loading from
  `file://`. GitHub Pages and Netlify are HTTP servers, so production is unaffected.

## R5. JavaScript module layout

- **Decision**: Five modules in `site/js/`. Four are the ones the user named; `site.js` is
  shared code needed on every page.

  | Module | Responsibility | Pure (unit-testable) exports |
  |---|---|---|
  | `menu.js` | Render menu cards, featured items, today's specials; wire Home add-to-pre-order | `specialsFor(day)`, `featured()` |
  | `filters.js` | Category filter + search state, result count, live announcements | `filterItems(items, {category, query})` |
  | `cart.js` | Pre-order list writes (try/catch + in-memory fallback), add/update/remove/clear, `preorder:change` events, pre-order page rendering | `addItem`, `setQty`, `reconcile(list, menu)`, `totals` |
  | `form.js` | Validation for pre-order and cake forms, pickup slot generation, building mailto and form-service submissions | `validate*`, `pickupSlots`, `buildPreorderEmail`, `buildCakeEmail` |
  | `site.js` | **Base module, no imports.** Menu loading (`data/menu.json`, cached promise), normalization, load-failure message, business info rendering (hours, open-now, announcement), bakery-time-zone clock, price formatting, saved pre-order reading, and the header count badge on every page | `loadMenu`, `normalizeMenu`, `bakeryNow(tz)`, `isOpenAt`, `hoursRows`, `formatPrice`, `readSavedPreorder` |

  Imports form a one-way chain with no cycles: `site.js` ← `form.js` ← `cart.js` ← `menu.js`
  ← `filters.js` (each module may import only modules to its left). `site.js` imports
  nothing, so it never needs `cart.js`: it reads the saved list itself for the header count
  and listens for `preorder:change`.

  Each page loads exactly one module entry with `<script type="module" src="js/…">`. ES
  modules are deferred by default, satisfying Principle IV. DOM code and pure logic are kept in
  separate functions so `node --test` can import the pure parts without a browser.
- **Rationale**: Matches the user's file names and keeps each module focused. Without
  `site.js`, the hours and time-zone logic would be duplicated across four pages.
- **Alternatives considered**: One `main.js`, rejected as harder to test and to review.

## R6. Time zone for "Open now", specials, and pickup checks

- **Decision**: `business.timeZone` (an IANA name, e.g. `America/New_York`) in `menu.json`.
  All "today", "open now", and pickup lead-time calculations use the bakery's wall-clock time,
  obtained via `Intl.DateTimeFormat(…, { timeZone })`. Lead time is compared in bakery-local
  wall-clock minutes. That can be off by one hour across a DST change, which is acceptable
  because the bakery confirms every request manually.
- **Rationale**: Resolves the low-impact item left Outstanding by `/speckit-clarify`. The
  visitor's clock gives wrong answers for visitors in other time zones. `Intl` is built into
  every supported browser, so no library is needed.
- **Alternatives considered**: The visitor's local time (the spec's original wording, since corrected in FR-017; incorrect across time
  zones); a date library (violates Principle I).

## R7. Custom cake form delivery

- **Decision**: A generic **form-endpoint service** that accepts a `POST` with JSON
  (Formspree-compatible: `Accept: application/json`, honeypot field `_gotcha`). The endpoint
  URL is `business.cakeFormEndpoint` in `menu.json`. If it is empty, or the request fails or
  times out after 10 seconds, the site falls back to a pre-filled `mailto:` with identical
  content (FR-028). Spam protection uses a visually hidden honeypot field that is also
  hidden from assistive technology (`aria-hidden`, `tabindex="-1"`). Contract:
  [outbound-messages.md](./contracts/outbound-messages.md).
- **Rationale**: Formspree-style services work on GitHub Pages with no server and have free
  tiers, and the owner can change provider by changing one URL. Netlify Forms was rejected
  because it only works when hosted on Netlify, and the chosen deploy target is GitHub Pages.
- **Alternatives considered**: mailto only (simpler, but depends on the visitor having an
  email app); Netlify Forms (host lock-in).

## R8. Pre-order email (mailto) size limits

- **Decision**: The pre-order summary is compact plain text, one line per item. If the
  encoded `mailto:` URL exceeds 1,800 characters, the body is shortened to a short header plus
  "full list below — please paste", and the page shows the full summary in a read-only text
  area with a **Copy summary** button (`navigator.clipboard.writeText`, falling back to text
  selection) and the bakery's email address. The same copy panel is always offered after
  sending (spec edge case "No email app configured").
- **Rationale**: Some email clients truncate or reject very long `mailto:` URLs (around 2,000
  characters in some clients). Writing to the clipboard is allowed; reading from it is never
  needed.

## R9. Pre-order storage

- **Decision**: The key is `sweetcrumb.preorder.v1`. The value is
  `{ version: 1, items: [{ id, qty }], updatedAt }`, storing only IDs and quantities; names
  and prices always come from the current menu (FR-021). Every storage access is wrapped in
  try/catch. On failure the list is held in memory, and a one-time notice says it won't be
  saved. A `storage` event listener keeps the header count in sync across tabs. Corrupt or
  unknown-version data is discarded with a notice. Contract:
  [storage.md](./contracts/storage.md).
- **Rationale**: Storing only IDs means price changes take effect automatically, and items
  that are sold out or removed are detected by checking each saved ID against the current
  menu (FR-025).

## R10. Prices

- **Decision**: The owner writes `price` as a decimal number of dollars (e.g. `4.5`).
  `menu-check` rejects values that are ≤ 0 or have more than two decimal places. Code converts
  prices to integer cents before any arithmetic, and formats them with
  `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
- **Rationale**: Dollar amounts are easy for the owner to type; integer cents avoid
  floating-point rounding errors in totals.

## R11. Map embed

- **Decision**: An OpenStreetMap embed `<iframe>` with `loading="lazy"`, a descriptive
  `title`, and fixed `width`/`height` (CSS `aspect-ratio`). It sits below the address and
  hours. A plain **Get directions** link (to a maps search for the address) is always shown,
  so it works when the map is blocked (FR-032, FR-033).
- **Rationale**: Lazy loading keeps the iframe from delaying the initial page load. OSM sets
  no advertising cookies, which avoids Lighthouse Best Practices deductions for third-party
  cookies. No API key is needed.
- **Alternatives considered**: Google Maps embed (heavier, third-party cookies); a static map
  image with click-to-load (best performance, but needs an extra image asset the owner must
  regenerate if the bakery moves; can be adopted later if scores require it).

## R12. Fonts and the rustic look

- **Decision**: No web fonts. Headings use a system serif stack
  (`"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`), body text a system sans
  stack. The rustic feel comes from the theme's custom properties: warm palette (flour cream,
  crust brown, berry accent, sage), a small tiled WebP paper texture (≤ 15 KB), soft
  rounded cards, and a hand-drawn SVG divider. Every text/background token pair is chosen to
  meet 4.5:1 contrast; they are listed in the CSS header comment.
- **Rationale**: Web fonts are the most common cause of render-blocking and layout shift.
  Principle IV requires justifying them, and system serifs give the warm feel at no cost.
- **Alternatives considered**: A self-hosted WOFF2 display font, possible later with
  `font-display: swap` if the owner wants a specific brand font.

## R13. Images

- **Decision**: All raster images are WebP in `site/assets/img/`. Menu photos are 800×600
  (displayed ≤ 400 CSS px, so sharp on 2× screens). The hero has 960w and 1600w variants via
  `srcset`, with `fetchpriority="high"` and no lazy loading. All other images use
  `loading="lazy"` and explicit `width`/`height`. Size budgets enforced by `site-audit`: menu
  photos ≤ 120 KB, hero variants ≤ 200 KB, other images ≤ 150 KB. A missing or absent item
  photo falls back to `assets/img/placeholder.webp`. Placeholder content images are generated
  once with any image tool (e.g. `cwebp`) and committed, so no image pipeline is needed.
- **Rationale**: Satisfies Principle IV and SC-006 with no build step. A single size per menu
  photo keeps owner updates to "add one file".

## R14. Deployment workflow

- **Decision**: `.github/workflows/deploy.yml`, triggered on push to `main` and manually.
  - **Job `qa`**: checkout → `actions/setup-node` (LTS, npm cache) → `npm ci` →
    `npm run menu-check` → `npm run site-audit -- --lighthouse` (Lighthouse CI against
    `site/` via its static server, mobile preset, asserting ≥ 0.90 on performance,
    best-practices, and SEO, and 1.0 on accessibility so that no scored accessibility audit
    may fail (SC-007)).
  - **Job `deploy`** (`needs: qa`, only on `main`): `actions/configure-pages` →
    `actions/upload-pages-artifact` (path `site`) → `actions/deploy-pages`. Permissions:
    workflow-level `contents: read` only; `pages: write` and `id-token: write` are granted to
    the `deploy` job alone. A concurrency group prevents
    overlapping deploys.
  - Pull requests run only the `qa` job.
- **Rationale**: Deployment happens only after both bakery-qa checks pass (Principle VI).
  Action versions are pinned to current major versions when the workflow is written.

## R15. Accessibility patterns

- **Decision**:
  - Category filter: a group of toggle `button`s with `aria-pressed`, inside a `fieldset`-like
    group with a visible label, so it doesn't need roving-tabindex code.
  - Search: `<input type="search">` with a visible label. Results update as the visitor types
    (debounced 150 ms); the count updates an `aria-live="polite"` region.
  - Add-to-pre-order confirmation: the same polite live region, plus the header count.
  - Forms: native validation is turned off (`novalidate`) in favor of custom messages. Each
    error is linked with `aria-describedby`; an error summary at the top receives focus, with
    links to each field (FR-027).
  - "Sold out": shown as visible text, and the add button is `disabled` with explanatory text.
  - Skip link, `:focus-visible` styles, `prefers-reduced-motion` respected.
- **Rationale**: Native elements give keyboard support and correct screen-reader semantics
  without extra scripting.

## R16. No-JavaScript behavior

- **Decision**: The header, navigation, footer (with plain-text phone and address, per
  FR-004), About content, and page structure are static HTML. Menu, specials, hours, and forms
  each show a `<noscript>` message with the phone number.
- **Rationale**: Satisfies the spec's JavaScript-disabled edge case and keeps important SEO
  content (name, address, phone) in static HTML.
