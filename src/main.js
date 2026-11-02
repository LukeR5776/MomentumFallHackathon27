import './shell/styles.css';
import { startRouter, hrefChallenge } from './shell/router.js';
import { createStage } from './shell/stage.js';
import { bySlug } from './challenges/registry.js';

const DAY_JAR = 'body-count';
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

async function showDayJar(entry, token) {
  document.title = 'Day Jar · Matter.js';

  const page = el('div', 'page');
  const main = el('main', 'challenge');
  const head = el('div', 'challenge-head');
  head.append(
    el('p', 'challenge-num', 'Day Jar'),
    el('h1', 'challenge-title', entry.title),
  );

  const layout = el('div', 'challenge-layout');
  const stageEl = el('div', 'stage');
  const panelEl = el('aside', 'panel');
  panelEl.setAttribute('aria-label', 'Controls');
  const aboutEl = el('section', 'about');
  layout.append(stageEl, panelEl, aboutEl);

  main.append(head, layout);
  page.append(main);
  app.replaceChildren(page);
  window.scrollTo(0, 0);

  let mod;
  try {
    mod = await entry.load();
  } catch (err) {
    console.error(`[main] failed to load Day Jar:`, err);
    stageEl.append(el('p', 'stage-error', 'Day Jar failed to load.'));
    return;
  }
  if (token !== navToken) return;

  stage = createStage({ challenge: mod.default, stageEl, panelEl, aboutEl });
}

startRouter((route) => {
  const token = ++navToken;
  teardown();

  // Always play Day Jar — ignore other routes / home grid.
  if (route.name !== 'challenge' || route.slug !== DAY_JAR) {
    history.replaceState(null, '', hrefChallenge(DAY_JAR));
  }

  const entry = bySlug(DAY_JAR);
  if (entry) showDayJar(entry, token);
  else app.replaceChildren(el('p', 'stage-error', 'Day Jar is missing from the registry.'));
});
