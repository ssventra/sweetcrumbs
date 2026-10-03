# Sweet Crumb Bakery

A static website for **Sweet Crumb Bakery**, a (fictional) neighborhood bakery. Visitors can
browse the menu with filters, search, and allergen labels, check today's specials and opening
hours, build a pre-order list and send it by email, and request a custom cake. The owner
updates everything by editing **one JSON file**.

Built with plain HTML, CSS, and JavaScript modules: no framework, no build step, no backend.
It was developed spec-first with [Spec Kit](https://github.com/github/spec-kit) and Claude Code.
Every prompt used is in [`PROMPT_LOG.md`](PROMPT_LOG.md).

**Live site:** <https://ssventra.github.io/sweetcrumbs/> · **Build report:** <https://ssventra.github.io/sweetcrumbs/report/>

## Pages

| Page | What it does |
|---|---|
| Home (`index.html`) | Hero, featured items, today's specials, weekly hours with "Open now / Closed now" in the bakery's time zone |
| Menu (`menu.html`) | Category filter, live search, allergen badges, sold-out state, add to pre-order |
| Pre-order (`preorder.html`) | Saved list (browser storage) with quantities and an estimated total; sends a pre-filled email |
| Custom Cakes (`custom-cakes.html`) | Validated request form; sends through a form service, or falls back to email |
| Visit (`visit.html`) | Address, phone, email, hours, OpenStreetMap embed, directions |
| About (`about.html`) | The bakery's story and team |

## Run locally

The site needs to be served over HTTP, because browsers block `fetch()` and ES modules from
`file://` pages. Any static server works:

```bash
python3 -m http.server 8000 -d site
# or: npx serve site -l 8000
```

Then open <http://localhost:8000/>.

## How it's built

```text
site/                    ← the published website (nothing else is deployed)
  *.html                 one real page each, semantic HTML5
  css/styles.css         the only stylesheet; theme via custom properties, mobile-first
  js/site.js             base module (no imports): menu loading, hours, time zone, prices
  js/form.js             validation, pickup slots, email/form-service messages
  js/cart.js             pre-order list storage + Pre-order page
  js/menu.js             item cards, featured, specials (Home entry)
  js/filters.js          category filter + search (Menu entry)
  data/menu.json         the ONE file the owner edits (menu + business info)
  data/README.md         plain-language owner guide
  assets/img/            WebP images + SVG icons
  report/                published build report (linked from every footer)
qa/                      bakery-qa: menu-check, site-audit, unit tests (Node, not deployed)
specs/001-sweet-crumb-website/   spec, plan, research, data model, contracts, tasks
.specify/memory/constitution.md  project principles
```

Key decisions (full reasoning in [`research.md`](specs/001-sweet-crumb-website/research.md)):

- **Content-driven**: every menu item, price, and opening hour comes from `site/data/menu.json`.
  The audit fails if a menu item name is hard-coded into HTML.
- **Bakery time zone**: "Open now", today's specials, and pickup lead times use the bakery's
  configured time zone, so visitors elsewhere see correct information.
- **One-way module imports**: `site.js ← form.js ← cart.js ← menu.js ← filters.js`, so there
  are no circular imports, and each page loads exactly one entry module.
- **Accessible by default**: native buttons and form controls, `aria-pressed` filters, live
  regions for result counts and "Added" messages, an error summary that takes focus, a skip
  link, visible focus, and `prefers-reduced-motion`.
- **Fast**: WebP images with size budgets, lazy loading below the fold, no web fonts, space
  reserved for rendered content (no layout shift), and a map that loads only when scrolled to.

## Quality gate: bakery-qa

The constitution's rule is that nothing is done until bakery-qa passes.

```bash
npm ci                  # installs the only dev dependency: Lighthouse CI
npm run menu-check      # validates site/data/menu.json (schema + business rules)
npm run site-audit      # unit tests (node:test) + static audit of every page
npm run qa              # menu-check + site-audit + Lighthouse (mobile)
```

| Check | What it enforces |
|---|---|
| `menu-check` | Required fields, unique ids, prices with ≤ 2 decimals, image files exist, valid hours and time zone, known categories/allergens (warnings) |
| Unit tests | Filtering, cart and storage rules, totals in cents, pickup slots and lead times, email and form-service message formats |
| Static audit | Page metadata, landmarks, one `<h1>`, alt/width/height on images, WebP and size budgets, lazy loading, relative links that resolve, labelled form controls, one module script per page, no hard-coded menu items, footer contact details match `menu.json` |
| Lighthouse | Performance, Best Practices, and SEO ≥ 90; Accessibility = 100 |

Exit codes: `0` pass, `1` checks failed, `2` could not run. See
[`contracts/qa-cli.md`](specs/001-sweet-crumb-website/contracts/qa-cli.md).

## Deploy

**GitHub Pages** (primary): `.github/workflows/deploy.yml` runs bakery-qa on every push and
pull request. On `main`, it deploys the `site/` folder only if all checks pass. One-time
setup: repository **Settings → Pages → Source: GitHub Actions**.

**Netlify** (alternative): `netlify.toml` publishes `site/` with no build command.

### Custom cake form service

`business.cakeFormEndpoint` in `menu.json` can hold an HTTPS form-service URL (for example a
Formspree form endpoint). The service must accept JSON POSTs from the site's domain (CORS),
which Formspree does. Leave it empty (`""`) and the form sends the request through the
visitor's email app instead. If the service fails or takes longer than 10 seconds, the form
also falls back to email, with everything filled in.

## For the bakery owner

See [`site/data/README.md`](site/data/README.md): how to add items, change prices, mark things
sold out, set specials, change hours, and post announcements, all in one file.

## Spec Kit workflow

| Step | Command | Output |
|---|---|---|
| Principles | `/speckit-constitution` | [`constitution.md`](.specify/memory/constitution.md) |
| Specification | `/speckit-specify` | [`spec.md`](specs/001-sweet-crumb-website/spec.md) |
| Clarification (5 questions) | `/speckit-clarify` | Clarifications section in `spec.md` |
| Technical plan | `/speckit-plan` | [`plan.md`](specs/001-sweet-crumb-website/plan.md), research, data model, contracts, quickstart |
| Task breakdown | `/speckit-tasks` | [`tasks.md`](specs/001-sweet-crumb-website/tasks.md) (63 tasks) |
| Consistency analysis (×2, issues fixed) | `/speckit-analyze` | Fixes to spec, plan, and tasks |
| Implementation | `/speckit-implement` | `site/`, `qa/`, workflow |

## Prompt log

Every prompt typed in this project folder is recorded automatically by a Claude Code
`UserPromptSubmit` hook ([`.claude/settings.json`](.claude/settings.json) →
[`.claude/hooks/log-prompt.sh`](.claude/hooks/log-prompt.sh)) into
[`PROMPT_LOG.md`](PROMPT_LOG.md).

## Placeholder content

The bakery, address, phone number, team, story, and photos are fictional placeholders. Item
photos are generated illustrations. Replace them before using this for a real business;
comments marked `REPLACE` in `about.html` show where.
