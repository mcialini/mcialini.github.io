// ============================================================
// Service Worker — Template App
// Scope: /template/
//
// When copying this for a new app:
//   1. Update CACHE_NAME (change "template" to your app name)
//   2. Update PRECACHE paths to match your app's files
// ============================================================

const CACHE_NAME = 'template-v1';

// Files to pre-cache on SW install (app shell).
// Icons are not listed here — they are cached lazily on first request.
const PRECACHE = [
    '/template/',
    '/template/index.html',
    '/template/app.js',
    '/template/manifest.webmanifest',
    '/shared/styles.css',
];

// ---- Install: pre-cache app shell ----
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

// ---- Activate: purge old caches ----
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// ---- Fetch: cache-first, fall back to network ----
self.addEventListener('fetch', event => {
    // Only handle GET requests to the same origin
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                // Cache successful same-origin responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
