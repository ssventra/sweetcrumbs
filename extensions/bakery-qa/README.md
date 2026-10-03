# Bakery QA Extension

Spec Kit extension that wraps the Sweet Crumb Bakery project's `qa/` suite as Spec Kit
commands and lifecycle hooks. It is the "bakery-qa" quality gate named in the project
constitution (Principle VI: a feature is not done until bakery-qa passes).

The extension adds no checks of its own. Each command runs an existing script in `qa/` and
reports the result as a table, so the checks stay in one place and also run unchanged in CI
(`npm run qa`).

## Commands

| Command | Runs | Description |
|---------|------|-------------|
| `speckit.bakery-qa.menu-check` | `node qa/menu-check.mjs [path]` | Validates `site/data/menu.json` |
| `speckit.bakery-qa.site-audit` | `node qa/site-audit.mjs --lighthouse` | Unit tests + static audit of `site/` + Lighthouse |

### `speckit.bakery-qa.menu-check`

Checks the menu file the bakery owner edits:

- **Structure**: required fields, types, and no unknown fields (per
  `specs/001-sweet-crumb-website/contracts/menu.schema.json`)
- **Errors**: duplicate item ids, prices with more than 2 decimal places, missing image files
  or missing `imageAlt`, opening time not before closing time, an invalid time zone, `"daily"`
  mixed with weekday names, or no open days
- **Warnings**: unknown category or allergen, an empty category, a featured item that is sold out

Optional argument: a path to a different menu file, e.g. a draft copy.

### `speckit.bakery-qa.site-audit`

Runs three stages against the published `site/` folder:

1. **Unit tests**: `node --test` on `qa/unit/*.test.mjs` (filters, cart and storage, totals,
   pickup slots and time zone, email and form-service formats)
2. **Static audit** of every page: metadata, landmarks, one `<h1>`, image alt/size/WebP/budgets,
   lazy loading, relative links that resolve, labelled form controls, one module script per
   page, no hard-coded menu items, and footer contact details that match `menu.json`
3. **Lighthouse CI** (mobile): Performance, Best Practices, and SEO ≥ 90; Accessibility = 100

Optional argument `--quick` skips Lighthouse. A quick run does not satisfy the Principle VI gate.

## Hooks

| Event | Command | Optional | Description |
|-------|---------|----------|-------------|
| `after_tasks` | `speckit.bakery-qa.menu-check` | Yes (prompt: "Run menu check?") | Validate the menu file once tasks are generated |
| `after_implement` | `speckit.bakery-qa.site-audit` | No | Mandatory quality gate after every implementation |

## Requirements

- Spec Kit `>=0.2.0`
- Node.js 22 or newer
- For Lighthouse: `npm ci` (installs `@lhci/cli`) and a local Chrome/Chromium
- The project's `qa/` scripts and `site/` folder at the repository root

## Installation

From the repository root:

```bash
specify extension add --dev extensions/bakery-qa
```

This registers the commands and hooks in `.specify/extensions.yml`. To check:

```bash
specify extension list
specify extension info bakery-qa
```

## Exit codes (from the underlying scripts)

| Code | Meaning |
|------|---------|
| 0 | Passed |
| 1 | Checks failed |
| 2 | Could not run |
