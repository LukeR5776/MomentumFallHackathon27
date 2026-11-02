// Chart.js dashboards. Each update* function takes plain numbers and redraws without animation lag.
(function (HE) {
  'use strict';

  const C = { green: '#39ff88', purple: '#b45cff', blue: '#3fa9ff', muted: '#8b93b3', grid: 'rgba(120,150,255,0.09)' };
  const alpha = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

  Chart.defaults.color = C.muted;
  Chart.defaults.borderColor = C.grid;
  Chart.defaults.font.family = '"JetBrains Mono", ui-monospace, monospace';
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(5,8,18,0.92)';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(120,150,255,0.3)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.animation.duration = 350;

  // Neon glow on datasets that opt in with `glow: '<color>'`.
  Chart.register({
    id: 'glow',
    beforeDatasetDraw(chart, args) {
      const color = chart.data.datasets[args.index].glow;
      if (!color) return;
      chart.ctx.save();
      chart.ctx.shadowColor = color;
      chart.ctx.shadowBlur = 10;
    },
    afterDatasetDraw(chart, args) {
      if (chart.data.datasets[args.index].glow) chart.ctx.restore();
    },
  });

  // Vertical markers on category bar charts. `fraction` is 0..1 across the plot area.
  Chart.register({
    id: 'markers',
    afterDatasetsDraw(chart, _args, opts) {
      const list = opts?.items;
      if (!list?.length) return;
      const { ctx, chartArea: a } = chart;
      ctx.save();
      for (const m of list) {
        if (m.fraction == null || m.fraction < 0 || m.fraction > 1) continue;
        const x = a.left + m.fraction * (a.right - a.left);
        ctx.strokeStyle = m.color;
        ctx.lineWidth = m.width ?? 1.5;
        ctx.setLineDash(m.dash ?? []);
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(x, a.top);
        ctx.lineTo(x, a.bottom);
        ctx.stroke();
        if (m.label) {
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
          ctx.fillStyle = m.color;
          ctx.font = '600 11px "JetBrains Mono", monospace';
          ctx.textAlign = m.fraction > 0.75 ? 'right' : 'left';
          ctx.fillText(m.label, x + (m.fraction > 0.75 ? -6 : 6), a.top + 12 + (m.row ?? 0) * 14);
        }
      }
      ctx.restore();
    },
  });

  const lineOpts = (yTitle, yFormat) => ({
    parsing: false,
    normalized: true,
    animation: false,
    interaction: { mode: 'nearest', intersect: false, axis: 'x' },
    elements: { point: { radius: 0, hitRadius: 6 }, line: { tension: 0 } },
    scales: {
      x: { type: 'linear', min: 0, title: { display: true, text: 'trials' }, ticks: { maxTicksLimit: 8 } },
      y: { title: { display: true, text: yTitle }, ticks: { callback: yFormat, maxTicksLimit: 7 } },
    },
    plugins: { legend: { labels: { filter: (item) => !item.text.startsWith('_') } } },
  });

  const band = (label, fillTo) => ({
    label,
    data: [],
    borderWidth: 0,
    pointRadius: 0,
    fill: fillTo,
    backgroundColor: alpha(C.blue, 0.1),
  });

  function create() {
    const cumulative = new Chart(document.getElementById('c-cumulative'), {
      type: 'line',
      data: {
        datasets: [
          band('_upper', false),
          band('_expected ± 2σ', '-1'),
          { label: 'Expected (n × EV)', data: [], borderColor: C.blue, borderDash: [6, 5], borderWidth: 2 },
          { label: 'Actual net result', data: [], borderColor: C.green, borderWidth: 2.2, glow: C.green },
        ],
      },
      options: lineOpts('net units', (v) => v),
    });

    const rate = new Chart(document.getElementById('c-rate'), {
      type: 'line',
      data: {
        datasets: [
          band('_upper', false),
          band('_±2σ band', '-1'),
          { label: 'Theoretical p', data: [], borderColor: C.blue, borderDash: [6, 5], borderWidth: 2 },
          { label: 'Actual win rate', data: [], borderColor: C.green, borderWidth: 2.2, glow: C.green },
        ],
      },
      options: lineOpts('win rate', (v) => `${Math.round(v * 100)}%`),
    });

    const bars = new Chart(document.getElementById('c-bars'), {
      type: 'bar',
      data: {
        labels: ['Wins', 'Losses'],
        datasets: [
          {
            label: 'Expected',
            data: [0, 0],
            backgroundColor: alpha(C.blue, 0.18),
            borderColor: C.blue,
            borderWidth: 1.5,
            borderDash: [4, 3],
            borderRadius: 6,
          },
          {
            label: 'Actual',
            data: [0, 0],
            backgroundColor: [alpha(C.green, 0.75), alpha(C.purple, 0.75)],
            borderColor: [C.green, C.purple],
            borderWidth: 1.5,
            borderRadius: 6,
          },
        ],
      },
      options: { scales: { y: { beginAtZero: true, ticks: { maxTicksLimit: 6 } } } },
    });

    const dist = new Chart(document.getElementById('c-dist'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'P(wins)', data: [], backgroundColor: [], borderColor: [], borderWidth: [], categoryPercentage: 1, barPercentage: 0.92 }] },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (item) => `${(item.raw * 100).toFixed(3)}% chance` } },
          markers: { items: [] },
        },
        scales: {
          x: { title: { display: true, text: 'number of wins' }, ticks: { maxTicksLimit: 12, maxRotation: 0 } },
          y: { title: { display: true, text: 'probability' }, ticks: { callback: (v) => `${(v * 100).toFixed(1)}%`, maxTicksLimit: 6 } },
        },
      },
    });

    const histogram = (id, color) => new Chart(document.getElementById(id), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'players', data: [], backgroundColor: alpha(color, 0.6), borderColor: color, borderWidth: 1, categoryPercentage: 1, barPercentage: 0.94 }] },
      options: {
        plugins: { legend: { display: false }, markers: { items: [] } },
        scales: {
          x: { title: { display: true, text: 'average return per game (units)' }, ticks: { maxTicksLimit: 8, maxRotation: 0 } },
          y: { beginAtZero: true, title: { display: true, text: 'players' }, ticks: { maxTicksLimit: 5 } },
        },
      },
    });

    return { cumulative, rate, bars, dist, small: histogram('c-small', C.green), large: histogram('c-large', C.purple) };
  }

  function updateLines(charts, ledger, p, R) {
    const ev = HE.math.expectedValue(p, R);
    const sd = HE.math.trialSd(p, R);
    const pts = ledger.points;
    const xMax = Math.max(10, ledger.trials);

    const up = [], lo = [], exp = [], act = [];
    for (const pt of pts) {
      const spread = 2 * Math.sqrt(pt.n) * sd;
      exp.push({ x: pt.n, y: pt.n * ev });
      up.push({ x: pt.n, y: pt.n * ev + spread });
      lo.push({ x: pt.n, y: pt.n * ev - spread });
      act.push({ x: pt.n, y: pt.net });
    }
    const cum = charts.cumulative;
    [cum.data.datasets[0].data, cum.data.datasets[1].data, cum.data.datasets[2].data, cum.data.datasets[3].data] = [up, lo, exp, act];
    const ahead = ledger.net >= 0;
    cum.data.datasets[3].borderColor = ahead ? C.green : C.purple;
    cum.data.datasets[3].glow = ahead ? C.green : C.purple;
    cum.options.scales.x.max = xMax;
    cum.update('none');

    const rUp = [], rLo = [], rTh = [], rAct = [];
    const q = Math.sqrt(p * (1 - p));
    for (const pt of pts) {
      if (pt.n === 0) continue;
      const spread = (2 * q) / Math.sqrt(pt.n);
      rUp.push({ x: pt.n, y: Math.min(1, p + spread) });
      rLo.push({ x: pt.n, y: Math.max(0, p - spread) });
      rTh.push({ x: pt.n, y: p });
      rAct.push({ x: pt.n, y: pt.rate });
    }
    if (!rTh.length) rTh.push({ x: 0, y: p }, { x: xMax, y: p });
    const rate = charts.rate;
    [rate.data.datasets[0].data, rate.data.datasets[1].data, rate.data.datasets[2].data, rate.data.datasets[3].data] = [rUp, rLo, rTh, rAct];
    rate.options.scales.x.max = xMax;
    rate.options.scales.y.min = 0;
    rate.options.scales.y.max = 1;
    rate.update('none');

    const bars = charts.bars;
    bars.data.datasets[0].data = [ledger.trials * p, ledger.trials * (1 - p)];
    bars.data.datasets[1].data = [ledger.wins, ledger.losses()];
    bars.update();
  }

  function updateDistribution(charts, n, p, R, lastBatch) {
    const { bins, mean, step } = HE.math.binomialBins(n, p);
    const aheadFrom = HE.math.winsToBeAhead(n, R);
    const observed = lastBatch && lastBatch.n === n ? lastBatch.wins : null;
    const ds = charts.dist.data.datasets[0];
    charts.dist.data.labels = bins.map((b) => (b.start === b.end ? String(b.start) : `${b.start}–${b.end}`));
    ds.data = bins.map((b) => b.mass);
    ds.backgroundColor = [];
    ds.borderColor = [];
    ds.borderWidth = [];
    for (const b of bins) {
      const hit = observed != null && observed >= b.start && observed <= b.end;
      const color = b.start >= aheadFrom ? C.green : C.purple;
      ds.backgroundColor.push(hit ? '#ffffff' : alpha(color, 0.55));
      ds.borderColor.push(hit ? '#ffffff' : color);
      ds.borderWidth.push(hit ? 2 : 1);
    }
    const span = bins.length * step;
    const lo = bins[0].start;
    const items = [{ fraction: (mean - lo + 0.5) / span, color: C.blue, dash: [5, 4], label: `expected ${mean.toFixed(1)}` }];
    if (observed != null) items.push({ fraction: (observed - lo + 0.5) / span, color: '#ffffff', label: `you: ${observed}`, row: 1 });
    charts.dist.options.plugins.markers.items = items;
    charts.dist.update();
  }

  function updateHistogram(chart, values, min, max, ev, bins = 26) {
    const width = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);
    for (const v of values) {
      const i = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / width)));
      counts[i] += 1;
    }
    chart.data.labels = counts.map((_, i) => (min + (i + 0.5) * width).toFixed(2));
    chart.data.datasets[0].data = counts;
    chart.options.plugins.markers.items = [
      { fraction: (ev - min) / (max - min), color: C.blue, dash: [5, 4], label: `EV ${ev.toFixed(3)}` },
      { fraction: (0 - min) / (max - min), color: 'rgba(230,235,255,0.5)', width: 1, label: 'break-even', row: 1 },
    ];
    chart.update();
  }

  HE.charts = { create, updateLines, updateDistribution, updateHistogram };
})(window.HouseEdge = window.HouseEdge || {});
