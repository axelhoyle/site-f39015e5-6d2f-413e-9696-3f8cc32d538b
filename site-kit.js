/*
 * AIOS site-kit — see site-kit.css for what this pairs with. Loaded as-is
 * on every generated site; never written or modified by the model. Fully
 * self-contained, degrades safely (skips straight to the end state) when
 * IntersectionObserver is unavailable or the visitor has requested reduced
 * motion.
 */
(function () {
  "use strict";

  var STAR_PATH = "M12 2.4l2.79 6.24 6.8.62-5.16 4.55 1.54 6.67L12 16.98l-6 3.5 1.54-6.67-5.16-4.55 6.8-.62L12 2.4z";

  function renderStars() {
    document.querySelectorAll(".stars[data-rating]").forEach(function (el) {
      var r = parseFloat(el.getAttribute("data-rating")) || 0;
      for (var i = 0; i < 5; i++) {
        var pct = Math.max(0, Math.min(1, r - i)) * 100;
        var s = document.createElement("span");
        s.style.cssText = "position:relative;display:inline-block;width:1.1em;height:1.1em";
        if (pct >= 99.5) {
          s.innerHTML = '<svg class="star-fill" viewBox="0 0 24 24" style="position:absolute;inset:0;width:100%;height:100%"><path d="' + STAR_PATH + '"/></svg>';
        } else if (pct <= 0.5) {
          s.innerHTML = '<svg class="star-empty" viewBox="0 0 24 24" style="position:absolute;inset:0;width:100%;height:100%"><path d="' + STAR_PATH + '"/></svg>';
        } else {
          // The fill layer MUST have its own position:absolute box (not an
          // inline/static span) — clip-path clips against the element's
          // OWN rendered box, and a span with no in-flow content otherwise
          // collapses to 0x0, clipping the whole star away instead of just
          // trimming it. Found and fixed 2026-08-26.
          s.innerHTML =
            '<svg class="star-empty" viewBox="0 0 24 24" style="position:absolute;inset:0;width:100%;height:100%"><path d="' + STAR_PATH + '"/></svg>' +
            '<span style="position:absolute;inset:0;overflow:hidden;clip-path:inset(0 ' + (100 - pct) + '% 0 0)"><svg class="star-fill" viewBox="0 0 24 24" style="position:absolute;inset:0;width:100%;height:100%"><path d="' + STAR_PATH + '"/></svg></span>';
        }
        el.appendChild(s);
      }
    });
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count-to"));
    var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / 1000);
      el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function wireCountUp() {
    var els = document.querySelectorAll("[data-count-to]");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.textContent = el.getAttribute("data-count-to"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  function wireReveal() {
    var els = document.querySelectorAll(".reveal");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { io.observe(el); });
  }

  function wireNameWrite() {
    var pin = document.querySelector(".name-pin");
    if (!pin) return;
    // Text mode (.name-write) and image/logo mode (.name-write-img .color)
    // are mutually exclusive — a page uses one or the other. See
    // websiteAgent.ts's siteKitBlock() for when each applies.
    var text = document.querySelector(".name-write");
    var img = document.querySelector(".name-write-img .color");
    var target = text || img;
    if (!target) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (text) text.style.setProperty("--fill", "100%");
      else img.style.clipPath = "inset(0 0% 0 0)";
      return;
    }
    // Purely scroll-position-driven (not time-based) so it's scrubbable —
    // scroll back up and it un-writes itself — and stays perfectly in sync
    // with .name-pin's own CSS height (100svh + 480px): once scrollY
    // passes 480, the fill is done AND the sticky pin releases at the same
    // instant, so scrolling never continues into the next section before
    // the name has finished writing in.
    //
    // Eased (cubic ease-out), not linear: a linear mapping makes the very
    // first bit of scrolling produce a fill percentage too small to be
    // visibly different from 0%, which reads as a dead zone before
    // anything happens. Front-loading the curve means color shows up on
    // the very first scroll tick instead of after ~10% of the budget.
    window.addEventListener(
      "scroll",
      function () {
        var linear = Math.min(1, window.scrollY / 480);
        var eased = 1 - Math.pow(1 - linear, 3);
        if (text) {
          text.style.setProperty("--fill", eased * 100 + "%");
        } else {
          img.style.clipPath = "inset(0 " + (100 - eased * 100) + "% 0 0)";
        }
      },
      { passive: true }
    );
  }

  // Booking calendar + third-party widget handoff mockup. Each
  // `.booking-day` block carries a `data-day-label` (e.g. "Tisdag 26/8")
  // and contains `.slot-btn` buttons for that day; clicking an enabled one
  // opens the single shared #bdBackdrop modal (see site-kit.css) with that
  // day+time filled in. Purely illustrative — no request is ever sent
  // anywhere, nothing persists past a reload.
  function wireBooking() {
    var backdrop = document.getElementById("bdBackdrop");
    if (!backdrop) return;
    var slotLine = document.getElementById("bdSlotLine");
    var nameInput = document.getElementById("bdName");
    var phoneInput = document.getElementById("bdPhone");
    var closeBtn = document.getElementById("bdClose");
    var confirmBtn = document.getElementById("bdConfirm");
    var successLine = document.getElementById("bdSuccessLine");
    var selectedBtn = null;
    var selectedLabel = null;

    function open(label) {
      backdrop.classList.remove("is-done");
      if (slotLine) slotLine.textContent = label;
      if (nameInput) nameInput.value = "";
      if (phoneInput) phoneInput.value = "";
      backdrop.classList.add("is-open");
    }
    function close() {
      backdrop.classList.remove("is-open");
      if (selectedBtn) { selectedBtn.classList.remove("is-selected"); selectedBtn = null; }
    }

    document.querySelectorAll(".booking-day").forEach(function (day) {
      var dayLabel = day.getAttribute("data-day-label") || "";
      day.querySelectorAll(".slot-btn:not(:disabled)").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (selectedBtn) selectedBtn.classList.remove("is-selected");
          btn.classList.add("is-selected");
          selectedBtn = btn;
          selectedLabel = (dayLabel + " kl. " + btn.textContent).trim();
          open(selectedLabel);
        });
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && backdrop.classList.contains("is-open")) close();
    });
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        if (successLine) successLine.textContent = "Bokat: " + selectedLabel;
        backdrop.classList.add("is-done");
      });
    }
  }

  // Toggles .is-scrolled on the page's own `.site-header` once the visitor
  // has scrolled past a small threshold — this is what lets the header be
  // `position: fixed` + transparent at the very top (required for
  // .name-pin, see site-kit.css) while still becoming a solid, readable
  // bar once real content has scrolled underneath it. No-ops if the page
  // has no `.site-header`.
  function wireHeaderScrollState() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function init() {
    renderStars();
    wireCountUp();
    wireReveal();
    wireNameWrite();
    wireBooking();
    wireHeaderScrollState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
