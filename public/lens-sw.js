const OFFLINE_CACHE = "lens-offline";
const OFFLINE_PAGE = "/lens-offline.html";

self.addEventListener("install", (event) => {
  const offlineRequest = new Request(OFFLINE_PAGE, {
    cache: "reload",
    credentials: "omit",
    redirect: "error",
  });
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(offlineRequest)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    /^\/(?:api|_serverFn|__grok)(?:\/|$)/i.test(url.pathname)
  ) {
    return;
  }

  // Preserve the original network response. Only the public offline page is cached.
  event.respondWith(
    fetch(request).catch(
      async () =>
        (await caches.match(OFFLINE_PAGE, { cacheName: OFFLINE_CACHE })) ??
        Response.error(),
    ),
  );
});
