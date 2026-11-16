// Shelf offline cache. Bump VERSION when you upload a new index.html.
const VERSION = 'shelf-v5';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Serve from cache first (works offline), refresh the cache in the background when online.
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    // Only the app page itself is stored as index.html. Opening another file directly (an icon, this script)
    // must not overwrite the cached app with that file.
    const key = req.mode === 'navigate' && /\/(index\.html)?$/.test(url.pathname) ? './index.html' : req;
    const hit = await cache.match(key, {ignoreSearch: true});
    const fresh = fetch(req).then(res => { if (res.ok) cache.put(key, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    return (await fresh) || new Response('Offline', {status: 503});
  }));
});
