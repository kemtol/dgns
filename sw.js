// ====== BUMP INI SETIAP DEPLOY ======
const VERSION = '2025-08-11-01'; // ubah string ini saat deploy
const CACHE = `diagnos-sections-${VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: precache versi baru
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting(); // siap jadi waiting SW
});

// Activate: bersihkan cache lama + ambil kontrol
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first utk file precache, SWR utk lainnya
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    // App-shell: selalu coba jaringan, fallback ke cache
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});

// Terima perintah dari halaman
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
