// Service worker de eCheqs.
//
// Estrategia (corregida):
// - El documento HTML (la app en sí) usa "network-first": SIEMPRE intenta
//   traer la versión más nueva de la red primero. Si no hay internet,
//   recién ahí usa la última copia guardada. Antes era cache-first para
//   todo, lo que significaba que el celular se quedaba pegado para
//   siempre con la primerísima versión que cacheó, sin importar cuántas
//   veces se desplegara algo nuevo en Vercel.
// - Los archivos estáticos (íconos, manifest, la fuente de Tabler) sí
//   usan cache-first con relleno en segundo plano, porque esos casi
//   nunca cambian y no tiene sentido pedirlos de nuevo cada vez.
//
// Si actualizás la app más adelante: subí los archivos nuevos Y subí el
// número de CACHE_NAME (ej: 'echeqs-v4'). Eso fuerza a los celulares a
// limpiar la caché vieja.
const CACHE_NAME = 'echeqs-v3';

const ASSETS_PRECACHE = [
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

function esNavegacionDeDocumento(request) {
  // Pedido de la página HTML en sí (al abrir/recargar la app), no de un
  // ícono, fuente, manifest, etc.
  return request.mode === 'navigate' || request.destination === 'document';
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Algunas extensiones del navegador (traductores, gestores de
  // contraseñas, etc.) inyectan pedidos con esquemas como
  // 'chrome-extension://'. La Cache API solo soporta http/https,
  // así que esos pedidos los dejamos pasar sin intervenir.
  if (!event.request.url.startsWith('http')) return;

  // ── HTML de la app: network-first ──
  if (esNavegacionDeDocumento(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return respuesta;
        })
        .catch(() => caches.match(event.request)) // sin internet: usar la última copia guardada
    );
    return;
  }

  // ── Recursos estáticos: cache-first con relleno en segundo plano ──
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((respuesta) => {
          if (respuesta && (respuesta.status === 200 || respuesta.type === 'opaque')) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          }
          return respuesta;
        })
        .catch(() => cached);
    })
  );
});
