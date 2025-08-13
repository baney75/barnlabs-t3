const CACHE_NAME = "barn-offline-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) =>
            k !== CACHE_NAME ? caches.delete(k) : Promise.resolve(),
          ),
        ),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache-first for same-origin assets and GLB/GLTF resources
  if (
    url.origin === self.location.origin ||
    /\.(glb|gltf|png|jpg|jpeg|svg|gif)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((resp) => {
            const respClone = resp.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, respClone));
            return resp;
          }),
      ),
    );
  }
});
