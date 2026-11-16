// Set to true if you use OneSignal: it then supplies its own push + click handlers.
const USE_ONESIGNAL = true;
if (USE_ONESIGNAL) { try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'); } catch (e) {} }

const CACHE = 'fortnight-v2'; // bump this when you change app files
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Stale-while-revalidate: instant offline load, quietly refreshes in the background.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit || c.match('./'));
    return hit || net;
  }));
});

if (!USE_ONESIGNAL) {
  // Expects a Web Push payload like {"title":"...","body":"...","url":"./"}
  self.addEventListener('push', e => {
    let d = {};
    try { d = e.data.json(); } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
    e.waitUntil(self.registration.showNotification(d.title || 'Fortnight', {
      body: d.body || 'You have a task coming up',
      icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' }
    }));
  });

  self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = (e.notification.data && e.notification.data.url) || './';
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow(url);
    }));
  });
}
