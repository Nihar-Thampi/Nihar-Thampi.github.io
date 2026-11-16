/* Interactive embedding-net background: drifting nodes that link to neighbours and to the cursor. */
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none";
  document.documentElement.style.background = "var(--paper)";
  document.body.style.background = "transparent";
  document.body.prepend(cv);
  var ctx = cv.getContext("2d");
  var W = 0, H = 0, P = [], LINK = 140, raf = 0, frame = 0;
  var mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, seen: false };
  var col = { ink: "#1D2B4E", marker: "#E9CF45", dark: false };

  function rgba(hex, a) {
    hex = hex.trim();
    if (hex[0] !== "#") return hex;
    if (hex.length === 4) hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    col.ink = cs.getPropertyValue("--ink") || col.ink;
    col.marker = cs.getPropertyValue("--marker") || col.marker;
    var p = (cs.getPropertyValue("--paper") || "#E9EDF1").trim().replace("#", "");
    var n = parseInt(p.length === 3 ? p.replace(/./g, "$&$&") : p, 16);
    col.dark = ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) < 110;
  }
  function init() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(Math.min(130, Math.max(46, (W * H) / 14000)));
    LINK = W < 600 ? 100 : 140;
    P = [];
    for (var i = 0; i < n; i++) P.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: 1.2 + Math.random() * 1.8, hot: 0 });
  }
  function burst(x, y) {
    for (var i = 0; i < P.length; i++) {
      var p = P[i], dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < 260) { var f = (1 - d / 260) * 5; p.vx += dx / d * f; p.vy += dy / d * f; p.hot = 1; }
    }
  }
  function draw() {
    var L2 = LINK * LINK, ink = col.ink, mk = col.marker, i, a, b;
    ctx.clearRect(0, 0, W, H);
    for (i = 0; i < P.length; i++) {
      var p = P[i], dx = mouse.sx - p.x, dy = mouse.sy - p.y, d2 = dx * dx + dy * dy;
      if (mouse.seen && d2 < 220 * 220 && d2 > 1) { var d = Math.sqrt(d2), f = (1 - d / 220) * 0.06; p.vx += dx / d * f; p.vy += dy / d * f; p.hot = Math.max(p.hot, 1 - d / 220); }
      p.vx *= 0.985; p.vy *= 0.985;
      if (Math.hypot(p.vx, p.vy) < 0.12) { p.vx += (Math.random() - 0.5) * 0.02; p.vy += (Math.random() - 0.5) * 0.02; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      p.hot *= 0.96;
    }
    ctx.lineWidth = 1;
    for (a = 0; a < P.length; a++) for (b = a + 1; b < P.length; b++) {
      var q = P[a], r = P[b], ddx = q.x - r.x, ddy = q.y - r.y, dd = ddx * ddx + ddy * ddy;
      if (dd < L2) {
        var s = 1 - Math.sqrt(dd) / LINK, hot = Math.max(q.hot, r.hot);
        ctx.strokeStyle = hot > 0.25 ? rgba(mk, Math.min(1, s * (0.4 + hot))) : rgba(ink, s * (col.dark ? 0.22 : 0.2));
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(r.x, r.y); ctx.stroke();
      }
    }
    if (mouse.seen) for (i = 0; i < P.length; i++) {
      var pp = P[i], cd = Math.hypot(pp.x - mouse.sx, pp.y - mouse.sy);
      if (cd < 190) { ctx.strokeStyle = rgba(mk, (1 - cd / 190) * 0.8); ctx.beginPath(); ctx.moveTo(mouse.sx, mouse.sy); ctx.lineTo(pp.x, pp.y); ctx.stroke(); }
    }
    for (i = 0; i < P.length; i++) {
      var n = P[i];
      ctx.fillStyle = n.hot > 0.25 ? rgba(mk, 0.95) : rgba(ink, col.dark ? 0.55 : 0.5);
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r + n.hot * 2.2, 0, 6.2832); ctx.fill();
    }
    if (mouse.seen) { ctx.fillStyle = rgba(mk, 0.9); ctx.beginPath(); ctx.arc(mouse.sx, mouse.sy, 4, 0, 6.2832); ctx.fill(); }
  }
  function tick() {
    raf = requestAnimationFrame(tick);
    if (++frame % 60 === 1) readColors();
    if (mouse.seen) { mouse.sx += (mouse.x - mouse.sx) * 0.2; mouse.sy += (mouse.y - mouse.sy) * 0.2; }
    draw();
    if (reduce) stop();
  }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  addEventListener("resize", init);
  addEventListener("pointermove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (!mouse.seen) { mouse.sx = mouse.x; mouse.sy = mouse.y; mouse.seen = true; }
  }, { passive: true });
  addEventListener("pointerdown", function (e) { burst(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener("pointerleave", function () { mouse.seen = false; });
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  readColors(); init(); start();
})();
