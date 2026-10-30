import './shell/styles.css';
import { startRouter, hrefHome, hrefChallenge } from './shell/router.js';
import { createStage } from './shell/stage.js';
import { renderHome } from './shell/home.js';
import { challenges, bySlug } from './challenges/registry.js';

const app = document.getElementById('app');
let stage = null;
let navToken = 0;

function teardown() {
  stage?.destroy();
  stage = null;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function buildTopbar(entry) {
  const i = challenges.indexOf(entry);
  const prev = challenges[i - 1];
  const next = challenges[i + 1];

  const bar = el('header', 'topbar');
  const home = el('a', 'site-title', 'Fall Hack-a-Thon 2026 · Matter.js');
  home.href = hrefHome();

  const nav = el('nav', 'topnav');
  nav.setAttribute('aria-label', 'Challenges');
  const link = (target, label) => {
    const a = el('a', 'topnav-link', label);
    if (target) a.href = hrefChallenge(target.slug);
    else a.setAttribute('aria-disabled', 'true');
    return a;
  };

  const jump = el('select', 'topnav-jump');
  jump.setAttribute('aria-label', 'Jump to challenge');
  for (const c of challenges) {
    const o = el('option', null, `${c.n}`);
    o.value = c.slug;
    o.title = c.title;
    o.selected = c === entry;
    jump.append(o);
  }
  // Lives exactly as long as the page DOM, so no cleanup needed.
  jump.addEventListener('change', () => { location.hash = hrefChallenge(jump.value); });

  nav.append(link(prev, '← Prev'), jump, link(next, 'Next →'));
  bar.append(home, nav);
  return bar;
}

async function showChallenge(entry, token) {
  document.title = `${entry.n}. ${entry.title} · Matter.js`;

  const page = el('div', 'page');
  const main = el('main', 'challenge');
  const head = el('div', 'challenge-head');
  head.append(el('p', 'challenge-num', `Challenge ${entry.n}`), el('h1', 'challenge-title', entry.title));

  const layout = el('div', 'challenge-layout');
  const stageEl = el('div', 'stage');
  const panelEl = el('aside', 'panel');
  panelEl.setAttribute('aria-label', 'Controls');
  const aboutEl = el('section', 'about');
  layout.append(stageEl, panelEl, aboutEl);

  main.append(head, layout);
  page.append(buildTopbar(entry), main);
  app.replaceChildren(page);
  window.scrollTo(0, 0);

  let mod;
  try {
    mod = await entry.load();
  } catch (err) {
    console.error(`[main] failed to load challenge "${entry.slug}":`, err);
    stageEl.append(el('p', 'stage-error', 'This challenge failed to load.'));
    return;
  }
  if (token !== navToken) return; // user navigated away while loading

  const challenge = mod.default;
  if (import.meta.env.DEV && challenge.slug !== entry.slug) {
    console.warn(`[main] challenge folder for "${entry.slug}" exports slug "${challenge.slug}"`);
  }
  stage = createStage({ challenge, stageEl, panelEl, aboutEl });
}

startRouter((route) => {
  const token = ++navToken;
  teardown();
  if (route.name === 'challenge') {
    const entry = bySlug(route.slug);
    if (entry) return showChallenge(entry, token);
    history.replaceState(null, '', hrefHome());
  }
  renderHome(app);
});
