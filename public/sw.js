const CACHE = "ggec-v1";

self.addEventListener("install", (e) => {
  // Pre-cache only static assets that are guaranteed to exist
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(["/icon-192.png", "/icon-512.png"]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Skip API calls and Next.js internals — let them go to network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return;

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
