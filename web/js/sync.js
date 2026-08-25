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

  /** Returns the timestamp used to order competing versions of one record. */
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

  /** Creates a browser-only backend used to exercise sync without paid services. */
  function createMockAdapter() {
    const channel = "BroadcastChannel" in global ? new BroadcastChannel(CHANNEL) : null;
    let remoteListener = null;

    // Keep each demo account in its own key and mimic real network latency.
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

      /** Restores a browser-saved demo session, if one exists. */
      async restore() {
        try {
          return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        } catch {
          return null;
        }
      },

      /** Simulates account selection and returns a stable demo user. */
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

      /** Clears the demo session without touching the local ledger. */
      async signOut() {
        await latency(200);
        localStorage.removeItem(SESSION_KEY);
      },

      /** Reads the demo user’s remote ledger from a separate localStorage key. */
      async pull(user) {
        await latency(450);
        try {
          return JSON.parse(localStorage.getItem(docKey(user.uid)) || "[]");
        } catch {
          return [];
        }
      },

      /** Writes the demo cloud copy and broadcasts it to other tabs. */
      async push(user, entries) {
        await latency(450);
        if (!navigator.onLine) throw new Error("offline");
        localStorage.setItem(docKey(user.uid), JSON.stringify(entries));
        channel?.postMessage({ type: "ledger", entries });
        return entries;
      },

      /** Registers the callback used to receive simulated remote tab updates. */
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

  /** Creates the real Google authentication and Firestore ledger adapter. */
  function createFirebaseAdapter(config) {
    let app = null;
    let auth = null;
    let db = null;
    let sdk = null;

    /** Lazily imports and initializes Firebase only when the real adapter is used. */
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

    /** Reduces a Firebase user to the profile fields needed by the interface. */
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

      /** Waits for Firebase Auth to report the previously signed-in user. */
      async restore() {
        const { authMod } = await ensure();
        return new Promise((resolve) => {
          const stop = authMod.onAuthStateChanged(auth, (user) => {
            stop();
            resolve(user ? shape(user) : null);
          });
        });
      },

      /** Opens Google’s popup and normalizes the returned Firebase user. */
      async signIn() {
        const { authMod } = await ensure();
        const provider = new authMod.GoogleAuthProvider();
        const result = await authMod.signInWithPopup(auth, provider);
        return shape(result.user);
      },

      /** Ends the Firebase Auth session while preserving device-local data. */
      async signOut() {
        const { authMod } = await ensure();
        await authMod.signOut(auth);
      },

      /** Downloads the authenticated user’s Firestore ledger document. */
      async pull(user) {
        const { storeMod } = await ensure();
        const snap = await storeMod.getDoc(storeMod.doc(db, "ledgers", user.uid));
        return snap.exists() ? snap.data().entries || [] : [];
      },

      /** Replaces the user’s Firestore ledger and records a server timestamp. */
      async push(user, entries) {
        const { storeMod } = await ensure();
        await storeMod.setDoc(storeMod.doc(db, "ledgers", user.uid), {
          entries,
          updatedAt: storeMod.serverTimestamp()
        });
        return entries;
      },

      /** Streams Firestore changes while ignoring this client’s pending-write echoes. */
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

  /** Creates the adapter-independent authentication, merge, queue and retry controller. */
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

    /** Publishes a safe copy of sync state to every subscribed UI listener. */
    function emit() {
      listeners.forEach((fn) => fn({ ...state }));
    }

    /** Applies a partial state update and immediately notifies subscribers. */
    function set(patch) {
      Object.assign(state, patch);
      emit();
    }

    /** Builds the plain-English sync status shown in the interface. */
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

    /** Converts a sync timestamp into a compact relative-time label. */
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

    /** Queues a silent retry and exponentially increases its delay up to the cap. */
    function scheduleRetry() {
      if (!state.user) return;
      setTimeout(() => reconcile({ silent: true }), retryDelay);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    }

    /** Subscribes to backend changes and merges unseen records into local storage. */
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
      // Expose snapshots rather than the mutable internal state object.
      state: () => ({ ...state, description: describe() }),
      adapterLabel: adapter.label,

      /** Registers a state observer and immediately supplies its first snapshot. */
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

      /** Authenticates through the active adapter, starts watching and performs first merge. */
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
