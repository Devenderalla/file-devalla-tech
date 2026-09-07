"use strict";

/* ————— palette slots (validated fixed order; hex lives in app.css) ————— */
const SLOT_COUNT = 8;
const slotVar = s => `var(--slot-${s})`;

const DEFAULT_CATEGORIES = [
  { id: "food",     name: "Food",          slot: 0 },
  { id: "kirana",   name: "Kirana",        slot: 0 }, // shares blue with Food — labels carry identity
  { id: "travel",   name: "Travel",        slot: 1 },
  { id: "petrol",   name: "Petrol",        slot: 7 },
  { id: "bills",    name: "Bills",         slot: 3 },
  { id: "emi",      name: "EMI",           slot: 3 }, // shares yellow with Bills
  { id: "shopping", name: "Shopping",      slot: 2 },
  { id: "fun",      name: "Entertainment", slot: 4 },
  { id: "health",   name: "Health",        slot: 5 },
  { id: "haircut",  name: "Haircut",       slot: 5 }, // shares green with Health
  { id: "family",   name: "Family",        slot: 6 }, // sent home — shares violet with Other
  { id: "other",    name: "Other",         slot: 6 },
];
const MAX_CATEGORIES = 12;

const METHODS = [
  { id: "cash", name: "Cash" }, { id: "upi", name: "UPI" },
  { id: "card", name: "Card" }, { id: "bank", name: "Bank" },
];
const methodName = id => METHODS.find(m => m.id === id)?.name || "";

const LS_KEY = "budget-tracker-v1";
const CURRENCY_LOCALE = { INR: "en-IN", USD: "en-US", EUR: "de-DE", GBP: "en-GB" };
const CURRENCY_SYM = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

// parseFloat("Infinity") is Infinity, and Infinity > 0 is true — a bare `> 0`
// check lets it through and turns every downstream total into Infinity/NaN.
const MAX_AMOUNT = 1e12;
const isValidAmount = n => Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT;

/* ————— state ————— */
let corruptBackupKey = null;   // set by load(); reported once the UI exists
let state = load();
let view = startOfMonth(new Date());
let selectedCat = null;
let selectedMethod = null;
let entryType = "expense";
let editingId = null;
let filterText = "";
let filterCats = new Set();
let lastDeleted = null, toastTimer = null;

function migrate(raw) {
  if (!raw || !Array.isArray(raw.entries)) return null;
  if (!raw.version || raw.version < 2) {
    raw.version = 2;
    raw.entries.forEach(e => { if (!e.type) e.type = "expense"; });
    raw.categories = raw.categories || DEFAULT_CATEGORIES.map(c => ({ ...c }));
    raw.budgets = raw.budgets || {};
    raw.recurring = raw.recurring || [];
    raw.theme = raw.theme ?? null;
  }
  // additive once per version: new default categories for existing installs (deleting them later sticks)
  const addDefaults = ids => {
    for (const id of ids) {
      if (!raw.categories.some(c => c.id === id) && raw.categories.length < MAX_CATEGORIES) {
        const def = DEFAULT_CATEGORIES.find(c => c.id === id);
        raw.categories.splice(raw.categories.length - 1, 0, { ...def, slot: nextSlot(raw.categories, def.slot) });
      }
    }
  };
  if (raw.version < 3) { raw.version = 3; addDefaults(["petrol", "haircut"]); }
  if (raw.version < 4) {
    raw.version = 4;
    addDefaults(["kirana", "emi", "family"]);
    raw.goals = raw.goals || [];
  }
  raw.goals = raw.goals || [];
  if (!raw.categories.some(c => c.id === "other")) {
    raw.categories.push({ id: "other", name: "Other", slot: nextSlot(raw.categories, 6) });
  }
  return raw;
}
function load() {
  const raw = localStorage.getItem(LS_KEY);
  try {
    const m = migrate(JSON.parse(raw));
    if (m) return m;
    throw new Error("stored data is not in a shape this version understands");
  } catch (e) {
    // Never discard unreadable data silently — park a copy under its own key so it
    // can still be recovered by hand, and tell the user rather than presenting a
    // clean install as if nothing was ever there.
    if (raw) {
      const key = LS_KEY + "-corrupt-" + Date.now();
      try { localStorage.setItem(key, raw); corruptBackupKey = key; }
      catch (_) { corruptBackupKey = "(could not be backed up — storage is full)"; }
    }
  }
  return {
    version: 4, currency: "INR", theme: null,
    categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
    entries: [], budgets: {}, recurring: [], goals: [],
  };
}

let saveFailed = false;
function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    saveFailed = false;
    return true;
  } catch (e) {
    // Quota exceeded, or Safari private browsing. Every mutation in the app routes
    // through here, so failing silently would lose the change with no sign of it.
    if (!saveFailed) {
      saveFailed = true;   // one warning per failure run, not one per keystroke
      alert(
        "Could not save to this browser's storage — your most recent change is NOT stored.\n\n" +
        "This usually means storage is full, or private browsing is blocking it.\n\n" +
        "Open Manage → Data and export a backup before closing this tab."
      );
    }
    return false;
  }
}

const catById = id => state.categories.find(c => c.id === id) || state.categories.find(c => c.id === "other");
const catColor = id => slotVar(catById(id).slot);
function freeSlots(cats = state.categories) {
  const used = new Set(cats.map(c => c.slot));
  return Array.from({ length: SLOT_COUNT }, (_, i) => i).filter(i => !used.has(i));
}
function nextSlot(cats = state.categories, preferred) {
  const free = freeSlots(cats);
  if (preferred !== undefined && free.includes(preferred)) return preferred;
  if (free.length) return free[0];
  // all 8 in use: share the least-used slot (labels keep identity distinct)
  const counts = Array(SLOT_COUNT).fill(0);
  cats.forEach(c => counts[c.slot]++);
  return counts.indexOf(Math.min(...counts));
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ————— date helpers (local time; keys "YYYY-MM-DD", months "YYYY-MM") ————— */
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function dateKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function monthKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
function parseMonthKey(k) { const [y, m] = k.split("-").map(Number); return new Date(y, m - 1, 1); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function daysInMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function sameMonth(k, monthDate) {
  const d = parseKey(k);
  return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
}

/* ————— formatting ————— */
function fmt(n, opts) {
  return new Intl.NumberFormat(CURRENCY_LOCALE[state.currency], {
    style: "currency", currency: state.currency,
    minimumFractionDigits: 0, maximumFractionDigits: n % 1 ? 2 : 0,
    ...opts
  }).format(n);
}
const fmtCompact = n => fmt(n, { notation: "compact", maximumFractionDigits: 1 });
function dayLabel(key) {
  const today = dateKey(new Date());
  const yest = dateKey(new Date(Date.now() - 864e5));
  if (key === today) return "Today";
  if (key === yest) return "Yesterday";
  return parseKey(key).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function monthName(d, style = "long") { return d.toLocaleDateString("en-GB", { month: style, year: style === "long" ? "numeric" : undefined }); }
function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }
const $ = id => document.getElementById(id);

/* ————— theme ————— */
const media = window.matchMedia("(prefers-color-scheme: dark)");
function applyTheme() {
  const resolved = state.theme ?? (media.matches ? "dark" : "light");
  document.documentElement.dataset.theme = resolved;
  $("themeBtn").textContent = state.theme === "light" ? "☀" : state.theme === "dark" ? "☾" : "◐";
  $("themeBtn").setAttribute("aria-label", `Theme: ${state.theme ?? "system"} — click to change`);
  $("themeBtn").title = `Theme: ${state.theme ?? "system"}`;
}
function cycleTheme() {
  state.theme = state.theme === null ? "light" : state.theme === "light" ? "dark" : null;
  save(); applyTheme();
}
media.addEventListener("change", () => { if (state.theme === null) applyTheme(); });
$("themeBtn").addEventListener("click", cycleTheme);

/* ————— recurring: post due occurrences ————— */
function postRecurring() {
  const now = new Date();
  const cur = monthKey(now);
  let changed = false;
  for (const r of state.recurring) {
    if (!r.active) continue;
    let m = addMonths(parseMonthKey(r.lastPosted), 1);
    while (monthKey(m) <= cur) {
      const effDay = Math.min(r.day, daysInMonth(m));
      if (monthKey(m) === cur && now.getDate() < effDay) break; // not due yet
      state.entries.push({
        id: uid(), type: r.type, amount: r.amount, cat: r.cat, note: r.note,
        date: dateKey(new Date(m.getFullYear(), m.getMonth(), effDay)),
        recurringId: r.id,
      });
      r.lastPosted = monthKey(m);
      changed = true;
      m = addMonths(m, 1);
    }
  }
  if (changed) save();
}

/* ————— guilloche (signature element) ————— */
(function drawGuilloche() {
  const svg = $("guilloche");
  const cx = 240, cy = 240;
  let paths = "";
  for (let i = 0; i < 24; i++) {
    paths += `<ellipse cx="${cx}" cy="${cy}" rx="200" ry="78" transform="rotate(${(i * 180) / 24} ${cx} ${cy})"/>`;
  }
  for (const r of [64, 72, 214, 224]) paths += `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  svg.innerHTML = `<g fill="none" stroke-width="0.6">${paths}</g>`;
})();

/* ————— tooltip ————— */
const tip = $("tip");
function showTip(el, text) {
  tip.textContent = text;
  const r = el.getBoundingClientRect();
  tip.classList.add("show");
  const tr = tip.getBoundingClientRect();
  tip.style.left = Math.max(8, Math.min(innerWidth - tr.width - 8, r.left + r.width / 2 - tr.width / 2)) + "px";
  tip.style.top = Math.max(8, r.top - tr.height - 8) + "px";
}
function hideTip() { tip.classList.remove("show"); }
function bindTips(container) {
  container.querySelectorAll("[data-tip]").forEach(el => {
    el.addEventListener("mouseenter", () => showTip(el, el.dataset.tip));
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("focus", () => showTip(el, el.dataset.tip));
    el.addEventListener("blur", hideTip);
  });
}

/* ————— category chips (entry form) ————— */
function renderChips() {
  const row = $("chipRow");
  row.innerHTML = "";
  state.categories.forEach(c => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.style.setProperty("--c", slotVar(c.slot));
    b.setAttribute("aria-pressed", String(selectedCat === c.id));
    b.dataset.cat = c.id;
    b.innerHTML = `<span class="dot"></span>${esc(c.name)}`;
    b.addEventListener("click", () => {
      selectedCat = selectedCat === c.id ? null : c.id;
      for (const el of row.children) el.setAttribute("aria-pressed", String(el.dataset.cat === selectedCat));
      hideError();
    });
    row.appendChild(b);
  });
}

/* ————— payment-method chips ————— */
function renderMethods() {
  const row = $("methodRow");
  row.querySelectorAll(".chip").forEach(el => el.remove());
  METHODS.forEach(m => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.setAttribute("aria-pressed", String(selectedMethod === m.id));
    b.dataset.method = m.id;
    b.textContent = m.name;
    b.addEventListener("click", () => {
      selectedMethod = selectedMethod === m.id ? null : m.id;
      row.querySelectorAll(".chip").forEach(el => el.setAttribute("aria-pressed", String(el.dataset.method === selectedMethod)));
    });
    row.appendChild(b);
  });
}

/* ————— entry form: type toggle, add, edit ————— */
$("date").value = dateKey(new Date());
function showError(msg) { const e = $("formError"); e.textContent = msg; e.classList.add("show"); }
function hideError() { $("formError").classList.remove("show"); }
$("amount").addEventListener("input", hideError);

function setEntryType(t) {
  entryType = t;
  $("typeExpense").setAttribute("aria-pressed", String(t === "expense"));
  $("typeIncome").setAttribute("aria-pressed", String(t === "income"));
  $("chipRow").hidden = t === "income";
  $("methodRow").hidden = t === "income";
  $("noteLabel").innerHTML = t === "income"
    ? 'Source <span style="font-weight:400;color:var(--ink-3)">(optional)</span>'
    : 'Note <span style="font-weight:400;color:var(--ink-3)">(optional)</span>';
  $("note").placeholder = t === "income" ? "Salary" : "Lunch at Udupi Grand";
  updateSubmitLabel();
  hideError();
}
function updateSubmitLabel() {
  $("submitBtn").textContent = editingId ? "Save changes" : entryType === "income" ? "Add income" : "Add expense";
}
$("typeExpense").addEventListener("click", () => setEntryType("expense"));
$("typeIncome").addEventListener("click", () => setEntryType("income"));

function startEdit(id) {
  const e = state.entries.find(x => x.id === id);
  if (!e) return;
  editingId = id;
  setEntryType(e.type);
  selectedCat = e.cat;
  selectedMethod = e.method || null;
  renderChips();
  renderMethods();
  $("amount").value = e.amount;
  $("note").value = e.note || "";
  $("date").value = e.date;
  $("formTitle").textContent = "Edit entry";
  $("cancelEdit").hidden = false;
  $("repeatLabel").hidden = true;
  updateSubmitLabel();
  $("entryForm").scrollIntoView({ behavior: "smooth", block: "nearest" });
  $("amount").focus();
}
function stopEdit() {
  editingId = null;
  $("formTitle").textContent = "New entry";
  $("cancelEdit").hidden = true;
  $("repeatLabel").hidden = false;
  $("amount").value = ""; $("note").value = "";
  $("repeatChk").checked = false;
  updateSubmitLabel();
}
$("cancelEdit").addEventListener("click", stopEdit);

$("entryForm").addEventListener("submit", ev => {
  ev.preventDefault();
  const amount = parseFloat($("amount").value.replace(/,/g, ""));
  if (!isValidAmount(amount)) return showError("Enter an amount above zero.");
  if (entryType === "expense" && !selectedCat) return showError("Pick a category.");
  const dateVal = $("date").value || dateKey(new Date());
  const cat = entryType === "expense" ? selectedCat : null;
  const note = $("note").value.trim();

  const method = entryType === "expense" ? selectedMethod || undefined : undefined;
  if (editingId) {
    const e = state.entries.find(x => x.id === editingId);
    Object.assign(e, { type: entryType, amount, cat, note, date: dateVal, method });
    stopEdit();
  } else {
    const entry = { id: uid(), type: entryType, amount, cat, note, date: dateVal, method };
    if ($("repeatChk").checked) {
      const r = {
        id: uid(), type: entryType, amount, cat, note,
        day: parseKey(dateVal).getDate(), lastPosted: monthKey(parseKey(dateVal)), active: true,
      };
      state.recurring.push(r);
      entry.recurringId = r.id;
    }
    state.entries.push(entry);
    $("amount").value = ""; $("note").value = "";
    $("repeatChk").checked = false;
  }
  save();
  view = startOfMonth(parseKey(dateVal));
  hideError();
  render();
  $("amount").focus();
});

/* ————— delete + undo ————— */
function deleteEntry(id) {
  const i = state.entries.findIndex(e => e.id === id);
  if (i === -1) return;
  if (editingId === id) stopEdit();
  lastDeleted = state.entries.splice(i, 1)[0];
  save(); render();
  const label = lastDeleted.note || (lastDeleted.cat ? catById(lastDeleted.cat).name : "Income");
  $("toastMsg").textContent = `Deleted ${fmt(lastDeleted.amount)} — ${label}`;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 5000);
}
$("undoBtn").addEventListener("click", () => {
  if (lastDeleted) { state.entries.push(lastDeleted); lastDeleted = null; save(); render(); }
  $("toast").classList.remove("show");
});

/* ————— month nav / currency ————— */
$("prevMonth").addEventListener("click", () => { view = addMonths(view, -1); render(); });
$("nextMonth").addEventListener("click", () => { view = addMonths(view, 1); render(); });
$("backToday").addEventListener("click", () => { view = startOfMonth(new Date()); render(); });
$("currency").value = state.currency;
$("currency").addEventListener("change", () => { state.currency = $("currency").value; save(); render(); });

/* ————— export CSV ————— */
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
$("exportBtn").addEventListener("click", () => {
  const rows = [["date", "type", "category", "note", "method", "amount"]];
  [...state.entries].sort((a, b) => a.date.localeCompare(b.date))
    .forEach(e => rows.push([e.date, e.type, e.cat ? catById(e.cat).name : "", e.note, methodName(e.method || ""), e.amount]));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  download("expenses.csv", csv, "text/csv");
});

/* ————— transaction capture: bank / UPI messages -> draft entries —————
   Input-agnostic on purpose: the same parser serves the share target, the paste
   box and statement import. Nothing here touches the network. */

const CAPTURE_LIMIT = 300;          // refuse absurd pastes rather than hang

/* Rupee figures that are NOT the transaction amount. Stripped before we look for
   the amount, otherwise "Avl Lmt INR 50000" wins over the real "INR 450". */
const NOISE_CLAUSE = /\b(?:avl|avbl|avail(?:able)?)\s*(?:bal(?:ance)?|lmt|limit)\b[^.;\n]*/gi;
const NOISE_CLAUSE_2 = /\b(?:credit\s*limit|limit|bal(?:ance)?)\s*(?:is|:)?\s*(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d+)?/gi;

const DEBIT_WORDS = /\b(?:debited|debit|spent|sent|paid|withdrawn|withdrawal|purchase[ds]?|deducted|dr)\b/i;
const CREDIT_WORDS = /\b(?:credited|credit|received|deposited|refund(?:ed)?|reversed|cr)\b/i;

/* An OTP / promotional / balance-enquiry message has no transaction in it. */
const NOT_A_TXN = /\b(?:otp|one[\s-]?time\s*password|verification code|do not share|will expire|is your (?:otp|code)|dear customer,?\s*your balance|available balance is)\b/i;

/* Currency-first is tried across the WHOLE string before currency-after, otherwise
   the account number in "Card no. XX1234 INR 450" matches as "1234 INR" first. */
const AMOUNT_PRE = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
const AMOUNT_POST = /(?:^|[^A-Za-z0-9])([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i;

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/* merchant fragment -> canonical default-category id. First match wins, so the
   more specific fragment goes first (instamart before a generic grocery term). */
const MERCHANT_RULES = [
  ["kirana", ["bigbasket", "dmart", "d-mart", "reliance fresh", "reliance smart", "more retail", "spencer", "grofers", "jiomart", "instamart", "blinkit", "zepto", "kirana", "supermarket", "provision"]],
  ["food",   ["swiggy", "zomato", "dominos", "domino's", "pizza hut", "kfc", "mcdonald", "burger king", "subway", "starbucks", "cafe", "restaurant", "hotel ", "biryani", "eatfit", "faasos", "behrouz", "dunzo", "bakery", "chai", "coffee"]],
  ["petrol", ["hpcl", "hp petrol", "iocl", "indian oil", "indianoil", "bpcl", "bharat petroleum", "shell", "petrol", "fuel", "petro", "nayara"]],
  ["travel", ["irctc", "uber", "ola ", "olacabs", "rapido", "redbus", "makemytrip", "mmt", "goibibo", "cleartrip", "ixigo", "indigo", "air india", "spicejet", "vistara", "yatra", "abhibus", "metro", "bmtc", "dtc", "railway", "toll", "fastag", "parking"]],
  ["bills",  ["electricity", "bescom", "tneb", "msedcl", "tsspdcl", "apspdcl", "torrent power", "tata power", "adani electricity", "jio", "airtel", "vodafone", "vi ", "bsnl", "act fibernet", "hathway", "broadband", "recharge", "dth", "tata sky", "gas ", "indane", "hp gas", "bharat gas", "water board", "municipal", "insurance", "lic ", "premium"]],
  ["emi",    ["emi", "loan", "bajaj finserv", "bajaj finance", "hdb financial", "capital first", "idfc first loan", "credit card payment", "cred "]],
  ["shopping", ["amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "tatacliq", "tata cliq", "snapdeal", "lenskart", "decathlon", "ikea", "croma", "reliance digital", "vijay sales", "westside", "pantaloons", "zudio", "shoppers stop", "lifestyle"]],
  ["fun",    ["bookmyshow", "pvr", "inox", "cinepolis", "netflix", "spotify", "hotstar", "disney", "prime video", "sony liv", "zee5", "youtube premium", "gaming", "steam", "playstation"]],
  ["health", ["apollo", "pharmeasy", "1mg", "tata 1mg", "netmeds", "practo", "medplus", "wellness", "hospital", "clinic", "diagnostic", "pathology", "lab ", "medical", "pharmacy", "chemist", "cult.fit", "cultfit"]],
  ["haircut", ["salon", "barber", "urban company", "urbanclap", "spa ", "naturals", "lakme salon"]],
];

const stripNoise = s => s.replace(NOISE_CLAUSE, " ").replace(NOISE_CLAUSE_2, " ");
const fullYear = y => (y < 100 ? 2000 + y : y);   // 2-digit years are this century here

function amountFrom(raw) {
  const n = parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
function keyFrom(y, m, d) {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;  // rejects 31 Feb
  return dateKey(dt);
}

/* Indian bank messages are day-first throughout; anything ISO-shaped is year-first. */
function findDate(text) {
  let m;
  if ((m = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/)))
    return keyFrom(+m[1], +m[2] - 1, +m[3]);
  if ((m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/)))
    return keyFrom(fullYear(+m[3]), +m[2] - 1, +m[1]);
  if ((m = text.match(/\b(\d{1,2})[-\s]?([A-Za-z]{3})[a-z]*[-\s,]?\s?(\d{2,4})\b/)) && MONTHS[m[2].toLowerCase()] !== undefined)
    return keyFrom(fullYear(+m[3]), MONTHS[m[2].toLowerCase()], +m[1]);
  if ((m = text.match(/\b([A-Za-z]{3})[a-z]*\s(\d{1,2}),?\s(\d{4})\b/)) && MONTHS[m[1].toLowerCase()] !== undefined)
    return keyFrom(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  return null;
}

function findMethod(text) {
  if (/\batm\b|cash withdrawal|withdrawn at/i.test(text)) return "cash";
  if (/\bupi\b|\bvpa\b|@[a-z]{2,}\b|phonepe|google ?pay|gpay|paytm|bhim/i.test(text)) return "upi";
  if (/\bcard\b|card no|credit card|debit card/i.test(text)) return "card";
  if (/\bneft\b|\bimps\b|\brtgs\b|net ?banking|fund transfer|transferred/i.test(text)) return "bank";
  return null;
}

const JUNK_MERCHANT = /^(?:a\/c|ac|acct|account|upi|vpa|ref|refno|txn|id|no|on|dated|your|the|and|via|using|bank|inr|rs)$/i;

function tidyMerchant(raw) {
  if (!raw) return "";
  let s = raw
    .replace(/\s*(?:ref(?:erence)?(?:\s*no)?|txn(?:\s*id)?|utr|order\s*id)\b.*$/i, "")
    .replace(/\s*\bon\b\s*\d.*$/i, "")
    .replace(/[.,;:\-*_/\\]+$/g, "").replace(/^[.,;:\-*_/\\\s]+/g, "")
    .replace(/\s{2,}/g, " ").trim();
  s = s.split(/\s+/).filter(w => w && !/^\d{4,}$/.test(w) && !JUNK_MERCHANT.test(w)).join(" ").slice(0, 60).trim();
  if (!s) return "";
  // SCREAMING BANK TEXT and bare vpa handles -> Title Case; leave deliberate
  // mixed case ("PharmEasy", "BookMyShow") exactly as written
  if (s === s.toUpperCase() || s === s.toLowerCase())
    s = s.toLowerCase().replace(/\b[a-z]/g, ch => ch.toUpperCase());
  return s;
}

function findMerchant(text) {
  let m;
  if ((m = text.match(/\b([a-z0-9][a-z0-9._-]{1,})@[a-z]{2,}\b/i)))            // upi handle
    return tidyMerchant(m[1].replace(/[._-]+/g, " "));
  if ((m = text.match(/\bUPI[\/-](?:P2[MA][\/-])?(?:\d+[\/-])?([A-Za-z][A-Za-z .&'-]{2,})/)))  // UPI/P2M/123/NAME
    return tidyMerchant(m[1]);
  if ((m = text.match(/\b(?:to|at|towards|in favour of)\s+(?:vpa\s+)?([A-Za-z][A-Za-z0-9 .&'-]{2,}?)(?=\s*(?:\.|,|;|\bon\b|\bref\b|\bupi\b|\bfor\b|\bavl\b|\bavail\b|\bnot\b|\bthru\b|\bvia\b|\busing\b|\bwith\b|\bfrom\b|$))/i)))
    return tidyMerchant(m[1]);
  if ((m = text.match(/\b(?:from|by)\s+([A-Za-z][A-Za-z0-9 .&'-]{2,}?)(?=\s*(?:\.|,|;|\bon\b|\bref\b|\bupi\b|\bavl\b|$))/i)))
    return tidyMerchant(m[1]);
  return "";
}

/* Category id for a merchant: an existing user category matched by its own name
   wins over the built-in rules, so renamed and hand-made categories still work. */
function guessCat(merchant, text) {
  const hay = ((merchant || "") + " " + (text || "")).toLowerCase();
  for (const c of state.categories) {
    const n = c.name.trim().toLowerCase();
    if (n.length >= 4 && hay.includes(n)) return c.id;
  }
  for (const [cat, needles] of MERCHANT_RULES) {
    for (const n of needles) {
      if (hay.includes(n)) return state.categories.some(c => c.id === cat) ? cat : "other";
    }
  }
  return null;
}

/* one message -> one draft, or null when there is no transaction in it */
function parseMessage(rawMsg) {
  const original = String(rawMsg || "").trim();
  if (original.length < 8) return null;

  const hasDebit = DEBIT_WORDS.test(original);
  const hasCredit = CREDIT_WORDS.test(original);
  if (!hasDebit && !hasCredit) return null;
  if (NOT_A_TXN.test(original) && !hasDebit && !hasCredit) return null;

  const text = stripNoise(original);
  const am = text.match(AMOUNT_PRE) || text.match(AMOUNT_POST);
  if (!am) return null;
  const amount = amountFrom(am[1]);
  if (!isValidAmount(amount)) return null;

  // earliest direction word wins: "debited ... SWIGGY credited" is a debit
  const dPos = hasDebit ? original.search(DEBIT_WORDS) : Infinity;
  const cPos = hasCredit ? original.search(CREDIT_WORDS) : Infinity;
  const type = cPos < dPos ? "income" : "expense";
  const note = findMerchant(text);

  return {
    amount, type, note,
    date: findDate(text) || dateKey(new Date()),
    method: findMethod(text),
    cat: type === "expense" ? guessCat(note, text) : null,
  };
}

function parseMessages(blob) {
  const text = String(blob || "");
  if (!text.trim()) return [];
  const out = [];
  for (const chunk of text.split(/\n\s*\n+/)) {
    if (out.length >= CAPTURE_LIMIT) break;
    const lines = chunk.split(/\n/).map(l => l.trim()).filter(Boolean);
    // Several one-line messages pasted without blank lines between them: if the
    // lines parse individually into more than one entry, that reading wins over
    // treating the whole block as a single multi-line message.
    if (lines.length > 1) {
      const perLine = lines.map(parseMessage).filter(Boolean);
      if (perLine.length > 1) { out.push(...perLine.slice(0, CAPTURE_LIMIT - out.length)); continue; }
    }
    const whole = parseMessage(chunk);
    if (whole) out.push(whole);
    else out.push(...lines.map(parseMessage).filter(Boolean).slice(0, CAPTURE_LIMIT - out.length));
  }
  return out;
}

/* ————— capture dialog (paste + share target) ————— */
let drafts = [];
const capDlg = $("captureDlg");

const isDupe = d => state.entries.some(e =>
  e.date === d.date && e.amount === d.amount && (e.note || "") === (d.note || ""));

function openCapture(prefill) {
  if (typeof prefill === "string" && prefill.trim()) {
    $("captureText").value = prefill.trim();
    runCapture();
  }
  if (!capDlg.open) capDlg.showModal();
  if (!drafts.length) $("captureText").focus();
}

function runCapture() {
  drafts = parseMessages($("captureText").value).map(d => {
    const dupe = isDupe(d);
    return { ...d, on: !dupe, dupe };
  });
  const hint = $("captureHint");
  if (!drafts.length) hint.textContent = "No transactions found in that text. Bank and UPI alerts work best.";
  else {
    const dupes = drafts.filter(d => d.dupe).length;
    hint.textContent = `Found ${drafts.length} ${drafts.length === 1 ? "transaction" : "transactions"}` +
      (dupes ? ` — ${dupes} already look${dupes === 1 ? "s" : ""} added, so ${dupes === 1 ? "it is" : "they are"} unticked.` : ".");
  }
  renderDrafts();
}

function renderDrafts() {
  const host = $("draftList");
  $("draftActions").hidden = !drafts.length;
  host.innerHTML = drafts.map((d, i) => `
    <div class="draft-row${d.dupe ? " dupe" : ""}">
      <input type="checkbox" data-draft="${i}" ${d.on ? "checked" : ""} aria-label="Include ${esc(d.note || "this transaction")}">
      <span class="draft-amt${d.type === "income" ? " in" : ""}">${esc(fmt(d.amount))}</span>
      <span class="grow draft-note">${esc(d.note || "—")}<span class="draft-meta">${esc(dayLabel(d.date))}${d.method ? " · " + esc(methodName(d.method)) : ""}${d.dupe ? " · already added" : ""}</span></span>
      ${d.type === "income"
        ? `<span class="draft-inc">Income</span>`
        : `<select data-draftcat="${i}" aria-label="Category for ${esc(d.note || "this transaction")}">
             ${state.categories.map(c => `<option value="${c.id}"${c.id === (d.cat || "other") ? " selected" : ""}>${esc(c.name)}</option>`).join("")}
           </select>`}
    </div>`).join("");
  host.querySelectorAll("[data-draft]").forEach(cb => {
    cb.addEventListener("change", () => { drafts[+cb.dataset.draft].on = cb.checked; updateDraftBtn(); });
  });
  host.querySelectorAll("[data-draftcat]").forEach(sel => {
    sel.addEventListener("change", () => { drafts[+sel.dataset.draftcat].cat = sel.value; });
  });
  updateDraftBtn();
}

function updateDraftBtn() {
  const n = drafts.filter(d => d.on).length;
  const btn = $("draftAddBtn");
  btn.disabled = !n;
  btn.textContent = n ? `Add ${n} ${n === 1 ? "entry" : "entries"}` : "Nothing selected";
}

$("captureParseBtn").addEventListener("click", runCapture);
$("captureClearBtn").addEventListener("click", () => {
  drafts = []; $("captureText").value = ""; $("captureHint").textContent = "";
  renderDrafts(); $("captureText").focus();
});
$("draftAddBtn").addEventListener("click", () => {
  const chosen = drafts.filter(d => d.on);
  if (!chosen.length) return;
  const before = state.entries.length;
  for (const d of chosen) {
    state.entries.push({
      id: uid(), type: d.type, amount: d.amount,
      cat: d.type === "expense" ? (d.cat || "other") : null,
      note: d.note, date: d.date, method: d.method || undefined,
    });
  }
  if (!save()) { state.entries.length = before; return; }   // save() already warned
  view = startOfMonth(parseKey(chosen[chosen.length - 1].date));
  drafts = []; $("captureText").value = "";
  renderDrafts();
  render();
  $("captureHint").textContent = `Added ${chosen.length} ${chosen.length === 1 ? "entry" : "entries"}.`;
});
$("captureBtn").addEventListener("click", () => openCapture());
$("captureFromSettings").addEventListener("click", () => { dlg.close(); openCapture(); });
capDlg.addEventListener("close", () => { drafts = []; renderDrafts(); $("captureHint").textContent = ""; });

/* ————— CSV import ————— */
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(c => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c !== "")) rows.push(row);
  return rows;
}
/* Header names this app exports, plus the ones real bank statements use.
   Statements split direction across two money columns instead of a "type". */
const CSV_ALIASES = {
  date:     ["date", "txn date", "transaction date", "tran date", "value date", "posting date"],
  amount:   ["amount", "amt", "transaction amount"],
  note:     ["note", "narration", "description", "particulars", "remarks", "details", "transaction remarks"],
  category: ["category", "cat"],
  method:   ["method", "mode", "payment mode"],
  type:     ["type", "dr/cr", "drcr"],
  debit:    ["withdrawal amt.", "withdrawal amt", "withdrawal amount", "withdrawal", "debit", "debit amount", "debit amt", "dr"],
  credit:   ["deposit amt.", "deposit amt", "deposit amount", "deposit", "credit", "credit amount", "credit amt", "cr"],
};

function importCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return alert("That file looks empty.");
  const header = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, " "));
  const col = field => {
    for (const name of CSV_ALIASES[field]) { const i = header.indexOf(name); if (i !== -1) return i; }
    return -1;
  };
  const iDate = col("date"), iAmount = col("amount"), iDebit = col("debit"), iCredit = col("credit");
  const iNote = col("note"), iCat = col("category"), iMethod = col("method"), iType = col("type");
  if (iDate === -1 || (iAmount === -1 && iDebit === -1 && iCredit === -1))
    return alert('Expected a header row with a date column and either an "amount" column or withdrawal/deposit columns.');

  const cell = (r, i) => (i === -1 ? "" : (r[i] || "").trim());
  const toAdd = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const date = findDate(cell(r, iDate));          // accepts ISO, DD-MM-YY, DD-Mon-YY…
    if (!date) { skipped++; continue; }

    // direction: an explicit type column, else whichever money column is filled
    let amount = null, type = "expense";
    if (iAmount !== -1) {
      amount = parseFloat(cell(r, iAmount).replace(/[^\d.-]/g, ""));
      const t = cell(r, iType).toLowerCase();
      if (t === "income" || t === "cr" || t === "credit") type = "income";
      if (amount < 0) { amount = Math.abs(amount); type = "expense"; }
    } else {
      const dr = parseFloat(cell(r, iDebit).replace(/[^\d.-]/g, ""));
      const cr = parseFloat(cell(r, iCredit).replace(/[^\d.-]/g, ""));
      if (isValidAmount(dr)) { amount = dr; type = "expense"; }
      else if (isValidAmount(cr)) { amount = cr; type = "income"; }
    }
    if (!isValidAmount(amount)) { skipped++; continue; }

    const note = cell(r, iNote);
    let cat = null;
    if (type === "expense") {
      const catName = cell(r, iCat);
      const found = catName && state.categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      if (found) cat = found.id;
      else if (catName && state.categories.length < MAX_CATEGORIES) {
        const nc = { id: uid(), name: catName, slot: nextSlot() };
        state.categories.push(nc); cat = nc.id;
      } else cat = guessCat(note, note) || "other";   // no category column: read the narration
    }
    const methodRaw = cell(r, iMethod).toLowerCase();
    const method = METHODS.some(m => m.id === methodRaw) ? methodRaw : (findMethod(note) || undefined);
    toAdd.push({ id: uid(), type, amount, cat, method, note, date });
  }

  if (!toAdd.length) return alert("No usable rows found — check that the date and amount columns have values.");
  const tail = skipped ? `\n\n${skipped} row${skipped === 1 ? "" : "s"} skipped (no readable date or amount).` : "";
  if (!confirm(`Import ${toAdd.length} ${toAdd.length === 1 ? "entry" : "entries"}?${tail}`)) return;
  const before = state.entries.length;
  state.entries.push(...toAdd);
  if (!save()) { state.entries.length = before; return; }
  render(); renderSettings();
  $("dataHint").textContent = `Imported ${toAdd.length} entries${skipped ? `, skipped ${skipped}` : ""}.`;
}
$("importCsvBtn").addEventListener("click", () => $("csvFile").click());
$("csvFile").addEventListener("change", () => {
  const f = $("csvFile").files[0];
  if (f) f.text().then(importCSV);
  $("csvFile").value = "";
});

/* ————— JSON backup / restore ————— */
$("backupBtn").addEventListener("click", () => {
  download("budget-backup.json", JSON.stringify(state, null, 2), "application/json");
});
$("restoreBtn").addEventListener("click", () => $("jsonFile").click());
$("jsonFile").addEventListener("change", () => {
  const f = $("jsonFile").files[0];
  $("jsonFile").value = "";
  if (!f) return;
  f.text().then(t => {
    let parsed;
    try { parsed = migrate(JSON.parse(t)); } catch (e) { parsed = null; }
    if (!parsed) return alert("That file isn't a Budget Tracker backup.");
    if (!confirm(`Replace everything with this backup (${parsed.entries.length} entries)? This cannot be undone.`)) return;
    state = parsed;
    save(); applyTheme(); renderChips(); render(); renderSettings();
    $("currency").value = state.currency;
    $("dataHint").textContent = "Backup restored.";
  });
});

/* ————— erase all data ————— */
$("eraseBtn").addEventListener("click", () => {
  const n = state.entries.length;
  if (!confirm(`Erase everything saved on this device — ${n} ${n === 1 ? "entry" : "entries"}, budgets, categories and settings?`)) return;
  if (!confirm("Last check: this cannot be undone (a JSON backup is the only way back). Erase?")) return;
  localStorage.removeItem(LS_KEY);
  state = load();
  editingId = null; selectedCat = null; selectedMethod = null; lastDeleted = null;
  filterText = ""; filterCats.clear(); $("searchBox").value = "";
  view = startOfMonth(new Date());
  save(); applyTheme(); stopEdit(); renderChips(); renderMethods(); render(); renderSettings();
  $("currency").value = state.currency;
  $("dataHint").textContent = "Everything erased — you have a clean page.";
});

/* ————— settings dialog ————— */
const dlg = $("settingsDlg");
$("manageBtn").addEventListener("click", () => openSettings());
$("setBudgetsBtn").addEventListener("click", () => openSettings("secBudgets"));
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
function openSettings(section) {
  renderSettings();
  dlg.showModal();
  if (section) $(section).scrollIntoView({ block: "start" });
}
dlg.addEventListener("close", render); // reflect edits

function renderSettings() {
  // budgets
  $("budgetRows").innerHTML = state.categories.map(c => `
    <div class="set-row">
      <span class="dot" style="background:${slotVar(c.slot)}"></span>
      <span class="name grow">${esc(c.name)}</span>
      <input type="number" min="0" step="1" placeholder="—" data-budget="${c.id}"
        value="${state.budgets[c.id] ?? ""}" aria-label="Monthly budget for ${esc(c.name)}">
    </div>`).join("");
  // "change", not "input": save() serialises the whole state, so binding to every
  // keystroke wrote the entire store once per character typed.
  $("budgetRows").querySelectorAll("[data-budget]").forEach(inp => {
    inp.addEventListener("change", () => {
      const v = parseFloat(inp.value);
      if (isValidAmount(v)) state.budgets[inp.dataset.budget] = v;
      else delete state.budgets[inp.dataset.budget];
      save();
    });
  });

  // categories
  $("catRows").innerHTML = state.categories.map(c => `
    <div class="set-row">
      <button class="swatch" style="--c:${slotVar(c.slot)}" data-swatch="${c.id}" title="Change color" aria-label="Change color of ${esc(c.name)}"></button>
      <span class="grow"><input type="text" value="${esc(c.name)}" data-rename="${c.id}" aria-label="Rename category"></span>
      ${c.id === "other" ? "" : `<button class="mini-btn danger" data-delcat="${c.id}">Delete</button>`}
    </div>`).join("");
  $("catRows").querySelectorAll("[data-rename]").forEach(inp => {
    inp.addEventListener("change", () => {
      const c = catById(inp.dataset.rename);
      const next = inp.value.trim();
      if (next) c.name = next;
      else inp.value = c.name;   // rejected: put the field back in sync with the model
      save(); renderChips();
    });
  });
  $("catRows").querySelectorAll("[data-swatch]").forEach(b => {
    b.addEventListener("click", () => {
      const c = catById(b.dataset.swatch);
      // cycle: prefer unused slots; when all 8 are taken, walk every slot
      const free = freeSlots();
      const pool = free.length ? free : Array.from({ length: SLOT_COUNT }, (_, i) => i).filter(s => s !== c.slot);
      c.slot = pool.find(s => s > c.slot) ?? pool[0];
      save(); renderChips(); renderSettings();
    });
  });
  $("catRows").querySelectorAll("[data-delcat]").forEach(b => {
    b.addEventListener("click", () => {
      const c = catById(b.dataset.delcat);
      const n = state.entries.filter(e => e.cat === c.id).length;
      if (!confirm(`Delete "${c.name}"?${n ? ` Its ${n} entries move to Other.` : ""}`)) return;
      state.entries.forEach(e => { if (e.cat === c.id) e.cat = "other"; });
      state.recurring.forEach(r => { if (r.cat === c.id) r.cat = "other"; });
      delete state.budgets[c.id];
      state.categories = state.categories.filter(x => x.id !== c.id);
      if (selectedCat === c.id) selectedCat = null;
      save(); renderChips(); renderSettings();
    });
  });
  const full = state.categories.length >= MAX_CATEGORIES;
  $("addCatBtn").disabled = full;
  $("addCatHint").textContent = full ? `${MAX_CATEGORIES} categories is the maximum — remove one first.`
    : freeSlots().length === 0 ? "Colors repeat past 8 categories — names keep them distinct." : "";

  // recurring
  $("recRows").innerHTML = state.recurring.length ? state.recurring.map(r => `
    <div class="set-row ${r.active ? "" : "paused"}">
      <span class="dot" style="background:${r.cat ? catColor(r.cat) : "var(--good)"}"></span>
      <span class="grow">
        <span class="name">${esc(r.note || (r.cat ? catById(r.cat).name : "Income"))}</span>
        <span class="rec-meta"> · ${fmt(r.amount)} · day ${r.day}${r.active ? "" : " · paused"}</span>
      </span>
      <button class="mini-btn" data-recpause="${r.id}">${r.active ? "Pause" : "Resume"}</button>
      <button class="mini-btn danger" data-recdel="${r.id}">Delete</button>
    </div>`).join("")
    : `<p class="dlg-hint" style="padding:6px 0">Nothing recurring yet.</p>`;
  $("recRows").querySelectorAll("[data-recpause]").forEach(b => {
    b.addEventListener("click", () => {
      const r = state.recurring.find(x => x.id === b.dataset.recpause);
      r.active = !r.active;
      if (r.active) r.lastPosted = monthKey(new Date()); // resume from now, don't back-post the gap
      save(); postRecurring(); renderSettings();
    });
  });
  $("recRows").querySelectorAll("[data-recdel]").forEach(b => {
    b.addEventListener("click", () => {
      if (!confirm("Delete this recurring template? Already-posted entries stay.")) return;
      state.recurring = state.recurring.filter(x => x.id !== b.dataset.recdel);
      save(); renderSettings();
    });
  });
}

$("addCatBtn").addEventListener("click", () => {
  if (state.categories.length >= MAX_CATEGORIES) return;
  const nc = { id: uid(), name: "New category", slot: nextSlot() };
  const otherIdx = state.categories.findIndex(c => c.id === "other");
  state.categories.splice(otherIdx === -1 ? state.categories.length : otherIdx, 0, nc);
  save(); renderChips(); renderSettings();
  const inp = document.querySelector(`[data-rename="${nc.id}"]`);
  if (inp) { inp.focus(); inp.select(); }
});

/* ————— filters ————— */
$("searchBox").addEventListener("input", () => { filterText = $("searchBox").value.trim().toLowerCase(); render(); });
$("clearFilters").addEventListener("click", () => {
  filterText = ""; filterCats.clear(); $("searchBox").value = "";
  render();
});
function renderFilterChips() {
  const host = $("filterChips");
  host.innerHTML = "";
  state.categories.forEach(c => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.style.setProperty("--c", slotVar(c.slot));
    b.setAttribute("aria-pressed", String(filterCats.has(c.id)));
    b.innerHTML = `<span class="dot"></span>${esc(c.name)}`;
    b.addEventListener("click", () => {
      filterCats.has(c.id) ? filterCats.delete(c.id) : filterCats.add(c.id);
      render();
    });
    host.appendChild(b);
  });
}
function entryMatchesFilter(e) {
  if (filterCats.size && (!e.cat || !filterCats.has(e.cat))) return false;
  if (filterText) {
    const hay = ((e.note || "") + " " + (e.cat ? catById(e.cat).name : "income") + " " + methodName(e.method || "")).toLowerCase();
    if (!hay.includes(filterText)) return false;
  }
  return true;
}

/* ————— sample data ————— */
function seedSample() {
  const t = new Date();
  const put = (mOff, d, amount, cat, note, type = "expense", method) => {
    const m = addMonths(startOfMonth(t), mOff);
    state.entries.push({
      id: uid(), type, amount, cat, note, method, sample: true,
      date: dateKey(new Date(m.getFullYear(), m.getMonth(), Math.min(d, daysInMonth(m)))),
    });
  };
  const today = t.getDate();
  put(0, today, 250, "food", "Lunch — Udupi Grand", "expense", "upi");
  put(0, today, 60, "travel", "Metro", "expense", "cash");
  put(0, Math.max(1, today - 1), 1450, "shopping", "Running shoes", "expense", "card");
  put(0, Math.max(1, today - 1), 180, "food", "Groceries top-up", "expense", "upi");
  put(0, Math.max(1, today - 2), 999, "bills", "Broadband", "expense", "bank");
  put(0, Math.max(1, today - 3), 480, "fun", "Movie night");
  put(0, Math.max(1, today - 4), 350, "health", "Pharmacy");
  put(0, Math.max(1, today - 5), 720, "food", "Dinner out");
  put(0, 1, 52000, null, "Salary", "income");
  // last month, for the delta / trends
  [[3, 420, "food", "Groceries"], [5, 999, "bills", "Broadband"], [8, 1900, "shopping", "Headphones"],
   [12, 260, "food", "Lunches"], [15, 850, "travel", "Cab to airport"], [19, 640, "fun", "Concert"],
   [24, 380, "food", "Dinner"], [27, 220, "health", "Pharmacy"]].forEach(([d, a, c, n]) => put(-1, d, a, c, n));
  put(-1, 1, 52000, null, "Salary", "income");
  // sparse older months so the 6-month strip has shape
  [[-2, 5230], [-3, 6890], [-4, 4150], [-5, 5610]].forEach(([off, total]) => {
    put(off, 6, Math.round(total * 0.4), "food", "Food, various");
    put(off, 14, Math.round(total * 0.35), "bills", "Bills");
    put(off, 22, Math.round(total * 0.25), "shopping", "Odds and ends");
  });
  state.budgets = { food: 6000, shopping: 3000, ...state.budgets };
  save(); render();
}

/* ————— remove sample data ————— */
// fingerprints catch sample entries seeded before the `sample` flag existed
const SAMPLE_PRINTS = new Set([
  "Lunch — Udupi Grand|250", "Metro|60", "Running shoes|1450", "Groceries top-up|180",
  "Broadband|999", "Movie night|480", "Pharmacy|350", "Dinner out|720", "Salary|52000",
  "Groceries|420", "Headphones|1900", "Lunches|260", "Cab to airport|850", "Concert|640",
  "Dinner|380", "Pharmacy|220", "Food, various|2092", "Bills|1831", "Odds and ends|1308",
  "Food, various|2756", "Bills|2412", "Odds and ends|1723", "Food, various|1660",
  "Bills|1453", "Odds and ends|1038", "Food, various|2244", "Bills|1964", "Odds and ends|1403",
]);
const isSample = e => e.sample || String(e.id).startsWith("seed-") || SAMPLE_PRINTS.has(`${e.note}|${e.amount}`);
$("removeSampleBtn").addEventListener("click", () => {
  const n = state.entries.filter(isSample).length;
  if (!confirm(`Remove the ${n} sample ${n === 1 ? "entry" : "entries"}? Your own entries stay.`)) return;
  state.entries = state.entries.filter(e => !isSample(e));
  if (state.budgets.food === 6000) delete state.budgets.food;         // seeded demo budgets,
  if (state.budgets.shopping === 3000) delete state.budgets.shopping; // only if untouched
  save(); render();
});

/* ————— gullak: savings goals ————— */
function renderGoals() {
  const host = $("goalList");
  host.innerHTML = state.goals.length ? state.goals.map(g => {
    const pct = g.target ? Math.min(100, (g.saved / g.target) * 100) : 0;
    const done = g.saved >= g.target;
    return `<div class="goal">
      <div class="bd-top">
        <span class="bd-name">${esc(g.name)}</span>
        ${done ? `<span class="goal-done">saved! ✦</span>` : ""}
        <span class="bd-amt"><b>${fmt(g.saved)}</b> of ${fmt(g.target)}</span>
      </div>
      <div class="bd-track"><div class="bd-bar goal-fill" style="width:${pct}%"></div></div>
      <div class="goal-actions">
        <button type="button" class="link-btn" data-gadd="${g.id}">+ add money</button>
        <button type="button" class="link-btn danger" data-gdel="${g.id}">remove</button>
        ${done ? "" : `<span class="goal-left">${fmt(g.target - g.saved)} to go</span>`}
      </div>
      <div class="goal-addrow" hidden>
        <input type="number" min="1" placeholder="Amount" aria-label="Amount to add to ${esc(g.name)}">
        <button type="button" class="mini-btn" data-gsave="${g.id}">Add</button>
      </div>
    </div>`;
  }).join("") : `<div class="bd-empty">Put something aside — "₹5,000 by Diwali" starts here.</div>`;

  host.querySelectorAll("[data-gadd]").forEach(b => b.addEventListener("click", () => {
    const row = b.closest(".goal").querySelector(".goal-addrow");
    row.hidden = !row.hidden;
    if (!row.hidden) row.querySelector("input").focus();
  }));
  host.querySelectorAll("[data-gsave]").forEach(b => b.addEventListener("click", () => {
    const v = parseFloat(b.closest(".goal-addrow").querySelector("input").value);
    if (!(v > 0)) return;
    const g = state.goals.find(x => x.id === b.dataset.gsave);
    g.saved += v;
    save(); renderGoals();
  }));
  host.querySelectorAll("[data-gdel]").forEach(b => b.addEventListener("click", () => {
    const g = state.goals.find(x => x.id === b.dataset.gdel);
    if (!confirm(`Remove the "${g.name}" goal?${g.saved ? ` The ${fmt(g.saved)} tracked in it is only a note — your money is wherever you kept it.` : ""}`)) return;
    state.goals = state.goals.filter(x => x.id !== g.id);
    save(); renderGoals();
  }));
}
$("goalForm").addEventListener("submit", ev => {
  ev.preventDefault();
  const name = $("goalName").value.trim();
  const target = parseFloat($("goalTarget").value);
  if (!name || !(target > 0)) return;
  state.goals.push({ id: uid(), name, target, saved: 0 });
  $("goalName").value = ""; $("goalTarget").value = "";
  save(); renderGoals();
});

/* ————— trends ————— */
function expensesIn(monthDate) {
  return state.entries.filter(e => e.type === "expense" && sameMonth(e.date, monthDate));
}
function renderTrends(monthEntries, total) {
  const days = daysInMonth(view);
  const perDay = Array(days).fill(0);
  monthEntries.forEach(e => { if (e.type === "expense") perDay[parseKey(e.date).getDate() - 1] += e.amount; });
  const maxDay = Math.max(...perDay, 1);
  $("dailyMax").textContent = Math.max(...perDay) > 0 ? "peak " + fmtCompact(Math.max(...perDay)) : "";
  $("dailyBars").innerHTML = perDay.map((v, i) => {
    const d = new Date(view.getFullYear(), view.getMonth(), i + 1);
    const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + " — " + fmt(v);
    return `<div class="bar ${v ? "" : "zero"}" style="height:${v ? Math.max(4, (v / maxDay) * 100) : 3}%"
      ${v ? `data-tip="${esc(label)}" tabindex="0" role="img" aria-label="${esc(label)}"` : ""}></div>`;
  }).join("");
  $("dailyTicks").innerHTML = [1, 7, 14, 21, 28].map(d => `<span>${d}</span>`).join("");

  // last 6 months
  const months = Array.from({ length: 6 }, (_, i) => addMonths(view, i - 5));
  const totals = months.map(m => expensesIn(m).reduce((s, e) => s + e.amount, 0));
  const maxMo = Math.max(...totals, 1);
  $("moBars").innerHTML = months.map((m, i) => {
    const label = monthName(m) + " — " + fmt(totals[i]);
    const isView = i === 5;
    return `<button type="button" class="bar ${isView ? "" : "dim"} ${totals[i] ? "" : "zero"}"
      style="height:${totals[i] ? Math.max(4, (totals[i] / maxMo) * 100) : 3}%"
      data-tip="${esc(label)}" data-mo="${monthKey(m)}" aria-label="${esc(label)}${isView ? "" : " — view this month"}"></button>`;
  }).join("");
  $("moLabels").innerHTML = months.map((m, i) =>
    `<span class="${i === 5 ? "now" : ""}">${monthName(m, "short")}</span>`).join("");
  $("moBars").querySelectorAll("[data-mo]").forEach(b =>
    b.addEventListener("click", () => { view = parseMonthKey(b.dataset.mo); render(); }));
  bindTips($("trendsCard"));

  // callout
  const co = $("callout");
  const monthExp = monthEntries.filter(e => e.type === "expense");
  if (monthExp.length < 5) { co.hidden = true; return; }
  const candidates = [];
  const biggest = monthExp.reduce((a, b) => (b.amount > a.amount ? b : a));
  candidates.push(`Biggest expense: <b>${esc(biggest.note || catById(biggest.cat).name)}</b> — ${fmt(biggest.amount)}`);
  const peakIdx = perDay.indexOf(Math.max(...perDay));
  candidates.push(`Priciest day: <b>${dayLabel(dateKey(new Date(view.getFullYear(), view.getMonth(), peakIdx + 1)))}</b> at ${fmt(perDay[peakIdx])}`);
  const prev = expensesIn(addMonths(view, -1));
  if (prev.length) {
    let bestCat = null, bestRise = 0;
    for (const c of state.categories) {
      const now = monthExp.filter(e => e.cat === c.id).reduce((s, e) => s + e.amount, 0);
      const was = prev.filter(e => e.cat === c.id).reduce((s, e) => s + e.amount, 0);
      if (was > 0 && now - was > bestRise) { bestRise = now - was; bestCat = { c, now, was }; }
    }
    if (bestCat) candidates.push(`<b>${esc(bestCat.c.name)}</b> is up ${Math.round(((bestCat.now - bestCat.was) / bestCat.was) * 100)}% on ${monthName(addMonths(view, -1)).split(" ")[0]}`);
  }
  co.innerHTML = candidates[(view.getMonth() + view.getFullYear()) % candidates.length];
  co.hidden = false;
}

/* ————— main render ————— */
function render() {
  const monthEntries = state.entries.filter(e => sameMonth(e.date, view));
  const spent = monthEntries.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const income = monthEntries.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const isCurrent = sameMonth(dateKey(new Date()), view);
  $("sampleNote").hidden = !state.entries.some(isSample);

  // hero
  $("monthLabel").textContent = monthName(view);
  $("backToday").hidden = isCurrent;
  $("amountSym").textContent = CURRENCY_SYM[state.currency];
  $("heroTotal").textContent = fmt(spent);
  if (monthEntries.length) {
    const daysElapsed = isCurrent ? new Date().getDate() : daysInMonth(view);
    const bits = [`${monthEntries.length} ${monthEntries.length === 1 ? "entry" : "entries"}`,
      `averaging <b>${fmt(spent / daysElapsed, { maximumFractionDigits: 0 })}</b> a day`];
    if (income > 0) bits.push(`<b>${fmtCompact(income)}</b> income · <b>${fmtCompact(income - spent)}</b> left`);
    const prevSpent = expensesIn(addMonths(view, -1)).reduce((s, e) => s + e.amount, 0);
    if (prevSpent > 0 && spent > 0) {
      const pct = Math.round(((spent - prevSpent) / prevSpent) * 100);
      const prevName = monthName(addMonths(view, -1)).split(" ")[0];
      bits.push(pct <= 0
        ? `<span class="delta-down">↓ ${Math.abs(pct)}% vs ${prevName}</span>`
        : `<span class="delta-up">↑ ${pct}% vs ${prevName}</span>`);
    }
    $("heroSub").innerHTML = bits.join(" · ");
  } else {
    $("heroSub").textContent = "Nothing recorded this month.";
  }

  renderTrends(monthEntries, spent);
  renderFilterChips();
  renderGoals();

  // ledger (filters apply here only)
  const visible = monthEntries.filter(entryMatchesFilter);
  const filtering = filterText || filterCats.size;
  $("clearFilters").hidden = !filtering;
  $("filterCount").textContent = monthEntries.length
    ? (filtering ? `${visible.length} of ${monthEntries.length} entries` : `${monthEntries.length} ${monthEntries.length === 1 ? "entry" : "entries"}`)
    : "";
  const byDay = new Map();
  for (const e of visible) {
    if (!byDay.has(e.date)) byDay.set(e.date, []);
    byDay.get(e.date).push(e);
  }
  const ledger = $("ledgerList");
  if (!monthEntries.length) {
    ledger.innerHTML = `<div class="empty">
      <h3>A clean page</h3>
      <p>Add your first expense above — it lands here, newest first.</p>
      ${state.entries.length === 0 ? '<button id="seedBtn">or load sample data to look around</button>' : ""}
    </div>`;
    const sb = document.getElementById("seedBtn");
    if (sb) sb.addEventListener("click", seedSample);
  } else if (!visible.length) {
    ledger.innerHTML = `<div class="empty"><p>No entries match — <button class="link-btn" id="emptyClear">clear filters</button></p></div>`;
    document.getElementById("emptyClear").addEventListener("click", () => $("clearFilters").click());
  } else {
    const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a));
    ledger.innerHTML = days.map(k => {
      const list = byDay.get(k);
      const dayTotal = list.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      return `<div class="day-head"><span class="card-title">${dayLabel(k)}</span><span class="day-total">${dayTotal ? fmt(dayTotal) : ""}</span></div>`
        + list.map(e => {
          const isInc = e.type === "income";
          const c = isInc ? null : catById(e.cat);
          const label = e.note || (isInc ? "Income" : c.name);
          const meta = isInc ? "Income"
            : [e.note ? c.name : null, e.method ? methodName(e.method) : null].filter(Boolean).join(" · ");
          return `<div class="entry">
            <span class="dot" style="background:${isInc ? "var(--good)" : catColor(e.cat)}"></span>
            <span class="entry-note">${esc(label)}</span>
            ${meta ? `<span class="entry-cat">${esc(meta)}</span>` : ""}
            <span class="entry-amt ${isInc ? "income" : ""}">${isInc ? "+" : ""}${fmt(e.amount)}</span>
            <button class="entry-act edit" data-edit="${e.id}" aria-label="Edit ${esc(label)}, ${fmt(e.amount)}">✎</button>
            <button class="entry-act del" data-del="${e.id}" aria-label="Delete ${esc(label)}, ${fmt(e.amount)}">✕</button>
          </div>`;
        }).join("");
    }).join("");
    ledger.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => deleteEntry(b.dataset.del)));
    ledger.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => startEdit(b.dataset.edit)));
  }

  // breakdown: budget-aware bars, direct labels always visible
  const rows = state.categories
    .map(c => {
      const list = monthEntries.filter(e => e.type === "expense" && e.cat === c.id);
      return { ...c, sum: list.reduce((s, e) => s + e.amount, 0), n: list.length, budget: state.budgets[c.id] };
    })
    .filter(c => c.sum > 0 || c.budget)
    .sort((a, b) => b.sum - a.sum);
  const maxSum = Math.max(...rows.map(r => r.sum), 1);
  $("bdList").innerHTML = rows.length
    ? rows.map(c => {
        const over = c.budget && c.sum > c.budget;
        const width = c.budget ? Math.min(1, c.sum / c.budget) * 100 : (c.sum / maxSum) * 100;
        return `<div class="bd-row" title="${c.n} ${c.n === 1 ? "entry" : "entries"}">
          <div class="bd-top">
            <span class="dot" style="background:${slotVar(c.slot)}"></span>
            <span class="bd-name">${esc(c.name)}</span>
            ${spent ? `<span class="bd-share">${Math.round((c.sum / spent) * 100)}%</span>` : ""}
            <span class="bd-amt">${c.budget ? `<b>${fmt(c.sum)}</b> of ${fmt(c.budget)}` : `<b>${fmt(c.sum)}</b>`}</span>
          </div>
          <div class="bd-track"><div class="bd-bar" style="--c:${slotVar(c.slot)}; width:${width}%"></div></div>
          ${over ? `<div class="bd-over">⚠ over by ${fmt(c.sum - c.budget)}</div>` : ""}
        </div>`;
      }).join("")
    : `<div class="bd-empty">Once you add expenses, this shows where the month went — largest first.</div>`;
}

/* ————— keyboard shortcuts ————— */
document.addEventListener("keydown", e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  const typing = t.matches?.("input, select, textarea, [contenteditable]");
  const dlgOpen = document.querySelector("dialog[open]");
  if (typing || dlgOpen) return;
  switch (e.key) {
    case "n": e.preventDefault(); $("amount").focus(); break;
    case "[": $("prevMonth").click(); break;
    case "]": $("nextMonth").click(); break;
    case "t": view = startOfMonth(new Date()); render(); break;
    case "/": e.preventDefault(); $("searchBox").focus(); break;
    case "p": e.preventDefault(); openCapture(); break;
    case "d": cycleTheme(); break;
    case "?": $("keysDlg").showModal(); break;
  }
});

/* ————— boot ————— */
save();          // persist any v1→v2 migration performed in load()
applyTheme();
postRecurring();
renderChips();
renderMethods();
render();

/* Web Share Target: Android hands a shared SMS to us as ?text=… on start_url.
   Clear it from the URL first so a reload doesn't offer the same entry twice. */
(function handleShare() {
  const q = new URLSearchParams(location.search);
  const shared = [q.get("title"), q.get("text"), q.get("url")].filter(Boolean).join("\n");
  if (!shared) return;
  history.replaceState(null, "", location.pathname);
  openCapture(shared);
})();

if (corruptBackupKey) {
  alert(
    "Your saved data could not be read, so this session started with a clean page.\n\n" +
    "The unreadable copy has NOT been deleted — it is kept under the storage key:\n" +
    corruptBackupKey + "\n\n" +
    "Before adding new entries, you may want to recover it from this browser's " +
    "developer tools (Application → Local Storage)."
  );
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* offline install is progressive */ });
}
