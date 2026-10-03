# Quickstart & Validation Guide: Sweet Crumb Bakery Website

**Feature**: `001-sweet-crumb-website` | **Plan**: [plan.md](./plan.md)

This guide shows how to run the site and prove each user story works. It references the
contracts rather than repeating them.

## Prerequisites

| Need | For | Check |
|---|---|---|
| Any static file server | Viewing the site | `python3 --version` or `npx --version` |
| Node LTS (≥ 22) | bakery-qa | `node --version` |
| Chrome/Chromium | `site-audit --lighthouse` only | Installed browser |

No install is needed to view the site. `npm ci` is needed only for the Lighthouse step.

## Run the site

```bash
# from the repository root, using either server:
python3 -m http.server 8000 -d site
# or
npx serve site -l 8000
```

Open http://localhost:8000/. Opening `site/index.html` directly from disk (`file://`) is not
supported (research R4).

## Run the bakery-qa gate

```bash
npm run menu-check                  # validates site/data/menu.json
npm run site-audit                  # unit tests + static audit
npm ci && npm run site-audit -- --lighthouse   # adds Lighthouse (mobile): ≥ 90 perf/best-practices/SEO, 100 accessibility
npm run qa                          # everything, same as CI
```

Expected: each ends with a `✔` summary line and exit code 0. Rules and exit codes are in
[contracts/qa-cli.md](./contracts/qa-cli.md).

---

## Validation scenarios

Use a phone-sized window (360 px) unless stated. "Keyboard" means Tab/Shift-Tab/Enter/Space
only.

### US1 — Browse the menu (P1)

1. Open **Menu**. All items from `menu.json` show with price + unit, photo, and allergen badges.
2. Activate **Pastries** → only pastries; the button reports pressed; the live count says
   "N items shown".
3. Type `choc` → results narrow within the active category; clear → restore.
4. Type `zzz` → "No items found" with a **Clear search and filters** button.
5. A `soldOut` item shows "Sold out" and a disabled add button.
6. Repeat steps 2–5 with keyboard only and a screen reader (VoiceOver/NVDA): the count
   changes are announced.

### US2 — Owner edits the menu (P2)

1. In `site/data/menu.json`: add an item, change one price, set `"soldOut": true` on another,
   set `"featured": true` on a third, add `"specialDays": ["daily"]` to a fourth.
2. `npm run menu-check` → passes.
3. Reload: Menu, Home featured, Home specials, and Pre-order page all reflect the changes.
4. Break the JSON (delete a comma), reload Menu and Home → a polite message with the phone
   number; header, footer, and navigation still work. `npm run menu-check` → exit 2 with the
   line number. Restore the file.
5. Use the owner guide (`site/data/README.md`) as the instructions; target under 10 minutes
   (SC-003).

### US3 — Plan a visit (P3)

1. **Home**: hero, featured items, today's specials (or the fallback text), weekly hours with
   today highlighted, and "Open now"/"Closed now", all evaluated in `business.timeZone`.
   Check by temporarily changing your OS time zone: the status must not change.
2. Set `business.announcement` → it appears next to hours on Home and Visit and above both
   forms' submit buttons; remove it → nothing shown.
3. **Visit**: address, tappable phone, email, the same hours, a lazy map with a title, and
   **Get directions**. Block `openstreetmap.org` in DevTools → the address and directions link
   still work.
4. From every page, all six destinations are one click away.

### US4 — Pre-order list (P4)

1. Add 3 different items (one twice) → header count shows 4; confirmation is announced.
2. Open **Pre-order**: line totals and estimated total are correct to the cent; change
   quantities; try 0 and 100 → clamped/rejected; remove one item.
3. Close and reopen the browser → the list is unchanged (SC-008).
4. Mark one listed item `soldOut` in `menu.json`, reload → flagged and left out of the total.
5. Submit with empty fields → error summary gets focus and links to each field.
6. Fill in valid details; the pickup time list shows only open-hour slots ≥ 24 h ahead →
   **Send** opens the email app with the exact format in
   [outbound-messages.md §1](./contracts/outbound-messages.md); the confirmation and
   **Clear my list** appear.
7. Private/incognito window with storage blocked → the list works for the visit and the
   not-saved notice appears.

### US5 — Custom cake request (P5)

1. With `cakeFormEndpoint` empty: submit a valid form → the email app opens with every field
   in the order given in [outbound-messages.md §3](./contracts/outbound-messages.md).
2. Choose a pickup date < 72 h ahead → the message gives the earliest valid date.
3. With a test endpoint configured: a valid submit → confirmation panel gets focus; form is
   reset.
4. Set the endpoint to an unreachable URL → after ≤ 10 s, the mailto fallback runs with all
   answers kept.
5. Fill the hidden honeypot via DevTools → shows success, but no request appears in the
   Network tab.

### US6 — About (P6)

1. Story and team (photo, name, role, bio) are readable at 320 px; remove a team photo's
   `src` → the placeholder is used and the layout holds.

### Cross-cutting

- Disable JavaScript → About, Visit address, footer phone/address readable; Menu shows the
  `<noscript>` message with the phone number.
- Widths 320 / 768 / 1280 px → no horizontal scroll; touch targets ≥ 44 px.
- `prefers-reduced-motion: reduce` (DevTools rendering panel) → no animations.

## Deploy

Push to `main` → GitHub Actions `deploy.yml` runs `menu-check` and
`site-audit --lighthouse`, and deploys `site/` to GitHub Pages only if both pass. One-time
setup: repo **Settings → Pages → Source: GitHub Actions**. Netlify alternative: publish
directory `site`, no build command.
