// Challenge 8 — live body stats, a speed label, and a 5-second sparkline.
// All mutable state lives in setup() so Reset rebuilds from scratch.
// Matter's numbers are engine units (pixels and ticks), not SI units.

const METRICS = [
  { label: 'Speed', value: 'speed' },
  { label: 'Height', value: 'height' },
  { label: 'Kinetic energy', value: 'kinetic' },
  { label: 'Total energy', value: 'total' },
];

const SERIES_COLORS = ['accent', 'slate', 'slateLight'];
const HISTORY_MS = 5000;
const EXPORT_CAP = 5400;

export default {
  slug: 'stats',
  title: 'Show stats',
  about:
    'A tracked body reports its position, velocity, speed, angle, and energy while it rolls between two ramps. Those numbers are Matter engine units — pixels and simulation ticks, not metres, seconds, or joules. Potential energy is m·g·h with h measured from the body center to the floor and g = gravity.y × gravity.scale. Click any ball to track it; pin up to three to graph them together.',
  apis: [
    'Bodies.circle',
    'Bodies.rectangle',
    'Body.setPosition',
    'Body.setVelocity',
    'Body.setAngularVelocity',
    'Composite.add',
    'Composite.remove',
    'Composite.allBodies',
    'Events collisionStart',
    'body.position',
    'body.velocity',
    'body.speed',
    'body.angle',
    'body.angularVelocity',
    'body.mass',
    'engine.gravity',
    'engine.timing',
  ],

  setup(ctx) {
    const { Matter, world, engine, theme, controls, helpers } = ctx;
    const { Bodies, Body, Composite } = Matter;

    const tank = helpers.makeTank();

    let angleDeg = 18;
    let friction = 0.03;
    let metric = 'speed';
    let showVector = false;
    let tracked = null;
    const pins = [];
    let ramps = [];
    let shelf = null;
    let balls = [];
    const history = new Map();
    const hits = [];
    const deltas = [];
    const exportRows = [];
    let revokeTimer = 0;
    let pointerDown = null;

    const num = (value, digits) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

    function gravityAccel() {
      return engine.gravity.y * engine.gravity.scale;
    }

    function measure(body) {
      const speed = body.speed;
      const height = Math.max(0, tank.floorY - body.position.y);
      const kinetic = 0.5 * body.mass * speed * speed;
      const potential = body.mass * gravityAccel() * height;
      return {
        speed,
        height,
        kinetic,
        potential,
        total: kinetic + potential,
      };
    }

    function wrapDegrees(radians) {
      const degrees = radians * 180 / Math.PI;
      return ((degrees + 180) % 360 + 360) % 360 - 180;
    }

    function visibleBodyCount() {
      return Composite.allBodies(world).filter((body) => body.render.visible !== false).length;
    }

    function applyFriction() {
      for (const ball of balls) {
        ball.friction = friction;
        ball.frictionStatic = Math.min(1, friction * 1.5 + 0.02);
      }
      for (const ramp of ramps) {
        ramp.friction = friction;
        ramp.frictionStatic = Math.min(1, friction * 1.5 + 0.02);
      }
      if (tank.floor) {
        tank.floor.friction = friction;
        tank.floor.frictionStatic = Math.min(1, friction * 1.5 + 0.02);
      }
    }

    function rampLayout() {
      const inner = tank.inner;
      const angle = angleDeg * Math.PI / 180;
      const gap = Math.max(40, Math.min(80, (inner.right - inner.left) * 0.1));
      const maxHoriz = (inner.right - inner.left) / 2 - gap / 2 - 16;
      const length = Math.max(100, Math.min(440, maxHoriz / Math.cos(angle)));
      const thickness = 10;
      // Sink the plank so its top face meets the floor and the ball rolls off without a lip.
      const endY = inner.bottom + Math.cos(angle) * (thickness / 2);
      const mid = (inner.left + inner.right) / 2;
      return {
        angle,
        length,
        thickness,
        endY,
        leftEndX: mid - gap / 2,
        rightEndX: mid + gap / 2,
      };
    }

    // direction -1: left ramp, low end toward center, clockwise tilt.
    // direction +1: right ramp, low end toward center, counter-clockwise tilt.
    function makeRamp(endX, direction) {
      const { angle, length, thickness, endY } = rampLayout();
      const cx = endX + direction * Math.cos(angle) * (length / 2);
      const cy = endY - Math.sin(angle) * (length / 2);
      return Bodies.rectangle(cx, cy, length, thickness, {
        isStatic: true,
        angle: -direction * angle,
        friction,
        frictionStatic: Math.min(1, friction * 1.5 + 0.02),
        chamfer: { radius: 3 },
        label: direction < 0 ? 'ramp-left' : 'ramp-right',
        render: theme.body('wall'),
      });
    }

    // `along` is distance from the ramp center toward its high end.
    function poseOnRamp(ramp, along, radius) {
      const angle = ramp.angle;
      const uphill = angle >= 0 ? -1 : 1;
      const lift = rampLayout().thickness / 2 + radius + 3;
      return {
        x: ramp.position.x + uphill * Math.cos(angle) * along - Math.sin(angle) * lift,
        y: ramp.position.y + uphill * Math.sin(angle) * along - Math.cos(angle) * lift,
      };
    }

    function settle(body, pose) {
      Body.setPosition(body, pose);
      Body.setVelocity(body, { x: 0, y: 0 });
      Body.setAngularVelocity(body, 0);
      Body.setAngle(body, 0);
    }

    function relaunch() {
      const left = ramps[0];
      if (!left || !shelf) return;
      const layout = rampLayout();
      const lead = balls[0];
      const inner = tank.inner;
      let along = layout.length / 2 - lead.circleRadius - 18;
      let pose = poseOnRamp(left, along, lead.circleRadius);
      let guard = 0;
      while (
        guard < 24
        && (pose.y < lead.circleRadius + 12 || pose.x < inner.left + lead.circleRadius)
      ) {
        along -= 14;
        pose = poseOnRamp(left, along, lead.circleRadius);
        guard += 1;
      }
      settle(lead, pose);

      // The other two sit on a flat shelf so they can be tracked without blocking the run.
      balls.slice(1).forEach((ball, index) => {
        settle(ball, {
          x: shelf.position.x + (index === 0 ? -22 : 22),
          y: shelf.position.y - rampLayout().thickness / 2 - ball.circleRadius - 2,
        });
      });
    }

    function rebuildRamps() {
      const remove = shelf ? [...ramps, shelf] : ramps;
      if (remove.length) Composite.remove(world, remove);
      const layout = rampLayout();
      const mid = (tank.inner.left + tank.inner.right) / 2;
      ramps = [
        makeRamp(layout.leftEndX, -1),
        makeRamp(layout.rightEndX, 1),
      ];
      shelf = Bodies.rectangle(mid, 64, 150, layout.thickness, {
        isStatic: true,
        friction: 0.8,
        label: 'shelf',
        chamfer: { radius: 2 },
        render: theme.body('wall'),
      });
      Composite.add(world, [...ramps, shelf]);
      applyFriction();
      relaunch();
    }

    function createBalls() {
      const specs = [
        { label: 'Ball A', radius: 16, style: 'accent' },
        { label: 'Ball B', radius: 13, style: 'slate' },
        { label: 'Ball C', radius: 11, style: 'slateLight' },
      ];
      balls = specs.map((spec) => Bodies.circle(ctx.width / 2, 40, spec.radius, {
        label: spec.label,
        restitution: 0.15,
        friction,
        frictionAir: 0.0004,
        density: 0.001,
        render: theme.body(spec.style),
      }));
      Composite.add(world, balls);
    }

    function setTracked(body) {
      if (tracked && tracked !== body) {
        tracked.render.strokeStyle = theme.wall;
        tracked.render.lineWidth = 1;
      }
      tracked = body;
      tracked.render.strokeStyle = theme.accent;
      tracked.render.lineWidth = 2;
      trackingReadout.set(body.label);
      pinnedReadout.set(pinLabel());
    }

    function pinLabel() {
      if (!pins.length) return '0 / 3';
      return `${pins.length} / 3 · ${pins.map((body) => body.label).join(', ')}`;
    }

    function pinTracked() {
      if (!tracked || pins.includes(tracked) || pins.length >= 3) {
        pinnedReadout.set(pinLabel());
        return;
      }
      pins.push(tracked);
      pinnedReadout.set(pinLabel());
    }

    function clearPins() {
      pins.length = 0;
      pinnedReadout.set(pinLabel());
    }

    function remember(body, time, sample) {
      let series = history.get(body);
      if (!series) {
        series = [];
        history.set(body, series);
      }
      series.push({ t: time, ...sample });
      const cutoff = time - HISTORY_MS;
      while (series.length && series[0].t < cutoff) series.shift();
    }

    function recordExport(time) {
      const graphed = pins.length ? pins : (tracked ? [tracked] : []);
      for (const body of graphed) {
        const sample = measure(body);
        exportRows.push({ t: time, label: body.label, ...sample });
      }
      while (exportRows.length > EXPORT_CAP) exportRows.shift();
      recordedReadout.set(String(exportRows.length));
    }

    function refreshReadouts() {
      if (!tracked) return;
      const sample = measure(tracked);
      positionReadout.set(`${num(tracked.position.x, 1)}, ${num(tracked.position.y, 1)}`);
      velocityReadout.set(`${num(tracked.velocity.x, 2)}, ${num(tracked.velocity.y, 2)}`);
      speedReadout.set(num(sample.speed, 2));
      angleReadout.set(num(wrapDegrees(tracked.angle), 1));
      spinReadout.set(num(tracked.angularVelocity * 180 / Math.PI, 2));
      massReadout.set(num(tracked.mass, 3));
      kineticReadout.set(num(sample.kinetic, 3));
      potentialReadout.set(num(sample.potential, 3));
      totalReadout.set(num(sample.total, 3));
      bodiesReadout.set(String(visibleBodyCount()));

      const recentHits = hits.filter((time) => engine.timing.timestamp - time <= 1000);
      hits.length = 0;
      hits.push(...recentHits);
      collisionsReadout.set(String(hits.length));

      if (deltas.length) {
        const average = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
        fpsReadout.set(average > 0 ? num(1000 / average, 0) : '—');
      }
    }

    function exportCsv() {
      const header = 'time_ms,body,speed,height,kinetic,potential,total\n';
      const lines = exportRows.map((row) => [
        row.t.toFixed(1),
        row.label,
        row.speed.toFixed(4),
        row.height.toFixed(2),
        row.kinetic.toFixed(5),
        row.potential.toFixed(5),
        row.total.toFixed(5),
      ].join(','));
      const blob = new Blob([header + lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'matter-stats.csv';
      link.rel = 'noopener';
      ctx.canvas.parentElement.append(link);
      link.click();
      link.remove();
      if (revokeTimer) clearTimeout(revokeTimer);
      revokeTimer = setTimeout(() => {
        URL.revokeObjectURL(url);
        revokeTimer = 0;
      }, 1000);
    }

    function pointerPoint(event) {
      const rect = ctx.canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function strokeOutline(g, body) {
      const pad = 4;
      const verts = body.vertices;
      if (!verts?.length) return;
      g.beginPath();
      for (let i = 0; i < verts.length; i += 1) {
        const dx = verts[i].x - body.position.x;
        const dy = verts[i].y - body.position.y;
        const len = Math.hypot(dx, dy) || 1;
        const x = body.position.x + (dx / len) * (len + pad);
        const y = body.position.y + (dy / len) * (len + pad);
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.stroke();
    }

    function drawGraph(g) {
      const width = Math.min(168, Math.max(96, ctx.width * 0.34));
      const height = 52;
      const x0 = ctx.width - width - 14;
      const y0 = 14;
      const time = engine.timing.timestamp;
      const series = pins.length ? pins : (tracked ? [tracked] : []);
      const colors = pins.length
        ? series.map((_, index) => theme[SERIES_COLORS[index]])
        : [theme.line];

      g.strokeStyle = theme.wall;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x0, y0 + height);
      g.lineTo(x0 + width, y0 + height);
      g.stroke();

      const metricLabel = METRICS.find((item) => item.value === metric)?.label || metric;
      helpers.drawLabel(g, metricLabel, x0, y0 - 2, { color: theme.slate, size: 11 });

      let min = Infinity;
      let max = -Infinity;
      const windows = series.map((body) => (history.get(body) || []).filter((sample) => time - sample.t <= HISTORY_MS));
      for (const window of windows) {
        for (const sample of window) {
          const value = sample[metric];
          if (value < min) min = value;
          if (value > max) max = value;
        }
      }
      if (!Number.isFinite(min) || !Number.isFinite(max)) return;
      if (max - min < 1e-4) {
        min -= 0.5;
        max += 0.5;
      }

      windows.forEach((window, index) => {
        if (window.length < 2) return;
        g.beginPath();
        g.strokeStyle = colors[index];
        g.lineWidth = 1.5;
        g.lineJoin = 'round';
        g.lineCap = 'round';
        window.forEach((sample, pointIndex) => {
          const x = x0 + ((sample.t - (time - HISTORY_MS)) / HISTORY_MS) * width;
          const y = y0 + height - ((sample[metric] - min) / (max - min)) * height;
          if (pointIndex === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        });
        g.stroke();
      });

      if (pins.length) {
        pins.forEach((body, index) => {
          helpers.drawLabel(g, body.label, x0 + index * 52, y0 + height + 12, {
            color: theme[SERIES_COLORS[index]],
            size: 10,
          });
        });
      }
    }

    controls.section('Scene');
    controls.slider({
      label: 'Ramp angle',
      min: 8,
      max: 36,
      step: 1,
      value: angleDeg,
      format: (value) => `${Math.round(value)}°`,
      onInput: (value) => {
        angleDeg = value;
        rebuildRamps();
      },
    });
    controls.slider({
      label: 'Friction',
      min: 0,
      max: 0.8,
      step: 0.01,
      value: 0.03,
      onInput: (value) => {
        friction = value;
        applyFriction();
      },
    });
    controls.button({ label: 'Relaunch', onClick: relaunch });

    controls.section('Graph');
    controls.select({
      label: 'Metric',
      options: METRICS,
      value: metric,
      onChange: (value) => { metric = value; },
    });
    controls.toggle({
      label: 'Show velocity vector',
      value: false,
      onChange: (value) => { showVector = value; },
    });
    controls.button({ label: 'Pin tracked body', onClick: pinTracked });
    controls.button({ label: 'Clear pins', onClick: clearPins });
    const pinnedReadout = controls.readout({ label: 'Pinned', value: '0 / 3' });
    controls.button({ label: 'Export CSV', onClick: exportCsv });
    const recordedReadout = controls.readout({ label: 'Recorded rows', value: '0' });

    controls.section('Tracked body (engine units)');
    const trackingReadout = controls.readout({ label: 'Tracking', value: '—' });
    const positionReadout = controls.readout({ label: 'Position x, y', value: '—' });
    const velocityReadout = controls.readout({ label: 'Velocity vx, vy', value: '—' });
    const speedReadout = controls.readout({ label: 'Speed', value: '—' });
    const angleReadout = controls.readout({ label: 'Angle (deg)', value: '—' });
    const spinReadout = controls.readout({ label: 'Angular vel (deg/tick)', value: '—' });
    const massReadout = controls.readout({ label: 'Mass', value: '—' });
    const kineticReadout = controls.readout({ label: 'Kinetic energy', value: '—' });
    const potentialReadout = controls.readout({ label: 'Potential energy', value: '—' });
    const totalReadout = controls.readout({ label: 'Total energy', value: '—' });

    controls.section('Engine');
    const bodiesReadout = controls.readout({ label: 'Bodies', value: '0' });
    const fpsReadout = controls.readout({ label: 'FPS', value: '—' });
    const collisionsReadout = controls.readout({ label: 'Collisions / s', value: '0' });

    createBalls();
    rebuildRamps();
    setTracked(balls[0]);

    ctx.on(engine, 'afterUpdate', () => {
      const time = engine.timing.timestamp;
      const delta = engine.timing.lastDelta;
      if (delta > 0) {
        deltas.push(delta);
        if (deltas.length > 30) deltas.shift();
      }
      for (const ball of balls) remember(ball, time, measure(ball));
      recordExport(time);
      refreshReadouts();
    });

    ctx.on(engine, 'collisionStart', (event) => {
      const time = engine.timing.timestamp;
      for (let i = 0; i < event.pairs.length; i += 1) hits.push(time);
    });

    ctx.listen(ctx.canvas, 'pointerdown', (event) => {
      if (event.button !== 0) return;
      pointerDown = pointerPoint(event);
    });
    ctx.listen(ctx.canvas, 'pointerup', (event) => {
      if (!pointerDown || event.button !== 0) return;
      const point = pointerPoint(event);
      const moved = Math.hypot(point.x - pointerDown.x, point.y - pointerDown.y);
      pointerDown = null;
      if (moved > 8) return;
      const hit = helpers.bodiesAt(point)[0];
      if (hit) setTracked(hit);
    });

    ctx.onResize(() => rebuildRamps());

    ctx.onOverlay((g) => {
      if (tracked) {
        g.strokeStyle = theme.accent;
        g.lineWidth = 1.5;
        strokeOutline(g, tracked);
        helpers.drawLabel(
          g,
          tracked.speed.toFixed(1),
          tracked.position.x,
          tracked.position.y - tracked.circleRadius - 14,
          { align: 'center', size: 13, color: theme.ink },
        );
        if (showVector) {
          const vx = tracked.velocity.x;
          const vy = tracked.velocity.y;
          const vlen = Math.hypot(vx, vy);
          if (vlen > 0.04) {
            const scale = 16;
            let dx = vx * scale;
            let dy = vy * scale;
            const arrow = Math.hypot(dx, dy);
            const max = 96;
            if (arrow > max) {
              dx *= max / arrow;
              dy *= max / arrow;
            }
            helpers.drawArrow(
              g,
              {
                x: tracked.position.x + (vx / vlen) * (tracked.circleRadius + 2),
                y: tracked.position.y + (vy / vlen) * (tracked.circleRadius + 2),
              },
              { x: dx, y: dy },
              theme.line,
            );
          }
        }
      }
      drawGraph(g);
    });

    ctx.onCleanup(() => {
      if (revokeTimer) clearTimeout(revokeTimer);
    });

    refreshReadouts();
  },
};
