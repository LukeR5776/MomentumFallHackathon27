export default {
  slug: 'body-count',
  title: 'Adjust numbers of bodies dynamically',
  about:
    'Dial the body count up or down and the world adds or removes circles live — no Reset needed. Watch the pile grow and the engine work harder as count climbs.',
  apis: [
    'Bodies.circle',
    'Composite.add',
    'Composite.remove',
    'MouseConstraint',
  ],

  setup(ctx) {
    const { Matter, theme, controls, helpers } = ctx;
    const { Composite } = Matter;

    const tank = helpers.makeTank();
    helpers.addMouse({ stiffness: 0.2, damping: 0.05, showLine: true });

    const bodies = [];
    const styles = ['slate', 'slateLight', 'accent', 'accentSoft'];
    const MAX = 80;
    const MIN = 0;

    function spawnOne() {
      const { left, right, bottom } = tank.inner;
      const r = helpers.randomBetween(10, 18);
      const x = helpers.randomBetween(left + r + 4, right - r - 4);
      const y = helpers.randomBetween(r + 20, Math.max(r + 40, bottom * 0.45));
      const style = styles[bodies.length % styles.length];
      const body = helpers.spawnCircle(x, y, r, style, {
        restitution: 0.45,
        friction: 0.08,
        density: 0.0018,
        label: 'ball',
      });
      bodies.push(body);
      return body;
    }

    function removeOne() {
      const body = bodies.pop();
      if (!body) return;
      Composite.remove(world, body);
    }

    function setCount(n) {
      const target = Math.max(MIN, Math.min(MAX, Math.round(n)));
      while (bodies.length < target) spawnOne();
      while (bodies.length > target) removeOne();
      countReadout.set(String(bodies.length));
    }

    controls.section('Population');
    const countSlider = controls.slider({
      label: 'Bodies',
      min: MIN,
      max: MAX,
      step: 1,
      value: 20,
      format: (v) => String(Math.round(v)),
      onInput: (v) => setCount(v),
    });

    const countReadout = controls.readout({ label: 'Live count', value: '0' });

    controls.button({
      label: '+10',
      onClick: () => {
        const next = Math.min(MAX, bodies.length + 10);
        countSlider.set(next);
      },
    });

    controls.button({
      label: '−10',
      onClick: () => {
        const next = Math.max(MIN, bodies.length - 10);
        countSlider.set(next);
      },
    });

    controls.button({
      label: 'Clear',
      onClick: () => countSlider.set(0),
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

    controls.slider({
      label: 'Restitution',
      min: 0,
      max: 1,
      step: 0.05,
      value: 0.45,
      onInput: (v) => {
        for (const b of bodies) b.restitution = v;
      },
    });

    // Seed initial population (fires onInput → setCount).
    countSlider.set(20);

    ctx.onOverlay((g) => {
      helpers.drawLabel(g, `${bodies.length} bodies`, 16, 24, {
        size: 13,
        weight: 600,
        color: theme.ink,
      });
    });
  },
};
