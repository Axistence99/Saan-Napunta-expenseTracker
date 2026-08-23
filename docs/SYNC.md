# Sync & Accounts — Saan Napunta?

Sign-in is **optional and additive**. With no account the app behaves exactly as before:
everything lives on the device, no network code runs, no SDK is loaded. Signing in adds a
synced copy of the ledger so the same data appears on the user's other devices.

---

## 1. Principles

1. **Offline is the default, not a fallback.** Every feature works signed out, forever.
2. **Local writes never block on the network.** The optimistic path is unchanged; sync
   happens after the local write has already succeeded.
3. **Signing out never deletes local data.** It only stops syncing.
4. **The merge is deterministic and pure**, so it can be unit-tested without a backend.
5. **The backend is swappable.** `app.js` knows nothing about Firebase.

## 2. Layers

```
app.js            owns the ledger, renders, writes locally
   │  readLocal() / writeLocal()
   ▼
sync.js  ── engine ── adapter ──►  mock cloud | Firebase | Drive appDataFolder
             │
             └── mergeLedgers()  pure, last-write-wins + tombstones
```

`app.js` hands the engine exactly two functions (`configure({ readLocal, writeLocal })`) and
calls `notifyLocalChange()` after each successful write. That is the whole contract.

## 3. Data model additions

| Field | Meaning |
| --- | --- |
| `updatedAt` | Epoch millis of the last edit. The merge orders by this |
| `deleted` | Tombstone flag. The record is kept so the delete can propagate |

Records without `updatedAt` (written before sync existed) are normalised on read using
`created`, so existing ledgers migrate silently.

## 3b. What does not sync

Photos are deliberately excluded. They live in a separate local bucket keyed by entry id;
only `photoCount` is part of the ledger. A single receipt would exceed a Firestore document
limit, and syncing images would turn a text-only privacy story into an image-hosting one.
Cross-device photo backup would need object storage and is out of scope.

## 4. Merge rules

- Group by `id`; for each id keep the record with the greater `updatedAt`.
- A tombstone is an ordinary record, so a newer delete beats an older edit, and a newer edit
  on another device beats an older delete (an intentional "undelete", not a bug).
- Tombstones older than **30 days** are purged so the ledger cannot grow forever.
- `sameLedger(a, b)` compares id/timestamp/deleted triples to avoid pointless writes.

Last-write-wins per *entry* — not per document — so two devices editing different expenses
never clobber each other. Two devices editing the *same* expense within the same
millisecond is the only lossy case, which is acceptable for a personal expense log.

## 5. Sync lifecycle

| Trigger | What happens |
| --- | --- |
| Boot | `init()` restores a session if one exists, then reconciles. Never blocks first paint |
| Sign in | Pull remote → merge → write local → push merged → subscribe to remote changes |
| Local write | Debounced 700 ms, then reconcile. Offline → counted into the queue instead |
| Remote change | Merge into local and repaint; self-echoes are ignored |
| Back online | `online` event triggers an immediate reconcile |
| Failure | Exponential backoff, 2 s doubling to a 30 s cap |
| Sign out | Unsubscribe, clear session. Local ledger untouched |

## 6. Status states

`offline-only` · `connecting` · `syncing` · `synced` · `queued` · `error`

Surfaced twice: a pill beside the tagline (hidden when signed out) and a detail row in
Settings, e.g. "Synced 3 min ago", "2 changes waiting for a connection".

## 7. Adapters

### `mock` (default, shipped)
Stores the remote ledger in `localStorage` under `saan-napunta-cloud:<uid>` and broadcasts
changes over a `BroadcastChannel`. **Open the app in two tabs to see real two-device sync**
— a change in one appears in the other. Sign-in returns a fixed demo account after a
simulated 900 ms. No network, so the preview and the offline build work unchanged.

### `firebase` (production)
Activated automatically when `window.SAAN_FIREBASE_CONFIG` exists. The SDK is loaded with a
dynamic `import()` from the CDN only at that point. Auth: `signInWithPopup` +
`GoogleAuthProvider`. Data: one document per user at `ledgers/{uid}`, live via `onSnapshot`.

### `drive` (alternative, not implemented)
Google sign-in plus the `drive.appdata` scope writes the ledger into a hidden folder in the
user's own Drive. You store nothing and run nothing; the tradeoff is no live push, so sync
happens on open and on change rather than instantly.

## 8. Enabling Firebase

1. Create a Firebase project; add a Web app.
2. **Authentication → Sign-in method → Google → Enable.** Add your Pages domain and
   `localhost` to Authorized domains.
3. **Firestore → Create database** in production mode.
4. Copy `web/js/firebase-config.example.js` to `web/js/firebase-config.js`, fill it in, and
   load it before `sync.js` in `index.template.html`. Rebuild with
   `python3 tools/build_web_preview.py`.
5. Publish these rules — they are what actually protect the data, since web API keys are
   public by design:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ledgers/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Free-tier reality check: Firebase Auth with the Google provider and Firestore's free quota
comfortably cover a personal-scale app. One document per user keeps reads at roughly one
per session plus live updates.

## 9. Android plan

Not yet implemented. The mapping is direct:

| Web | Android |
| --- | --- |
| `sync.js` engine | `SyncEngine.kt` with a coroutine scope |
| Adapter interface | `interface LedgerRemote { suspend fun pull/push; fun subscribe }` |
| Google sign-in | **Credential Manager** (`androidx.credentials`) — the legacy Google Sign-In API is deprecated |
| Firestore | `com.google.firebase:firebase-firestore-ktx`, offline persistence on by default |
| Retry/backoff | `WorkManager` with a network constraint |
| Status pill | A `TextView` in the header bound to a `StateFlow` |

This introduces the app's first dependencies and requires the `INTERNET` permission, so keep
it behind the same optional toggle.

## 10. Compliance checklist (only once sign-in ships)

- [ ] `PRIVACY.md` updated: what is stored, where, for how long
- [ ] `web/delete-data.html` published — satisfies Play, Apple, and Meta's Data Deletion
      Instructions URL requirement
- [ ] Play Data Safety form updated: collects email + user ID, data is encrypted in transit,
      user can request deletion
- [ ] In-app account deletion path exists (Erase all data + Sign out)
- [ ] OAuth consent screen configured with the privacy policy and deletion URLs
- [ ] If iOS ships with Google sign-in, add Sign in with Apple (App Store guideline 4.8)

## 11. Testing

Two tabs, same browser:

1. Sign in on both. Add an expense in tab A → it appears in tab B within a second.
2. Delete in tab B → the row disappears in tab A (tombstone propagated).
3. DevTools → Network → Offline in tab A. Add two expenses → the pill reads
   "2 changes waiting for a connection". Go back online → it flips to "Synced just now".
4. Sign out → local rows remain, the pill disappears.
5. Merge unit checks, no DOM needed:
   `SaanSync.mergeLedgers(local, remote)`, `SaanSync.purgeTombstones(list)`,
   `SaanSync.sameLedger(a, b)`.
