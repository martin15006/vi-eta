// sw.js — cachea el "app shell" para que Viñeta abra sin conexión después de la
// primera visita (RNF-23, CB-01 a CB-06). Estrategia: cache-first para los
// archivos propios, con una versión que hay que subir a mano en cada deploy.
const VERSION = 'v1';
const CACHE_NOMBRE = `vineta-${VERSION}`;

const ARCHIVOS_BASE = [
  './',
  './index.html',
  './estilos.css',
  './app.js',
  './obras.js',
  './almacen.js',
  './manifest.webmanifest',
  './iconos/icono.svg',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOMBRE).then((cache) => cache.addAll(ARCHIVOS_BASE))
  );
  // No se llama skipWaiting() acá a propósito: la nueva versión se queda
  // "esperando" hasta que app.js le avise (mensaje SALTAR_ESPERA) que el
  // lector aceptó actualizar (CB-04) — así nunca se reemplaza a mitad de una
  // edición sin avisar.
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre.startsWith('vineta-') && nombre !== CACHE_NOMBRE)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('message', (evento) => {
  if (evento.data === 'SALTAR_ESPERA') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;

  evento.respondWith(
    caches.match(evento.request).then((enCache) => {
      if (enCache) return enCache;

      return fetch(evento.request)
        .then((respuesta) => {
          // Solo guardamos respuestas válidas de nuestro propio origen.
          if (respuesta && respuesta.ok && evento.request.url.startsWith(self.location.origin)) {
            const copia = respuesta.clone();
            caches.open(CACHE_NOMBRE).then((cache) => cache.put(evento.request, copia));
          }
          return respuesta;
        })
        .catch(() => {
          // CB-01/CB-03: sin red y sin caché para esto — si es una navegación,
          // al menos devolvemos el shell de la app.
          if (evento.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return Response.error();
        });
    })
  );
});
