const CACHE = 'cold-n-dark-v5';
const CORE = [
  './app.html',
  './mehr-app.html',
  './krieg-app.html',
  './cwl-app.html',
  './mitglieder-app.html',
  './news.html',
  './regeln.html',
  './members-data.js',
  './push.js',
  './Wappen.png',
  './Clan%20logo.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./app.html')))
  );
});

// Echter Web-Push: eingehende Push-Nachrichten werden als System-Benachrichtigung angezeigt.
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
  const url = event.notification.data?.url || './app.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
