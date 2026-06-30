// 555 Command Center — Service Worker
// Provides offline caching and PWA installability

const CACHE_NAME = "555-cmd-v2";
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

// ---- Install: precache core assets ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Non-critical if some fail — continue
      });
    })
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches ----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  event.waitUntil(clients.claim());
});

// ---- Fetch: network-first with cache fallback ----
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and chrome-extension:// URLs
  if (event.request.method !== "GET") return;
  if (event.request.url.startsWith("chrome-extension://")) return;

  event.respondWith(
    (async () => {
      try {
        // Network first
        const networkResponse = await fetch(event.request);
        // Cache successful responses for same-origin HTML/asset requests
        if (
          networkResponse.ok &&
          new URL(event.request.url).origin === self.location.origin
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        // Network failed — try cache
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // For navigation requests, serve the / page
        if (event.request.mode === "navigate") {
          const fallback = await caches.match("/");
          if (fallback) return fallback;
        }

        return new Response("Offline — could not load resource", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      }
    })()
  );
});

// ---- Push notification support ----
self.addEventListener("push", (event) => {
  let data = { title: "555 Dashboard", body: "New update" };
  if (event.data) {
    try { data = event.data.json(); } catch {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      vibrate: [200, 100, 200],
      data: data.link || "/",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
