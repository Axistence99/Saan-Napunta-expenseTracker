# Saan Napunta? — Android prototype

Kotlin, plain `Activity` classes with programmatic views. No Compose, no AndroidX,
no third-party libraries — the same approach as the Bawal Scroll Android prototype.

## Build

```bash
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

JDK 17 · compileSdk 35 · minSdk 26 · targetSdk 35

## Source map

| File | Role |
| --- | --- |
| `MainActivity.kt` | Dashboard: month total, budget meter, category breakdown, entry list, settings dialog, CSV share |
| `EntryActivity.kt` | Add / edit / delete a single expense |
| `ExpenseStore.kt` | `Expense` model, category list, SharedPreferences+JSON persistence, date and money helpers |
| `GradientBackgroundView.kt` | Low-frame-rate black-and-orange gradient background (~2 fps) |

## Notes

- The whole ledger is one JSON array in `SharedPreferences`. That is fine for a personal
  log of a few thousand rows; swap in Room if the ledger grows or multi-device sync is added.
- Entry rows: tap to edit, long-press to delete.
- No permissions are declared; CSV export goes through `ACTION_SEND` so the user picks the target.
