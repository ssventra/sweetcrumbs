# How to update the website menu

Everything on the website that changes from day to day lives in **one file**:
`menu.json`, in this folder. That includes menu items, prices, what's sold out,
today's specials, opening hours, contact details, and announcements. You never need
to edit any other file for routine updates.

---

## Before you start: three rules that keep the file working

`menu.json` is a structured text file. The website can only read it if the
punctuation is exactly right:

1. **Text goes inside double quotes**: `"name": "Rye Loaf"`. Numbers, `true`,
   `false`, and `null` don't use quotes: `"price": 8.5`, `"soldOut": true`.
2. **Commas go between items, never after the last one** in a list or block.
3. **Every `{` needs a `}` and every `[` needs a `]`.**

The easiest way to follow these rules is to **copy an existing item and change it**
rather than typing one from scratch.

After saving, check your work (see [Checking your changes](#checking-your-changes)).
If the file has a mistake, the website shows visitors a polite "Our menu is being
updated. Please call us" message rather than breaking, so nothing bad happens. It
just needs fixing.

---

## What's in the file

The file has two parts: `business` (about the bakery) and `items` (the menu).

### Business details

| Field | What it is | Example |
|---|---|---|
| `name` | Bakery name | `"Sweet Crumb Bakery"` |
| `tagline` | One sentence shown on the home page | `"Small-batch breads…"` |
| `phone` | Phone number as you want it shown | `"(555) 123-4567"` |
| `email` | Where pre-orders and cake requests are sent | `"hello@sweetcrumb.example"` |
| `address` | `street`, `city`, `region`, `postalCode` | `"214 Maple Street"` |
| `map` | Map pin: `lat` and `lon` numbers, optional `zoom` (1–19) | `40.7128` |
| `timeZone` | The bakery's time zone. Leave as is unless you move | `"America/New_York"` |
| `hours` | Opening hours for `mon` … `sun` | see below |
| `leadTimes` | Notice needed, in hours: `preorderHours`, `cakeHours` | `24`, `72` |
| `cakeFormEndpoint` | Online form service address for cake requests, or `""` to use email | `""` |
| `announcement` | Optional message, at most 280 characters | `"Closed Nov 27–28"` |

> **Important:** if you change the phone number or address here, also ask your web
> person to update the footer, which keeps a copy for visitors whose browser can't load
> this file. The automatic check will remind you if they don't match.

### Menu items

| Field | Required? | What it is |
|---|---|---|
| `id` | yes | A permanent code name: lowercase words joined by hyphens, e.g. `"seeded-rye"` |
| `name` | yes | Name shown to customers (up to 60 characters) |
| `category` | yes | One of `"breads"`, `"pastries"`, `"cakes"`, `"cookies"` |
| `price` | yes | Price in dollars, at most 2 decimal places: `4.5` means $4.50 |
| `unit` | no | What the price is for: `"each"`, `"per dozen"`, `"9-inch whole"` |
| `description` | no | Up to 200 characters |
| `image` | no | Photo file, e.g. `"assets/img/seeded-rye.webp"` |
| `imageAlt` | if there's an image | A short description of the photo for people who can't see it |
| `allergens` | no | Any of `"milk"`, `"eggs"`, `"wheat"`, `"soy"`, `"peanuts"`, `"tree-nuts"`, `"sesame"` |
| `soldOut` | no | `true` when it's sold out today; remove it or use `false` otherwise |
| `featured` | no | `true` to show it on the home page |
| `specialDays` | no | `["daily"]`, or days like `["sat"]` or `["mon", "thu"]` |

---

## Recipes

### Add a new item

Copy an existing item (from its `{` to its `}`), paste it after another item, put a
comma between them, then change the details:

```json
{
  "id": "pumpkin-loaf",
  "name": "Pumpkin Loaf",
  "category": "cakes",
  "description": "Spiced pumpkin cake with a cinnamon crumb top.",
  "price": 16,
  "unit": "per loaf",
  "allergens": ["wheat", "milk", "eggs"]
}
```

No photo yet? Leave out `image` and `imageAlt`. The website shows a neutral
placeholder picture.

### Change a price

Find the item and change the number: `"price": 3.75` → `"price": 4`. Use a dot for
cents and no dollar sign.

### Mark something sold out (or back in stock)

Add `"soldOut": true` to the item (remember the comma before it). Sold-out items stay on
the menu with a "Sold out" label and can't be pre-ordered. When it's back, change it to
`false` or delete the line.

### Feature an item on the home page

Add `"featured": true`. Sold-out featured items are hidden from the home page
automatically.

### Set today's specials

Add `"specialDays": ["daily"]` for every day, or list days: `["fri"]`,
`["sat", "sun"]`. Use `mon tue wed thu fri sat sun`. Don't mix `"daily"` with day names.

### Remove an item

Delete it from its `{` to its `}`, and remove the comma that separated it from its
neighbor.

### Never rename an item's `id`

Customers' saved pre-order lists remember items by `id`. If you rename it, their saved
item shows as "No longer on the menu". Change the `name` instead; it's safe to change
any time. If an item is truly new, give it a new `id`.

### Add a photo

1. Save the photo as **WebP**, about **800 × 600** pixels, under **120 KB**.
2. Name it like the item's id, e.g. `pumpkin-loaf.webp`, and put it in `assets/img/`.
3. In the item, add `"image": "assets/img/pumpkin-loaf.webp"` and a short
   `"imageAlt": "A sliced pumpkin loaf with a crumbly top"`.

### Change opening hours

Each day is either `null` (closed) or an opening and closing time in 24-hour format:

```json
"mon": null,
"tue": { "open": "07:00", "close": "15:00" },
```

`"15:00"` is 3:00 PM. All seven days must be listed.

### Post or clear an announcement

For holidays, vacations, or one-off changes:

```json
"announcement": "Closed Nov 27–28 for Thanksgiving. Happy holidays!"
```

It appears next to the hours and above the order forms. To remove it, delete the line
or set it to `""`. Note: the announcement doesn't change the open/closed sign or which
pickup dates the forms accept. You'll confirm each request yourself anyway.

---

## Checking your changes

If the site is published from GitHub, the check runs automatically every time you save
a change, and the website only updates if the check passes. If it fails, open the
failed run to see the message.

To check on a computer with Node installed, run this in the project folder:

```bash
npm run menu-check
```

| Message starts with | Meaning |
|---|---|
| `✔ menu-check` | All good |
| `⚠ WARN` | Allowed, but double-check (e.g. an allergen name the site doesn't recognize) |
| `✖ ERROR` | Must be fixed. The message names the item, e.g. `items[4] "Cinnamon Roll": price 3.555 has more than 2 decimal places` |
| `could not run … not valid JSON … (line 34 column 7)` | A punctuation mistake, usually a missing or extra comma or quote near that line |
