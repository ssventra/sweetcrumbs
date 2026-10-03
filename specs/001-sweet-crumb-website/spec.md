# Feature Specification: Sweet Crumb Bakery Website

**Feature Branch**: `001-sweet-crumb-website`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "Build a static website for "Sweet Crumb Bakery", a local neighborhood bakery. Pages: Home (hero, featured items, today's specials, hours), Menu (filter by category: breads, pastries, cakes, cookies; search; allergen badges; "sold out" state), About (story, team), Custom Cake Orders (a form that builds a request and sends it via a static form service or a mailto: fallback), and Contact/Visit (map embed, hours, address). Visitors can add items to a pre-order list stored in localStorage and send it as an email summary. The owner updates the menu by editing one JSON file. Warm, rustic look."

## Clarifications

### Session 2026-10-03

- Q: Where should the bakery's business details (opening hours, address, phone, email, lead
  times) be stored? → A: In the same single owner-edited file as the menu
  (`data/menu.json`), in a business section next to the menu items. The phone number and
  address are also written into each page's footer as a no-JavaScript fallback.
- Q: Can a single menu item have more than one size or price? → A: No. Each item has exactly
  one price plus an optional unit label (e.g., "each", "per dozen", "9-inch whole"); multiple
  sizes are entered as separate items.
- Q: Should the custom cake form let visitors attach an inspiration photo? → A: No. Visitors
  describe the design in text only; no image uploads or image links.
- Q: Should the pre-order list be its own page, or a panel that slides open over the current
  page? → A: Its own dedicated page, reached from a header link on every page that shows the
  current item count.
- Q: Should the owner be able to enter one-off closures or special hours (holidays, vacation)
  separately from the weekly hours? → A: No. Only regular weekly hours are supported. The
  owner announces closures in an optional free-text announcement; the open/closed indicator
  and pickup date checks use weekly hours only, and the bakery's manual confirmation catches
  pickups requested on a closure day.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the menu and find something safe to eat (Priority: P1)

A neighborhood customer opens the Menu page to see what the bakery sells. They narrow the list
to one category (breads, pastries, cakes, or cookies), type a word such as "sourdough" or
"chocolate" to search, and check the allergen badges on each item before deciding. Items that
are sold out today are still listed but clearly marked as unavailable.

**Why this priority**: The menu is the main reason people visit a bakery's website. On its own
it already gives customers value, and every other ordering feature depends on it.

**Independent Test**: Load the Menu page with a sample menu file and confirm that every item
appears, that the category filter and search narrow the list correctly, that allergen badges
match the data, and that sold-out items are marked.

**Acceptance Scenarios**:

1. **Given** the menu contains items in all four categories, **When** the visitor opens the
   Menu page, **Then** every available and sold-out item is shown with its name, short
   description, price, photo, and allergen badges.
2. **Given** the Menu page is open, **When** the visitor selects "Pastries", **Then** only
   pastry items are shown, and the selected category is visibly and programmatically indicated.
3. **Given** the visitor has selected a category, **When** they select "All", **Then** the full
   menu is shown again.
4. **Given** the Menu page is open, **When** the visitor types "choc" into search, **Then** only
   items whose name, description, or category contains "choc" (ignoring upper/lower case) are
   shown, combined with any category filter that is active.
5. **Given** a search or filter matches nothing, **When** the results update, **Then** a
   friendly "no items found" message is shown with a way to clear the search and filters.
6. **Given** an item contains milk, eggs, and wheat, **When** it is displayed, **Then** it shows
   a badge for each of those allergens, readable as text (not only by color or icon).
7. **Given** an item is marked sold out, **When** it is displayed, **Then** it shows a
   "Sold out" label and cannot be added to the pre-order list.
8. **Given** a screen-reader or keyboard-only user, **When** they use filters and search,
   **Then** they can operate every control and are told how many items are now shown.

---

### User Story 2 - Owner updates the menu without a developer (Priority: P2)

The bakery owner wants to add a seasonal pumpkin loaf, change the price of a croissant, and
mark the cinnamon rolls as sold out. They edit one menu data file, publish it, and the website
reflects the changes everywhere the items appear.

**Why this priority**: The owner must be able to keep the menu accurate. If they can't, the
site becomes wrong within days and loses trust.

**Independent Test**: Edit only the menu data file (add an item, change a price, mark an item
sold out, flag an item as featured), reload the site, and confirm each change appears on the
Menu page and on the Home page where relevant, with no other file edited.

**Acceptance Scenarios**:

1. **Given** the owner adds a new item to the menu file, **When** the site is reloaded, **Then**
   the item appears on the Menu page in the correct category.
2. **Given** the owner changes an item's price, **When** the site is reloaded, **Then** the new
   price appears everywhere the item is shown, including the pre-order list.
3. **Given** the owner marks an item as featured or as a special, **When** the Home page is
   loaded, **Then** the item appears in the matching section.
4. **Given** the owner leaves out optional details for an item (such as a photo or allergens),
   **When** the site is reloaded, **Then** the item still displays correctly, using a neutral
   placeholder image and no allergen badges.
5. **Given** the owner makes a mistake that makes the menu file unreadable, **When** a visitor
   opens a page that uses the menu, **Then** the visitor sees a polite message (for example,
   "Our menu is being updated. Please call us.") with the phone number, instead of a broken or
   empty page.

---

### User Story 3 - Plan a visit (Priority: P3)

A visitor wants to know whether the bakery is open now, where it is, and what's special today.
They land on the Home page, see a welcoming hero, featured items, today's specials, and opening
hours. For directions they open the Visit page, which shows the address, phone, email,
hours, and a map.

**Why this priority**: Turning website visits into foot traffic is the bakery's core business
goal, but it depends on the menu (Story 1) for featured and special items.

**Independent Test**: Load the Home and Visit pages and check that the hours match on
both, today's specials reflect the current day, and the address, map, and contact details are
shown and usable on a phone.

**Acceptance Scenarios**:

1. **Given** the Home page loads, **When** the visitor views it, **Then** they see the hero
   (bakery name, tagline, and a link to the menu), featured items, today's specials, and the
   weekly opening hours with today's row highlighted.
2. **Given** no items are marked as specials for today, **When** the Home page loads, **Then**
   the specials section shows a friendly fallback message (for example, "Fresh specials daily
   — ask at the counter") instead of disappearing or appearing empty.
3. **Given** the Visit page loads, **When** the visitor views it, **Then** they see the
   street address, phone number (tappable to call on phones), email address, the same opening
   hours as the Home page, and an embedded map.
4. **Given** the map cannot load (offline, blocked, or slow), **When** the page is viewed,
   **Then** the address and a "Get directions" link to an external map are still available.
5. **Given** any page, **When** the visitor uses the site navigation, **Then** they can reach
   Home, Menu, About, Custom Cakes, Visit, and Pre-order in one step.

---

### User Story 4 - Build a pre-order list and send it (Priority: P4)

A regular customer wants to pick up two baguettes and half a dozen cookies on Saturday. While
browsing the menu they add items and quantities to a pre-order list. They leave, come back
later, and the list is still there. When ready, they enter their name, contact details, and
preferred pickup date/time, and send the list to the bakery as an email summary.

**Why this priority**: Pre-ordering is useful but not essential. Customers can still phone or
walk in, so it comes after the menu and visit information.

**Independent Test**: Add several items, change quantities, remove one, close and reopen the
browser, confirm the list persists, then send it and confirm the generated email contains every
item, quantity, the estimated total, and the customer details.

**Acceptance Scenarios**:

1. **Given** an available item on the Menu page, **When** the visitor chooses "Add to
   pre-order", **Then** the item is added with quantity 1 (or increased by 1 if already in the
   list), and a visible and screen-reader-announced confirmation appears.
2. **Given** items are in the list, **When** the visitor views the list, **Then** they see each
   item's name, unit price, quantity, line total, and an estimated overall total, and can change
   quantities or remove items.
3. **Given** the visitor has items in the list, **When** they close the browser and return
   later on the same device and browser, **Then** the list is unchanged.
4. **Given** the list is not empty, **When** the visitor fills in name, contact (email or
   phone), and pickup date/time, and chooses "Send pre-order", **Then** their email app opens
   with a pre-filled message to the bakery listing items, quantities, estimated total, pickup
   time, and their contact details.
5. **Given** required details are missing or invalid, **When** the visitor tries to send,
   **Then** each problem is described next to its field and the list is not sent.
6. **Given** an item in a saved list has since been marked sold out or removed from the menu,
   **When** the visitor views the list, **Then** that item is flagged as unavailable and left
   out of the sent summary.
7. **Given** the visitor has sent the list, **When** the email app opens, **Then** the site
   explains that the pre-order is a request that the bakery will confirm, and offers to clear
   the list.

---

### User Story 5 - Request a custom cake (Priority: P5)

A parent wants a birthday cake for Saturday. On the Custom Cakes page they fill out a
form: occasion, pickup date, number of servings/size, flavor, filling, frosting, decoration or
message on the cake, dietary needs, budget, and contact details. They submit it and receive
clear confirmation that the bakery got the request and will follow up.

**Why this priority**: Custom cakes are a valuable source of revenue, but they arrive less
often than everyday orders and can be handled by phone if needed.

**Independent Test**: Complete the form with valid data and submit it, confirm the bakery
receives a readable request with every field; then simulate the online form service being
unavailable and confirm the email fallback produces the same request.

**Acceptance Scenarios**:

1. **Given** the Custom Cakes page, **When** the visitor completes all required fields
   and submits, **Then** the request is delivered to the bakery and a confirmation message
   explains next steps (for example, "We'll reply within 1 business day to confirm and quote").
2. **Given** the visitor chooses a pickup date sooner than the minimum lead time, **When** they
   submit, **Then** they are told the earliest available date and asked to call for urgent
   orders.
3. **Given** a required field is empty or invalid, **When** the visitor submits, **Then** each
   error is shown next to its field, focus moves to the first error, and nothing is sent.
4. **Given** the online form service is not configured or fails to deliver, **When** the
   visitor submits, **Then** the site offers to send the same request through the visitor's
   email app, pre-filled with every answer, and tells them to press send.
5. **Given** the visitor submits, **When** the request is delivered, **Then** the request
   includes every answer in a clearly labeled, human-readable form.

---

### User Story 6 - Get to know the bakery (Priority: P6)

A visitor curious about the bakery reads the About page: the bakery's story and the team
members, with photos and short bios.

**Why this priority**: It builds warmth and trust but doesn't directly drive orders.

**Independent Test**: Open the About page and confirm the story and each team member's photo,
name, role, and bio are displayed and readable on a phone.

**Acceptance Scenarios**:

1. **Given** the About page loads, **When** the visitor views it, **Then** they see the
   bakery's story and a team section with each member's photo, name, role, and short bio.
2. **Given** a team member has no photo, **When** the page loads, **Then** a neutral
   placeholder is shown and the layout stays intact.

---

### Edge Cases

- **Empty category**: A category with no items shows a "nothing here today" message, not a
  blank area.
- **Everything sold out**: The menu still lists items, each marked sold out; the pre-order
  button is unavailable on each.
- **Very long names or descriptions**: Text wraps without breaking the layout on a 320px-wide
  screen.
- **Unknown allergen value** in the menu file: shown as a plain-text badge, not hidden.
- **Unknown category** in the menu file: the item is still shown under "All" and listed in an
  "Other" group, rather than disappearing.
- **Browser storage unavailable** (private mode, blocked, or full): the pre-order list still
  works for the current visit, and the visitor is told it won't be saved after they leave.
- **No email app configured**: when the email handoff doesn't open, the visitor can copy the
  summary text and sees the bakery's email address and phone number to send it manually.
- **Very large quantities**: quantities are limited to 1–99 per item, with a note to call for
  larger orders.
- **Pickup in the past or on a closed day**: the pre-order and cake forms reject it with a
  clear message showing the opening hours. "Closed day" means a day closed in the regular
  weekly hours.
- **Pickup on a one-off closure (holiday or vacation)**: the forms accept it because only the
  weekly hours are checked. The announcement (FR-017a) warns visitors, and the bakery's manual
  confirmation catches any such request.
- **JavaScript disabled**: static pages (About, Visit, hours) are still readable, and
  the Menu page shows a message with the phone number explaining that the menu needs JavaScript.
- **Slow connection**: page text and layout show up before photos, and photos don't shift the
  layout when they load.

## Requirements *(mandatory)*

### Functional Requirements

**Site-wide**

- **FR-001**: The site MUST provide six destinations: Home, Menu, About, Custom Cakes, Visit,
  and Pre-order. Each MUST be a separate page reachable from navigation shown on every page.
  These navigation labels are the canonical page names used throughout this spec (formerly
  referred to as "Custom Cake Orders", "Contact/Visit", and "Pre-order List"; "Pre-order
  List" remains the name of the saved-list entity). The Pre-order page MUST be its own page (not a slide-out panel or
  overlay). Its link in the header MUST show the current number of items in the list, and
  that count MUST update immediately when an item is added.
- **FR-002**: Every page MUST show the bakery name, a link to the menu, the phone number, and
  the opening hours (or a link to them) in a consistent header and footer.
- **FR-003**: The site MUST present a warm, rustic visual identity (for example, earthy and
  cream tones, natural textures, friendly serif/handwritten-style headings) applied
  consistently on all pages, while meeting the project's accessibility contrast rules.
- **FR-004**: Opening hours, address, phone, email, map location, and lead times MUST be
  identical on every page where they appear, because each is entered once (FR-005). The phone
  number and address MUST also appear as plain text in every page's footer, so visitors can
  reach the bakery even when the data file or JavaScript is unavailable.

**Menu content and owner editing**

- **FR-005**: All menu items and all business details (opening hours, address, phone, email,
  map location, lead times, announcement) MUST come from a single data file that the owner
  edits, with business details in its business section. The owner MUST never need to edit
  more than this one file for routine updates. No menu item, price, or opening hour may be
  written directly into a page (the footer fallback in FR-004 is the only exception).
- **FR-006**: Each menu item MUST support: name, category, short description, one price, an
  optional unit label (for example "each", "per dozen", "9-inch whole"), photo and photo
  description, allergens list, sold-out flag, featured flag, and special-day settings. Only
  name, category, and price are required. An item MUST NOT have multiple sizes or prices;
  different sizes are entered as separate items. Wherever a price is shown (menu, Home page,
  pre-order list, sent summary), its unit label MUST be shown next to it when present.
- **FR-007**: The menu data file's format MUST be documented in plain language for the owner,
  with an example of each field and steps for adding, editing, marking sold out, and removing
  an item, and for changing hours, contact details, and lead times, and setting or clearing
  the announcement.
- **FR-008**: When the menu data file is missing or unreadable, every page that uses it MUST
  show a polite fallback message with the phone number, and the rest of the page MUST still
  work.

**Menu page**

- **FR-009**: The Menu page MUST let visitors filter by one category at a time (All, Breads,
  Pastries, Cakes, Cookies) and show which category is active.
- **FR-010**: The Menu page MUST provide text search across item name, description, and
  category. Search MUST ignore upper/lower case, update as the visitor types, and combine with
  the active category filter.
- **FR-011**: The Menu page MUST show the number of matching items and announce changes to
  assistive technology.
- **FR-012**: Each item MUST display allergen badges as visible text labels for each declared
  allergen. The page MUST include a notice that items are made in a shared kitchen and may
  contain traces of other allergens.
- **FR-013**: Sold-out items MUST remain visible, carry a clear "Sold out" label, and be
  impossible to add to the pre-order list.

**Home page**

- **FR-014**: The Home page MUST show a hero section (name, tagline, image, and calls to action
  for "See the menu" and "Order a custom cake").
- **FR-015**: The Home page MUST show featured items, taken from items the owner marks as
  featured, and skipping sold-out items.
- **FR-016**: The Home page MUST show today's specials, taken from items the owner marks as
  specials for the current day of the week (or for every day). When there are none, it MUST
  show a fallback message.
- **FR-017**: The Home page MUST show the weekly opening hours with the current day
  highlighted, and an "Open now" / "Closed now" indication based on the bakery's local time
  (its configured time zone, regardless of where the visitor is) and the regular weekly hours.
  "Today" for the highlighted row and for today's specials (FR-016) is also the bakery-local
  day.
- **FR-017a**: The business section MUST support one optional free-text announcement (for
  example, "Closed Nov 27–28 for Thanksgiving"). When it is present, it MUST appear
  prominently next to the opening hours on the Home and Visit pages and above the
  submit area of the Pre-order and Custom Cakes forms. When it is absent, nothing is shown.
  One-off closures and special hours are communicated only through this announcement; they do
  not change the open/closed indicator or the pickup date checks.

**Pre-order list**

- **FR-018**: Visitors MUST be able to add available items to a pre-order list from the Menu
  page and from Home page item cards, and receive visible and announced confirmation.
- **FR-019**: The pre-order list MUST be saved on the visitor's device so it survives page
  reloads and browser restarts. No account or login is required.
- **FR-020**: Visitors MUST be able to change quantities (1–99), remove items, and clear the
  whole list.
- **FR-021**: The list MUST show unit prices, line totals, and an estimated total, labeled as
  an estimate, using the current prices in the menu file.
- **FR-022**: To send the list, visitors MUST provide name, an email address or phone number,
  and a pickup date and time within opening hours, at least the minimum pre-order lead time
  from now.
- **FR-023**: Sending MUST produce a pre-filled email to the bakery's address. The email MUST
  contain a readable summary with items, quantities, line totals, estimated total, pickup
  date/time, customer contact details, and any notes.
- **FR-024**: After sending, the site MUST explain that the pre-order is a request awaiting
  confirmation and that payment happens at pickup, and MUST offer to clear the list.
- **FR-025**: Items in a saved list that have since become sold out or been removed from the
  menu MUST be flagged and left out of the sent summary.

**Custom cake orders**

- **FR-026**: The Custom Cakes form MUST collect: name, email, phone, occasion, pickup
  date, servings/size, flavor, filling, frosting, decoration and message, dietary requirements,
  budget range, an optional free-text design description, and consent to be contacted. The
  required fields are name, email or phone, pickup date, servings/size, and flavor. The form
  MUST NOT accept image uploads or image links; the design is described in text only.
- **FR-027**: The form MUST enforce the minimum custom-cake lead time and reject dates on which
  the bakery is closed. Errors MUST be shown next to each field, with a summary at the top that
  receives focus.
- **FR-028**: The form MUST send the request through an online form-delivery service when one
  is configured. When none is configured, or delivery fails, it MUST fall back to a pre-filled
  email containing the same answers.
- **FR-029**: After a successful submission, visitors MUST see a confirmation explaining what
  happens next and the expected response time.
- **FR-030**: The form MUST include basic spam protection that is invisible to genuine
  visitors and doesn't block assistive technology.

**About and Visit**

- **FR-031**: The About page MUST present the bakery's story and a team section with each
  member's photo, name, role, and short bio.
- **FR-032**: The Visit page MUST show the address, a tappable phone number, an email
  address, opening hours, an embedded map, and a "Get directions" link that works even when the
  map doesn't load.
- **FR-033**: The map MUST be lazy-loaded and placed after the address and hours, so it
  doesn't delay the page's main content, and it MUST have an accessible name.

**Quality (from the project constitution)**

- **FR-034**: Every page MUST be fully usable with a keyboard alone and with a screen reader,
  and MUST meet WCAG 2.1 AA.
- **FR-035**: Every page MUST be designed for phones first and work from 320px wide up to large
  desktop screens without horizontal scrolling.
- **FR-036**: The site MUST be publishable to a free static hosting service without a server
  or build step.

### Key Entities

- **Menu Item**: Something the bakery sells, in exactly one size. Attributes: unique
  identifier, name, category, short description, price, optional unit label, photo and photo
  description, allergens, sold-out status, featured
  status, special days (specific weekdays or every day).
- **Category**: A grouping of menu items: Breads, Pastries, Cakes, Cookies. Display order is
  fixed in that sequence.
- **Allergen**: A declared ingredient of concern shown as a badge. Standard set: milk, eggs,
  wheat/gluten, soy, peanuts, tree nuts, sesame (others allowed as free text).
- **Business Info**: Bakery name, tagline, address, phone, email, map location, time zone
  (used for "today", open/closed status, and pickup lead-time checks), weekly opening hours
  (per day, including closed days), lead times for pre-orders and custom cakes, and an
  optional free-text announcement. Dated closures or special-hour exceptions are not part of
  the model. Stored in the business section of the same data file as the menu items.
- **Pre-order List**: A visitor's saved selection on their own device. Contains entries (menu
  item identifier and quantity) and a last-updated time.
- **Pre-order Request**: The summary sent to the bakery. Contains list entries with prices,
  estimated total, pickup date/time, customer name and contact, and notes.
- **Custom Cake Request**: A visitor's cake order request with the fields listed in FR-026.
- **Team Member**: Name, role, short bio, photo and photo description.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor on a phone can find a specific item (for example,
  "sourdough") using filter or search in under 15 seconds.
- **SC-002**: A visitor can find today's opening hours and the address within 5 seconds of
  landing on the Home page.
- **SC-003**: The owner, following the written guide, can add a new item, change a price, and
  mark an item sold out in under 10 minutes total, editing only the menu data file, with no
  developer help.
- **SC-004**: A visitor can build a 3-item pre-order and send it in under 2 minutes.
- **SC-005**: A visitor can complete and submit a custom cake request in under 5 minutes, and
  100% of submitted requests reach the bakery containing every answer (through the form service
  or the email fallback).
- **SC-006**: Every page shows its main content in under 2.5 seconds on a typical mid-range
  phone over a 4G connection, and content does not visibly jump around while images load.
- **SC-007**: Every page passes an automated accessibility check with zero WCAG 2.1 AA
  violations, and a manual keyboard-only walkthrough of every user story succeeds.
- **SC-008**: A saved pre-order list remains intact across browser restarts in 100% of tests
  on supported browsers where device storage is available.
- **SC-009**: Hours, address, and phone number are identical on every page where they appear.

## Assumptions

- **Content**: The bakery's real photos, story, team bios, address, and hours are not yet
  available. Realistic placeholder content (clearly marked for replacement) will be used, and
  the owner will replace it.
- **Pre-orders are requests, not purchases**: There is no online payment, stock tracking, or
  automatic confirmation. The bakery confirms each pre-order or cake request by email or phone,
  and payment happens at pickup.
- **Sending method**: Pre-order lists are sent through the visitor's own email app (no
  server). Custom cake requests use an online form-delivery service when the owner has set one
  up. Otherwise they use the same email handoff.
- **Lead times**: The minimum lead time is 24 hours for pre-orders and 72 hours for custom
  cakes. Both are owner-editable business settings.
- **Prices**: Shown in US dollars. Totals are estimates and don't include tax.
- **Sold-out status**: Updated manually by the owner in the menu file. There is no real-time
  stock integration.
- **Specials**: Defined per weekday (or every day) in the menu file. A special for a specific
  calendar date is out of scope for this version.
- **Allergens**: The allergen list is the owner's responsibility. The site shows a
  shared-kitchen disclaimer and doesn't guarantee an item is allergen-free.
- **Map**: Uses a free embeddable map from a third-party map provider, which is the only
  third-party content on the site.
- **Out of scope**: Customer accounts, online payment, delivery, multiple locations,
  multilingual content, a content-management admin screen, newsletters, reviews, and
  inspiration-image uploads or links on the custom cake form, and dated holiday/vacation
  closures or special hours (handled by the free-text announcement instead).
- **Dependencies**: A free static hosting account (GitHub Pages or Netlify). An optional free
  account with a static form-delivery service for cake requests. The bakery-qa extension
  checks required by the constitution, which are not yet installed.
