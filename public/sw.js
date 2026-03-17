const CACHE = 'belagerungs-atlas-v1';
const OFFLINE_URLS = [
  '/',
  '/src/main.jsx',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(OFFLINE_URLS).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  // Network first, cache fallback
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r=>{
        const clone = r.clone();
        caches.open(CACHE).then(c=>c.put(e.request, clone));
        return r;
      })
      .catch(()=>caches.match(e.request))
  );
});
