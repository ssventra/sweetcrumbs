# Contract: Pre-order List Storage

**Owner modules**: `site/js/cart.js` (writes, pre-order page); `site/js/site.js` (key constant, `readSavedPreorder` read rules, header count) | Related: [data-model.md §4](../data-model.md)

## Key and value

- **Key**: `sweetcrumb.preorder.v1` in `window.localStorage`.
- **Value**: JSON string.

```json
{
  "version": 1,
  "items": [
    { "id": "country-sourdough", "qty": 2 },
    { "id": "choc-chip-cookie", "qty": 6 }
  ],
  "updatedAt": "2026-10-03T14:05:00.000Z"
}
```

Only IDs and quantities are stored. Names, prices, units, and availability always come from
the current `menu.json` (FR-021, FR-025).

## Read rules

Implemented once, in `site.js` → `readSavedPreorder(storage)`, which returns
`{ items, notice }` with `notice` ∈ `null` | `"restore-failed"` | `"not-saved"`.

| Situation | Behavior |
|---|---|
| Key absent | Empty list |
| `localStorage` access throws (private mode, blocked) | Use the in-memory list; show the one-time notice "Your list will only be kept while this page is open." |
| JSON parse fails, or `version !== 1`, or `items` not an array | Discard, start empty, show notice "We couldn't restore your saved list." |
| Entry with non-string `id` | Drop the entry |
| `qty` not an integer in 1–99 | Clamp to 1–99 (non-numbers → 1) |
| Duplicate `id` entries | Merge by summing, then clamp |

## Write rules

- Every mutation (`add`, `setQty`, `remove`, `clear`) writes the full value and updates
  `updatedAt`.
- Writes are wrapped in try/catch. On failure (including quota errors), keep the in-memory
  list, show the not-saved notice once, and keep the page working.
- `clear()` removes the key.

## Cross-page / cross-tab

- After every mutation, `cart.js` dispatches a `preorder:change` event on `document` with
  `detail: { count }`, where count is the **total saved quantity** (all entries, including
  ones later flagged unavailable). This lets every page show the count without loading the
  menu; unavailable entries are flagged on the Pre-order page itself.
- `site.js` (loaded on every page) sets the header badge text and accessible name ("Pre-order
  list, 3 items") on load from `readSavedPreorder`, on `preorder:change`, and on `window`
  `storage` events for this key, so other open tabs stay in sync.

## Privacy

Nothing is stored in the browser except item IDs, quantities, and a timestamp. Name, contact
details, and pickup details typed into the pre-order form are **not** saved.
