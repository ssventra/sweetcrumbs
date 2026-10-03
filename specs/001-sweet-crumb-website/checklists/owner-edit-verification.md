# Owner Edit Verification (US2, task T030)

**Date**: 2026-10-03
**Guide used**: `site/data/README.md`
**Method**: real edits to `site/data/menu.json` (backed up and restored afterwards), then
`npm run menu-check` and a scripted headless-Chrome check of the Menu, Home, and Pre-order pages.

## Edits made (only `site/data/menu.json` changed)

| Edit | Guide recipe | Result |
|---|---|---|
| Added "Pumpkin Loaf" (cakes, $16.00 per loaf, `specialDays: ["daily"]`) | Add a new item; Set today's specials | Shown under Cakes on Menu; listed in Today's specials on Home |
| Butter Croissant price 3.75 → 4 | Change a price | $4.00 on Menu; pre-order list line and estimate used $4.00 |
| Snickerdoodle `soldOut: true` | Mark something sold out | "Sold out" label and disabled button on Menu |
| Rosemary Focaccia `featured: true` | Feature an item | Shown in Featured on Home |
| `menu-check` after edits | Checking your changes | `✔ menu-check: 21 items, 0 errors, 0 warnings` |
| Broken JSON (missing comma) | — | Menu, Home, Pre-order show "Our menu is being updated. Please call us at (555) 123-4567."; header, nav, footer intact; `menu-check` exits 2 with line/column |

## SC-003 timing (< 10 minutes, owner using only the guide)

- [ ] Not yet measured with a real (non-developer) owner. The steps above were applied by
  the implementer, so they confirm the guide's recipes work end to end but not the 10-minute
  target. Have the bakery owner follow `site/data/README.md` for the four edits above and
  record the time here.
