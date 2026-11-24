/* Hero visual: a small neural network (2 inputs, two hidden layers of 6, 3 outputs)
   trained in the browser to sort 2D points into three classes. Each classification
   is a real forward pass, shown layer by layer. */
(function () {
  var canvas = document.getElementById('nn');
  var btn = document.getElementById('nn-next');
  if (!canvas) return;

  var SIZES = [2, 6, 6, 3];
  var LETTERS = ['A', 'B', 'C'];
  var CENTERS = [[-0.55, -0.45], [0.6, -0.35], [0.0, 0.62]];

  /* ---------------- model ---------------- */
  function rng(seed) { /* mulberry32 */
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = rng(7);
  function gauss() {
    var u = 1 - rand(), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * v);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var W = [], B = [], l, j, i;
  for (l = 1; l < SIZES.length; l++) {
    var w = [], b = [], lim = Math.sqrt(6 / (SIZES[l - 1] + SIZES[l]));
    for (j = 0; j < SIZES[l]; j++) {
      var row = [];
      for (i = 0; i < SIZES[l - 1]; i++) row.push((rand() * 2 - 1) * lim);
      w.push(row); b.push(0);
    }
    W.push(w); B.push(b);
  }

  function forward(x) {
    var acts = [x], L = SIZES.length - 1, a, z, k, m, s, max, sum;
    for (l = 1; l <= L; l++) {
      a = acts[l - 1]; z = [];
      for (k = 0; k < SIZES[l]; k++) {
        s = B[l - 1][k];
        for (m = 0; m < a.length; m++) s += W[l - 1][k][m] * a[m];
        z.push(s);
      }
      if (l < L) {
        acts.push(z.map(Math.tanh));
      } else {
        max = Math.max.apply(null, z); sum = 0;
        z = z.map(function (v) { var e = Math.exp(v - max); sum += e; return e; });
        acts.push(z.map(function (v) { return v / sum; }));
      }
    }
    return acts;
  }

  function trainStep(x, y, lr) {
    var a = forward(x), L = SIZES.length - 1;
    var delta = a[L].map(function (p, k) { return p - y[k]; });
    for (var ly = L; ly >= 1; ly--) {
      var prev = a[ly - 1], Wl = W[ly - 1], Bl = B[ly - 1], nd = null, p, q;
      if (ly > 1) {
        nd = [];
        for (p = 0; p < prev.length; p++) {
          var acc = 0;
          for (q = 0; q < delta.length; q++) acc += Wl[q][p] * delta[q];
          nd.push(acc * (1 - prev[p] * prev[p]));
        }
      }
      for (q = 0; q < delta.length; q++) {
        for (p = 0; p < prev.length; p++) Wl[q][p] -= lr * delta[q] * prev[p];
        Bl[q] -= lr * delta[q];
      }
      delta = nd;
    }
  }

  var data = [], c, n;
  for (c = 0; c < 3; c++) {
    for (n = 0; n < 80; n++) {
      data.push({
        x: [clamp(CENTERS[c][0] + 0.17 * gauss(), -1, 1), clamp(CENTERS[c][1] + 0.17 * gauss(), -1, 1)],
        y: [0, 1, 2].map(function (k) { return k === c ? 1 : 0; }),
        c: c
      });
    }
  }
  for (var epoch = 0; epoch < 150; epoch++) {
    for (n = data.length - 1; n > 0; n--) { /* shuffle */
      var r = Math.floor(rand() * (n + 1)), tmp = data[n]; data[n] = data[r]; data[r] = tmp;
    }
    for (n = 0; n < data.length; n++) trainStep(data[n].x, data[n].y, 0.05);
  }

  function argmax(v) { var best = 0; for (var k = 1; k < v.length; k++) if (v[k] > v[best]) best = k; return best; }

  var G = 32, regions = [];
  (function () {
    for (var gy = 0; gy < G; gy++) for (var gx = 0; gx < G; gx++) {
      regions.push(argmax(forward([-1 + (gx + 0.5) * 2 / G, 1 - (gy + 0.5) * 2 / G])[3]));
    }
  })();

  var maxW = W.map(function (layer) {
    var m = 0; layer.forEach(function (row) { row.forEach(function (v) { m = Math.max(m, Math.abs(v)); }); });
    return m;
  });

  /* ---- view ---- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx, Wd = 0, Hd = 0, geo = null, colors = null;
  var cur = null, startT = 0, raf = 0, timer = 0;
  var autoRuns = 0, interacted = false, visible = true, lastStages = [1, 1, 1, 1];
  var TOTAL = 1800;

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function refreshColors() {
    colors = {
      accent: css('--accent'), muted: css('--muted'), line: css('--line'),
      text: css('--text'), surface: css('--surface'),
      cls: [css('--c0'), css('--c1'), css('--c2')]
    };
  }

  function layout() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    Wd = canvas.clientWidth; Hd = canvas.clientHeight;
    if (!Wd || !Hd) return false;
    canvas.width = Math.round(Wd * dpr); canvas.height = Math.round(Hd * dpr);
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var ps = Wd * 0.30;
    geo = {
      px: 2, py: (Hd - ps) / 2, ps: ps,
      cx: [0.41, 0.55, 0.69, 0.81].map(function (f) { return f * Wd; }),
      r: clamp(Wd * 0.017, 4, 8),
      ys: SIZES.map(function (cnt) {
        var span = cnt === 2 ? 0.26 : cnt === 3 ? 0.5 : 0.78, out = [];
        for (var k = 0; k < cnt; k++) out.push(Hd / 2 + (k - (cnt - 1) / 2) * (span * Hd) / (cnt - 1));
        return out;
      })
    };
    return true;
  }

  function toPlane(x, y) { return [geo.px + (x + 1) / 2 * geo.ps, geo.py + (1 - (y + 1) / 2) * geo.ps]; }

  function draw(s) {
    if (!geo) return;
    lastStages = s;
    var k, m, p, g = geo;
    ctx.clearRect(0, 0, Wd, Hd);
    ctx.font = '500 12px "Schibsted Grotesk", system-ui, sans-serif';

    /* plane: decision regions, training points, current point */
    var cell = g.ps / G;
    ctx.globalAlpha = 0.16;
    for (k = 0; k < regions.length; k++) {
      ctx.fillStyle = colors.cls[regions[k]];
      ctx.fillRect(g.px + (k % G) * cell, g.py + Math.floor(k / G) * cell, cell + 0.6, cell + 0.6);
    }
    ctx.globalAlpha = 0.6;
    for (k = 0; k < data.length; k += 2) {
      p = toPlane(data[k].x[0], data[k].x[1]);
      ctx.fillStyle = colors.cls[data[k].c];
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.7, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.line; ctx.lineWidth = 1;
    ctx.strokeRect(g.px + 0.5, g.py + 0.5, g.ps - 1, g.ps - 1);

    if (cur && s[0] > 0) {
      p = toPlane(cur.x[0], cur.x[1]);
      ctx.beginPath(); ctx.arc(p[0], p[1], 3 + 3 * s[0], 0, 6.283);
      ctx.fillStyle = s[3] >= 1 ? colors.cls[cur.pred] : colors.surface; ctx.fill();
      ctx.strokeStyle = colors.text; ctx.lineWidth = 2; ctx.stroke();
    }

    if (!cur) return;

    /* connections */
    for (l = 1; l < SIZES.length; l++) {
      for (j = 0; j < SIZES[l]; j++) for (i = 0; i < SIZES[l - 1]; i++) {
        var w = W[l - 1][j][i], sig = Math.abs(w * cur.acts[l - 1][i]) / cur.maxSig[l];
        var x1 = g.cx[l - 1], y1 = g.ys[l - 1][i], x2 = g.cx[l], y2 = g.ys[l][j];
        ctx.lineWidth = 0.4 + 1.3 * Math.abs(w) / maxW[l - 1];
        ctx.strokeStyle = colors.muted; ctx.globalAlpha = 0.16;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (s[l] > 0) {
          ctx.strokeStyle = colors.accent; ctx.globalAlpha = 0.85 * s[l] * sig;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    /* nodes */
    for (l = 0; l < SIZES.length; l++) {
      for (i = 0; i < SIZES[l]; i++) {
        var v = cur.acts[l][i];
        var strength = l === 0 ? (v + 1) / 2 : l === 3 ? v : Math.abs(v);
        ctx.beginPath(); ctx.arc(g.cx[l], g.ys[l][i], g.r, 0, 6.283);
        ctx.fillStyle = colors.surface; ctx.fill();
        ctx.fillStyle = l === 3 ? colors.cls[i] : colors.accent;
        ctx.globalAlpha = clamp(strength, 0, 1) * s[l]; ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = l === 3 && s[3] >= 1 && i === cur.pred ? colors.cls[i] : colors.muted;
        ctx.lineWidth = l === 3 && s[3] >= 1 && i === cur.pred ? 2.5 : 1;
        ctx.stroke();
      }
    }

    /* labels and outputs */
    ctx.fillStyle = colors.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('x', g.cx[0] - g.r - 5, g.ys[0][0]);
    ctx.fillText('y', g.cx[0] - g.r - 5, g.ys[0][1]);

    ctx.textAlign = 'left';
    var tx = g.cx[3] + g.r + 8, bw = Wd - tx - 4;
    for (i = 0; i < 3; i++) {
      var prob = cur.acts[3][i] * s[3], cy = g.ys[3][i];
      ctx.fillStyle = colors.cls[i];
      ctx.fillText(LETTERS[i] + '  ' + Math.round(prob * 100) + '%', tx, cy - 3);
      ctx.globalAlpha = 0.18; ctx.fillRect(tx, cy + 6, bw, 3);
      ctx.globalAlpha = 1; ctx.fillRect(tx, cy + 6, bw * prob, 3);
    }
  }

  function stages(t) {
    function st(a, d) { return clamp((t - a) / d, 0, 1); }
    return [st(0, 300), st(300, 450), st(750, 450), st(1200, 450)];
  }

  function frame(now) {
    var t = now - startT;
    if (t >= TOTAL) { draw([1, 1, 1, 1]); finish(); return; }
    draw(stages(t));
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    canvas.setAttribute('aria-label',
      'Neural network diagram. The point at x ' + cur.x[0].toFixed(2) + ', y ' + cur.x[1].toFixed(2) +
      ' is classified as class ' + LETTERS[cur.pred] + ' with ' + Math.round(cur.acts[3][cur.pred] * 100) + '% confidence.');
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (reduce || interacted || autoRuns >= 5 || !visible) return;
    timer = setTimeout(function () {
      if (document.hidden || !visible) { schedule(); return; }
      autoRuns++;
      classify((rand() * 2 - 1) * 0.92, (rand() * 2 - 1) * 0.92);
    }, 2600);
  }

  function classify(x, y) {
    cancelAnimationFrame(raf); clearTimeout(timer);
    if (!geo && !layout()) return;
    var acts = forward([x, y]);
    var maxSig = acts.map(function (a, li) {
      if (li === 0) return 1;
      var m = 1e-9;
      for (var jj = 0; jj < SIZES[li]; jj++) for (var ii = 0; ii < SIZES[li - 1]; ii++) {
        m = Math.max(m, Math.abs(W[li - 1][jj][ii] * acts[li - 1][ii]));
      }
      return m;
    });
    cur = { x: [x, y], acts: acts, pred: argmax(acts[3]), maxSig: maxSig };
    if (reduce) { draw([1, 1, 1, 1]); finish(); return; }
    startT = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function randomPoint() { classify((rand() * 2 - 1) * 0.95, (rand() * 2 - 1) * 0.95); }

  if (btn) btn.addEventListener('click', function () { interacted = true; randomPoint(); });

  function planeHit(e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (!geo || mx < geo.px || mx > geo.px + geo.ps || my < geo.py || my > geo.py + geo.ps) return null;
    return [(mx - geo.px) / geo.ps * 2 - 1, 1 - (my - geo.py) / geo.ps * 2];
  }
  canvas.addEventListener('click', function (e) {
    var h = planeHit(e);
    if (h) { interacted = true; classify(h[0], h[1]); }
  });
  canvas.addEventListener('mousemove', function (e) { canvas.style.cursor = planeHit(e) ? 'crosshair' : 'default'; });

  document.addEventListener('themechange', function () { refreshColors(); draw(lastStages); });
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (layout()) { cancelAnimationFrame(raf); draw([1, 1, 1, 1]); } }, 120);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) schedule();
    }).observe(canvas);
  }

  refreshColors();
  if (layout()) classify(0.45, -0.2);
  /* ---- end ---- */
})();