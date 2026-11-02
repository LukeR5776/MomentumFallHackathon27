// Wires the controls, the ledger, the machine and the charts together.
(function (HE) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const { expectedValue, houseEdge, probabilityAhead, simulateSessions, createLedger } = HE.math;

  const state = { p: 18 / 38, R: 1, N: 500 };
  let ledger = createLedger();

  const machine = HE.createMachine($('machine-canvas'));
  machine.setRules(state.p, state.R);
  const charts = HE.charts.create();

  // ---------- formatting & animated numbers ----------
  const fmtInt = (v) => Math.round(v).toLocaleString('en-US');
  const fmtPct = (v) => `${v.toFixed(2)}%`;
  const fmtSigned = (digits) => (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}`;
  const fmtSignedPct = (v) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%`;

  const tweens = new Map();
  function animateNumber(el, to, format) {
    const from = el._value ?? 0;
    el._value = to;
    if (from === to) {
      el.textContent = format(to);
      return;
    }
    tweens.set(el, { from, to, format, start: performance.now() });
    if (tweens.size === 1) requestAnimationFrame(tick);
  }
  function tick(now) {
    for (const [el, t] of tweens) {
      const k = Math.min(1, (now - t.start) / 550);
      const eased = 1 - (1 - k) ** 3;
      el.textContent = t.format(t.from + (t.to - t.from) * eased);
      if (k === 1) tweens.delete(el);
    }
    if (tweens.size) requestAnimationFrame(tick);
  }

  function setTone(el, value) {
    el.classList.toggle('glow-green', value > 0);
    el.classList.toggle('glow-purple', value < 0);
    el.classList.toggle('glow-blue', value === 0);
  }

  // ---------- rendering ----------
  function renderRules() {
    const { p, R } = state;
    const winPct = p * 100;
    const ev = expectedValue(p, R);
    const edge = houseEdge(p, R);

    $('out-win').textContent = fmtPct(winPct);
    $('out-loss').textContent = fmtPct(100 - winPct);
    $('out-payout').textContent = `${R.toFixed(2)}×`;
    $('sum-win').style.width = `${winPct}%`;
    $('sum-loss').style.width = `${100 - winPct}%`;
    $('rule-chip').textContent = `p(win) ${winPct.toFixed(2)}% · pays ${R.toFixed(2)}×`;
    $('formula').textContent =
      `EV = ${p.toFixed(4)} × ${R.toFixed(2)} − ${(1 - p).toFixed(4)} × 1 = ${fmtSigned(4)(ev)} units per trial`;

    $('s-winpct-sub').textContent = `theory ${winPct.toFixed(2)}%`;
    $('s-losspct-sub').textContent = `theory ${(100 - winPct).toFixed(2)}%`;
    const evEl = $('s-ev');
    animateNumber(evEl, ev, fmtSigned(4));
    setTone(evEl, Math.abs(ev) < 1e-9 ? 0 : ev);
    const edgeEl = $('s-edge');
    animateNumber(edgeEl, edge, fmtSignedPct);
    setTone(edgeEl, Math.abs(edge) < 1e-9 ? 0 : -edge);
    $('s-edge-sub').textContent = edge > 1e-9
      ? 'house wins on average'
      : edge < -1e-9 ? 'player wins on average' : 'perfectly fair game';
  }

  function renderStats(flash) {
    const t = ledger.trials;
    animateNumber($('s-trials'), t, fmtInt);
    animateNumber($('s-wins'), ledger.wins, fmtInt);
    animateNumber($('s-losses'), ledger.losses(), fmtInt);
    animateNumber($('s-winpct'), t ? (ledger.wins / t) * 100 : 0, fmtPct);
    animateNumber($('s-losspct'), t ? (ledger.losses() / t) * 100 : 0, fmtPct);
    const avg = t ? ledger.net / t : 0;
    const avgEl = $('s-avg');
    animateNumber(avgEl, avg, fmtSigned(4));
    setTone(avgEl, t ? avg : 0);

    if (flash) {
      for (const card of document.querySelectorAll('.stat')) {
        card.classList.remove('flash');
        void card.offsetWidth;
        card.classList.add('flash');
      }
    }

    $('ticker').innerHTML = ledger.recent.map((w) => `<i class="${w ? 'w' : 'l'}"></i>`).join('');
  }

  function renderLastResult(outcomes) {
    const el = $('last-result');
    el.classList.remove('win', 'loss', 'pop');
    if (!outcomes) {
      el.textContent = 'Press a run button to start';
      return;
    }
    if (outcomes.length === 1) {
      const win = outcomes[0] === 1;
      el.textContent = win ? `Trial #${fmtInt(ledger.trials)}: WIN +${state.R.toFixed(2)}` : `Trial #${fmtInt(ledger.trials)}: LOSS −1`;
      el.classList.add(win ? 'win' : 'loss');
    } else {
      const wins = outcomes.reduce((s, v) => s + v, 0);
      const net = wins * state.R - (outcomes.length - wins);
      el.textContent = `${fmtInt(outcomes.length)} trials: ${fmtInt(wins)} W / ${fmtInt(outcomes.length - wins)} L · net ${fmtSigned(2)(net)}`;
      el.classList.add(net >= 0 ? 'win' : 'loss');
    }
    void el.offsetWidth;
    el.classList.add('pop');
  }

  // Chart work is coalesced into one frame no matter how many inputs fire.
  let chartsDirty = false;
  let distDirty = false;
  let samplesDirty = false;
  function scheduleCharts({ lines = false, dist = false, samples = false } = {}) {
    chartsDirty ||= lines;
    distDirty ||= dist;
    samplesDirty ||= samples;
    requestAnimationFrame(flushCharts);
  }
  function flushCharts() {
    if (chartsDirty) HE.charts.updateLines(charts, ledger, state.p, state.R);
    if (distDirty) {
      HE.charts.updateDistribution(charts, state.N, state.p, state.R, ledger.lastBatch);
      $('dist-n').textContent = fmtInt(state.N);
      $('dist-ahead').textContent = `P(player ahead after ${fmtInt(state.N)}) = ${(probabilityAhead(state.N, state.p, state.R) * 100).toFixed(2)}%`;
    }
    if (samplesDirty) renderSamples();
    chartsDirty = distDirty = samplesDirty = false;
  }

  function renderSamples() {
    const { p, R } = state;
    const ev = expectedValue(p, R);
    const min = -1;
    const max = Math.max(R, 0.1);
    const groups = [
      { games: 10, chart: charts.small, ahead: 'small-ahead', sub: 'small-sub' },
      { games: 1000, chart: charts.large, ahead: 'large-ahead', sub: 'large-sub' },
    ];
    for (const group of groups) {
      const values = simulateSessions(400, group.games, p, R);
      let ahead = 0;
      let sum = 0;
      let sq = 0;
      for (const v of values) {
        if (v > 0) ahead += 1;
        sum += v;
        sq += v * v;
      }
      const mean = sum / values.length;
      const sd = Math.sqrt(Math.max(0, sq / values.length - mean * mean));
      HE.charts.updateHistogram(group.chart, values, min, max, ev);
      $(group.ahead).textContent = `${((ahead / values.length) * 100).toFixed(1)}%`;
      $(group.sub).textContent = `finished ahead · mean ${fmtSigned(3)(mean)} · spread (SD) ${sd.toFixed(3)}`;
    }
  }

  // ---------- actions ----------
  function run(n) {
    const outcomes = ledger.run(n, state.p, state.R);
    machine.enqueue(outcomes);
    renderStats(true);
    renderLastResult(outcomes);
    scheduleCharts({ lines: true, dist: true });
  }

  function reset() {
    ledger = createLedger();
    machine.clear();
    renderStats(false);
    renderLastResult(null);
    scheduleCharts({ lines: true, dist: true });
  }

  let toastTimer = 0;
  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // Changing the rules starts a fresh experiment so actual and theoretical numbers stay comparable.
  function setRules(p, R, { syncInputs = true } = {}) {
    state.p = Math.min(1, Math.max(0, p));
    state.R = R;
    if (syncInputs) {
      $('in-win').value = String(+(state.p * 100).toFixed(2));
      $('in-payout').value = String(state.R);
    }
    $('in-loss').value = String(+(100 - state.p * 100).toFixed(2));
    machine.setRules(state.p, state.R);
    const hadTrials = ledger.trials > 0;
    reset();
    if (hadTrials) toast('Rules changed — a new experiment started.');
    renderRules();
    for (const btn of document.querySelectorAll('.preset')) {
      btn.classList.toggle('active', Math.abs(+btn.dataset.p / 100 - state.p) < 1e-9 && +btn.dataset.r === state.R);
    }
    scheduleCharts({ lines: true, dist: true, samples: true });
  }

  // ---------- events ----------
  $('in-win').addEventListener('input', (e) => setRules(e.target.valueAsNumber / 100, state.R, { syncInputs: false }));
  $('in-loss').addEventListener('input', (e) => {
    const winPct = 100 - e.target.valueAsNumber;
    $('in-win').value = String(+winPct.toFixed(2));
    setRules(winPct / 100, state.R, { syncInputs: false });
  });
  $('in-payout').addEventListener('input', (e) => setRules(state.p, e.target.valueAsNumber, { syncInputs: false }));
  $('in-trials').addEventListener('input', (e) => {
    state.N = e.target.valueAsNumber;
    $('out-trials').textContent = fmtInt(state.N);
    $('run-custom').textContent = `Run ${fmtInt(state.N)} Trials`;
    scheduleCharts({ dist: true });
  });

  for (const btn of document.querySelectorAll('[data-run]')) {
    btn.addEventListener('click', () => run(Number(btn.dataset.run)));
  }
  $('run-custom').addEventListener('click', () => run(state.N));
  $('reset').addEventListener('click', reset);
  $('resample').addEventListener('click', () => scheduleCharts({ samples: true }));
  for (const btn of document.querySelectorAll('.preset')) {
    btn.addEventListener('click', () => setRules(Number(btn.dataset.p) / 100, Number(btn.dataset.r)));
  }

  setInterval(() => {
    const s = machine.stats();
    $('hud-released').textContent = fmtInt(s.released);
    $('hud-live').textContent = fmtInt(s.live);
    $('hud-queued').textContent = fmtInt(s.queued);
  }, 100);

  // ---------- boot ----------
  renderRules();
  renderStats(false);
  scheduleCharts({ lines: true, dist: true, samples: true });

  HE.debug = { state, get ledger() { return ledger; }, machine };
})(window.HouseEdge = window.HouseEdge || {});
