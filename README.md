# Saan Napunta?

> **Status: in active development.** This is a prototype, not a finished product. Features
> and the data format still change between commits, and a stored ledger may not survive an
> update. Export a CSV before clearing site data or reinstalling.

**In-app / launcher name:** Saan Napunta? · **Store listing title:** Saan Napunta - Expense Tracker
(30 characters, the Play Store maximum — see [docs/STORE_LISTING.md](docs/STORE_LISTING.md)).

A minimal, offline-first expense tracker built with the same stack as
[Bawal Scroll](https://github.com/Axistence99/Bawal-Scroll) — no frameworks, no accounts, no network.

- **Web prototype** — vanilla HTML/CSS/JS with `localStorage` persistence and the same
  black-and-orange drifting gradient, sized for a phone screen.
- **Native Android prototype** — Kotlin, plain `Activity` + programmatic views, data in
  `SharedPreferences` as JSON. No Compose, no third-party dependencies.

## Features

- Add, edit and delete expenses (amount, category, date, note)
- 9 quick categories: Food, Transport, Bills, Load/Data, Groceries, School, Health, Fun, Other
- Monthly total, today's total, daily average and entry count
- Independent daily, weekly, monthly and yearly budgets, plus overrides so a single day, week, month or year can differ from the rest
- Per-category breakdown with share bars
- Day / week / month / year views with a period navigator
- CSV export (download on web, share sheet on Android)
- Philippine peso only for now; the data model stays currency-aware for a later update
- Erase-all-data control; nothing leaves the device unless you opt in
- **Optional Google sign-in** for cross-device sync — off by default, app is fully usable without it

## Project layout

```
saan-napunta/
├── README.md
├── LICENSE
├── PRIVACY.md
├── .gitignore
├── docs/
│   ├── ARCHITECTURE.md
│   ├── STORE_LISTING.md
│   ├── CODEBASE_GUIDE.md
│   ├── APP_BLUEPRINT.md
│   ├── SYNC.md
│   ├── SPECIFICATIONS.md
│   └── TESTING.md
├── tools/
│   └── build_web_preview.py
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── web/
│   ├── index.html              # generated standalone build (inlined CSS + JS)
│   ├── index.template.html     # readable HTML source template
│   ├── delete-data.html        # data deletion instructions (Play / Apple / Meta)
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       ├── sync.js             # optional account + sync layer
│       └── firebase-config.example.js
└── android/
    ├── README.md
    ├── settings.gradle.kts
    ├── build.gradle.kts
    └── app/
        ├── build.gradle.kts
        └── src/main/
            ├── AndroidManifest.xml
            ├── java/com/example/saannapunta/
            │   ├── MainActivity.kt
            │   ├── EntryActivity.kt
            │   ├── ExpenseStore.kt
            │   └── GradientBackgroundView.kt
            └── res/
                ├── drawable/
                ├── values/
                └── xml/
```

## Quick start: web prototype

```bash
python3 -m http.server 8080 --directory web
# open http://localhost:8080
```

Edit `web/index.template.html`, `web/css/styles.css` and `web/js/app.js`, then regenerate the
standalone single-file build (the sandbox/file viewer does not load external assets):

```bash
python3 tools/build_web_preview.py
```

`web/index.html` is generated — never edit it by hand.

## Quick start: Android prototype

```bash
cd android
./gradlew assembleDebug          # or open the android/ folder in Android Studio
adb install app/build/outputs/apk/debug/app-debug.apk
```

Requirements: JDK 17, Android SDK 35, `minSdk` 26. No runtime permissions are requested.

## Documentation

| File | Read it when |
| --- | --- |
| [docs/CODEBASE_GUIDE.md](docs/CODEBASE_GUIDE.md) | You need to find or change code — every folder, file and function explained |
| [docs/APP_BLUEPRINT.md](docs/APP_BLUEPRINT.md) | You want to rebuild, redesign or extend the app — a promptable, stack-free description of every screen, rule and interaction |
| [docs/SYNC.md](docs/SYNC.md) | You are working on accounts, sync, merge rules or the Firebase setup |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | You want the rendering pipeline: cache, skeletons, optimistic writes |
| [docs/SPECIFICATIONS.md](docs/SPECIFICATIONS.md) | You need the product rules and category list |
| [docs/TESTING.md](docs/TESTING.md) | You are about to ship |
| [docs/STORE_LISTING.md](docs/STORE_LISTING.md) | You are filling in the Play Console or App Store Connect |

## Privacy

Every peso you log stays in browser `localStorage` or app `SharedPreferences`.
See [PRIVACY.md](PRIVACY.md).

Made by Aleksis Ong.
