// Service worker de eCheqs.
// Estrategia: "cache-first con relleno en segundo plano".
// - Lo que ya está en caché se sirve al instante (anda sin internet).
// - Lo que no está, se busca en la red y se guarda en caché para la
//   próxima vez (así los íconos de Tabler también quedan disponibles
//   offline después del primer uso con conexión).
//
// Si actualizás la app más adelante, subí los archivos nuevos Y subí
// el número de CACHE_NAME (ej: 'echeqs-v2'). Eso fuerza a los celulares
// a bajar la versión nueva en vez de seguir usando la vieja en caché.
const CACHE_NAME = 'echeqs-v1';

const ASSETS_PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((respuesta) => {
          // Solo cacheamos respuestas válidas (incluye opacas de otros
          // orígenes, como la fuente de íconos de Tabler).
          if (respuesta && (respuesta.status === 200 || respuesta.type === 'opaque')) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          }
          return respuesta;
        })
        .catch(() => cached); // sin red y sin caché: no hay nada para servir
    })
  );
});
