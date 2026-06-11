/**
 * sw.js — Service worker for offline use (PWA)
 *
 * Cache-first strategy over the full static asset list: the app is a static
 * site, so every request can be served from cache once installed. A network
 * fetch updates the cache in the background (stale-while-revalidate), so
 * deployed updates arrive on the next visit.
 *
 * BUMP CACHE_VERSION whenever data files or app logic change, so clients
 * discard stale caches on activation.
 */

'use strict';

const CACHE_VERSION = 'nm-planner-v2';

const ASSETS = [
  './',
  './index.html',
  './decay.html',
  './dose.html',
  './custom.html',
  './validate-icrp107.html',
  './favicon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  './css/style.css',
  './js/chart.umd.min.js',
  './js/csv-parser.js',
  './js/data.js',
  './js/db.js',
  './js/icrp107-loader.js',
  './js/physics.js',
  './js/report.js',
  './js/ui.js',
  './js/utils.js',
  './data/nuclides-data.js',
  './data/nuclides.json',
  './data/icrp107-data.js',
  './data/icrp107-index.json',
  './data/y90-bremsstrahlung.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const refresh = fetch(event.request)
        .then((resp) => {
          if (resp && resp.ok && new URL(event.request.url).origin === self.location.origin) {
            const clone = resp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => cached);  // offline: fall back to cache (or undefined)
      return cached || refresh;
    })
  );
});
