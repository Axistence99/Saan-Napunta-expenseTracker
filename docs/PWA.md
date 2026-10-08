# PWA, Home Screen Shortcuts and Widgets

## Web installation

`web/manifest.webmanifest` makes the GitHub Pages build installable with:

- Standalone display mode
- Portrait orientation
- Philippine Cash launch colors
- Owner-provided artwork rendered as 192 px, 512 px, maskable and Apple Touch icons
- Add Expense shortcut
- Records shortcut

The source artwork is preserved at `branding/app-icon-source.png`; generated web and Android derivatives keep platform-specific dimensions and safe padding.

## Offline reopening

`web/sw.js` caches the application shell after the first successful visit. Navigation uses network-first behavior so updates remain visible, with cached `index.html` as the offline fallback. Same-origin static assets use cache-first behavior and are added as they are requested.

When changing cached shell assets, increment `CACHE_NAME` in `web/sw.js`.

## Web shortcut routes

- `?action=add` opens the expense editor after onboarding.
- `?view=records` opens Records after onboarding.
- Shortcut query parameters are removed from the address after routing.

## Native Android long-press shortcuts

`android/app/src/main/res/xml/shortcuts.xml` declares:

- Add expense
- Records

`MainActivity.handleLauncherAction()` routes these explicit actions. Add opens `EntryActivity`; Records scrolls to the native records section.

## Android Home Screen widget

`SpendingWidget.kt` displays:

- Spending today
- Spending this month
- Add Expense action
- Tap-card action to open the app

`ExpenseStore` requests widget refresh after ledger or budget writes.

## iOS

Safari Add to Home Screen uses the manifest metadata and Apple Touch icon. Native iOS widgets, App Intents, Siri Shortcuts and Quick Actions are documented as deferred work in `ios/README.md`.
