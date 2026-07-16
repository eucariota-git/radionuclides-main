/**
 * sw.js — Service worker for offline use (PWA)
 *
 * Cache-first strategy over the full static asset list: the app is a static
 * site, so every precached request is served as one coherent version. Updates
 * arrive through a new CACHE_VERSION, whose complete asset set is populated
 * during installation before activation.
 *
 * BUMP CACHE_VERSION whenever data files or app logic change, so clients
 * discard stale caches on activation.
 */

'use strict';

const CACHE_VERSION = 'nm-planner-v26';

const ASSETS = [
  './',
  './index.html',
  './decay.html',
  './dose.html',
  './about.html',
  './assets/icons/favicon.svg',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './manifest.json',
  './css/style.css',
  './js/chart.umd.min.js',
  './js/data.js',
  './js/nuclide-id.js',
  './js/db.js',
  './js/icrp107-loader.js',
  './js/physics.js',
  './js/report.js',
  './js/ui.js',
  './js/utils.js',
  // The .json twins of the two databases are NOT precached: every page loads
  // the embedded .js copies (NUCLIDE_DATA / ICRP107_DATA) and the loaders fall
  // back to them offline, so precaching the JSONs doubled the install (~16 MB).
  './data/nuclides-data.js',
  './data/icrp107-data.js',
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
    // ignoreSearch: pages are linked with query parameters (dose.html?id=Y-90,
    // decay.html?id=Tc-99m from Properties) but precached without them. A
    // query-sensitive match missed those offline reloads and the navigation
    // fallback silently served index.html instead, losing the page AND the
    // selection (audit 2026-07-16, H-04). No precached asset varies by query.
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      // Deliberately uncached resources (notably data/nuclides.json) use the
      // network when available. A 503 response lets their loaders select the
      // embedded fallback without respondWith ever resolving to undefined.
      return fetch(event.request).catch(async () => {
        if (event.request.mode === 'navigate') {
          const appShell = await caches.match('./index.html');
          if (appShell) return appShell;
        }
        return new Response('Offline — resource is not available in this app version.', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      });
    })
  );
});
