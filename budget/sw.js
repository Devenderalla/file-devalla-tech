/* Budget Tracker service worker — offline-first app shell */
const VERSION = "bt-v2.5.0";
const SHELL = [
  "./",
  "index.html",
  "app.css",
  "app.js",
  "manifest.webmanifest",
  "fonts/bricolage.woff2",
  "fonts/instrument.woff2",
  "fonts/spline-mono.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* cache-first, refresh the copy in the background */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      const refresh = fetch(e.request)
        .then(res => {
          if (res.ok) caches.open(VERSION).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
