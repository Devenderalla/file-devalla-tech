/* ═══════════════════════════════════════════════════════════
   Gym Basics — live session behaviour
   Turns the printed workout tables into something you can hold
   during a set: tap sets off, rest timer, progress, offline.

   Progressive enhancement — with JS off the tables render and
   read exactly as before. Nothing here leaves the device: all
   state is localStorage, which keeps the "no tracking" promise
   in the footer literally true.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* Service worker registration moved to app.js, which every page loads. */

  /* ── storage (best-effort: private mode can throw on write) ── */
  var PAGE = location.pathname.split("/").pop().replace(".html", "") || "index";
  var SETS_KEY = "gb:sets:" + PAGE;
  var TIMER_KEY = "gb:timer";

  /* workout.html serves a different day from the same URL, so it hands us
     its own bucket — otherwise Monday's ticks would show up on Tuesday */
  function useKey(k) {
    if (k === SETS_KEY) return;
    SETS_KEY = k;
    done = load(SETS_KEY, {});
  }

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function drop(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  var done = load(SETS_KEY, {});

  /* ── parse the prescriptions already written into the markup ──
     "2 × 8–10" → 2 sets · "5 min" → a single done toggle
     "rest 90s" → 90 seconds of rest between them */
  function setCount(rxText) {
    var m = rxText.match(/^\s*(\d+)\s*[×x]\s*/);
    return m ? Math.min(+m[1], 10) : 1;
  }
  function restSeconds(noteText) {
    var m = noteText.match(/rest\s*(\d+)\s*s/i);
    if (m) return +m[1];
    m = noteText.match(/rest\s*(\d+)\s*min/i);
    return m ? +m[1] * 60 : 0;
  }

  /* ═══ rest timer ═══ */
  var timer = { id: 0, endsAt: 0, total: 0, left: 0, running: false, ctx: null };
  var bar, barProgress, barCount, barFill, barTimer, barTime, barLabel, live;
  var wakeLock = null;

  function buildBar() {
    if (bar) return;
    bar = document.createElement("div");
    bar.className = "session-bar";
    bar.hidden = true;
    bar.innerHTML =
      '<div class="sb-progress">' +
        '<div class="sb-meter"><i></i></div>' +
        '<span class="sb-count"></span>' +
        '<button type="button" class="sb-reset">Reset</button>' +
      "</div>" +
      '<div class="sb-timer" hidden>' +
        '<span class="sb-label">Rest</span>' +
        '<span class="sb-time">0:00</span>' +
        '<button type="button" class="sb-adj" data-adj="-15">−15s</button>' +
        '<button type="button" class="sb-pause">Pause</button>' +
        '<button type="button" class="sb-adj" data-adj="30">+30s</button>' +
        '<button type="button" class="sb-skip" aria-label="Skip rest">Skip</button>' +
      "</div>";
    document.body.appendChild(bar);

    live = document.createElement("p");
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);

    barProgress = $(".sb-progress", bar);
    barTimer = $(".sb-timer", bar);
    barCount = $(".sb-count", bar);
    barFill = $(".sb-meter i", bar);
    barTime = $(".sb-time", bar);
    barLabel = $(".sb-label", bar);

    $(".sb-reset", bar).addEventListener("click", resetSession);
    $(".sb-skip", bar).addEventListener("click", stopTimer);
    $(".sb-pause", bar).addEventListener("click", togglePause);
    $$(".sb-adj", bar).forEach(function (b) {
      b.addEventListener("click", function () { adjust(+b.dataset.adj); });
    });
  }

  function fmt(s) {
    s = Math.max(0, Math.round(s));
    return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
  }

  /* a short two-tone chirp — no audio file to ship or cache */
  function chirp() {
    try {
      if (!timer.ctx) timer.ctx = new (window.AudioContext || window.webkitAudioContext)();
      var t = timer.ctx.currentTime;
      [880, 1320].forEach(function (freq, i) {
        var o = timer.ctx.createOscillator(), g = timer.ctx.createGain();
        o.frequency.value = freq;
        o.connect(g); g.connect(timer.ctx.destination);
        g.gain.setValueAtTime(0.0001, t + i * 0.16);
        g.gain.exponentialRampToValueAtTime(0.22, t + i * 0.16 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.15);
        o.start(t + i * 0.16); o.stop(t + i * 0.16 + 0.16);
      });
    } catch (e) {}
  }

  function startTimer(seconds, label) {
    if (!seconds) return;
    buildBar();
    timer.total = seconds;
    timer.left = seconds;
    timer.endsAt = Date.now() + seconds * 1000;
    timer.running = true;
    barLabel.textContent = label || "Rest";
    save(TIMER_KEY, { endsAt: timer.endsAt, total: timer.total, label: barLabel.textContent });
    showBar();
    tick();
    clearInterval(timer.id);
    timer.id = setInterval(tick, 250);
    if (live) live.textContent = fmt(seconds) + " rest started";
    keepAwake();
  }

  function tick() {
    if (!timer.running) return;
    timer.left = (timer.endsAt - Date.now()) / 1000;
    if (timer.left <= 0) {
      timer.left = 0;
      finishTimer();
      return;
    }
    paintTimer();
  }

  function paintTimer() {
    var wasHidden = barTimer.hidden;
    barTime.textContent = fmt(timer.left);
    barTimer.hidden = false;
    bar.classList.add("running");
    if (wasHidden) padForBar();
    bar.style.setProperty("--rest-pct", (100 - (timer.left / timer.total) * 100).toFixed(1) + "%");
  }

  function finishTimer() {
    clearInterval(timer.id);
    timer.running = false;
    drop(TIMER_KEY);
    barTime.textContent = "0:00";
    bar.classList.remove("running");
    bar.classList.add("done-flash");
    chirp();
    if (navigator.vibrate) { try { navigator.vibrate([120, 80, 120]); } catch (e) {} }
    if (live) live.textContent = "Rest finished — next set";
    setTimeout(function () {
      bar.classList.remove("done-flash");
      barTimer.hidden = true;
      syncBar();
      padForBar();
    }, 2600);
  }

  function stopTimer() {
    clearInterval(timer.id);
    timer.running = false;
    drop(TIMER_KEY);
    if (bar) {
      bar.classList.remove("running", "done-flash");
      barTimer.hidden = true;
    }
    syncBar();
    padForBar();
  }

  function togglePause() {
    if (!timer.running && !timer.left) return;
    var btn = $(".sb-pause", bar);
    if (timer.running) {
      timer.running = false;
      clearInterval(timer.id);
      btn.textContent = "Resume";
      drop(TIMER_KEY);
    } else {
      timer.endsAt = Date.now() + timer.left * 1000;
      timer.running = true;
      btn.textContent = "Pause";
      save(TIMER_KEY, { endsAt: timer.endsAt, total: timer.total, label: barLabel.textContent });
      timer.id = setInterval(tick, 250);
    }
  }

  function adjust(delta) {
    if (!timer.total) return;
    timer.left = Math.max(0, timer.left + delta);
    timer.total = Math.max(timer.total, timer.left);
    if (timer.running) {
      timer.endsAt = Date.now() + timer.left * 1000;
      save(TIMER_KEY, { endsAt: timer.endsAt, total: timer.total, label: barLabel.textContent });
    }
    paintTimer();
  }

  /* a timer survives navigating between pages mid-session */
  function restoreTimer() {
    var t = load(TIMER_KEY, null);
    if (!t || !t.endsAt) return;
    var left = (t.endsAt - Date.now()) / 1000;
    if (left <= 0) { drop(TIMER_KEY); return; }
    buildBar();
    timer.total = t.total || left;
    timer.left = left;
    timer.endsAt = t.endsAt;
    timer.running = true;
    barLabel.textContent = t.label || "Rest";
    showBar();
    paintTimer();
    clearInterval(timer.id);
    timer.id = setInterval(tick, 250);
  }

  /* phones lock mid-set otherwise */
  function keepAwake() {
    if (!("wakeLock" in navigator) || wakeLock) return;
    navigator.wakeLock.request("screen").then(function (l) {
      wakeLock = l;
      l.addEventListener("release", function () { wakeLock = null; });
    }).catch(function () {});
  }
  window.addEventListener("resize", padForBar);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      if (timer.running) tick();
      if (sessionActive()) keepAwake();
    }
  });

  /* ═══ set check-off ═══ */
  var rows = [];

  function enhance(scope, keyPrefix) {
    $$(".wo", scope).forEach(function (wo, wi) {
      $$(".wo-row", wo).forEach(function (row, ri) {
        if (row.dataset.gb) return;

        /* Numbered rows are exercises. Rows indexed "·" are advice
           (pre-gym, recovery) — they get no set tracking. */
        var idx = $(".wo-idx", row);
        if (!idx || !/^\d+$/.test(idx.textContent.trim())) return;

        var rxEl = $(".wo-rx", row);
        if (!rxEl) return;

        var note = $("small", rxEl);
        var noteText = note ? note.textContent : "";
        var rxText = rxEl.textContent.replace(noteText, "");
        var n = setCount(rxText);
        var rest = restSeconds(noteText);
        var key = keyPrefix + ":" + wi + ":" + ri;
        var name = ($(".wo-name", row).firstChild.textContent || "").trim();

        row.dataset.gb = key;

        var actions = document.createElement("div");
        actions.className = "wo-actions";

        var group = document.createElement("div");
        group.className = "set-dots";
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", "Sets for " + name);

        /* ── which set is on screen ──
           The dots have always said which sets are *done*. They now also
           say which one is *selected*, because lift.js hangs a weight, a
           rep count and how it felt off each set separately and something
           has to say which of them you are looking at. Selection is a
           cursor, not data: it is not stored, and on a fresh load it lands
           on the first set you haven't done. */
        var state = { sel: 1, n: n, key: key };

        function paintSel() {
          if (n < 2) return;
          $$(".set-dot", group).forEach(function (b, i) {
            var on = i + 1 === state.sel;
            b.classList.toggle("is-sel", on);
            if (on) b.setAttribute("aria-current", "true");
            else b.removeAttribute("aria-current");
          });
        }

        /* `toggled` says the tap changed whether the set is done, rather
           than only which one is on screen. lift.js needs the difference:
           finishing a set is when a suggested weight becomes a record,
           and looking at one is not. */
        function announce(toggled) {
          row.dispatchEvent(new CustomEvent("gb:set", {
            bubbles: true,
            detail: {
              set: state.sel, n: n, toggled: !!toggled,
              done: !!done[key + ":" + state.sel]
            }
          }));
        }

        function select(setNo, quiet, toggled) {
          if (!(setNo >= 1 && setNo <= n)) return;
          state.sel = setNo;
          paintSel();
          if (!quiet) announce(toggled);
        }

        for (var i = 1; i <= n; i++) {
          (function (setNo) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "set-dot";
            b.textContent = n > 1 ? setNo : "Done";
            if (n === 1) b.classList.add("wide");
            b.setAttribute("aria-pressed", "false");
            b.setAttribute("aria-label", n > 1 ? "Set " + setNo + " of " + n : "Mark " + name + " done");
            b.addEventListener("click", function () {
              var k = key + ":" + setNo;

              /* A set you have already ticked is usually one you have come
                 back to in order to fix the weight you typed, not one you
                 want to un-tick. So a tap on a done set that isn't the one
                 on screen just brings it up; tap it again — now that it is
                 selected — and it un-ticks. That keeps the one-tap-per-set
                 floor flow (tap 1, tap 2, tap 3) and the mis-tap undo,
                 without letting "let me look at set 1" throw away the fact
                 that set 1 happened. */
              if (done[k] && state.sel !== setNo && n > 1) { select(setNo); return; }

              var nowDone = !done[k];
              if (nowDone) done[k] = 1; else delete done[k];
              b.setAttribute("aria-pressed", nowDone ? "true" : "false");
              b.classList.toggle("on", nowDone);
              save(SETS_KEY, done);
              /* finishing a set starts the rest — except the last one,
                 where you move to the next exercise instead */
              if (nowDone && rest && setNo < n) startTimer(rest, "Rest · " + name);
              select(setNo, false, true);
              syncRow(row);
              syncBar();
            });
            group.appendChild(b);
          })(i);
        }
        actions.appendChild(group);

        if (rest) {
          var rb = document.createElement("button");
          rb.type = "button";
          rb.className = "rest-btn";
          /* mirror the wording already in the row ("rest 90s") rather than
             reformatting it as 1:30 — the countdown itself uses m:ss */
          rb.textContent = "Rest " + rest + "s";
          rb.setAttribute("aria-label", "Start " + rest + " second rest timer");
          rb.addEventListener("click", function () { startTimer(rest, "Rest · " + name); });
          actions.appendChild(rb);
        }

        row.appendChild(actions);
        rows.push({ el: row, key: key, n: n, state: state, select: select });

        /* restore previous state */
        $$(".set-dot", group).forEach(function (b, i2) {
          if (done[key + ":" + (i2 + 1)]) {
            b.classList.add("on");
            b.setAttribute("aria-pressed", "true");
          }
        });

        /* open on the first set still to do — coming back to a half-finished
           session should land where the session actually is */
        var open = 1;
        for (var s = 1; s <= n; s++) { if (!done[key + ":" + s]) { open = s; break; } }
        select(open, true);
        syncRow(row);
      });
    });
  }

  function syncRow(row) {
    var dots = $$(".set-dot", row);
    var all = dots.length && dots.every(function (b) { return b.classList.contains("on"); });
    row.classList.toggle("wo-done", all);
  }

  function counts() {
    var total = 0, hit = 0;
    rows.forEach(function (r) {
      total += r.n;
      for (var i = 1; i <= r.n; i++) if (done[r.key + ":" + i]) hit++;
    });
    return { total: total, hit: hit };
  }

  function sessionActive() {
    return counts().hit > 0 || timer.running;
  }

  function showBar() {
    if (!bar) return;
    bar.hidden = false;
    document.body.classList.add("has-session-bar");
    padForBar();
  }

  /* the bar grows when the timer opens, so reserve its real height
     rather than guessing — otherwise it covers the footer */
  function padForBar() {
    if (!bar || bar.hidden) {
      document.body.style.removeProperty("--session-bar-h");
      return;
    }
    var h = bar.offsetHeight;
    if (h) document.body.style.setProperty("--session-bar-h", h + 24 + "px");
  }

  function syncBar() {
    if (!rows.length) return;
    buildBar();
    var c = counts();
    barCount.textContent = c.hit + " / " + c.total + " sets";
    barFill.style.width = c.total ? (c.hit / c.total * 100) + "%" : "0%";
    barProgress.hidden = false;
    if (c.hit > 0 || timer.running) showBar();
    else {
      bar.hidden = true;
      document.body.classList.remove("has-session-bar");
      padForBar();
    }
  }

  function resetSession() {
    done = {};
    save(SETS_KEY, done);
    $$(".set-dot").forEach(function (b) {
      b.classList.remove("on");
      b.setAttribute("aria-pressed", "false");
    });
    $$(".wo-row").forEach(function (r) { r.classList.remove("wo-done"); });
    /* back to set 1 everywhere, and tell the panels so — a cursor left on
       set 3 of a session that no longer has a set 3 done is a lie */
    rows.forEach(function (r) { if (r.select) r.select(1); });
    stopTimer();
    syncBar();
    if (live) live.textContent = "Session reset";
  }

  /* ═══ focus mode ═══
     One exercise on the screen at a time, for actually standing at the
     machine. Same rows, same set buttons, same timer — only the CSS and
     a cursor change, so there is no second copy of the session state. */
  var focus = { on: false, i: 0, bar: null, host: null };

  /* Put the card's top edge just under the focus bar. Stepping to the next
     exercise otherwise keeps whatever scroll position the last set left you
     at, and the name ends up behind the sticky bar. */
  function scrollToExercise() {
    if (!focus.host || !window.scrollTo) return;
    var head = $(".site-head");
    var offset = (head ? head.offsetHeight : 64) + focus.bar.offsetHeight;
    var y = focus.host.getBoundingClientRect().top + window.pageYOffset - offset;
    try { window.scrollTo({ top: Math.max(0, y), behavior: "smooth" }); }
    catch (e) { window.scrollTo(0, Math.max(0, y)); }
  }

  function blockLabel(row) {
    var wo = row.closest ? row.closest(".wo") : null;
    var prev = wo && wo.previousElementSibling;
    return prev && prev.classList.contains("plan-phase-label") ? prev.textContent : "";
  }

  function paintFocus() {
    if (!rows.length) return;
    focus.i = Math.max(0, Math.min(focus.i, rows.length - 1));
    rows.forEach(function (r, i) { r.el.classList.toggle("focus-on", i === focus.i); });
    var cur = rows[focus.i].el;
    $(".focus-count", focus.bar).textContent = "Exercise " + (focus.i + 1) + " of " + rows.length;
    $(".focus-block", focus.bar).textContent = blockLabel(cur);
    $(".focus-prev", focus.bar).disabled = focus.i === 0;
    $(".focus-next", focus.bar).disabled = focus.i === rows.length - 1;
    if (live) live.textContent = $(".wo-name", cur).firstChild.textContent.trim() +
      ", exercise " + (focus.i + 1) + " of " + rows.length;
  }

  function initFocus() {
    var toggle = $("[data-focus-toggle]");
    if (!toggle || toggle.dataset.wired || !rows.length) return;
    toggle.dataset.wired = "1";
    toggle.hidden = false;

    buildBar();
    focus.bar = document.createElement("div");
    focus.bar.className = "focus-bar";
    focus.bar.hidden = true;
    focus.bar.innerHTML =
      '<div class="focus-inner">' +
        '<div class="focus-meta"><span class="focus-count"></span><span class="focus-block"></span></div>' +
        '<button type="button" class="focus-prev" aria-label="Previous exercise">← Prev</button>' +
        '<button type="button" class="focus-next" aria-label="Next exercise">Next →</button>' +
        '<button type="button" class="focus-exit">Exit</button>' +
      "</div>";
    /* The bar goes *outside* .plan-body on purpose. That box is
       overflow:hidden, which makes it the sticky scrolling ancestor — a
       sticky child then parks 64px down inside the card, straight over the
       first exercise name, instead of under the site header. */
    var host = rows[0].el.closest(".wo").parentNode;
    focus.host = host;
    (host.parentNode || host).insertBefore(focus.bar, host);

    function step(by) { focus.i += by; paintFocus(); scrollToExercise(); }

    $(".focus-prev", focus.bar).addEventListener("click", function () { step(-1); });
    $(".focus-next", focus.bar).addEventListener("click", function () { step(1); });
    $(".focus-exit", focus.bar).addEventListener("click", function () { setFocus(false); });
    toggle.addEventListener("click", function () { setFocus(!focus.on); });

    document.addEventListener("keydown", function (e) {
      if (!focus.on) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Escape") setFocus(false);
    });
  }

  function setFocus(on) {
    focus.on = on;
    document.body.classList.toggle("focus-mode", on);
    focus.bar.hidden = !on;
    var toggle = $("[data-focus-toggle]");
    if (toggle) {
      toggle.setAttribute("aria-pressed", on ? "true" : "false");
      toggle.textContent = on ? "Show full list" : "Focus mode";
    }
    if (on) {
      /* pick up where the session actually is */
      var next = rows.findIndex(function (r) { return !r.el.classList.contains("wo-done"); });
      focus.i = next === -1 ? 0 : next;
      paintFocus();
      scrollToExercise();
    } else {
      rows.forEach(function (r) { r.el.classList.remove("focus-on"); });
    }
    padForBar();
  }

  /* ═══ wire up ═══ */
  enhance(document, PAGE);
  if (rows.length) { buildBar(); syncBar(); initFocus(); }
  restoreTimer();

  /* rows can arrive after load: the builder renders on click, and
     workout.html renders the day it was asked for */
  document.addEventListener("gb:plan", function (e) {
    var host = e.target || $("#builderOut");
    var custom = host && host.dataset ? host.dataset.sessionKey : "";
    rows = rows.filter(function (r) { return document.body.contains(r.el); });

    if (custom) {
      /* a planned day keeps its progress across visits */
      useKey("gb:sets:" + custom);
    } else {
      /* a regenerated builder session starts from a clean slate */
      Object.keys(done).forEach(function (k) {
        if (k.indexOf("plan:") === 0) delete done[k];
      });
      save(SETS_KEY, done);
    }
    enhance(host, custom || "plan");
    buildBar();
    syncBar();
    initFocus();
  });

  /* What lift.js needs to know about a row: how many sets it has, which
     one is on screen, and whether that one is ticked off. The set state
     itself stays here — one owner, one copy. */
  function rowState(row) {
    for (var i = 0; i < rows.length; i++) if (rows[i].el === row) return rows[i];
    return null;
  }

  window.GBSession = {
    count: function (row) { var r = rowState(row); return r ? r.n : 0; },
    selected: function (row) { var r = rowState(row); return r ? r.state.sel : 1; },
    select: function (row, n) { var r = rowState(row); if (r) r.select(n); },
    isDone: function (row, n) {
      var r = rowState(row);
      return !!(r && done[r.key + ":" + n]);
    },
    counts: counts
  };
})();
