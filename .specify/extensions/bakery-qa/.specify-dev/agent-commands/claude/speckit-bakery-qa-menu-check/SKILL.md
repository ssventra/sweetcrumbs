---
name: speckit-bakery-qa-menu-check
description: Validate site/data/menu.json against the menu contract and business rules
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: shravani
  source: bakery-qa:commands/menu-check.md
---

# Bakery QA: Menu Check

Validate the bakery's menu file using the project's existing `qa/menu-check.mjs` script. Do
not reimplement any checks; run the script and report what it prints.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). The only supported
argument is an optional path to a menu file to check instead of the default
`site/data/menu.json` (for example, a draft copy). Ignore anything else.

## Prerequisites

- Run from the repository root (the directory containing `package.json` and `qa/`).
- Check Node is available: `node --version`. It must be 22 or newer. If Node is missing or
  older, stop and report: `✖ menu-check could not run: Node 22+ is required`.
- Check the script exists: `qa/menu-check.mjs`. If it is missing, stop and report that the
  bakery-qa suite is not present in this project.

## Execution

1. Run the script, passing the path argument only if the user gave one:

   ```bash
   node qa/menu-check.mjs [path]
   ```

2. Capture the full output and the exit code.

## Interpreting results

The script prints one line per finding (see
`specs/001-sweet-crumb-website/contracts/qa-cli.md`):

- `✖ ERROR  <where>: <message>`: must be fixed
- `⚠ WARN   <where>: <message>`: allowed, but worth reviewing
- a final `✔ menu-check: …` or `✖ menu-check: …` summary line

| Exit code | Meaning |
|---|---|
| 0 | Passed (warnings may be present) |
| 1 | One or more errors |
| 2 | Could not run (file missing, or the file is not valid JSON) |

## Report

Report the result as a table with one row per finding, followed by the summary:

```markdown
| # | Severity | Where | Problem |
|---|----------|-------|---------|
| 1 | ✖ Error | items[4] "Cinnamon Roll" | price 3.555 has more than 2 decimal places |
| 2 | ⚠ Warning | items[9] "Rye Loaf" | unknown allergen "mustard" |

**Result:** ✖ Failed: 20 items, 1 error, 1 warning (exit 1)
```

- If there are no findings, show a single row: `| — | ✔ Pass | site/data/menu.json | No problems found |`.
- For exit code 2, show one row with severity `✖ Could not run` and the parser message
  (including the line and column it reports), and tell the user that a missing or extra comma
  or quote near that line is the usual cause.
- For each error, add a one-line suggested fix in plain language after the table, using
  `site/data/README.md` as the reference for the owner's recipes.
- Do not edit `menu.json` unless the user asks you to.