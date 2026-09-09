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
    // A page using the newer rolling calendar (#bookingCal, see
    // wireBookingCalendar() below) owns the SAME #bdBackdrop modal for
    // real — this mockup wiring must not also attach to it, or a click on
    // "Bekräfta bokning" would both actually POST the booking AND get its
    // success text overwritten by this function's fake confirm handler.
    if (!backdrop || document.getElementById("bookingCal")) return;
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
  // Rolling booking calendar (2026-09-09) — replaces the old per-site
  // hardcoded BOOKING_DAYS approach (specific dates written once by the
  // model at generation time, which silently go stale and once caused a
  // real weekday-mislabeling bug). This version is driven by a RECURRING
  // WEEKLY schedule (which weekdays/hours the business is open — real,
  // verified data, never fabricated) and computes actual calendar dates
  // itself, every time the page loads — so it never goes out of date, and
  // "next/previous week" is just a small offset, not new fictional data.
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
  //   ...plus the same #bdBackdrop confirmation modal wireBooking() above
  //   already documents (bdSlotLine/bdName/bdPhone/bdConfirm/bdClose/bdSuccessLine).
  //
  // `weekly` keys are JS's own getDay() convention: 0=Sön ... 6=Lör, value
  // either null (closed) or {open,close} in "HH:MM". This is the ONLY
  // place in a generated site that ever computes dates or fetches/writes
  // bookings — the model never hand-rolls this logic per company.
  function wireBookingCalendar() {
    var root = document.getElementById("bookingCal");
    if (!root) return;
    var scheduleEl = document.getElementById("bookingSchedule");
    var backdrop = document.getElementById("bdBackdrop");
    if (!scheduleEl || !backdrop) return;

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

    var slotLine = document.getElementById("bdSlotLine");
    var nameInput = document.getElementById("bdName");
    var phoneInput = document.getElementById("bdPhone");
    var closeBtn = document.getElementById("bdClose");
    var confirmBtn = document.getElementById("bdConfirm");
    var successLine = document.getElementById("bdSuccessLine");
    var pending = null; // { dateStr, timeLabel, btn }

    var WEEKDAY_SHORT = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
    var MONTHS_SHORT = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

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

    function slotsForDay(dayOfWeek) {
      var hours = weekly[String(dayOfWeek)];
      if (!hours) return [];
      var openParts = hours.open.split(":").map(Number);
      var closeParts = hours.close.split(":").map(Number);
      var startMin = openParts[0] * 60 + openParts[1];
      var endMin = closeParts[0] * 60 + closeParts[1];
      var out = [];
      for (var t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
        out.push(pad(Math.floor(t / 60)) + ":" + pad(t % 60));
      }
      return out;
    }

    function openModal(dateStr, timeLabel, btn) {
      pending = { dateStr: dateStr, timeLabel: timeLabel, btn: btn };
      var d = new Date(dateStr + "T00:00:00");
      backdrop.classList.remove("is-done");
      if (slotLine) slotLine.textContent = WEEKDAY_SHORT[d.getDay()] + " " + d.getDate() + " " + MONTHS_SHORT[d.getMonth()] + ", kl. " + timeLabel;
      if (nameInput) nameInput.value = "";
      if (phoneInput) phoneInput.value = "";
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = "Bekräfta bokning"; }
      backdrop.classList.add("is-open");
    }
    function closeModal() {
      backdrop.classList.remove("is-open");
    }
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) closeModal(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && backdrop.classList.contains("is-open")) closeModal();
    });
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
            customerName: nameInput ? nameInput.value : "",
            customerPhone: phoneInput ? phoneInput.value : "",
          }),
        })
          .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
          .then(function (res) {
            backdrop.classList.add("is-done");
            if (res.ok) {
              if (successLine) successLine.textContent = "Bokat: " + slotLine.textContent;
              if (pending.btn) pending.btn.disabled = true;
            } else {
              if (successLine) successLine.textContent = res.body.error || "Kunde inte boka den tiden.";
              render(); // someone else just took it (or another race) — refresh so the grid reflects reality
            }
          })
          .catch(function () {
            backdrop.classList.remove("is-open");
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Bekräfta bokning";
            if (successLine) successLine.textContent = "Kunde inte nå bokningssystemet just nu.";
          });
      });
    }

    function renderGrid(days, existing) {
      var taken = {};
      existing.forEach(function (b) { taken[b.booking_date + "|" + b.time_label] = true; });
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

        if (slots.length === 0) {
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
            if (isPast || taken[dateStr + "|" + time]) {
              btn.disabled = true;
            } else {
              btn.addEventListener("click", function () { openModal(dateStr, time, btn); });
            }
            slotsWrap.appendChild(btn);
          });
        }
        col.appendChild(slotsWrap);
        grid.appendChild(col);
      });
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
      grid.classList.add("is-loading");
      fetch(apiBase + "/bookings/" + companyId + "?from=" + isoDate(days[0]) + "&to=" + isoDate(days[6]))
        .then(function (r) { return r.json(); })
        .then(function (existing) { renderGrid(days, existing || []); })
        .catch(function () { renderGrid(days, []); })
        .then(function () { grid.classList.remove("is-loading"); });
    }

    navBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        weekOffset += parseInt(btn.getAttribute("data-dir"), 10) || 0;
        if (weekOffset < 0) weekOffset = 0; // never navigate into the past
        render();
      });
    });

    render();
  }

  function init() {
    renderStars();
    wireCountUp();
    wireReveal();
    wireNameWrite();
    wireBooking();
    wireBookingCalendar();
    wireHeaderScrollState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
