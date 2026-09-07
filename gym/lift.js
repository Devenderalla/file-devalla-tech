/* ═══════════════════════════════════════════════════════════
   Gym Basics — load logging, per set
   The number the rest of the site was missing.

   plan.js already tells you what to do in week 4: "where all
   sets felt smooth, take the next weight up". Until now nothing
   could tell you what the previous weight was, or whether it
   felt smooth — so the instruction was unfollowable. This logs
   both, and puts last week's number on the row in front of you
   while you decide today's.

   Every set is its own record. A first version kept one working
   weight per exercise per session, on the grounds that this is
   how people talk about it ("three by ten at eighty") — but a
   set is where a weight actually happens, and anyone climbing
   10 → 12.5 → 15 across three sets, or dropping the last one
   because form went, was being shown a single box that quietly
   overwrote what they had already typed. So:

     exercise → sets[] → { w, r, rpe }

   and the exercise-level figures (heaviest set, how that set
   felt, its reps, the day's tonnage) are *derived* from those,
   never typed. One answer to "what did you lift today", with
   the sets underneath it.

   session.js owns which set is on screen. This owns what is in
   it. Enhancement over both, in the same way demo.js is.
   Nothing leaves the device.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var GB = window.GB;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var PREFIX = "gb:lift:";
  var CAP = 80;                       /* entries kept per exercise */

  var RPE = [
    { id: "easy",  label: "Easy",  hint: "went up smoothly" },
    { id: "right", label: "Right", hint: "hard but every rep was clean" },
    { id: "hard",  label: "Hard",  hint: "form started going" }
  ];

  function load(k, f) { try { return JSON.parse(localStorage.getItem(k)) || f; } catch (e) { return f; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function iso(d) { return (d || new Date()).toISOString().slice(0, 10); }
  function num(n) { return String(Math.round(n * 100) / 100); }

  function exOf(exId) { return (GB && GB.EX_BY_ID && GB.EX_BY_ID[exId]) || null; }

  function history(exId) { return load(PREFIX + exId, []); }

  /* the last session that wasn't this one — "last week" in the row */
  function previous(exId, today) {
    var h = history(exId);
    for (var i = h.length - 1; i >= 0; i--) if (h[i].d !== today) return h[i];
    return null;
  }

  function best(exId) {
    return history(exId).reduce(function (a, e) { return e.w > a ? e.w : a; }, 0);
  }

  /* What "best yet" has to mean: the heaviest set of any *previous*
     session. Measured against today's entry it would flag itself the
     moment you typed anything, and measured against the selected set
     it would flag set 3 for being heavier than set 1. */
  function bestBefore(exId, today) {
    return history(exId).reduce(function (a, e) {
      return e.d !== today && e.w > a ? e.w : a;
    }, 0);
  }

  /* Upper body moves up in 2.5 kg, legs and back in 5 — the smallest
     jump that is actually available on most Indian gym racks, and the
     smallest that is worth making on a big lift. */
  var BIG = ["legs", "glutes", "back", "full"];
  function step(exId, row) {
    var ex = exOf(exId);
    var muscles = [];
    var eq = (row && row.dataset.eq) || (exId.indexOf("eq:") === 0 ? exId.slice(3) : "");
    if (ex) muscles = [ex.muscle];
    else if (eq && GB && GB.EQ_BY_ID) {
      /* a station-keyed row still knows what it trains — and so
         does a station-keyed id read back out of the history,
         with no row in front of it */
      var st = GB.EQ_BY_ID[eq];
      if (st && st.muscles) muscles = st.muscles;
    }
    return muscles.some(function (m) { return BIG.indexOf(m) > -1; }) ? 5 : 2.5;
  }

  /* ── what the dropdown offers ──
     Typing a number mid-set is the one thing on this screen that
     needs two hands and a look. The ladder comes out of data.js:
     the exercise's own if it has one, then its station's, then the
     default for its kit — so a leg press offers 20, 30, 40 … 400
     and a pair of dumbbells offers 2.5, 5, 7.5 … 50, and neither
     is a list somebody had to scroll past the other to reach. */
  var CAT_KIT = { machines: "machine", functional: "cable", free: "dumbbell" };

  function stationOf(exId, row) {
    var ex = exOf(exId);
    var id = (ex && ex.eq) || (row && row.dataset.eq) ||
      (exId.indexOf("eq:") === 0 ? exId.slice(3) : "");
    return (id && GB && GB.EQ_BY_ID && GB.EQ_BY_ID[id]) || null;
  }

  function segments(exId, row) {
    var LO = (GB && GB.LOADS) || {};
    var ex = exOf(exId);
    if (ex && ex.load) return ex.load;
    var st = stationOf(exId, row);
    if (st && st.load) return st.load;
    if (ex && LO[ex.kit]) return LO[ex.kit];
    /* a row keyed to a station with no ladder of its own — where it
       lives in the gym is the best guess available */
    if (st && LO[CAT_KIT[st.cat]]) return LO[CAT_KIT[st.cat]];
    return LO.machine || [[5, 100, 5]];
  }

  function ladder(exId, row) {
    var out = [];
    segments(exId, row).forEach(function (seg) {
      for (var v = seg[0]; v <= seg[1] + 1e-9; v += seg[2]) {
        var r = Math.round(v * 100) / 100;
        if (out.indexOf(r) === -1) out.push(r);
      }
    });
    return out.sort(function (a, b) { return a - b; });
  }

  /* "take the next weight up" has to mean a weight the machine can
     actually make. The next rung on this station's ladder is that
     number; the generic jump is only the fallback for a lift already
     sitting at the top of one. */
  function nextUp(exId, row, w) {
    var rungs = ladder(exId, row);
    for (var i = 0; i < rungs.length; i++) if (rungs[i] > w + 1e-9) return rungs[i];
    return Math.round((w + step(exId, row)) * 100) / 100;
  }

  function repLadder() {
    return (GB && GB.REPS) || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];
  }

  /* ── the record ── */

  function setsOf(entry) { return (entry && entry.s) || []; }

  function loggedSets(entry) {
    return setsOf(entry).filter(function (x) { return x && typeof x.w === "number" && x.w > 0; });
  }

  /* Derived, never typed. Everything downstream — the progression
     line, progress.js, the CSV — reads these fields, and they have
     meant the same thing since before sets existed. */
  function summarise(e) {
    var sets = loggedSets(e);
    if (!sets.length) {
      delete e.w; delete e.ar; delete e.vol;
      var felt = setsOf(e).filter(function (x) { return x && x.rpe; })[0];
      e.rpe = felt ? felt.rpe : null;
      return;
    }
    var top = sets.reduce(function (a, x) {
      return x.w > a.w || (x.w === a.w && (x.r || 0) > (a.r || 0)) ? x : a;
    });
    e.w = top.w;                                  /* heaviest set of the day */
    e.rpe = top.rpe || null;                      /* how that set felt */
    if (top.r) e.ar = top.r; else delete e.ar;    /* reps it actually got */
    var vol = sets.reduce(function (s, x) { return s + x.w * (x.r || 0); }, 0);
    if (vol > 0) e.vol = Math.round(vol * 100) / 100; else delete e.vol;
  }

  function today(exId) {
    var h = history(exId);
    var last = h[h.length - 1];
    return last && last.d === iso() ? last : null;
  }

  function entryFor(h) {
    var e = h[h.length - 1];
    if (!e || e.d !== iso()) { e = { d: iso() }; h.push(e); }
    return e;
  }

  function commit(exId, h, detail) {
    save(PREFIX + exId, h.slice(-CAP));
    document.dispatchEvent(new CustomEvent("gb:lift", { detail: detail }));
  }

  /* one set of one exercise on one day — the only writer the UI uses */
  function recordSet(exId, setNo, patch, meta) {
    if (!(setNo >= 1)) return;
    var h = history(exId);
    var e = entryFor(h);
    if (meta) {
      if (meta.name) e.name = meta.name;
      if (meta.sets) e.sets = meta.sets;
      if (meta.reps) e.reps = meta.reps;
    }
    var arr = e.s || (e.s = []);
    /* JSON turns array holes into nulls anyway; be explicit about it
       so a set 3 logged before set 2 reads back at the right index */
    for (var i = 0; i < setNo; i++) if (arr[i] === undefined) arr[i] = null;
    var slot = arr[setNo - 1] || {};
    Object.keys(patch).forEach(function (k) {
      if (patch[k] === null || patch[k] === undefined) delete slot[k];
      else slot[k] = patch[k];
    });
    arr[setNo - 1] = Object.keys(slot).length ? slot : null;
    summarise(e);
    commit(exId, h, { id: exId, set: setNo });
  }

  /* the exercise-level writer, kept for callers that have a whole
     session in hand rather than one set of one */
  function record(exId, patch) {
    var h = history(exId);
    var e = entryFor(h);
    Object.keys(patch).forEach(function (k) { e[k] = patch[k]; });
    commit(exId, h, { id: exId });
  }

  /* every exercise that has ever been logged, for export and charts */
  function logged() {
    var out = [];
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf(PREFIX) === 0) out.push({ id: k.slice(PREFIX.length), entries: load(k, []) });
      });
    } catch (e) {}
    return out.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
  }

  /* ── the control on the row ── */

  function armRow(row) {
    if (row.dataset.gbLift) return;

    /* Generated plans name their exercise. The three written programmes
       name their station instead, and a station that carries a single
       lift — hack squat, calf raise — would otherwise be the one row on
       the page you cannot log. Either attribute identifies the lift
       closely enough to hang a weight on. */
    var exId = row.dataset.ex || (row.dataset.eq ? "eq:" + row.dataset.eq : "");
    if (!exId) return;

    /* A plank does not have a working weight. A kg box on one is
       clutter on the row and a lie in the history. */
    var ex = exOf(exId);
    if (ex && ex.kit === "bodyweight") return;

    /* numbered rows only — "·" rows are advice, not sets */
    var idx = $(".wo-idx", row);
    if (!idx || !/^\d+$/.test(idx.textContent.trim())) return;

    var rxEl = $(".wo-rx", row);
    if (!rxEl) return;
    var note = $("small", rxEl);
    var rxText = rxEl.textContent.replace(note ? note.textContent : "", "").trim();

    /* "3 × 8–10" gets a weight. "5 min easy" does not — you do not
       load a treadmill walk, and a kg box on it is just clutter. */
    var m = rxText.match(/^(\d+)\s*[×x]\s*(.+)$/);
    if (!m) return;

    /* session.js has already worked out how many sets this row has, and
       capped it. Ask it rather than parsing the same string twice and
       risking a different answer on the same row. */
    var S = window.GBSession;
    var nSets = (S && S.count(row)) || +m[1];
    var rx = m[2].trim();

    row.dataset.gbLift = "1";

    var host = $(".wo-actions", row);
    if (!host) {
      host = document.createElement("div");
      host.className = "wo-actions";
      row.appendChild(host);
    }

    var name = ($(".wo-name", row).firstChild.textContent || "").trim();
    var meta = { name: name, sets: nSets, reps: rx };
    var sel = (S && S.selected(row)) || 1;
    var suggested = false;      /* the picker is showing last time, unrecorded */

    var wrap = document.createElement("div");
    wrap.className = "lift";

    /* which set this is. One-set rows say nothing, because there is
       nothing to distinguish it from. */
    var setLabel = null, flag = null;
    if (nSets > 1) {
      var head = document.createElement("div");
      head.className = "lift-head";
      setLabel = document.createElement("span");
      setLabel.className = "lift-set";
      head.appendChild(setLabel);
      flag = document.createElement("span");
      flag.className = "lift-flag";
      flag.textContent = "done";
      flag.hidden = true;
      head.appendChild(flag);
      wrap.appendChild(head);
    }

    /* ── the two pickers ──
       Native selects on purpose: the phone gives them its own
       full-height wheel or list, which is a bigger, faster target
       than anything that could be built out of divs, and it works
       with a screen reader and a keyboard for free. */
    function field(cls, labelText) {
      var box = document.createElement("div");
      box.className = "lift-field " + cls;
      var lab = document.createElement("span");
      lab.className = "lift-lab";
      lab.textContent = labelText;
      var sel = document.createElement("select");
      sel.className = "lift-pick";
      box.appendChild(lab);
      box.appendChild(sel);
      wrap.appendChild(box);
      return { box: box, lab: lab, sel: sel };
    }

    var wField = field("lift-w", "Weight");
    var rField = field("lift-r", "Reps");
    var wSel = wField.sel, rSel = rField.sel;

    /* the way out for a stack nobody else has */
    var custom = document.createElement("input");
    custom.type = "number";
    custom.className = "lift-custom";
    custom.inputMode = "decimal";
    custom.step = "0.5";
    custom.min = "0";
    custom.max = "999";
    custom.placeholder = "kg";
    custom.hidden = true;
    wField.box.appendChild(custom);

    /* what the row asked for, kept beside what you did */
    var target = document.createElement("small");
    target.className = "lift-target";
    target.textContent = "target " + rx;
    rField.box.appendChild(target);

    /* and what you did last time, when the picker is showing it */
    var fromLast = document.createElement("small");
    fromLast.className = "lift-target lift-from";
    fromLast.textContent = "from last time";
    fromLast.hidden = true;
    wField.box.appendChild(fromLast);

    /* A set whose weight the reader deliberately cleared must not have
       last week's put back the next time the panel repaints. */
    var declined = {};

    function opt(value, text) {
      var o = document.createElement("option");
      o.value = value;
      o.textContent = text;
      return o;
    }

    function options(sel, values, unit, placeholder, mark, withCustom) {
      sel.innerHTML = "";
      sel.appendChild(opt("", placeholder));
      values.forEach(function (v) {
        sel.appendChild(opt(String(v), num(v) + unit + (mark != null && v === mark ? " · last time" : "")));
      });
      if (withCustom) sel.appendChild(opt("__custom", "+ Custom weight"));
    }

    /* a weight off the ladder — from history, from another gym's stack,
       or typed before these were dropdowns — still has to be selectable */
    function ensure(sel, value, unit) {
      if (value == null || value === "") return;
      var v = String(value);
      for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === v) return;
      var o = opt(v, num(value) + unit);
      var at = null;
      for (var j = 1; j < sel.options.length; j++) {
        var ov = parseFloat(sel.options[j].value);
        if (!isNaN(ov) && ov > +value) { at = sel.options[j]; break; }
      }
      sel.insertBefore(o, at);
    }

    /* how did that set feel */
    var rpeBox = document.createElement("div");
    rpeBox.className = "lift-rpe";
    rpeBox.setAttribute("role", "group");
    var rpeBtns = RPE.map(function (r) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.rpe = r.id;
      b.textContent = r.label;
      b.title = r.hint;
      b.setAttribute("aria-pressed", "false");
      rpeBox.appendChild(b);
      return b;
    });
    wrap.appendChild(rpeBox);

    var say = document.createElement("span");
    say.className = "lift-last";
    wrap.appendChild(say);

    /* the same set, last time it was trained — falling back to the
       session-level figure for history logged before sets existed, or
       for a set that wasn't reached that day */
    function lastTime(n) {
      var prev = previous(exId, iso());
      if (!prev) return null;
      var own = setsOf(prev)[(n || sel) - 1];
      if (own && typeof own.w === "number" && own.w > 0) return own;
      return prev.w ? { w: prev.w, r: prev.ar, rpe: prev.rpe } : null;
    }

    function paint() {
      var mine = setsOf(today(exId))[sel - 1] || null;
      var was = lastTime();

      if (setLabel) setLabel.textContent = "Set " + sel + " of " + nSets;
      if (flag) flag.hidden = !(S && S.isDone(row, sel));

      var of = nSets > 1 ? " for set " + sel + " of " + name : " for " + name;
      wSel.setAttribute("aria-label", "Weight" + of + ", in kilograms");
      rSel.setAttribute("aria-label", "Reps completed" + of);
      custom.setAttribute("aria-label", "Custom weight" + of + ", in kilograms");
      rpeBox.setAttribute("aria-label", "How" + (nSets > 1 ? " set " + sel + " of " : " ") + name + " felt");

      /* the ladder is the same for the row; what is marked on it is not
         — "last time" belongs to this set, not to the exercise */
      options(wSel, ladder(exId, row), " kg", "Select weight", was ? was.w : null, true);
      options(rSel, repLadder(), "", "Select reps", was && was.r ? was.r : null, false);
      ensure(wSel, mine && mine.w, " kg");
      ensure(rSel, mine && mine.r, "");

      /* only this set's numbers, and never the previous set's carried
         forward — people go up and down between sets, and set 2's box
         is not the place to find out what set 1 weighed */
      wSel.value = mine && typeof mine.w === "number" ? String(mine.w) : "";
      rSel.value = mine && mine.r ? String(mine.r) : "";

      /* ── the suggestion ──
         An untouched set opens on the weight this same set used last
         time, so the common case is no taps at all. It is shown, not
         yet recorded: the record is written when the set is ticked off
         (see commit) or when the picker is changed. A number that has
         not been earned yet is drawn as a proposal — dashed, and
         labelled — rather than as something you did. */
      suggested = false;
      if (!mine && was && !declined[sel]) {
        ensure(wSel, was.w, " kg");
        wSel.value = String(was.w);
        suggested = true;
      }
      /* "20 kg · last time" is a useful label to find in an open list and
         too long for the closed box: the mark comes off whichever option
         is actually showing, which is the one that needs no explaining. */
      var shown = wSel.options[wSel.selectedIndex];
      if (shown) shown.textContent = shown.textContent.replace(" · last time", "");

      fromLast.hidden = !suggested;
      wSel.classList.toggle("is-suggested", suggested);
      wSel.classList.toggle("is-empty", wSel.value === "");
      rSel.classList.toggle("is-empty", rSel.value === "");
      custom.hidden = true;
      custom.value = "";
      wSel.hidden = false;

      rpeBtns.forEach(function (b) {
        var on = !!(mine && mine.rpe === b.dataset.rpe);
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.classList.toggle("on", on);
      });

      var bits = [];
      if (was) {
        bits.push("last time " + num(was.w) + " kg" + (was.r ? " × " + was.r : "") +
          (was.rpe ? " · felt " + was.rpe : ""));
        /* the whole point of week 4: turn "felt smooth" into a number */
        if (was.rpe === "easy") bits.push("try " + num(nextUp(exId, row, was.w)));
        else if (was.rpe === "hard") bits.push("stay at " + num(was.w));
      } else {
        bits.push("first time — log what you use and next week has something to beat");
      }
      say.innerHTML = bits.map(function (b, i) {
        return i === 1 ? "<b>" + b + "</b>" : b;
      }).join(" · ");

      /* today's heaviest set against every session before it — not
         against the set on screen */
      var now = today(exId);
      var top = bestBefore(exId, iso());
      if (now && now.w && top && now.w > top) {
        var pr = document.createElement("span");
        pr.className = "lift-pr";
        pr.textContent = "best yet";
        pr.title = "Heaviest set today beats every session before it";
        say.appendChild(document.createTextNode(" "));
        say.appendChild(pr);
      }

      /* plates.js reads this control; tell it the number changed under it */
      wSel.dispatchEvent(new Event("input"));
    }

    function setWeight(v) {
      recordSet(exId, sel, { w: v }, meta);
      paint();
    }

    function openCustom() {
      /* start from whatever the picker is showing — the set's own
         weight, or the suggestion it opened on */
      var mine = setsOf(today(exId))[sel - 1];
      var shown = mine && typeof mine.w === "number" ? mine.w : (suggested && lastTime() ? lastTime().w : null);
      custom.value = shown == null ? "" : num(shown);
      wSel.hidden = true;
      custom.hidden = false;
      try { custom.focus(); } catch (e) {}
    }

    wSel.addEventListener("change", function () {
      if (wSel.value === "__custom") { openCustom(); return; }
      /* choosing the prompt back is a decision, not an accident: it
         clears the set and stops last week's weight reappearing */
      declined[sel] = wSel.value === "";
      setWeight(wSel.value === "" ? null : parseFloat(wSel.value));
    });

    /* commit on change, walk away on Escape or an empty box — a
       half-typed number is not a set */
    custom.addEventListener("change", function () {
      var v = parseFloat(custom.value);
      if (custom.value !== "" && v >= 0 && v < 1000) setWeight(v);
      else paint();
    });
    custom.addEventListener("blur", function () { if (!custom.hidden) paint(); });
    custom.addEventListener("keydown", function (e) {
      if (e.key === "Escape") paint();
      if (e.key === "Enter") { e.preventDefault(); custom.blur(); }
    });

    rSel.addEventListener("change", function () {
      recordSet(exId, sel, { r: rSel.value === "" ? null : parseInt(rSel.value, 10) }, meta);
      paint();
    });

    rpeBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var already = b.getAttribute("aria-pressed") === "true";
        recordSet(exId, sel, { rpe: already ? null : b.dataset.rpe }, meta);
        paint();
      });
    });

    /* Ticking a set off is the moment a suggested weight becomes a
       record: you have now done the set, and the number on screen is
       what you did it with. Only on the tap that changed it — merely
       looking at a set you finished earlier writes nothing. */
    function commitSuggestion(n) {
      /* the set being ticked, which is not always the one on screen:
         tapping straight down the row — 1, 2, 3 — ticks each set off
         before its own panel has ever been looked at */
      if (setsOf(today(exId))[n - 1] || declined[n]) return;
      var was = lastTime(n);
      if (was) recordSet(exId, n, { w: was.w }, meta);
    }

    /* session.js says which set is on screen — including on the tap
       that ticks one off, so the panel follows your thumb */
    row.addEventListener("gb:set", function (e) {
      var d = e.detail || {};
      if (d.toggled && d.done && d.set) commitSuggestion(d.set);
      if (d.set) sel = d.set;
      paint();
    });

    paint();
    host.appendChild(wrap);
  }

  function arm(scope) {
    $$(".wo-row", scope || document).forEach(armRow);
    if (scope && scope.classList && scope.classList.contains("wo-row")) armRow(scope);
  }

  /* ═══ getting it back out ═══
     A log you cannot read anywhere else isn't a record, it's a
     hostage. This is the whole history as a spreadsheet: one row
     per exercise per day, oldest first, so it opens in anything
     and sorts the way a training log is read.

     The name is stored on the entry rather than looked up now, so
     a lift that later leaves data.js still exports under the name
     it was logged with. */

  function label(id) {
    var ex = exOf(id);
    if (ex) return ex.name;
    if (id.indexOf("eq:") === 0) {
      var st = GB && GB.EQ_BY_ID && GB.EQ_BY_ID[id.slice(3)];
      if (st) return st.name;
    }
    return id;
  }

  function cell(v) {
    var s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /* the sets behind the summary, in one cell: "1: 10×12 easy | 2: …".
     Numbered, so a set that was skipped cannot be read as the one
     after it. Appended as the last column, so anything already
     reading the first seven goes on working. */
  function detail(en) {
    return setsOf(en).map(function (x, i) {
      if (!x) return "";
      var bits = (x.w == null ? "" : num(x.w)) + (x.r ? "×" + x.r : "");
      if (!bits && !x.rpe) return "";
      return (i + 1) + ": " + (bits || "—") + (x.rpe ? " " + x.rpe : "");
    }).filter(Boolean).join(" | ");
  }

  function rows() {
    var out = [];
    logged().forEach(function (e) {
      e.entries.forEach(function (en) {
        out.push({
          date: en.d,
          exercise: en.name || label(e.id),
          id: e.id,
          weight: en.w == null ? "" : en.w,
          sets: en.sets == null ? "" : en.sets,
          reps: en.reps == null ? "" : en.reps,
          felt: en.rpe || "",
          detail: detail(en)
        });
      });
    });
    return out.sort(function (a, b) {
      return a.date === b.date ? (a.exercise < b.exercise ? -1 : 1) : (a.date < b.date ? -1 : 1);
    });
  }

  function csv() {
    var head = ["date", "exercise", "exercise_id", "weight_kg", "sets", "reps", "felt", "sets_detail"];
    var body = rows().map(function (r) {
      return [r.date, r.exercise, r.id, r.weight, r.sets, r.reps, r.felt, r.detail].map(cell).join(",");
    });
    return [head.join(",")].concat(body).join("\r\n");
  }

  function download() {
    var text = csv();
    var name = "gym-basics-log-" + iso() + ".csv";
    try {
      var blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) { return false; }
  }

  /* The button mounts itself into any page that offers a hook, and
     stays away when there is nothing logged — an export button over
     an empty log is a promise the page can't keep. */
  function mountExport() {
    var host = $("#gbExport");
    if (!host) return;
    var n = rows().length;
    host.innerHTML = "";
    if (!n) {
      host.appendChild(el("p", "gb-export-empty",
        "Nothing logged yet. Put a weight in the kg box on any workout row and it starts building here."));
      return;
    }
    var days = {};
    rows().forEach(function (r) { days[r.date] = 1; });
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-sm";
    btn.textContent = "Download my log (CSV)";
    btn.addEventListener("click", function () {
      if (!download()) window.alert("This browser wouldn't let the file download. Try a different one.");
    });
    host.appendChild(btn);
    host.appendChild(el("p", "gb-export-count",
      n + (n === 1 ? " entry" : " entries") + " across " +
      Object.keys(days).length + " day" + (Object.keys(days).length === 1 ? "" : "s") + "."));
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    n.className = cls;
    n.textContent = text;
    return n;
  }

  arm(document);
  mountExport();
  document.addEventListener("gb:plan", function (e) { arm(e.target || document); });
  document.addEventListener("gb:rows", function (e) { arm(e.target || document); });
  document.addEventListener("gb:lift", mountExport);

  window.GBLift = {
    history: history, previous: previous, best: best, bestBefore: bestBefore, step: step,
    record: record, recordSet: recordSet, summarise: summarise, sets: setsOf,
    ladder: ladder, segments: segments, nextUp: nextUp,
    logged: logged, arm: arm, RPE: RPE, PREFIX: PREFIX, label: label,
    rows: rows, csv: csv, download: download, mountExport: mountExport
  };
})();
