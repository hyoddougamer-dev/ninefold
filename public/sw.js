/**
 * 守 The service worker.
 *
 * It exists for one reason above the others: **so the app is never downloaded twice.**
 * The installed thing on the phone is a shell around this page, and a new version of
 * the game arrives by the page being republished — not by anyone installing an APK
 * again. That is the whole update story, and it is why the caching strategy below is
 * the one it is.
 *
 * Network first, cache as the fallback:
 *
 *   - Online, you always get the newest build. No stale version can pin itself.
 *   - Offline, you get the last one that loaded, so a three-month idle game still opens
 *     on a train.
 *
 * The other way round — cache first — is faster and wrong here: it serves yesterday's
 * game until something remembers to clear it, which is exactly the "constant downloads"
 * problem in a different coat.
 *
 * The save is not in here. It lives in localStorage and this worker never touches it.
 */

const CACHE = 'ninefold-v1';

self.addEventListener('install', (event) => {
  // Take over at once rather than waiting for every old tab to close.
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Anything from an older cache name is gone; there is only ever one.
    for (const name of await caches.keys()) {
      if (name !== CACHE) await caches.delete(name);
    }
    // The page that installed this worker was fetched *before* it existed, so nothing
    // of it is cached yet. Without this the first reload offline is a blank screen.
    const cache = await caches.open(CACHE);
    try { await cache.add('./'); } catch { /* offline at install: the next load fixes it */ }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  // The page asks for the handover when the player taps "take it now".
  if (event.data && event.data.type === 'skip-waiting') self.skipWaiting();

  /**
   * The page also tells the worker what it is made of. The worker cannot know the asset
   * names — they carry a build hash — and the first load happened before it existed. So
   * the page reads its own resource list and hands it over, once, and the game opens
   * offline from the very first visit rather than the second.
   */
  if (event.data && event.data.type === 'warm' && Array.isArray(event.data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      for (const url of event.data.urls) {
        try {
          if (await cache.match(url)) continue;
          await cache.add(url);
        } catch { /* one asset that will not cache is not worth failing the rest for */ }
      }
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only GETs, and only our own origin. A font from Google is the browser's business.
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(request);
      // Only whole, successful answers are worth keeping; a 404 cached is a 404 for ever.
      if (fresh && fresh.status === 200 && fresh.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch {
      const hit = await caches.match(request);
      if (hit) return hit;
      // A navigation with nothing cached still has to land somewhere.
      if (request.mode === 'navigate') {
        const root = await caches.match('./');
        if (root) return root;
      }
      throw new Error('offline, and nothing cached for this request');
    }
  })());
});
