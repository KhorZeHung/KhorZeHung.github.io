(function () {
  "use strict";

  var root = document.documentElement;
  var nav = document.querySelector(".nav");
  var navToggle = document.getElementById("nav-toggle");
  var navLinks = document.getElementById("nav-links");
  var themeToggle = document.getElementById("theme-toggle");

  /* ---------- Theme toggle (dark by default, remembered per visitor) ---------- */
  function applyTheme(theme) {
    root.dataset.theme = theme;
    var next = theme === "dark" ? "light" : "dark";
    themeToggle.setAttribute("aria-label", "Switch to " + next + " theme");
    themeToggle.innerHTML = '<i class="ph ' + (theme === "dark" ? "ph-sun" : "ph-moon") + '" aria-hidden="true"></i>';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#001e2b" : "#f2f4ef");
  }

  applyTheme(root.dataset.theme === "light" ? "light" : "dark");

  themeToggle.addEventListener("click", function () {
    var theme = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    try { localStorage.setItem("theme", theme); } catch (e) {}
  });

  /* ---------- Mobile menu ---------- */
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navToggle.innerHTML = '<i class="ph ' + (open ? "ph-x" : "ph-list") + '" aria-hidden="true"></i>';
  }

  navToggle.addEventListener("click", function () {
    setMenu(!nav.classList.contains("is-open"));
  });

  navLinks.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      setMenu(false);
      navToggle.focus();
    }
  });

  window.matchMedia("(min-width: 861px)").addEventListener("change", function (mq) {
    if (mq.matches) setMenu(false);
  });

  /* ---------- Copy email ---------- */
  var copyBtn = document.getElementById("copy-email");
  var copyStatus = document.getElementById("copy-status");
  copyBtn.addEventListener("click", function () {
    var email = copyBtn.dataset.email;
    if (!navigator.clipboard || !window.isSecureContext) {
      window.location.href = "mailto:" + email;
      return;
    }
    navigator.clipboard.writeText(email).then(function () {
      copyStatus.textContent = "Copied";
      copyBtn.innerHTML = '<i class="ph ph-check" aria-hidden="true"></i>';
      setTimeout(function () {
        copyStatus.textContent = "";
        copyBtn.innerHTML = '<i class="ph ph-copy" aria-hidden="true"></i>';
      }, 2000);
    }, function () {
      window.location.href = "mailto:" + email;
    });
  });

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  if (!("IntersectionObserver" in window)) return;

  /* ---------- Highlight the nav link of the section in view ---------- */
  var linkFor = {};
  navLinks.querySelectorAll('a[href^="#"]').forEach(function (a) {
    linkFor[a.getAttribute("href").slice(1)] = a;
  });

  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      Object.keys(linkFor).forEach(function (id) {
        var active = id === entry.target.id;
        linkFor[id].classList.toggle("is-active", active);
        if (active) linkFor[id].setAttribute("aria-current", "true");
        else linkFor[id].removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  document.querySelectorAll("main section[id]").forEach(function (s) { sectionObserver.observe(s); });

  /* ---------- Hero: draggable logo tiles ----------
     Drag a tile, or focus it and use the arrow keys (Shift for bigger steps).
     A tile stops at the edge of the stack and before any tile or label it would
     overlap, so nothing ends up stacked. Moves are a translate offset, so the
     bob and parallax animations keep running. Positions reset on reload and on
     resize. Runs under reduced motion too: it is the visitor's own action. */
  var floatStack = document.querySelector(".float-stack");
  if (floatStack) {
    var PAD = 10;  /* px kept clear between one tile's box and the next */
    var GAP = 10;  /* px between a tile and its label, as in the CSS */
    var KEY_STEPS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    var topZ = 2;  /* the tile you last touched sits on top of the others */
    var entries = []; /* { el, offset } for every tile */

    /* The tile and its label as one box in stack pixels, for a given offset. */
    function boxFor(entry, ox, oy) {
      var W = floatStack.clientWidth, H = floatStack.clientHeight;
      var el = entry.el, label = el.querySelector(".float-label");
      var s = el.offsetWidth;
      var half = Math.max(s / 2, label.offsetWidth / 2);
      var cx = parseFloat(el.dataset.x) / 100 * W + ox;
      var cy = parseFloat(el.dataset.y) / 100 * H + oy;
      return { x0: cx - half, x1: cx + half, y0: cy - s / 2, y1: cy + s / 2 + GAP + label.offsetHeight };
    }

    /* True when the entry at this offset is inside the stack and clear of every other tile. */
    function fits(entry, ox, oy) {
      var W = floatStack.clientWidth, H = floatStack.clientHeight;
      var b = boxFor(entry, ox, oy);
      if (b.x0 < 0 || b.y0 < 0 || b.x1 > W || b.y1 > H) return false;
      return entries.every(function (other) {
        if (other === entry) return true;
        var o = boxFor(other, other.offset.x, other.offset.y);
        return b.x1 + PAD <= o.x0 || o.x1 + PAD <= b.x0 || b.y1 + PAD <= o.y0 || o.y1 + PAD <= b.y0;
      });
    }

    /* Walk from the current offset toward the target in small steps and stop at the
       first obstacle. When a diagonal step is blocked, slide along whichever axis is free. */
    function moveTo(entry, tx, ty) {
      var cur = entry.offset, dx = tx - cur.x, dy = ty - cur.y;
      var n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2);
      var pos = { x: cur.x, y: cur.y };
      for (var i = 1; i <= n; i++) {
        var nx = cur.x + dx * i / n, ny = cur.y + dy * i / n;
        if (fits(entry, nx, ny)) pos = { x: nx, y: ny };
        else if (fits(entry, nx, pos.y)) pos = { x: nx, y: pos.y };
        else if (fits(entry, pos.x, ny)) pos = { x: pos.x, y: ny };
        else break;
      }
      entry.offset = pos;
      entry.el.style.translate = pos.x + "px " + pos.y + "px";
    }

    function resetAll() {
      entries.forEach(function (entry) {
        entry.offset = { x: 0, y: 0 };
        entry.el.style.translate = "";
      });
    }

    floatStack.querySelectorAll(".float-item").forEach(function (el) {
      var entry = { el: el, offset: { x: 0, y: 0 } };
      var drag = null;
      entries.push(entry);

      el.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: entry.offset.x, oy: entry.offset.y };
        el.setPointerCapture(e.pointerId);
        el.classList.add("is-dragging");
        el.style.zIndex = ++topZ;
        el.focus({ preventScroll: true });
        e.preventDefault();
      });
      el.addEventListener("pointermove", function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        moveTo(entry, drag.ox + e.clientX - drag.sx, drag.oy + e.clientY - drag.sy);
      });

      function endDrag(e) {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        el.classList.remove("is-dragging");
      }
      el.addEventListener("pointerup", endDrag);
      el.addEventListener("pointercancel", endDrag);

      el.addEventListener("keydown", function (e) {
        var dir = KEY_STEPS[e.key];
        if (!dir) return;
        e.preventDefault();
        var step = e.shiftKey ? 24 : 8;
        moveTo(entry, entry.offset.x + dir[0] * step, entry.offset.y + dir[1] * step);
      });
    });

    /* Offsets are in pixels, so a resize can make them overlap. Start fresh. */
    window.addEventListener("resize", resetAll);
  }

  /* ---------- Skills: each skill is a button; selecting one shows where it was used ----------
     The text for each skill lives in SKILL_DETAILS below. Click a selected skill again to clear it. */
  var SKILL_DETAILS = {
    "go": "Primary language. I built six Go microservices at COS Great Trading: KYC verification, leads, case management, gamification, questionnaire forms and centralised logging.",
    "typescript": "Frontend features in React 19 and TypeScript at COS Great Trading.",
    "javascript": "Listed under backend skills in my resume.",
    "apache-kafka": "Built the real-time Kafka consumer for the financial reporting pipeline, and Kafka event propagation across services at COS Great Trading.",
    "mongodb": "Primary database for Renotech.",
    "apache-doris": "Part of my day-to-day data stack at COS Great Trading, alongside Kafka, MongoDB and QuestDB.",
    "questdb": "Part of my day-to-day data stack at COS Great Trading, alongside Kafka, MongoDB and Apache Doris.",
    "react-19": "Built frontend features in React 19 at COS Great Trading.",
    "nextjs": "Built Renotech with Next.js (App Router).",
    "tailwind-css": "Listed in my frontend skills, alongside shadcn/ui and Ant Design.",
    "ant-design": "Listed in my frontend skills, alongside Tailwind CSS and shadcn/ui.",
    "ubuntu-linux": "Linux (Ubuntu) is part of my infrastructure toolkit.",
    "nginx": "Listed under infrastructure, alongside Cloudflare and Linux.",
    "cloudflare": "Configured Cloudflare DNS and R2 object storage for Renotech, and use Cloudflare Tunnel.",
    "vercel": "Renotech is deployed on Vercel.",
    "git": "Used for version control across my projects.",
    "bitbucket": "Listed under tools, next to Git.",
    "postman": "Kept Postman collections as the API contract for frontend developers at COS Great Trading.",
    "slack": "Listed under tools for team communication."
  };
  var DEFAULT_SKILL_TEXT = "Select a skill to see where I've used it.";
  var skillButtons = document.querySelectorAll("button.tech[data-skill]");
  var skillTitle = document.getElementById("skill-detail-title");
  var skillText = document.getElementById("skill-detail-text");

  function selectSkill(button) {
    var wasSelected = button.getAttribute("aria-pressed") === "true";
    skillButtons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    if (wasSelected) {
      skillTitle.textContent = "";
      skillText.textContent = DEFAULT_SKILL_TEXT;
      return;
    }
    button.setAttribute("aria-pressed", "true");
    skillTitle.textContent = button.dataset.name;
    skillText.textContent = SKILL_DETAILS[button.dataset.skill] || DEFAULT_SKILL_TEXT;
  }
  skillButtons.forEach(function (button) {
    button.addEventListener("click", function () { selectSkill(button); });
  });

  /* ---------- Back to top: shown once the hero has scrolled out of view ---------- */
  var toTop = document.getElementById("to-top");
  var hero = document.getElementById("hero");
  if (toTop && hero) {
    new IntersectionObserver(function (entries) {
      toTop.classList.toggle("is-visible", !entries[0].isIntersecting);
    }).observe(hero);

    toTop.addEventListener("click", function () {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  /* ---------- About: stats count up when they come into view ---------- */
  var countObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      countObserver.unobserve(entry.target);
      var dt = entry.target;
      var m = dt.textContent.match(/^(\d+)(.*)$/);
      if (!m) return;
      var target = parseInt(m[1], 10), suffix = m[2], t0 = null, dur = 1100;
      function tick(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        dt.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      dt.textContent = "0" + suffix;
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll(".facts dt").forEach(function (dt) { countObserver.observe(dt); });
})();
