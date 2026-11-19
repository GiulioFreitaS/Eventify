const cacheName = 'eventify-shell-v1';
const home = '/';
const resources = new Set([
  '/styles.css', '/mobile.css', '/manifest.webmanifest',
  '/src/main.ts', '/src/explore.ts', '/src/model.ts', '/src/motion.ts', '/src/navigation.ts',
  '/src/organizer.ts', '/src/participant.ts', '/src/repository.ts', '/src/ticket-deck.ts',
  '/src/ticket-image.ts', '/src/ui.ts',
  '/assets/ao-vivo.jpg', '/assets/ceramica-card.jpg', '/assets/ceramica.jpg',
  '/assets/cinema-card.jpg', '/assets/cinema.jpg', '/assets/entrar.jpg',
  '/assets/eventify-mark.png', '/assets/eventify.png', '/assets/eventify-icon-192.png',
  '/assets/eventify-icon-512.png', '/assets/feira-card.jpg', '/assets/feira.jpg',
  '/assets/jazz-card.jpg', '/assets/jazz.jpg', '/assets/microfone.jpg', '/assets/patio.jpg',
  '/assets/som-no-patio-card.jpg', '/assets/som-no-patio.jpg',
]);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([home, ...resources])));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const versions = await caches.keys();
    await Promise.all(versions.filter(name => name.startsWith('eventify-shell-') && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, key) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(key, response.clone()).catch(() => {});
    return response;
  } catch {
    return (await cache.match(key)) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && !url.pathname.includes('.')) {
    event.respondWith(networkFirst(request, home));
  } else if (resources.has(url.pathname)) {
    event.respondWith(networkFirst(request, url.pathname));
  }
});
