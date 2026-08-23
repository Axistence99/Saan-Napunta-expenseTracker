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
6. **Budget** — set 1000 in settings; meter fills. Add entries past 1000 → meter turns
   red and the legend reads "… over budget".
7. **Currency** — switch to `$`; every amount and the entry sheet symbol update.
8. **Month picker** — add an entry dated last month, switch months, verify the summary,
   breakdown and list all follow the selection.
9. **CSV** — Export CSV downloads `saan-napunta-YYYY-MM.csv`; a note containing a quote
   character stays properly escaped.
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
16. **Merchant presets** — open the sheet: Food shows Jollibee, McDonald's, Chowking…
    Switch category to Transport and the row becomes Jeep, Tricycle, Bus, Grab… Tap a preset,
    then tap it again to clear. "Type it instead" swaps to free text and keeps the value.
17. **Item and description** — save an expense with item "Chickenjoy 2pc" at Jollibee with a
    note. The row title reads the item and the subtitle reads "Jollibee · note".
18. **Photos** — attach up to three images; a fourth cannot be added. Remove one and the
    adder returns. The row shows a camera badge with the count. Reopen the entry: the
    thumbnails are still there. Delete the entry and confirm the media bucket shrinks.
19. **Photo quota** — fill localStorage first; saving should keep the expense, drop the
    photos, and show "Expense saved, but there was no room for the photos."
20. **CSV** — the export now has merchant, item and description columns.
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
7. Export CSV opens the system share sheet with the month's rows.
8. Rotate the device and reopen — data is intact (it is read from SharedPreferences).
9. Erase all data → empty state returns.

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
