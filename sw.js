const CACHE_NAME = 'dreamly-v1';
const ASSETS = [
  './dreamly.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap'
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // Font CDN may fail offline, that's ok
        return cache.add('./dreamly.html');
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for local, network-first for API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API calls — always network
  if (url.hostname === 'api.anthropic.com') {
    return; // pass through
  }

  // Google Fonts — network with cache fallback
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Local files — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      });
    })
  );
});
