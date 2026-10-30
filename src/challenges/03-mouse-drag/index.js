export default {
  slug: 'mouse-drag',
  title: 'Add mouse dragging',
  about:
    'Grab any dynamic body with the mouse or touch. A spring constraint pulls it toward the pointer — tune stiffness and damping to feel sticky vs floppy dragging.',
  apis: [
    'Mouse',
    'MouseConstraint',
    'Constraint',
    'Bodies.rectangle',
    'Bodies.circle',
    'Composite.add',
  ],

  setup(ctx) {
    const { Matter, world, theme, controls, helpers } = ctx;
    const { Bodies, Body, Composite } = Matter;

    const tank = helpers.makeTank();

    function placeShelf() {
      const w = Math.min(280, ctx.width * 0.55);
      const x = ctx.width / 2;
      const y = tank.floorY - 48;
      return Bodies.rectangle(x, y, w, 10, {
        isStatic: true,
        friction: 0.4,
        render: theme.body('wall'),
        label: 'shelf',
      });
    }

    let shelf = placeShelf();
    Composite.add(world, shelf);

    ctx.onResize(() => {
      Composite.remove(world, shelf);
      shelf = placeShelf();
      Composite.add(world, shelf);
    });

    const boxes = [
      { w: 44, h: 44, x: -90, y: -70, style: 'slate', angle: 0 },
      { w: 56, h: 56, x: -20, y: -90, style: 'slateLight', angle: 0.08 },
      { w: 48, h: 48, x: 70, y: -110, style: 'accent', angle: -0.2 },
    ];

    for (const b of boxes) {
      Composite.add(
        world,
        Bodies.rectangle(ctx.width / 2 + b.x, tank.floorY + b.y, b.w, b.h, {
          angle: b.angle,
          restitution: 0.2,
          friction: 0.35,
          density: 0.002,
          render: theme.body(b.style),
          label: 'box',
        }),
      );
    }

    helpers.spawnCircle(ctx.width / 2 + 20, tank.floorY - 160, 22, 'slate', {
      restitution: 0.6,
      friction: 0.05,
      density: 0.0015,
      label: 'ball',
    });

    helpers.spawnCircle(ctx.width / 2 - 50, tank.floorY - 200, 16, 'accentSoft', {
      restitution: 0.7,
      friction: 0.04,
      density: 0.001,
      label: 'ball',
    });

    const mouse = helpers.addMouse({ stiffness: 0.2, damping: 0.05, showLine: true });

    controls.section('Drag feel');
    controls.slider({
      label: 'Stiffness',
      min: 0.02,
      max: 1,
      step: 0.01,
      value: 0.2,
      onInput: (v) => {
        mouse.constraint.constraint.stiffness = v;
      },
    });

    controls.slider({
      label: 'Damping',
      min: 0,
      max: 0.4,
      step: 0.01,
      value: 0.05,
      onInput: (v) => {
        mouse.constraint.constraint.damping = v;
      },
    });

    controls.toggle({
      label: 'Show drag line',
      value: true,
      onChange: (on) => {
        mouse.constraint.constraint.render.visible = on;
      },
    });

    controls.section('World');
    controls.slider({
      label: 'Gravity Y',
      min: 0,
      max: 2,
      step: 0.05,
      value: 1,
      onInput: (v) => {
        ctx.engine.gravity.y = v;
      },
    });

    controls.button({
      label: 'Nudge all',
      onClick: () => {
        for (const b of Composite.allBodies(world)) {
          if (b.isStatic) continue;
          Body.setVelocity(b, {
            x: helpers.randomBetween(-4, 4),
            y: helpers.randomBetween(-6, -1),
          });
        }
      },
    });

    const hint = controls.readout({ label: 'Grabbed', value: '—' });

    ctx.onOverlay((g) => {
      const body = mouse.constraint.body;
      if (body) {
        hint.set(body.label || 'body');
        helpers.drawLabel(g, 'dragging', 16, 24, {
          size: 12,
          color: theme.accent,
        });
      } else {
        hint.set('—');
        helpers.drawLabel(g, 'Drag a body', 16, 24, {
          size: 12,
          color: theme.ink,
        });
      }
    });
  },
};
