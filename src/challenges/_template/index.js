export default {
  slug: 'REPLACE-ME',
  title: 'Challenge title',
  about: 'One to three sentences on what this page demonstrates.',
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

    ctx.onOverlay(g => helpers.drawLabel(g, 'Hello Matter.js', 16, 24));
  },
};
