# Privacy Policy — Saan Napunta?

Saan Napunta? is a personal expense tracker that works entirely offline.

## What is collected

Nothing is collected. There is no account, no server, no analytics, no advertising SDK,
and no crash reporting.

## Where your data lives

- **Web build:** expenses, budget and currency preference are stored in your browser's
  `localStorage` under the keys `saan-napunta-entries` and `saan-napunta-config`.
- **Android build:** the same data is stored in the app's private `SharedPreferences`
  file (`saan_napunta_prefs`), readable only by this app.

## If you sign in (optional)

Saan Napunta? works fully without an account. If you choose to sign in with Google to sync
between devices:

- **What is stored:** your expense records (amount, category, note, date), plus the account
  identifier and email address supplied by Google.
- **Where:** a single private document tied to your account, readable only by you.
- **What is never collected:** contacts, location, device identifiers, advertising IDs,
  browsing history, or analytics of any kind.
- **Deletion:** *Settings → Erase all data* removes the ledger from the device and from the
  synced copy; *Sign out* disconnects the account. See
  [delete-data.html](web/delete-data.html) for the full procedure, including how to request
  deletion by email.

Signing out never deletes the data on your device.

## Permissions

The Android app declares no permissions in the offline build. If optional sync is enabled it
requires `INTERNET` and nothing else. It does not access the internet, contacts,
storage, location, or the camera.

## Sharing

Data leaves the device only when you explicitly tap **Export CSV** and choose a
destination app yourself.

## Deleting your data

Use **Settings → Erase all data**, or uninstall the app / clear site data.
Deletion is immediate and irreversible.

Questions: open an issue on the repository.
