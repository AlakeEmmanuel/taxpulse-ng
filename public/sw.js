// TaxPulse NG Service Worker v3
// Increment version number on every deploy to bust cache

const CACHE = 'taxpulse-v3';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete ALL old caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network first for HTML — always get fresh app shell
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // Cache first for assets
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── Push Notifications ─────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'TaxPulse NG', body: 'You have an upcoming tax deadline.', url: '/' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'taxpulse-deadline',
      data: { url: data.url },
      requireInteraction: true,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.openWindow(url));
});
