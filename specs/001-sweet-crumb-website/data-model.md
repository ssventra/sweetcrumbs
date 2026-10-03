# Data Model: Sweet Crumb Bakery Website

**Feature**: `001-sweet-crumb-website` | **Date**: 2026-10-03 | **Plan**: [plan.md](./plan.md)

There are three data stores, none of them server-side:

1. **`site/data/menu.json`**: the owner-edited file holding business info and menu items.
   Formal schema: [contracts/menu.schema.json](./contracts/menu.schema.json).
2. **Browser `localStorage`**: the visitor's pre-order list.
   Contract: [contracts/storage.md](./contracts/storage.md).
3. **Outbound messages** (built on demand, never stored): pre-order email and custom cake
   request. Contract: [contracts/outbound-messages.md](./contracts/outbound-messages.md).

Team members and the bakery story are static HTML on the About page. They aren't menu items,
change rarely, and stay visible without JavaScript.

---

## 1. Menu File (`menu.json`) — root

| Field | Type | Required | Notes |
|---|---|---|---|
| `business` | Business Info | yes | See §2 |
| `items` | Menu Item[] | yes | May be empty (the site then shows "nothing here today") |

## 2. Business Info (`business`)

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | e.g. "Sweet Crumb Bakery" |
| `tagline` | string | yes | Shown in the hero |
| `phone` | string | yes | Display form, e.g. "(555) 123-4567"; `tel:` link derived by stripping non-digits |
| `email` | string | yes | Valid email; recipient for pre-orders and the mailto fallback |
| `address` | object | yes | `street`, `city`, `region`, `postalCode` (all strings) |
| `map` | object | yes | `lat` (−90…90), `lon` (−180…180), `zoom` (1–19, default 16) |
| `timeZone` | string | yes | IANA name; must be accepted by `Intl.DateTimeFormat` (R6) |
| `hours` | object | yes | Keys `mon`…`sun`, **all seven required**. Each is `null` (closed) or `{ "open": "HH:MM", "close": "HH:MM" }`, 24-hour, `open < close`, no overnight ranges |
| `leadTimes` | object | yes | `preorderHours` (int ≥ 0, default 24), `cakeHours` (int ≥ 0, default 72) |
| `cakeFormEndpoint` | string | no | HTTPS URL of the form service; empty/absent → mailto fallback (R7) |
| `announcement` | string | no | Free text ≤ 280 chars (FR-017a); empty/absent → nothing shown |

**Consistency rule (FR-004 / SC-009)**: the static footer text in every HTML page must
match `business.phone` and the formatted `business.address`. Enforced by `site-audit`.

## 3. Menu Item (`items[]`)

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | Unique across items; lowercase slug `^[a-z0-9]+(-[a-z0-9]+)*$`. **Never reuse or rename** an ID that's in use: it keys visitors' saved pre-order lists |
| `name` | string | yes | 1–60 chars |
| `category` | enum | yes | `breads` \| `pastries` \| `cakes` \| `cookies`. Unknown values are a `menu-check` **warning**; at runtime the item shows under "All" and in an "Other" group |
| `description` | string | no | ≤ 200 chars |
| `price` | number | yes | > 0, at most 2 decimal places, dollars (R10) |
| `unit` | string | no | ≤ 24 chars, e.g. "each", "per dozen", "9-inch whole" (shown next to price everywhere) |
| `image` | string | no | Path relative to site root, must be `assets/img/*.webp` and exist; absent → placeholder |
| `imageAlt` | string | conditional | Required when `image` is set; describes the food |
| `allergens` | string[] | no | Known values: `milk`, `eggs`, `wheat`, `soy`, `peanuts`, `tree-nuts`, `sesame`. Unknown strings are allowed (warning) and shown as plain-text badges. No duplicates |
| `soldOut` | boolean | no | Default `false` |
| `featured` | boolean | no | Default `false`; featured items that are sold out are hidden from Home (FR-015) |
| `specialDays` | string[] | no | Values `mon`…`sun` or `daily`; `daily` must not be combined with day names. Empty/absent → not a special |

**Derived values (not stored)**

- `priceCents = Math.round(price * 100)`.
- `isSpecialToday = specialDays includes "daily" or today's bakery-local weekday`.
- Display category order: Breads, Pastries, Cakes, Cookies, then Other.

**Allergen display labels**: milk → "Milk", eggs → "Eggs", wheat → "Wheat/Gluten", soy →
"Soy", peanuts → "Peanuts", tree-nuts → "Tree nuts", sesame → "Sesame"; unknown → the raw text.

## 4. Pre-order List (browser storage)

| Field | Type | Rules |
|---|---|---|
| `version` | integer | Always `1`; any other value → discard with notice |
| `items` | `{ id: string, qty: integer }[]` | `qty` 1–99; one entry per `id`; order of first addition |
| `updatedAt` | string | ISO 8601 timestamp |

**Reconciliation against the current menu** (on every render of the list or the sent summary):

| Saved entry's menu state | Pre-order page shows | Included in sent summary |
|---|---|---|
| Exists, available | Name, unit price + unit, qty control, line total | Yes |
| Exists, `soldOut: true` | Flagged "Sold out — will not be sent" | No |
| ID not in menu | Flagged "No longer on the menu" with Remove button | No |
| `qty` outside 1–99 (corrupt) | Clamped to 1–99 | As clamped |

**Operations and transitions**

```text
(empty) --add(id)--> [id:1] --add(id)--> [id:2] --setQty(id,n)--> [id:n]
[id:n] --remove(id)--> (entry removed)   any --clear()--> (empty)
add(id) is rejected when the item is soldOut or unknown (FR-013)
add(id) at qty 99 keeps 99 and shows "call us for larger orders"
```

## 5. Pre-order Request (outbound, built on send)

| Field | Source | Rules |
|---|---|---|
| Entries | Reconciled list (available items only) | ≥ 1 required to send |
| Line totals / estimated total | Current menu prices × qty | Labeled "estimate, before tax" |
| `customerName` | Form | Required, 1–80 chars |
| `email` / `phone` | Form | At least one required; email format if given; phone ≥ 7 digits if given |
| `pickupDate` | Form | Bakery-local date; day must be open in weekly `hours` |
| `pickupTime` | Form select | One of the slots generated for that date (see below) |
| `notes` | Form | Optional, ≤ 500 chars |

**Pickup slot rule**: 30-minute slots from `open` to `close − 30 min` on the chosen day,
keeping only slots ≥ `now + leadTimes.preorderHours` in bakery-local time (R6). If a date has
no valid slots, the visitor is asked to choose another date.

## 6. Custom Cake Request (outbound)

| Field | Required | Rules / options |
|---|---|---|
| `name` | yes | 1–80 chars |
| `email`, `phone` | one of them | As in §5 |
| `occasion` | no | Birthday, Wedding, Anniversary, Baby shower, Graduation, Other |
| `pickupDate` | yes | Open weekday in `hours`, ≥ `now + leadTimes.cakeHours` (date-level). Too early → message with earliest valid date and "call us for urgent orders" |
| `servings` | yes | Select: 6–8, 10–12, 15–20, 25–30, 40+ (call to discuss) |
| `flavor` | yes | Select: Vanilla, Chocolate, Red velvet, Lemon, Carrot, Other (text) |
| `filling` | no | Select incl. "None" |
| `frosting` | no | Select: Buttercream, Cream cheese, Ganache, Whipped cream, Fondant |
| `decoration` | no | Text ≤ 300 chars (design description, text only; no images or links per clarification) |
| `cakeMessage` | no | Text ≤ 60 chars (writing on the cake) |
| `dietary` | no | Checkboxes: egg-free, dairy-free, nut-free, vegan + free text ≤ 200 |
| `budget` | no | Select: under $50, $50–100, $100–200, $200+ |
| `consent` | yes | Checkbox: agree to be contacted about this request |
| `_gotcha` | — | Honeypot; non-empty → silently treat as success, send nothing |

## 7. Relationships

```text
Business Info 1 ── * Menu Item              (same file)
Menu Item 1 ── * Pre-order List entry       (by id; entry survives menu edits, reconciled at read)
Pre-order List 1 ── 0..1 Pre-order Request  (built when sending)
Business Info.leadTimes / hours / timeZone ── constrain ── Pre-order Request, Custom Cake Request
```
