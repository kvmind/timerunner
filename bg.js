// The backdrop of the app (HUDBackground in App/Components.swift), a little fainter: the lattice that fades toward
// the middle, the survey grid with a crosshair at every crossing, the dial in the lower right corner, turning once
// in a minute and a half, and the tick ladder and the ruler, which roll slowly after the pointer.
(function () {
  var INK = "124,224,211", MUTE = 0.6;
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.createElement("div"), still = document.createElement("canvas"),
      dial = document.createElement("canvas"), live = document.createElement("canvas");
  root.className = "bg";
  root.setAttribute("aria-hidden", "true");
  dial.className = "dial";
  root.appendChild(still); root.appendChild(dial); root.appendChild(live);
  document.body.insertBefore(root, document.body.firstChild);

  var W = 0, H = 0, ratio = 1;
  function ink(alpha) { return "rgba(" + INK + "," + alpha * MUTE + ")"; }
  function sheet(canvas, width, height) {
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    canvas.style.width = width + "px"; canvas.style.height = height + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return ctx;
  }
  function line(ctx, x1, y1, x2, y2) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }

  function drawStill() {
    var ctx = sheet(still, W, H), x, y;
    // Isometric lattice, strong at the top and the bottom, nearly gone in between.
    var step = 26, rise = step * 0.866, slant = H * 0.5774;
    ctx.beginPath();
    for (y = 0; y < H; y += rise) line(ctx, 0, y, W, y);
    for (x = -slant; x < W + slant; x += step) { line(ctx, x, 0, x + slant, H); line(ctx, x + slant, 0, x, H); }
    ctx.strokeStyle = ink(0.11); ctx.lineWidth = 0.5; ctx.stroke();
    var fade = ctx.createLinearGradient(0, 0, 0, H);
    fade.addColorStop(0, "rgba(0,0,0,1)"); fade.addColorStop(0.2, "rgba(0,0,0,0.1)");
    fade.addColorStop(0.72, "rgba(0,0,0,0.1)"); fade.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillStyle = fade; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";

    // Wide survey grid with a crosshair at every crossing.
    var cw = 148, ch = 124;
    ctx.beginPath();
    for (x = cw; x < W - 40; x += cw) line(ctx, x, 0, x, H);
    for (y = 104; y < H - 20; y += ch) line(ctx, 0, y, W, y);
    ctx.strokeStyle = ink(0.05); ctx.lineWidth = 0.5; ctx.stroke();
    ctx.beginPath();
    for (x = cw; x < W - 40; x += cw)
      for (y = 104; y < H - 20; y += ch) { line(ctx, x - 4, y, x + 4, y); line(ctx, x, y - 4, x, y + 4); }
    ctx.strokeStyle = ink(0.3); ctx.lineWidth = 1; ctx.stroke();

    // The pointer at zero under the ruler, and the crosshair at the hub of the dial.
    ctx.beginPath(); ctx.moveTo(W / 2 - 4, 24); ctx.lineTo(W / 2 + 4, 24); ctx.lineTo(W / 2, 29); ctx.closePath();
    ctx.fillStyle = ink(0.45); ctx.fill();
    ctx.beginPath();
    line(ctx, W - 170 - 26, H - 130, W - 170 + 26, H - 130); line(ctx, W - 170, H - 130 - 26, W - 170, H - 130 + 26);
    ctx.strokeStyle = ink(0.09); ctx.lineWidth = 1; ctx.stroke();
  }

  function drawDial() {
    var radius = 215, side = (radius + 16) * 2, hub = side / 2, ctx = sheet(dial, side, side), i;
    ctx.strokeStyle = ink(0.09); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hub, hub, radius, 0, Math.PI * 2);
    for (i = 0; i < 72; i++) {
      var angle = i * Math.PI / 36, reach = i % 6 === 0 ? 14 : 6;
      line(ctx, hub + Math.cos(angle) * radius, hub + Math.sin(angle) * radius,
           hub + Math.cos(angle) * (radius + reach), hub + Math.sin(angle) * (radius + reach));
    }
    ctx.stroke();
    ctx.beginPath(); ctx.setLineDash([2, 6]); ctx.arc(hub, hub, radius - 34, 0, Math.PI * 2); ctx.stroke();
  }

  // The ladder and the ruler are rims of wheels seen edge-on: their ticks drift toward where the pointer is.
  var travel = 96, target = { x: 0, y: 0 }, value = { x: 0, y: 0 }, last = 0, awake = false;
  function drawLive() {
    var ctx = sheet(live, W, H), index, pos, fade, step = 11, top = 128, bottom = H - 44;
    for (index = Math.floor(-value.y / step) - 1; ; index++) {
      pos = top + index * step + value.y;
      if (pos > bottom) break;
      if (pos < top) continue;
      var long = ((index % 5) + 5) % 5 === 0, width = long ? 14 : 8;
      fade = Math.max(0, Math.min(1, (pos - top) / 36, (bottom - pos) / 36));
      ctx.fillStyle = ink((long ? 0.55 : 0.28) * fade);
      ctx.fillRect(W - 18 - width, pos, width, 1);
    }
    var centre = W / 2, reach = Math.min(32 * 9, W / 2 - 24), left = centre - reach, right = centre + reach;
    step = 9;
    for (index = Math.floor((-reach - value.x) / step) - 1; ; index++) {
      pos = centre + index * step + value.x;
      if (pos > right) break;
      if (pos < left) continue;
      fade = Math.max(0, Math.min(1, (pos - left) / 36, (right - pos) / 36));
      ctx.fillStyle = ink(0.3 * fade);
      ctx.fillRect(pos - 0.5, 12, 1, ((index % 5) + 5) % 5 === 0 ? 9 : 5);
    }
  }
  function frame(now) {
    var dt = Math.min(Math.max((now - last) / 1000, 0), 0.1), ease = 1 - Math.exp(-dt * 2.4);
    last = now;
    value.x += (target.x - value.x) * ease; value.y += (target.y - value.y) * ease;
    drawLive();
    awake = Math.abs(target.x - value.x) > 0.05 || Math.abs(target.y - value.y) > 0.05;
    if (awake) requestAnimationFrame(frame);
  }
  if (!calm) window.addEventListener("mousemove", function (event) {
    target.x = (Math.min(Math.max(event.clientX / W, 0), 1) - 0.5) * 2 * travel;
    target.y = (Math.min(Math.max(event.clientY / H, 0), 1) - 0.5) * 2 * travel;
    if (!awake) { awake = true; last = performance.now(); requestAnimationFrame(frame); }
  }, { passive: true });

  function layout() {
    W = window.innerWidth; H = window.innerHeight; ratio = Math.min(window.devicePixelRatio || 1, 2);
    drawStill(); drawDial(); drawLive();
  }
  var pending = false;
  window.addEventListener("resize", function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; layout(); });
  });
  layout();
})();
