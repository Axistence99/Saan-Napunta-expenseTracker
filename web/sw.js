/*
 * Saan Napunta? service worker
 * ============================
 *
 * Purpose
 * -------
 * This file gives the installed web app an offline application shell. It caches the page,
 * manifest and icons after the first successful online visit, then serves the cached page
 * when a later navigation cannot reach GitHub Pages.
 *
 * Strategy
 * --------
 * - Page navigations are network-first so normal launches receive the latest deployed UI.
 * - If navigation fails, cached index.html lets the app reopen offline.
 * - Same-origin static assets are cache-first and are added to the cache after a successful
 *   request. External Firebase SDK requests are deliberately left to the browser/network.
 * - Only GET requests are considered; writes and other methods are never intercepted.
 *
 * Updating
 * --------
 * Increment CACHE_NAME whenever a required shell asset or icon changes. Activation removes
 * every older Saan Napunta? shell cache so installed users do not retain obsolete assets.
 */

/* Versioned cache bucket. Changing the suffix causes the activate handler to remove v1, v2, etc. */
const CACHE_NAME = "saan-napunta-shell-v3";

/*
 * Minimum files required to launch, identify and reinstall the application offline.
 * Expense data is not stored here; it remains in the app's separate local data storage.
 */
const APP_SHELL = [
  "./",
  "./index.html",
  "./delete-data.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./images/developer-aleksis.jpg"
];

/*
 * Installation pre-caches the complete shell. waitUntil keeps installation alive until all
 * required files are available. skipWaiting allows this version to replace an older waiting
 * worker immediately instead of waiting for every previous tab to close.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/*
 * Activation is the cleanup phase. Delete every cache except the current version, then claim
 * open pages so this worker controls them without requiring another full browser restart.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const outdated = keys.filter((key) => key !== CACHE_NAME);
        return Promise.all(outdated.map((key) => caches.delete(key)));
      })
      .then(() => self.clients.claim())
  );
});

/*
 * Fetch routing has two explicit branches:
 *   1. HTML navigation uses network-first with index.html as the offline fallback.
 *   2. Other same-origin GET assets use cache-first with runtime cache population.
 */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  /* Never interfere with form writes, extension requests or third-party services. */
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          /*
           * Response bodies are streams and can be consumed only once. Clone before saving
           * so the original response can still be returned to the currently opening page.
           */
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => {
          /* An offline navigation receives the last successfully cached standalone app. */
          return caches.match("./index.html");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        /* Cache only successful responses; error pages and redirects should not become permanent. */
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
