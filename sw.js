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

const CACHE_PREFIX = 'nm-planner-';
const CACHE_VERSION = 'nm-planner-v73';

const ASSETS = [
  './',
  './index.html',
  './decay.html',
  './dose.html',
  './effluent.html',
  './caregiver.html',
  './about.html',
  './assets/icons/favicon.svg',
  './assets/icons/icon-180.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './manifest.json',
  './css/style.css',
  './js/chart.umd.min.js',
  './js/data.js',
  './js/effluent.js',
  './js/caregiver.js',
  './js/nuclide-id.js',
  './js/db.js',
  './js/icrp107-loader.js',
  './js/i18n.js',
  './js/i18n-es.js',
  './js/physics.js',
  './js/report.js',
  './js/regulatory.js',
  './js/ui.js',
  './js/utils.js',
  // The ICRP 107 .json twin is NOT precached: every page loads the embedded
  // .js copy (ICRP107_DATA) and the loader never fetches the JSON when it is
  // present; precaching it would double the install (~16 MB).
  './data/nuclides-data.js',
  './data/icrp107-data.js',
  './data/effluent-scenarios-data.js',
  './data/caregiver-data.js',
  './data/regulatory-data.js',
  // The small JSON sources are always fetched first (to pick up edits) and
  // compared with their embedded twin; without them every offline load logged
  // a 503 before falling back (audit 2026-10-15, F-08). Only the ICRP 107 index
  // (~8 MB) stays out: its loader uses the embedded copy and never fetches it.
  './data/nuclides.json',
  './data/regulatory.json',
  './data/caregiver.json',
  './data/effluent-scenarios.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // cache: 'reload' bypasses the browser's HTTP cache. Without it addAll()
    // could fill the NEW version's cache with the OLD files still fresh in the
    // HTTP cache: an installed app updated v1.13.0 → v1.13.1 got cache v51 but
    // kept running 1.13.0 (update test, 2026-10-15).
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Only this application's OWN old caches are deleted. Other applications
// served from the same origin keep theirs (audit 2026-10-03, H-10: the former
// filter deleted every cache whose name was not the current version).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_VERSION)
        .map((k) => caches.delete(k))))
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
    // Look up only in THIS version's cache, never across every cache of the
    // origin (another app could hold a same-URL entry) — audit 2026-10-03, H-10.
    caches.open(CACHE_VERSION).then((cache) => cache.match(event.request, { ignoreSearch: true })).then((cached) => {
      if (cached) return cached;

      // Deliberately uncached resources (notably data/icrp107-index.json) use the
      // network when available. A 503 response lets their loaders select the
      // embedded fallback without respondWith ever resolving to undefined.
      return fetch(event.request).catch(async () => {
        if (event.request.mode === 'navigate') {
          const appShell = await (await caches.open(CACHE_VERSION)).match('./index.html');
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
