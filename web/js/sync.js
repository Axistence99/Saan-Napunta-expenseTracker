/**
 * Saan Napunta? — sync layer
 *
 * The app is offline-first. Everything below is optional: if the user never signs in,
 * none of this runs and the ledger stays purely local.
 *
 * Shape:
 *   adapter  — talks to a backend (mock / firebase / drive). Swappable.
 *   engine   — owns auth state, the merge, the dirty queue and the retry loop.
 *   merge    — pure, last-write-wins per entry with tombstones. Unit-testable.
 *
 * Exposed as window.SaanSync so it can be inlined into the single-file build without
 * module plumbing.
 */

(function (global) {
  "use strict";

  const CLOUD_PREFIX = "saan-napunta-cloud";
  const SESSION_KEY = "saan-napunta-session";
  const CHANNEL = "saan-napunta-cloud";
  const TOMBSTONE_TTL_DAYS = 30;
  const PUSH_DEBOUNCE_MS = 700;
  const RETRY_BASE_MS = 2000;
  const RETRY_MAX_MS = 30000;

  /* ==========================================================
     Merge — pure functions, no I/O
     ========================================================== */

  /** Newest `updatedAt` wins. Tombstones are records too, so deletes propagate. */
  function mergeLedgers(local, remote) {
    const byId = new Map();
    const take = (entry) => {
      if (!entry || !entry.id) return;
      const existing = byId.get(entry.id);
      if (!existing || stamp(entry) > stamp(existing)) byId.set(entry.id, entry);
    };
    local.forEach(take);
    remote.forEach(take);
    return purgeTombstones([...byId.values()]);
  }

  function stamp(entry) {
    return Number(entry.updatedAt || entry.created || 0);
  }

  /** Drops expired tombstones so the ledger cannot grow without bound. */
  function purgeTombstones(list) {
    const cutoff = Date.now() - TOMBSTONE_TTL_DAYS * 86400000;
    return list.filter((entry) => !(entry.deleted && stamp(entry) < cutoff));
  }

  /** True when the two ledgers are byte-identical in the fields that matter. */
  function sameLedger(a, b) {
    if (a.length !== b.length) return false;
    const key = (list) =>
      list
        .map((e) => `${e.id}:${stamp(e)}:${e.deleted ? 1 : 0}`)
        .sort()
        .join("|");
    return key(a) === key(b);
  }

  /* ==========================================================
     Adapter: mock cloud
     Simulates a remote account store with latency. Uses BroadcastChannel so a
     second browser tab behaves exactly like a second signed-in device.
     ========================================================== */

  function createMockAdapter() {
    const channel = "BroadcastChannel" in global ? new BroadcastChannel(CHANNEL) : null;
    let remoteListener = null;

    const docKey = (uid) => `${CLOUD_PREFIX}:${uid}`;
    const latency = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    if (channel) {
      channel.onmessage = (event) => {
        if (event.data?.type === "ledger" && remoteListener) {
          remoteListener(event.data.entries || []);
        }
      };
    }

    return {
      id: "mock",
      label: "Demo cloud (this browser)",

      async restore() {
        try {
          return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        } catch {
          return null;
        }
      },

      async signIn() {
        await latency(900); // account chooser and token exchange
        const user = {
          uid: "demo-user",
          name: "Demo Account",
          email: "demo@example.com",
          provider: "google",
          initial: "D"
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
      },

      async signOut() {
        await latency(200);
        localStorage.removeItem(SESSION_KEY);
      },

      async pull(user) {
        await latency(450);
        try {
          return JSON.parse(localStorage.getItem(docKey(user.uid)) || "[]");
        } catch {
          return [];
        }
      },

      async push(user, entries) {
        await latency(450);
        if (!navigator.onLine) throw new Error("offline");
        localStorage.setItem(docKey(user.uid), JSON.stringify(entries));
        channel?.postMessage({ type: "ledger", entries });
        return entries;
      },

      subscribe(user, listener) {
        remoteListener = listener;
        return () => {
          remoteListener = null;
        };
      }
    };
  }

  /* ==========================================================
     Adapter: Firebase (real backend)
     Activated only when window.SAAN_FIREBASE_CONFIG exists. Loads the SDK from the
     CDN on demand, so the offline build never pays for it.
     ========================================================== */

  function createFirebaseAdapter(config) {
    let app = null;
    let auth = null;
    let db = null;
    let sdk = null;

    async function ensure() {
      if (sdk) return sdk;
      const [core, authMod, storeMod] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js")
      ]);
      app = core.initializeApp(config);
      auth = authMod.getAuth(app);
      db = storeMod.getFirestore(app);
      sdk = { core, authMod, storeMod };
      return sdk;
    }

    const shape = (user) => ({
      uid: user.uid,
      name: user.displayName || "Account",
      email: user.email || "",
      photo: user.photoURL || "",
      provider: "google",
      initial: (user.displayName || user.email || "?").charAt(0).toUpperCase()
    });

    return {
      id: "firebase",
      label: "Google account",

      async restore() {
        const { authMod } = await ensure();
        return new Promise((resolve) => {
          const stop = authMod.onAuthStateChanged(auth, (user) => {
            stop();
            resolve(user ? shape(user) : null);
          });
        });
      },

      async signIn() {
        const { authMod } = await ensure();
        const provider = new authMod.GoogleAuthProvider();
        const result = await authMod.signInWithPopup(auth, provider);
        return shape(result.user);
      },

      async signOut() {
        const { authMod } = await ensure();
        await authMod.signOut(auth);
      },

      async pull(user) {
        const { storeMod } = await ensure();
        const snap = await storeMod.getDoc(storeMod.doc(db, "ledgers", user.uid));
        return snap.exists() ? snap.data().entries || [] : [];
      },

      async push(user, entries) {
        const { storeMod } = await ensure();
        await storeMod.setDoc(storeMod.doc(db, "ledgers", user.uid), {
          entries,
          updatedAt: storeMod.serverTimestamp()
        });
        return entries;
      },

      subscribe(user, listener) {
        let stop = () => {};
        ensure().then(({ storeMod }) => {
          stop = storeMod.onSnapshot(storeMod.doc(db, "ledgers", user.uid), (snap) => {
            if (snap.metadata.hasPendingWrites) return; // our own echo
            listener(snap.exists() ? snap.data().entries || [] : []);
          });
        });
        return () => stop();
      }
    };
  }

  /* ==========================================================
     Engine
     ========================================================== */

  function createEngine() {
    const adapter = global.SAAN_FIREBASE_CONFIG
      ? createFirebaseAdapter(global.SAAN_FIREBASE_CONFIG)
      : createMockAdapter();

    const listeners = new Set();
    let hooks = { readLocal: () => [], writeLocal: async () => {} };
    let unsubscribeRemote = null;
    let pushTimer = null;
    let retryDelay = RETRY_BASE_MS;
    let inFlight = false;

    const state = {
      adapter: adapter.id,
      user: null,
      status: "offline-only", // offline-only | connecting | synced | syncing | queued | error
      lastSyncedAt: null,
      queued: 0,
      error: null
    };

    function emit() {
      listeners.forEach((fn) => fn({ ...state }));
    }

    function set(patch) {
      Object.assign(state, patch);
      emit();
    }

    function describe() {
      if (!state.user) return "Not signed in · data stays on this device";
      switch (state.status) {
        case "connecting":
          return "Connecting…";
        case "syncing":
          return "Syncing…";
        case "queued":
          return state.queued === 1
            ? "1 change waiting for a connection"
            : `${state.queued} changes waiting for a connection`;
        case "error":
          return state.error || "Sync problem — will retry";
        default:
          return state.lastSyncedAt
            ? `Synced ${relativeTime(state.lastSyncedAt)}`
            : "Synced";
      }
    }

    function relativeTime(ts) {
      const seconds = Math.round((Date.now() - ts) / 1000);
      if (seconds < 45) return "just now";
      if (seconds < 5400) return `${Math.round(seconds / 60)} min ago`;
      if (seconds < 129600) return `${Math.round(seconds / 3600)} hr ago`;
      return `${Math.round(seconds / 86400)} d ago`;
    }

    /** Pull, merge, write locally, push back if the merge changed anything. */
    async function reconcile({ silent = false } = {}) {
      if (!state.user || inFlight) return;
      inFlight = true;
      if (!silent) set({ status: "syncing", error: null });

      try {
        const local = hooks.readLocal();
        const remote = await adapter.pull(state.user);
        const merged = mergeLedgers(local, remote);

        if (!sameLedger(merged, local)) await hooks.writeLocal(merged);
        if (!sameLedger(merged, remote)) await adapter.push(state.user, merged);

        retryDelay = RETRY_BASE_MS;
        set({ status: "synced", lastSyncedAt: Date.now(), queued: 0, error: null });
      } catch (error) {
        console.warn("[sync] reconcile failed", error);
        set({
          status: navigator.onLine ? "error" : "queued",
          error: navigator.onLine ? "Sync failed — will retry" : null
        });
        scheduleRetry();
      } finally {
        inFlight = false;
      }
    }

    function scheduleRetry() {
      if (!state.user) return;
      setTimeout(() => reconcile({ silent: true }), retryDelay);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    }

    function watchRemote() {
      unsubscribeRemote?.();
      unsubscribeRemote = adapter.subscribe(state.user, async (remote) => {
        const local = hooks.readLocal();
        const merged = mergeLedgers(local, remote);
        if (sameLedger(merged, local)) return;
        await hooks.writeLocal(merged);
        set({ status: "synced", lastSyncedAt: Date.now() });
      });
    }

    return {
      state: () => ({ ...state, description: describe() }),
      adapterLabel: adapter.label,
      subscribe(fn) {
        listeners.add(fn);
        fn({ ...state });
        return () => listeners.delete(fn);
      },

      /** Receives the two ledger accessors owned by app.js. */
      configure(next) {
        hooks = { ...hooks, ...next };
      },

      /** Restore a previous session on boot; never blocks the first paint. */
      async init() {
        const user = await adapter.restore();
        if (!user) return;
        set({ user, status: "connecting" });
        watchRemote();
        await reconcile();
      },

      async signIn() {
        set({ status: "connecting", error: null });
        try {
          const user = await adapter.signIn();
          set({ user, status: "syncing" });
          watchRemote();
          await reconcile();
          return user;
        } catch (error) {
          console.warn("[sync] sign-in failed", error);
          set({ status: "offline-only", user: null, error: "Sign-in cancelled" });
          throw error;
        }
      },

      /** Sign-out stops syncing; local data is never removed. */
      async signOut() {
        unsubscribeRemote?.();
        unsubscribeRemote = null;
        await adapter.signOut();
        set({ user: null, status: "offline-only", queued: 0, lastSyncedAt: null, error: null });
      },

      /** Called by app.js after every successful local write. */
      notifyLocalChange(pendingCount = 1) {
        if (!state.user) return;
        if (!navigator.onLine) {
          set({ status: "queued", queued: state.queued + pendingCount });
          return;
        }
        set({ status: "syncing" });
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => reconcile({ silent: true }), PUSH_DEBOUNCE_MS);
      },

      syncNow: () => reconcile()
    };
  }

  const engine = createEngine();

  global.addEventListener("online", () => {
    if (engine.state().user) engine.syncNow();
  });
  global.addEventListener("offline", () => {
    if (engine.state().user) engine.state().status = "queued";
  });

  global.SaanSync = Object.assign(engine, {
    mergeLedgers,
    sameLedger,
    purgeTombstones
  });
})(window);
