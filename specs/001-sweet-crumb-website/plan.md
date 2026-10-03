# Implementation Plan: Sweet Crumb Bakery Website

**Branch**: `001-sweet-crumb-website` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-sweet-crumb-website/spec.md`

## Summary

A six-page static website for Sweet Crumb Bakery: Home, Menu, About, Custom Cakes, Visit, and
Pre-order. All menu items and business details come from one owner-edited file,
`site/data/menu.json`. The pages are semantic HTML5, styled by one CSS file whose
custom properties define the warm, rustic theme. Behavior comes from five vanilla ES modules
(`menu.js`, `filters.js`, `cart.js`, `form.js`, `site.js`). The pre-order list is kept in
`localStorage`, with an in-memory fallback, and sent as a `mailto:` summary. Cake requests
go to a configurable form service, falling back to `mailto:`.

A Node-based **bakery-qa** suite (`menu-check`, `site-audit` with Lighthouse CI) is the
constitution's quality gate. A GitHub Actions workflow runs it and deploys the `site/` folder
to GitHub Pages only when it passes.

## Technical Context

**Language/Version**: HTML5, CSS3 (custom properties, `aspect-ratio`, `:focus-visible`), JavaScript ES2022 as native ES modules; Node LTS (≥ 22) for QA only

**Primary Dependencies**: None at runtime. QA only: `@lhci/cli` (exact pinned `devDependency`); everything else uses Node built-ins

**Storage**: `site/data/menu.json` (static file, read via `fetch`); browser `localStorage` key `sweetcrumb.preorder.v1` with in-memory fallback

**Testing**: bakery-qa: `node --test` unit tests of pure module functions; `menu-check` (schema + semantic rules); `site-audit` static HTML/asset checks; Lighthouse CI (mobile; ≥ 0.90 performance/best-practices/SEO, 1.0 accessibility so no scored accessibility audit may fail, per SC-007); manual keyboard/screen-reader scenarios in [quickstart.md](./quickstart.md)

**Target Platform**: Current and previous major versions of Chrome, Edge, Firefox, Safari (incl. iOS Safari); served by GitHub Pages (primary) or Netlify

**Project Type**: Static website, no build step (single project)

**Performance Goals**: Lighthouse (mobile) ≥ 90 performance/best-practices/SEO and 100 accessibility; LCP < 2.5 s on mid-range phone/4G (SC-006); CLS ≈ 0 (all media sized); total JS < 30 KB uncompressed; CSS < 25 KB

**Constraints**: No frameworks, bundlers, or transpilers; must work under a GitHub Pages sub-path (relative URLs only); requires HTTP serving (not `file://`); no web fonts; WebP only for raster images; third-party content limited to the lazy OSM map iframe and the optional form-service POST

**Scale/Scope**: 6 pages + 404; ~20–40 menu items; one owner editor; low traffic (neighborhood bakery); 5 JS modules; 1 stylesheet

All Technical Context items are resolved. The decisions and alternatives are recorded in
[research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v1.0.0 (`.specify/memory/constitution.md`).

| # | Principle / Section | Pre-research | Post-design | Evidence |
|---|---|---|---|---|
| I | Pure Static Output | ✅ | ✅ | HTML/CSS/vanilla ES modules; no runtime deps; no build step; Node used only for QA, never needed to view (R2, R3) |
| I | HTTP-served, not `file://` | ✅ | ✅ | `fetch` + ES modules need a server; documented in quickstart (R4) |
| II | Content-Driven Menu | ✅ | ✅ | All items + business info in `site/data/menu.json` (clarification 1); `site-audit` fails if any item name appears in HTML; schema in contracts |
| III | Accessibility WCAG 2.1 AA | ✅ | ✅ | Native controls, `aria-pressed` filters, live regions, error-summary pattern, skip link, reduced motion (R15); Lighthouse accessibility = 100 (no failing scored audit, SC-007) + static checks + manual keyboard/SR scenarios |
| IV | Performance Budget | ✅ | ✅ | WebP with budgets, sized images, lazy below fold, eager + `fetchpriority` hero (R13); modules are deferred; no web fonts (R12); lazy map (R11); Lighthouse ≥ 90 perf/best-practices/SEO and 100 accessibility enforced in CI |
| V | Mobile-First Responsive | ✅ | ✅ | Base CSS for small screens, `min-width` queries; 320/768/1280 checks; 44 px targets (quickstart) |
| VI | QA Gate (bakery-qa) | ⚠️ extension missing | ✅ | Defined as `qa/` Node suite with CLI contract (R1, [qa-cli.md](./contracts/qa-cli.md)); CI blocks deploy on failure (R14). Resolves the constitution's TODO(BAKERY_QA_EXTENSION) |
| — | Deploy as-is (GH Pages/Netlify) | ✅ | ✅ | `site/` published directly; no build command; relative URLs checked by `site-audit` (R3, R14) |
| — | Page metadata (title, description, lang, viewport) | ✅ | ✅ | Enforced by `site-audit` static checks |
| — | Workflow gates 1–6 | ✅ | ✅ | Covered by `npm run qa` + quickstart manual scenarios |

**Gate result**: PASS. The pre-research warning on Principle VI is resolved by this design and
doesn't need a Complexity Tracking entry.

## Project Structure

### Documentation (this feature)

```text
specs/001-sweet-crumb-website/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R16
├── data-model.md        # Phase 1: menu.json, storage, outbound messages
├── quickstart.md        # Phase 1: run + validation scenarios
├── contracts/
│   ├── menu.schema.json     # JSON Schema for site/data/menu.json
│   ├── storage.md           # localStorage pre-order contract
│   ├── outbound-messages.md # mailto + form-service payloads, error UX
│   └── qa-cli.md            # bakery-qa commands, rules, exit codes
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
site/                          # ← the published site (GitHub Pages artifact / Netlify publish dir)
├── index.html                 # Home: hero, featured, today's specials, hours, announcement
├── menu.html                  # Menu: filters, search, cards, allergen notice
├── about.html                 # Story + team (static HTML)
├── custom-cakes.html          # Cake request form
├── visit.html                 # Address, phone, email, hours, OSM map, directions
├── preorder.html              # Pre-order list + send form
├── 404.html
├── css/
│   └── styles.css             # the single stylesheet; theme = custom properties at :root
├── js/
│   ├── site.js                # BASE (no imports): loadMenu/normalizeMenu, business info, hours/open-now (bakery TZ), prices, header count
│   ├── menu.js                # render cards/featured/specials (imports site.js, cart.js)
│   ├── filters.js             # category + search filtering, live count
│   ├── cart.js                # pre-order writes + page (imports site.js, form.js)
│   └── form.js                # validation, pickup slots, mailto/form-service submit (imports site.js)
├── data/
│   ├── menu.json              # the ONE owner-edited file (business + items)
│   └── README.md              # plain-language owner guide (FR-007)
└── assets/
    └── img/                   # WebP only: hero-960/1600, items, team, placeholder, texture
        └── icons/             # SVG (divider, basket, search); the logo is inline SVG in each page header

qa/                            # bakery-qa (Node; never published)
├── menu-check.mjs
├── site-audit.mjs
├── lib/                       # shared helpers (report formatting, HTML scanning)
└── unit/                      # node --test suites importing pure exports from site/js/*

.github/workflows/deploy.yml   # qa job → deploy job (GitHub Pages)
lighthouserc.json              # LHCI: staticDistDir site, mobile preset, ≥0.90 ×3 + accessibility 1.0
package.json                   # private; scripts: menu-check, site-audit, qa; devDep: @lhci/cli
README.md                      # project overview, how to run, how to deploy
```

**Structure Decision**: This is a single static-site project. Published files live in `site/`
so internal material (specs, `qa/`, `.claude/`, `PROMPT_LOG.md`, `node_modules`) is never
deployed. The user's paths (`data/menu.json`, `assets/img`) are kept relative to the site
root. There is one entry module per page (`site.js` is imported by every page; pages
needing more import `menu.js`, `filters.js`, `cart.js`, or `form.js`), so no bundler is needed.

**Page → module map**

| Page | Entry module | Also imports |
|---|---|---|
| `index.html` | `js/menu.js` | `site.js`, `cart.js` (→ `form.js`) |
| `menu.html` | `js/filters.js` | `menu.js`, `cart.js`, `form.js`, `site.js` |
| `preorder.html` | `js/cart.js` | `form.js`, `site.js` |
| `custom-cakes.html` | `js/form.js` | `site.js` |
| `visit.html`, `about.html`, `404.html` | `js/site.js` | — |

Every page has **exactly one** `<script type="module">` tag: its entry module. `site.js` runs on
every page because every entry module imports it, so pages with their own entry don't also
include a `site.js` tag.

**Import rule (no cycles)**: `site.js` ← `form.js` ← `cart.js` ← `menu.js` ← `filters.js`.
A module may import only modules to its left. `site.js` imports nothing.

Each module detects its page through a `data-page` attribute on `<body>` and initializes only
what that page needs, so the pure exports stay importable by `node --test`.

## Complexity Tracking

No constitution violations to justify.

One design choice for reviewers: the root `package.json` adds a **QA-only** npm dependency
(`@lhci/cli`). It does not count as a Principle I violation, because nothing in `site/` uses
it and the site needs no install or build to view or deploy.
