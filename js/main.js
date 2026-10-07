(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

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
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0a0f1a" : "#f6f8fb");
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

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }

  /* ---------- Nav background once the hero top leaves the viewport ---------- */
  var sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:24px;pointer-events:none;";
  document.body.prepend(sentinel);

  new IntersectionObserver(function (entries) {
    nav.classList.toggle("is-scrolled", !entries[0].isIntersecting);
  }).observe(sentinel);

  /* ---------- Reveal on scroll, staggered within each section ---------- */
  document.querySelectorAll("section").forEach(function (section) {
    section.querySelectorAll(".reveal").forEach(function (el, i) {
      el.style.setProperty("--i", Math.min(i, 6));
    });
  });

  var revealFired = false;
  var revealObserver = new IntersectionObserver(function (entries) {
    revealFired = true;
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach(function (el) { revealObserver.observe(el); });

  // Safety net: never leave content hidden if the observer doesn't report.
  setTimeout(function () {
    if (!revealFired) document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }, 2500);

  /* ---------- Highlight the nav link of the section in view ---------- */
  var linkFor = {};
  navLinks.querySelectorAll('a[href^="#"]').forEach(function (a) {
    linkFor[a.getAttribute("href").slice(1)] = a;
  });

  var sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      Object.keys(linkFor).forEach(function (id) {
        linkFor[id].classList.toggle("is-active", id === entry.target.id);
        if (id === entry.target.id) linkFor[id].setAttribute("aria-current", "true");
        else linkFor[id].removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  document.querySelectorAll("main section[id]").forEach(function (s) { sectionObserver.observe(s); });
})();

/* ---------- Small helpers that don't depend on IntersectionObserver ---------- */
(function () {
  "use strict";

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);
  var toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-visible"); }, 2200);
  }

  // Placeholder buttons: swap the href for a real link when a write-up exists.
  document.querySelectorAll(".js-placeholder").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      showToast(link.dataset.msg || "Coming soon");
    });
  });

  var copyBtn = document.getElementById("copy-email");
  var copyStatus = document.getElementById("copy-status");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.dataset.email;
      var done = function () {
        copyStatus.textContent = "Copied to clipboard";
        copyBtn.innerHTML = '<i class="ph ph-check" aria-hidden="true"></i>';
        setTimeout(function () {
          copyStatus.textContent = "";
          copyBtn.innerHTML = '<i class="ph ph-copy" aria-hidden="true"></i>';
        }, 2000);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(done, function () { window.location.href = "mailto:" + email; });
      } else {
        window.location.href = "mailto:" + email;
      }
    });
  }
})();
