/* Mi Vitrina Service Worker — cache + push */
const CACHE = 'mivitrina-v0.2.0';
const ASSETS = ['/', '/index.html', '/css/style.css', '/css/mobile.css', '/js/config.js', '/js/data.js', '/js/supabase-client.js', '/js/auth.js', '/js/app.js', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin.includes('supabase') || url.origin.includes('cdn') || url.origin.includes('googleapis') || url.origin.includes('gstatic')) return;
  event.respondWith(caches.match(req).then((cached) => {
    const net = fetch(req).then((res) => {
      if (res && res.ok && url.origin === self.location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone));
      }
      return res;
    }).catch(() => cached);
    return cached || net;
  }));
});

self.addEventListener('push', (event) => {
  let data = { title: 'Mi Vitrina', body: 'Tienes una nueva notificación', url: '/' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) { if (event.data) data.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(data.title || 'Mi Vitrina', {
    body: data.body || '', icon: '/icon.svg', badge: '/icon.svg', data: { url: data.url || '/' }, vibrate: [100, 50, 100],
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (c.url.includes(self.location.origin) && 'focus' in c) { c.navigate(url); return c.focus(); }
    }
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
