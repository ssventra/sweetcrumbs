# Accessibility Pass (task T060, constitution workflow gate 3, SC-007)

**Date**: 2026-10-03
**Pages**: index, menu, about, custom-cakes, visit, preorder, 404

## Automated (scripted headless Chrome)

- [x] No horizontal scrolling at 320, 768, and 1280px, or at 640px (equivalent to 1280px at 200% zoom), on all 7 pages
- [x] All visible buttons, inputs, selects, nav links, and filter buttons are at least 44×44px
- [x] First Tab focuses the skip link on every page, and it moves focus to `#main`
- [x] Visible focus outline on interactive elements
- [x] `prefers-reduced-motion: reduce` disables transitions
- [x] Menu: filters and search operable by keyboard (Tab, Shift+Tab, Space); `aria-pressed` updates; result count in a polite live region
- [x] Pre-order and Custom Cakes forms: empty submit moves focus to the error summary; each invalid field gets `aria-invalid="true"` and an `aria-describedby` message; summary links move focus to fields
- [x] Add to pre-order: confirmation in a `role="status"` live region and in the header count's accessible name ("Pre-order list, N items")
- [x] Remove on the Pre-order page moves focus to the list heading (no lost focus)
- [x] Successful send moves focus to the confirmation panel
- [x] Lighthouse Accessibility = 100 on all audited pages (see T059 result)

## Issues found and fixed during implementation

| Issue | Fix |
|---|---|
| An item that is both featured and today's special appeared twice on Home with the same allergen-label `id` (duplicate ids) | Card ids now include a per-render counter (`site/js/menu.js`) |
| "Added to pre-order" confirmation was screen-reader-only (spec requires visible + announced) | Live region is now a visible toast (`.toast`), cleared after 6 s |
| A missing team photo showed overlapping broken-image alt text | `.portrait img { color: transparent }` keeps alt for screen readers and hides it visually; placeholder background shows |

## Still to do by a person

- [ ] Screen reader walkthrough (VoiceOver on macOS/iOS, NVDA on Windows) of: Menu filters and
  count announcements; add-to-pre-order announcement; Pre-order quantity buttons and
  error summary; Custom Cakes error summary and confirmation. Automated tools catch only part
  of WCAG, so this manual check is still required by constitution workflow gate 3.
- [ ] Real browser zoom to 200% (Cmd/Ctrl +) on a desktop browser (the 640px viewport check is an approximation)
