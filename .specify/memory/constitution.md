# Bakery Website Constitution

## Core Principles

### I. Pure Static Output

- The site MUST consist only of HTML, CSS, and vanilla JavaScript files plus static assets.
- There MUST be no backend, server-side code, database, or runtime API owned by this project.
- No frameworks or libraries that require compilation (React, Vue, Tailwind CLI, Sass,
  TypeScript, bundlers, etc.) are permitted.
- The site MUST be viewable without running any build step. An optional build script is allowed
  only if it is small (a single file, no third-party dependencies) and its output is committed,
  so the repository remains viewable as-is.
- The site MUST work when served by any plain static file server (for example
  `python3 -m http.server`). Opening files directly via `file://` is not a supported target,
  because browsers block `fetch()` of local JSON there.

Rationale: zero tooling keeps the project portable, easy to review, and free to host.

### II. Content-Driven Menu

- All menu items (name, description, price, category, image, dietary tags, availability) MUST
  live in `data/menu.json`. That file is the single source of truth.
- Menu items MUST NOT be hardcoded in HTML or JavaScript. Adding, editing, or removing an item
  MUST require changing only `data/menu.json` (and adding its image, if new).
- The JSON shape MUST be documented, and the rendering code MUST tolerate optional fields being
  absent.
- If `data/menu.json` fails to load, the page MUST show a clear, accessible message instead of
  an empty or broken section.

Rationale: non-developers can update the menu safely, and content stays separate from layout.

### III. Accessibility (WCAG 2.1 AA)

- Every page MUST meet WCAG 2.1 Level AA.
- Markup MUST be semantic: landmark elements (`header`, `nav`, `main`, `footer`), a logical
  heading order with one `h1` per page, real `button`/`a` elements for interactive controls,
  and `label`s for every form field.
- All functionality MUST be operable by keyboard alone, with a visible focus indicator and no
  keyboard traps. A "skip to main content" link MUST be provided.
- Text contrast MUST be at least 4.5:1 (3:1 for large text and UI components).
- Every meaningful image MUST have descriptive `alt` text; decorative images MUST use `alt=""`.
- Content rendered dynamically from JSON MUST meet the same rules as static markup.
- Motion MUST respect `prefers-reduced-motion`.

Rationale: a bakery website serves the whole public; accessibility is a baseline, not a feature.

### IV. Performance Budget

- Every page MUST score 90 or higher in all four Lighthouse categories (Performance,
  Accessibility, Best Practices, SEO), measured with Lighthouse's default mobile settings.
- Photographic images MUST be served as WebP, sized for their display dimensions, and carry
  explicit `width` and `height` attributes to prevent layout shift.
- Images below the fold MUST use `loading="lazy"`. The above-the-fold hero/LCP image MUST NOT
  be lazy-loaded.
- JavaScript MUST be loaded with `defer` (or as a module) and MUST NOT block first render.
- Third-party scripts and web fonts MUST be justified; any web fonts MUST use
  `font-display: swap`.

Rationale: most visitors arrive on phones, often on mobile data; speed affects both experience
and search ranking.

### V. Mobile-First Responsive Design

- Base CSS MUST target small screens; larger layouts MUST be added with `min-width` media
  queries.
- Layouts MUST work from 320px wide up to large desktop screens with no horizontal scrolling.
- Touch targets MUST be at least 44×44 CSS pixels.
- Text MUST remain readable at 200% browser zoom without loss of content or function.

Rationale: designing for the smallest screen first produces simpler CSS and a better phone
experience, which is where most customers are.

### VI. QA Gate (NON-NEGOTIABLE)

- A feature is NOT done until it passes all bakery-qa checks. bakery-qa is the project's `qa/`
  suite (`menu-check` and `site-audit`, including Lighthouse), run with `npm run qa` locally and
  in the GitHub Actions workflow before every deploy.
- A failing check MUST be fixed, not bypassed. Any exception MUST be written down in the
  feature's plan with a reason and a follow-up task.

Rationale: one consistent, automated definition of "done" keeps every principle above enforced.

## Technical & Deployment Constraints

- The repository MUST be deployable as-is to GitHub Pages or Netlify, with no build command and
  no server configuration (no rewrites, redirects, or serverless functions required).
- All internal links and asset references MUST be relative paths, so the site works both at a
  domain root and under a GitHub Pages project sub-path (`/<repo>/`).
- Every page MUST be a real `.html` file; the site MUST NOT depend on client-side routing.
- Supported browsers: the current and previous major versions of Chrome, Edge, Firefox, and
  Safari (including iOS Safari).
- Each page MUST include a `<title>`, a meta description, `lang` on `<html>`, and a responsive
  viewport meta tag.

## Development Workflow & Quality Gates

Before a feature is marked done, all of the following MUST be true:

1. bakery-qa checks pass (`npm run qa`, Principle VI).
2. Lighthouse (mobile) scores 90 or higher in all four categories on every affected page.
3. A keyboard-only walkthrough of the affected pages succeeds.
4. The layout is checked at 320px, 768px, and 1280px widths.
5. Any menu content change was made only in `data/menu.json`, and the JSON is valid.
6. The site runs correctly from a plain static server with no build step.

Specs and plans produced with Spec Kit MUST include a Constitution Check that confirms
compliance with each principle or records a justified exception.

## Governance

- This constitution overrides any other project practice or guideline that conflicts with it.
- Amendments MUST be made by editing this file, with a Sync Impact Report describing the
  change, and MUST update the version and Last Amended date.
- Versioning follows semantic versioning:
  - MAJOR: a principle is removed or redefined in a backward-incompatible way.
  - MINOR: a principle or section is added, or guidance is materially expanded.
  - PATCH: wording, clarification, or typo fixes with no change in meaning.
- Every spec, plan, and review MUST verify compliance with these principles. Any added
  complexity (new tools, dependencies, or build steps) MUST be justified in writing against
  Principle I.

**Version**: 1.0.1 | **Ratified**: 2026-10-03 | **Last Amended**: 2026-10-03
