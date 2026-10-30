// Stage: owns the Matter engine / render / runner for one challenge page.
// Builds the `ctx` object handed to `challenge.setup(ctx)` and guarantees
// that everything created through it is torn down on unmount or reset.

import Matter from 'matter-js';
import theme from './theme.js';
import { createControls } from './controls.js';
import { createHelpers } from './helpers.js';

const { Engine, Render, Runner, Events, Composite } = Matter;
const DEV = import.meta.env.DEV;
const STEP_MS = 1000 / 60;

// Live counters for the dev-mode leak check. All should be 0 after unmount.
export const leakStats = { engines: 0, renders: 0, runners: 0, domListeners: 0, matterListeners: 0 };
if (DEV) window.__stageLeakStats = leakStats;

const countHandlers = (obj) =>
  obj?.events ? Object.values(obj.events).reduce((n, list) => n + list.length, 0) : 0;

/**
 * Create a stage for one challenge inside the given page elements.
 * Returns { reset(), destroy() }.
 */
export function createStage({ challenge, stageEl, panelEl, aboutEl }) {
  let instance = null;

  const api = {
    reset() {
      instance?.unmount();
      instance = mountInstance({ challenge, stageEl, panelEl, aboutEl, reset: api.reset });
    },
    destroy() {
      instance?.unmount();
      instance = null;
    },
  };

  renderAbout(aboutEl, challenge);
  api.reset();
  return api;
}

function renderAbout(aboutEl, challenge) {
  aboutEl.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = 'About this challenge';
  const p = document.createElement('p');
  p.textContent = challenge.about || '';
  aboutEl.append(h, p);
  if (challenge.apis?.length) {
    const h3 = document.createElement('h3');
    h3.textContent = 'Matter.js APIs used';
    const ul = document.createElement('ul');
    ul.className = 'api-list';
    for (const api of challenge.apis) {
      const li = document.createElement('li');
      const code = document.createElement('code');
      code.textContent = api;
      li.append(code);
      ul.append(li);
    }
    aboutEl.append(h3, ul);
  }
}

function measure(el) {
  const r = el.getBoundingClientRect();
  return { width: Math.max(1, Math.floor(r.width)), height: Math.max(1, Math.floor(r.height)) };
}

function mountInstance({ challenge, stageEl, panelEl, aboutEl, reset }) {
  const cleanups = [];
  const resizeFns = [];
  const overlayFns = [];
  const mice = [];
  let paused = false;
  let size = measure(stageEl);

  // --- Engine / render / runner ------------------------------------------------
  const engine = Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  leakStats.engines++;

  const render = Render.create({
    element: stageEl,
    engine,
    options: {
      width: size.width,
      height: size.height,
      pixelRatio: window.devicePixelRatio || 1,
      background: theme.bg,
      wireframes: false,
    },
  });
  render.canvas.className = 'stage-canvas';
  leakStats.renders++;

  const runner = Runner.create();
  leakStats.runners++;

  // --- Control panel skeleton: shared Pause / Step / Reset bar ----------------
  panelEl.replaceChildren();
  const bar = document.createElement('div');
  bar.className = 'panel-bar';
  const mkBtn = (label, title) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ctl-btn';
    b.textContent = label;
    b.title = title;
    bar.append(b);
    return b;
  };
  const pauseBtn = mkBtn('Pause', 'Pause / resume the simulation');
  const stepBtn = mkBtn('Step', 'Advance one frame (while paused)');
  const resetBtn = mkBtn('Reset', 'Rebuild this page from scratch');
  const controlsRoot = document.createElement('div');
  controlsRoot.className = 'panel-controls';
  panelEl.append(bar, controlsRoot);

  // --- ctx ---------------------------------------------------------------------
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    leakStats.domListeners++;
    cleanups.push(() => {
      target.removeEventListener(type, fn, opts);
      leakStats.domListeners--;
    });
  };

  const on = (target, eventName, fn) => {
    Events.on(target, eventName, fn);
    leakStats.matterListeners++;
    cleanups.push(() => {
      Events.off(target, eventName, fn);
      leakStats.matterListeners--;
    });
  };

  const setPaused = (value) => {
    paused = !!value;
    runner.enabled = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(paused));
    stepBtn.disabled = !paused;
  };

  const ctx = {
    Matter,
    engine,
    world: engine.world,
    render,
    runner,
    canvas: render.canvas,
    get width() { return size.width; },
    get height() { return size.height; },
    theme,
    controls: null,
    helpers: null,
    onCleanup: (fn) => cleanups.push(fn),
    on,
    listen,
    onResize: (fn) => resizeFns.push(fn),
    onOverlay: (fn) => overlayFns.push(fn),
    reset: () => reset(),
    get paused() { return paused; },
    setPaused,
  };
  ctx.controls = createControls(controlsRoot, listen);
  ctx.helpers = createHelpers(ctx, { registerMouse: (m) => mice.push(m) });

  listen(pauseBtn, 'click', () => setPaused(!paused));
  listen(stepBtn, 'click', () => { if (paused) Engine.update(engine, STEP_MS); });
  // Defer so we don't tear down the panel from inside its own click handler.
  listen(resetBtn, 'click', () => queueMicrotask(reset));
  setPaused(false);

  // --- Overlay drawing (CSS-pixel coordinates) ---------------------------------
  const failed = new Set();
  Events.on(render, 'afterRender', () => {
    if (!overlayFns.length) return;
    const g = render.context;
    const pr = render.options.pixelRatio;
    for (const fn of overlayFns) {
      if (failed.has(fn)) continue;
      g.save();
      g.setTransform(pr, 0, 0, pr, 0, 0);
      try {
        fn(g);
      } catch (err) {
        failed.add(fn);
        console.error(`[stage] overlay in "${challenge.slug}" threw and was disabled:`, err);
      }
      g.restore();
    }
  });

  // --- Resize ------------------------------------------------------------------
  let rafId = 0;
  const applyResize = () => {
    rafId = 0;
    const next = measure(stageEl);
    const pr = window.devicePixelRatio || 1;
    if (next.width === size.width && next.height === size.height && pr === render.options.pixelRatio) return;
    size = next;
    render.options.width = size.width;
    render.options.height = size.height;
    render.bounds.max.x = render.bounds.min.x + size.width;
    render.bounds.max.y = render.bounds.min.y + size.height;
    Render.setPixelRatio(render, pr);
    for (const m of mice) m.pixelRatio = pr;
    for (const fn of resizeFns) fn({ width: size.width, height: size.height });
  };
  const ro = new ResizeObserver(() => { if (!rafId) rafId = requestAnimationFrame(applyResize); });
  ro.observe(stageEl);

  // --- Setup -------------------------------------------------------------------
  try {
    challenge.setup(ctx);
  } catch (err) {
    console.error(`[stage] setup() for "${challenge.slug}" threw:`, err);
    const msg = document.createElement('p');
    msg.className = 'stage-error';
    msg.textContent = `setup() failed: ${err.message}`;
    stageEl.append(msg);
    cleanups.push(() => msg.remove());
  }

  Render.run(render);
  Runner.run(runner, engine);

  // --- Unmount -----------------------------------------------------------------
  let unmounted = false;
  function unmount() {
    if (unmounted) return;
    unmounted = true;

    ro.disconnect();
    if (rafId) cancelAnimationFrame(rafId);

    for (let i = cleanups.length - 1; i >= 0; i--) {
      try { cleanups[i](); } catch (err) { console.error('[stage] cleanup threw:', err); }
    }

    Render.stop(render);
    Runner.stop(runner);

    const stray = countHandlers(engine) + countHandlers(render);
    Events.off(engine);
    Events.off(render);
    Composite.clear(engine.world, false, true);
    Engine.clear(engine);

    for (const m of mice) {
      const el = m.element;
      el.removeEventListener('mousemove', m.mousemove);
      el.removeEventListener('mousedown', m.mousedown);
      el.removeEventListener('mouseup', m.mouseup);
      el.removeEventListener('wheel', m.mousewheel);
      el.removeEventListener('touchmove', m.mousemove);
      el.removeEventListener('touchstart', m.mousedown);
      el.removeEventListener('touchend', m.mouseup);
    }
    mice.length = 0;
    render.mouse = null;

    render.canvas.remove();
    render.textures = {};
    panelEl.replaceChildren();

    leakStats.engines--;
    leakStats.renders--;
    leakStats.runners--;

    if (DEV) {
      const s = leakStats;
      const leaky = s.engines || s.renders || s.runners || s.domListeners || s.matterListeners;
      console[leaky ? 'warn' : 'debug'](
        `[stage] unmounted "${challenge.slug}" · engines ${s.engines} · renders ${s.renders} · runners ${s.runners}` +
          ` · DOM listeners ${s.domListeners} · Matter listeners ${s.matterListeners}` +
          ` (Events.off cleared ${stray} internal/direct handlers)`,
      );
    }
  }

  return { unmount, ctx };
}
