/* Service worker - makes the shopping list work with no internet.
   Bump CACHE_NAME whenever you upload a new version of the app. */

const CACHE_NAME = 'chris-shopping-v2';

/* All these apps sit on the one address (synergies-now.github.io), and the
   browser's cache store is shared across the whole address - not per folder.
   So this app must only ever clear away ITS OWN older versions. Deleting
   every cache it doesn't recognise would wipe the offline copy of the other
   apps on the same phone. */
const CACHE_PREFIX = 'chris-shopping-';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

/* Store everything on first visit. */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* Throw away caches from older versions. */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME)
             .map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

/* Serve from cache first so the app opens instantly and offline, while
   quietly fetching a fresh copy for next time. Supabase calls are
   cross-origin and are left well alone. */
self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
