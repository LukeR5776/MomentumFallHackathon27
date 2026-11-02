// The probability machine: a Matter.js world with a funnel, a peg field and two outcome zones.
// Outcomes are decided before a ball is released; physics only carries the ball to its zone.
(function (HE) {
  'use strict';

  const { Engine, Bodies, Body, Composite, Events } = Matter;

  const W = 640;
  const H = 720;
  const ZONE_TOP = 500;
  const BALL_R = 7;
  const MAX_BALLS = 140;
  const STEP = 1000 / 60;
  const COLORS = { win: '#39ff88', loss: '#b45cff', blue: '#3fa9ff' };

  // Pre-rendered glowing ball sprites: drawImage is far cheaper than shadowBlur per ball.
  function makeSprite(color, radius, glow) {
    const size = Math.ceil((radius + glow) * 2);
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const g = c.getContext('2d');
    g.scale(2, 2);
    const mid = size / 2;
    const halo = g.createRadialGradient(mid, mid, radius * 0.4, mid, mid, radius + glow);
    halo.addColorStop(0, color);
    halo.addColorStop(0.45, color + '66');
    halo.addColorStop(1, color + '00');
    g.fillStyle = halo;
    g.fillRect(0, 0, size, size);
    g.beginPath();
    g.arc(mid, mid, radius, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    g.beginPath();
    g.arc(mid - radius * 0.35, mid - radius * 0.35, radius * 0.35, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fill();
    return { canvas: c, size };
  }

  function segment(x1, y1, x2, y2, thickness, options) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    return Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, len, thickness, {
      isStatic: true,
      angle: Math.atan2(y2 - y1, x2 - x1),
      ...options,
    });
  }

  function createMachine(canvas, { onLand } = {}) {
    const g = canvas.getContext('2d');
    const engine = Engine.create({ positionIterations: 8, velocityIterations: 6 });
    engine.gravity.y = 1;
    const world = engine.world;

    const sprites = {
      win: makeSprite(COLORS.win, BALL_R, 8),
      loss: makeSprite(COLORS.loss, BALL_R, 8),
      peg: makeSprite(COLORS.blue, 4, 6),
    };

    // --- static scenery -------------------------------------------------------
    const wallOpts = { friction: 0.02, restitution: 0.4 };
    const walls = [
      Bodies.rectangle(-20, H / 2, 40, H * 3, { isStatic: true, ...wallOpts }),
      Bodies.rectangle(W + 20, H / 2, 40, H * 3, { isStatic: true, ...wallOpts }),
      Bodies.rectangle(W / 2, H + 20, W + 80, 40, { isStatic: true, ...wallOpts }),
    ];
    const funnelL = [30, 40, W / 2 - 46, 118];
    const funnelR = [W - 30, 40, W / 2 + 46, 118];
    const funnel = [
      segment(...funnelL, 8, wallOpts),
      segment(...funnelR, 8, wallOpts),
    ];

    const pegs = [];
    for (let row = 0; row < 7; row += 1) {
      const y = 160 + row * 44;
      const offset = row % 2 ? 28 : 0;
      for (let x = 32 + offset; x <= W - 32; x += 56) {
        pegs.push(Bodies.circle(x, y, 4, { isStatic: true, restitution: 0.55, friction: 0.01 }));
      }
    }

    const divider = Bodies.rectangle(W / 2, (ZONE_TOP + H) / 2, 6, H - ZONE_TOP, {
      isStatic: true,
      chamfer: { radius: 3 },
      ...wallOpts,
    });
    Composite.add(world, [...walls, ...funnel, ...pegs, divider]);

    // Invisible sloped guides above each zone. A guide only collides with the *other* color,
    // so a ball knocked to the wrong side rolls back over the divider into its own zone.
    const CAT = { scenery: 0x0001, win: 0x0002, loss: 0x0004, guideForWin: 0x0008, guideForLoss: 0x0010 };
    const ballFilter = {
      win: { category: CAT.win, mask: CAT.scenery | CAT.win | CAT.loss | CAT.guideForWin },
      loss: { category: CAT.loss, mask: CAT.scenery | CAT.win | CAT.loss | CAT.guideForLoss },
    };
    // While a ball is on the wrong side it ignores other balls, so wrong-side balls rolling
    // toward the divider from both guides can't jam against each other.
    const ghostMask = { win: CAT.scenery | CAT.guideForWin, loss: CAT.scenery | CAT.guideForLoss };
    let guides = [];
    function buildGuides() {
      if (guides.length) Composite.remove(world, guides);
      const lift = 46;
      guides = [
        // Over the loss zone, catching win balls and sloping down toward the win side.
        segment(W, ZONE_TOP - lift, dividerX - 2, ZONE_TOP - 2, 16, {
          collisionFilter: { category: CAT.guideForWin, mask: CAT.win },
          friction: 0,
          restitution: 0.1,
        }),
        // Over the win zone, catching loss balls and sloping down toward the loss side.
        segment(0, ZONE_TOP - lift, dividerX + 2, ZONE_TOP - 2, 16, {
          collisionFilter: { category: CAT.guideForLoss, mask: CAT.loss },
          friction: 0,
          restitution: 0.1,
        }),
      ];
      Composite.add(world, guides);
    }

    // --- state ----------------------------------------------------------------
    let p = 0.5;
    let dividerX = W / 2;
    const balls = [];
    const queue = [];
    const floaters = [];
    const flash = { win: 0, loss: 0 };
    let released = 0;
    let misplaced = 0;
    let releaseClock = 0;
    let payout = 1;

    function zoneBounds(win) {
      return win ? { left: 0, right: dividerX - 3 } : { left: dividerX + 3, right: W };
    }

    function setRules(winProbability, R) {
      p = winProbability;
      payout = R;
      // Zone widths follow the probabilities, clamped so neither zone becomes too thin to hit.
      dividerX = Math.min(W - 40, Math.max(40, W * p));
      Body.setPosition(divider, { x: dividerX, y: (ZONE_TOP + H) / 2 });
      buildGuides();
    }

    function clear() {
      for (const b of balls) Composite.remove(world, b);
      balls.length = 0;
      queue.length = 0;
      floaters.length = 0;
      released = 0;
      misplaced = 0;
      flash.win = flash.loss = 0;
    }

    function enqueue(outcomes) {
      const n = outcomes.length;
      const shown = Math.min(n, 120);
      for (let i = 0; i < shown; i += 1) {
        const idx = shown === n ? i : Math.floor(((i + 0.5) * n) / shown);
        queue.push(outcomes[idx] === 1);
      }
      if (queue.length > 300) queue.splice(0, queue.length - 300);
    }

    function release(win) {
      const zone = zoneBounds(win);
      const pad = BALL_R + 6;
      const ball = Bodies.circle(W / 2 + (Math.random() - 0.5) * 60, -10, BALL_R, {
        restitution: 0.45,
        friction: 0.01,
        frictionAir: 0.008,
        density: 0.002,
        collisionFilter: { ...ballFilter[win ? 'win' : 'loss'] },
      });
      ball.he = {
        win,
        tx: zone.left + pad + Math.random() * Math.max(1, zone.right - zone.left - pad * 2),
        landed: false,
        fade: 0,
      };
      Body.setVelocity(ball, { x: (Math.random() - 0.5) * 2, y: 1 });
      balls.push(ball);
      Composite.add(world, ball);
      released += 1;

      if (balls.length > MAX_BALLS) {
        const oldest = balls.find((b) => !b.he.fade);
        if (oldest) oldest.he.fade = 1;
      }
    }

    // Gentle steering toward the target zone; stronger once the ball clears the pegs.
    Events.on(engine, 'beforeUpdate', () => {
      for (const b of balls) {
        const s = b.he;
        const { x, y } = b.position;
        const key = s.win ? 'win' : 'loss';
        const wrongSide = s.win ? x > dividerX : x < dividerX;
        if (wrongSide && y > ZONE_TOP - 80) {
          if (!s.ghost) {
            s.ghost = true;
            b.collisionFilter.mask = ghostMask[key];
          }
        } else if (s.ghost && (y > ZONE_TOP + BALL_R * 2 || y < ZONE_TOP - 90)) {
          s.ghost = false;
          b.collisionFilter.mask = ballFilter[key].mask;
        }
        if (s.landed) continue;
        if (y < 125) continue;
        const below = y > 470;
        const dx = Math.max(-160, Math.min(160, s.tx - x));
        const k = below ? 0.000007 : 0.0000017;
        const damp = below ? 0.00012 : 0.00002;
        Body.applyForce(b, b.position, { x: b.mass * (dx * k - b.velocity.x * damp), y: 0 });
        if (y > ZONE_TOP + 10) {
          s.landed = true;
          const correct = s.win ? x < dividerX : x > dividerX;
          if (!correct) misplaced += 1;
          flash[key] = 1;
          if (floaters.length < 30) {
            floaters.push({ x, y: ZONE_TOP + 20, win: s.win, life: 1 });
          }
          onLand?.(s.win);
        }
      }
    });

    // --- loop -----------------------------------------------------------------
    let last = performance.now();
    let acc = 0;
    let raf = 0;
    let scale = 1;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth || W;
      scale = width / W;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(H * scale * dpr);
      canvas.style.height = `${H * scale}px`;
    }

    function step(now) {
      raf = requestAnimationFrame(step);
      const dt = Math.min(100, now - last);
      last = now;

      releaseClock += dt;
      const interval = queue.length > 60 ? 16 : queue.length > 20 ? 32 : 70;
      while (queue.length && releaseClock >= interval) {
        releaseClock -= interval;
        release(queue.shift());
      }
      if (!queue.length) releaseClock = Math.min(releaseClock, interval);

      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 4) {
        Engine.update(engine, STEP);
        acc -= STEP;
        steps += 1;
      }
      if (steps === 4) acc = 0;

      for (let i = balls.length - 1; i >= 0; i -= 1) {
        const b = balls[i];
        if (b.he.fade) {
          b.he.fade -= dt / 400;
          if (b.he.fade <= 0) {
            Composite.remove(world, b);
            balls.splice(i, 1);
          }
        } else if (b.position.y > H + 60) {
          Composite.remove(world, b);
          balls.splice(i, 1);
        }
      }
      flash.win = Math.max(0, flash.win - dt / 500);
      flash.loss = Math.max(0, flash.loss - dt / 500);
      for (let i = floaters.length - 1; i >= 0; i -= 1) {
        floaters[i].life -= dt / 900;
        floaters[i].y -= dt * 0.04;
        if (floaters[i].life <= 0) floaters.splice(i, 1);
      }
      draw();
    }

    function draw() {
      g.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      // Outcome zones
      for (const win of [true, false]) {
        const z = zoneBounds(win);
        const color = win ? COLORS.win : COLORS.loss;
        g.globalAlpha = 0.07 + flash[win ? 'win' : 'loss'] * 0.18;
        g.fillStyle = color;
        g.fillRect(z.left, ZONE_TOP, z.right - z.left, H - ZONE_TOP);
        g.globalAlpha = 0.9;
        g.strokeStyle = color;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(z.left + 4, ZONE_TOP);
        g.lineTo(z.right - 4, ZONE_TOP);
        g.stroke();
        g.globalAlpha = 1;
        // Narrow zones get their label above the zone line, anchored at the outer wall.
        const narrow = z.right - z.left < 150;
        const x = narrow ? (win ? z.left + 10 : z.right - 10) : (z.left + z.right) / 2;
        const y1 = narrow ? ZONE_TOP - 26 : ZONE_TOP + 28;
        const y2 = narrow ? ZONE_TOP - 10 : ZONE_TOP + 46;
        g.textAlign = narrow ? (win ? 'left' : 'right') : 'center';
        g.fillStyle = color;
        g.font = '700 15px "JetBrains Mono", monospace';
        const pct = (win ? p : 1 - p) * 100;
        g.fillText(`${win ? 'WIN' : 'LOSS'} ${pct.toFixed(pct < 10 ? 2 : 1)}%`, x, y1);
        g.font = '500 12px "JetBrains Mono", monospace';
        g.globalAlpha = 0.75;
        g.fillText(win ? `+${payout.toFixed(2)} units` : '−1 unit', x, y2);
        g.globalAlpha = 1;
      }

      // Machine frame and funnel
      g.shadowColor = COLORS.blue;
      g.shadowBlur = 12;
      g.strokeStyle = COLORS.blue;
      g.lineWidth = 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(2, 0);
      g.lineTo(2, H - 2);
      g.lineTo(W - 2, H - 2);
      g.lineTo(W - 2, 0);
      g.moveTo(funnelL[0], funnelL[1]);
      g.lineTo(funnelL[2], funnelL[3]);
      g.moveTo(funnelR[0], funnelR[1]);
      g.lineTo(funnelR[2], funnelR[3]);
      g.stroke();
      g.shadowBlur = 0;

      // Divider
      g.fillStyle = 'rgba(230,235,255,0.85)';
      g.fillRect(dividerX - 3, ZONE_TOP, 6, H - ZONE_TOP);

      // Pegs
      const ps = sprites.peg;
      for (const peg of pegs) {
        g.drawImage(ps.canvas, peg.position.x - ps.size / 2, peg.position.y - ps.size / 2, ps.size, ps.size);
      }

      // Balls
      for (const b of balls) {
        const sp = b.he.win ? sprites.win : sprites.loss;
        g.globalAlpha = b.he.fade ? Math.max(0, b.he.fade) : 1;
        g.drawImage(sp.canvas, b.position.x - sp.size / 2, b.position.y - sp.size / 2, sp.size, sp.size);
      }
      g.globalAlpha = 1;

      // Floating +R / −1 labels
      g.font = '700 13px "JetBrains Mono", monospace';
      g.textAlign = 'center';
      for (const f of floaters) {
        g.globalAlpha = Math.max(0, f.life);
        g.fillStyle = f.win ? COLORS.win : COLORS.loss;
        g.fillText(f.win ? `+${payout.toFixed(2)}` : '−1', f.x, f.y);
      }
      g.globalAlpha = 1;
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(step);

    return {
      setRules,
      enqueue,
      clear,
      stats: () => ({
        released,
        live: balls.length,
        queued: queue.length,
        misplaced,
        wrongNow: balls.filter((b) => b.position.y > ZONE_TOP && (b.he.win ? b.position.x > dividerX : b.position.x < dividerX)).length,
      }),
      destroy() {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
      },
    };
  }

  HE.createMachine = createMachine;
})(window.HouseEdge = window.HouseEdge || {});
