// Interactive network-interdiction toy for the home page.
// Six selfish drivers travel from s to t. Each road's travel time grows with
// the number of drivers on it (congestion). Drivers keep switching to their
// best route until nobody can improve alone (a Nash equilibrium, reached by
// best-response dynamics, which converges because this is a potential game).
// The visitor plays the interdictor: block up to 3 roads (travel time x4)
// and watch total travel time rise. After the budget is spent we search every
// combination of the roads drivers actually use and report the best attack.

(function () {
  const canvas = document.getElementById("net");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const els = {
    cost: document.getElementById("net-cost"),
    delta: document.getElementById("net-delta"),
    left: document.getElementById("net-left"),
    msg: document.getElementById("net-msg"),
    reset: document.getElementById("net-reset"),
    busiest: document.getElementById("net-busiest"),
  };

  const css = getComputedStyle(document.documentElement);
  const C = {
    ink: css.getPropertyValue("--ink").trim() || "#18202E",
    line: css.getPropertyValue("--line").trim() || "#CDD4CD",
    flow: css.getPropertyValue("--flow").trim() || "#12807D",
    cut: css.getPropertyValue("--cut").trim() || "#C42B3B",
    paper: "#FBFCFA",
    muted: css.getPropertyValue("--muted").trim() || "#5A6474",
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const K = 6;          // drivers
  const BUDGET = 3;     // blocks
  const PENALTY = 4;    // blocked road travel-time multiplier
  const BETA = 0.55;    // congestion: time = len * (1 + BETA*(load-1))

  // ---------- seeded network -------------------------------------------
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const COLS = 7, ROWS = 4;
  const nodes = [];   // {x,y} in unit square-ish coords (0..1)
  const edges = [];   // {u,v,len}
  (function build() {
    const r = rng(20250825);
    const id = (c, rr) => 1 + c * ROWS + rr;
    nodes.push({ x: 0.035, y: 0.5 }); // s = 0
    for (let c = 0; c < COLS; c++) {
      for (let rr = 0; rr < ROWS; rr++) {
        nodes.push({
          x: 0.13 + (c / (COLS - 1)) * 0.74 + (r() - 0.5) * 0.06,
          y: 0.12 + (rr / (ROWS - 1)) * 0.76 + (r() - 0.5) * 0.09,
        });
      }
    }
    nodes.push({ x: 0.965, y: 0.5 }); // t = last
    const T = nodes.length - 1;
    const add = (u, v) => edges.push({ u, v });
    for (let rr = 0; rr < ROWS; rr++) { add(0, id(0, rr)); add(id(COLS - 1, rr), T); }
    for (let c = 0; c < COLS; c++) {
      for (let rr = 0; rr < ROWS; rr++) {
        if (c < COLS - 1) add(id(c, rr), id(c + 1, rr));
        if (rr < ROWS - 1 && r() < 0.62) add(id(c, rr), id(c, rr + 1));
        if (c < COLS - 1 && rr < ROWS - 1 && r() < 0.3) add(id(c, rr), id(c + 1, rr + 1));
        if (c < COLS - 1 && rr > 0 && r() < 0.22) add(id(c, rr), id(c + 1, rr - 1));
      }
    }
    for (const e of edges) {
      const a = nodes[e.u], b = nodes[e.v];
      e.len = Math.hypot((a.x - b.x) * 1.6, a.y - b.y) * 100;
    }
  })();
  const S = 0, T = nodes.length - 1;
  const adj = nodes.map(() => []);
  edges.forEach((e, i) => { adj[e.u].push([e.v, i]); adj[e.v].push([e.u, i]); });

  // ---------- equilibrium ---------------------------------------------
  const timeOn = (i, load, blocked) =>
    edges[i].len * (1 + BETA * (load - 1)) * (blocked.has(i) ? PENALTY : 1);

  function shortest(load, blocked) {
    // cost of joining edge i = time with one more driver
    const n = nodes.length, dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
    dist[S] = 0;
    for (let it = 0; it < n; it++) {
      let u = -1, best = Infinity;
      for (let k = 0; k < n; k++) if (!done[k] && dist[k] < best) { best = dist[k]; u = k; }
      if (u < 0 || u === T) break;
      done[u] = true;
      for (const [v, ei] of adj[u]) {
        const d = dist[u] + timeOn(ei, load[ei] + 1, blocked);
        if (d < dist[v] - 1e-9) { dist[v] = d; prev[v] = ei; }
      }
    }
    const path = []; let x = T;
    while (x !== S) { const ei = prev[x]; path.push(ei); const e = edges[ei]; x = e.u === x ? e.v : e.u; }
    return { path: path.reverse(), cost: dist[T] };
  }

  function equilibrium(blocked) {
    const load = new Array(edges.length).fill(0);
    const paths = [];
    for (let k = 0; k < K; k++) { const p = shortest(load, blocked).path; p.forEach((ei) => load[ei]++); paths.push(p); }
    for (let round = 0; round < 60; round++) {
      let moved = false;
      for (let k = 0; k < K; k++) {
        paths[k].forEach((ei) => load[ei]--);
        let curJoin = 0; for (const ei of paths[k]) curJoin += timeOn(ei, load[ei] + 1, blocked);
        const alt = shortest(load, blocked);
        if (alt.cost < curJoin - 1e-6) { paths[k] = alt.path; moved = true; }
        paths[k].forEach((ei) => load[ei]++);
      }
      if (!moved) break;
    }
    let social = 0;
    edges.forEach((_, i) => { if (load[i] > 0) social += load[i] * timeOn(i, load[i], blocked); });
    return { paths, load, social };
  }

  // ---------- state ----------------------------------------------------
  let blocked = new Set();
  const base = equilibrium(blocked);
  let eq = base;
  let hover = -1;
  let bestAttack = null; // {set, social}
  let searching = false;

  function busiestEdge() {
    let b = -1, bl = -1;
    eq.load.forEach((l, i) => { if (!blocked.has(i) && l * edges[i].len > bl) { bl = l * edges[i].len; b = i; } });
    return b;
  }

  function fmt(x) { return Math.round(x).toLocaleString(); }

  function update() {
    eq = equilibrium(blocked);
    els.cost.textContent = fmt(eq.social);
    const d = (eq.social / base.social - 1) * 100;
    els.delta.textContent = blocked.size ? (d >= 0 ? "+" : "") + d.toFixed(0) + "%" : "";
    els.left.textContent = BUDGET - blocked.size;
    if (blocked.size === 0) {
      els.msg.textContent = "Click any road to block it. Drivers will re-route.";
    } else if (blocked.size < BUDGET) {
      els.msg.textContent = "Every driver has re-routed and none can do better alone.";
    } else {
      els.msg.textContent = "Budget spent. Checking every possible attack…";
      findBest();
    }
    draw();
  }

  function findBest() {
    if (bestAttack) { reportBest(); return; }
    if (searching) return;
    searching = true;
    // Candidates: roads used with no blocks, or after any single block.
    const cand = new Set();
    const mark = (r) => r.load.forEach((l, i) => { if (l > 0) cand.add(i); });
    mark(base);
    for (let i = 0; i < edges.length; i++) if (base.load[i] > 0) mark(equilibrium(new Set([i])));
    const list = [...cand];
    const combos = [];
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) for (let c = b + 1; c < list.length; c++) combos.push([list[a], list[b], list[c]]);
    let best = { set: null, social: -1 }, idx = 0;
    (function chunk() {
      const end = Math.min(idx + 120, combos.length);
      for (; idx < end; idx++) {
        const s = equilibrium(new Set(combos[idx]));
        if (s.social > best.social) best = { set: combos[idx], social: s.social };
      }
      if (idx < combos.length) setTimeout(chunk, 0);
      else { bestAttack = best; searching = false; reportBest(); }
    })();
  }

  function reportBest() {
    if (blocked.size < BUDGET) return;
    const yours = (eq.social / base.social - 1) * 100;
    const opt = (bestAttack.social / base.social - 1) * 100;
    els.msg.textContent = yours >= opt - 0.5
      ? `You found the best attack: +${opt.toFixed(0)}%. That is an interdiction problem, solved.`
      : `Best possible with 3 blocks: +${opt.toFixed(0)}%. Yours: +${yours.toFixed(0)}%. Click a blocked road to undo it.`;
    draw();
  }

  // ---------- drawing --------------------------------------------------
  let W = 0, H = 0, dpr = 1;
  const P = (n) => ({ x: n.x * W, y: n.y * H });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  const showBest = () => bestAttack && blocked.size === BUDGET && !searching;

  function draw(now = 0) {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    const scale = Math.max(0.7, Math.min(1.2, W / 640));

    // roads
    edges.forEach((e, i) => {
      const a = P(nodes[e.u]), b = P(nodes[e.v]);
      ctx.setLineDash([]);
      ctx.strokeStyle = C.line; ctx.lineWidth = 2 * scale;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    // flow
    edges.forEach((e, i) => {
      const l = eq.load[i]; if (!l) return;
      const a = P(nodes[e.u]), b = P(nodes[e.v]);
      ctx.strokeStyle = C.flow; ctx.globalAlpha = 0.28 + 0.12 * l;
      ctx.lineWidth = (2.5 + 2.3 * l) * scale;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = 1;
    });
    // optimal attack ghost
    if (showBest()) {
      bestAttack.set.forEach((i) => {
        if (blocked.has(i)) return;
        const e = edges[i], a = P(nodes[e.u]), b = P(nodes[e.v]);
        ctx.setLineDash([2, 6]); ctx.strokeStyle = C.cut; ctx.globalAlpha = 0.55; ctx.lineWidth = 3 * scale;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.globalAlpha = 1; ctx.setLineDash([]);
      });
    }
    // blocked
    blocked.forEach((i) => {
      const e = edges[i], a = P(nodes[e.u]), b = P(nodes[e.v]);
      ctx.setLineDash([7 * scale, 5 * scale]); ctx.strokeStyle = C.cut; ctx.lineWidth = 3.2 * scale;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, s = 6 * scale;
      ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(mx, my, s + 3, 0, 7); ctx.fill();
      ctx.strokeStyle = C.cut; ctx.lineWidth = 2.4 * scale;
      ctx.beginPath(); ctx.moveTo(mx - s, my - s); ctx.lineTo(mx + s, my + s); ctx.moveTo(mx + s, my - s); ctx.lineTo(mx - s, my + s); ctx.stroke();
    });
    // hover
    if (hover >= 0) {
      const e = edges[hover], a = P(nodes[e.u]), b = P(nodes[e.v]);
      ctx.strokeStyle = blocked.has(hover) ? C.cut : C.ink; ctx.globalAlpha = 0.85; ctx.lineWidth = 3 * scale;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // first-visit hint: pulse the busiest road
    if (!blocked.size && hintUntil && now < hintUntil) {
      const i = busiestEdge(), e = edges[i], a = P(nodes[e.u]), b = P(nodes[e.v]);
      const ph = (now % 1400) / 1400;
      ctx.strokeStyle = C.cut; ctx.globalAlpha = 0.5 * (1 - ph); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, 8 + 18 * ph, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // intersections
    nodes.forEach((n, k) => {
      const p = P(n);
      if (k === S || k === T) return;
      ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.6 * scale, 0, 7); ctx.fill(); ctx.stroke();
    });
    // drivers
    if (!reduceMotion) drawDrivers(now, scale);
    // s and t
    [S, T].forEach((k) => {
      const p = P(nodes[k]);
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(p.x, p.y, 11 * scale, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `italic 600 ${15 * scale}px "Source Serif 4", Georgia, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(k === S ? "s" : "t", p.x, p.y - 1);
    });
  }

  function drawDrivers(now, scale) {
    ctx.fillStyle = C.ink;
    eq.paths.forEach((path, k) => {
      // walk the path from s, duration of each road = its travel time
      let node = S; const segs = []; let total = 0;
      for (const ei of path) {
        const e = edges[ei], from = node, to = e.u === node ? e.v : e.u;
        const d = timeOn(ei, eq.load[ei], blocked);
        segs.push({ from, to, d }); total += d; node = to;
      }
      for (let j = 0; j < 2; j++) {
        let t = ((now / 18 + k * 37 + j * total / 2) % total);
        for (const s of segs) {
          if (t <= s.d) {
            const a = P(nodes[s.from]), b = P(nodes[s.to]), f = t / s.d;
            ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 3.4 * scale, 0, 7); ctx.fill();
            break;
          }
          t -= s.d;
        }
      }
    });
  }

  // ---------- interaction ---------------------------------------------
  function nearestEdge(x, y) {
    let best = -1, bd = 14;
    edges.forEach((e, i) => {
      const a = P(nodes[e.u]), b = P(nodes[e.v]);
      const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
      let f = ((x - a.x) * dx + (y - a.y) * dy) / L; f = Math.max(0.08, Math.min(0.92, f));
      const d = Math.hypot(a.x + f * dx - x, a.y + f * dy - y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function local(ev) { const r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }

  function toggle(i) {
    if (i < 0) return;
    if (blocked.has(i)) blocked.delete(i);
    else if (blocked.size < BUDGET) blocked.add(i);
    else { els.msg.textContent = "No blocks left. Click a blocked road to undo it, or reset."; return; }
    hintUntil = 0;
    update();
  }

  canvas.addEventListener("mousemove", (ev) => { const [x, y] = local(ev); const h = nearestEdge(x, y); if (h !== hover) { hover = h; canvas.style.cursor = h >= 0 ? "pointer" : "crosshair"; draw(performance.now()); } });
  canvas.addEventListener("mouseleave", () => { hover = -1; draw(performance.now()); });
  canvas.addEventListener("click", (ev) => { const [x, y] = local(ev); toggle(nearestEdge(x, y)); });
  els.reset.addEventListener("click", () => { blocked = new Set(); update(); });
  els.busiest.addEventListener("click", () => toggle(busiestEdge()));

  let hintUntil = 0;
  function loop(now) { draw(now); requestAnimationFrame(loop); }
  window.addEventListener("resize", resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw(performance.now()));
  resize();
  update();
  if (!reduceMotion) { hintUntil = performance.now() + 6000; requestAnimationFrame(loop); }
})();
