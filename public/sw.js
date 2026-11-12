/*
 * Tickmark service worker.
 *
 * Climbing gyms often have no signal, so every screen has to open offline.
 * Pages are fetched network-first and fall back to the cached copy. Build
 * assets under /_next/static are content-hashed, so they are served
 * cache-first. "Warming" fetches each screen and the assets it references,
 * so screens that have never been opened still work offline.
 */

const PAGES = "tickmark-pages-v4";
const ASSETS = "tickmark-assets-v2";
const ROUTES = ["/", "/new", "/climb", "/log", "/buddies", "/insights", "/settings", "/welcome", "/persona"];
const ASSET_PATTERN = /\/_next\/static\/[A-Za-z0-9_\-./%~@[\]()]+/g;

async function warm() {
  const pages = await caches.open(PAGES);
  const assets = await caches.open(ASSETS);
  const wanted = new Set();

  await Promise.all(
    ROUTES.map(async (route) => {
      try {
        const response = await fetch(route, { cache: "no-store" });
        if (!response.ok) return;
        const html = await response.clone().text();
        await pages.put(route, response);
        for (const match of html.match(ASSET_PATTERN) || []) {
          wanted.add(match.replace(/\\+$/, ""));
        }
      } catch {
        // Offline or flaky: keep whatever is already cached.
      }
    }),
  );

  const cacheAsset = async (url) => {
    const hit = await assets.match(url);
    if (hit) return hit;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      await assets.put(url, response.clone());
      return response;
    } catch {
      // Skip; it will be cached the first time the page loads it.
      return null;
    }
  };

  // Stylesheets point at the font files, which the HTML never mentions.
  const fonts = new Set();
  await Promise.all(
    [...wanted].map(async (url) => {
      const response = await cacheAsset(url);
      if (!response || !url.includes(".css")) return;
      const css = await response.clone().text();
      for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        if (match[1].startsWith("data:")) continue;
        const resolved = new URL(match[1], new URL(url, self.location.origin));
        if (
          resolved.origin === self.location.origin &&
          resolved.pathname.startsWith("/_next/static/")
        ) {
          fonts.add(resolved.pathname);
        }
      }
    }),
  );
  await Promise.all([...fonts].map(cacheAsset));
}

self.addEventListener("install", (event) => {
  event.waitUntil(warm().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, ASSETS]);
      for (const name of await caches.keys()) {
        if (name.startsWith("tickmark-") && !keep.has(name)) {
          await caches.delete(name);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "warm") event.waitUntil(warm());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build assets never change: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Full page loads: network-first, cached copy when offline. Query strings
  // (such as /climb?id=...) are read in the browser, so they share one copy.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(url.pathname, response.clone());
          return response;
        } catch {
          const hit =
            (await cache.match(url.pathname)) || (await cache.match("/"));
          if (hit) return hit;
          return new Response("Tickmark is offline and not cached yet.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })(),
    );
    return;
  }

  // Everything else on this origin (icons, manifest, in-app navigation data):
  // network-first with a cached fallback.
  event.respondWith(
    (async () => {
      const cache = await caches.open(PAGES);
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        const hit = await cache.match(request);
        if (hit) return hit;
        return Response.error();
      }
    })(),
  );
});
