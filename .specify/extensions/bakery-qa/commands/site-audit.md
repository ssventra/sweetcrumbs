---
description: "Run unit tests, the static page audit, and Lighthouse against site/"
---

# Bakery QA: Site Audit

Run the project's existing `qa/site-audit.mjs` script, which runs the unit tests, a static
audit of every page in `site/`, and (by default) Lighthouse CI. Do not reimplement any checks;
run the script and report what it prints. This is the constitution's Principle VI gate: a
feature is not done until it passes.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). Supported arguments:

- *(none)*: full audit, including Lighthouse. This is the default, and what the
  `after_implement` hook runs.
- `--quick`: skip Lighthouse and run only the unit tests and the static audit (faster, for
  checking work in progress). Say clearly in the report that Lighthouse was **not** run, so
  the result does not satisfy the Principle VI gate.

## Prerequisites

- Run from the repository root (the directory containing `package.json` and `qa/`).
- Check Node is available: `node --version`. It must be 22 or newer. If not, stop and report
  `✖ site-audit could not run: Node 22+ is required`.
- Check `qa/site-audit.mjs` exists. If not, stop and report that the bakery-qa suite is not
  present in this project.
- For a full audit, check that Lighthouse CI is installed: `node_modules/.bin/lhci`. If it is
  missing, run `npm ci` first. Lighthouse also needs Chrome or Chromium installed locally.

## Execution

1. Run the script:

   ```bash
   # full audit (default)
   node qa/site-audit.mjs --lighthouse

   # with --quick
   node qa/site-audit.mjs
   ```

   A full run takes a few minutes (6 pages × 3 Lighthouse runs, mobile preset).

2. Capture the full output and the exit code.

3. If Lighthouse ran, read the per-page scores from the JSON reports it wrote to
   `.lighthouseci/lhr-*.json` (`categories.<name>.score`, from 0 to 1). Report the **lowest**
   score of the runs for each page and category.

## Interpreting results

| Stage | Pass condition |
|---|---|
| Unit tests | Every `qa/unit/*.test.mjs` test passes |
| Static audit | 0 errors (rules in `specs/001-sweet-crumb-website/contracts/qa-cli.md`) |
| Lighthouse | Performance, Best Practices, SEO ≥ 90 and Accessibility = 100 on every page |

| Exit code | Meaning |
|---|---|
| 0 | All stages passed |
| 1 | At least one stage failed (the final line names which) |
| 2 | Could not run (no pages, unreadable `menu.json`, Lighthouse CI or Chrome missing) |

## Report

Report the result as two tables.

**Stages**

```markdown
| Stage | Result | Details |
|-------|--------|---------|
| Unit tests | ✔ Pass | 7 files, all tests passed |
| Static audit | ✖ Fail | 2 errors in 7 pages |
| Lighthouse | ✔ Pass | all pages meet thresholds |
```

**Lighthouse scores** (only when Lighthouse ran)

```markdown
| Page | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| index.html | 100 | 100 | 100 | 100 |
```

Mark any score below its threshold with ✖.

Then:

- List each static-audit error as `file:line: problem`, exactly as printed.
- For each failing Lighthouse category, name the top failing audits from that page's report
  (for Performance, include `cumulative-layout-shift` and `largest-contentful-paint` values).
- End with the overall verdict: **✔ bakery-qa passed** or **✖ bakery-qa failed (Principle VI
  gate not met)**. When this runs as the mandatory `after_implement` hook and it fails, say
  that the feature cannot be marked done until it is fixed.
- Do not change any files unless the user asks you to.
