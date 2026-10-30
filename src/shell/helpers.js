// Shared physics + drawing helpers, exposed to challenges as `ctx.helpers`.
// Everything created here is registered with the stage, so it is torn down on unmount.

/**
 * @param {object} ctx       the page context (Matter, engine, world, render, theme, …)
 * @param {object} internal  stage-private hooks: { registerMouse(mouse) }
 */
export function createHelpers(ctx, internal) {
  const { Matter, engine, world, render, theme } = ctx;
  const { Bodies, Body, Composite, Mouse, MouseConstraint, Query } = Matter;

  const randomBetween = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------------------
  // Tank: open-top U container. Thin visible walls (theme.wall) with thick
  // invisible backstops behind them so fast bodies can't tunnel out.
  // ---------------------------------------------------------------------------
  function makeTank({ thickness = 4, inset = 0 } = {}) {
    const BACK = 400; // backstop depth, always off-screen / behind the visible wall
    const tank = {
      bodies: [],     // visible walls: [floor, left, right]
      backstops: [],  // invisible collision padding
      floor: null,
      left: null,
      right: null,
      floorY: 0,      // y of the floor's top surface
      inner: { left: 0, right: 0, top: 0, bottom: 0 }, // free space inside the tank
    };

    const rect = (x, y, w, h, label, render) =>
      Bodies.rectangle(x, y, w, h, { isStatic: true, label, render, friction: 0.1 });

    function build() {
      if (tank.bodies.length) Composite.remove(world, [...tank.bodies, ...tank.backstops]);

      const w = ctx.width;
      const h = ctx.height;
      const t = thickness;
      const L = inset;
      const R = w - inset;
      const floorY = h - inset - t;
      const top = -2 * h; // walls reach far above the canvas so thrown bodies stay in
      const wallH = floorY - top;

      tank.floor = rect((L + R) / 2, floorY + t / 2, R - L, t, 'tank-floor', theme.body('wall'));
      tank.left = rect(L + t / 2, top + wallH / 2, t, wallH, 'tank-wall-left', theme.body('wall'));
      tank.right = rect(R - t / 2, top + wallH / 2, t, wallH, 'tank-wall-right', theme.body('wall'));
      tank.bodies = [tank.floor, tank.left, tank.right];

      const hidden = theme.body('hidden');
      tank.backstops = [
        rect((L + R) / 2, floorY + t + BACK / 2, R - L + 2 * BACK, BACK, 'tank-backstop', hidden),
        rect(L - BACK / 2, top + wallH / 2, BACK, wallH + 2 * t, 'tank-backstop', hidden),
        rect(R + BACK / 2, top + wallH / 2, BACK, wallH + 2 * t, 'tank-backstop', hidden),
      ];

      tank.floorY = floorY;
      tank.inner = { left: L + t, right: R - t, top: 0, bottom: floorY };
      Composite.add(world, [...tank.bodies, ...tank.backstops]);
    }

    // Keep dynamic bodies inside the (possibly smaller) tank after a resize.
    function clampBodies() {
      const { left, right, bottom } = tank.inner;
      for (const b of Composite.allBodies(world)) {
        if (b.isStatic) continue;
        const hw = (b.bounds.max.x - b.bounds.min.x) / 2;
        const hh = (b.bounds.max.y - b.bounds.min.y) / 2;
        const x = Math.min(Math.max(b.position.x, left + hw), right - hw);
        const y = Math.min(b.position.y, bottom - hh);
        if (x !== b.position.x || y !== b.position.y) Body.setPosition(b, { x, y });
      }
    }

    build();
    ctx.onResize(() => { build(); clampBodies(); });
    return tank;
  }

  // ---------------------------------------------------------------------------
  // Mouse: MouseConstraint wired to the render canvas.
  //  - fractional devicePixelRatio safe (Matter parseInt()s it otherwise)
  //  - wheel is NOT hijacked (page scroll keeps working over the canvas)
  //  - touch works; releasing outside the canvas ends the drag
  // ---------------------------------------------------------------------------
  function addMouse({ stiffness = 0.2, damping = 0, showLine = true } = {}) {
    const mouse = Mouse.create(render.canvas);
    mouse.pixelRatio = render.options.pixelRatio;
    render.canvas.removeEventListener('wheel', mouse.mousewheel);
    render.mouse = mouse;

    const constraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness,
        damping,
        angularStiffness: 0,
        render: theme.constraint({ visible: showLine, anchors: false }),
      },
    });
    Composite.add(world, constraint);

    // Finish a drag even if the pointer is released outside the canvas.
    ctx.listen(window, 'mouseup', (e) => {
      if (mouse.button !== -1 && e.target !== render.canvas) mouse.mouseup(e);
    });
    // Mobile Safari can cancel a touch (e.g. system gesture) without touchend.
    ctx.listen(render.canvas, 'touchcancel', (e) => mouse.mouseup(e));

    internal.registerMouse(mouse);
    return { mouse, constraint };
  }

  function spawnCircle(x, y, r, style = 'slate', options = {}) {
    const renderOpts = typeof style === 'string' ? theme.body(style) : { ...theme.body('slate'), ...style };
    const body = Bodies.circle(x, y, r, { ...options, render: renderOpts });
    Composite.add(world, body);
    return body;
  }

  function bodiesAt(point) {
    const dynamic = Composite.allBodies(world).filter((b) => !b.isStatic);
    return Query.point(dynamic, point);
  }

  /** Arrow from `from` along `vec` (both {x, y}, CSS px). */
  function drawArrow(g, from, vec, color = theme.line, { lineWidth = 1.5, head = 6 } = {}) {
    const len = Math.hypot(vec.x, vec.y);
    if (len < 0.5) return;
    const to = { x: from.x + vec.x, y: from.y + vec.y };
    const ang = Math.atan2(vec.y, vec.x);
    const hs = Math.min(head, len * 0.5);
    g.save();
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = lineWidth;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(to.x - Math.cos(ang) * hs * 0.6, to.y - Math.sin(ang) * hs * 0.6);
    g.stroke();
    g.beginPath();
    g.moveTo(to.x, to.y);
    g.lineTo(to.x - Math.cos(ang - 0.45) * hs, to.y - Math.sin(ang - 0.45) * hs);
    g.lineTo(to.x - Math.cos(ang + 0.45) * hs, to.y - Math.sin(ang + 0.45) * hs);
    g.closePath();
    g.fill();
    g.restore();
  }

  /** Small sans label (system UI font; its digits are tabular on all major platforms). align: 'left' | 'center' | 'right'. */
  function drawLabel(g, text, x, y, { color = theme.ink, size = 12, align = 'left', weight = 500 } = {}) {
    g.save();
    g.font = `${weight} ${size}px ${theme.fonts.sans}`;
    g.fillStyle = color;
    g.textAlign = align;
    g.textBaseline = 'middle';
    g.fillText(String(text), x, y);
    g.restore();
  }

  return { makeTank, addMouse, randomBetween, spawnCircle, bodiesAt, drawArrow, drawLabel };
}
