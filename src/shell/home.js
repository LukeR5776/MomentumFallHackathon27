// Home page: "Eight Challenges" heading + 3×3 grid with the title card in the centre.

import { challenges } from '../challenges/registry.js';
import { hrefChallenge } from './router.js';

function tile(c) {
  const a = document.createElement('a');
  a.className = 'tile';
  a.href = hrefChallenge(c.slug);

  const img = document.createElement('img');
  img.src = c.thumb;
  img.alt = '';
  img.width = 240;
  img.height = 160;
  img.loading = 'lazy';

  const cap = document.createElement('span');
  cap.className = 'tile-caption';
  const num = document.createElement('span');
  num.className = 'tile-num';
  num.textContent = `${c.n}.`;
  cap.append(num, ` ${c.title}`);

  a.append(img, cap);
  return a;
}

function titleCard() {
  const div = document.createElement('div');
  div.className = 'tile tile-title';
  div.innerHTML = `
    <p class="title-event">Fall Hack-a-Thon 2026</p>
    <p class="title-sub">Matter.js Simulations</p>`;
  return div;
}

export function renderHome(root) {
  document.title = 'Eight Challenges · Fall Hack-a-Thon 2026';
  const page = document.createElement('main');
  page.className = 'home';

  const h1 = document.createElement('h1');
  h1.className = 'home-heading';
  h1.textContent = 'Eight Challenges';

  const grid = document.createElement('div');
  grid.className = 'home-grid';
  const tiles = challenges.map(tile);
  tiles.splice(4, 0, titleCard());
  grid.append(...tiles);

  page.append(h1, grid);
  root.replaceChildren(page);
}
