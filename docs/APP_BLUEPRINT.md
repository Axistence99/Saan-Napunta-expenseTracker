# App Blueprint — Saan Napunta?

A complete, implementation-free description of the app: every screen, element, interaction,
rule, colour and animation. Hand this file to any developer or AI coding agent and they
should be able to rebuild the app from scratch in any stack without seeing the source.

**How to use it as a prompt:** paste the whole file, then add one line such as
*"Build this as a React Native app with SQLite"* or *"Rebuild section 4 only, as a SwiftUI
view"*. Section 12 has ready-made prompt snippets.

---

## 1. One-paragraph summary

Saan Napunta? ("Where did it go?") is a private, offline expense tracker for everyday
Philippine peso spending. The user records a purchase in under five seconds — amount,
category, optional note — and the app answers one question: where did the money go this
month. It shows a monthly total, an optional budget meter, a per-category breakdown and a
day-grouped history. There is no account, no sync, no network call and no analytics; all
data lives on the device and can be exported to CSV or erased outright.

## 2. Product identity

| Attribute | Value |
| --- | --- |
| In-app / launcher name | Saan Napunta? |
| Store listing title | Saan Napunta - Expense Tracker (exactly 30 characters) |
| Tagline shown under the header | EXPENSE TRACKER |
| Currency | Philippine peso (₱) only — other currencies are deferred |
| Audience | Filipino students, employees and freelancers tracking daily gastos |
| Language | Plain English throughout the interface; the product name and merchant presets keep their Filipino terms |
| Personality | Direct, a little self-deprecating, never preachy. Uses light Taglish in marketing copy but plain English inside the app |
| Promise | Private by design. No account, no sync, no analytics |
| Credit line | Made by Aleksis Ong |

## 3. Design system

### Palette (dark only)

| Token | Hex | Used for |
| --- | --- | --- |
| Base black | `#07050B` | Page background, slightly violet-shifted |
| Surface | `#16101F` | Card fills (translucent `rgba(22,15,30,0.8)` on web) |
| Ink | `#F5EFE6` | Primary text, warm off-white |
| Grey | `#9A93A6` | Secondary text, stat labels |
| Grey dim | `#6F6878` | Disabled and tertiary text |
| Purple | `#8B5CF6` | Secondary accent: selection, progress, tooltip edges |
| Purple deep | `#4C1D95` | Gradient anchor |
| Orange | `#FF7E00` | Primary accent |
| Orange dark | `#C2410C` | Gradient end |
| Yellow | `#FFC53D` | Highlights, gradient tips, FAB |
| Gold | `#E9C46A` | Category icons, tagline, synced state, warnings |
| Brown | `#6B4A2F` | Warm neutral: bar bases, queued state |
| Brown deep | `#3A2618` | Over-budget gradient base |
| Danger | `#E5484D` | Over budget, destructive actions |
| Hairline | `rgba(245,239,230,0.14)` | 1 px borders |

Ordering rule: purple and black carry the structure, grey carries the quiet text, and the
orange to yellow to gold warm ramp carries anything that represents money. Brown sits under
the warm ramp as its darker base. No greens or blues anywhere.

### Background

A full-bleed animated backdrop: near-black with a violet vignette, a large blurred purple
radial circle anchored top-left and a warm orange-to-gold one bottom-right, drifting and
scaling slowly on alternating 18–30 second loops. It is decorative, never interactive, and slows down (never stops) under
reduced-motion settings. On mobile it runs at a deliberately low frame rate (~2 fps native)
to protect battery.

### Type and shape

- System sans-serif throughout; no downloaded font required.
- App title: large, tight letter-spacing (about −0.05 em), optically centred.
- Big money total: 2.3–3.2 rem, tight tracking, tabular figures.
- Section headings: 0.95 rem, uppercase, wide tracking, muted.
- Cards: 22 px radius, 1 px hairline border, translucent fill, backdrop blur.
- Inputs and chips: 14 px radius (chips fully rounded), 12–14 px padding.
- Icons: 24x24 line vectors, 1.6 px stroke, rounded caps. Never emoji.
- Content column caps at 460 px and centres on wider screens — it always looks like a phone app.

### Motion

| Element | Behaviour |
| --- | --- |
| Cards on load | Fade and rise 8 px, 320 ms, second card delayed 60 ms |
| New entry row | Springs in from −6 px, 260 ms, slight overshoot |
| Budget bar | Width transitions over 260 ms |
| Bottom sheets | Slide up 24 px with fade, 220 ms |
| Buttons and chips | Scale to 0.94–0.99 while pressed |
| Skeletons | 1.35 s shimmer sweep, left to right |
| Pending row | 1.1 s orange sweep loop |
| Tooltip | Fade and rise 3 px, 130 ms |

Everything has a reduced-motion fallback.

## 3b. Screen: Onboarding (first launch only)

A full-screen card over the animated background, shown once, with three progress dots that
stretch into a pill as the user advances. Every step animates in from the right.

**Step 1 — Profile.** Title "Create your profile", subtitle "Let's set up your profile. Everything here
stays on your device." Fields:

| Field | Control | Notes |
| --- | --- | --- |
| First name | Text, 32 | **Required** to continue; empty shows an inline error |
| Last name | Text, 32 | Optional, sits beside first name in a two-column pair |
| Birthdate | Native date picker | Capped at today |
| Province | Grouped dropdown | All 82 Philippine provinces in 18 optgroups by region, plus Metro Manila |
| Sex at birth | Dropdown | Female · Male · Prefer not to say |
| Occupation | Dropdown | Student · Employee · Entrepreneur · Prefer not to say · N/A |
| Currency | Locked row | Philippine peso only; shows a padlock and "More currencies are coming in a later update." |

Primary button "Continue"; below it a quiet "Skip for now" that completes onboarding with
no profile and no budget. Region grouping follows the PSGC after the 2024 creation of the
Negros Island Region, so Siquijor sits with the two Negros provinces, Western Visayas has
five and Central Visayas has two.

**Step 2 — Budget period.** Title "How do you budget?", subtitle "Pick the window you
actually think in. You can change it anytime." A 2×2 grid of selectable cards, each with an
emoji, a label and a one-line rationale:

| Card | Icon | Copy |
| --- | --- | --- |
| Daily | Sun | Baon or allowance per day |
| Weekly | Calendar with a single row | Good for weekly cash-outs |
| Monthly | Calendar grid | Matches your sweldo |
| Yearly | Concentric target | Big-picture target |

The selected card gets an orange border, tinted fill and an inner glow. Back / Continue.

**Step 3 — Amount.** Title "Set your budget", subtitle adapts to the choice ("How much can you spend
per week?"). A very large amount field prefixed with the currency symbol, four preset chips
scaled to the chosen period (daily 150/250/400/600 · weekly 1000/2000/3500/5000 · monthly
5000/10000/15000/25000 · yearly 60000/120000/250000/500000), and a live gold conversion line:
"That is about ₱286 a day · ₱8,697 a month · ₱104,357 a year". Back / "Start tracking", plus
"I'll set a budget later". Submitting zero or blank shows an error toast.

**Step 4 — Backup (optional).** Title "Keep a backup?", explaining that signing in syncs to
other devices, works offline without it, and can be done later in Settings. Offers
"Continue with Google" and "Start tracking", plus the note "Photos are never uploaded. Only
amounts, categories and notes sync."

On completion the profile is saved and the dashboard appears with a "Hi, {name}"
greeting above the month label. Onboarding never appears again unless data is erased.

## 4. Screen: Dashboard (the only main screen)

Vertical scroll, top to bottom:

1. **Header row** — three-column grid: empty spacer, centred title "Saan Napunta?", circular
   settings button (gear icon) on the right. Under it, a small uppercase orange tagline
   "GASTOS TRACKER" with wide letter-spacing.

2. **View controls** — a four-way segmented control (Day · Week · Month · Year) above a
   navigator: left arrow, the period label, right arrow. The label reads "Today", "This
   week", "This month" or "This year" while the current period is shown, otherwise the
   explicit period ("Aug 17–23, 2026", "July 2026", "2025"). The right arrow is disabled at
   the current period so the user can never page into the future, and a "Back to today"
   link appears whenever they have navigated away. Every card below follows the selection.

3. **Summary card**
   - Kicker: "This month", or the full month name when viewing a past month.
   - Big total for the selected month.
   - Budget meter, scoped to the user's chosen budget period. Left legend reads
     "₱X left this week"; right legend reads "Weekly ₱Y". When over budget the fill turns red
     and the left legend reads "₱X over budget". With no budget set the bar is empty and
     reads "No budget set" / "Add one in settings". When browsing a past month the meter
     falls back to comparing that month against the monthly-equivalent of the budget.
   - Three mini-stats separated by a hairline: **Today**, **Daily avg**, **Entries**.
   - Below the meter, a per-period budget control reading "Set a budget just for {period}",
     or "Custom budget for {period} — change" when an override exists. It opens an inline
     amount field with Save and Clear.

3. **By-category card** — heading "BY CATEGORY" with an "Export CSV" text action on the
   right. Each row: emoji glyph, category name above a thin share bar, and the amount with
   the percentage underneath in small muted text. Sorted highest first. Empty state:
   "No spending recorded for this month yet."

4. **Recent card** — heading "RECENT" with a month picker dropdown on the right. Entries are
   grouped under day dividers showing the pretty day ("Today", "Yesterday", "Mon, Aug 18")
   on the left and that day's subtotal on the right. Each entry row: category icon, name
   with the note (or "No note") beneath it, and the amount right-aligned. Tapping a row opens
   it for editing. Empty state: "Tap + to record your first gastos."

5. **Footer** — a gold development-build warning, the privacy line, and the credit line.

7. **Floating action button** — a 60 px circle pinned to the bottom-right of the content
   column, 18 px from the edge on phones and clear of the home indicator. Warm gradient
   (yellow into orange into a darker orange) with a top-left specular highlight, an inset
   rim light, and a soft purple halo behind it so it separates from the warm background.
   The plus is an **SVG icon, never a text glyph** — a typed "+" sits optically high in most
   fonts and cannot be centred reliably. Hover lifts it 2 px, press scales it to 0.93.

## 5. Screen: Add / Edit expense

A bottom sheet on web, a full screen on Android. Dim, blurred backdrop; tapping it or
pressing Escape closes without saving.

- Title: "Add expense" or "Edit expense", with a circular × close button.
- **Amount** — large numeric field prefixed by the current currency symbol in orange.
  Opens the decimal keypad. Autofocused. Required, must be greater than zero.
- **Category** — nine rounded chips in a wrapping grid, single-select, defaulting to Food.
  The selected chip gets an orange border, tinted background and lighter text.
- **Item** — what was bought, 60 characters, e.g. "Chickenjoy 2pc", "jeep fare".
- **Description** — optional 2-row textarea, 200 characters.
- **Photos** — up to three receipt images from the camera or gallery, shown as 76 px
  thumbnails with a remove button. Hint text reads "Receipts stay on this device", then
  "2/3 · stays on this device". Images are downscaled to 1200 px and re-encoded as JPEG.
- **Date** — native date picker, defaulting to today, past dates allowed.
- **Save** — full-width orange gradient button reading "Save expense" or "Save changes".
- **Delete this entry** — small red text button, shown only when editing, confirmed first.

## 6. Screen: Settings

A second bottom sheet with the same chrome.

- **Back up & sync** — account card, described in 10b.
- **First and last name** — side-by-side text fields.
- **Province** — the same grouped 82-province dropdown used in onboarding.
- **Occupation** — Student · Employee · Entrepreneur · Prefer not to say · N/A.
- **Budgets** — four independent fields in a 2x2 grid: Daily, Weekly, Monthly, Yearly. Any
  subset may be filled. A field left empty shows what it would work out to from the others,
  greyed as "₱394.22 (auto)". Clearing a field removes that standing budget.
- **Custom periods** — appears only when overrides exist. Lists each one ("Today ₱1,200.00")
  with a remove button, plus Clear all. Removing an override returns that period to the
  standing budget.
- **Currency** — locked to the Philippine peso, shown as a dashed read-only row with a padlock and a note that more are coming.
- **Week starts on** — Monday (default) or Sunday.
- **Erase all data** — outlined button that turns red on hover, with a confirmation prompt.
- Footer note: "Everything lives in this browser's local storage. Clearing site data deletes
  it permanently." (Reword appropriately per platform.)

## 7. Data model

```
Expense {
  id         string   "e" + timestamp + random suffix
  amount     number   > 0, rounded to 2 decimals
  category   string   one of the nine category ids
  merchant   string   legacy, only on records created before the field was retired
  item       string   what was bought, may be empty
  note       string   description, may be empty
  date       string   ISO day, "YYYY-MM-DD"
  created    number   epoch millis, tiebreaker when sorting a single day
  photoCount number   0-3; the images themselves live outside the ledger
}

Config {
  firstName    string   shown as "Hi, {firstName}"; may be empty
  lastName     string   may be empty
  birthdate    string   ISO day, may be empty
  province     string   one of the 82 provinces, or "Metro Manila"
  sexAtBirth   string   "female" | "male" | "undisclosed" | ""
  occupation   string   "student" | "employee" | "entrepreneur" | "undisclosed" | "na" | ""
  name         string   legacy display name, mirrors firstName
  budget       number   amount for one budgetPeriod; 0 disables the meter
  budgetPeriod   string  legacy, kept for migration only
  budgetDefaults object  standing budget per scope, e.g. { day: 500, week: 3000, month: 12000, year: 0 }
  budgets        object  per-period overrides, e.g. { "m:2026-08": 15000, "d:2026-08-23": 1200 }
  currency     string   always "₱" while other currencies are locked
  weekStart    number   0 = Sunday, 1 = Monday
  onboarded    boolean  false shows the onboarding flow
}
```

Transient, never persisted: `pending` (write in flight) and `failed` (write rolled back).

### Categories

| id | Label | Icon |
| --- | --- | --- |
| food | Food | Utensils |
| transport | Transport | Bus |
| bills | Bills | Lightning bolt |
| load | Load / Data | Signal bars |
| groceries | Groceries | Shopping cart |
| school | School | Graduation cap |
| health | Health | Cross in a circle |
| fun | Fun | Game controller |
| other | Other | Tag |

Iconography rule: 24x24 line icons, 1.6 px stroke, rounded caps and joins, rendered in the
current text colour and tinted orange in lists. No emoji anywhere in the product.

## 7a. View ranges

The dashboard shows exactly one range at a time, identified by a key that doubles as the
aggregate-cache key and the budget-override key:

| Scope | Window | Key | Entry grouping |
| --- | --- | --- | --- |
| Day | The single day | `d:2026-08-23` | By day |
| Week | Week containing the day, honouring the week-start setting | `w:2026-08-17` | By day |
| Month | Calendar month | `m:2026-08` | By day |
| Year | Calendar year | `y:2026` | **By month** |

Stepping moves a whole period at a time. Navigation into a period that has not begun is
blocked. Saving an expense moves the view to the period containing that expense's date.
CSV export covers the visible range and is named after its key.

## 7b. Budget period rules

- The active window always contains today: day = today; week = weekStart..+6 days;
  month = 1st..last; year = Jan 1..Dec 31.
- Days remaining **includes today**, so the final day of a period reads "last day", never
  "0 days left".
- Safe spend per day = amount left ÷ days remaining.
- Changing the period in Settings converts the existing amount using 1 day : 7 days :
  30.44 days : 365.25 days, and tells the user the new figure.
- **Standing budgets per scope.** Daily, weekly, monthly and yearly budgets are independent
  values, not one figure converted. Setting a ₱500 daily budget does not touch the ₱12,000
  monthly one.
- **Resolution order** for any period on screen:
  1. an override saved for that exact period, shown as "Custom ₱1,200.00"
  2. the standing budget for that scope, shown as "Daily budget ₱500.00"
  3. the closest scope that is set, converted, shown as "Budget ₱394.22"
  4. nothing, in which case the meter reads "No budget set"
- **Per-period overrides.** Any single day, week, month or year can carry its own budget, so
  no two days need the same figure. A ₱1,200 Saturday leaves every other day on ₱500.
- Profiles written before per-scope budgets existed carried one `budget` plus a
  `budgetPeriod`; that pair migrates into the matching scope on first read.
- The budget meter is period-scoped; the breakdown and history stay monthly.

## 7c. Merchant field (retired)

The entry form no longer asks where the money was spent; item and description cover it.
The `merchant` field stays in the data model so records created earlier keep their value:
it is still shown in entry subtitles and exported to CSV, and editing an old record
preserves it rather than blanking it. Nothing writes a new merchant.

## 7d. Photos

- Maximum three per expense, downscaled to a 1200 px longest edge and JPEG-encoded at 0.72.
- Stored in a bucket separate from the ledger, keyed by entry id, so a storage failure can
  never cost the expense itself; the entry keeps only a `photoCount`.
- **Never synced.** A receipt would exceed both browser storage quota and a cloud document
  limit, and users are told explicitly that photos stay on the device.
- Deleting an expense deletes its photos; erasing all data clears the whole bucket.
- Entry rows show a small camera badge with the count.

## 7e. Input limits

Every limit is enforced three ways: as a native attribute so the picker cannot offer a bad
value, as a check on submit with an inline message, and again when data is read back from
storage or arrives from another device.

| Field | Rule | Message when broken |
| --- | --- | --- |
| Birthdate | Not in the future; age 13 to 120 | "Birthdate cannot be in the future." / "You need to be at least 13 to use this app." / "Please check the year — that is over 120 years ago." |
| First / last name | Letters, marks, spaces, hyphens, apostrophes, periods; 32 chars | "First name can only contain letters, spaces, hyphens and apostrophes." |
| Expense amount | Greater than 0, at most 10,000,000 | "Enter an amount greater than zero." / "Amount cannot be negative." / "That is over the ₱10,000,000.00 limit." |
| Expense date | Not in the future, not older than 10 years | "You cannot log an expense in the future." / "Expenses older than 10 years cannot be added." |
| Budget | 0 to 100,000,000 (0 disables the meter) | "That is over the ₱100,000,000.00 limit." |
| Item / description / merchant | 60 / 200 / 40 characters, whitespace collapsed, control characters stripped | Truncated silently |
| Photos | Images only, 12 MB each before compression, 3 per expense | "Only image files can be attached." / "That image is too large to attach." / "Only 3 photos per expense." |
| Province, sex, occupation, period | Must match a known option, otherwise cleared | Silent |
| Currency | Forced to ₱ on read, whatever is stored | Silent |

Invalid fields get a red border, an `aria-invalid` flag and a message underneath; the first
offending field receives focus. Errors clear as soon as the value becomes valid.

Names accept any script, so "María-José", "Ñoña" and non-Latin names all pass; only digits,
symbols and markup are rejected.

## 8. Business rules

1. A month is identified by the first seven characters of `date`.
2. Entries sort by date descending, then by `created` descending within a day.
3. Amounts round to two decimals on save; zero and negatives are rejected with an inline error.
4. Daily average = month total ÷ days elapsed for the current month, or ÷ days in month for
   past months.
5. The budget meter fills to a maximum of 100 % and switches to the danger colour once the
   total exceeds the budget.
6. Editing an entry's date moves the dashboard view to that entry's month.
7. The month picker lists the current month plus every month that has at least one entry,
   newest first.
8. Deleting anything requires a confirmation step.
9. CSV columns are `date,category,merchant,item,description,amount`; every cell is quoted, embedded quotes are
   doubled; the filename is `saan-napunta-YYYY-MM.csv`.
10. Nothing leaves the device unless the user explicitly exports.

## 9. Behavioural patterns (required, not optional polish)

### Skeleton shaders
On first load, and whenever the user opens a month whose totals are not cached, every value
region renders as a shimmering placeholder instead of blank space or a spinner: the big
total, the budget legend, the three mini-stats, three category rows and four entry rows.
The shimmer is orange-tinted to match the brand. Real content replaces it on the next frame;
empty-state text is suppressed while skeletons are showing so it cannot flash.

### Optimistic rendering
Saving, editing, deleting and erasing all update the UI **before** the write completes. A
newly added row appears instantly with a "Saving…" subtitle and a looping orange sweep, and
totals recalculate right away. When the write resolves, the pending styling drops away and a
confirmation toast appears. If the write fails, the previous state is restored exactly and a
red toast explains the rollback. A row that is still saving cannot be opened for editing.

### Caching
All derived numbers for a month — total, per-category totals and counts, per-day subtotals,
today's total, daily average, days remaining — are computed once and memoised, keyed by
month plus a data version plus the active currency. Any mutation bumps the version, which
invalidates everything at once. The previous and next month are pre-computed while the
device is idle so month switching is instant. Cache hit and recompute counts are exposed in
the big total's tooltip as a debugging aid.

### Tooltips
Any element can opt in by declaring hint text. One shared floating bubble is positioned
above the anchor, flips below when there is no headroom, clamps to the viewport, appears on
hover and on keyboard focus, and is linked to the anchor for screen readers. On touch, a tap
peeks the tooltip for about two seconds. Required hints:

| Element | Tooltip content |
| --- | --- |
| Big total | Entry count for the month, plus cache hit/recompute stats |
| Budget meter | Percent of budget used, days left, safe spend per day — or the amount over budget |
| Today | "Spent so far on {pretty date}" |
| Daily avg | The actual division, e.g. "₱4,120 ÷ 18 days so far" |
| Entries | "Number of expenses recorded this month" |
| Category row | Entry count, average per entry, share of the month |
| Entry row | Date, category, note, and "tap to edit" |
| Settings button | "Budget, currency and data controls" |
| Add button | "Record a new expense" |
| Export | "Download this month as a CSV spreadsheet" |
| Month picker | "Browse a different month" |

## 9b. Small-screen rules

- Content column is 460 px maximum and centred; below that it is fluid with 16–20 px gutters.
- Paired fields (first/last name, sex/occupation, the four budget inputs) collapse to a
  single column below 400 px.
- Inputs are at least 16 px on phones, otherwise iOS zooms the page on focus.
- Native date inputs need explicit `width: 100%`, `min-width: 0` and `appearance: none`;
  they carry an intrinsic width and will otherwise overflow a grid cell. Their picker icon
  is filtered to gold, since the default is near-black on a dark field.
- Every grid child that holds text sets `min-width: 0`, otherwise long merchant names widen
  the row instead of ellipsising.
- Bottom spacing, the sheet and the action button all respect `env(safe-area-inset-bottom)`.
- The onboarding card scrolls internally and is capped to the visible viewport height, so
  the profile step stays usable on short screens.

## 10. Accessibility

- A visually hidden live region announces load state, saves, deletions and errors.
- Category chips expose a pressed state; the tooltip anchor uses a described-by relationship.
- Escape closes any open sheet; backdrop taps do the same.
- Focus rings are orange with a 3 px offset and are never removed.
- Colour is never the only signal: over-budget shows red **and** changes wording.
- All animation respects reduced-motion preferences.

## 10b. Optional account and sync

The app must be completely usable with no account, forever. Sign-in is additive only.

- Settings shows a "Back up & sync" card with a white **Continue with Google** button and
  the note that the app works completely offline without an account.
- Signed in, the card shows an avatar circle, name, email, a live sync status line
  ("Synced 3 min ago"), a **Sync now** action and **Sign out**.
- A small status pill appears next to the tagline in the header: a coloured dot plus a word
  — Synced (green), Syncing (orange, pulsing), Queued (gold), Sync issue (red). Hidden when
  signed out. Tapping it opens Settings.
- Local writes never wait for the network. Changes made offline are counted and the pill
  reads "N changes waiting for a connection", flushing automatically when connectivity returns.
- Merge rule: per-entry last-write-wins on an `updatedAt` timestamp, with deletions kept as
  tombstones so they propagate. Tombstones are purged after 30 days.
- Signing out stops syncing and never deletes local data.
- Deleting data must remove it from both the device and the synced copy.

## 11. Explicit non-goals

Multi-currency conversion, income tracking, recurring
bills, receipt photos, shared wallets, bank imports, ads, notifications, and any analytics.
Sync is limited to one user's own devices — there is no sharing between people.

## 12. Ready-made prompts

**Full rebuild**
> Build a mobile expense tracker exactly as described in the blueprint below. Use
> {React Native + SQLite | SwiftUI + SwiftData | Flutter + Hive}. Implement every screen,
> rule and behavioural pattern in sections 4–10, including skeleton shaders, optimistic
> rendering with rollback, memoised aggregates, and tooltips. Offline only — no network code.

**Single screen**
> Implement section 4 (Dashboard) of the blueprint below as a single {SwiftUI View |
> Jetpack Compose screen}. Follow the design system in section 3 exactly. Stub the data
> layer with the model in section 7.

**Design only**
> Produce a Figma-ready spec / high-fidelity mockup for the app described below. Dark theme,
> one phone screen plus two bottom sheets, using the palette and motion rules in section 3.

**Feature addition**
> Using the blueprint below as the existing product definition, design and specify
> {income tracking | recurring bills | a weekly view}. Keep the non-goals in section 11 in
> mind, match the existing design system, and describe the new tooltips, cache keys and
> optimistic flows the feature needs.

**Marketing**
> Write App Store and Play Store copy for the app described below, targeting Filipino
> users. Play title max 30 characters, short description max 80.
