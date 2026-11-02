const CACHE = 'still-studio-next-v3';
const PAGES = ['/', '/shoot', '/select', '/style', '/share'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const assets = new Set(['/icon.svg', '/manifest.webmanifest']);
    for (const page of PAGES) {
      const response = await fetch(page, { cache: 'reload' });
      if (!response.ok) throw new Error('Could not cache the studio.');
      const html = await response.clone().text();
      await cache.put(page, response);
      for (const match of html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)) assets.add(match[1].replaceAll('&amp;', '&'));
    }
    await cache.addAll([...assets]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('still-studio-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Private media and API responses never enter the shared application cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/s/')) return;
  if (event.request.mode === 'navigate' && PAGES.includes(url.pathname)) {
    event.respondWith(fetch(event.request).catch(async () => {
      const cached = await caches.match(url.pathname);
      return cached || Response.error();
    }));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || ['/icon.svg', '/manifest.webmanifest'].includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
  }
});
