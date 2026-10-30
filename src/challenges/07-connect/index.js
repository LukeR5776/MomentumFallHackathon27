// Challenge 7 — constraints: Newton's cradle, rope, bridge, soft body, and draw-your-own links.
// All mutable state lives in setup() so Reset rebuilds from scratch.

const PRESETS = {
  cradle: { stiffness: 0.95, damping: 0, lengthMul: 1, color: false },
  chain: { stiffness: 0.75, damping: 0.06, lengthMul: 1, color: true },
  bridge: { stiffness: 0.55, damping: 0.08, lengthMul: 1, color: true },
  soft: { stiffness: 0.14, damping: 0.08, lengthMul: 1, color: true },
  draw: { stiffness: 0.4, damping: 0.05, lengthMul: 1, color: true },
};

const MODES = [
  { label: 'Cradle', value: 'cradle' },
  { label: 'Chain', value: 'chain' },
  { label: 'Bridge', value: 'bridge' },
  { label: 'Soft body', value: 'soft' },
  { label: 'Draw', value: 'draw' },
];

export default {
  slug: 'connect',
  title: 'Connect bodies',
  about:
    'Constraints hold a fixed distance between two points, from a rigid pin to a soft spring. Switch scenes to compare a Newton\'s cradle, a hanging rope, a plank bridge, and a soft body, then drag them while stiffness, damping, and rest length update live. Draw mode links any two bodies with a click and removes a link with a right-click or the Remove last link button.',
  apis: [
    'Composites.stack',
    'Composites.chain',
    'Composites.softBody',
    'Constraint.create',
    'Composite.create',
    'Composite.add',
    'Composite.remove',
    'Bodies.circle',
    'Bodies.rectangle',
    'Body.setPosition',
    'Body.setVelocity',
    'Body.setAngularVelocity',
    'Body.nextGroup',
  ],

  setup(ctx) {
    const { Matter, world, engine, theme, controls, helpers } = ctx;
    const { Bodies, Body, Composite, Composites, Constraint, Common } = Matter;

    const tank = helpers.makeTank();
    const mouseRig = helpers.addMouse({ stiffness: 0.55, damping: 0.08, showLine: true });

    // A few extra solver passes keep ropes and the cradle from stretching apart.
    engine.positionIterations = 10;
    engine.constraintIterations = 6;

    let mode = 'cradle';
    let stiffness = PRESETS.cradle.stiffness;
    let damping = PRESETS.cradle.damping;
    let lengthMul = PRESETS.cradle.lengthMul;
    let colorByStretch = PRESETS.cradle.color;
    let ballCount = 5;
    let restitution = 1;
    let sceneRoot = null;
    const loose = [];
    let selected = null;
    let rebuildQueued = false;
    const fills = new WeakMap();
    const pins = new WeakMap();
    let pointerDown = null;

    function anchor(constraint, which) {
      const body = which === 'A' ? constraint.bodyA : constraint.bodyB;
      const point = (which === 'A' ? constraint.pointA : constraint.pointB) || { x: 0, y: 0 };
      if (!body) return { x: point.x, y: point.y };
      const cos = Math.cos(body.angle);
      const sin = Math.sin(body.angle);
      return {
        x: body.position.x + point.x * cos - point.y * sin,
        y: body.position.y + point.x * sin + point.y * cos,
      };
    }

    function eachLink(fn) {
      const visit = (node) => {
        for (const constraint of node.constraints) fn(constraint);
        for (const child of node.composites) visit(child);
      };
      if (sceneRoot) visit(sceneRoot);
    }

    function prepare(constraint) {
      if (constraint._baseLength == null) constraint._baseLength = constraint.length;
      constraint.stiffness = stiffness;
      constraint.damping = damping;
      constraint.length = constraint._baseLength * lengthMul;
      if (!colorByStretch) constraint.render.strokeStyle = theme.line;
      return constraint;
    }

    function prepareAll(node) {
      for (const constraint of node.constraints) prepare(constraint);
      for (const child of node.composites) prepareAll(child);
    }

    function applyShared() {
      eachLink(prepare);
    }

    function paintStretch() {
      eachLink((constraint) => {
        const rest = constraint.length;
        if (!(rest > 0.5)) {
          constraint.render.strokeStyle = theme.line;
          return;
        }
        const a = anchor(constraint, 'A');
        const b = anchor(constraint, 'B');
        const ratio = Math.hypot(b.x - a.x, b.y - a.y) / rest;
        if (ratio > 1.22) constraint.render.strokeStyle = theme.accent;
        else if (ratio > 1.06) constraint.render.strokeStyle = theme.accentSoft;
        else if (ratio < 0.88) constraint.render.strokeStyle = theme.slateLight;
        else constraint.render.strokeStyle = theme.line;
      });
    }

    function linkStyle() {
      return theme.constraint({ anchors: false, lineWidth: 1.25 });
    }

    function releaseGrab() {
      const mouseConstraint = mouseRig.constraint;
      if (!mouseConstraint) return;
      mouseConstraint.body = null;
      if (mouseConstraint.constraint) mouseConstraint.constraint.bodyB = null;
    }

    function restoreSelection() {
      if (!selected) return;
      const previous = fills.get(selected);
      if (previous != null) selected.render.fillStyle = previous;
      selected = null;
    }

    function clearScene() {
      restoreSelection();
      releaseGrab();
      if (sceneRoot) {
        Composite.remove(world, sceneRoot);
        sceneRoot = null;
      }
      if (loose.length) {
        Composite.remove(world, loose);
        loose.length = 0;
      }
    }

    function addLoose(body) {
      Composite.add(world, body);
      loose.push(body);
    }

    function buildCradle() {
      const inner = tank.inner;
      const count = ballCount;
      const separation = 1.9;
      const avail = (inner.right - inner.left) * 0.8;
      const radius = Math.max(9, Math.min(24, avail / ((count - 1) * separation + 2)));
      const span = (count - 1) * radius * separation;
      const startX = (inner.left + inner.right) / 2 - span / 2;
      const pinY = 40;
      let length = Math.min(200, Math.max(100, (inner.bottom - pinY) * 0.52));
      if (pinY + length + radius > inner.bottom - 20) {
        length = Math.max(70, inner.bottom - 20 - pinY - radius);
      }

      const cradle = Composite.create({ label: 'Newtons Cradle' });
      const bar = Bodies.rectangle(startX + span / 2, pinY, span + radius * 2, 6, {
        isStatic: true,
        isSensor: true,
        label: 'cradle-bar',
        collisionFilter: { category: 0x0002, mask: 0, group: 0 },
        render: theme.body('wall'),
      });
      Composite.add(cradle, bar);

      for (let i = 0; i < count; i += 1) {
        const x = startX + i * radius * separation;
        const ball = Bodies.circle(x, pinY + length, radius, {
          inertia: Infinity,
          restitution,
          friction: 0,
          frictionAir: 0.0001,
          slop: 0.5,
          label: i === 0 ? 'ball-1' : `ball-${i + 1}`,
          render: theme.body(i === 0 ? 'accent' : 'slate'),
        });
        const string = Constraint.create({
          pointA: { x, y: pinY },
          bodyB: ball,
          stiffness,
          damping,
          length,
          label: 'string',
          render: linkStyle(),
        });
        pins.set(ball, { x, y: pinY });
        Composite.add(cradle, [ball, string]);
      }

      prepareAll(cradle);
      Composite.add(world, cradle);
      sceneRoot = cradle;
    }

    function pullBack(count) {
      if (mode !== 'cradle' || !sceneRoot) return;
      const angle = Math.PI / 3;
      let pulled = 0;
      for (const ball of sceneRoot.bodies) {
        if (pulled >= count) break;
        const pin = pins.get(ball);
        if (!pin) continue;
        const string = sceneRoot.constraints.find((constraint) => constraint.bodyB === ball);
        const length = string ? string.length : 100;
        Body.setPosition(ball, {
          x: pin.x - Math.sin(angle) * length,
          y: pin.y + Math.cos(angle) * length,
        });
        Body.setVelocity(ball, { x: 0, y: 0 });
        Body.setAngularVelocity(ball, 0);
        pulled += 1;
      }
    }

    function buildChain() {
      const inner = tank.inner;
      const linkW = 16;
      const linkH = 12;
      const gap = 5;
      const cols = Math.max(8, Math.min(18, Math.floor((inner.right - inner.left) * 0.62 / (linkW + gap))));
      const group = Body.nextGroup(true);
      const originX = inner.left + 28;
      const originY = 48;
      const rope = Composites.stack(originX, originY, cols, 1, gap, 0, (x, y) => Bodies.rectangle(x, y, linkW, linkH, {
        friction: 0.2,
        frictionAir: 0.02,
        density: 0.002,
        collisionFilter: { group },
        render: theme.body('slate'),
      }));
      const last = rope.bodies[rope.bodies.length - 1];
      last.render.fillStyle = theme.accent;

      Composites.chain(rope, 0.5, 0, -0.5, 0, {
        stiffness,
        damping,
        render: linkStyle(),
      });

      const first = rope.bodies[0];
      Composite.add(rope, Constraint.create({
        pointA: { x: first.position.x - linkW / 2, y: first.position.y },
        bodyB: first,
        pointB: { x: -linkW / 2, y: 0 },
        stiffness,
        damping,
        length: 2,
        label: 'pin',
        render: linkStyle(),
      }));

      prepareAll(rope);
      Composite.add(world, rope);
      sceneRoot = rope;
    }

    function buildBridge() {
      const inner = tank.inner;
      const plankW = 40;
      const plankH = 14;
      const gap = 4;
      const margin = 32;
      const span = inner.right - inner.left - margin * 2;
      const cols = Math.max(5, Math.min(12, Math.floor((span + gap) / (plankW + gap))));
      const total = cols * plankW + (cols - 1) * gap;
      const originX = inner.left + (inner.right - inner.left - total) / 2;
      const originY = Math.min(inner.bottom * 0.46, inner.bottom - 180);
      const group = Body.nextGroup(true);

      const bridge = Composites.stack(originX, originY, cols, 1, gap, 0, (x, y) => Bodies.rectangle(x, y, plankW, plankH, {
        density: 0.0015,
        friction: 0.8,
        frictionAir: 0.02,
        collisionFilter: { group },
        render: theme.body('slate'),
      }));

      Composites.chain(bridge, 0.5, 0, -0.5, 0, {
        stiffness,
        damping,
        render: linkStyle(),
      });

      const first = bridge.bodies[0];
      const end = bridge.bodies[bridge.bodies.length - 1];
      Composite.add(bridge, [
        Constraint.create({
          pointA: { x: first.position.x - plankW / 2, y: first.position.y },
          bodyB: first,
          pointB: { x: -plankW / 2, y: 0 },
          stiffness,
          damping,
          length: 4,
          label: 'pin',
          render: linkStyle(),
        }),
        Constraint.create({
          pointA: { x: end.position.x + plankW / 2, y: end.position.y },
          bodyB: end,
          pointB: { x: plankW / 2, y: 0 },
          stiffness,
          damping,
          length: 4,
          label: 'pin',
          render: linkStyle(),
        }),
      ]);

      prepareAll(bridge);
      Composite.add(world, bridge);
      sceneRoot = bridge;
    }

    function dropBoxes() {
      if (mode !== 'bridge' || !sceneRoot) return;
      const inner = tank.inner;
      const cap = 18;
      while (loose.length + 3 > cap) {
        const oldest = loose.shift();
        if (oldest) Composite.remove(world, oldest);
      }
      for (let i = 0; i < 3; i += 1) {
        const size = 26 + i * 8;
        const box = Bodies.rectangle(
          (inner.left + inner.right) / 2 + (i - 1) * 42,
          28 + i * 32,
          size,
          size,
          {
            density: 0.002,
            friction: 0.6,
            restitution: 0.05,
            label: `crate-${loose.length + 1}`,
            render: theme.body(i === 1 ? 'accent' : 'slateLight'),
          },
        );
        addLoose(box);
      }
    }

    function buildSoft() {
      const inner = tank.inner;
      const radius = 9;
      const cols = Math.max(4, Math.min(6, Math.floor((inner.right - inner.left) * 0.5 / (radius * 2))));
      const rows = Math.max(4, Math.min(5, cols));
      const gridW = cols * radius * 2;
      const originX = (inner.left + inner.right) / 2 - gridW / 2;
      const originY = 36;
      const group = Body.nextGroup(true);

      // Composites.softBody is deprecated in matter-js 0.20 and warns on use.
      // Silence only this call so the page stays warning-free, then restore logging.
      const previousLog = Common.logLevel;
      Common.logLevel = 0;
      let soft;
      try {
        soft = Composites.softBody(
          originX,
          originY,
          cols,
          rows,
          0,
          0,
          true,
          radius,
          {
            friction: 0.3,
            frictionAir: 0.015,
            restitution: 0.05,
            density: 0.002,
            collisionFilter: { group },
            render: theme.body('slate'),
          },
          {
            stiffness,
            damping,
            render: linkStyle(),
          },
        );
      } finally {
        Common.logLevel = previousLog;
      }

      const middle = soft.bodies[Math.floor(soft.bodies.length / 2)];
      if (middle) middle.render.fillStyle = theme.accent;
      prepareAll(soft);
      Composite.add(world, soft);
      sceneRoot = soft;
    }

    function buildDraw() {
      const inner = tank.inner;
      const draw = Composite.create({ label: 'Draw' });
      const specs = [
        { x: 0.22, y: 0.28, kind: 'circle', r: 20, style: 'slate' },
        { x: 0.4, y: 0.22, kind: 'circle', r: 14, style: 'slateLight' },
        { x: 0.58, y: 0.3, kind: 'box', w: 40, h: 40, style: 'slate' },
        { x: 0.74, y: 0.2, kind: 'box', w: 52, h: 26, style: 'slateLight' },
        { x: 0.32, y: 0.48, kind: 'circle', r: 16, style: 'slate' },
        { x: 0.52, y: 0.5, kind: 'circle', r: 18, style: 'slateLight' },
        { x: 0.68, y: 0.46, kind: 'box', w: 34, h: 34, style: 'slate' },
      ];
      for (const spec of specs) {
        const x = inner.left + (inner.right - inner.left) * spec.x;
        const y = inner.bottom * spec.y;
        const body = spec.kind === 'circle'
          ? Bodies.circle(x, y, spec.r, {
            restitution: 0.2,
            friction: 0.3,
            density: 0.0015,
            render: theme.body(spec.style),
          })
          : Bodies.rectangle(x, y, spec.w, spec.h, {
            restitution: 0.1,
            friction: 0.4,
            density: 0.0015,
            render: theme.body(spec.style),
          });
        Composite.add(draw, body);
      }
      Composite.add(world, draw);
      sceneRoot = draw;
    }

    function alreadyLinked(a, b) {
      let found = false;
      eachLink((constraint) => {
        if ((constraint.bodyA === a && constraint.bodyB === b) || (constraint.bodyA === b && constraint.bodyB === a)) {
          found = true;
        }
      });
      return found;
    }

    function connectBodies(a, b) {
      if (!sceneRoot || a === b || alreadyLinked(a, b)) return;
      const constraint = prepare(Constraint.create({
        bodyA: a,
        bodyB: b,
        stiffness,
        damping,
        label: 'link',
        render: linkStyle(),
      }));
      Composite.add(sceneRoot, constraint);
    }

    function nearestLink(point) {
      let best = null;
      let bestDist = 18;
      eachLink((constraint) => {
        if (!constraint.bodyA || !constraint.bodyB) return;
        const a = anchor(constraint, 'A');
        const b = anchor(constraint, 'B');
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        let t = len2 === 0 ? 0 : ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const dist = Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
        if (dist < bestDist) {
          bestDist = dist;
          best = constraint;
        }
      });
      return best;
    }

    function removeLastLink() {
      if (mode !== 'draw' || !sceneRoot) return;
      const list = sceneRoot.constraints;
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const constraint = list[i];
        if (constraint.bodyA && constraint.bodyB) {
          Composite.remove(sceneRoot, constraint);
          return;
        }
      }
    }

    function rebuild() {
      clearScene();
      if (mode === 'cradle') buildCradle();
      else if (mode === 'chain') buildChain();
      else if (mode === 'bridge') buildBridge();
      else if (mode === 'soft') buildSoft();
      else buildDraw();
      if (colorByStretch) paintStretch();
    }

    function queueRebuild() {
      if (ctx.paused) rebuild();
      else rebuildQueued = true;
    }

    function applyPreset(preset) {
      stiffness = preset.stiffness;
      damping = preset.damping;
      lengthMul = preset.lengthMul;
      colorByStretch = preset.color;
      stiffnessSlider.set(preset.stiffness, { silent: true });
      dampingSlider.set(preset.damping, { silent: true });
      lengthSlider.set(preset.lengthMul, { silent: true });
      colorToggle.set(preset.color, { silent: true });
    }

    function pointerPoint(event) {
      const rect = ctx.canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    controls.section('Scene');
    controls.segmented({
      label: 'Mode',
      options: MODES,
      value: 'cradle',
      onChange: (value) => {
        mode = value;
        applyPreset(PRESETS[value]);
        queueRebuild();
      },
    });

    controls.section('Constraint');
    const stiffnessSlider = controls.slider({
      label: 'Stiffness',
      min: 0.02,
      max: 1,
      step: 0.01,
      value: stiffness,
      onInput: (value) => {
        stiffness = value;
        applyShared();
      },
    });
    const dampingSlider = controls.slider({
      label: 'Damping',
      min: 0,
      max: 0.4,
      step: 0.01,
      value: damping,
      onInput: (value) => {
        damping = value;
        applyShared();
      },
    });
    const lengthSlider = controls.slider({
      label: 'Length multiplier',
      min: 0.5,
      max: 1.8,
      step: 0.05,
      value: lengthMul,
      onInput: (value) => {
        lengthMul = value;
        applyShared();
      },
    });
    const colorToggle = controls.toggle({
      label: 'Color by stretch',
      value: colorByStretch,
      onChange: (value) => {
        colorByStretch = value;
        if (value) paintStretch();
        else eachLink((constraint) => { constraint.render.strokeStyle = theme.line; });
      },
    });

    controls.section("Newton's cradle");
    controls.slider({
      label: 'Ball count',
      min: 3,
      max: 7,
      step: 1,
      value: ballCount,
      onInput: (value) => {
        ballCount = Math.round(value);
        if (mode === 'cradle') queueRebuild();
      },
    });
    controls.slider({
      label: 'Restitution',
      min: 0,
      max: 1,
      step: 0.05,
      value: restitution,
      onInput: (value) => {
        restitution = value;
        if (!sceneRoot || mode !== 'cradle') return;
        for (const body of sceneRoot.bodies) body.restitution = value;
      },
    });
    controls.button({ label: 'Pull back 1', onClick: () => pullBack(1) });
    controls.button({ label: 'Pull back 2', onClick: () => pullBack(2) });
    controls.button({ label: 'Pull back 3', onClick: () => pullBack(3) });

    controls.section('Bridge');
    controls.button({ label: 'Drop boxes', onClick: dropBoxes });

    controls.section('Draw your own');
    controls.button({ label: 'Remove last link', onClick: removeLastLink });

    ctx.on(engine, 'beforeUpdate', () => {
      if (!rebuildQueued) return;
      rebuildQueued = false;
      rebuild();
    });
    ctx.on(engine, 'afterUpdate', () => {
      if (colorByStretch) paintStretch();
    });

    ctx.listen(ctx.canvas, 'pointerdown', (event) => {
      if (mode !== 'draw' || event.button !== 0) return;
      pointerDown = pointerPoint(event);
    });
    ctx.listen(ctx.canvas, 'pointerup', (event) => {
      if (mode !== 'draw' || !pointerDown || event.button !== 0) return;
      const point = pointerPoint(event);
      const moved = Math.hypot(point.x - pointerDown.x, point.y - pointerDown.y);
      pointerDown = null;
      if (moved > 8) return;
      const hits = helpers.bodiesAt(point);
      const body = hits[0];
      if (!body) {
        restoreSelection();
        return;
      }
      if (!selected) {
        fills.set(body, body.render.fillStyle);
        body.render.fillStyle = theme.accent;
        selected = body;
        return;
      }
      if (selected === body) {
        restoreSelection();
        return;
      }
      const first = selected;
      restoreSelection();
      connectBodies(first, body);
    });
    ctx.listen(ctx.canvas, 'contextmenu', (event) => {
      if (mode !== 'draw') return;
      event.preventDefault();
      const link = nearestLink(pointerPoint(event));
      if (link && sceneRoot) Composite.remove(sceneRoot, link);
    });

    ctx.onResize(() => queueRebuild());

    ctx.onOverlay((g) => {
      if (mode !== 'draw') return;
      const hint = selected
        ? 'Click a second body to connect. Right-click a link to remove it.'
        : 'Click two bodies to connect them. Right-click a link to remove it.';
      helpers.drawLabel(g, hint, 16, 22, { color: theme.ink, size: 12 });
    });

    rebuild();
  },
};
