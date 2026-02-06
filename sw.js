const CACHE_NAME = 'studio-blue-v4';
const assets = ['./', './index.html', './app.js', './tones.js', './manifest.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(assets))); });
self.addEventListener('fetch', (e) => { e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))); });