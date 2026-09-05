# Saan Napunta?

> **Status: in active development.** This is a prototype, not a finished product. Features
> and the data format may still change between commits.

- **Web prototype** — vanilla HTML/CSS/JS with `localStorage` persistence and a responsive
  woven-aurora background, sized for a phone screen.
- **Native Android prototype** — Kotlin, plain `Activity` + programmatic views, data in
  `SharedPreferences` as JSON. No Compose, no third-party dependencies.

## Features

- Add, edit and delete expenses (amount, category, date, note)
- 9 quick categories: Food, Transport, Bills, Load/Data, Groceries, School, Health, Fun, Other
- Period total, today's total and entry count
- Independent daily, weekly, monthly and yearly defaults set in Profile, plus exact-period custom budgets; values never convert across scopes
- Day/week/month/year category analytics and an adaptive interactive spending graph
- Day / week / month / year views with a period navigator
- Philippine peso only for now; the data model stays currency-aware for a later update
- Erase-all-data control; nothing leaves the device unless you opt in
- **Optional Google sign-in** for cross-device sync — off by default, app is fully usable without it

## Project layout

```
saan-napunta/
├── README.md
├── LICENSE
├── PRIVACY.md
├── CREDITS.md                 # creator, testers and product feedback credits
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
| [CREDITS.md](CREDITS.md) | You want to see who created, tested or gave feedback on the application |

## Credits

Created and maintained by **Aleksis Ong**.

Application testing was provided by **Geraldine Camarines** and **Xanjo Opeña**. Geraldine Camarines also contributed product suggestions and feedback.

See the complete [project credits and tester acknowledgments](CREDITS.md).

## Privacy

Every peso you log stays in browser `localStorage` or app `SharedPreferences`.
See [PRIVACY.md](PRIVACY.md).
