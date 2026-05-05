// Service worker neutralizado en desarrollo local para evitar
// fallos de navegación por caché/rutas al cambiar de puerto.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Sin strategy/cache: la red responde directamente.
// No interceptamos fetch para no afectar navegación interna.
