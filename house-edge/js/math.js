// Probability math and the trial ledger. No DOM, no physics.
(function (HE) {
  'use strict';

  // Simplified game: a win pays a net R units, a loss costs 1 unit.
  const expectedValue = (p, R) => p * R - (1 - p);
  const houseEdge = (p, R) => -expectedValue(p, R) * 100;
  // Standard deviation of one trial's net result: outcomes R and -1 differ by R + 1.
  const trialSd = (p, R) => (R + 1) * Math.sqrt(p * (1 - p));

  // Lanczos approximation of ln Γ(x), accurate to ~1e-13 for x > 0.
  const LANCZOS = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  function lnGamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
    x -= 1;
    let a = 0.99999999999980993;
    const t = x + 7.5;
    for (let i = 0; i < LANCZOS.length; i += 1) a += LANCZOS[i] / (x + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  function binomialPmf(n, p, k) {
    if (k < 0 || k > n) return 0;
    if (p <= 0) return k === 0 ? 1 : 0;
    if (p >= 1) return k === n ? 1 : 0;
    const logC = lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);
    return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p));
  }

  // Smallest win count that leaves the player strictly ahead after n trials: k·R − (n − k) > 0.
  const winsToBeAhead = (n, R) => Math.floor(n / (R + 1)) + 1;

  function probabilityAhead(n, p, R) {
    let total = 0;
    for (let k = winsToBeAhead(n, R); k <= n; k += 1) total += binomialPmf(n, p, k);
    return Math.min(1, total);
  }

  /**
   * Binned binomial distribution of wins in n trials, trimmed to mean ± 4.5σ
   * and grouped into at most `maxBins` bars.
   */
  function binomialBins(n, p, maxBins = 60) {
    const mean = n * p;
    const sd = Math.sqrt(n * p * (1 - p));
    const spread = Math.max(4.5 * sd, 6);
    const lo = Math.max(0, Math.floor(mean - spread));
    const hi = Math.min(n, Math.ceil(mean + spread));
    const step = Math.max(1, Math.ceil((hi - lo + 1) / maxBins));
    const bins = [];
    for (let start = lo; start <= hi; start += step) {
      const end = Math.min(hi, start + step - 1);
      let mass = 0;
      for (let k = start; k <= end; k += 1) mass += binomialPmf(n, p, k);
      bins.push({ start, end, mass });
    }
    return { bins, mean, sd, step };
  }

  // Running totals plus a down-sampled history (at most MAX_POINTS points) for charts.
  const MAX_POINTS = 400;

  function createLedger() {
    const ledger = {
      trials: 0,
      wins: 0,
      net: 0,
      stride: 1,
      points: [{ n: 0, net: 0, rate: null }],
      recent: [],
      lastBatch: null,
    };

    ledger.record = function record(win, R) {
      ledger.trials += 1;
      if (win) {
        ledger.wins += 1;
        ledger.net += R;
      } else {
        ledger.net -= 1;
      }
      if (ledger.trials % ledger.stride === 0) {
        ledger.points.push({ n: ledger.trials, net: ledger.net, rate: ledger.wins / ledger.trials });
        if (ledger.points.length > MAX_POINTS) {
          ledger.stride *= 2;
          ledger.points = ledger.points.filter((pt) => pt.n % ledger.stride === 0);
        }
      }
    };

    ledger.run = function run(n, p, R) {
      const outcomes = new Uint8Array(n);
      let wins = 0;
      for (let i = 0; i < n; i += 1) {
        const win = Math.random() < p;
        outcomes[i] = win ? 1 : 0;
        if (win) wins += 1;
        ledger.record(win, R);
      }
      const last = ledger.points[ledger.points.length - 1];
      if (last.n !== ledger.trials) {
        ledger.points.push({ n: ledger.trials, net: ledger.net, rate: ledger.wins / ledger.trials });
      }
      const tail = Array.from(outcomes.subarray(Math.max(0, n - 48)));
      ledger.recent = ledger.recent.concat(tail).slice(-48);
      ledger.lastBatch = { n, wins };
      return outcomes;
    };

    ledger.losses = () => ledger.trials - ledger.wins;
    return ledger;
  }

  // Simulate `players` sessions of `games` trials; return each player's average return per game.
  function simulateSessions(players, games, p, R) {
    const averages = new Float64Array(players);
    for (let i = 0; i < players; i += 1) {
      let wins = 0;
      for (let g = 0; g < games; g += 1) if (Math.random() < p) wins += 1;
      averages[i] = (wins * R - (games - wins)) / games;
    }
    return averages;
  }

  HE.math = {
    expectedValue,
    houseEdge,
    trialSd,
    binomialPmf,
    binomialBins,
    probabilityAhead,
    winsToBeAhead,
    createLedger,
    simulateSessions,
  };
})(window.HouseEdge = window.HouseEdge || {});
