# Contract: bakery-qa CLI

**Location**: `qa/` (Node, built-ins only, except Lighthouse CI) | Related:
[research.md R1–R2, R14](../research.md)

The constitution's Principle VI gate is these commands. A feature is done only when both
exit `0` (with `--lighthouse` for `site-audit`).

## Commands

| npm script | Underlying command | Purpose |
|---|---|---|
| `npm run menu-check` | `node qa/menu-check.mjs [path]` | Validate the menu file (default `site/data/menu.json`) |
| `npm run site-audit` | `node qa/site-audit.mjs [--lighthouse]` | Unit tests + static audit of `site/`; with `--lighthouse`, also Lighthouse CI |
| `npm run qa` | menu-check, then `site-audit --lighthouse` | Full gate; same as CI |

Requirements: Node LTS (≥ 22). `npm ci` is needed only for `--lighthouse`, which also needs a
local Chrome/Chromium.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | All checks passed (warnings may be printed) |
| 1 | One or more checks failed |
| 2 | Could not run (file missing, JSON unreadable, Chrome not found for `--lighthouse`) |

## Output format

Human-readable and written for the owner as well as developers. One line per finding:

```text
✖ ERROR  items[4] "Cinnamon Roll": price 3.555 has more than 2 decimal places
⚠ WARN   items[9] "Rye Loaf": unknown allergen "mustard" (will show as a plain badge)
✔ menu-check: 24 items, 0 errors, 1 warning
```

Static-audit findings name the file and line: `✖ ERROR  site/menu.html:42  <img> missing alt`.

## menu-check rules

Everything in [menu.schema.json](./menu.schema.json) **plus**:

| Rule | Severity |
|---|---|
| Item `id`s unique | error |
| `price` has ≤ 2 decimal places | error |
| `image` file exists under `site/` and `imageAlt` present | error |
| `hours.*.open` < `close` | error |
| `timeZone` accepted by `Intl.DateTimeFormat` | error |
| `specialDays` doesn't mix `daily` with weekday names | error |
| Unknown `category` | warning |
| Unknown allergen value | warning |
| No item in some known category | warning |
| `featured` item that's also `soldOut` | warning (hidden from Home) |
| At least one open day in `hours` | error |

## site-audit rules

**Unit tests**: `node --test` on each `qa/unit/*.test.mjs` file (listed explicitly; Node does not accept a bare directory) exercises the pure exports listed in research.md R5
(filtering/search, cart reconciliation and clamping, totals in cents, pickup slots and lead
time in the bakery time zone, email builders and length guard, form validators).

**Static checks** on every `site/**/*.html`:

| Check | Constitution / spec |
|---|---|
| `<!doctype html>`, `<html lang>`, `<title>`, meta description, viewport meta | Tech constraints |
| Exactly one `<h1>`; `header`, `nav`, `main`, `footer` present; skip link targets `#main` | III |
| Every `<img>` has `alt` (may be empty), `width`, `height` | III, IV |
| Raster images are `.webp`; files exist; within size budgets (R13) | IV |
| `loading="lazy"` on all images except the one marked `fetchpriority="high"` | IV |
| `<script>` tags are `type="module"` (or `defer`); **exactly one** module script per page; no inline event-handler attributes | IV, plan |
| All `href`/`src` are relative and resolve to existing files (external `https:`, `mailto:`, `tel:` allowed) | Tech constraints |
| Exactly one stylesheet link, to `css/styles.css` | Plan |
| No menu item `name` from `menu.json` appears in any HTML file, except inside `about.html`'s `<section id="our-story">` (the bakery's story may mention items by name) | II |
| Footer contains `business.phone` and the formatted address exactly | FR-004, SC-009 |
| Every form control has an associated `<label>` | III |
| `<iframe>` has `title` and `loading="lazy"` | III, IV |

**Lighthouse** (`--lighthouse`): Lighthouse CI serves `site/` with its static server,
audits every page with the mobile preset (3 runs each, median), and asserts category scores
≥ 0.90 for performance, best-practices, and SEO, and **= 1.0 for accessibility** (every
scored accessibility audit must pass, per SC-007). Config:
`lighthouserc.json` at the repo root.
