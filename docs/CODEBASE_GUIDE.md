# Codebase Guide — Saan Napunta?

A file-by-file, function-by-function map of the project. Written so a new contributor (or an
AI agent) can find the right place to change something without reading all 2,300 lines.

**Stack:** vanilla HTML/CSS/JS for the web build, Kotlin with plain Android Views for the
native build. No frameworks, no npm packages, no Gradle dependencies beyond the Android and
Kotlin plugins. Nothing talks to a network.

---

## 1. Repository map

```
saan-napunta/
├── README.md                    Project overview, naming, quick start
├── LICENSE                      MIT
├── PRIVACY.md                   Privacy policy (used as the Play Store policy URL)
├── .gitignore                   Gradle/Android/editor noise
├── .github/workflows/
│   └── deploy-pages.yml         Rebuilds the inlined HTML, deploys web/ to GitHub Pages
├── tools/
│   └── build_web_preview.py     Inlines CSS + JS into web/index.html
├── docs/
│   ├── ARCHITECTURE.md          How the two builds are put together
│   ├── SPECIFICATIONS.md        Product rules, screens, categories, non-goals
│   ├── TESTING.md               Manual QA checklist for both builds
│   ├── STORE_LISTING.md         App name, title character budgets, store copy
│   ├── CODEBASE_GUIDE.md        ← this file
│   └── APP_BLUEPRINT.md         Promptable, implementation-free description of the app
├── web/
│   ├── index.template.html      HTML source (129 lines) — edit this
│   ├── index.html               GENERATED single-file build — never edit
│   ├── css/styles.css           All styling (546 lines)
│   ├── js/app.js                All behaviour (740 lines)
│   └── .nojekyll                Stops GitHub Pages from processing the folder
└── android/
    ├── README.md                Android-specific build notes
    ├── build.gradle.kts         Plugin versions (AGP 8.5.2, Kotlin 2.0.21)
    ├── settings.gradle.kts      Repositories, root project name, :app module
    └── app/
        ├── build.gradle.kts     namespace, SDK levels, Java 17
        └── src/main/
            ├── AndroidManifest.xml
            ├── java/com/example/saannapunta/
            │   ├── MainActivity.kt          Dashboard (504 lines)
            │   ├── EntryActivity.kt         Add/edit form (225 lines)
            │   ├── ExpenseStore.kt          Model + persistence + helpers (148 lines)
            │   └── GradientBackgroundView.kt Animated background (71 lines)
            └── res/
                ├── drawable/    ic_launcher, splash_background, card_background, fab_background
                ├── values/      colors.xml, strings.xml, themes.xml
                └── xml/         backup_rules.xml
```

### Golden rule

`web/index.html` is **generated**. Edit `index.template.html`, `css/styles.css` or
`js/app.js`, then run:

```bash
python3 tools/build_web_preview.py
```

The generated file exists because sandboxed previews and some static hosts do not load
external stylesheets or scripts. It is committed so GitHub Pages can serve it directly.

---

## 2. Root files

| File | What it does |
| --- | --- |
| `README.md` | Elevator pitch, the launcher-name vs store-title split, project layout, quick start for both builds |
| `PRIVACY.md` | States that nothing is collected. Referenced by the Play Console Data Safety form |
| `LICENSE` | MIT, © Aleksis Ong |
| `.gitignore` | `.gradle/`, `**/build/`, `local.properties`, `*.apk`, `.idea/`, OS junk |

### `.github/workflows/deploy-pages.yml`

Triggers on push to `main` or manual dispatch. Steps: checkout → run
`tools/build_web_preview.py` (so a stale `index.html` can never ship) → `configure-pages`
→ `upload-pages-artifact` with `path: ./web` → `deploy-pages`. Needs `pages: write` and
`id-token: write` permissions.

### `tools/build_web_preview.py`

31 lines, no arguments, no dependencies. Reads the three source files, replaces the
`<link rel="stylesheet">` line with an inline `<style>` block and the `<script src>` line
with an inline `<script>` block, writes `web/index.html`. If you rename those two tags in
the template, update the two `.replace()` calls here or the inlining silently no-ops.

---

## 3. Web build

### 3.1 `web/index.template.html` — structure

Single screen plus two overlays. Key element IDs (JavaScript looks all of these up by id):

| Region | IDs |
| --- | --- |
| Background | `.live-gradient` (CSS only, no id) |
| Header | `.heading-row`, `.tagline` |
| Summary card | `monthLabel`, `monthTotal`, `budgetMeter`, `budgetFill`, `budgetLeft`, `budgetCap`, `todayTotal`, `entryCount` |
| Breakdown card | `breakdown` (ul), `breakdownEmpty`, `exportButton` |
| Entries card | `entries` (ul), `entriesEmpty`, `monthPicker` |
| Add button | `addButton` (floating action button) |
| Onboarding | `onboard`, `profileName`, `profileCurrency`, `stepOneNext`, `skipOnboarding`, `periodGrid`, `stepTwoBack`, `stepTwoNext`, `amountSub`, `onboardSymbol`, `onboardBudget`, `budgetPresets`, `budgetEquivalent`, `stepThreeBack`, `finishOnboarding`, `noBudget` |
| Entry sheet | `entrySheet`, `entryForm`, `entryTitle`, `closeEntry`, `amountSymbol`, `amountInput`, `categoryChips`, `dateInput`, `noteInput`, `saveEntry`, `deleteEntry` |
| Settings sheet | `settingsPanel`, `closeSettings`, sync controls, `weekStartSelect`, `clearButton` |
| Accessibility | `status` (visually hidden `aria-live` region) |

Both sheets start with the `hidden` attribute; JS toggles `.hidden` rather than a class.

### 3.2 `web/css/styles.css` — styling

Ordered top to bottom:

1. **Tokens** — `:root` custom properties in three groups: base (`--black`, `--ink`,
   `--grey`, `--grey-dim`, `--muted`), accents (`--purple`, `--purple-deep`, `--orange`,
   `--orange-dark`, `--yellow`, `--gold`, `--brown`, `--brown-deep`, `--danger`) and
   surfaces (`--line`, `--line-warm`, `--panel`, `--surface`).
2. **Reset** — border-box, `[hidden] { display: none !important; }` (required: every
   toggled element is a flex or grid container and would otherwise ignore `hidden`), body
   background, inherited fonts on controls.
3. **`.live-gradient`** — fixed full-bleed layer; `::before` and `::after` are two 82 vmax
   blurred radial circles animated by `gradientDrift` (18–30 s, alternating). Reduced-motion
   slows them rather than stopping them.
4. **Layout** — `.shell` caps the column at 460 px and centres it; `.heading-row` is a
   3-column grid so the title stays optically centred next to the settings button.
5. **Cards** — `.summary-card`, `.panel`, `.sheet-card` share the 22 px radius, hairline
   border, translucent panel fill and backdrop blur.
6. **Components** — `.budget-bar`, `.mini-stats`, `.breakdown`, `.entries`, `.day-divider`,
   `.chip`, `.fab`, `.sheet`, buttons, inputs.
7. **Skeletons** — `.sk` base plus the `shimmer` keyframes; `.sk-dot`, `.sk-row`.
8. **Optimistic states** — `rowIn` entry animation, `.pending` sweep, `.failed` border.
9. **Tooltips** — `.tooltip`, its arrow, `.below` variant, `tipIn`.
10. **Toasts and load-in** — `.toast.ok`, `.toast.error`, `body.loaded` card stagger.

Every animation has a `prefers-reduced-motion` fallback or is short enough not to need one.

### 3.3 `web/js/app.js` — behaviour

Constants at the top: `ENTRIES_KEY`, `CONFIG_KEY`, `DEFAULT_CONFIG`, `WRITE_LATENCY_MS`
(90 ms simulated write), `CACHE_LIMIT` (24 memoised months), and the nine `CATEGORIES`.

Module state: `config`, `entries`, `selectedCategory`, `editingId`, `viewMonth`, `ready`.

#### Storage layer

| Function | Role |
| --- | --- |
| `storage.readConfig()` | Parses `saan-napunta-config`, merged over `DEFAULT_CONFIG`; returns defaults on corrupt JSON |
| `storage.readEntries()` | Parses `saan-napunta-entries`; filters out anything without an `id` or a finite `amount` |
| `storage.writeEntries(list)` | Returns a Promise, writes after `WRITE_LATENCY_MS`, rejects on quota errors |
| `storage.writeConfig(next)` | Promise-wrapped config write |
| `stripRuntimeFlags(entry)` | Removes the transient `pending` / `failed` flags before persisting |

Writes are promise-based on purpose: localStorage really can throw (quota exceeded, Safari
private mode), and the async shape means swapping in IndexedDB or a server later touches
only this object.

#### Aggregate cache

| Function | Role |
| --- | --- |
| `invalidate()` | Bumps `dataVersion` and clears the cache. Call after **any** mutation |
| `aggregatesFor(key)` | Memoised per `month\|dataVersion\|currency`. Returns `{ list, total, byCategory, byDay, today, dailyAverage, daysElapsed, daysInMonth, daysLeft, isCurrentMonth, computedAt }`. LRU-evicts past `CACHE_LIMIT` |
| `isCached(key)` | Whether a month can be painted without recomputing — decides if a skeleton is needed |
| `prefetchNeighbours(key)` | Warms the previous and next month during `requestIdleCallback` |

`cacheStats` counts hits and misses; the number is surfaced in the big total's tooltip.

#### Currency

`CURRENCY` is a single constant declared above `DEFAULT_CONFIG` (it must stay there —
`DEFAULT_CONFIG` reads it, and a later `const` would hit the temporal dead zone).
`CURRENCIES` remains an array so re-enabling more is a one-line change. `sanitiseConfig()`
forces the stored value to `CURRENCY`, so an old profile carrying `$` is corrected on load.
`money()` and every formatting path are still currency-aware; only the pickers were removed.

#### Validation

`LIMITS` holds every numeric and length cap. Helpers: `cleanText(value, max)` (collapse
whitespace, strip control characters, truncate), `clampNumber`, `ageFrom(isoDay)`,
`validateBirthdate`, `validateName`, `validateEntryDate`, `validateAmount`, and the UI pair
`setFieldError(field, message)` / `clearFieldErrors(scope)`.
`applyInputLimits()` runs at boot and writes `min`, `max` and `maxLength` onto the live
inputs so native pickers cannot offer an out-of-range value.

Defence in depth: `sanitiseConfig()` and `normaliseEntry()` re-validate everything read from
storage or received from sync, and the boot sequence writes a corrected config straight back.
A hand-edited `localStorage` cannot inject bad amounts, unknown categories or invalid dates.

#### Reference data

`PROVINCES` is an array of `[regionLabel, [province, ...]]` pairs covering all 82 provinces
across the 18 PSGC regions, with Metro Manila listed first as a practical convenience.
`fillProvinces(select, selected)` builds the `<optgroup>` markup and is used by both the
onboarding step and Settings. `OCCUPATIONS` and `SEXES` map stored ids to labels, and `fillOptions(select, map, selected)` renders either into a dropdown — the maps are the single source, so the profile step and Settings can never drift apart. Insertion order sets the option order.

#### Media store

`media` wraps a separate `saan-napunta-media` bucket (`{ entryId: [dataUrl] }`) with
`all/get/set/remove`; `set` returns false on quota failure so the caller can degrade
gracefully. `compressImage(file)` downscales to `MAX_EDGE_PX` (1200) via canvas and
re-encodes at `JPEG_QUALITY` (0.72). Photos are never written into the ledger, so they never
reach the sync layer.

#### Icons

`ICONS` holds 24x24 stroke path data per category plus the settings gear; `icon(name, size)`
returns an inline `<svg>` using `currentColor`. Adding a category means adding one entry to
`CATEGORIES` and one to `ICONS` (and one vector drawable on Android).

#### View ranges

| Function | Role |
| --- | --- |
| `rangeFor(scope, anchorDay)` | Returns `{ scope, key, start, end, label, totalDays, elapsed, daysRemaining, isCurrent, isFuture }` for day, week, month or year |
| `shiftAnchor(scope, anchorDay, delta)` | Steps the anchor one whole period |
| `renderRangeNav(range)` | Paints the scope tabs, the label and the arrow states |
| `budgetForRange(range)` | Reads only the budget matching the exact range key. It never repeats or converts a budget into another scope |
| `setRangeBudget(key, amount)` | Writes or clears an exact-period budget (`null` clears) |
| `sanitiseBudgets(raw)` | Keeps only well-formed `[dwmy]:` keys with in-range amounts |
| `sanitiseDefaults(raw)` | Preserves and clamps legacy standing-budget data for storage compatibility; the current resolver ignores it |

Module state is `view = { scope, anchor }`. `range.key` is the aggregate-cache key **and**
the budget-override key, so both stay in step automatically.

#### Budget periods

| Function | Role |
| --- | --- |
| `periodWindow(period, date)` | Inclusive start/end day keys for the active window, plus `totalDays`, `elapsed`, `daysRemaining` (counts today) and `isLastDay` |
| `periodStats()` | Spend inside the active window with `budget`, `left`, `ratio`, `safePerDay`, `today` |
| `convertBudget(amount, from, to)` | Converts between day/week/month/year using 1 : 7 : 30.44 : 365.25 |

#### Onboarding

| Function | Role |
| --- | --- |
| `maybeShowOnboarding()` | Returns false and does nothing when `config.onboarded` |
| `showStep(n)` | Toggles the three `.step` sections and the progress dots |
| `renderPeriodCards()` / `renderPresets()` / `renderEquivalent()` | Step 2 and 3 UI |
| `finishOnboarding({ budget })` | Writes name, currency, period, budget, `onboarded: true`, repaints |
| `wireOnboarding()` | Attaches every onboarding listener once, at boot |

#### Helpers

`monthKey(date)`, `todayKey()`, `money(value)`, `prettyMonth(key)`, `prettyDay(key)`
(returns "Today"/"Yesterday" where applicable), `escapeHtml(text)`, `announce(message)`
(writes to the `aria-live` region), `toast(message, tone)` (`info` | `ok` | `error`).

#### Tooltips — the `tooltip` IIFE

Creates one `.tooltip` node and returns `{ hide }`. Internals: `show(target)` reads
`data-tip`, positions above the anchor, clamps to the viewport with a 10 px margin, flips
`below` when there is no headroom, and sets `aria-describedby`. Listeners are delegated on
`document`: `pointerover`, `focusin`, `focusout`, `pointerdown` (touch taps peek for 2.2 s),
plus `scroll` to hide. Add a tooltip anywhere by setting `data-tip="…"` — no registration.

#### Skeletons

`bar(width, height, radius)` returns one shimmer span. `paintSkeleton()` fills the total,
budget legend, three mini-stats, three breakdown rows and four entry rows with them, and
hides the empty-state notes so they cannot flash during load.

#### Rendering

| Function | Role |
| --- | --- |
| `renderMonthPicker()` | Rebuilds the `<option>` list only when the set of months changed (compares `dataset.keys`) |
| `renderSummary(agg)` | Month label, big total, budget meter and legend, three mini-stats, and all their tooltips |
| `renderBreakdown(agg)` | Category rows sorted high → low with share bars; each row is focusable and carries a tooltip |
| `renderEntries(agg)` | Day dividers with subtotals, then one button per entry; applies `.pending` / `.failed` |
| `render({ allowSkeleton })` | **The only entry point.** Paints a skeleton when the month is cold, then paints for real on the next animation frame |
| `paint(agg)` | Runs the three renderers, syncs the settings inputs, kicks off neighbour prefetch |

#### Expense detail

`openDetailSheet(id)` fills the read-only sheet, `renderDetailPhotos(id)` builds the
thumbnail grid, and `openLightbox(src)` / `closeLightbox()` drive the full-screen viewer.
`isPhoto(src)` gates everything on a `data:image/` prefix, and both `media.get` and
`media.set` filter through it. Image sources are assigned with `img.src = …` rather than
interpolated into `innerHTML`, so a crafted value in storage cannot break out of the
attribute.

#### Entry sheet

`renderChips()` rebuilds the category chips with `aria-pressed`. `openEntrySheet(id)`
switches between add and edit mode (and refuses to open a row that is still saving).
`closeEntrySheet()` hides the sheet, clears `editingId`, hides any tooltip.

#### Optimistic mutations

`commit(mutate, { success, failure })` is the heart of every write:

1. Deep-copy `entries` as a rollback snapshot.
2. Run `mutate()`, which edits `entries` in place and returns the touched id (or `null`).
3. `invalidate()` then `render({ allowSkeleton: false })` — the UI updates immediately.
4. `await storage.writeEntries(entries)`.
5. On success, strip the `pending` flag from the touched row, repaint, show the success toast.
6. On failure, restore the snapshot, repaint, show a red error toast, log the error.

All three mutating paths use it: the form `submit` handler, `deleteEntry`, and `clearButton`.

#### Wiring and boot

Listeners for the add button, both close buttons, export, month picker, budget, currency,
week start, erase, backdrop clicks and Escape. Static `data-tip` attributes are assigned for
the settings button, FAB, export button and month picker.

`boot()` paints a skeleton, announces "Loading your ledger…", reads config and entries,
sets `ready = true`, then after 260 ms adds `body.loaded` and does the first real paint.

`exportCsv()` builds `date,category,note,amount` rows from the cached aggregate, quotes every
cell, and downloads `saan-napunta-YYYY-MM.csv` via an object URL.

---

## 4. Android build

### 4.1 Gradle

| File | Contents |
| --- | --- |
| `android/build.gradle.kts` | AGP 8.5.2 and Kotlin 2.0.21, both `apply false` |
| `android/settings.gradle.kts` | `google()` + `mavenCentral()`, `FAIL_ON_PROJECT_REPOS`, root name `SaanNapuntaAndroid`, includes `:app` |
| `android/app/build.gradle.kts` | namespace and applicationId `com.example.saannapunta`, compileSdk 35, minSdk 26, targetSdk 35, Java 17, `jvmToolchain(17)`. **Zero dependencies** |

### 4.2 `AndroidManifest.xml`

No `<uses-permission>` at all. Declares `MainActivity` (launcher, `adjustResize`) and
`EntryActivity` (not exported). Theme `@style/AppTheme`.

### 4.3 `ExpenseStore.kt` — model and persistence

- Constants `PREFS = "saan_napunta_prefs"`, `ENTRIES_KEY`, `BUDGET_KEY`, `CURRENCY_KEY`.
- `data class Category(id, label, iconRes)` and the `CATEGORIES` list — must stay in sync with
  the web `CATEGORIES` array; `categoryOf(id)` falls back to "Other".
- `data class Expense(id, amount, category, note, date, created)` with `monthKey()`,
  `toJson()` and `Companion.fromJson()`.
- `class ExpenseStore(context)`: `all()`, `forMonth(monthKey)` (sorted newest first),
  `save(entry)` (upsert by id), `delete(id)`, `clear()`, `find(id)`, `months()`,
  private `persist(items)`, plus `budget` and `currency` properties.
- Free functions `currentMonthKey()`, `todayKey()`, `prettyMonth()`, `prettyDay()`,
  `money(currency, value)`.

The whole ledger is one JSON array in SharedPreferences — fine for a personal log, swap in
Room if it ever grows.

### 4.4 `MainActivity.kt` — dashboard

State: `store`, `viewMonth`, view references (`monthLabel`, `totalText`, `budgetBar`,
`budgetLegend`, `statsRow`, `breakdownList`, `entriesList`, `monthSpinner`) and
`suppressSpinner` (swallows the adapter's initial selection callback).

- `onCreate` — builds `FrameLayout(gradient + ScrollView + FAB)` entirely in code.
- `onResume` — calls `refresh()`, which is how returning from `EntryActivity` updates the
  dashboard without a result callback.
- Builders: `buildHeader()`, `buildSummaryCard()`, `buildBreakdownCard()`,
  `buildEntriesCard()`, `buildFab()`.
- Renderers: `refresh()` (totals + budget meter), `renderStats()`, `renderBreakdown()`,
  `renderEntries()` (tap edits, long-press deletes), `renderMonthSpinner()`.
- Actions: `confirmDelete(entry)`, `showSettings()` (budget + currency + erase),
  `confirmErase()`, `shareCsv()` (builds the CSV and fires `ACTION_SEND`).
- Helpers: `card()`, `cardParams()`, `sectionTitle()`, `mutedText()`, `footerText()`,
  `dp()`, `daysInMonth()`; `MATCH` / `WRAP` constants in the companion object.

### 4.5 `EntryActivity.kt` — add / edit

`EXTRA_ID` decides add vs edit. `onCreate` builds the amount row (currency prefix +
numeric-decimal field), the chip grid, the date button and the note field.
`renderChips()` lays the nine categories out three per row and re-renders on tap;
`newChipLine()` makes each row. `pickDate()` opens a `DatePickerDialog` seeded with the
current selection. `save()` validates `> 0`, upserts through the store, toasts, finishes.
`confirmDelete()` guards deletion with an `AlertDialog`. `label()` and `dp()` are helpers.

### 4.6 `GradientBackgroundView.kt`

Custom `View` that repaints every 500 ms (`frameDelayMs`) with a slowly advancing `phase`,
drawing two `RadialGradient` passes over a near-black base. The ticker is posted in
`onAttachedToWindow` and removed in `onDetachedFromWindow`, so it never leaks or burns
battery in the background.

### 4.7 Resources

- `colors.xml` — mirrors the web tokens: `background #07050B`, `surface #16101F`,
  `text_primary #F5EFE6`, `text_muted #9A93A6`, `grey_dim #6F6878`, `purple #8B5CF6`,
  `purple_deep #4C1D95`, `accent #C2410C`, `accent_light #FF7E00`, `yellow #FFC53D`,
  `gold #E9C46A`, `brown #6B4A2F`, `brown_deep #3A2618`, `danger #E5484D`,
  `hairline #2A2233`.
- `strings.xml` — `app_name` is the short **Saan Napunta?** (launcher labels truncate around
  12 characters); `app_tagline` is **Expense Tracker**; plus all UI copy.
- `themes.xml` — `Theme.Material.NoActionBar`, dark status and navigation bars, accent colour.
- `drawable/` — `ic_launcher` (vector), `splash_background` (gradient), `card_background`
  (22 dp rounded, hairline stroke), `fab_background` (orange oval gradient), and nine
  `ic_cat_*.xml` category icons (24 dp stroke vectors, tinted at runtime).
- `xml/backup_rules.xml` — includes only the app's own prefs file.

---

## 5. Cross-cutting conventions

| Concern | Web | Android |
| --- | --- | --- |
| Storage keys | `saan-napunta-entries`, `saan-napunta-config` | `saan_napunta_prefs` |
| Entry id | `"e" + Date.now() + 4 random hex` | `"e" + System.currentTimeMillis()` |
| Date format | ISO day string `YYYY-MM-DD` | identical |
| Month key | `date.slice(0, 7)` | `date.take(7)` |
| Money | `currency + toLocaleString(2dp)` | `currency + "%,.2f"` |
| CSV | `saan-napunta-YYYY-MM.csv` download | same columns, shared via `ACTION_SEND` |

If you add a category, edit **both** `CATEGORIES` lists. If you change a storage key, ship a
migration or existing users lose their ledger.

---

## 6. Common tasks

| Task | Where |
| --- | --- |
| Change photo limits | `MAX_PHOTOS`, `MAX_EDGE_PX`, `JPEG_QUALITY` in `app.js` |
| Add a category | `CATEGORIES` + `ICONS` in `web/js/app.js`, `CATEGORIES` in `ExpenseStore.kt`, and a new `res/drawable/ic_cat_*.xml` |
| Change a colour | `:root` in `styles.css` **and** `colors.xml` (keep the two in sync) |
| Add a tooltip | Set `data-tip="…"` on any element — no other wiring |
| Add a new stat | Compute it inside `aggregatesFor()`, render in `renderSummary()` |
| Change save behaviour | `commit()` in `app.js`; `ExpenseStore.save()` on Android |
| Adjust the shimmer | `.sk::after` and the `shimmer` keyframes in `styles.css` |
| Rename the app | `strings.xml`, `index.template.html`, `docs/STORE_LISTING.md`, README |
| Ship the web build | Edit sources → `python3 tools/build_web_preview.py` → push to `main` |
