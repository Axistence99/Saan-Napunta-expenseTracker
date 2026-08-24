/**
 * Saan Napunta? — expense tracker
 *
 * Rendering pipeline:
 *   storage (async)  ->  aggregate cache  ->  render
 *
 * - Skeleton shaders cover any frame where aggregates are not cached yet.
 * - Mutations render optimistically and roll back if the write fails.
 * - Aggregates are memoised per month and invalidated by a data version counter.
 */

const ENTRIES_KEY = "saan-napunta-entries";
const CONFIG_KEY = "saan-napunta-config";
/**
 * Locked to the Philippine peso for now. The config field and every formatting path stay
 * currency-aware, so enabling more later means extending this list and restoring the
 * picker — no changes to storage, sync or the aggregate cache.
 */
const CURRENCY = "\u20b1";
const CURRENCIES = [CURRENCY];

const DEFAULT_CONFIG = {
  firstName: "",
  lastName: "",
  birthdate: "",
  province: "",
  sexAtBirth: "",
  occupation: "",
  name: "", // legacy display name, kept in sync with firstName
  budget: 0,          // legacy single budget, retained for storage compatibility
  budgetPeriod: "month",
  budgetDefaults: { day: 0, week: 0, month: 0, year: 0 }, // independent defaults for each scope
  budgets: {}, // exact-period budgets keyed by range, e.g. "m:2026-08" or "d:2026-08-23"
  currency: CURRENCY,
  weekStart: 1,
  onboarded: false
};

const PERIODS = {
  day: { label: "Daily", noun: "today", window: "Today", perDay: 1 },
  week: { label: "Weekly", noun: "this week", window: "This week", perDay: 7 },
  month: { label: "Monthly", noun: "this month", window: "This month", perDay: 30.44 },
  year: { label: "Yearly", noun: "this year", window: "This year", perDay: 365.25 }
};
const WRITE_LATENCY_MS = 90;
const CACHE_LIMIT = 24;

/** 24x24 stroke icon paths, rendered with currentColor. */
const ICONS = {
  food: '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17.5 3c-1.6 1.4-2.5 3.4-2.5 5.5 0 1.6.7 2.5 2.5 2.5V3ZM17.5 11v10"/>',
  transport: '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9H4V6ZM4 15h16v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2ZM4 9h16M7.5 18v2M16.5 18v2"/>',
  bills: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  load: '<path d="M4 20v-3M9 20v-7M14 20v-11M19 20V4"/>',
  groceries: '<path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L21 8H6M10.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM17.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>',
  school: '<path d="M12 4 2 9l10 5 10-5-10-5ZM6 12v4c0 1.6 2.7 3 6 3s6-1.4 6-3v-4"/>',
  health: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8v8M8 12h8"/>',
  fun: '<path d="M6 8h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5.2 2L15 14H9l-1.8 1A3 3 0 0 1 2 13v-1a4 4 0 0 1 4-4ZM7 11v3M5.5 12.5h3M16 11h.01M18 13h.01"/>',
  other: '<path d="M20.6 13.4 13 21a1.4 1.4 0 0 1-2 0l-8-8V4h9l8.6 8.6a1.4 1.4 0 0 1 0 .8ZM7.5 7.5h.01"/>',
  settings: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="m19.4 14.6.9.5a1.5 1.5 0 0 1 .6 2l-1 1.7a1.5 1.5 0 0 1-2 .6l-.9-.5a7.6 7.6 0 0 1-1.8 1v1a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 10.2 21v-1a7.6 7.6 0 0 1-1.8-1l-.9.5a1.5 1.5 0 0 1-2-.6l-1-1.7a1.5 1.5 0 0 1 .6-2l.9-.5a7.6 7.6 0 0 1 0-2.1l-.9-.5a1.5 1.5 0 0 1-.6-2l1-1.7a1.5 1.5 0 0 1 2-.6l.9.5a7.6 7.6 0 0 1 1.8-1V3a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 15.3 3v1a7.6 7.6 0 0 1 1.8 1l.9-.5a1.5 1.5 0 0 1 2 .6l1 1.7a1.5 1.5 0 0 1-.6 2l-.9.5a7.6 7.6 0 0 1 0 2.1Z"/>'
};

/** Renders an inline SVG for a named icon. */
function icon(name, size = 20) {
  const paths = ICONS[name] || ICONS.other;
  return `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

const CATEGORIES = [
  { id: "food", label: "Food" },
  { id: "transport", label: "Transport" },
  { id: "bills", label: "Bills" },
  { id: "load", label: "Load / Data" },
  { id: "groceries", label: "Groceries" },
  { id: "school", label: "School" },
  { id: "health", label: "Health" },
  { id: "fun", label: "Fun" },
  { id: "other", label: "Other" }
];


/**
 * All 82 Philippine provinces grouped by their 18 administrative regions
 * (PSGC, after the 2024 creation of the Negros Island Region), plus NCR, which is
 * not a province but is where a large share of users live.
 */
const PROVINCES = [
  ["National Capital Region", ["Metro Manila"]],
  ["Cordillera Administrative Region", ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province"]],
  ["Region I — Ilocos", ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"]],
  ["Region II — Cagayan Valley", ["Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino"]],
  ["Region III — Central Luzon", ["Aurora", "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales"]],
  ["Region IV-A — Calabarzon", ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"]],
  ["Mimaropa", ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"]],
  ["Region V — Bicol", ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"]],
  ["Region VI — Western Visayas", ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo"]],
  ["Negros Island Region", ["Negros Occidental", "Negros Oriental", "Siquijor"]],
  ["Region VII — Central Visayas", ["Bohol", "Cebu"]],
  ["Region VIII — Eastern Visayas", ["Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte"]],
  ["Region IX — Zamboanga Peninsula", ["Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"]],
  ["Region X — Northern Mindanao", ["Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental"]],
  ["Region XI — Davao", ["Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental"]],
  ["Region XII — Soccsksargen", ["Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat"]],
  ["Region XIII — Caraga", ["Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur"]],
  ["BARMM", ["Basilan", "Lanao del Sur", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi"]]
];

/** Insertion order drives the dropdown order in both the profile step and Settings. */
const OCCUPATIONS = {
  student: "Student",
  employee: "Employee",
  entrepreneur: "Entrepreneur",
  undisclosed: "Prefer not to say",
  na: "N/A"
};
const PROVINCE_SET = new Set(PROVINCES.flatMap(([, list]) => list));
const SEXES = { female: "Female", male: "Male", undisclosed: "Prefer not to say" };

/** Fills a <select> from an id-to-label map, with a leading placeholder. */
function fillOptions(select, map, selected = "", placeholder = "Select") {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  Object.entries(map).forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = selected;
}

/** Fills a <select> with optgroup-ed provinces. */
function fillProvinces(select, selected = "") {
  select.innerHTML = '<option value="">Select your province</option>';
  PROVINCES.forEach(([region, list]) => {
    const group = document.createElement("optgroup");
    group.label = region;
    list.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      group.appendChild(option);
    });
    select.appendChild(group);
  });
  select.value = selected;
}

const $ = (id) => document.getElementById(id);
const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

let config = { ...DEFAULT_CONFIG };
let entries = [];
let selectedCategory = "food";
let draftPhotos = [];
let editingId = null;
let view = { scope: "month", anchor: todayKey() };
let ready = false;

/* ============================================================
   Storage — promise based so the UI never assumes it is instant
   ============================================================ */

const storage = {
  readConfig() {
    try {
      const raw = { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}") };
      return sanitiseConfig(raw);
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  },

  readEntries() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ENTRIES_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((e) => e && e.id && (e.deleted || Number.isFinite(Number(e.amount))))
        .map(normaliseEntry)
        .filter((e) => e.deleted || /^\d{4}-\d{2}-\d{2}$/.test(e.date));
    } catch {
      return [];
    }
  },

  writeEntries(list) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          localStorage.setItem(ENTRIES_KEY, JSON.stringify(list.map(stripRuntimeFlags)));
          resolve();
        } catch (error) {
          reject(error);
        }
      }, WRITE_LATENCY_MS);
    });
  },

  writeConfig(next) {
    return new Promise((resolve, reject) => {
      try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
};

/** Clamps independent daily, weekly, monthly and yearly default budgets. */
function sanitiseDefaults(raw) {
  const source = raw.budgetDefaults && typeof raw.budgetDefaults === "object" ? raw.budgetDefaults : {};
  const clean = { day: 0, week: 0, month: 0, year: 0 };
  SCOPES.forEach((scope) => {
    clean[scope] = clampNumber(source[scope], 0, LIMITS.maxBudget) ?? 0;
  });

  const legacy = clampNumber(raw.budget, 0, LIMITS.maxBudget) ?? 0;
  const legacyScope = PERIODS[raw.budgetPeriod] ? raw.budgetPeriod : "month";
  if (legacy > 0 && !SCOPES.some((scope) => clean[scope] > 0)) clean[legacyScope] = legacy;
  return clean;
}

/** Keeps only well-formed override keys with in-range amounts. */
function sanitiseBudgets(raw) {
  if (!raw || typeof raw !== "object") return {};
  const clean = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (!/^[dwmy]:[\d-]+$/.test(key)) return;
    const amount = clampNumber(value, 0, LIMITS.maxBudget);
    if (amount !== null) clean[key] = amount;
  });
  return clean;
}

/** Anything stored can be edited by hand or arrive from another device; re-check it. */
function sanitiseConfig(raw) {
  const firstName = cleanText(raw.firstName || raw.name, LIMITS.name);
  return {
    ...raw,
    firstName: validateName(firstName, "x") ? "" : firstName,
    lastName: (() => {
      const value = cleanText(raw.lastName, LIMITS.name);
      return validateName(value, "x") ? "" : value;
    })(),
    name: validateName(firstName, "x") ? "" : firstName,
    birthdate: validateBirthdate(raw.birthdate) ? "" : raw.birthdate || "",
    province: PROVINCE_SET.has(raw.province) ? raw.province : "",
    sexAtBirth: SEXES[raw.sexAtBirth] ? raw.sexAtBirth : "",
    occupation: OCCUPATIONS[raw.occupation] ? raw.occupation : "",
    currency: CURRENCY,
    budget: clampNumber(raw.budget, 0, LIMITS.maxBudget) ?? 0,
    budgetPeriod: PERIODS[raw.budgetPeriod] ? raw.budgetPeriod : "month",
    budgetDefaults: sanitiseDefaults(raw),
    budgets: sanitiseBudgets(raw.budgets),
    weekStart: Number(raw.weekStart) === 0 ? 0 : 1,
    onboarded: Boolean(raw.onboarded)
  };
}

function stripRuntimeFlags({ pending, failed, ...rest }) {
  return rest;
}

/** Older records predate sync; give them an updatedAt so the merge can order them. */
function normaliseEntry(entry) {
  if (entry.deleted) {
    return { ...entry, updatedAt: Number(entry.updatedAt || entry.created || 0) };
  }
  return {
    ...entry,
    amount: clampNumber(entry.amount, 0, LIMITS.maxAmount) ?? 0,
    category: catById(entry.category).id,
    merchant: cleanText(entry.merchant, LIMITS.merchant),
    item: cleanText(entry.item, LIMITS.item),
    note: cleanText(entry.note, LIMITS.note),
    photoCount: clampNumber(entry.photoCount, 0, MAX_PHOTOS) ?? 0,
    updatedAt: Number(entry.updatedAt || entry.created || 0)
  };
}

/** Tombstones stay in storage so deletions propagate to other devices. */
function tombstone(entry) {
  return { id: entry.id, created: entry.created, deleted: true, updatedAt: Date.now() };
}

/** Entries excluding tombstones. */
function liveEntries() {
  return entries.filter((e) => !e.deleted);
}


/* ============================================================
   Input limits and validation
   ============================================================ */

const LIMITS = {
  minAge: 13,
  maxAge: 120,
  maxAmount: 10000000,     // 10M in one expense
  maxBudget: 100000000,    // 100M for a yearly budget
  entryPastYears: 10,      // how far back an expense may be dated
  maxPhotoBytes: 12 * 1024 * 1024,
  name: 32,
  item: 60,
  note: 200,
  merchant: 40
};

/** Letters (any script), marks, spaces and the punctuation real names use. */
const NAME_PATTERN = /^[\p{L}][\p{L}\p{M}'.\-\s]*$/u;

function shiftYears(years) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return dayKey(date);
}

/** Collapses whitespace and strips control characters. */
function cleanText(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, number));
}

/** Whole years between a date string and today; null when unparseable. */
function ageFrom(isoDay) {
  if (!isoDay) return null;
  const [year, month, day] = isoDay.split("-").map(Number);
  if (!year || !month || !day) return null;
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - year;
  const beforeBirthday =
    now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

function validateBirthdate(value) {
  if (!value) return null; // optional
  if (value > todayKey()) return "Birthdate cannot be in the future.";
  const age = ageFrom(value);
  if (age === null) return "That date does not look right.";
  if (age > LIMITS.maxAge) return `Please check the year — that is over ${LIMITS.maxAge} years ago.`;
  if (age < LIMITS.minAge) return `You need to be at least ${LIMITS.minAge} to use this app.`;
  return null;
}

function validateName(value, label) {
  if (!value) return null;
  if (value.length > LIMITS.name) return `${label} is too long.`;
  if (!NAME_PATTERN.test(value)) return `${label} can only contain letters, spaces, hyphens and apostrophes.`;
  return null;
}

function validateEntryDate(value) {
  if (!value) return "Pick a date.";
  if (value > todayKey()) return "You cannot log an expense in the future.";
  if (value < shiftYears(LIMITS.entryPastYears)) {
    return `Expenses older than ${LIMITS.entryPastYears} years cannot be added.`;
  }
  return null;
}

function validateAmount(raw, { max = LIMITS.maxAmount, allowZero = false } = {}) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return { error: "Enter a number." };
  if (value < 0) return { error: "Amount cannot be negative." };
  if (!allowZero && value <= 0) return { error: "Enter an amount greater than zero." };
  if (value > max) return { error: `That is over the ${money(max)} limit.` };
  return { value: Math.round(value * 100) / 100 };
}

/** Marks a field invalid and shows the reason underneath it. */
function setFieldError(field, message) {
  const node = typeof field === "string" ? $(field) : field;
  if (!node) return;
  node.classList.toggle("invalid", Boolean(message));
  node.setAttribute("aria-invalid", String(Boolean(message)));

  const holder = node.closest("label") || node.parentElement;
  let hint = holder?.querySelector(":scope > .field-error");
  if (message) {
    if (!hint) {
      hint = document.createElement("span");
      hint.className = "field-error";
      hint.setAttribute("role", "alert");
      holder.appendChild(hint);
    }
    hint.textContent = message;
  } else if (hint) {
    hint.remove();
  }
}

function clearFieldErrors(scope) {
  scope.querySelectorAll(".field-error").forEach((node) => node.remove());
  scope.querySelectorAll(".invalid").forEach((node) => {
    node.classList.remove("invalid");
    node.removeAttribute("aria-invalid");
  });
}

/** Applies min/max attributes so the native pickers cannot offer bad values. */
function applyInputLimits() {
  const birthdate = $("birthdate");
  birthdate.max = shiftYears(LIMITS.minAge);
  birthdate.min = shiftYears(LIMITS.maxAge);
  const profileBirthdate = $("birthdateProfileInput");
  profileBirthdate.max = shiftYears(LIMITS.minAge);
  profileBirthdate.min = shiftYears(LIMITS.maxAge);

  const entryDate = $("dateInput");
  entryDate.max = todayKey();
  entryDate.min = shiftYears(LIMITS.entryPastYears);

  $("amountInput").max = String(LIMITS.maxAmount);
  $("onboardBudget").max = String(LIMITS.maxBudget);
  $("rangeBudgetInput").max = String(LIMITS.maxBudget);
  Object.values(PROFILE_BUDGET_FIELDS).forEach((id) => {
    $(id).max = String(LIMITS.maxBudget);
  });
  $("itemInput").maxLength = LIMITS.item;
  $("noteInput").maxLength = LIMITS.note;
  [$("firstName"), $("lastName"), $("firstNameInput"), $("lastNameInput")].forEach((node) => {
    node.maxLength = LIMITS.name;
  });
}

/* ============================================================
   Media store
   Photos live in their own bucket keyed by entry id. They are excluded from the ledger
   and therefore from sync: a receipt photo would exceed both the localStorage quota and
   a Firestore document limit.
   ============================================================ */

const MEDIA_KEY = "saan-napunta-media";
const MAX_PHOTOS = 3;
const MAX_EDGE_PX = 1200;
const JPEG_QUALITY = 0.72;

/** Only inline images are ever accepted, whatever storage happens to contain. */
function isPhoto(src) {
  return typeof src === "string" && src.startsWith("data:image/");
}

const media = {
  all() {
    try {
      return JSON.parse(localStorage.getItem(MEDIA_KEY) || "{}");
    } catch {
      return {};
    }
  },
  get(id) {
    return (this.all()[id] || []).filter(isPhoto);
  },
  set(id, photos) {
    photos = photos.filter(isPhoto);
    const bucket = this.all();
    if (photos.length) bucket[id] = photos;
    else delete bucket[id];
    try {
      localStorage.setItem(MEDIA_KEY, JSON.stringify(bucket));
      return true;
    } catch {
      return false;
    }
  },
  remove(id) {
    this.set(id, []);
  }
};

/** Downscales and re-encodes a picked image so a receipt costs about 100 KB, not 4 MB. */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("decode failed"));
      image.onload = () => {
        const scale = Math.min(1, MAX_EDGE_PX / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   Budget periods
   ============================================================ */

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* ============================================================
   View ranges — day / week / month / year
   ============================================================ */

const SCOPES = ["day", "week", "month", "year"];
const PROFILE_BUDGET_FIELDS = {
  day: "defaultBudgetDay",
  week: "defaultBudgetWeek",
  month: "defaultBudgetMonth",
  year: "defaultBudgetYear"
};
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function parseDay(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date) {
  const weekStart = Number(config.weekStart) === 0 ? 0 : 1;
  const shift = (date.getDay() - weekStart + 7) % 7;
  return addDays(date, -shift);
}

/**
 * Describes the window a given scope covers around an anchor day.
 * `key` doubles as the aggregate-cache key and the budget-override key.
 */
function rangeFor(scope, anchorDay) {
  const anchor = parseDay(anchorDay);
  let start;
  let end;
  let key;
  let label;

  if (scope === "day") {
    start = anchor;
    end = anchor;
    key = `d:${dayKey(anchor)}`;
    label = prettyDay(dayKey(anchor));
  } else if (scope === "week") {
    start = startOfWeek(anchor);
    end = addDays(start, 6);
    key = `w:${dayKey(start)}`;
    const sameMonth = start.getMonth() === end.getMonth();
    label = sameMonth
      ? `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
      : `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
  } else if (scope === "year") {
    start = new Date(anchor.getFullYear(), 0, 1);
    end = new Date(anchor.getFullYear(), 11, 31);
    key = `y:${anchor.getFullYear()}`;
    label = String(anchor.getFullYear());
  } else {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    key = `m:${monthKey(anchor)}`;
    label = `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }

  const startKey = dayKey(start);
  const endKey = dayKey(end);
  const today = todayKey();
  const totalDays = Math.round((end - start) / 86400000) + 1;
  const isCurrent = today >= startKey && today <= endKey;
  const elapsed = isCurrent
    ? Math.round((parseDay(today) - start) / 86400000) + 1
    : today > endKey
      ? totalDays
      : 0;

  return {
    scope,
    key,
    start: startKey,
    end: endKey,
    label,
    totalDays,
    elapsed: Math.max(1, elapsed),
    daysRemaining: Math.max(1, totalDays - Math.max(1, elapsed) + 1),
    isCurrent,
    isFuture: startKey > today
  };
}

/** Steps the anchor one whole period backwards or forwards. */
function shiftAnchor(scope, anchorDay, delta) {
  const anchor = parseDay(anchorDay);
  if (scope === "day") return dayKey(addDays(anchor, delta));
  if (scope === "week") return dayKey(addDays(anchor, delta * 7));
  if (scope === "year") return dayKey(new Date(anchor.getFullYear() + delta, anchor.getMonth(), 1));
  const shifted = new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
  return dayKey(shifted);
}

/** Inclusive [start, end] day keys for the active budget window containing `date`. */
function periodWindow(period = config.budgetPeriod, date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);

  if (period === "week") {
    const weekStart = Number(config.weekStart) === 0 ? 0 : 1;
    const shift = (start.getDay() - weekStart + 7) % 7;
    start.setDate(start.getDate() - shift);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  } else if (period === "month") {
    start.setDate(1);
    end.setTime(new Date(date.getFullYear(), date.getMonth() + 1, 0).getTime());
  } else if (period === "year") {
    start.setMonth(0, 1);
    end.setTime(new Date(date.getFullYear(), 11, 31).getTime());
  }

  const totalDays = Math.round((end - start) / 86400000) + 1;
  const elapsed = Math.min(totalDays, Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000) + 1);
  // daysRemaining counts today, so "1 day left" on the final day reads correctly.
  const daysRemaining = Math.max(1, totalDays - elapsed + 1);
  return {
    start: dayKey(start),
    end: dayKey(end),
    totalDays,
    elapsed,
    daysRemaining,
    isLastDay: daysRemaining === 1
  };
}

/** Spend inside the active budget window plus the values the meter needs. */
function periodStats() {
  const period = config.budgetPeriod || "month";
  const meta = PERIODS[period] || PERIODS.month;
  const win = periodWindow(period);
  const list = liveEntries().filter((e) => e.date >= win.start && e.date <= win.end);
  const total = list.reduce((acc, e) => acc + Number(e.amount), 0);
  const budget = Number(config.budget) || 0;

  return {
    period,
    meta,
    window: win,
    list,
    total,
    budget,
    left: budget - total,
    ratio: budget > 0 ? Math.min(1, total / budget) : 0,
    safePerDay: budget > 0 ? (budget - total) / win.daysRemaining : 0,
    today: liveEntries().filter((e) => e.date === todayKey()).reduce((a, e) => a + Number(e.amount), 0)
  };
}

/**
 * Resolves an exact-period custom budget first, then the default for that same scope.
 * Defaults never convert across scopes: daily cannot become weekly, monthly or yearly.
 */
function budgetForRange(range) {
  const custom = Number((config.budgets || {})[range.key]) || 0;
  if (custom > 0) return { amount: custom, source: "custom" };
  const fallback = Number((config.budgetDefaults || {})[range.scope]) || 0;
  return fallback > 0
    ? { amount: fallback, source: "default" }
    : { amount: 0, source: "none" };
}

async function setRangeBudget(rangeKey, amount) {
  const budgets = { ...(config.budgets || {}) };
  if (amount === null) delete budgets[rangeKey];
  else budgets[rangeKey] = amount;
  config = { ...config, budgets };
  invalidate();
  render({ allowSkeleton: false });
  await storage.writeConfig(config);
}

/* ============================================================
   Aggregate cache
   ============================================================ */

let dataVersion = 0;
const aggregateCache = new Map();
const cacheStats = { hits: 0, misses: 0 };

function invalidate() {
  dataVersion += 1;
  aggregateCache.clear();
}

/** Memoised per (range key, dataVersion). Ranges are day, week, month or year. */
function aggregatesFor(range) {
  const cacheKey = `${range.key}|${dataVersion}`;
  if (aggregateCache.has(cacheKey)) {
    cacheStats.hits += 1;
    const cached = aggregateCache.get(cacheKey);
    aggregateCache.delete(cacheKey);
    aggregateCache.set(cacheKey, cached);
    return cached;
  }

  cacheStats.misses += 1;
  const list = liveEntries()
    .filter((e) => e.date >= range.start && e.date <= range.end)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.created - a.created));

  const total = list.reduce((acc, e) => acc + Number(e.amount), 0);
  const byCategory = new Map();
  const byDay = new Map();
  const byMonth = new Map();

  list.forEach((entry) => {
    const amount = Number(entry.amount);
    const cat = byCategory.get(entry.category) || { total: 0, count: 0 };
    byCategory.set(entry.category, { total: cat.total + amount, count: cat.count + 1 });
    byDay.set(entry.date, (byDay.get(entry.date) || 0) + amount);
    const m = entry.date.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) || 0) + amount);
  });

  const value = {
    range,
    list,
    total,
    byCategory: [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total),
    byDay,
    byMonth,
    today: byDay.get(todayKey()) || 0,
    dailyAverage: total / Math.max(1, range.isCurrent ? range.elapsed : range.totalDays),
    computedAt: Date.now()
  };

  aggregateCache.set(cacheKey, value);
  if (aggregateCache.size > CACHE_LIMIT) {
    aggregateCache.delete(aggregateCache.keys().next().value);
  }
  return value;
}

function isCached(range) {
  return aggregateCache.has(`${range.key}|${dataVersion}`);
}

/** Warms the adjacent periods while the browser is idle so stepping through is instant. */
function prefetchNeighbours(range) {
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  idle(() => {
    [-1, 1].forEach((delta) => {
      aggregatesFor(rangeFor(range.scope, shiftAnchor(range.scope, view.anchor, delta)));
    });
  });
}

/* ============================================================
   Helpers
   ============================================================ */

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function todayKey() {
  const now = new Date();
  return `${monthKey(now)}-${String(now.getDate()).padStart(2, "0")}`;
}

function money(value) {
  return config.currency + Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function prettyMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

function prettyDay(key) {
  const [year, month, day] = key.split("-").map(Number);
  if (key === todayKey()) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === `${monthKey(yesterday)}-${String(yesterday.getDate()).padStart(2, "0")}`) return "Yesterday";
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function announce(message) {
  $("status").textContent = message;
}

function toast(message, tone = "info") {
  document.querySelector(".toast")?.remove();
  const node = document.createElement("p");
  node.className = `toast ${tone}`;
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2400);
  announce(message);
}

/* ============================================================
   Tooltips — one floating node, delegated, keyboard accessible
   ============================================================ */

const tooltip = (() => {
  const node = document.createElement("div");
  node.className = "tooltip";
  node.setAttribute("role", "tooltip");
  node.id = "app-tooltip";
  node.hidden = true;
  document.body.appendChild(node);

  let anchor = null;

  function show(target) {
    const text = target.getAttribute("data-tip");
    if (!text) return;
    anchor = target;
    node.textContent = text;
    node.hidden = false;
    target.setAttribute("aria-describedby", node.id);

    const rect = target.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    const margin = 10;
    let left = rect.left + rect.width / 2 - box.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - box.width - margin));
    let top = rect.top - box.height - 8;
    node.classList.toggle("below", top < margin);
    if (top < margin) top = rect.bottom + 8;

    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(top)}px`;
  }

  function hide() {
    node.hidden = true;
    anchor?.removeAttribute("aria-describedby");
    anchor = null;
  }

  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest("[data-tip]");
    if (target) show(target);
    else if (anchor && !anchor.contains(event.target)) hide();
  });
  document.addEventListener("focusin", (event) => {
    const target = event.target.closest("[data-tip]");
    if (target) show(target);
  });
  document.addEventListener("focusout", hide);
  document.addEventListener("pointerdown", (event) => {
    // Touch input has no hover state, so a tap reveals the tooltip briefly.
    const target = event.target.closest("[data-tip]");
    if (target && event.pointerType === "touch") {
      show(target);
      setTimeout(hide, 2200);
    } else {
      hide();
    }
  });
  window.addEventListener("scroll", hide, { passive: true });

  return { hide };
})();

/* ============================================================
   Skeleton shaders
   ============================================================ */

function bar(width, height = 14, radius = 8) {
  return `<span class="sk" style="width:${width};height:${height}px;border-radius:${radius}px"></span>`;
}

function paintSkeleton() {
  $("monthTotal").innerHTML = bar("62%", 40, 12);
  $("budgetLeft").innerHTML = bar("120px", 11);
  $("budgetCap").innerHTML = bar("90px", 11);
  $("budgetFill").style.width = "0%";
  ["todayTotal", "entryCount"].forEach((id) => {
    $(id).innerHTML = bar("70%", 16);
  });

  $("breakdownEmpty").hidden = true;
  $("breakdown").innerHTML = [72, 54, 38]
    .map(
      (w) => `<li class="sk-row">
        <span class="sk sk-dot"></span>
        <span class="cat-name">${bar("46%", 12)}${bar(`${w}%`, 6, 3)}</span>
        <span class="value">${bar("64px", 12)}</span>
      </li>`
    )
    .join("");

  $("entriesEmpty").hidden = true;
  $("entries").innerHTML = [1, 2, 3, 4]
    .map(
      () => `<li class="sk-row entry">
        <span class="sk sk-dot"></span>
        <span class="meta">${bar("58%", 13)}${bar("38%", 10)}</span>
        <span class="value">${bar("58px", 13)}</span>
      </li>`
    )
    .join("");
}

/* ============================================================
   Rendering
   ============================================================ */

function renderRangeNav(range) {
  document.querySelectorAll("#scopeTabs button").forEach((tab) => {
    const active = tab.dataset.scope === view.scope;
    tab.setAttribute("aria-selected", String(active));
    tab.classList.toggle("on", active);
  });

  $("monthLabel").textContent = range.isCurrent
    ? { day: "Today", week: "This week", month: "This month", year: "This year" }[range.scope]
    : range.label;
  $("monthLabel").setAttribute("data-tip", `${range.label} · ${range.start} to ${range.end}`);

  // Never navigate into a period that has not started yet.
  const nextRange = rangeFor(range.scope, shiftAnchor(range.scope, view.anchor, 1));
  $("rangeNext").disabled = nextRange.isFuture;
  $("rangeToday").hidden = range.isCurrent;
}

function renderSummary(agg) {
  const greeting = $("greeting");
  if (greeting) {
    const who = config.firstName || config.name || "";
    greeting.innerHTML = who ? `Hi, <b>${escapeHtml(who)}</b>` : "";
    greeting.hidden = !who;
    if (who) {
      greeting.setAttribute(
        "data-tip",
        [[config.firstName, config.lastName].filter(Boolean).join(" "), config.province,
          OCCUPATIONS[config.occupation]].filter(Boolean).join(" · ") + " — edit in Profile"
      );
    }
  }

  const range = agg.range;
  renderRangeNav(range);

  $("monthTotal").textContent = money(agg.total);
  $("monthTotal").setAttribute(
    "data-tip",
    `${agg.list.length} ${agg.list.length === 1 ? "entry" : "entries"} in ${range.label} · cache ${cacheStats.hits} hits / ${cacheStats.misses} recomputes`
  );
  $("rangeCount").textContent = agg.list.length
    ? `${agg.list.length} in ${range.label}`
    : "";

  $("todayTotal").textContent = money(agg.today);
  $("entryCount").textContent = String(agg.list.length);
  $("todayTotal").parentElement.setAttribute("data-tip", `Spent so far on ${prettyDay(todayKey())}`);
  $("entryCount").parentElement.setAttribute("data-tip", `Expenses recorded in ${range.label}`);

  const { amount: budget, source } = budgetForRange(range);
  const fill = $("budgetFill");
  const track = fill.parentElement;
  const meter = $("budgetMeter");
  const scopeWord = { day: "today", week: "this week", month: "this month", year: "this year" }[range.scope];
  const scopeLabel = PERIODS[range.scope].label.toLowerCase();
  const defaultAmount = Number((config.budgetDefaults || {})[range.scope]) || 0;
  const indicator = $("scopeBudgetIndicator");
  indicator.classList.toggle("missing", defaultAmount <= 0);
  indicator.classList.toggle("set", defaultAmount > 0);
  indicator.textContent = defaultAmount > 0
    ? `Default ${scopeLabel} budget: ${money(defaultAmount)}`
    : `No default ${scopeLabel} budget — set one in Profile`;

  $("editRangeBudget").textContent = source === "custom"
    ? `Custom budget for ${range.label} — change`
    : `Set a custom budget for ${range.label}`;

  if (budget <= 0) {
    fill.style.width = "0%";
    track.classList.remove("over");
    $("budgetLeft").textContent = "No budget set";
    $("budgetCap").textContent = "No custom or default budget";
    meter.setAttribute("data-tip", `No budget applies to ${range.label}`);
    return;
  }

  const ratio = Math.min(1, agg.total / budget);
  fill.style.width = `${ratio * 100}%`;
  track.classList.toggle("over", agg.total > budget);

  const left = budget - agg.total;
  $("budgetLeft").innerHTML = left >= 0
    ? `${money(left)} left ${range.isCurrent ? scopeWord : ""}`.trim()
    : `<span class="over">${money(Math.abs(left))} over budget</span>`;
  $("budgetCap").textContent = `${source === "custom" ? "Custom" : "Default"} ${money(budget)}`;

  const perDay = left / range.daysRemaining;
  meter.setAttribute(
    "data-tip",
    left >= 0
      ? `${Math.round((agg.total / budget) * 100)}% used · ${money(agg.total)} of ${money(budget)} for ${range.label}` +
        (range.isCurrent && range.scope !== "day"
          ? range.daysRemaining === 1
            ? ` · last day · ${money(left)} to spend`
            : ` · ${range.daysRemaining} days left · ${money(Math.max(0, perDay))}/day to stay under`
          : "") +
        (source === "custom" ? " · custom for this exact period" : ` · default for each ${range.scope}`)
      : `${money(Math.abs(left))} over the ${money(budget)} budget for ${range.label}`
  );
}

function renderBreakdown(agg) {
  const target = $("breakdown");
  const scopeName = { day: "Day", week: "Week", month: "Month", year: "Year" }[agg.range.scope];
  $("categoryRangeLabel").textContent = `${scopeName} · ${agg.range.label}`;
  $("breakdownEmpty").hidden = agg.byCategory.length > 0;
  $("breakdownEmpty").textContent = `No spending recorded for ${agg.range.label}.`;
  target.innerHTML = agg.byCategory
    .map(([id, stat]) => {
      const meta = catById(id);
      const share = agg.total ? Math.round((stat.total / agg.total) * 100) : 0;
      const tip = `${stat.count} ${stat.count === 1 ? "entry" : "entries"} · ${money(stat.total / stat.count)} average · ${share}% of ${agg.range.label}`;
      return `<li data-tip="${escapeHtml(tip)}" tabindex="0">
        <span class="glyph">${icon(meta.id)}</span>
        <span class="cat-name">
          <b>${meta.label}</b>
          <span class="track"><i style="width:${share}%"></i></span>
        </span>
        <span class="value">${money(stat.total)}<small>${share}%</small></span>
      </li>`;
    })
    .join("");
}

const PHOTO_ICON =
  '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.2"/>' +
  '<path d="M8 6l1.5-2h5L16 6"/></svg>';

function renderEntries(agg) {
  const target = $("entries");
  $("entriesEmpty").hidden = agg.list.length > 0;
  $("entriesEmpty").textContent = agg.range.isCurrent
    ? "Tap + to record your first expense."
    : `No expenses recorded in ${agg.range.label}.`;
  target.innerHTML = "";

  const groupByMonth = agg.range.scope === "year";
  let currentGroup = null;
  agg.list.forEach((entry) => {
    const groupKey = groupByMonth ? entry.date.slice(0, 7) : entry.date;
    if (groupKey !== currentGroup) {
      currentGroup = groupKey;
      const subtotal = groupByMonth ? agg.byMonth.get(groupKey) : agg.byDay.get(groupKey);
      const divider = document.createElement("li");
      divider.className = "day-divider";
      divider.innerHTML =
        `<span>${groupByMonth ? prettyMonth(groupKey) : prettyDay(groupKey)}</span>` +
        `<span>${money(subtotal || 0)}</span>`;
      target.appendChild(divider);
    }

    const meta = catById(entry.category);
    const li = document.createElement("li");
    li.className = entry.pending ? "row pending" : entry.failed ? "row failed" : "row";

    const title = entry.item || entry.merchant || meta.label;
    const subtitle = [entry.item && entry.merchant ? entry.merchant : "", entry.note]
      .filter(Boolean)
      .join(" · ") || meta.label;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "data-tip",
      entry.pending
        ? "Saving to this device…"
        : [prettyDay(entry.date), meta.label, entry.merchant, entry.note]
            .filter(Boolean)
            .join(" · ") + " — tap to view"
    );
    button.innerHTML = `
      <span class="glyph">${icon(meta.id)}</span>
      <span class="meta">
        <b>${escapeHtml(title)}</b>
        <span>${entry.pending ? "Saving…" : escapeHtml(subtitle)}</span>
      </span>
      <span class="amount">${money(entry.amount)}${
        entry.photoCount ? `<small class="photo-badge">${PHOTO_ICON}${entry.photoCount}</small>` : ""
      }</span>`;
    button.addEventListener("click", () => openDetailSheet(entry.id));
    li.appendChild(button);
    target.appendChild(li);
  });
}

/** Single entry point. Shows skeletons for any month whose aggregates are cold. */
function render({ allowSkeleton = true } = {}) {
  const range = rangeFor(view.scope, view.anchor);

  if (!ready || (allowSkeleton && !isCached(range))) {
    paintSkeleton();
    renderRangeNav(range);
    if (ready) requestAnimationFrame(() => paint(aggregatesFor(range)));
    return;
  }

  paint(aggregatesFor(range));
}

function paint(agg) {
  renderSummary(agg);
  renderBreakdown(agg);
  renderEntries(agg);
  syncRangeBudgetField(agg.range);
  $("amountSymbol").textContent = config.currency;
  $("weekStartSelect").value = String(config.weekStart);
  $("firstNameInput").value = config.firstName || config.name || "";
  $("lastNameInput").value = config.lastName || "";
  if (!$("provinceInput").options.length) fillProvinces($("provinceInput"));
  $("provinceInput").value = config.province || "";
  if (!$("occupationInput").options.length) fillOptions($("occupationInput"), OCCUPATIONS);
  $("occupationInput").value = config.occupation || "";
  $("birthdateProfileInput").value = config.birthdate || "";
  $("sexAtBirthInput").value = config.sexAtBirth || "";
  SCOPES.forEach((scope) => {
    const amount = Number((config.budgetDefaults || {})[scope]) || 0;
    $(PROFILE_BUDGET_FIELDS[scope]).value = amount > 0 ? String(amount) : "";
  });
  renderRecordsView();
  renderProfileView();

  prefetchNeighbours(agg.range);
}

/* ============================================================
   Entry sheet
   ============================================================ */

/* ============================================================
   Expense detail
   ============================================================ */

let detailId = null;

function formatStamp(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function detailRow(term, value) {
  return `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function openDetailSheet(id) {
  const entry = entries.find((e) => e.id === id);
  if (!entry || entry.deleted) return;
  if (entry.pending) {
    toast("Still saving that one — try again in a moment.");
    return;
  }

  detailId = id;
  const meta = catById(entry.category);

  $("detailTitle").textContent = entry.item || entry.merchant || meta.label;
  $("detailIcon").innerHTML = icon(meta.id, 22);
  $("detailAmount").textContent = money(entry.amount);

  const rows = [
    ["Category", meta.label],
    ["Date", prettyDay(entry.date)]
  ];
  if (entry.merchant) rows.push(["Where", entry.merchant]);
  if (entry.item) rows.push(["Item", entry.item]);
  rows.push(["Description", entry.note || "—"]);
  $("detailRows").innerHTML = rows.map(([t, v]) => detailRow(t, v)).join("");

  renderDetailPhotos(id);

  const edited = entry.updatedAt && entry.created && entry.updatedAt - entry.created > 60000;
  $("detailMeta").textContent = [
    entry.created ? `Added ${formatStamp(entry.created)}` : "",
    edited ? `Edited ${formatStamp(entry.updatedAt)}` : ""
  ].filter(Boolean).join(" · ");

  $("detailSheet").hidden = false;
}

/**
 * Photos come from storage, so the src is set as a property and checked for the data:
 * prefix rather than interpolated into markup, where a crafted value could break out.
 */
function renderDetailPhotos(id) {
  const photos = media.get(id);
  const wrap = $("detailPhotos");
  const grid = $("detailPhotoGrid");
  wrap.hidden = photos.length === 0;
  grid.innerHTML = "";

  photos.forEach((src, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "detail-photo";
    button.setAttribute("aria-label", `View photo ${index + 1}`);
    const img = document.createElement("img");
    img.src = src;
    img.alt = `Expense photo ${index + 1}`;
    button.appendChild(img);
    button.addEventListener("click", () => openLightbox(src));
    grid.appendChild(button);
  });
}

function closeDetailSheet() {
  $("detailSheet").hidden = true;
  detailId = null;
}

function openLightbox(src) {
  $("lightboxImage").src = src;
  $("lightbox").hidden = false;
}

function closeLightbox() {
  $("lightbox").hidden = true;
  $("lightboxImage").removeAttribute("src");
}

$("closeDetail").addEventListener("click", closeDetailSheet);
$("lightboxClose").addEventListener("click", closeLightbox);
$("lightbox").addEventListener("click", (event) => {
  if (event.target !== $("lightboxImage")) closeLightbox();
});

$("editFromDetail").addEventListener("click", () => {
  const id = detailId;
  closeDetailSheet();
  openEntrySheet(id);
});

$("deleteFromDetail").addEventListener("click", () => {
  const id = detailId;
  if (!id) return;
  const entry = entries.find((e) => e.id === id);
  const what = entry?.item || catById(entry?.category).label;
  if (!confirm(`Delete "${what}" for ${money(entry.amount)}?`)) return;
  closeDetailSheet();
  commit(() => {
    entries = entries.map((e) => (e.id === id ? tombstone(e) : e));
    media.remove(id);
    return null;
  }, { success: "Entry deleted.", failure: "Delete failed — the entry is back." });
});

function renderChips() {
  const wrap = $("categoryChips");
  wrap.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.setAttribute("aria-pressed", String(cat.id === selectedCategory));
    chip.setAttribute("data-tip", `Tag this expense as ${cat.label}`);
    chip.innerHTML = `${icon(cat.id, 16)}${cat.label}`;
    chip.addEventListener("click", () => {
      selectedCategory = cat.id;
      renderChips();
    });
    wrap.appendChild(chip);
  });
}

function renderPhotoStrip() {
  const strip = $("photoStrip");
  strip.querySelectorAll(".photo-thumb").forEach((node) => node.remove());
  const adder = strip.querySelector(".photo-add");

  draftPhotos.forEach((src, index) => {
    const cell = document.createElement("div");
    cell.className = "photo-thumb";
    const img = document.createElement("img");
    img.src = src;                       // property, not markup: no escaping hazard
    img.alt = `Attached photo ${index + 1}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "photo-remove";
    remove.setAttribute("aria-label", `Remove photo ${index + 1}`);
    remove.innerHTML = "&times;";
    cell.append(img, remove);
    remove.addEventListener("click", () => {
      draftPhotos.splice(index, 1);
      renderPhotoStrip();
    });
    strip.insertBefore(cell, adder);
  });

  adder.hidden = draftPhotos.length >= MAX_PHOTOS;
  $("photoHint").textContent = draftPhotos.length
    ? `${draftPhotos.length}/${MAX_PHOTOS} · stays on this device`
    : "Receipts stay on this device";
}

function openEntrySheet(id = null) {
  editingId = id;
  const entry = id ? entries.find((e) => e.id === id) : null;
  if (entry?.pending) {
    toast("Still saving that one — try again in a moment.");
    return;
  }

  selectedCategory = entry ? entry.category : "food";
  draftPhotos = entry ? media.get(entry.id).slice() : [];

  $("entryTitle").textContent = entry ? "Edit expense" : "Add expense";
  $("amountInput").value = entry ? entry.amount : "";
  $("itemInput").value = entry?.item || "";
  $("noteInput").value = entry?.note || "";
  $("dateInput").value = entry ? entry.date : todayKey();
  $("saveEntry").textContent = entry ? "Save changes" : "Save expense";
  $("deleteEntry").hidden = !entry;

  clearFieldErrors($("entryForm"));
  renderChips();
  renderQuickAmounts();
  refreshStepperState();
  renderPhotoStrip();
  $("entrySheet").hidden = false;
  setTimeout(() => $("amountInput").focus(), 60);
}

function closeEntrySheet() {
  $("entrySheet").hidden = true;
  tooltip.hide();
  editingId = null;
  draftPhotos = [];
}

/* ============================================================
   Optimistic mutations
   ============================================================ */

/**
 * Applies `mutate` to the in-memory list, repaints immediately, then persists.
 * If the write throws (quota, private mode) the previous list is restored.
 */
async function commit(mutate, { success, failure }) {
  const snapshot = entries.map((e) => ({ ...e }));
  const touchedId = mutate();
  invalidate();
  render({ allowSkeleton: false });

  try {
    await storage.writeEntries(entries);
    if (touchedId) {
      entries = entries.map((e) => (e.id === touchedId ? stripRuntimeFlags(e) : e));
      invalidate();
      render({ allowSkeleton: false });
    }
    if (success) toast(success, "ok");
    window.SaanSync?.notifyLocalChange();
  } catch (error) {
    entries = snapshot;
    invalidate();
    render({ allowSkeleton: false });
    toast(failure || "Could not save — storage is full or blocked.", "error");
    console.error(error);
  }
}

$("entryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = $("entryForm");
  clearFieldErrors(form);

  const check = validateAmount($("amountInput").value);
  if (check.error) {
    setFieldError("amountInput", check.error);
    toast(check.error, "error");
    $("amountInput").focus();
    return;
  }
  const amount = check.value;

  const dateValue = $("dateInput").value || todayKey();
  const dateError = validateEntryDate(dateValue);
  if (dateError) {
    setFieldError("dateInput", dateError);
    toast(dateError, "error");
    $("dateInput").focus();
    return;
  }

  // The merchant field is no longer captured; preserve whatever an existing record carries.
  const existing = editingId ? entries.find((e) => e.id === editingId) : null;
  const merchant = cleanText(existing?.merchant, LIMITS.merchant);
  const payload = {
    amount,
    category: selectedCategory,
    merchant,
    item: cleanText($("itemInput").value, LIMITS.item),
    note: cleanText($("noteInput").value, LIMITS.note),
    date: dateValue,
    photoCount: draftPhotos.length
  };

  const wasEditing = editingId;
  const photos = draftPhotos.slice();
  view = { ...view, anchor: payload.date };
  closeEntrySheet();

  commit(
    () => {
      if (wasEditing) {
        entries = entries.map((e) =>
          e.id === wasEditing ? { ...e, ...payload, updatedAt: Date.now(), pending: true } : e
        );
        savePhotos(wasEditing, photos);
        return wasEditing;
      }
      const id = `e${Date.now()}${Math.random().toString(16).slice(2, 6)}`;
      const now = Date.now();
      entries.push({ id, created: now, updatedAt: now, pending: true, ...payload });
      savePhotos(id, photos);
      if (navigator.vibrate) navigator.vibrate(25);
      return id;
    },
    {
      success: wasEditing
        ? "Expense updated."
        : `Recorded ${money(amount)}${merchant ? ` at ${merchant}` : ""}.`,
      failure: "Save failed — the entry was rolled back."
    }
  );
});

/** Photos live outside the ledger, so a quota failure must not cost the expense. */
function savePhotos(id, photos) {
  if (!photos.length) {
    media.remove(id);
    return;
  }
  if (!media.set(id, photos)) {
    toast("Expense saved, but there was no room for the photos.", "error");
    entries = entries.map((e) => (e.id === id ? { ...e, photoCount: 0 } : e));
  }
}

$("deleteEntry").addEventListener("click", () => {
  const id = editingId;
  if (!id) return;
  closeEntrySheet();
  commit(() => {
    entries = entries.map((e) => (e.id === id ? tombstone(e) : e));
    media.remove(id);
    return null;
  }, { success: "Entry deleted.", failure: "Delete failed — the entry is back." });
});

/* ============================================================
   Settings, export, wiring
   ============================================================ */

function exportCsv() {
  const range = rangeFor(view.scope, view.anchor);
  const agg = aggregatesFor(range);
  if (!agg.list.length) {
    toast("Nothing to export for this month.");
    return;
  }
  const rows = [["date", "category", "merchant", "item", "description", "amount"]].concat(
    agg.list.map((e) => [
      e.date,
      catById(e.category).label,
      (e.merchant || "").replace(/"/g, '""'),
      (e.item || "").replace(/"/g, '""'),
      (e.note || "").replace(/"/g, '""'),
      Number(e.amount).toFixed(2)
    ])
  );
  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = `saan-napunta-${range.key.replace(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast("CSV exported.", "ok");
}

/* The development warning stays dismissed for the session only, never permanently. */
const DEV_BANNER_KEY = "saan-napunta-dev-banner";
if (sessionStorage.getItem(DEV_BANNER_KEY) === "dismissed") $("devBanner").hidden = true;
$("dismissDevBanner").addEventListener("click", () => {
  $("devBanner").hidden = true;
  sessionStorage.setItem(DEV_BANNER_KEY, "dismissed");
});

/* ---------- amount steppers ---------- */

const QUICK_AMOUNTS = [20, 50, 100, 500];

/** Steps by a sensible amount for the current value rather than a fixed 0.01. */
function amountStep(value) {
  if (value < 100) return 10;
  if (value < 1000) return 50;
  if (value < 10000) return 100;
  return 500;
}

function nudgeAmount(direction) {
  const field = $("amountInput");
  const current = Number(field.value) || 0;
  // Stepping down uses the band below the current value so 100 goes to 90, not 50.
  const step = amountStep(direction > 0 ? current : Math.max(0, current - 0.01));
  const next = Math.max(0, Math.min(LIMITS.maxAmount, Math.round((current + direction * step) * 100) / 100));
  field.value = next ? String(next) : "";
  setFieldError(field, null);
  refreshStepperState();
  if (navigator.vibrate) navigator.vibrate(8);
}

function refreshStepperState() {
  const current = Number($("amountInput").value) || 0;
  $("amountDown").disabled = current <= 0;
  $("amountUp").disabled = current >= LIMITS.maxAmount;
}

/** Press and hold to repeat, accelerating after the first few steps. */
function bindHold(button, direction) {
  let timer = null;
  let delay = 380;

  const stop = () => {
    clearTimeout(timer);
    timer = null;
    delay = 380;
  };
  const tick = () => {
    nudgeAmount(direction);
    delay = Math.max(70, delay * 0.72);
    timer = setTimeout(tick, delay);
  };

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    nudgeAmount(direction);
    timer = setTimeout(tick, delay);
  });
  ["pointerup", "pointerleave", "pointercancel", "blur"].forEach((type) =>
    button.addEventListener(type, stop)
  );
}

bindHold($("amountDown"), -1);
bindHold($("amountUp"), 1);
$("amountInput").addEventListener("input", refreshStepperState);

function renderQuickAmounts() {
  const wrap = $("quickAmounts");
  wrap.innerHTML = "";
  QUICK_AMOUNTS.forEach((value) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "quick-amount";
    chip.textContent = `+${money(value).replace(".00", "")}`;
    chip.setAttribute("data-tip", `Add ${money(value)} to the amount`);
    chip.addEventListener("click", () => {
      const current = Number($("amountInput").value) || 0;
      $("amountInput").value = String(Math.min(LIMITS.maxAmount, current + value));
      setFieldError($("amountInput"), null);
      refreshStepperState();
    });
    wrap.appendChild(chip);
  });
}

$("addButton").addEventListener("click", () => openEntrySheet());

$("photoInput").addEventListener("change", async (event) => {
  const picked = [...event.target.files];
  event.target.value = "";

  const rejected = picked.filter(
    (file) => !file.type.startsWith("image/") || file.size > LIMITS.maxPhotoBytes
  );
  if (rejected.length) {
    toast(
      rejected.some((f) => !f.type.startsWith("image/"))
        ? "Only image files can be attached."
        : "That image is too large to attach.",
      "error"
    );
  }

  const room = MAX_PHOTOS - draftPhotos.length;
  const usable = picked.filter((file) => !rejected.includes(file));
  if (usable.length > room) toast(`Only ${MAX_PHOTOS} photos per expense.`);
  const files = usable.slice(0, room);
  if (!files.length) return;
  try {
    const encoded = await Promise.all(files.map(compressImage));
    draftPhotos = draftPhotos.concat(encoded).slice(0, MAX_PHOTOS);
    renderPhotoStrip();
  } catch {
    toast("Could not read that image.", "error");
  }
});
$("closeEntry").addEventListener("click", closeEntrySheet);
$("exportButton").addEventListener("click", exportCsv);
$("closeSettings").addEventListener("click", () => { $("settingsPanel").hidden = true; tooltip.hide(); });

$("scopeTabs").addEventListener("click", (event) => {
  const tab = event.target.closest("button[data-scope]");
  if (!tab || tab.dataset.scope === view.scope) return;
  view = { scope: tab.dataset.scope, anchor: view.anchor };
  render();
});

$("rangePrev").addEventListener("click", () => {
  view = { ...view, anchor: shiftAnchor(view.scope, view.anchor, -1) };
  render();
});

$("rangeNext").addEventListener("click", () => {
  const next = shiftAnchor(view.scope, view.anchor, 1);
  if (rangeFor(view.scope, next).isFuture) return;
  view = { ...view, anchor: next };
  render();
});

$("rangeToday").addEventListener("click", () => {
  view = { ...view, anchor: todayKey() };
  render();
});

/* ---------- per-period budget ---------- */

function syncRangeBudgetField(range) {
  const override = (config.budgets || {})[range.key];
  $("rangeBudgetInput").value = Number.isFinite(override) ? String(override) : "";
  $("clearRangeBudget").hidden = !Number.isFinite(override);
}

$("editRangeBudget").addEventListener("click", () => {
  const form = $("rangeBudgetForm");
  form.hidden = !form.hidden;
  if (!form.hidden) $("rangeBudgetInput").focus();
});

$("rangeBudgetForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const range = rangeFor(view.scope, view.anchor);
  const check = validateAmount($("rangeBudgetInput").value, { max: LIMITS.maxBudget });
  if (check.error) {
    setFieldError("rangeBudgetInput", check.error);
    toast(check.error, "error");
    return;
  }
  setFieldError("rangeBudgetInput", null);
  $("rangeBudgetForm").hidden = true;
  await setRangeBudget(range.key, check.value);
  toast(`Budget for ${range.label} set to ${money(check.value)}.`, "ok");
});

$("clearRangeBudget").addEventListener("click", async () => {
  const range = rangeFor(view.scope, view.anchor);
  $("rangeBudgetForm").hidden = true;
  await setRangeBudget(range.key, null);
  const fallback = Number((config.budgetDefaults || {})[range.scope]) || 0;
  toast(fallback > 0
    ? `Custom budget removed. Your ${PERIODS[range.scope].label.toLowerCase()} default now applies.`
    : `Budget removed for ${range.label}.`);
});

$("profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors(event.currentTarget);

  const firstName = cleanText($("firstNameInput").value, LIMITS.name);
  const lastName = cleanText($("lastNameInput").value, LIMITS.name);
  const birthdate = $("birthdateProfileInput").value;
  const province = PROVINCE_SET.has($("provinceInput").value) ? $("provinceInput").value : "";
  const sexAtBirth = SEXES[$("sexAtBirthInput").value] ? $("sexAtBirthInput").value : "";
  const occupation = OCCUPATIONS[$("occupationInput").value] ? $("occupationInput").value : "";
  const budgetDefaults = {};
  const budgetChecks = SCOPES.map((scope) => {
    const field = $(PROFILE_BUDGET_FIELDS[scope]);
    const raw = field.value.trim();
    const check = validateAmount(raw === "" ? 0 : raw, { max: LIMITS.maxBudget, allowZero: true });
    budgetDefaults[scope] = check.error ? 0 : check.value;
    return [field, check.error || null];
  });

  const checks = [
    [$("firstNameInput"), !firstName ? "Enter your first name." : validateName(firstName, "First name")],
    [$("lastNameInput"), validateName(lastName, "Last name")],
    [$("birthdateProfileInput"), validateBirthdate(birthdate)],
    ...budgetChecks
  ];
  const invalid = checks.find(([, problem]) => problem);
  checks.forEach(([field, problem]) => setFieldError(field, problem));
  if (invalid) {
    invalid[0].focus();
    toast(invalid[1], "error");
    return;
  }

  config = {
    ...config,
    name: firstName,
    firstName,
    lastName,
    birthdate,
    province,
    sexAtBirth,
    occupation,
    budgetDefaults
  };
  await storage.writeConfig(config);
  render({ allowSkeleton: false });
  toast("Profile saved.", "ok");
});

$("weekStartSelect").addEventListener("change", async (event) => {
  config = { ...config, weekStart: Number(event.target.value) };
  await storage.writeConfig(config);
});

$("clearButton").addEventListener("click", () => {
  if (!confirm("Erase every expense stored in this browser?")) return;
  commit(() => {
    entries = liveEntries().map(tombstone);
    localStorage.removeItem(MEDIA_KEY);
    return null;
  }, { success: "All data erased.", failure: "Could not erase the data." });
});

[$("entrySheet"), $("settingsPanel"), $("detailSheet")].forEach((sheet) => {
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet) {
      sheet.hidden = true;
      tooltip.hide();
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!$("lightbox").hidden) {
      closeLightbox();
      return;
    }
    $("entrySheet").hidden = true;
    $("settingsPanel").hidden = true;
    closeDetailSheet();
    tooltip.hide();
  }
});

/* ============================================================
   Bottom navigation, records calendar and profile
   ============================================================ */

let activeAppView = "home";
let recordsDays = new Set([todayKey()]);
let recordsMonth = todayKey().slice(0, 7);

function setBottomNavState(name) {
  document.querySelectorAll("#bottomNav [data-nav]").forEach((button) => {
    const on = button.dataset.nav === name;
    button.classList.toggle("on", on);
    if (on) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function showAppView(name) {
  if (!$(name + "View")) return;
  activeAppView = name;
  document.querySelectorAll(".app-view").forEach((section) => {
    section.hidden = section.dataset.view !== name;
  });
  $("settingsPanel").hidden = true;
  setBottomNavState(name);
  if (name === "records") renderRecordsView();
  if (name === "profile") renderProfileView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openSettingsFromNav() {
  $("settingsPanel").hidden = false;
  setBottomNavState("settings");
}

function restoreBottomNavState() {
  setBottomNavState(activeAppView);
}

function renderRecordsView() {
  if (!$("calendarGrid")) return;
  const [year, month] = recordsMonth.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const gridStart = addDays(first, -first.getDay());
  const allEntries = liveEntries();
  const totals = new Map();

  allEntries.forEach((entry) => {
    totals.set(entry.date, (totals.get(entry.date) || 0) + entry.amount);
  });

  const monthEntries = allEntries.filter((entry) => entry.date.startsWith(`${recordsMonth}-`));
  const monthTotal = monthEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const daysInMonth = new Date(year, month, 0).getDate();
  const averageDays = recordsMonth === todayKey().slice(0, 7)
    ? Number(todayKey().slice(8, 10))
    : daysInMonth;
  const byCategory = new Map();
  monthEntries.forEach((entry) => {
    const current = byCategory.get(entry.category) || { total: 0, count: 0 };
    current.total += entry.amount;
    current.count += 1;
    byCategory.set(entry.category, current);
  });
  const categoryRows = [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total);

  $("analyticsMonthTotal").textContent = money(monthTotal);
  $("analyticsDailyAverage").textContent = money(monthTotal / Math.max(1, averageDays));
  $("analyticsTransactionCount").textContent = String(monthEntries.length);
  $("analyticsPeriodLabel").textContent = `${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`;
  $("analyticsEmpty").hidden = categoryRows.length > 0;
  $("analyticsCategories").innerHTML = categoryRows.map(([categoryId, stat]) => {
    const category = catById(categoryId);
    const share = monthTotal ? Math.round((stat.total / monthTotal) * 100) : 0;
    return `<li>
      <span class="analytics-category-icon">${icon(category.id)}</span>
      <span class="analytics-category-main">
        <span><b>${escapeHtml(category.label)}</b><small>${stat.count} ${stat.count === 1 ? "expense" : "expenses"}</small></span>
        <span class="analytics-bar"><i style="width:${share}%"></i></span>
      </span>
      <span class="analytics-category-value"><b>${money(stat.total)}</b><small>${share}%</small></span>
    </li>`;
  }).join("");

  $("calendarMonth").textContent = `${MONTH_NAMES[month - 1]} ${year}`;
  const nextMonth = new Date(year, month, 1);
  $("calendarNext").disabled = dayKey(nextMonth).slice(0, 7) > todayKey().slice(0, 7);

  const grid = $("calendarGrid");
  grid.innerHTML = "";
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    const key = dayKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.dataset.date = key;
    button.textContent = String(date.getDate());
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", `${prettyDay(key)}${totals.has(key) ? `, ${money(totals.get(key))} spent` : ""}`);
    button.classList.toggle("outside", date.getMonth() !== month - 1);
    button.classList.toggle("today", key === todayKey());
    button.classList.toggle("selected", recordsDays.has(key));
    button.setAttribute("aria-selected", String(recordsDays.has(key)));
    button.classList.toggle("has-spend", totals.has(key));
    button.classList.toggle("future", key > todayKey());
    button.disabled = key > todayKey();
    button.addEventListener("click", () => {
      if (recordsDays.has(key)) recordsDays.delete(key);
      else recordsDays.add(key);
      recordsMonth = key.slice(0, 7);
      renderRecordsView();
    });
    grid.appendChild(button);
  }

  const selected = allEntries
    .filter((entry) => recordsDays.has(entry.date))
    .sort((a, b) => a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1);
  const total = selected.reduce((sum, entry) => sum + entry.amount, 0);
  const selectedKeys = [...recordsDays].sort();
  $("recordsDateLabel").textContent = selectedKeys.length === 0
    ? "No dates selected"
    : selectedKeys.length === 1
      ? prettyDay(selectedKeys[0])
      : `${selectedKeys.length} dates selected`;
  $("recordsDayTotal").textContent = money(total);
  $("recordsDayCount").textContent = String(selected.length);
  const categoryCount = new Set(selected.map((entry) => entry.category)).size;
  $("recordsCategoryCount").textContent = categoryCount
    ? `${categoryCount} ${categoryCount === 1 ? "category" : "categories"}`
    : "";
  $("recordsEmpty").hidden = selected.length > 0;
  $("recordsEmpty").textContent = recordsDays.size
    ? "No expenses recorded on the selected dates."
    : "Select one or more dates to view their combined records.";

  const list = $("recordsEntries");
  list.innerHTML = "";
  selected.forEach((entry) => {
    const category = catById(entry.category);
    const title = entry.item || entry.merchant || category.label;
    const subtitle = [prettyDay(entry.date), category.label, entry.note].filter(Boolean).join(" · ");
    const li = document.createElement("li");
    li.className = "row";
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span class="glyph">${icon(category.id)}</span>
      <span class="meta"><b>${escapeHtml(title)}</b><span>${escapeHtml(subtitle)}</span></span>
      <span class="amount">${money(entry.amount)}${entry.photoCount ? `<small class="photo-badge">${PHOTO_ICON}${entry.photoCount}</small>` : ""}</span>`;
    button.addEventListener("click", () => openDetailSheet(entry.id));
    li.appendChild(button);
    list.appendChild(li);
  });
}

function renderProfileView() {
  if (!$("profileName")) return;
  const first = config.firstName || config.name || "";
  const fullName = [first, config.lastName].filter(Boolean).join(" ");
  $("profileAvatar").textContent = (first || config.lastName || "?").charAt(0).toUpperCase();
  $("profileName").textContent = fullName || "Your profile";
  $("profileSubtitle").textContent = [
    OCCUPATIONS[config.occupation],
    config.province
  ].filter(Boolean).join(" · ") || "Stored privately on this device";
}

document.querySelectorAll("#bottomNav [data-nav]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.nav === "settings") openSettingsFromNav();
    else showAppView(button.dataset.nav);
  });
});

$("calendarPrev").addEventListener("click", () => {
  const [year, month] = recordsMonth.split("-").map(Number);
  recordsMonth = monthKey(new Date(year, month - 2, 1));
  renderRecordsView();
});
$("calendarNext").addEventListener("click", () => {
  const [year, month] = recordsMonth.split("-").map(Number);
  const next = monthKey(new Date(year, month, 1));
  if (next <= todayKey().slice(0, 7)) recordsMonth = next;
  renderRecordsView();
});
$("recordsToday").addEventListener("click", () => {
  const today = todayKey();
  recordsDays = new Set([today]);
  recordsMonth = today.slice(0, 7);
  renderRecordsView();
});
$("closeSettings").addEventListener("click", restoreBottomNavState);
$("settingsPanel").addEventListener("click", (event) => {
  if (event.target === $("settingsPanel")) restoreBottomNavState();
});

/* Static tooltips that never change */
$("addButton").setAttribute("data-tip", "Record a new expense");
$("exportButton").setAttribute("data-tip", "Download this month as a CSV spreadsheet");
$("rangePrev").setAttribute("data-tip", "Previous period");
$("rangeNext").setAttribute("data-tip", "Next period");
$("scopeTabs").setAttribute("data-tip", "View by day, week, month or year");



/* ============================================================
   Onboarding — profile + budget period + amount
   ============================================================ */

const PRESETS = {
  day: [150, 250, 400, 600],
  week: [1000, 2000, 3500, 5000],
  month: [5000, 10000, 15000, 25000],
  year: [60000, 120000, 250000, 500000]
};

let draft = {
  firstName: "",
  lastName: "",
  birthdate: "",
  province: "",
  sexAtBirth: "",
  occupation: "",
  currency: CURRENCY,
  period: "month",
  budget: 0
};
let onboardStep = 1;

function showStep(step) {
  onboardStep = step;
  document.querySelectorAll("#onboard .step").forEach((node) => {
    node.hidden = Number(node.dataset.step) !== step;
  });
  document.querySelectorAll(".onboard-progress .dot").forEach((dot) => {
    dot.classList.toggle("on", Number(dot.dataset.step) === step);
  });
  if (step === 4) {
    $("onboardGoogle").hidden = Boolean(window.SaanSync?.state().user);
  }
  if (step === 3) {
    $("amountSub").textContent = `How much can you spend per ${draft.period}?`;
    $("onboardSymbol").textContent = CURRENCY;
    renderPresets();
    renderEquivalent();
    setTimeout(() => $("onboardBudget").focus(), 80);
  }
}

function renderPeriodCards() {
  document.querySelectorAll(".period-card").forEach((card) => {
    card.setAttribute("aria-pressed", String(card.dataset.period === draft.period));
  });
}

function renderPresets() {
  const wrap = $("budgetPresets");
  wrap.innerHTML = "";
  (PRESETS[draft.period] || PRESETS.month).forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset";
    button.textContent = draft.currency + value.toLocaleString();
    button.addEventListener("click", () => {
      $("onboardBudget").value = String(value);
      draft.budget = value;
      renderEquivalent();
    });
    wrap.appendChild(button);
  });
}

/** Makes the non-repeating budget behavior explicit during onboarding. */
function renderEquivalent() {
  const amount = Number($("onboardBudget").value) || 0;
  const node = $("budgetEquivalent");
  if (!amount) {
    node.textContent = "";
    return;
  }
  const range = rangeFor(draft.period, todayKey());
  node.textContent = `Applies only to ${range.label}. Other days, weeks, months and years stay unset.`;
}

async function finishOnboarding({ budget }) {
  const amount = Math.max(0, budget || 0);
  const range = rangeFor(draft.period, todayKey());
  const budgets = { ...(config.budgets || {}) };
  if (amount > 0) budgets[range.key] = amount;

  config = {
    ...config,
    firstName: draft.firstName,
    lastName: draft.lastName,
    birthdate: draft.birthdate,
    province: draft.province,
    sexAtBirth: draft.sexAtBirth,
    occupation: draft.occupation,
    name: draft.firstName,
    currency: draft.currency,
    budgetPeriod: draft.period,
    budget: 0,
    budgets,
    onboarded: true
  };
  await storage.writeConfig(config);
  invalidate();
  $("onboard").hidden = true;
  render({ allowSkeleton: false });
  toast(
    amount > 0
      ? `Budget for ${range.label} set to ${money(amount)}.`
      : "You can set a budget for any period from Home.",
    "ok"
  );
}

function wireOnboarding() {
  $("stepOneNext").addEventListener("click", () => {
    const step = document.querySelector('.step[data-step="1"]');
    clearFieldErrors(step);

    const firstName = cleanText($("firstName").value, LIMITS.name);
    const lastName = cleanText($("lastName").value, LIMITS.name);
    const birthdate = $("birthdate").value;

    const problems = [
      ["firstName", firstName ? validateName(firstName, "First name") : "Enter your first name, or tap Skip for now."],
      ["lastName", validateName(lastName, "Last name")],
      ["birthdate", validateBirthdate(birthdate)]
    ].filter(([, message]) => message);

    if (problems.length) {
      problems.forEach(([id, message]) => setFieldError(id, message));
      $(problems[0][0]).focus();
      toast(problems[0][1], "error");
      return;
    }

    draft.firstName = firstName;
    draft.lastName = lastName;
    draft.birthdate = birthdate;
    draft.province = PROVINCE_SET.has($("province").value) ? $("province").value : "";
    draft.sexAtBirth = SEXES[$("sexAtBirth").value] ? $("sexAtBirth").value : "";
    draft.occupation = OCCUPATIONS[$("occupation").value] ? $("occupation").value : "";
    draft.currency = CURRENCY;
    showStep(2);
  });

  // Live feedback while typing, so errors clear as soon as they are fixed.
  $("birthdate").addEventListener("change", (event) =>
    setFieldError("birthdate", validateBirthdate(event.target.value))
  );
  ["firstName", "lastName"].forEach((id) => {
    $(id).addEventListener("input", (event) =>
      setFieldError(id, validateName(cleanText(event.target.value, LIMITS.name), "Name"))
    );
  });

  $("skipOnboarding").addEventListener("click", () => finishOnboarding({ budget: 0 }));

  $("periodGrid").addEventListener("click", (event) => {
    const card = event.target.closest(".period-card");
    if (!card) return;
    draft.period = card.dataset.period;
    renderPeriodCards();
  });

  $("stepTwoBack").addEventListener("click", () => showStep(1));
  $("stepTwoNext").addEventListener("click", () => showStep(3));
  $("stepThreeBack").addEventListener("click", () => showStep(2));
  $("onboardBudget").addEventListener("input", renderEquivalent);
  $("noBudget").addEventListener("click", () => {
    draft.budget = 0;
    showStep(4);
  });

  $("finishOnboarding").addEventListener("click", () => {
    const check = validateAmount($("onboardBudget").value, { max: LIMITS.maxBudget });
    if (check.error) {
      setFieldError("onboardBudget", check.error);
      toast(check.error, "error");
      return;
    }
    setFieldError("onboardBudget", null);
    draft.budget = check.value;
    showStep(4);
  });

  $("onboardGoogle").addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    try {
      await window.SaanSync.signIn();
      await finishOnboarding({ budget: draft.budget });
    } catch {
      toast("Sign-in cancelled. You can do this later in Settings.");
    } finally {
      event.currentTarget.disabled = false;
    }
  });

  $("finishNoSync").addEventListener("click", () => finishOnboarding({ budget: draft.budget }));

  renderPeriodCards();
}

function maybeShowOnboarding() {
  if (config.onboarded) return false;
  draft = {
    firstName: config.firstName || "",
    lastName: config.lastName || "",
    birthdate: config.birthdate || "",
    province: config.province || "",
    sexAtBirth: config.sexAtBirth || "",
    occupation: config.occupation || "",
    currency: config.currency || "\u20b1",
    period: config.budgetPeriod || "month",
    budget: config.budget || 0
  };
  $("firstName").value = draft.firstName;
  $("lastName").value = draft.lastName;
  $("birthdate").value = draft.birthdate;
  fillProvinces($("province"), draft.province);
  fillOptions($("occupation"), OCCUPATIONS, draft.occupation);
  $("sexAtBirth").value = draft.sexAtBirth;
  $("onboard").hidden = false;
  showStep(1);
  setTimeout(() => $("firstName").focus(), 120);
  return true;
}

/* ============================================================
   Sync + account UI  (optional — the app is fully usable signed out)
   ============================================================ */

const STATUS_LABEL = {
  "offline-only": "Local only",
  connecting: "Connecting",
  syncing: "Syncing",
  synced: "Synced",
  queued: "Queued",
  error: "Sync issue"
};

function renderSyncState(state) {
  const signedIn = Boolean(state.user);
  const detail = window.SaanSync.state().description;

  // Header pill
  const pill = $("syncPill");
  pill.hidden = !signedIn;
  $("syncPillText").textContent = STATUS_LABEL[state.status] || "Synced";
  $("syncPillDot").className = `sync-dot ${state.status === "synced" ? "synced" : state.status}`;
  pill.setAttribute("data-tip", detail);

  // Settings card
  $("accountIntro").hidden = signedIn;
  $("googleSignIn").hidden = signedIn;
  $("accountCard").hidden = !signedIn;
  $("syncRow").hidden = !signedIn;
  $("signOutButton").hidden = !signedIn;

  if (signedIn) {
    $("accountAvatar").textContent = state.user.initial || "?";
    $("accountName").textContent = state.user.name || "Signed in";
    $("accountEmail").textContent = state.user.email || "";
    $("syncDetail").textContent = detail;
    $("syncDot").className = `sync-dot ${state.status === "synced" ? "synced" : state.status}`;
  }
}

/** Applied by the sync engine after a merge: replaces the ledger and repaints. */
async function adoptLedger(merged) {
  entries = merged.map(normaliseEntry);
  await storage.writeEntries(entries);
  invalidate();
  render({ allowSkeleton: false });
}

function wireSync() {
  const sync = window.SaanSync;
  if (!sync) return;

  sync.configure({
    readLocal: () => entries.map(stripRuntimeFlags),
    writeLocal: adoptLedger
  });

  sync.subscribe(renderSyncState);

  $("googleSignIn").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const user = await sync.signIn();
      toast(`Signed in as ${user.email}. Your expenses will sync.`, "ok");
    } catch {
      toast("Sign-in cancelled.", "error");
    } finally {
      button.disabled = false;
    }
  });

  $("signOutButton").addEventListener("click", async () => {
    await sync.signOut();
    toast("Signed out. Your data stays on this device.");
  });

  $("syncNow").addEventListener("click", () => sync.syncNow());
  $("syncPill").addEventListener("click", () => { $("settingsPanel").hidden = false; });

  sync.init();
}

/* ============================================================
   Boot
   ============================================================ */

(async function boot() {
  paintSkeleton();
  announce("Loading your ledger…");

  const [loadedConfig, loadedEntries] = await Promise.all([
    Promise.resolve(storage.readConfig()),
    Promise.resolve(storage.readEntries())
  ]);

  config = loadedConfig;
  entries = loadedEntries;

  // If anything had to be corrected on read, write the clean version straight back.
  if (localStorage.getItem(CONFIG_KEY) && localStorage.getItem(CONFIG_KEY) !== JSON.stringify(config)) {
    storage.writeConfig(config);
  }
  ready = true;
  invalidate();

  // Hold the skeleton briefly so the load transition is visible rather than a flash.
  setTimeout(() => {
    document.body.classList.add("loaded");
    render({ allowSkeleton: false });
    announce("Saan Napunta? ready.");
    applyInputLimits();
    wireSync();
    wireOnboarding();
    maybeShowOnboarding();
  }, 260);
})();

