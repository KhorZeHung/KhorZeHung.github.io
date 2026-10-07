/* Live system map in the hero.
   Draws the platform (web app, Go APIs, Kafka, services, data tier) as SVG
   and animates request packets travelling through it. Hover, focus or tap a
   node to route traffic through it and read what was built there. */
(function () {
  "use strict";

  var svg = document.getElementById("sysmap");
  if (!svg) return;
  var captionEl = document.getElementById("sysmap-caption");
  var NS = "http://www.w3.org/2000/svg";

  var canHover = window.matchMedia("(hover: hover)").matches;
  var DEFAULT_CAPTION = "A multi-tenant fintech SaaS serving 5 brokers. I designed and built every service between Kafka and the data tier. " +
    (canHover ? "Hover one to trace a request." : "Tap one to trace a request.");

  var INFO = {
    web: { label: "Web app", sub: "React / Next.js", text: "React 19 and TypeScript frontend. Lead updates arrive live over Server-Sent Events." },
    api: { label: "Go APIs", sub: "Gin, REST + SSE", text: "Go + Gin REST APIs, with Postman collections kept as the contract for frontend developers." },
    bus: { label: "Apache Kafka", text: "Kafka carries events between services, including real-time lead updates and reporting events." },
    data: { label: "Data tier", text: "MongoDB as the primary store, with Apache Doris and QuestDB alongside it." },
    kyc: { label: "KYC", text: "KYC verification: onboarding checks backed by a third-party liveness detection service." },
    leads: { label: "Leads", text: "Leads management. Changes propagate through Kafka and reach the browser over SSE." },
    cases: { label: "Cases", text: "Case management service, built from scratch in Go." },
    rewards: { label: "Rewards", text: "Gamification service, built from scratch in Go." },
    forms: { label: "Forms", text: "Questionnaire forms service, built from scratch in Go." },
    logging: { label: "Logging", text: "Centralised logging for every service on the platform." },
    reports: { label: "Reports", text: "Financial reporting: scheduled batch repopulation plus a real-time Kafka consumer with idempotent dedup." }
  };
  var SERVICES = ["kyc", "leads", "cases", "rewards", "forms", "logging", "reports"];
  var STORES = ["MongoDB", "Apache Doris", "QuestDB"];

  /* ---------- Layouts (SVG user units) ---------- */
  function desktopLayout() {
    var W = 560, n = SERVICES.length, gap = 8, sw = (528 - gap * (n - 1)) / n;
    var L = {
      W: W, H: 498,
      web: { x: 196, y: 14, w: 168, h: 54 },
      api: { x: 196, y: 112, w: 168, h: 54 },
      bus: { x: 16, y: 210, w: 528, h: 40 },
      data: { x: 16, y: 410, w: 528, h: 76, label: { x: 30, y: 432 } },
      stores: [],
      svc: {}
    };
    SERVICES.forEach(function (id, i) { L.svc[id] = { x: 16 + i * (sw + gap), y: 300, w: sw, h: 56 }; });
    var cw = 150, cg = 16, cx0 = 16 + (528 - (cw * 3 + cg * 2)) / 2;
    STORES.forEach(function (s, i) { L.stores.push({ x: cx0 + i * (cw + cg), y: 442, w: cw, h: 32, label: s }); });
    return L;
  }

  function mobileLayout() {
    var L = {
      W: 360, H: 526,
      web: { x: 100, y: 10, w: 160, h: 50 },
      api: { x: 100, y: 98, w: 160, h: 50 },
      bus: { x: 10, y: 188, w: 340, h: 38 },
      data: { x: 10, y: 434, w: 340, h: 82, label: { x: 22, y: 454 } },
      stores: [],
      svc: {}
    };
    // Row 1 holds four services; row 2 sits under the gaps so every link stays straight.
    var w = 76, g = 8;
    SERVICES.forEach(function (id, i) {
      if (i < 4) L.svc[id] = { x: 16 + i * (w + g), y: 270, w: w, h: 50 };
      else L.svc[id] = { x: 58 + (i - 4) * (w + g), y: 344, w: w, h: 50 };
    });
    STORES.forEach(function (s, i) { L.stores.push({ x: 20 + i * 110, y: 466, w: 100, h: 34, label: s }); });
    return L;
  }

  /* ---------- Helpers ---------- */
  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function cx(b) { return b.x + b.w / 2; }

  /* ---------- State ---------- */
  var L, edges, nodes, packetLayer, active = null, pinned = false;
  var packets = [];
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobileMQ = window.matchMedia("(max-width: 640px)");

  /* ---------- Render ---------- */
  function render() {
    L = mobileMQ.matches ? mobileLayout() : desktopLayout();
    svg.setAttribute("viewBox", "0 0 " + L.W + " " + L.H);
    svg.textContent = "";
    edges = { svcIn: {}, svcOut: {} };
    nodes = {};
    packets = [];

    var edgeLayer = el("g", { class: "sm-edges" }, svg);
    var nodeLayer = el("g", { class: "sm-nodes" }, svg);

    function line(x1, y1, x2, y2) {
      return el("line", { x1: x1, y1: y1, x2: x2, y2: y2, class: "sm-edge" }, edgeLayer);
    }
    edges.webApi = line(cx(L.web), L.web.y + L.web.h, cx(L.api), L.api.y);
    edges.apiBus = line(cx(L.api), L.api.y + L.api.h, cx(L.api), L.bus.y);
    SERVICES.forEach(function (id) {
      var s = L.svc[id];
      edges.svcIn[id] = line(cx(s), L.bus.y + L.bus.h, cx(s), s.y);
      edges.svcOut[id] = line(cx(s), s.y + s.h, cx(s), L.data.y);
    });

    function box(id, b, cls, label, sub) {
      var g = el("g", { class: "sm-node " + cls, "data-id": id, tabindex: "0", role: "button", "aria-label": INFO[id].label + ". " + INFO[id].text }, nodeLayer);
      el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 12 }, g);
      if (sub) {
        el("text", { x: cx(b), y: b.y + b.h / 2 - 3, class: "sm-label" }, g).textContent = label;
        el("text", { x: cx(b), y: b.y + b.h / 2 + 14, class: "sm-sub" }, g).textContent = sub;
      } else {
        el("text", { x: cx(b), y: b.y + b.h / 2 + 5, class: "sm-label" }, g).textContent = label;
      }
      nodes[id] = g;
      return g;
    }

    box("web", L.web, "sm-node--edge", INFO.web.label, INFO.web.sub);
    box("api", L.api, "sm-node--edge", INFO.api.label, INFO.api.sub);

    var bus = el("g", { class: "sm-node sm-node--bus", "data-id": "bus", tabindex: "0", role: "button", "aria-label": "Apache Kafka. " + INFO.bus.text }, nodeLayer);
    el("rect", { x: L.bus.x, y: L.bus.y, width: L.bus.w, height: L.bus.h, rx: 12 }, bus);
    el("text", { x: L.bus.x + 16, y: L.bus.y + L.bus.h / 2 + 5, class: "sm-label sm-label--start" }, bus).textContent = "Apache Kafka";
    nodes.bus = bus;

    SERVICES.forEach(function (id) { box(id, L.svc[id], "sm-node--svc", INFO[id].label); });

    var data = el("g", { class: "sm-node sm-node--data", "data-id": "data", tabindex: "0", role: "button", "aria-label": "Data tier. " + INFO.data.text }, nodeLayer);
    el("rect", { x: L.data.x, y: L.data.y, width: L.data.w, height: L.data.h, rx: 14 }, data);
    el("text", { x: L.data.label.x, y: L.data.label.y, class: "sm-sub sm-label--start" }, data).textContent = "Data tier";
    L.stores.forEach(function (s) {
      el("rect", { x: s.x, y: s.y, width: s.w, height: s.h, rx: 9, class: "sm-chip" }, data);
      el("text", { x: cx(s), y: s.y + s.h / 2 + 4.5, class: "sm-chip-label" }, data).textContent = s.label;
    });
    nodes.data = data;

    packetLayer = el("g", { class: "sm-packets", "aria-hidden": "true" }, svg);
    applyActive();
  }

  /* ---------- Routes ---------- */
  // Each route is a list of [x, y, visible] points; a segment is drawn only when its end point is visible.
  function requestRoute(id) {
    var s = L.svc[id], ax = cx(L.api), sx = cx(s), mid = L.bus.y + L.bus.h / 2;
    return [
      [cx(L.web), L.web.y + L.web.h, true],
      [ax, L.api.y, true],
      [ax, L.api.y + L.api.h, false],
      [ax, L.bus.y, true],
      [ax, mid, true],
      [sx, mid, true],
      [sx, L.bus.y + L.bus.h, true],
      [sx, s.y, true],
      [sx, s.y + s.h, false],
      [sx, L.data.y, true]
    ];
  }
  function sseRoute(id) {
    var s = L.svc[id], ax = cx(L.api), sx = cx(s), mid = L.bus.y + L.bus.h / 2;
    return [
      [sx, s.y, true],
      [sx, L.bus.y + L.bus.h, true],
      [sx, mid, true],
      [ax, mid, true],
      [ax, L.bus.y, true],
      [ax, L.api.y + L.api.h, true],
      [ax, L.api.y, false],
      [cx(L.web), L.web.y + L.web.h, true]
    ];
  }

  function spawn(route, kind) {
    var lens = [], total = 0;
    for (var i = 1; i < route.length; i++) {
      var d = Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
      lens.push(d); total += d;
    }
    var c = el("circle", { r: kind === "sse" ? 3.5 : 4, class: "sm-packet sm-packet--" + kind }, packetLayer);
    packets.push({ route: route, lens: lens, total: total, t: 0, node: c });
  }

  function positionAt(p, dist) {
    for (var i = 0; i < p.lens.length; i++) {
      if (dist <= p.lens[i]) {
        var a = p.route[i], b = p.route[i + 1], f = p.lens[i] ? dist / p.lens[i] : 0;
        return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, visible: b[2] };
      }
      dist -= p.lens[i];
    }
    var last = p.route[p.route.length - 1];
    return { x: last[0], y: last[1], visible: last[2] };
  }

  /* ---------- Animation loop ---------- */
  var SPEED = 150; // units per second
  var running = false, lastTs = 0, nextReq = 0, nextSse = 1200;

  function pickService() {
    if (active && L.svc[active]) return active;
    return SERVICES[Math.floor(Math.random() * SERVICES.length)];
  }

  function frame(ts) {
    if (!running) return;
    var dt = lastTs ? Math.min(ts - lastTs, 64) : 16;
    lastTs = ts;

    nextReq -= dt; nextSse -= dt;
    if (nextReq <= 0) { spawn(requestRoute(pickService()), "req"); nextReq = active ? 380 : 650; }
    if (nextSse <= 0) { spawn(sseRoute("leads"), "sse"); nextSse = 2400; }

    for (var i = packets.length - 1; i >= 0; i--) {
      var p = packets[i];
      p.t += SPEED * dt / 1000;
      if (p.t >= p.total) { p.node.remove(); packets.splice(i, 1); continue; }
      var pos = positionAt(p, p.t);
      p.node.setAttribute("cx", pos.x.toFixed(1));
      p.node.setAttribute("cy", pos.y.toFixed(1));
      p.node.style.opacity = pos.visible ? "" : "0";
    }
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true; lastTs = 0;
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  /* ---------- Interaction ---------- */
  function applyActive() {
    var isSvc = active && SERVICES.indexOf(active) !== -1;
    svg.classList.toggle("has-active", !!active);
    Object.keys(nodes).forEach(function (id) {
      nodes[id].classList.toggle("is-active", id === active);
      var onPath = isSvc && (id === "web" || id === "api" || id === "bus" || id === "data");
      nodes[id].classList.toggle("is-path", onPath);
    });
    edges.webApi.classList.toggle("is-hot", isSvc);
    edges.apiBus.classList.toggle("is-hot", isSvc);
    SERVICES.forEach(function (id) {
      edges.svcIn[id].classList.toggle("is-hot", id === active);
      edges.svcOut[id].classList.toggle("is-hot", id === active);
    });
    captionEl.textContent = active ? INFO[active].text : DEFAULT_CAPTION;
  }

  function setActive(id, pin) {
    if (pin !== undefined) pinned = pin;
    if (active === id) return;
    active = id;
    nextReq = 0;
    applyActive();
  }

  function nodeFrom(e) {
    var g = e.target.closest && e.target.closest(".sm-node");
    return g ? g.getAttribute("data-id") : null;
  }

  svg.addEventListener("pointerover", function (e) {
    if (e.pointerType === "touch" || pinned) return;
    var id = nodeFrom(e);
    if (id) setActive(id);
  });
  svg.addEventListener("pointerleave", function (e) {
    if (e.pointerType === "touch" || pinned) return;
    setActive(null);
  });
  svg.addEventListener("click", function (e) {
    var id = nodeFrom(e);
    if (!id) { setActive(null, false); return; }
    if (pinned && active === id) setActive(null, false);
    else setActive(id, true);
  });
  svg.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var id = nodeFrom(e);
    if (!id) return;
    e.preventDefault();
    if (pinned && active === id) setActive(null, false);
    else setActive(id, true);
  });
  svg.addEventListener("focusin", function (e) {
    var id = nodeFrom(e);
    if (id && !pinned) setActive(id);
  });
  svg.addEventListener("focusout", function (e) {
    if (!svg.contains(e.relatedTarget) && !pinned) setActive(null);
  });

  /* ---------- Boot ---------- */
  render();
  mobileMQ.addEventListener("change", function () { render(); });

  var visible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !document.hidden) start(); else stop();
    }).observe(svg);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop(); else if (visible) start();
  });
  start();
})();
