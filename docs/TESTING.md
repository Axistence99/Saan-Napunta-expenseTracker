# Testing

Manual checklist — both builds are dependency-free, so there is no test runner.

## Web

```bash
python3 tools/build_web_preview.py
python3 -m http.server 8080 --directory web
```

1. **First run** — empty state shows "Tap + to record your first gastos." and ₱0.00.
2. **Add** — tap +, enter 250, pick Transport, save. Total, Today, Entries and the
   category bar all update; a toast confirms.
3. **Validation** — save with an empty or 0 amount → toast, sheet stays open.
4. **Edit** — tap an entry, change amount and category, save changes; list reflects both.
5. **Delete** — open an entry, Delete this entry → row disappears, totals recompute.
6. **Budget** — set 1000 from the active Home period; its meter fills. Add entries past
   1000 → the meter turns red. Switch scope and verify the other scope remains unset.
7. **Currency** — no picker exists; both the onboarding step and Settings show a locked ₱ row. A profile stored with `"currency":"$"` is corrected to ₱ on load.
8. **Month picker** — add an entry dated last month, switch months, verify the summary,
   breakdown and list all follow the selection.
10. **Persistence** — reload the page; everything survives. Erase all data clears it.
11. **Skeletons** — hard-reload: shimmer placeholders appear, then resolve to real values.
    Switch to a month you have not opened yet → shimmer for one frame, then content.
12. **Optimistic write** — save an expense; the row appears instantly with a "Saving…"
    label and an orange sweep, then settles. Totals update before the write resolves.
13. **Rollback** — in DevTools, throttle or fill storage (or run
    `localStorage.setItem('x', 'y'.repeat(6e6))` first); saving should restore the previous
    list and show a red error toast.
14. **Cache** — hover the big total: the tooltip reports hits vs recomputes. Flip between
    two months repeatedly; hits should climb while recomputes stay flat.
15. **Tooltips** — hover the budget meter (shows % used, days left, safe daily spend), a
    category row (entry count and average), and the mini-stats. Tab to a category row and
    confirm the tooltip appears on focus and is announced via `aria-describedby`. On a
    phone, tap a category row to peek.
16. **Entry form** — amount, category, item, description, photos and date. There is no
    merchant field; a record created before it was retired still shows its merchant in the
    subtitle and keeps it when edited.
17. **Item and description** — save an expense with item "Jeep fare" and a note. The row
    title reads the item and the subtitle reads the note.
18. **Photos** — attach up to three images; a fourth cannot be added. Remove one and the
    adder returns. The row shows a camera badge with the count. Reopen the entry: the
    thumbnails are still there. Delete the entry and confirm the media bucket shrinks.
19. **Photo quota** — fill localStorage first; saving should keep the expense, drop the
    photos, and show "Expense saved, but there was no room for the photos."
21. **Keyboard/a11y** — Escape closes sheets, tapping the backdrop closes them, the
    status line announces the latest action.

## Android

```bash
cd android && ./gradlew assembleDebug
```

1. Launch → dashboard renders with the drifting gradient behind it.
2. FAB → EntryActivity; amount keypad is numeric-decimal.
3. Save → returns to the dashboard, which refreshes in `onResume()`.
4. Tap a row → edit; long-press a row → delete confirmation.
5. Date picker defaults to today and accepts past dates.
6. Settings dialog: budget and currency persist across app restarts.
8. Rotate the device and reopen — data is intact (it is read from SharedPreferences).
9. Erase all data → empty state returns.

## View ranges and per-period budgets

1. Switch between Day, Week, Month and Year: the total, breakdown and history all follow,
   and the label reads "Today" / "This week" / "This month" / "This year".
2. Step back with the left arrow; the label becomes explicit ("July 2026") and "Back to
   today" appears. The right arrow is disabled at the current period.
3. In Year view the history groups by month rather than by day.
4. Set a ₱12,000 budget for this month. Day and Week must still read "No budget set".
5. Set a ₱400 budget for today: the button changes to "Custom budget for Today — change",
   and `config.budgets` gains `"d:YYYY-MM-DD": 400`. Step to another day and it remains
   unset. Clear removes only today's key.
6. Save an expense dated last month: the view jumps to that period.

## Expense detail

1. Tapping a row opens the detail sheet; the editor must not open.
2. Category, date, item and description are listed; a record with no description shows a
   dash. An older record carrying a merchant also shows a Where row.
3. The footer shows when the expense was added, and an edited time only when it differs.
4. Photos appear as thumbnails; tapping one opens the viewer. Escape closes the viewer but
   leaves the detail sheet open; a second Escape closes the sheet.
5. Edit this expense opens the editor prefilled, including previously attached photos.
6. Delete asks for confirmation naming the item and amount, then removes the record and its
   photos from the media bucket.
7. Storage safety: put a non-image string into `saan-napunta-media` by hand. It must not
   render, must not execute, and must not survive the next save.

## Amount steppers

1. The browser's native up/down arrows must not appear on any number field.
2. From empty, plus gives 10, then 20 … 100; the next tap gives 150, and from 1,000 it
   gives 1,100.
3. Minus from 5 lands on empty, not a negative, and then disables.
4. Press and hold the plus: the value should accelerate rather than tick at a fixed rate.
5. Quick-add chips add to the current value rather than replacing it.
6. Plus stops at ₱10,000,000.

## Mobile layout

1. At 360 px wide, first/last name and sex/occupation stack in one column; nothing overflows
   horizontally.
2. The birthdate and expense date fields fill their cell, and the calendar icon is visible
   against the dark background.
3. Tapping any input on iOS must not zoom the page.
4. The action button sits inside the content column on a tablet and 18 px from the edge on a
   phone, above the home indicator. Its plus is an SVG and is optically centred.
5. A long merchant plus note ellipsises rather than widening the row.
6. On a short screen, the profile step scrolls inside its card.

## Records analytics graph and date picker

1. Switch Day / Week / Month / Year; overview, graph and category totals must all use the
   exact selected range. The graph shows 1, 7, calendar-day, and 12 monthly buckets respectively.
2. Previous/next changes one complete analytics period and Next cannot enter a future period.
3. The dashed average line appears for multi-bucket ranges with spending.
4. Clicking or pressing Enter/Space on a day bar toggles that date in combined records.
5. The full calendar is absent from the normal scroll flow. **Choose dates** opens it as a
   bottom sheet; Done, close, backdrop and Escape dismiss it.
6. The popup supports multiple dates, and tapping a selected date again removes it.

## Themes

1. A new profile starts in Philippine Cash; Settings shows Goldrora, Monochrome, Philippine Cash, Light and Dark.
2. Selecting a card updates the entire interface immediately and marks only that card selected.
3. Light sets the browser color scheme to light; every other option sets it to dark.
4. In Light, primary, secondary and tertiary text must remain distinct and reach at least
   4.5:1 contrast against the warm-paper cards; verify inputs, dates, charts and navigation.
5. Light tooltips use white text on black, and the plus button, primary actions, active tabs,
   selected dates, selected chips and selected navigation use black instead of warm gradients.
6. Profile, Records, dialogs, steppers, progress fills and developer elements contain no inherited
   brown-yellow background gradient in Light; theme preview thumbnails are the only exception.
7. Reload the page; the selected theme must persist from local configuration.
8. Monochrome removes warm/purple accents while preserving readable contrast. Verify its
   silver title treatment, stronger heading hierarchy, graphite cards, selected navigation,
   floating plus button, set-budget action, focus rings and selection glows.
9. Philippine Cash changes those same action fills and glows to its six denomination colors.
10. Philippine Cash shows a visible semi-transparent pile of plain solid-color note shapes.
   The blocks must have no internal artwork, text, borders, portraits, seals, serial numbers,
   denominations or copied banknote design, and must not change application data.
11. Load a stored invalid theme value; the app must safely return to Philippine Cash.

## Budget defaults and custom periods

1. **Profile defaults** — set Daily ₱500, Weekly ₱3,000 and Monthly ₱12,000 in Profile.
   Each matching Home scope uses its own value.
2. **No cross-scope conversion** — leave Yearly blank. Year must show the highlighted
   “SET A BUDGET FOR THIS YEAR” action and must not derive a value from other scopes.
3. **Custom priority** — set today to ₱700 on Home. Today uses ₱700 while another day uses
   the ₱500 daily default.
4. **Clear** — clearing today's custom key makes the ₱500 daily default apply again and does
   not alter another scope.
5. **Settings** — verify there are no profile or budget fields in Settings.
6. **Validation** — negative and over-limit Profile defaults are rejected; blank is accepted
   as no default.

## Input limits

1. **Birthdate** — 2030 is refused as future, a 2020 birthdate is refused as under 13, 1880
   is refused as over 120, a normal date passes. The picker itself is capped to the valid
   window.
2. **Names** — "Juan123" is refused; "María-José O'Brien" is accepted.
3. **Amount** — 0, negative, and anything over 10,000,000 are refused with distinct messages.
4. **Expense date** — tomorrow and anything older than 10 years are refused.
5. **Budget** — 0 disables the meter; over 100,000,000 is refused.
6. **Photos** — a PDF is refused, a >12 MB image is refused, a fourth photo is refused.
7. **Tampered storage** — paste junk into `localStorage` (unknown province, `budget: 5e12`,
   `date: "not-a-date"`, a category that does not exist) and reload: the bad entry is
   dropped, values are clamped, unknown options are cleared, and the corrected config is
   written back.

## Regression watch: duplicated markup

`index.template.html` once ended up with two copies of the entry sheet and the settings
panel, one of them stale. Nothing looked broken because both were `hidden` and
`getElementById` silently used the first, but half the settings controls were unreachable.
After editing the template, check that every id appears exactly once:

```bash
grep -o 'id="[^"]*"' web/index.template.html | sort | uniq -d
```

That command should print nothing.

## Regression watch: the hidden attribute

`styles.css` declares `[hidden] { display: none !important; }` near the top. Without it any
element that is also a flex or grid container — onboarding steps, both bottom sheets, the
account card, the merchant chip row, the photo adder, the sync pill — stays on screen when
JavaScript toggles `hidden`, and the whole onboarding stacks into one long page.

Do not remove that rule, and when testing visibility assert on
`getComputedStyle(el).display`, not on `el.hidden`. The property can be true while the
element is still painted.

## Known limitations

- Both builds are single-device; there is no backup or sync.
- The web build's data is tied to the browser profile and origin.
- Very large ledgers (10k+ rows) will make the JSON blob approach feel slow.
