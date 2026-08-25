const CACHE = 'cold-n-dark-v2';
const CORE = [
  './app.html',
  './mehr-app.html',
  './krieg-app.html',
  './cwl-app.html',
  './mitglieder-app.html',
  './news.html',
  './regeln.html',
  './members-data.js',
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
