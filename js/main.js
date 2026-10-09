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
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0e1420" : "#f3f6f9");
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

  /* ---------- Nav background once the page scrolls past the top ---------- */
  var sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none;";
  document.body.prepend(sentinel);

  new IntersectionObserver(function (entries) {
    nav.classList.toggle("is-scrolled", !entries[0].isIntersecting);
  }).observe(sentinel);

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
     Drag a tile within the stack, or focus it and use the arrow keys (Shift for bigger steps).
     Moves are a translate offset, so the bob and parallax animations keep running.
     Positions reset on reload. Runs under reduced motion too: it is the visitor's own action. */
  var floatStack = document.querySelector(".float-stack");
  if (floatStack) {
    var LABEL_ROOM = 40; /* px kept clear under a tile for its name */
    var KEY_STEPS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    var topZ = 2; /* the tile you last touched sits on top of the others */

    floatStack.querySelectorAll(".float-item").forEach(function (item) {
      var offset = { x: 0, y: 0 };
      var drag = null;

      /* Keep the tile inside the stack box, label included. */
      function clamp(x, y) {
        var W = floatStack.clientWidth, H = floatStack.clientHeight;
        var half = item.offsetWidth / 2;
        var baseX = parseFloat(item.dataset.x) / 100 * W;
        var baseY = parseFloat(item.dataset.y) / 100 * H;
        return {
          x: Math.min(Math.max(x, half - baseX), W - half - baseX),
          y: Math.min(Math.max(y, half - baseY), H - half - LABEL_ROOM - baseY)
        };
      }

      function move(x, y) {
        offset = clamp(x, y);
        item.style.translate = offset.x + "px " + offset.y + "px";
      }

      item.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
        item.setPointerCapture(e.pointerId);
        item.classList.add("is-dragging");
        item.style.zIndex = ++topZ;
        item.focus({ preventScroll: true });
        e.preventDefault();
      });
      item.addEventListener("pointermove", function (e) {
        if (!drag || e.pointerId !== drag.id) return;
        move(drag.ox + e.clientX - drag.sx, drag.oy + e.clientY - drag.sy);
      });

      function endDrag(e) {
        if (!drag || e.pointerId !== drag.id) return;
        drag = null;
        item.classList.remove("is-dragging");
      }
      item.addEventListener("pointerup", endDrag);
      item.addEventListener("pointercancel", endDrag);

      item.addEventListener("keydown", function (e) {
        var dir = KEY_STEPS[e.key];
        if (!dir) return;
        e.preventDefault();
        var step = e.shiftKey ? 24 : 8;
        move(offset.x + dir[0] * step, offset.y + dir[1] * step);
      });
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
