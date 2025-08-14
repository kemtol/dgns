/* Simple SW: network-first untuk HTML; SWR untuk aset */
const CACHE = 'diagnos-v4';
const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  const isNav = req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html');

  // Network-first untuk navigasi/HTML
  if (isNav) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', net.clone());
        return net;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || fetch(req);
      }
    })());
    return;
  }

  // Stale-while-revalidate untuk aset lainnya
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const fetching = fetch(req).then(res => { cache.put(req, res.clone()); return res; }).catch(() => null);
    return cached || fetching || fetch(req);
  })());
});
