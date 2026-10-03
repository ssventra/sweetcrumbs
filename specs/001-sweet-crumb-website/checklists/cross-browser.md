# Cross-Browser Pass (task T063)

**Date**: 2026-10-03
**Supported browsers (constitution)**: current and previous major versions of Chrome, Edge,
Firefox, Safari, plus iOS Safari.

| Check | Chrome (headless, scripted) | Edge | Firefox | Safari (macOS) | iOS Safari |
|---|---|---|---|---|---|
| Pre-order list survives a browser restart (SC-008) | ✅ same profile, closed and relaunched | ☐ | ☐ | ☐ | ☐ |
| Pickup date field and time `<select>` work and validate | ✅ | ☐ | ☐ | ☐ | ☐ |
| **Copy summary** copies, or falls back to selected text | ✅ panel and fallback path present (clipboard permission not granted in headless) | ☐ | ☐ | ☐ | ☐ |
| "Open now / Closed now" follows the bakery time zone | ✅ emulated New York and Tokyo visitors see the same status | ☐ | ☐ | ☐ | ☐ |

## Why the other columns are open

Only Chrome and Safari are installed on the build machine. Automating Safari requires a
one-time `sudo safaridriver --enable` by the machine's owner, and Firefox and Edge are not
installed. Please run the four checks by hand in each browser using `quickstart.md`
(US4 steps 3, 6, 7 and US3 step 1), then tick the boxes here.

Notes for testers:
- **Safari / iOS Safari**: `<input type="date">` uses the native picker (supported since
  Safari 14.1). Private Browsing allows `localStorage` per session, so the list won't survive
  a restart there, which is expected (the not-saved notice appears only if storage throws).
- **Firefox**: `navigator.clipboard.writeText` works after a user click; otherwise the
  select-text fallback appears.
