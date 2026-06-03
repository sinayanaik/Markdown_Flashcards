const CACHE_NAME = "markdown-flashcards-v20260603-3";
const APP_SHELL = [
  "./",
  "./styles.css?v=20260603-3",
  "./app.js?v=20260603-3",
  "./manifest.webmanifest",
  "./fevicon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => key === CACHE_NAME ? null : caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isNavigation = request.mode === "navigate";
  const isSameOrigin = url.origin === self.location.origin;
  const isCdnAsset = url.hostname === "cdn.jsdelivr.net";

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./", copy));
          return response;
        })
        .catch(() => caches.match("./"))
    );
    return;
  }

  // Do not intercept or cache the service worker itself
  if (url.pathname.endsWith("/sw.js")) return;

  if (!isSameOrigin && !isCdnAsset) return;

  // Stale-While-Revalidate for other static assets
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const putPromise = cache.put(request, response.clone());
              if (typeof event.waitUntil === "function") {
                event.waitUntil(putPromise);
              }
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      });
    })
  );
});
