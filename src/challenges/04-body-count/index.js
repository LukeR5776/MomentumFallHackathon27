// Day Jar — wellbeing demo. Fill the jar with tiny wins; arrange by feel.

const ADD_PER_TICK = 20;
const REMOVE_PER_TICK = 400;
const FAST_SPEED = 8;

const WINS = [
  { id: 'rest', label: 'rest', kind: 'accentSoft' },
  { id: 'move', label: 'move', kind: 'slateLight' },
  { id: 'connect', label: 'connect', kind: 'accent' },
  { id: 'create', label: 'create', kind: 'slate' },
  { id: 'laugh', label: 'laugh', kind: 'accentSoft' },
];

const VIBES = [
  { max: 0, text: 'blank page' },
  { max: 12, text: 'gentle start' },
  { max: 30, text: 'warming up' },
  { max: 80, text: 'nicely full' },
  { max: 200, text: 'overflowing' },
  { max: Infinity, text: 'party in a jar' },
];

function vibeFor(n) {
  return VIBES.find((v) => n <= v.max).text;
}

export default {
  slug: 'body-count',
  title: 'Day Jar — fill & arrange your wins',
  about:
    'A playful wellbeing sandbox on top of live body count. Each circle or box is a tiny win (rest, move, connect, create, laugh). Dial how full your day feels, watch the pile grow, and shake it off when you need a reset. No wrong answers — just physics and vibes.',
  apis: [
    'Bodies.circle',
    'Bodies.rectangle',
    'Composite.add',
    'Composite.remove',
    'Body.setVelocity',
    'body.speed',
    'MouseConstraint',
  ],

  setup(ctx) {
    const { Matter, engine, world, theme, controls, helpers } = ctx;
    const { Bodies, Body, Composite } = Matter;

    const tank = helpers.makeTank();
    helpers.addMouse({ stiffness: 0.2, damping: 0.05, showLine: true });

    const bodies = [];
    const baseFill = new WeakMap();
    const fpsByCount = new Map();

    let target = 24;
    let size = 10;
    let mix = 'circles';
    let autoCap = false;
    let capped = false;
    let fps = 60;
    let pulse = 0;

    const samples = [];
    let prev = performance.now();
    let frame = 0;

    const countReadout = { set() {} };
    const fpsReadout = { set() {} };
    const spawningReadout = { set() {} };

    function spawnX(half) {
      const { left, right } = tank.inner;
      const min = left + half + 1;
      const max = right - half - 1;
      if (max <= min) return (left + right) / 2;
      return helpers.randomBetween(min, max);
    }

    function pickWin() {
      return WINS[Math.floor(helpers.randomBetween(0, WINS.length))];
    }

    function makeBody() {
      const win = pickWin();
      const useCircle = mix === 'circles' || (mix === 'mixed' && Math.random() < 0.5);
      const kind = win.kind;
      const radius = Math.max(3, size * helpers.randomBetween(0.72, 1.28));
      const y = -radius - helpers.randomBetween(0, 36);
      const common = {
        restitution: 0.45,
        friction: 0.04,
        frictionAir: 0.01,
        label: win.label,
        render: theme.body(kind),
      };
      const body = useCircle
        ? Bodies.circle(spawnX(radius), y, radius, common)
        : Bodies.rectangle(
          spawnX(radius),
          y,
          radius * 2,
          radius * helpers.randomBetween(1.5, 2.6),
          {
            ...common,
            restitution: 0.2,
            friction: 0.25,
            angle: helpers.randomBetween(-0.4, 0.4),
            chamfer: { radius: Math.min(2, radius * 0.2) },
          },
        );
      baseFill.set(body, theme[kind] || theme.slate);
      return body;
    }

    function addOne() {
      const body = makeBody();
      Composite.add(world, body);
      bodies.push(body);
    }

    function removeOne() {
      const body = bodies.pop();
      if (body) Composite.remove(world, body);
    }

    function removeAll() {
      target = 0;
      while (bodies.length) removeOne();
      pulse = 16;
    }

    function shakeOff() {
      pulse = 22;
      for (const b of bodies) {
        Body.setVelocity(b, {
          x: helpers.randomBetween(-5, 5),
          y: helpers.randomBetween(-8, -2),
        });
        Body.setAngularVelocity(b, helpers.randomBetween(-0.25, 0.25));
      }
    }

    controls.section('Your day');
    const countSlider = controls.slider({
      label: 'How full?',
      min: 0,
      max: 1000,
      step: 1,
      value: target,
      onInput: (v) => { target = v; },
    });
    controls.button({
      label: '+ a win',
      onClick: () => {
        countSlider.set(Math.min(1000, Math.round(countSlider.value + 1)));
        pulse = 10;
      },
    });
    controls.button({
      label: '+10 wins',
      onClick: () => countSlider.set(Math.min(1000, Math.round(countSlider.value + 10))),
    });
    controls.button({
      label: '+100 (busy day)',
      onClick: () => countSlider.set(Math.min(1000, Math.round(countSlider.value + 100))),
    });
    controls.button({
      label: 'Shake it off',
      onClick: shakeOff,
    });
    controls.button({
      label: 'Fresh start',
      onClick: () => {
        removeAll();
        countSlider.set(0, { silent: true });
      },
    });

    const bodiesOut = controls.readout({ label: 'Wins in jar', value: '0' });
    const vibeOut = controls.readout({ label: 'Vibe', value: vibeFor(0) });
    const fpsOut = controls.readout({ label: 'FPS', value: '—' });
    const spawningOut = controls.readout({ label: 'Flow', value: 'idle' });
    countReadout.set = (v) => {
      bodiesOut.set(v);
      vibeOut.set(vibeFor(Number(v) || 0));
    };
    fpsReadout.set = (v) => fpsOut.set(v);
    spawningReadout.set = (v) => {
      const map = {
        idle: 'settled',
        adding: 'filling…',
        removing: 'letting go…',
        capped: 'taking a breath',
      };
      spawningOut.set(map[v] || v);
    };

    controls.section('Win shapes');
    controls.slider({
      label: 'Win size',
      min: 4,
      max: 26,
      step: 1,
      value: size,
      onInput: (v) => { size = v; },
    });
    controls.select({
      label: 'Mix',
      options: [
        { label: 'Circles (soft)', value: 'circles' },
        { label: 'Boxes (solid)', value: 'boxes' },
        { label: 'Mixed day', value: 'mixed' },
      ],
      value: mix,
      onChange: (v) => { mix = v; },
    });

    controls.section('Energy');
    controls.toggle({
      label: 'Auto-ease when FPS dips',
      value: false,
      onChange: (v) => {
        autoCap = v;
        if (!v) capped = false;
      },
    });
    const plotAnchor = controls.section('Calm meter (FPS vs wins)');
    const plot = document.createElement('canvas');
    plot.setAttribute('aria-label', 'FPS versus win count');
    plot.style.width = '100%';
    plot.style.height = '88px';
    plot.style.display = 'block';
    plot.style.margin = '0.35rem 0 0.6rem';
    plotAnchor.el.insertAdjacentElement('afterend', plot);

    ctx.on(engine, 'beforeUpdate', () => {
      let removed = 0;
      while (bodies.length > target && removed < REMOVE_PER_TICK) {
        removeOne();
        removed += 1;
      }

      if (autoCap) {
        if (fps < 45) capped = true;
        else if (fps > 52) capped = false;
      }
      const hold = autoCap && capped && bodies.length < target;

      let added = 0;
      if (!hold) {
        while (bodies.length < target && added < ADD_PER_TICK) {
          addOne();
          added += 1;
        }
      }

      let mode = 'idle';
      if (hold) mode = 'capped';
      else if (bodies.length < target) mode = 'adding';
      else if (removed > 0 && bodies.length > target) mode = 'removing';
      spawningReadout.set(mode);
    });

    ctx.on(engine, 'afterUpdate', () => {
      for (const body of bodies) {
        const fast = body.speed > FAST_SPEED;
        const fill = fast ? theme.accent : baseFill.get(body);
        const stroke = fast ? theme.accentSoft : theme.wall;
        if (body.render.fillStyle !== fill) body.render.fillStyle = fill;
        if (body.render.strokeStyle !== stroke) body.render.strokeStyle = stroke;
      }
    });

    ctx.onOverlay((g) => {
      if (pulse > 0) pulse -= 1;
      frame += 1;
      const now = performance.now();
      const dt = now - prev;
      prev = now;
      if (dt > 0 && dt < 100) {
        samples.push(dt);
        if (samples.length > 45) samples.shift();
      }
      if (samples.length) {
        const avg = samples.reduce((sum, n) => sum + n, 0) / samples.length;
        fps = 1000 / avg;
      }
      fpsReadout.set(samples.length ? fps.toFixed(0) : '—');
      countReadout.set(String(bodies.length));

      if (frame % 10 === 0) {
        const bucket = Math.round(bodies.length / 10) * 10;
        fpsByCount.set(bucket, fps);
      }

      const countText = String(bodies.length);
      g.font = `400 36px ${theme.fonts.serif}`;
      g.fillStyle = theme.ink;
      g.textAlign = 'right';
      g.textBaseline = 'top';
      const countWidth = g.measureText(countText).width;
      g.fillText(countText, ctx.width - 16, 10);
      g.strokeStyle = theme.wall;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(ctx.width - 16 - countWidth, 50);
      g.lineTo(ctx.width - 16, 50);
      g.stroke();

      g.font = `500 11px ${theme.fonts.sans}`;
      g.fillStyle = theme.slateLight;
      g.textAlign = 'right';
      g.fillText('wins', ctx.width - 16, 56);

      helpers.drawLabel(
        g,
        bodies.length ? `${bodies.length} tiny wins` : 'Empty jar — add a win',
        14,
        20,
        { size: 13, weight: 600, color: theme.ink },
      );
      helpers.drawLabel(
        g,
        pulse > 0 ? 'shake it out…' : vibeFor(bodies.length),
        14,
        40,
        { size: 12, color: pulse > 0 ? theme.accent : theme.slateLight },
      );

      drawPlot(plot, fpsByCount, theme);
    });
  },
};

function drawPlot(plot, fpsByCount, theme) {
  const cssW = plot.clientWidth || 220;
  const cssH = 88;
  const pr = window.devicePixelRatio || 1;
  const pxW = Math.max(1, Math.floor(cssW * pr));
  const pxH = Math.max(1, Math.floor(cssH * pr));
  if (plot.width !== pxW || plot.height !== pxH) {
    plot.width = pxW;
    plot.height = pxH;
  }
  const g = plot.getContext('2d');
  g.setTransform(pr, 0, 0, pr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);
  g.strokeStyle = theme.wall;
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

  const point = (count, sample) => ({
    x: 8 + (count / 1000) * (cssW - 16),
    y: 8 + (1 - Math.max(0, Math.min(sample, 90)) / 90) * (cssH - 22),
  });
  const y60 = point(0, 60).y;
  g.strokeStyle = theme.wall;
  g.beginPath();
  g.moveTo(8, y60);
  g.lineTo(cssW - 8, y60);
  g.stroke();
  g.font = `500 10px ${theme.fonts.sans}`;
  g.fillStyle = theme.slateLight;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText('60', 10, y60 - 7);
  g.textBaseline = 'bottom';
  g.fillText('0', 8, cssH - 3);
  g.textAlign = 'right';
  g.fillText('1000', cssW - 6, cssH - 3);

  const entries = [...fpsByCount.entries()].sort((a, b) => a[0] - b[0]);
  if (!entries.length) return;

  g.beginPath();
  g.strokeStyle = theme.line;
  g.lineWidth = 1.5;
  entries.forEach(([count, sample], i) => {
    const p = point(count, sample);
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  });
  if (entries.length > 1) g.stroke();

  g.fillStyle = theme.ink;
  for (const [count, sample] of entries) {
    const p = point(count, sample);
    g.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
}
