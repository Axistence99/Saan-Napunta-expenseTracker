# Architecture

Saan Napunta? has two independent implementations that share a data model and a visual language.
Neither talks to a network.

## Shared model

```
Expense {
  id: string        // "e" + epoch millis
  amount: number    // positive, 2 decimals
  category: string  // one of the 9 category ids
  note: string      // free text, may be empty
  date: string      // ISO day, "YYYY-MM-DD"
  created: number   // epoch millis, used as a tiebreaker in sorting
}

Config { budget: number, currency: string, weekStart: 0|1 }
```

Aggregations are computed on read — there are no cached totals to invalidate.
A month is identified by `date.slice(0, 7)`.

## Web build

```
index.template.html   structure (dashboard + two bottom sheets)
css/styles.css        theme tokens, gradient, cards, sheets
js/app.js             state, storage, rendering, event wiring
tools/build_web_preview.py  inlines CSS/JS into web/index.html
```

- State: three module-level variables (`entries`, `config`, `viewMonth`) plus sheet state.
- Persistence: `localStorage` keys `saan-napunta-entries` and `saan-napunta-config`.
- Rendering: one `render()` function rebuilds the summary, breakdown and entry list from
  the current month slice. Small enough that diffing is unnecessary.
- No build step for the source files; the Python tool only produces the single-file
  variant used by GitHub Pages and sandbox previews.

### Rendering pipeline

```
storage (promise based)  ->  aggregate cache  ->  render()  ->  paint()
```

**Skeleton shaders.** `paintSkeleton()` swaps every value node for a shimmering
placeholder. It runs during boot and whenever `render()` is asked for a month whose
aggregates are not cached, with the real paint deferred to the next animation frame so
the shimmer is actually visible instead of flashing.

**Optimistic rendering.** `commit(mutate, messages)` snapshots the entry list, applies the
mutation in memory, marks the touched row `pending`, and repaints immediately — the UI
never waits on the write. `storage.writeEntries()` resolves a tick later; on success the
pending flag is stripped, on failure the snapshot is restored and an error toast explains
the rollback. This matters even on localStorage, which throws on quota limits and in some
private-browsing modes.

**Caching.** `aggregatesFor(month)` memoises totals, per-category stats, per-day subtotals
and derived averages in an LRU map keyed by `month | dataVersion | currency`. Any mutation
calls `invalidate()`, which bumps `dataVersion` and clears the map — no manual cache
surgery. Neighbouring months are warmed during `requestIdleCallback`, so scrubbing through
the month picker is a cache hit.

**Tooltips.** One floating node, delegated `pointerover` / `focusin` handlers, driven by a
`data-tip` attribute. It sets `aria-describedby` on the anchor, flips below the anchor when
there is no room above, clamps to the viewport, and on touch shows for 2.2 s on tap.

## Android build

```
MainActivity          dashboard, settings dialog, CSV share
EntryActivity         add / edit / delete form
ExpenseStore          model + JSON in SharedPreferences + formatting helpers
GradientBackgroundView  ~2 fps radial gradient background
```

- UI is built in Kotlin with `LinearLayout` / `FrameLayout` / `ScrollView`; no XML layouts,
  matching the Bawal Scroll prototype.
- `MainActivity.onResume()` re-reads the store, so returning from `EntryActivity` refreshes
  the dashboard without result callbacks.
- The gradient view redraws every 500 ms to keep battery cost near zero.

## Why no framework

The feature set is a list, a form and a few sums. Vanilla JS and platform Views keep the
APK small, the page instant, and the whole project readable in one sitting.
