// Incrementa este número cada vez que cambies los archivos de la app
const CACHE_VERSION = 'mis-finanzas-v5';

const STATIC_ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './contabilidad.html',
  './nominas.html',
  './hacienda.html',
  './manifest.json',
  './icons/icon.svg',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ── Instalación: guarda todos los assets en caché ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activación: borra cachés antiguas ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: estrategia según el tipo de petición ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Precios cripto (CoinGecko): red primero, caché si falla
  if (url.includes('api.coingecko.com') || url.includes('coingecko')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Todo lo demás: caché primero, red si no está
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          // Solo cachear respuestas válidas del mismo origen o CDN conocido
          if (res.status === 200 && (
            event.request.url.startsWith(self.location.origin) ||
            event.request.url.includes('jsdelivr.net')
          )) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
      .catch(() => caches.match('./index.html'))
  );
});
