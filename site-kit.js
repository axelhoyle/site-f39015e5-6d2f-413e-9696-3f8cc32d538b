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

  // Real bug found 2026-09-16: unlike wireReveal() right below, this never
  // checked prefers-reduced-motion — only whether IntersectionObserver
  // exists at all (true in every real browser), so the count-up animation
  // ran unconditionally for every visitor, accessibility preference or
  // not. Found because it made a screenshot taken with reduced-motion
  // forced show a nonsense mid-animation number instead of the real value.
  function wireCountUp() {
    var els = document.querySelectorAll("[data-count-to]");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach(function (el) {
        var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
        el.textContent = parseFloat(el.getAttribute("data-count-to")).toFixed(dec);
      });
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

  /**
   * Flow lines — the site's ambient "something is alive here" element,
   * added 2026-09-16 to replace the old blurred-gradient hero background
   * (explicitly rejected as "mossy colors blending together" — see the
   * luxury-clean/sharp-edges design bar). Deliberately built as a
   * site-kit component, NOT hand-authored SVG paths in the model's own
   * output: a fixed, once-debugged path generator + parallax mechanic
   * that every site shares, with the actual SHAPE/COLOR/SPEED seeded per
   * company (from data-seed, typically the company id) so sites never
   * look identical to each other despite sharing the same underlying
   * code — same "shared mechanism, per-company variation" pattern as
   * websiteAgent.ts's accentHueNudge. Zero extra model/API cost: this is
   * a static asset shipped with every site, same as the fonts.
   *
   * Markup contract: an empty `<svg class="flow-lines" data-seed="...">`
   * placed INSIDE `.hero`/`.name-pin-inner` (not elsewhere on the page —
   * see websiteAgent.ts's siteKitBlock) — this function populates it
   * entirely; nothing else should touch it. Scoped to the hero on purpose
   * (2026-09-16): a full-page version used to sit behind every section's
   * body text and read as noise competing with copy that needs reading;
   * keeping it to the one deliberate hero moment (alongside the
   * name-write scroll-pin) both fixes that and concentrates the "alive"
   * feeling where the page already draws the eye.
   */
  function seededRandom(seedStr) {
    var h = 0;
    for (var i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    return function () {
      h = (h * 1664525 + 1013904223) >>> 0;
      return h / 4294967296;
    };
  }

  // Parses #rgb/#rrggbb (the only forms this codebase's palettes ever use)
  // and rotates hue by ~50° for a complementary-but-related second color —
  // only used when the model's own CSS never declared --accent-2 at all
  // (a real second verified brand color, when one exists, always wins;
  // see websiteAgent.ts's accentTwoBlock).
  function complementaryColor(hex, hueShiftDeg) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
    if (!m) return null;
    var h6 = m[1].length === 3 ? m[1].split("").map(function (c) { return c + c; }).join("") : m[1];
    var r = parseInt(h6.slice(0, 2), 16) / 255, g = parseInt(h6.slice(2, 4), 16) / 255, b = parseInt(h6.slice(4, 6), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min, hue = 0, s = 0;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) hue = ((g - b) / d) % 6;
      else if (max === g) hue = (b - r) / d + 2;
      else hue = (r - g) / d + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
    }
    hue = (hue + hueShiftDeg) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), m2 = l - c / 2, rr, gg, bb;
    if (hue < 60) { rr = c; gg = x; bb = 0; } else if (hue < 120) { rr = x; gg = c; bb = 0; }
    else if (hue < 180) { rr = 0; gg = c; bb = x; } else if (hue < 240) { rr = 0; gg = x; bb = c; }
    else if (hue < 300) { rr = x; gg = 0; bb = c; } else { rr = c; gg = 0; bb = x; }
    var toHex = function (v) { return Math.round((v + m2) * 255).toString(16).padStart(2, "0"); };
    return "#" + toHex(rr) + toHex(gg) + toHex(bb);
  }

  // Catmull-Rom -> cubic Bezier: the ONLY way to thread a smooth curve
  // through a list of points with continuous tangents at every joint. The
  // previous version used one Q (quadratic) segment per point-pair with
  // the control point pinned to the PREVIOUS point's y — that has no
  // continuity across joints at all, which is exactly what read as
  // "buggy"/kinked corners instead of one soft, calm flowing line. This
  // is what real "flowing" curves need — never go back to a naive
  // point-to-point Q/L chain for this.
  function smoothPathFromPoints(points) {
    if (points.length < 2) return "";
    var d = "M" + points[0][0].toFixed(1) + "," + points[0][1].toFixed(1);
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i - 1] || points[i];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += " C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " + c2x.toFixed(1) + "," + c2y.toFixed(1) + " " + p2[0].toFixed(1) + "," + p2[1].toFixed(1);
    }
    return d;
  }

  // A small family of restrained motifs, not just one sine-ish wave — the
  // seed picks between them so the pipeline keeps producing genuinely
  // different compositions within the same calm, structured "flow lines"
  // category rather than the same shape with different numbers plugged
  // in. Every motif still resolves to a plain point list handed to
  // smoothPathFromPoints() above, so they're all equally smooth.
  var FLOW_MOTIFS = [
    // Gentle rolling wave — gradual, few undulations, generous spacing.
    function wave(rand, baseY, amp) {
      var pts = [], x = -150;
      while (x < 1430) {
        pts.push([x, baseY + (rand() - 0.5) * amp]);
        x += 340 + rand() * 200;
      }
      return pts;
    },
    // One long, single bow across the whole width — the calmest motif,
    // just three points, curves through a single gentle apex.
    function arc(rand, baseY, amp) {
      var dir = rand() < 0.5 ? 1 : -1;
      return [
        [-150, baseY + amp * 0.4 * dir],
        [300, baseY - amp * 0.5 * dir],
        [640, baseY],
        [980, baseY + amp * 0.5 * dir],
        [1430, baseY - amp * 0.4 * dir],
      ];
    },
    // Barely-there diagonal drift with one soft bulge — the most minimal
    // motif, reads almost as a straight line at a gentle angle.
    function drift(rand, baseY, amp) {
      var tilt = (rand() - 0.5) * 90;
      return [
        [-150, baseY - tilt],
        [500, baseY - tilt * 0.3 + (rand() - 0.5) * amp * 0.6],
        [1430, baseY + tilt],
      ];
    },
  ];

  function buildFlowLine(rand, baseY, amp) {
    var motif = FLOW_MOTIFS[Math.floor(rand() * FLOW_MOTIFS.length)];
    return smoothPathFromPoints(motif(rand, baseY, amp));
  }

  function wireFlowLines() {
    var svg = document.querySelector(".flow-lines");
    if (!svg) return;
    // The model's markup is deliberately just the bare empty tag (see
    // websiteAgent.ts's siteKitBlock) — this owns the coordinate space
    // buildWavePath()'s numbers (x from -100..1400, y from 0..800) assume.
    svg.setAttribute("viewBox", "0 0 1280 800");
    svg.setAttribute("preserveAspectRatio", "none");
    var rand = seededRandom(svg.getAttribute("data-seed") || document.title || "aios");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --accent-2 fallback: only computed/applied when the model's own CSS
    // never set it (a real second verified brand color always takes
    // priority — see the comment above complementaryColor()).
    var rootStyle = getComputedStyle(document.documentElement);
    if (!rootStyle.getPropertyValue("--accent-2").trim()) {
      var accentHex = rootStyle.getPropertyValue("--accent").trim();
      var computed = complementaryColor(accentHex, 130 + rand() * 40);
      if (computed) document.documentElement.style.setProperty("--accent-2", computed);
    }

    var lineCount = 2 + Math.round(rand()); // 2 or 3
    var palette = ["var(--accent)", "var(--accent-2)", "var(--ink)"];
    var baseOpacity = [0.55, 0.5, 0.12];
    var svgNS = "http://www.w3.org/2000/svg";
    // sway: a bounded, per-line { amplitude, wavelength, phase } — NOT a
    // rate multiplied by raw scrollY. A flat rate*scrollY accumulates
    // forever on a long page (found 2026-09-16: lines visibly drifted
    // further and further from their drawn position, looking "off" the
    // longer you scrolled). Feeding scrollY through sin() instead keeps
    // every line oscillating within +/-amplitude px, forever, no matter
    // how far down the page you go — a calm continuous sway driven BY
    // scrolling, never a cumulative drift.
    var sway = [];
    for (var i = 0; i < lineCount; i++) {
      var baseY = 120 + (i * 680) / Math.max(1, lineCount - 1) + (rand() - 0.5) * 120;
      var amp = 60 + rand() * 90;
      var path = document.createElementNS(svgNS, "path");
      path.setAttribute("class", "flow-line");
      path.setAttribute("d", buildFlowLine(rand, baseY, amp));
      path.style.stroke = palette[i % palette.length];
      path.style.opacity = String(baseOpacity[i % baseOpacity.length] * (0.85 + rand() * 0.3));
      path.style.strokeWidth = (2 + rand() * 1.2).toFixed(1);
      svg.appendChild(path);
      sway.push({
        amplitude: 8 + rand() * 10, // px — small and cozy, never a big shift
        wavelength: 900 + rand() * 700, // px of scroll per full back-and-forth cycle
        phase: rand() * Math.PI * 2,
      });
    }

    if (reduceMotion) return; // static lines only, no scroll/mouse-driven transforms
    var lines = svg.querySelectorAll(".flow-line");
    var ticking = false;
    function update() {
      var y = window.scrollY || 0;
      lines.forEach(function (el, i) {
        var s = sway[i];
        var offset = Math.sin((y / s.wavelength) * Math.PI * 2 + s.phase) * s.amplitude;
        el.style.transform = "translateY(" + offset.toFixed(1) + "px)";
      });
      ticking = false;
    }
    update(); // paint the resting sway position immediately, don't wait for the first scroll event
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    document.addEventListener("mousemove", function (e) {
      var relX = (e.clientX / window.innerWidth - 0.5) * 10;
      lines.forEach(function (el, i) { el.style.marginLeft = (relX * (i % 2 === 0 ? 1 : -1)) + "px"; });
    });
  }

  /**
   * Signature mark — a small decorative squiggle for OTHER sections (first
   * use: under the star rating in social proof) that deliberately reuses
   * flow-lines' own smoothPathFromPoints() + a seed DERIVED FROM THE SAME
   * company seed (just a different suffix) rather than an independent
   * random source. That's the whole mechanism for "different sections
   * feel like they belong together without an AI judgment call": every
   * section pulls its shape/color from the same per-company seed family,
   * so they're never actually independent — same idea the user and Edwin
   * described (a library of per-section 'wow' moments that get puzzled
   * together to fit each other), done by shared seeding + a shared visual
   * vocabulary (thin crisp accent-colored lines) rather than by asking a
   * model to judge which combination matches.
   */
  function paintSignatureMark(svg, seedSuffix) {
    svg.setAttribute("viewBox", "0 0 200 30");
    svg.setAttribute("preserveAspectRatio", "none");
    var rand = seededRandom((svg.getAttribute("data-seed") || document.title || "aios") + seedSuffix);
    var pts = [
      [-10, 15 + (rand() - 0.5) * 4],
      [65, 15 + (rand() - 0.5) * 16],
      [135, 15 + (rand() - 0.5) * 16],
      [210, 15 + (rand() - 0.5) * 4],
    ];
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "flow-line");
    path.setAttribute("d", smoothPathFromPoints(pts));
    path.style.stroke = "var(--accent)";
    path.style.opacity = "0.65";
    path.style.strokeWidth = "2.5";
    svg.appendChild(path);
  }

  // The seed every auto-injected mark below shares (so they read as the
  // same signature as the hero's flow-lines) — reads the SAME data-seed
  // the model already put on .flow-lines rather than needing its own.
  function pageSeed() {
    var flow = document.querySelector(".flow-lines[data-seed]");
    return (flow && flow.getAttribute("data-seed")) || document.title || "aios";
  }

  function makeSignatureMarkSvg(seedSuffix) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "signature-mark");
    svg.setAttribute("data-seed", pageSeed());
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    paintSignatureMark(svg, seedSuffix);
    return svg;
  }

  /**
   * Auto-injected signature marks (2026-09-17) — no markup change needed
   * anywhere, in the model's prompt OR on any already-generated site: this
   * runs on every page load and adds the same small squiggle used under
   * the star rating to two more "peak" moments, entirely from site-kit.js
   * itself. Applies retroactively to every existing site the instant this
   * file is redeployed — no rebuild, no AI edit, no per-company patch.
   *
   * 1. Under the booking confirmation checkmark (.bd-success) — the LAST
   *    thing a visitor who just booked sees. Peak-end rule: the ending of
   *    an experience weighs as heavily in memory as its peak (the hero),
   *    so a fully static checkmark there was leaving that moment
   *    unfinished relative to the rest of the site.
   * 2. Under each price-list category heading (.menu-group h3) — extends
   *    the same signature family further down the page instead of it only
   *    appearing near reviews, same "shared seed = feels like one system"
   *    mechanism as everywhere else this exists.
   */
  function wireSignatureMark() {
    document.querySelectorAll(".signature-mark").forEach(function (svg) {
      paintSignatureMark(svg, "-mark");
    });

    document.querySelectorAll(".bd-success").forEach(function (host, i) {
      if (host.querySelector(".signature-mark")) return;
      var check = host.querySelector(".check");
      var mark = makeSignatureMarkSvg("-confirm-" + i);
      mark.style.margin = "0 auto 0.6rem";
      if (check && check.parentNode) check.insertAdjacentElement("afterend", mark);
      else host.insertBefore(mark, host.firstChild);
    });

    document.querySelectorAll(".menu-group h3").forEach(function (h3, i) {
      var group = h3.closest(".menu-group") || h3.parentNode;
      if (group.querySelector(".signature-mark")) return;
      var mark = makeSignatureMarkSvg("-menu-" + i);
      h3.insertAdjacentElement("afterend", mark);
    });
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
    // A page using a REAL booking flow (the legacy always-visible
    // #bookingCal, or the newer per-service #bookingWidget — see below) owns
    // the SAME #bdBackdrop modal for real — this mockup wiring must not
    // also attach to it, or a click on "Bekräfta bokning" would both
    // actually POST the booking AND get its success text overwritten by
    // this function's fake confirm handler.
    if (!backdrop || document.getElementById("bookingCal") || document.getElementById("bookingWidget")) return;
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

  // ============================================================
  // Shared date/week helpers used by BOTH booking UIs below (the legacy
  // always-visible calendar and the newer per-service popup) — kept in one
  // place so a fix to "how a week range is computed" can't accidentally
  // apply to one and not the other.
  // ============================================================
  var WEEKDAY_SHORT = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
  var MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

  function startOfWeek(offset) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    var day = d.getDay();
    var mondayDiff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + mondayDiff + offset * 7);
    return d;
  }

  function fmtRange(monday) {
    var sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    if (monday.getMonth() === sunday.getMonth()) {
      return monday.getDate() + "–" + sunday.getDate() + " " + MONTHS_SHORT[monday.getMonth()];
    }
    return monday.getDate() + " " + MONTHS_SHORT[monday.getMonth()] + " – " + sunday.getDate() + " " + MONTHS_SHORT[sunday.getMonth()];
  }

  /**
   * Renders 7 day-columns of slot buttons into `grid`, given a `perDay`
   * map ({dateStr: [times]}, already duration-aware from the availability
   * API — see config/availability.ts's computeAvailableSlots). `onPick(dateStr,
   * time, btn)` fires when an enabled slot is clicked. Shared by the legacy
   * calendar and the popup so a fix to how "today"/"fullbokat"/disabled
   * slots render only has to happen in one place.
   */
  function renderAvailabilityGrid(grid, days, perDay, onPick) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var totalOpenSlots = 0;

    grid.innerHTML = "";
    days.forEach(function (d) {
      var dateStr = isoDate(d);
      var col = document.createElement("div");
      col.className = "booking-cal-day" + (dateStr === isoDate(today) ? " is-today" : "");

      var head = document.createElement("div");
      head.className = "booking-cal-day-head";
      head.innerHTML = "<span class=\"wd\">" + WEEKDAY_SHORT[d.getDay()] + "</span><span class=\"dt\">" + d.getDate() + "</span>";
      col.appendChild(head);

      var slotsWrap = document.createElement("div");
      slotsWrap.className = "booking-cal-slots";
      var slots = perDay[dateStr] || [];
      var isPast = d < today;

      if (slots.length === 0) {
        var full = document.createElement("span");
        full.className = "booking-cal-closed";
        full.textContent = "Fullbokat";
        slotsWrap.appendChild(full);
      } else {
        slots.forEach(function (time) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "slot-btn";
          btn.textContent = time;
          if (isPast) {
            btn.disabled = true;
          } else {
            totalOpenSlots++;
            btn.addEventListener("click", function () { onPick(dateStr, time, btn); });
          }
          slotsWrap.appendChild(btn);
        });
      }
      col.appendChild(slotsWrap);
      grid.appendChild(col);
    });
    return totalOpenSlots;
  }

  /**
   * The single shared #bdBackdrop confirmation modal (name/phone + submit)
   * — used by whichever booking UI is present on the page. Created once in
   * init() and handed to both, so there is exactly one click handler on
   * #bdConfirm ever, regardless of which booking UI(s) exist on a given
   * page. Returns null if the page has no #bdBackdrop at all.
   */
  function createConfirmModal(apiBase, companyId) {
    var backdrop = document.getElementById("bdBackdrop");
    if (!backdrop) return null;
    var slotLine = document.getElementById("bdSlotLine");
    var nameInput = document.getElementById("bdName");
    var phoneInput = document.getElementById("bdPhone");
    var closeBtn = document.getElementById("bdClose");
    var confirmBtn = document.getElementById("bdConfirm");
    var successLine = document.getElementById("bdSuccessLine");
    var pending = null; // { label, dateStr, timeLabel, staffId, serviceIds, serviceLabel, durationMinutes, btn, onDone }

    function isOpen() { return backdrop.classList.contains("is-open"); }

    function open(details) {
      pending = details;
      backdrop.classList.remove("is-done");
      if (slotLine) slotLine.textContent = details.label;
      if (nameInput) nameInput.value = "";
      if (phoneInput) phoneInput.value = "";
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = "Bekräfta bokning"; }
      backdrop.classList.add("is-open");
    }
    function close() { backdrop.classList.remove("is-open"); }

    if (closeBtn) closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen()) close(); });

    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        if (!pending) return;
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Bokar…";
        fetch(apiBase + "/bookings/" + companyId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingDate: pending.dateStr,
            timeLabel: pending.timeLabel,
            staffId: pending.staffId || undefined,
            serviceIds: pending.serviceIds && pending.serviceIds.length ? pending.serviceIds : undefined,
            serviceLabel: pending.serviceLabel || undefined,
            durationMinutes: pending.durationMinutes || undefined,
            customerName: nameInput ? nameInput.value : "",
            customerPhone: phoneInput ? phoneInput.value : "",
          }),
        })
          .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
          .then(function (res) {
            backdrop.classList.add("is-done");
            if (res.ok) {
              if (successLine) successLine.textContent = "Bokat: " + pending.label;
              if (pending.btn) pending.btn.disabled = true;
            } else {
              if (successLine) successLine.textContent = res.body.error || "Kunde inte boka den tiden.";
            }
            if (pending.onDone) pending.onDone(res.ok);
          })
          .catch(function () {
            backdrop.classList.remove("is-open");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Bekräfta bokning";
            if (successLine) successLine.textContent = "Kunde inte nå bokningssystemet just nu.";
          });
      });
    }

    return { open: open, isOpen: isOpen };
  }

  // ============================================================
  // Rolling booking calendar (2026-09-09) — replaces the old per-site
  // hardcoded BOOKING_DAYS approach (specific dates written once by the
  // model at generation time, which silently go stale and once caused a
  // real weekday-mislabeling bug). This version is driven by a RECURRING
  // WEEKLY schedule (which weekdays/hours the business is open — real,
  // verified data, never fabricated) and computes actual calendar dates
  // itself, every time the page loads — so it never goes out of date, and
  // "next/previous week" is just a small offset, not new fictional data.
  //
  // LEGACY as of 2026-09-10 — a newly generated site uses the per-service
  // #bookingWidget below instead (opened from a "Boka" button on each price-
  // list item, not an always-visible week grid). This function is kept
  // only so an already-generated site with the old always-visible
  // #bookingCal markup keeps working unmodified until it's regenerated.
  //
  // Expected markup (see websiteAgent.ts's siteKitBlock()):
  //   <section id="bookingCal" data-company-id="..." data-api-base="...">
  //     <script type="application/json" id="bookingSchedule">
  //       {"slotMinutes":30,"weekly":{"1":{"open":"10:00","close":"18:00"},...,"0":null}}
  //     </script>
  //     <div class="booking-cal-head">
  //       <button class="booking-cal-nav" data-dir="-1">‹</button>
  //       <span class="booking-cal-range" id="bookingCalRange"></span>
  //       <button class="booking-cal-nav" data-dir="1">›</button>
  //     </div>
  //     <div class="booking-cal-grid" id="bookingCalGrid"></div>
  //   </section>
  //   ...plus the same #bdBackdrop confirmation modal (bdSlotLine/bdName/
  //   bdPhone/bdConfirm/bdClose/bdSuccessLine).
  //
  // `weekly` keys are JS's own getDay() convention: 0=Sön ... 6=Lör, value
  // either null (closed) or {open,close} in "HH:MM".
  function wireBookingCalendar(confirmModal) {
    var root = document.getElementById("bookingCal");
    if (!root || !confirmModal) return;
    var scheduleEl = document.getElementById("bookingSchedule");
    if (!scheduleEl) return;

    var schedule;
    try { schedule = JSON.parse(scheduleEl.textContent); } catch (e) { return; }
    var companyId = root.getAttribute("data-company-id");
    var apiBase = root.getAttribute("data-api-base") || "";
    var slotMinutes = schedule.slotMinutes || 30;
    var weekly = schedule.weekly || {};

    var grid = document.getElementById("bookingCalGrid");
    var rangeLabel = document.getElementById("bookingCalRange");
    var navBtns = root.querySelectorAll(".booking-cal-nav");
    var weekOffset = 0;

    // Staff/service pickers — OPTIONAL markup. A page built before multi-
    // staff/duration-aware scheduling existed (or one that only ever needs
    // a single default resource) simply won't have these elements, and
    // everything below falls back to the original fixed-slotMinutes grid
    // exactly as before.
    var serviceSelect = document.getElementById("bookingServiceSelect");
    var staffSelect = document.getElementById("bookingStaffSelect");
    var nextAvailEl = document.getElementById("bookingCalNextAvail");
    var services = [];
    var selectedStaffId = null;

    function selectedDurationMinutes() {
      if (!serviceSelect || !serviceSelect.value) return slotMinutes;
      var svc = services.filter(function (s) { return s.id === serviceSelect.value; })[0];
      return svc ? svc.duration_minutes : slotMinutes;
    }
    function selectedServiceIds() {
      return serviceSelect && serviceSelect.value ? [serviceSelect.value] : [];
    }

    function loadStaffAndServices() {
      var tasks = [];
      if (staffSelect) {
        tasks.push(
          fetch(apiBase + "/bookings/" + companyId + "/staff")
            .then(function (r) { return r.json(); })
            .then(function (rows) {
              staffSelect.innerHTML = "";
              (rows || []).forEach(function (s) {
                var opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = s.name + (s.title ? " — " + s.title : "");
                staffSelect.appendChild(opt);
              });
              selectedStaffId = rows && rows[0] ? rows[0].id : null;
              staffSelect.style.display = rows && rows.length > 1 ? "" : "none";
              staffSelect.addEventListener("change", function () { selectedStaffId = staffSelect.value; render(); });
            })
            .catch(function () {})
        );
      }
      if (serviceSelect) {
        tasks.push(
          fetch(apiBase + "/bookings/" + companyId + "/services")
            .then(function (r) { return r.json(); })
            .then(function (rows) {
              services = rows || [];
              serviceSelect.innerHTML = "";
              services.forEach(function (s) {
                var opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = s.name + " (" + s.duration_minutes + " min, " + s.price_label + ")";
                serviceSelect.appendChild(opt);
              });
              serviceSelect.style.display = services.length > 0 ? "" : "none";
              serviceSelect.addEventListener("change", render);
            })
            .catch(function () {})
        );
      }
      return Promise.all(tasks);
    }

    function slotsForDay(dayOfWeek) {
      var hours = weekly[String(dayOfWeek)];
      if (!hours) return [];
      var openParts = hours.open.split(":").map(Number);
      var closeParts = hours.close.split(":").map(Number);
      var startMin = openParts[0] * 60 + openParts[1];
      var endMin = closeParts[0] * 60 + closeParts[1];
      var out = [];
      for (var t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
        out.push(pad2(Math.floor(t / 60)) + ":" + pad2(t % 60));
      }
      return out;
    }

    function onPick(dateStr, timeLabel, btn) {
      var d = new Date(dateStr + "T00:00:00");
      confirmModal.open({
        label: WEEKDAY_SHORT[d.getDay()] + " " + d.getDate() + " " + MONTHS_SHORT[d.getMonth()] + ", kl. " + timeLabel,
        dateStr: dateStr,
        timeLabel: timeLabel,
        staffId: selectedStaffId,
        serviceIds: selectedServiceIds(),
        btn: btn,
        onDone: function (ok) { if (!ok) render(); }, // someone else just took it — refresh so the grid reflects reality
      });
    }

    function renderGridLegacy(days, taken) {
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      grid.innerHTML = "";
      days.forEach(function (d) {
        var dateStr = isoDate(d);
        var col = document.createElement("div");
        col.className = "booking-cal-day" + (dateStr === isoDate(today) ? " is-today" : "");
        var head = document.createElement("div");
        head.className = "booking-cal-day-head";
        head.innerHTML = "<span class=\"wd\">" + WEEKDAY_SHORT[d.getDay()] + "</span><span class=\"dt\">" + d.getDate() + "</span>";
        col.appendChild(head);
        var slotsWrap = document.createElement("div");
        slotsWrap.className = "booking-cal-slots";
        var slots = slotsForDay(d.getDay());
        var isPast = d < today;
        var dayIsOpen = !!weekly[String(d.getDay())];
        if (slots.length === 0 && !dayIsOpen) {
          var closed = document.createElement("span");
          closed.className = "booking-cal-closed";
          closed.textContent = "Stängt";
          slotsWrap.appendChild(closed);
        } else {
          slots.forEach(function (time) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "slot-btn";
            btn.textContent = time;
            if (isPast || (taken && taken[dateStr + "|" + time])) {
              btn.disabled = true;
            } else {
              btn.addEventListener("click", function () { onPick(dateStr, time, btn); });
            }
            slotsWrap.appendChild(btn);
          });
        }
        col.appendChild(slotsWrap);
        grid.appendChild(col);
      });
    }

    function showNextAvailable(fromDateStr) {
      if (!nextAvailEl) return;
      nextAvailEl.style.display = "";
      nextAvailEl.innerHTML = "";
      var link = document.createElement("button");
      link.type = "button";
      link.className = "chip-link-btn";
      link.textContent = "Visa nästa lediga tid";
      link.addEventListener("click", function () {
        var staffParam = selectedStaffId ? "&staffId=" + selectedStaffId : "";
        fetch(apiBase + "/bookings/" + companyId + "/next-available?durationMinutes=" + selectedDurationMinutes() + "&from=" + fromDateStr + staffParam)
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (next) {
            if (!next) { nextAvailEl.textContent = "Ingen ledig tid hittades den närmaste tiden."; return; }
            var target = new Date(next.date + "T00:00:00");
            var monday = startOfWeek(0);
            weekOffset = Math.round((target - monday) / (7 * 24 * 60 * 60 * 1000));
            render();
          });
      });
      nextAvailEl.appendChild(link);
    }

    function render() {
      var monday = startOfWeek(weekOffset);
      if (rangeLabel) rangeLabel.textContent = fmtRange(monday);
      var days = [];
      for (var i = 0; i < 7; i++) {
        var d = new Date(monday);
        d.setDate(d.getDate() + i);
        days.push(d);
      }
      if (nextAvailEl) nextAvailEl.style.display = "none";
      grid.classList.add("is-loading");

      if (staffSelect && selectedStaffId) {
        var duration = selectedDurationMinutes();
        Promise.all(
          days.map(function (d) {
            var dateStr = isoDate(d);
            return fetch(apiBase + "/bookings/" + companyId + "/availability?staffId=" + selectedStaffId + "&date=" + dateStr + "&durationMinutes=" + duration)
              .then(function (r) { return r.json(); })
              .then(function (res) { return { dateStr: dateStr, slots: res.slots || [] }; })
              .catch(function () { return { dateStr: dateStr, slots: [] }; });
          })
        ).then(function (results) {
          var perDay = {};
          results.forEach(function (r) { perDay[r.dateStr] = r.slots; });
          var openCount = renderAvailabilityGrid(grid, days, perDay, onPick);
          grid.classList.remove("is-loading");
          if (openCount === 0) showNextAvailable(isoDate(days[6]));
        });
        return;
      }

      // Legacy mode — unchanged from before multi-staff/services existed.
      fetch(apiBase + "/bookings/" + companyId + "?from=" + isoDate(days[0]) + "&to=" + isoDate(days[6]))
        .then(function (r) { return r.json(); })
        .then(function (existing) {
          var taken = {};
          (existing || []).forEach(function (b) { taken[b.booking_date + "|" + b.time_label] = true; });
          renderGridLegacy(days, taken);
        })
        .catch(function () { renderGridLegacy(days, {}); })
        .then(function () { grid.classList.remove("is-loading"); });
    }

    navBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        weekOffset += parseInt(btn.getAttribute("data-dir"), 10) || 0;
        if (weekOffset < 0) weekOffset = 0; // never navigate into the past
        render();
      });
    });

    // Auto-refresh: a booking made/moved elsewhere (the portal's "boka
    // om"/manual-entry, or another visitor) never pushes to an already-open
    // page — without this, a slot that just became taken stays clickable-
    // looking here until someone reloads. Paused while the confirmation
    // modal is open so a mid-booking visitor's screen doesn't shift under
    // them. `focus` alongside `visibilitychange` — visibilitychange only
    // fires when the tab is actually hidden/minimized, not when switching
    // between two side-by-side windows that stay technically "visible".
    setInterval(function () { if (!confirmModal.isOpen()) render(); }, 8000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && !confirmModal.isOpen()) render();
    });
    window.addEventListener("focus", function () { if (!confirmModal.isOpen()) render(); });

    loadStaffAndServices().then(render);
  }

  // ============================================================
  // Per-service booking popup (2026-09-10) — replaces the always-visible
  // week grid with a "Boka" button on each price-list item. Clicking it
  // opens a small popup: pick a specific frisör or "Nästa tillgängliga
  // frisör" (system picks whoever has the earliest opening), hit "Sök
  // tider", and THAT person's real, gap-fitting-aware availability appears
  // — going forward from their first opening for this exact service. This
  // is what a generated site's price list should use now; #bookingCal
  // above stays only for sites generated before this existed.
  //
  // Expected markup (see websiteAgent.ts's siteKitBlock()):
  //   <div id="bookingWidget" class="booking-widget-backdrop" data-company-id="..." data-api-base="...">
  //     <div class="booking-widget-modal">
  //       <button id="bookingWidgetClose" class="booking-widget-close">&times;</button>
  //       <div class="booking-widget-service">
  //         <span id="bookingWidgetServiceName" class="booking-widget-service-name"></span>
  //         <span id="bookingWidgetServiceMeta" class="booking-widget-service-meta"></span>
  //       </div>
  //       <div id="bookingWidgetStepStaff" class="booking-widget-step">
  //         <label class="booking-widget-label" for="bookingWidgetStaffSelect">Välj frisör</label>
  //         <select id="bookingWidgetStaffSelect" class="booking-widget-select"></select>
  //         <button id="bookingWidgetSearchBtn" type="button" class="booking-widget-search-btn">Sök tider</button>
  //       </div>
  //       <div id="bookingWidgetStepTimes" class="booking-widget-step" hidden>
  //         <button id="bookingWidgetBack" type="button" class="booking-widget-back">‹ Byt frisör</button>
  //         <div class="booking-cal-head">
  //           <button type="button" class="booking-cal-nav" data-dir="-1">‹</button>
  //           <span id="bookingWidgetRange" class="booking-cal-range"></span>
  //           <button type="button" class="booking-cal-nav" data-dir="1">›</button>
  //         </div>
  //         <div id="bookingWidgetGrid" class="booking-cal-grid"></div>
  //         <div id="bookingWidgetNextAvail" class="booking-cal-next-available" style="display:none"></div>
  //       </div>
  //     </div>
  //   </div>
  // ...and every price-list "Boka" button:
  //   <button class="price-item-book-btn" type="button"
  //           data-service-name="Herrklippning" data-duration-minutes="30">Boka</button>
  // (its nearest ancestor .price-item's .price-item-amount text is read for
  // the price shown in the popup header — no extra data attribute needed.)
  function wireBookingWidget(confirmModal) {
    var popup = document.getElementById("bookingWidget");
    var bookBtns = document.querySelectorAll(".price-item-book-btn");
    if (!popup || !confirmModal || bookBtns.length === 0) return;

    var companyId = popup.getAttribute("data-company-id");
    var apiBase = popup.getAttribute("data-api-base") || "";

    var closeBtn = document.getElementById("bookingWidgetClose");
    var stepStaff = document.getElementById("bookingWidgetStepStaff");
    var stepTimes = document.getElementById("bookingWidgetStepTimes");
    var staffSelect = document.getElementById("bookingWidgetStaffSelect");
    var searchBtn = document.getElementById("bookingWidgetSearchBtn");
    var backBtn = document.getElementById("bookingWidgetBack");
    var serviceNameEl = document.getElementById("bookingWidgetServiceName");
    var serviceMetaEl = document.getElementById("bookingWidgetServiceMeta");
    var rangeLabel = document.getElementById("bookingWidgetRange");
    var grid = document.getElementById("bookingWidgetGrid");
    var nextAvailEl = document.getElementById("bookingWidgetNextAvail");
    var navBtns = stepTimes ? stepTimes.querySelectorAll(".booking-cal-nav") : [];
    if (!stepStaff || !stepTimes || !staffSelect || !searchBtn || !grid) return;

    var staffList = [];
    var staffLoaded = false;
    var currentService = null; // { name, durationMinutes, priceLabel }
    var resolvedStaffId = null;
    var weekOffset = 0;
    var refreshTimer = null;

    // Real gap found 2026-09-16: a freshly built site's booking widget has
    // zero staff rows until the owner adds their team via the portal — the
    // OLD behavior left the dropdown showing only "Nästa tillgängliga
    // frisör" and let the visitor click all the way through to "Sök tider",
    // which then 404'd against /next-available (bookings.ts refuses that
    // endpoint with no staff at all) with no visible explanation. Looked
    // exactly like "the booking button does nothing." Now caught up front:
    // an empty staff list disables search and shows a clear, honest
    // message instead of a silent dead end.
    function loadStaff() {
      if (staffLoaded) return Promise.resolve();
      return fetch(apiBase + "/bookings/" + companyId + "/staff")
        .then(function (r) { return r.json(); })
        .then(function (rows) {
          staffList = rows || [];
          staffSelect.innerHTML = "";
          if (staffList.length === 0) {
            var noStaffOpt = document.createElement("option");
            noStaffOpt.value = "";
            noStaffOpt.textContent = "Ingen personal upplagd ännu";
            staffSelect.appendChild(noStaffOpt);
            staffSelect.disabled = true;
            searchBtn.disabled = true;
            searchBtn.textContent = "Sök tider";
            if (nextAvailEl) {
              nextAvailEl.style.display = "";
              nextAvailEl.textContent = "Bokning öppnar inom kort — hör av dig direkt till oss under tiden så hjälper vi dig hitta en tid.";
            }
            staffLoaded = true;
            return;
          }
          staffSelect.disabled = false;
          var anyOpt = document.createElement("option");
          anyOpt.value = "";
          anyOpt.textContent = "Nästa tillgängliga frisör";
          staffSelect.appendChild(anyOpt);
          staffList.forEach(function (s) {
            var opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name + (s.title ? " — " + s.title : "");
            staffSelect.appendChild(opt);
          });
          staffLoaded = true;
        })
        .catch(function () {});
    }

    function openPopup(service) {
      currentService = service;
      resolvedStaffId = null;
      weekOffset = 0;
      if (serviceNameEl) serviceNameEl.textContent = service.name;
      if (serviceMetaEl) serviceMetaEl.textContent = service.durationMinutes + " min" + (service.priceLabel ? " · " + service.priceLabel : "");
      stepStaff.hidden = false;
      stepTimes.hidden = true;
      searchBtn.disabled = false;
      searchBtn.textContent = "Sök tider";
      popup.classList.add("is-open");
      loadStaff();
    }
    function closePopup() { popup.classList.remove("is-open"); }

    bookBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".price-item");
        var priceEl = item ? item.querySelector(".price-item-amount") : null;
        openPopup({
          name: btn.getAttribute("data-service-name") || "Tjänst",
          durationMinutes: parseInt(btn.getAttribute("data-duration-minutes"), 10) || 30,
          priceLabel: priceEl ? priceEl.textContent.trim() : "",
        });
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", closePopup);
    popup.addEventListener("click", function (e) { if (e.target === popup) closePopup(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && popup.classList.contains("is-open") && !confirmModal.isOpen()) closePopup();
    });
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        stepTimes.hidden = true;
        stepStaff.hidden = false;
      });
    }

    function onPick(dateStr, timeLabel, btn) {
      var d = new Date(dateStr + "T00:00:00");
      confirmModal.open({
        label: currentService.name + " — " + WEEKDAY_SHORT[d.getDay()] + " " + d.getDate() + " " + MONTHS_SHORT[d.getMonth()] + ", kl. " + timeLabel,
        dateStr: dateStr,
        timeLabel: timeLabel,
        staffId: resolvedStaffId,
        serviceLabel: currentService.name,
        durationMinutes: currentService.durationMinutes,
        btn: btn,
        onDone: function (ok) { if (!ok) render(); },
      });
    }

    function showNextAvailable(fromDateStr) {
      if (!nextAvailEl) return;
      nextAvailEl.style.display = "";
      nextAvailEl.innerHTML = "";
      var link = document.createElement("button");
      link.type = "button";
      link.className = "chip-link-btn";
      link.textContent = "Visa nästa lediga tid";
      link.addEventListener("click", function () {
        fetch(apiBase + "/bookings/" + companyId + "/next-available?staffId=" + resolvedStaffId + "&durationMinutes=" + currentService.durationMinutes + "&from=" + fromDateStr)
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (next) {
            if (!next) { nextAvailEl.textContent = "Ingen ledig tid hittades den närmaste tiden."; return; }
            var target = new Date(next.date + "T00:00:00");
            var monday = startOfWeek(0);
            weekOffset = Math.round((target - monday) / (7 * 24 * 60 * 60 * 1000));
            render();
          });
      });
      nextAvailEl.appendChild(link);
    }

    function render() {
      if (!resolvedStaffId) return;
      var monday = startOfWeek(weekOffset);
      if (rangeLabel) rangeLabel.textContent = fmtRange(monday);
      var days = [];
      for (var i = 0; i < 7; i++) {
        var d = new Date(monday);
        d.setDate(d.getDate() + i);
        days.push(d);
      }
      if (nextAvailEl) nextAvailEl.style.display = "none";
      grid.classList.add("is-loading");
      var duration = currentService.durationMinutes;
      Promise.all(
        days.map(function (d) {
          var dateStr = isoDate(d);
          return fetch(apiBase + "/bookings/" + companyId + "/availability?staffId=" + resolvedStaffId + "&date=" + dateStr + "&durationMinutes=" + duration)
            .then(function (r) { return r.json(); })
            .then(function (res) { return { dateStr: dateStr, slots: res.slots || [] }; })
            .catch(function () { return { dateStr: dateStr, slots: [] }; });
        })
      ).then(function (results) {
        var perDay = {};
        results.forEach(function (r) { perDay[r.dateStr] = r.slots; });
        var openCount = renderAvailabilityGrid(grid, days, perDay, onPick);
        grid.classList.remove("is-loading");
        if (openCount === 0) showNextAvailable(isoDate(days[6]));
      });
    }

    navBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        weekOffset += parseInt(btn.getAttribute("data-dir"), 10) || 0;
        if (weekOffset < 0) weekOffset = 0; // never navigate into the past
        render();
      });
    });

    function resolveStaffAndShow() {
      var duration = currentService.durationMinutes;
      var chosen = staffSelect.value;
      searchBtn.disabled = true;
      searchBtn.textContent = "Söker…";
      function restore() { searchBtn.disabled = false; searchBtn.textContent = "Sök tider"; }

      if (chosen) {
        resolvedStaffId = chosen;
        weekOffset = 0;
        restore();
        stepStaff.hidden = true;
        stepTimes.hidden = false;
        render();
        return;
      }
      // "Nästa tillgängliga frisör" — resolve server-side across all staff.
      fetch(apiBase + "/bookings/" + companyId + "/next-available?durationMinutes=" + duration)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (next) {
          restore();
          if (!next) { alert("Ingen ledig tid hittades den närmaste tiden."); return; }
          resolvedStaffId = next.staffId;
          var target = new Date(next.date + "T00:00:00");
          var monday = startOfWeek(0);
          weekOffset = Math.round((target - monday) / (7 * 24 * 60 * 60 * 1000));
          if (weekOffset < 0) weekOffset = 0;
          stepStaff.hidden = true;
          stepTimes.hidden = false;
          render();
        })
        .catch(function () { restore(); alert("Kunde inte nå bokningssystemet just nu."); });
    }
    searchBtn.addEventListener("click", resolveStaffAndShow);

    // Auto-refresh while the times step is open, same reasoning as the
    // legacy calendar's — a reschedule made elsewhere (portal, another
    // visitor) shouldn't leave a now-taken slot looking clickable here.
    refreshTimer = setInterval(function () {
      if (popup.classList.contains("is-open") && stepTimes.hidden === false && !confirmModal.isOpen()) render();
    }, 8000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && popup.classList.contains("is-open") && stepTimes.hidden === false && !confirmModal.isOpen()) render();
    });
    window.addEventListener("focus", function () {
      if (popup.classList.contains("is-open") && stepTimes.hidden === false && !confirmModal.isOpen()) render();
    });
  }

  var WEEKDAY_SHORT = ["Sön", "Mån", "Tis", "Ons", "Tors", "Fre", "Lör"];

  /**
   * "Nästa lediga tid" — the one honest scarcity/urgency signal this
   * system allows (2026-09-17): real availability computed from the
   * company's actual staff schedules + real bookings (same endpoint the
   * booking widget itself uses for "nästa tillgängliga frisör"), never a
   * fabricated countdown. If the real answer is "plenty of room", it just
   * says the real next slot — it doesn't lie in either direction. Fails
   * silently (element stays hidden) on any network/API error, same
   * philosophy as every other optional site-kit widget.
   */
  function formatNextAvailable(dateIso, timeHm) {
    var today = new Date();
    var todayIso = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    var tomorrow = new Date(today.getTime() + 86400000);
    var tomorrowIso = tomorrow.getFullYear() + "-" + String(tomorrow.getMonth() + 1).padStart(2, "0") + "-" + String(tomorrow.getDate()).padStart(2, "0");
    if (dateIso === todayIso) return "Idag kl " + timeHm;
    if (dateIso === tomorrowIso) return "Imorgon kl " + timeHm;
    var d = new Date(dateIso + "T00:00:00");
    return WEEKDAY_SHORT[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth() + 1) + " kl " + timeHm;
  }

  function wireNextAvailable() {
    document.querySelectorAll(".next-available-note").forEach(function (el) {
      var companyId = el.getAttribute("data-company-id");
      var apiBase = el.getAttribute("data-api-base") || "";
      var duration = el.getAttribute("data-duration-minutes") || "30";
      if (!companyId) return;
      fetch(apiBase + "/bookings/" + companyId + "/next-available?durationMinutes=" + duration)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (next) {
          if (!next || !next.date || !next.time) { el.hidden = true; return; }
          el.textContent = "Nästa lediga tid: " + formatNextAvailable(next.date, next.time);
          el.hidden = false;
        })
        .catch(function () { el.hidden = true; });
    });
  }

  function init() {
    renderStars();
    wireCountUp();
    wireReveal();
    wireNameWrite();
    wireFlowLines();
    wireSignatureMark();
    wireNextAvailable();
    wireBooking();

    // Exactly one confirm-modal controller, shared by whichever booking
    // UI/UIs are actually present on this page (see createConfirmModal's
    // own comment for why that matters).
    var calRoot = document.getElementById("bookingCal");
    var popupRoot = document.getElementById("bookingWidget");
    var bookingRoot = popupRoot || calRoot;
    if (bookingRoot) {
      var confirmModal = createConfirmModal(
        bookingRoot.getAttribute("data-api-base") || "",
        bookingRoot.getAttribute("data-company-id")
      );
      wireBookingCalendar(confirmModal);
      wireBookingWidget(confirmModal);
    }

    wireHeaderScrollState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
