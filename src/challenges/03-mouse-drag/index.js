// Drag boxes off a platform. The pointer is tied to the grab point by a spring.

function grabPoint(body, pointB) {
  if (!pointB) return null;
  const cos = Math.cos(body.angle);
  const sin = Math.sin(body.angle);
  return {
    x: body.position.x + pointB.x * cos - pointB.y * sin,
    y: body.position.y + pointB.x * sin + pointB.y * cos,
  };
}

function dot(g, x, y, r, color) {
  g.beginPath();
  g.fillStyle = color;
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

const TOY = 0x0002;

const BOXES = [
  { w: 28, h: 28, density: 0.00035, kind: 'slate', label: 'light box' },
  { w: 38, h: 38, density: 0.001, kind: 'slateLight', label: 'medium box' },
  { w: 32, h: 48, density: 0.0032, kind: 'slate', label: 'tall box' },
  { w: 56, h: 20, density: 0.0012, kind: 'slateLight', label: 'plank' },
  { w: 30, h: 30, density: 0.006, kind: 'slate', label: 'dense box' },
];

export default {
  slug: 'mouse-drag',
  title: 'Add mouse dragging',
  about:
    'Drag the boxes with the pointer. A spring follows the cursor: low stiffness feels like a rubber band and high stiffness feels rigid, and letting go mid-swing throws the box. Shift-click a box to pin it, then shift-click again to let it fall.',
  apis: [
    'MouseConstraint',
    'Constraint.stiffness',
    'Constraint.damping',
    'Bodies.rectangle',
    'Body.setStatic',
    'Body.setInertia',
    'Composite.add',
    'Composite.remove',
  ],

  setup(ctx) {
    const { Matter, world, theme, controls, helpers } = ctx;
    const { Bodies, Body, Composite } = Matter;

    const tank = helpers.makeTank();
    const { mouse, constraint: mouseConstraint } = helpers.addMouse({
      stiffness: 0.2,
      damping: 0,
      showLine: true,
    });
    mouseConstraint.collisionFilter.mask = TOY;
    mouseConstraint.constraint.render.strokeStyle = theme.line;
    mouseConstraint.constraint.render.lineWidth = 1.5;

    let platform = [];
    let boxes = [];
    let held = null;
    let savedLook = null;
    let lockedBody = null;
    let savedInertia = 0;
    let lockRotation = false;
    let ignoreGrab = false;

    const restLook = new WeakMap();

    const releaseDrag = () => {
      mouseConstraint.body = null;
      mouseConstraint.constraint.bodyB = null;
      mouseConstraint.constraint.pointB = null;
    };

    const restoreLook = () => {
      if (held && savedLook) {
        held.render.fillStyle = savedLook.fill;
        held.render.strokeStyle = savedLook.stroke;
      }
      held = null;
      savedLook = null;
    };

    const unlock = () => {
      if (!lockedBody) return;
      if (Number.isFinite(savedInertia)) Body.setInertia(lockedBody, savedInertia);
      lockedBody = null;
    };

    const lock = (body) => {
      if (lockedBody === body) return;
      unlock();
      savedInertia = body.inertia;
      Body.setInertia(body, Infinity);
      lockedBody = body;
    };

    const paintHeld = (body) => {
      held = body;
      savedLook = { fill: body.render.fillStyle, stroke: body.render.strokeStyle };
      body.render.fillStyle = theme.accent;
      body.render.strokeStyle = theme.accentSoft;
      body.render.lineWidth = 1.5;
      if (lockRotation) lock(body);
    };

    const applyRestLook = (body) => {
      const rest = restLook.get(body);
      if (!rest) return;
      body.render.fillStyle = rest.fill;
      body.render.strokeStyle = rest.stroke;
      body.render.lineWidth = rest.lineWidth;
    };

    const toggleStatic = (body) => {
      const pin = !body.isStatic;
      if (lockedBody === body) unlock();
      Body.setStatic(body, pin);
      if (pin) {
        body.render.fillStyle = theme.wall;
        body.render.strokeStyle = theme.wall;
      } else {
        applyRestLook(body);
      }
    };

    function layoutPlatform() {
      if (platform.length) Composite.remove(world, platform);
      const { left, right, bottom } = tank.inner;
      const span = Math.max(1, right - left);
      const width = Math.min(320, Math.max(150, span * 0.72));
      const cx = (left + right) / 2;
      const lift = Math.min(130, Math.max(78, bottom * 0.36));
      const surfaceY = bottom - lift;
      const deckH = 8;
      const deck = Bodies.rectangle(cx, surfaceY + deckH / 2, width, deckH, {
        isStatic: true,
        friction: 0.95,
        frictionStatic: 1,
        label: 'platform',
        render: theme.body('wall'),
      });
      const legH = Math.max(8, bottom - surfaceY - deckH);
      const inset = Math.min(22, width * 0.14);
      const legX = [cx - width / 2 + inset, cx + width / 2 - inset];
      const leg = (x) => Bodies.rectangle(x, surfaceY + deckH + legH / 2, 6, legH, {
        isStatic: true,
        label: 'platform-leg',
        render: theme.body('wall'),
      });
      const foot = (x) => Bodies.rectangle(x, bottom - 3, 18, 6, {
        isStatic: true,
        label: 'platform-foot',
        render: theme.body('wall'),
      });
      platform = [deck, ...legX.flatMap((x) => [leg(x), foot(x)])];
      Composite.add(world, platform);
    }

    function spawnBoxes() {
      ignoreGrab = false;
      unlock();
      restoreLook();
      releaseDrag();
      if (boxes.length) Composite.remove(world, boxes);
      boxes = [];

      const deck = platform[0];
      const surfaceY = deck.bounds.min.y;
      const width = deck.bounds.max.x - deck.bounds.min.x;
      const cx = deck.position.x;
      const gap = 10;
      const natural = BOXES.reduce((sum, box) => sum + box.w, 0) + gap * (BOXES.length - 1);
      const scale = Math.min(1, (width - 28) / natural);

      let cursor = cx - (natural * scale) / 2;
      for (const spec of BOXES) {
        const w = spec.w * scale;
        const h = spec.h * scale;
        const body = Bodies.rectangle(cursor + w / 2, surfaceY - h / 2 - 2, w, h, {
          density: spec.density,
          friction: 0.45,
          frictionStatic: 0.7,
          restitution: 0.05,
          chamfer: { radius: Math.min(3, w * 0.14, h * 0.14) },
          label: spec.label,
          collisionFilter: { category: TOY },
          render: theme.body(spec.kind),
        });
        restLook.set(body, {
          fill: body.render.fillStyle,
          stroke: body.render.strokeStyle,
          lineWidth: body.render.lineWidth,
        });
        Composite.add(world, body);
        boxes.push(body);
        cursor += w + gap * scale;
      }
    }

    layoutPlatform();
    spawnBoxes();
    ctx.onResize(() => layoutPlatform());

    ctx.canvas.style.cursor = 'grab';

    const { Query } = Matter;
    let hovered = null;

    const setHover = (body) => {
      if (hovered === body) return;
      if (hovered && hovered !== held && !hovered.isStatic) applyRestLook(hovered);
      hovered = body && !body.isStatic ? body : null;
      if (hovered && hovered !== held) {
        hovered.render.strokeStyle = theme.accentSoft;
        hovered.render.lineWidth = 1.5;
      }
    };

    // Pin on mousedown. A click can end before the next engine tick, so startdrag
    // never runs for a short shift-click. bodiesAt skips static bodies, so search the toys.
    ctx.listen(ctx.canvas, 'mousedown', (event) => {
      if (!event.shiftKey || event.button !== 0) return;
      const body = Query.point(boxes, mouse.position)[0];
      if (!body) return;
      ignoreGrab = true;
      releaseDrag();
      toggleStatic(body);
    });

    ctx.on(mouseConstraint, 'startdrag', (event) => {
      const body = event.body;
      if (ignoreGrab || body.isStatic) {
        releaseDrag();
        ignoreGrab = true;
        return;
      }
      setHover(null);
      ctx.canvas.style.cursor = 'grabbing';
      paintHeld(body);
    });

    ctx.on(mouseConstraint, 'mousemove', () => {
      if (held) return;
      setHover(Query.point(boxes, mouse.position)[0] || null);
    });

    ctx.on(mouseConstraint, 'enddrag', () => {
      unlock();
      restoreLook();
      ctx.canvas.style.cursor = 'grab';
    });

    const clearIgnore = () => { ignoreGrab = false; };
    ctx.listen(window, 'mouseup', clearIgnore);
    ctx.listen(window, 'touchend', clearIgnore);

    controls.section('Drag');
    controls.slider({
      label: 'Stiffness',
      min: 0.01,
      max: 1,
      step: 0.01,
      value: 0.2,
      onInput: (v) => { mouseConstraint.constraint.stiffness = v; },
    });
    controls.slider({
      label: 'Damping',
      min: 0,
      max: 1,
      step: 0.01,
      value: 0,
      onInput: (v) => { mouseConstraint.constraint.damping = v; },
    });
    controls.toggle({
      label: 'Show grab line',
      value: true,
      onChange: (v) => { mouseConstraint.constraint.render.visible = v; },
    });
    controls.toggle({
      label: 'Lock rotation while dragging',
      value: false,
      onChange: (v) => {
        lockRotation = v;
        if (v && held) lock(held);
        if (!v) unlock();
      },
    });
    const massReadout = controls.readout({ label: 'Mass (engine units)', value: '—' });

    controls.section('Boxes');
    controls.button({ label: 'Respawn boxes', onClick: spawnBoxes });

    ctx.onOverlay((g) => {
      const body = mouseConstraint.body;
      massReadout.set(body && Number.isFinite(body.mass) ? body.mass.toFixed(2) : '—');
      helpers.drawLabel(
        g,
        held ? `Dragging ${held.label}` : 'Drag a box · shift-click pins it',
        12,
        16,
        { color: theme.ink, size: 12 },
      );

      for (const box of boxes) {
        if (!box.isStatic) continue;
        const s = 3.5;
        g.strokeStyle = theme.ink;
        g.lineWidth = 1;
        g.strokeRect(box.position.x - s, box.position.y - s, s * 2, s * 2);
      }

      if (!held || mouseConstraint.constraint.render.visible === false) return;
      const grab = grabPoint(held, mouseConstraint.constraint.pointB);
      if (!grab) return;
      dot(g, grab.x, grab.y, 3.5, theme.accentSoft);
      dot(g, mouse.position.x, mouse.position.y, 2.5, theme.ink);
      helpers.drawLabel(
        g,
        held.mass.toFixed(2),
        held.position.x,
        held.bounds.min.y - 10,
        { align: 'center', size: 11, color: theme.ink },
      );
    });
  },
};
