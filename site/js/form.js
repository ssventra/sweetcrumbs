// form.js: validation, pickup slots, and outbound messages for the Pre-order and
// Custom Cakes forms (contracts/outbound-messages.md). Imports only site.js.
// Custom Cakes page entry module.

import {
  parseHHMM,
  formatTime,
  formatPrice,
  dayKeyOfYmd,
  addDaysYmd,
  wallMinutes,
  formatYmd,
  loadMenu,
  bakeryNow,
  hoursSummary,
} from './site.js';

export const MAILTO_LIMIT = 1800;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const CRLF = '\r\n';

const digits = (s) => String(s ?? '').replace(/\D/g, '');
const clean = (s) => String(s ?? '').trim();

// ---------------------------------------------------------------- shared

/** Shared contact rules: name 1–80, email or phone required (data-model §5–6). */
function validateContact(f, errors, nameField) {
  const name = clean(f[nameField]);
  if (!name) errors[nameField] = 'Enter your name.';
  else if (name.length > 80) errors[nameField] = 'Your name must be 80 characters or fewer.';

  const email = clean(f.email);
  const phone = clean(f.phone);
  if (!email && !phone) errors.email = 'Enter an email address or a phone number so we can confirm.';
  if (email && !EMAIL_RE.test(email)) errors.email = 'Enter an email address like name@example.com.';
  if (phone && digits(phone).length < 7) errors.phone = 'Enter a phone number with at least 7 digits.';
}

/** Date-level checks shared by both forms. Returns an error message or null. */
function pickupDateProblem(business, ymd, now) {
  if (!ymd) return 'Choose a pickup date.';
  if (!YMD_RE.test(ymd)) return 'Enter the pickup date as YYYY-MM-DD.';
  if (ymd < now.ymd) return 'That date is in the past. Choose a later date.';
  const day = dayKeyOfYmd(ymd);
  if (!business.hours[day]) return `We're closed on ${formatYmd(ymd, { long: true }).split(',')[0]}s. Choose another day.`;
  return null;
}

export function mailtoHref(to, subject, body) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ------------------------------------------------------------- pre-order

/**
 * 30-minute pickup slots on `ymd` from open to close − 30 min, keeping only slots at
 * least leadTimes.preorderHours after bakery-local `now` (data-model §5, research R6).
 */
export function pickupSlots(business, ymd, now) {
  if (!ymd || !YMD_RE.test(ymd)) return [];
  const h = business.hours[dayKeyOfYmd(ymd)];
  if (!h) return [];
  const earliest = wallMinutes(now.ymd, now.minutes) + business.leadTimes.preorderHours * 60;
  const slots = [];
  for (let m = parseHHMM(h.open); m <= parseHHMM(h.close) - 30; m += 30) {
    if (wallMinutes(ymd, m) >= earliest) {
      slots.push({ value: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, label: formatTime(m) });
    }
  }
  return slots;
}

/** Errors keyed by field name; {} when valid. `lines` are reconciled cart lines. */
export function validatePreorder(fields, { business, now, lines }) {
  const errors = {};
  validateContact(fields, errors, 'customerName');

  const dateProblem = pickupDateProblem(business, fields.pickupDate, now);
  let slots = [];
  if (dateProblem) errors.pickupDate = dateProblem;
  else {
    slots = pickupSlots(business, fields.pickupDate, now);
    if (slots.length === 0) errors.pickupDate = `No pickup times are left on that day (we need ${business.leadTimes.preorderHours} hours' notice). Choose a later date.`;
  }
  if (!errors.pickupDate) {
    if (!fields.pickupTime) errors.pickupTime = 'Choose a pickup time.';
    else if (!slots.some((s) => s.value === fields.pickupTime)) errors.pickupTime = 'Choose one of the listed pickup times.';
  }

  if (clean(fields.notes).length > 500) errors.notes = 'Notes must be 500 characters or fewer.';
  if (!lines.some((l) => l.status === 'available')) errors.items = 'Your list has no available items to send. Add something from the menu.';
  return errors;
}

/**
 * Pre-order email per contracts/outbound-messages.md §1.
 * Returns { subject, body, full, href, truncated }.
 */
export function buildPreorderEmail({ lines, fields, business }) {
  const available = lines.filter((l) => l.status === 'available');
  const time = formatTime(parseHHMM(fields.pickupTime));
  const subject = `Pre-order request — ${clean(fields.customerName)} — pickup ${formatYmd(fields.pickupDate)} at ${time}`;
  const header = `I'd like to pre-order the following for pickup on ${formatYmd(fields.pickupDate, { long: true })} at ${time}:`;
  const total = available.reduce((sum, l) => sum + l.lineCents, 0);

  const contact = [`Name: ${clean(fields.customerName)}`];
  if (clean(fields.email)) contact.push(`Email: ${clean(fields.email)}`);
  if (clean(fields.phone)) contact.push(`Phone: ${clean(fields.phone)}`);
  if (clean(fields.notes)) contact.push(`Notes: ${clean(fields.notes)}`);

  const compose = (itemLines) => [
    `Hello ${business.name},`,
    '',
    header,
    '',
    ...itemLines,
    '',
    `Estimated total: ${formatPrice(total)} (before tax; payment at pickup)`,
    '',
    ...contact,
    '',
    'I understand this is a request and will wait for your confirmation.',
  ].join(CRLF);

  const itemLines = available.map(
    (l) => `- ${l.qty} × ${l.item.name} (${formatPrice(l.item.priceCents)} ${l.item.unit || 'each'}) = ${formatPrice(l.lineCents)}`,
  );
  const full = compose(itemLines);
  let body = full;
  let href = mailtoHref(business.email, subject, body);
  let truncated = false;
  if (href.length > MAILTO_LIMIT) {
    body = compose(['Full list: please paste from the website (Copy summary).']);
    href = mailtoHref(business.email, subject, body);
    truncated = true;
  }
  return { subject, body, full, href, truncated };
}

// ------------------------------------------------------------ custom cakes

/** Earliest valid cake pickup date: bakery-local now + cakeHours, moved past closed days. */
export function earliestCakeDate(business, now) {
  const target = wallMinutes(now.ymd, now.minutes) + business.leadTimes.cakeHours * 60;
  let ymd = addDaysYmd(now.ymd, Math.floor((target - wallMinutes(now.ymd, 0)) / 1440));
  for (let i = 0; i < 7 && !business.hours[dayKeyOfYmd(ymd)]; i++) ymd = addDaysYmd(ymd, 1);
  return ymd;
}

/** Errors keyed by field name; {} when valid (data-model §6). */
export function validateCake(fields, business, now) {
  const errors = {};
  validateContact(fields, errors, 'name');

  const dateProblem = pickupDateProblem(business, fields.pickupDate, now);
  if (dateProblem) errors.pickupDate = dateProblem;
  else {
    const earliest = earliestCakeDate(business, now);
    if (fields.pickupDate < earliest) {
      errors.pickupDate = `We need ${business.leadTimes.cakeHours} hours' notice for custom cakes. The earliest pickup date is ${formatYmd(earliest)}. Please call us for urgent orders.`;
    }
  }

  if (!clean(fields.servings)) errors.servings = 'Choose how many people the cake should serve.';
  if (!clean(fields.flavor)) errors.flavor = 'Choose a flavor.';
  else if (fields.flavor === 'Other' && !clean(fields.flavorOther)) errors.flavorOther = 'Describe the flavor you would like.';
  if (clean(fields.decoration).length > 300) errors.decoration = 'The design description must be 300 characters or fewer.';
  if (clean(fields.cakeMessage).length > 60) errors.cakeMessage = 'The message on the cake must be 60 characters or fewer.';
  if (clean(fields.dietaryOther).length > 200) errors.dietaryOther = 'Other dietary needs must be 200 characters or fewer.';
  if (!fields.consent) errors.consent = 'Please agree to be contacted about this request.';
  return errors;
}

const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function cakeValues(f) {
  const flavor = f.flavor === 'Other' ? `Other: ${clean(f.flavorOther)}` : clean(f.flavor);
  const dietaryParts = asList(f.dietary).map(clean).filter(Boolean).join(', ');
  const extra = clean(f.dietaryOther);
  const dietary = dietaryParts && extra ? `${dietaryParts}; ${extra}` : dietaryParts || extra;
  return {
    name: clean(f.name),
    email: clean(f.email),
    phone: clean(f.phone),
    occasion: clean(f.occasion),
    pickupDate: clean(f.pickupDate),
    servings: clean(f.servings),
    flavor,
    filling: clean(f.filling),
    frosting: clean(f.frosting),
    decoration: clean(f.decoration),
    cakeMessage: clean(f.cakeMessage),
    dietary,
    budget: clean(f.budget),
    consent: f.consent ? 'yes' : '',
  };
}

function cakeSubject(v) {
  return `Custom cake request — ${v.occasion || 'Cake'} — pickup ${v.pickupDate}`;
}

/** JSON body for the form service (contracts/outbound-messages.md §2). */
export function buildCakePayload(fields) {
  const v = cakeValues(fields);
  return { _subject: cakeSubject(v), _replyto: v.email, _gotcha: clean(fields._gotcha), ...v };
}

const CAKE_LABELS = [
  ['name', 'Name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['occasion', 'Occasion'],
  ['pickupDate', 'Pickup date'],
  ['servings', 'Servings'],
  ['flavor', 'Flavor'],
  ['filling', 'Filling'],
  ['frosting', 'Frosting'],
  ['decoration', 'Decoration'],
  ['cakeMessage', 'Message on cake'],
  ['dietary', 'Dietary needs'],
  ['budget', 'Budget'],
];

/** Fallback email (contracts/outbound-messages.md §3). Returns { subject, body, href }. */
export function buildCakeEmail(fields, business) {
  const v = cakeValues(fields);
  const lines = CAKE_LABELS.map(([key, label]) => {
    let value = v[key];
    if (key === 'pickupDate' && value) value = `${formatYmd(value, { long: true })} (${value})`;
    return `${label}: ${value || '(not specified)'}`;
  });
  lines.push(`Agreed to be contacted: ${v.consent ? 'Yes' : 'No'}`, '', 'I understand this is a request and will wait for your confirmation and quote.');
  const subject = cakeSubject(v);
  const body = lines.join(CRLF);
  return { subject, body, href: mailtoHref(business.email, subject, body) };
}

// --------------------------------------------------------------------- DOM

/** Error summary + per-field messages (contracts/outbound-messages.md §4). Shared with the cake form. */
export function showErrors(form, summary, errors, { order = [], labels = {}, anchors = {} } = {}) {
  for (const control of form.querySelectorAll('[aria-invalid]')) control.removeAttribute('aria-invalid');
  for (const p of form.querySelectorAll('.field-error')) {
    p.hidden = true;
    p.textContent = '';
  }
  const keys = [...order, ...Object.keys(errors).filter((k) => !order.includes(k))].filter((k) => errors[k]);
  if (keys.length === 0) {
    summary.hidden = true;
    summary.replaceChildren();
    return false;
  }
  const h = document.createElement('h2');
  h.textContent = `Please fix ${keys.length} problem${keys.length === 1 ? '' : 's'}`;
  const ul = document.createElement('ul');
  for (const key of keys) {
    const target = anchors[key] ?? key;
    const control = document.getElementById(target);
    if (control && key === target) {
      control.setAttribute('aria-invalid', 'true');
      const msg = document.getElementById(`${key}-error`);
      if (msg) {
        msg.textContent = errors[key];
        msg.hidden = false;
      }
    }
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${target}`;
    a.textContent = `${labels[key] ?? key}: ${errors[key]}`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(target)?.focus();
    });
    li.append(a);
    ul.append(li);
  }
  summary.replaceChildren(h, ul);
  summary.hidden = false;
  summary.focus();
  return true;
}

/** Copy text, falling back to selecting the textarea (research R8). */
export function copySummary(textarea, status) {
  const fallback = () => {
    textarea.focus();
    textarea.select();
    status.textContent = 'Summary selected. Press Ctrl+C (or Cmd+C on a Mac) to copy it.';
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(textarea.value).then(() => {
      status.textContent = 'Summary copied.';
    }, fallback);
  } else {
    fallback();
  }
}

// ------------------------------------------------------- custom cakes page

const CAKE_ORDER = ['name', 'email', 'phone', 'pickupDate', 'servings', 'flavor', 'flavorOther', 'decoration', 'cakeMessage', 'dietaryOther', 'consent'];
const CAKE_FIELD_LABELS = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  pickupDate: 'Pickup date',
  servings: 'Servings',
  flavor: 'Flavor',
  flavorOther: 'Flavor description',
  decoration: 'Design',
  cakeMessage: 'Message on the cake',
  dietaryOther: 'Dietary needs',
  consent: 'Consent',
};
export const SEND_TIMEOUT_MS = 10000;

function readCakeFields(form) {
  const data = new FormData(form);
  const fields = Object.fromEntries(data);
  fields.dietary = data.getAll('dietary');
  return fields;
}

/** POST JSON to the form service; resolves true on 2xx, false otherwise (R7). */
async function postCake(endpoint, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function initCakePage() {
  const form = document.getElementById('cake-form');
  const summary = document.getElementById('cake-error-summary');
  const dateInput = document.getElementById('pickupDate');
  const flavor = document.getElementById('flavor');
  const flavorOtherField = document.getElementById('flavorOther-field');
  const submit = document.getElementById('cake-submit');
  const sending = document.getElementById('cake-sending');
  const confirmation = document.getElementById('cake-confirmation');
  const emailPanel = document.getElementById('cake-email-panel');
  let business = null;

  flavor.addEventListener('change', () => {
    flavorOtherField.hidden = flavor.value !== 'Other';
  });

  loadMenu().then((menu) => {
    if (menu.error) return; // the form still validates basics; sending needs the bakery email, see submit
    business = menu.business;
    const earliest = earliestCakeDate(business, bakeryNow(business.timeZone));
    dateInput.min = earliest;
    document.querySelectorAll('[data-earliest-date]').forEach((el) => {
      el.textContent = formatYmd(earliest, { long: true });
    });
    document.querySelectorAll('[data-cake-hours]').forEach((el) => {
      el.textContent = String(business.leadTimes.cakeHours);
    });
    document.getElementById('cake-bakery-email').textContent = business.email;
  });

  const showEmailFallback = (fields, attempted) => {
    const email = buildCakeEmail(fields, business);
    document.getElementById('cake-summary').value = `To: ${business.email}\nSubject: ${email.subject}\n\n${email.body.replace(/\r\n/g, '\n')}`;
    document.getElementById('cake-fallback-reason').hidden = !attempted;
    document.getElementById('cake-email-reason').hidden = attempted;
    emailPanel.hidden = false;
    emailPanel.focus();
    window.location.href = email.href;
  };

  document.getElementById('cake-copy').addEventListener('click', () => {
    copySummary(document.getElementById('cake-summary'), document.getElementById('cake-copy-status'));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!business) {
      sending.textContent = "Sorry, we can't send requests right now. Please call us using the number at the bottom of the page.";
      return;
    }
    const fields = readCakeFields(form);
    const errors = validateCake(fields, business, bakeryNow(business.timeZone));
    if (errors.pickupDate) errors.pickupDate += ` Our hours: ${hoursSummary(business.hours)}.`;
    if (showErrors(form, summary, errors, { order: CAKE_ORDER, labels: CAKE_FIELD_LABELS })) return;

    emailPanel.hidden = true;
    confirmation.hidden = true;

    // Honeypot filled: a bot. Pretend success and send nothing.
    if (clean(fields._gotcha)) {
      form.reset();
      confirmation.hidden = false;
      confirmation.focus();
      return;
    }

    const endpoint = clean(business.cakeFormEndpoint);
    if (!endpoint) {
      showEmailFallback(fields, false);
      return;
    }
    submit.disabled = true;
    sending.textContent = 'Sending your request…';
    const sent = await postCake(endpoint, buildCakePayload(fields));
    submit.disabled = false;
    sending.textContent = '';
    if (sent) {
      form.reset();
      flavorOtherField.hidden = true;
      confirmation.hidden = false;
      confirmation.focus();
    } else {
      showEmailFallback(fields, true);
    }
  });
}

if (typeof document !== 'undefined' && document.body?.dataset.page === 'cakes') initCakePage();
