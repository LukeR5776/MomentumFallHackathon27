// TODO(challenge owner): replace this stub — it is a copy of src/challenges/_template/index.js.
export default {
  slug: 'stats',
  title: 'Show stats',
  about: 'Coming soon. This page is still a copy of the challenge template.',
  apis: [],

  setup(ctx) {
    const { Matter, world, theme, controls, helpers } = ctx;
    const { Bodies, Composite } = Matter;

    helpers.makeTank();

    const ball = Bodies.circle(ctx.width / 2, 80, 20, { render: theme.body('accent') });
    Composite.add(world, ball);

    controls.section('Example');
    controls.slider({
      label: 'Gravity Y', min: -2, max: 2, step: 0.05, value: 1,
      onInput: v => { ctx.engine.gravity.y = v; },
    });

    ctx.onOverlay(g => helpers.drawLabel(g, 'Coming soon', 16, 24));
  },
};
