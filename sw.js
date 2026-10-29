// Service Worker: sorgt dafür, dass die App im Gym-Keller ohne Netz läuft.
// Strategie: sofort aus dem Cache antworten, im Hintergrund aktualisieren.
// Updates sind damit beim übernächsten Öffnen da. Bei Änderungen CACHE hochzählen.
const CACHE = 'circa-v14';
const FONT_CACHE = 'circa-fonts-v1';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // Schriften (Archivo): einmal laden, dann für immer aus dem Cache
  if(FONT_HOSTS.includes(url.hostname)){
    e.respondWith(caches.open(FONT_CACHE).then(async cache => {
      const hit = await cache.match(req);
      if(hit) return hit;
      const res = await fetch(req);
      if(res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }));
    return;
  }

  if(url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, {ignoreSearch: true});
    const network = fetch(req).then(res => {
      if(res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    if(cached){ e.waitUntil(network); return cached; }
    return network;
  }));
});
