/* ═══════════════════════════════════════════════════════════
   Gym Basics — service worker
   Gym floors are basements. The whole site is static, so all
   of it can live on the phone.

   Bump VERSION whenever any shell file below changes.
   ═══════════════════════════════════════════════════════════ */
"use strict";

var VERSION = "gb-v26";
var SHELL = VERSION + "-shell";
var MEDIA = VERSION + "-media";

/* Everything needed to run the site with no network at all.
   Photos are deliberately absent — they are cached as they are
   seen, so a first visit doesn't pull 6 MB down a gym 3G link. */
var SHELL_FILES = [
  "./",
  "index.html",
  "beginner.html",
  "intermediate.html",
  "advanced.html",
  "equipment.html",
  "exercises.html",
  "builder.html",
  "guide.html",
  "week.html",
  "nutrition.html",
  "workout.html",
  "programs.html",
  "styles.css",
  "data.js",
  "plan.js",
  "app.js",
  "week.js",
  "nutrition.js",
  "foods.js",
  "nutrition-ui.js",
  "lift.js",
  "progress.js",
  "plates.js",
  "session.js",
  "demo.js",
  "manifest.webmanifest",
  "assets/favicon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "fonts/rubik.woff2",
  "fonts/barlow-condensed-600.woff2",
  "fonts/barlow-condensed-700.woff2",
  "fonts/plex-mono-500.woff2"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      /* addAll is atomic — one 404 would throw the whole install away,
         so each file is added on its own and failures are tolerated. */
      return Promise.all(SHELL_FILES.map(function (f) {
        return c.add(new Request(f, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== MEDIA) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* The page asks which build is serving it, so the footer can say so out
   loud — a phone can sit on a cached build for a load or two after an
   update, and guessing from the outside is miserable. */
self.addEventListener("message", function (e) {
  if (e.data === "version" && e.source) e.source.postMessage({ build: VERSION });
});

function isMedia(url) {
  return /\.(?:jpg|jpeg|png|webp|avif|svg|mp4|webm)$/i.test(url.pathname);
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* Photos and video: cache-first. They never change in place. */
  if (isMedia(url)) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res.ok) {
            var copy = res.clone();
            caches.open(MEDIA).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () {
          /* Never seen and no network. Answer with a real network error
             rather than an undefined respondWith: that is what fires the
             img error handler in app.js, which swaps the photo for the
             typographic name tile. */
          return Response.error();
        });
      })
    );
    return;
  }

  /* Shell: stale-while-revalidate. Instant from cache on a dead
     connection, quietly refreshed whenever there is one. */
  e.respondWith(
    /* Cache keys carry the query string, so workout.html?d=3 misses the
       cached workout.html and used to fall all the way back to the
       homepage — exactly when you are standing in the gym with no signal.
       Same document, the day is read from the URL client-side, so match on
       the path alone before giving up. */
    caches.match(req).then(function (hit) {
      return hit || (url.search ? caches.match(req, { ignoreSearch: true }) : undefined);
    }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        /* one entry per document, not one per ?d= */
        if (res.ok && !url.search) {
          var copy = res.clone();
          caches.open(SHELL).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        /* Offline and never seen: fall back to a cached page so the
           user lands somewhere useful instead of the browser error. */
        return hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error());
      });
      return hit || net;
    })
  );
});
