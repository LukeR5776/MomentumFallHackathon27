// Ordered list of all eight challenges. Filled in on day one by the shell owner —
// challenge devs never need to edit this file.
//
// `load` is a dynamic import so each challenge is code-split into its own chunk.
// `thumb` is resolved by Vite at build time (static string required).

export const challenges = [
  {
    n: 1,
    slug: 'gravity',
    title: 'Create a world with gravity',
    load: () => import('./01-gravity/index.js'),
    thumb: new URL('./01-gravity/thumb.svg', import.meta.url).href,
  },
  {
    n: 2,
    slug: 'object-types',
    title: 'Add multiple types of objects',
    load: () => import('./02-object-types/index.js'),
    thumb: new URL('./02-object-types/thumb.svg', import.meta.url).href,
  },
  {
    n: 3,
    slug: 'mouse-drag',
    title: 'Add mouse dragging',
    load: () => import('./03-mouse-drag/index.js'),
    thumb: new URL('./03-mouse-drag/thumb.svg', import.meta.url).href,
  },
  {
    n: 4,
    slug: 'body-count',
    title: 'Adjust numbers of bodies dynamically',
    load: () => import('./04-body-count/index.js'),
    thumb: new URL('./04-body-count/thumb.svg', import.meta.url).href,
  },
  {
    n: 5,
    slug: 'collisions',
    title: 'Collision Detection',
    load: () => import('./05-collisions/index.js'),
    thumb: new URL('./05-collisions/thumb.svg', import.meta.url).href,
  },
  {
    n: 6,
    slug: 'forces',
    title: 'Additional Forces',
    load: () => import('./06-forces/index.js'),
    thumb: new URL('./06-forces/thumb.svg', import.meta.url).href,
  },
  {
    n: 7,
    slug: 'connect',
    title: 'Connect bodies',
    load: () => import('./07-connect/index.js'),
    thumb: new URL('./07-connect/thumb.svg', import.meta.url).href,
  },
  {
    n: 8,
    slug: 'stats',
    title: 'Show stats',
    load: () => import('./08-stats/index.js'),
    thumb: new URL('./08-stats/thumb.svg', import.meta.url).href,
  },
];

export const bySlug = (slug) => challenges.find((c) => c.slug === slug);
export default challenges;
