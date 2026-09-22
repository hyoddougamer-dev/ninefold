/**
 * 新 Keeping the installed game up to date, without anyone downloading anything again.
 *
 * Bruno's requirement, and the one that shapes the whole delivery: the app is installed
 * **once**. After that a new version arrives because the page it wraps was republished,
 * not because anyone fetched an APK. So there is a service worker, it fetches from the
 * network first and falls back to its cache, and this file is the small part the game
 * itself has to do:
 *
 *   1. Register the worker, and say nothing if the browser has none.
 *   2. Notice when a newer one has installed behind the running page.
 *   3. Tell the player, and let *them* pick the moment: never reload underneath them,
 *      because reloading mid-fight would throw away the fight.
 *
 * A save is untouched by any of this: it lives in localStorage, which survives every
 * version of every worker.
 */

export type OnUpdate = () => void;

let waiting: ServiceWorker | null = null;

export function watchForUpdates(onUpdate: OnUpdate): void {
  if (!('serviceWorker' in navigator)) return;

  // A worker only registers over https or on localhost. Anywhere else it simply is not
  // available, and the game has to work exactly the same without it.
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href, { scope: './' })
    .then((reg) => {
      const offer = (sw: ServiceWorker | null) => {
        if (!sw) return;
        // controller is null on the very first visit: that install is not an *update*.
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          waiting = sw;
          onUpdate();
        }
      };

      offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => offer(sw));
      });

      warm();

      // An idle game sits open for hours. Ask again now and then, or a version can be
      // a day old on a screen nobody closed.
      setInterval(() => { void reg.update(); }, 30 * 60 * 1000);
    })
    .catch(() => { /* no worker, no update prompt. The game is unaffected. */ });
}

/**
 * Tell the worker what this page is made of, so it can hold on to it.
 *
 * The worker cannot know the asset names. They carry a build hash that changes every
 * time, and the first visit loads them before the worker exists to intercept anything.
 * So the page reads its own resource list and hands it over. Without this the game only
 * opens offline from the *second* visit, which for a three-month idle game is a visit
 * too late.
 */
function warm(): void {
  const send = () => {
    const sw = navigator.serviceWorker.controller;
    if (!sw) return;
    const here = location.origin;
    const urls = performance.getEntriesByType('resource')
      .map((e) => e.name)
      .filter((u) => u.startsWith(here));
    sw.postMessage({ type: 'warm', urls: [location.href, ...urls] });
  };

  if (navigator.serviceWorker.controller) send();
  // On the first visit the worker takes control a moment after the page has loaded.
  else navigator.serviceWorker.addEventListener('controllerchange', send, { once: true });
}

/** Take the new version now. Called from the player's own tap, never on a timer. */
export function takeUpdate(): void {
  if (!waiting) {
    location.reload();
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  waiting.postMessage({ type: 'skip-waiting' });
  // Some browsers hand over without the message; reload anyway if nothing happens.
  setTimeout(() => location.reload(), 1200);
}
