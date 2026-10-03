# Contract: Outbound Messages

**Owner module**: `site/js/form.js` | Related: [data-model.md §5–6](../data-model.md),
[research.md R7–R8](../research.md)

The site never stores these messages. They leave the browser either as a `mailto:` handoff to
the visitor's email app, or (cake requests only) as an HTTPS POST to the configured form
service.

---

## 1. Pre-order email (mailto)

- **To**: `business.email`
- **Subject**: `Pre-order request — {customerName} — pickup {Day, Mon D} at {h:mm AM/PM}`
- **Body** (plain text, `\r\n` line breaks, URI-encoded):

```text
Hello Sweet Crumb Bakery,

I'd like to pre-order the following for pickup on Saturday, Oct 10 at 9:30 AM:

- 2 × Country Sourdough ($7.00 each) = $14.00
- 6 × Chocolate Chip Cookie ($2.50 each) = $15.00

Estimated total: $29.00 (before tax; payment at pickup)

Name: Jamie Rivera
Email: jamie@example.com
Phone: (555) 987-6543
Notes: Sliced sourdough, please.

I understand this is a request and will wait for your confirmation.
```

- Items flagged sold out or no longer on the menu are left out (FR-025).
- Unit labels follow the price: `($18.00 per dozen)`.
- **Length guard**: if the full `mailto:` URL exceeds 1,800 characters, the body is replaced
  with the header line plus `Full list: please paste from the website (Copy summary).`, and
  the page shows the full text with a **Copy summary** button (R8).
- After the handoff, the page shows the "request awaiting confirmation, pay at pickup" message
  and a **Clear my list** button (FR-024). The list is not cleared automatically.

## 2. Custom cake request — form service (primary)

Used when `business.cakeFormEndpoint` is a non-empty HTTPS URL.

- **Request**: `POST {cakeFormEndpoint}`
  - Headers: `Content-Type: application/json`, `Accept: application/json`
  - Timeout: 10 s (`AbortController`)
- **Body**:

```json
{
  "_subject": "Custom cake request — Birthday — pickup 2026-10-10",
  "_replyto": "jamie@example.com",
  "_gotcha": "",
  "name": "Jamie Rivera",
  "email": "jamie@example.com",
  "phone": "(555) 987-6543",
  "occasion": "Birthday",
  "pickupDate": "2026-10-10",
  "servings": "15–20",
  "flavor": "Chocolate",
  "filling": "Raspberry",
  "frosting": "Buttercream",
  "decoration": "Pastel sprinkles, gold '7' topper",
  "cakeMessage": "Happy 7th, Maya!",
  "dietary": "nut-free",
  "budget": "$50–100",
  "consent": "yes"
}
```

- Field labels and order match [data-model.md §6](../data-model.md). Empty optional fields are
  sent as `""`.
- **Success**: any 2xx response → confirmation panel ("We'll reply within 1 business day to
  confirm and quote"), focus moved to it, form reset.
- **Failure**: non-2xx, network error, or timeout → fall back to §3. The visitor sees "We
  couldn't send that online. Your email app will open with everything filled in. Just press
  Send." Their answers are kept.
- **Honeypot**: if `_gotcha` is non-empty, show the success panel and send nothing.

## 3. Custom cake request — mailto fallback

Used when `cakeFormEndpoint` is empty or absent, or when §2 fails.

- **To**: `business.email`
- **Subject**: same as `_subject` above.
- **Body**: one `Label: value` line per field, in the same order, with "(not specified)" for
  empty optional fields, followed by
  `I understand this is a request and will wait for your confirmation and quote.`
- The same copy panel as §1 is shown, in case no email app opens.

## 4. Validation errors (both forms)

- Validation runs on submit; a field is re-checked when it loses focus after a failed submit.
- Error summary: `role="alert"` region above the form, heading "Please fix N problems", list
  of links to each invalid field. The summary receives focus.
- Per-field message: `id="{field}-error"`, referenced by the field's `aria-describedby`;
  the field gets `aria-invalid="true"`.
- Nothing is sent while any error remains (FR-027, spec US4-AS5).
