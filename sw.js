const CACHE_NAME = 'cold-n-dark-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './app.html',
  './just-for-fun.html',
  './krieg-app.html',
  './cwl-app.html',
  './mitglieder-app.html',
  './chat-app.html',
  './manifest.json',
  './site-modern.css',
  './Wappen.png',
  './Clan%20logo.png',
  './members-data.js',
  './krieg.html',
  './mitglieder.html',
  './cwl.html',
  './news.html',
  './mehr-app.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
      return cached || network;
    })
  );
});


// Web Push: derselbe Service Worker wird für Offlinebetrieb und Push verwendet.
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || "Cold N' Dark";
  const options = {
    body: data.body || 'Neue Nachricht vom Clan.',
    icon: './Clan%20logo.png',
    badge: './Clan%20logo.png',
    tag: data.tag || 'cold-n-dark',
    renotify: true,
    data: { url: data.url || './app.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './app.html', self.location.href).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
