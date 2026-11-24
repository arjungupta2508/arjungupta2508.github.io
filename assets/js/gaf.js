/* Hero visual: a synthetic light curve and its Gramian Angular Summation Field.
   Rescale the series to [-1, 1], map to angles phi = arccos(x),
   then GASF[i][j] = cos(phi_i + phi_j). */
(function () {
  var curve = document.getElementById('curve');
  var field = document.getElementById('gasf');
  var btn = document.getElementById('resample');
  if (!curve || !field) return;

  var N = 64;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var series, matrix, raf = 0, progress = 1;

  function rng(seed) { /* mulberry32 */
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeSeries(seed) {
    var r = rng(seed), out = [], i, x;
    var f1 = 0.8 + r() * 1.6, f2 = 2 + r() * 3, ph = r() * 6.283;
    var a2 = 0.15 + r() * 0.35, drift = (r() - 0.5) * 0.6;
    for (i = 0; i < N; i++) {
      x = i / (N - 1);
      out.push(Math.sin(6.283 * f1 * x + ph) + a2 * Math.sin(6.283 * f2 * x + 2 * ph) +
               drift * x + (r() - 0.5) * 0.18);
    }
    return out;
  }

  function computeGASF(s) {
    var min = Math.min.apply(null, s), max = Math.max.apply(null, s);
    var phi = s.map(function (y) {
      var v = 2 * (y - min) / (max - min) - 1;
      return Math.acos(Math.max(-1, Math.min(1, v)));
    });
    return phi.map(function (a) {
      return phi.map(function (b) { return Math.cos(a + b); });
    });
  }

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function hex(h) {
    h = h.replace('#', '');
    return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); });
  }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }

  function setup(c) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  function drawCurve(p) {
    var g = setup(curve), ctx = g.ctx, pad = 6;
    var min = Math.min.apply(null, series), max = Math.max.apply(null, series);
    var count = Math.max(2, Math.round(p * N));
    function px(i) { return pad + (g.w - 2 * pad) * i / (N - 1); }
    function py(y) { return g.h - pad - (g.h - 2 * pad) * (y - min) / (max - min); }

    ctx.strokeStyle = css('--line'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, g.h - 0.5); ctx.lineTo(g.w, g.h - 0.5); ctx.stroke();

    ctx.strokeStyle = css('--accent'); ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i < count; i++) {
      if (i === 0) ctx.moveTo(px(i), py(series[i])); else ctx.lineTo(px(i), py(series[i]));
    }
    ctx.stroke();

    ctx.fillStyle = css('--accent');
    for (var j = 0; j < count; j++) {
      ctx.beginPath(); ctx.arc(px(j), py(series[j]), 2.2, 0, 6.283); ctx.fill();
    }
  }

  function drawField(p) {
    var g = setup(field), ctx = g.ctx, cell = g.w / N;
    var c0 = hex(css('--cm0')), c1 = hex(css('--cm1')), c2 = hex(css('--cm2'));
    var limit = p * 2 * (N - 1);
    for (var i = 0; i < N; i++) {
      for (var j = 0; j < N; j++) {
        if (i + j > limit) continue;
        var t = (matrix[i][j] + 1) / 2;
        var rgb = t < 0.5 ? mix(c0, c1, t * 2) : mix(c1, c2, (t - 0.5) * 2);
        ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
        ctx.fillRect(j * cell, i * cell, cell + 0.6, cell + 0.6);
      }
    }
  }

  function draw(p) { progress = p; drawCurve(p); drawField(p); }

  function play() {
    cancelAnimationFrame(raf);
    if (reduce) { draw(1); return; }
    var start = null, dur = 1100;
    (function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      draw(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(step);
    })(performance.now());
  }

  function load(seed) {
    series = makeSeries(seed);
    matrix = computeGASF(series);
    play();
  }

  if (btn) btn.addEventListener('click', function () { load((Math.random() * 1e9) | 0); });
  document.addEventListener('themechange', function () { draw(progress); });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { draw(progress); }, 120);
  });

  load(27);
})();
