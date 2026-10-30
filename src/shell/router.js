// Tiny hash router:  #/  → home,  #/challenge/<slug>  → challenge page.

export function parseHash(hash = location.hash) {
  const m = hash.replace(/^#/, '').match(/^\/challenge\/([\w-]+)\/?$/);
  return m ? { name: 'challenge', slug: m[1] } : { name: 'home' };
}

export const hrefHome = () => '#/';
export const hrefChallenge = (slug) => `#/challenge/${slug}`;

/** Calls `onRoute(route)` now and on every hash change. Returns a stop function. */
export function startRouter(onRoute) {
  const handler = () => onRoute(parseHash());
  window.addEventListener('hashchange', handler);
  handler();
  return () => window.removeEventListener('hashchange', handler);
}
