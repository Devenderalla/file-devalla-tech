/* ═══════════════════════════════════════════════════════════
   Gym Basics — progressive overload
   The history lift.js has been keeping, read as a line rather
   than a list.

   lift.js answers "what did I do last time". That is the
   question you have at the rack. The one you have at home is
   "am I actually getting stronger", and a log that can only be
   read one row at a time cannot answer it — which is how people
   end up doing the same weight for four months and calling it
   training.

   One row per week, per exercise. Overload is not only load:
   a week that added two reps at the same weight progressed,
   and this says so rather than reporting it as a plateau.

   Reads what lift.js already stores. Writes nothing.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var L = window.GBLift;
  if (!L) return;

  var DAY = 864e5;
  var SHOWN = 8;                      /* weeks visible before "show all" */
  var STALL = 3;                      /* weeks with nothing added = stalled */

  function $(s, el) { return (el || document).querySelector(s); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function num(n) {
    return Math.round(n * 100) / 100 + "";
  }

  /* "8–10" is a range, "10" is a number, "45 sec" is neither a
     rep count nor our business. The middle of the range is what
     gets compared week to week — a prescription that reads 8–10
     both weeks did not change, whatever was actually done. */
  function reps(v) {
    if (v == null) return null;
    var m = String(v).match(/\d+(?:\.\d+)?/g);
    if (!m) return null;
    return m.length > 1 ? (+m[0] + +m[1]) / 2 : +m[0];
  }

  /* Weeks start on Monday, because training weeks do. Sunday
     belongs to the week it finished, not the one it precedes. */
  function monday(d) {
    var t = Date.parse(d + "T00:00:00Z");
    if (isNaN(t)) return d;
    var wd = (new Date(t).getUTCDay() + 6) % 7;
    return new Date(t - wd * DAY).toISOString().slice(0, 10);
  }

  function weekNo(key, first) {
    return Math.round((Date.parse(key + "T00:00:00Z") - Date.parse(first + "T00:00:00Z")) / (7 * DAY)) + 1;
  }

  /* ── what changed between two weeks ──
     Asked in the order a lifter would ask it: heavier first,
     then more reps, then more sets. "Held" is a real answer and
     is not dressed up as one of the others. */
  function change(prev, cur) {
    if (!prev) return { kind: "first", text: "first logged" };
    if (cur.w > prev.w) return { kind: "up", text: "+" + num(cur.w - prev.w) + " kg" };
    if (cur.w < prev.w) return { kind: "down", text: "−" + num(prev.w - cur.w) + " kg" };

    /* Reps actually completed beat the prescription, when both weeks have
       them — "8–12" both weeks says nothing about what was done in them.
       Sessions logged before sets carried their own rep counts only have
       the prescription, so they are still compared on that. */
    var actual = prev.ar != null && cur.ar != null;
    var a = actual ? prev.ar : reps(prev.reps);
    var b = actual ? cur.ar : reps(cur.reps);
    if (a != null && b != null && b !== a) {
      var d = num(Math.abs(b - a));
      return b > a
        ? { kind: "up", text: "+" + d + (d === "1" ? " rep" : " reps") }
        : { kind: "down", text: "−" + d + (d === "1" ? " rep" : " reps") };
    }
    if (cur.sets && prev.sets && cur.sets !== prev.sets) {
      var s = Math.abs(cur.sets - prev.sets);
      return cur.sets > prev.sets
        ? { kind: "up", text: "+" + s + (s === 1 ? " set" : " sets") }
        : { kind: "down", text: "−" + s + (s === 1 ? " set" : " sets") };
    }
    return { kind: "held", text: "held" };
  }

  /* ── one exercise, week by week ──
     A week is represented by its heaviest session, and by the
     most work at that weight if there were two. Averaging a
     heavy day with a light one describes a session nobody had. */
  function series(exId) {
    var log = L.history(exId).filter(function (e) { return typeof e.w === "number" && e.w > 0; });
    if (!log.length) return [];

    var byWeek = {}, keys = [];
    log.forEach(function (e) {
      var k = monday(e.d);
      if (!byWeek[k]) { byWeek[k] = { key: k, sessions: 0, top: null }; keys.push(k); }
      var wk = byWeek[k];
      wk.sessions++;
      /* the day's real tonnage where the sets were logged one by one,
         the prescription's estimate where they weren't — so a week that
         added reps at the same weight cannot read as a stall */
      var vol = e.vol != null ? e.vol : e.w * (e.sets || 1) * (reps(e.reps) || 1);
      if (!wk.top || e.w > wk.top.w || (e.w === wk.top.w && vol > wk.top.volume)) {
        wk.top = {
          w: e.w, sets: e.sets || null, reps: e.reps || null, ar: e.ar == null ? null : e.ar,
          rpe: e.rpe || null, volume: vol, day: e.d
        };
      }
    });
    keys.sort();

    var out = keys.map(function (k) {
      var wk = byWeek[k], t = wk.top;
      return {
        key: k, n: weekNo(k, keys[0]), sessions: wk.sessions,
        w: t.w, sets: t.sets, reps: t.reps, ar: t.ar, rpe: t.rpe, volume: t.volume, day: t.day
      };
    });
    out.forEach(function (wk, i) { wk.change = change(out[i - 1], wk); });
    return out;
  }

  /* ── is this going anywhere ──
     Three weeks with nothing added is the thing worth saying out
     loud; everything else the rows already show. The nudge only
     appears when the last week did not feel hard, because "add
     2.5 kg" to somebody whose form was going is bad advice. */
  function verdict(exId, s) {
    s = s || series(exId);
    if (!s.length) return null;
    var last = s[s.length - 1];

    if (s.length === 1) {
      return { kind: "new", text: "First week logged. Next week has something to beat." };
    }

    var flat = 1, from = s.length - 1;
    for (var i = s.length - 2; i >= 0; i--) {
      if (s[i].w === last.w && s[i].volume === last.volume) { flat++; from = i; } else break;
    }
    if (flat >= STALL) {
      /* Three weeks running and three weeks logged across a month are
         not the same claim, and the rows above will show which it was. */
      var run = last.n - s[from].n === flat - 1 ? " weeks" : " logged weeks";
      var t = flat + run + " at " + num(last.w) + " kg with the same sets and reps.";
      if (last.rpe === "hard") t += " It felt hard last time — hold here until it doesn't.";
      /* the next rung this station actually has, not a generic jump —
         "add 5 kg" to a leg press that steps in 10s is not a weight */
      else {
        var up = L.nextUp ? L.nextUp(exId, null, last.w) - last.w : L.step(exId);
        t += " Add " + num(up) + " kg, or a rep on every set.";
      }
      return { kind: "stall", text: t };
    }

    if (last.change.kind === "up") {
      return { kind: "up", text: "Up on last week — " + last.change.text + ". That is progressive overload." };
    }
    if (last.change.kind === "down") {
      return { kind: "down", text: "Down on last week. One bad day is a bad day, not a trend." };
    }
    return { kind: "held", text: "Same as last week. Two in a row is fine; three is a plateau." };
  }

  function nameOf(id, log) {
    for (var i = log.length - 1; i >= 0; i--) if (log[i].name) return log[i].name;
    return L.label ? L.label(id) : id;
  }

  /* every logged exercise, most recently trained first */
  function summary() {
    return L.logged().map(function (e) {
      var s = series(e.id);
      if (!s.length) return null;
      return { id: e.id, name: nameOf(e.id, e.entries), series: s, verdict: verdict(e.id, s) };
    }).filter(Boolean).sort(function (a, b) {
      var x = a.series[a.series.length - 1].key, y = b.series[b.series.length - 1].key;
      return x === y ? (a.name < b.name ? -1 : 1) : (x < y ? 1 : -1);
    });
  }

  /* ── the shape of the line ──
     Decoration for the numbers beside it, not a replacement for
     them, so it is hidden from screen readers and carries no
     axis. Flat logs draw a flat line rather than a full-height
     one — a normaliser that makes 20,20,20 look like a climb is
     worse than no chart. */
  function spark(s) {
    var w = 140, h = 30, pad = 3;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "pov-spark");
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    var vals = s.map(function (x) { return x.w; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var span = hi - lo;
    var stepX = s.length > 1 ? (w - pad * 2) / (s.length - 1) : 0;

    var pts = vals.map(function (v, i) {
      var y = span ? h - pad - ((v - lo) / span) * (h - pad * 2) : h / 2;
      return [pad + i * stepX, y];
    });

    var line = document.createElementNS(svg.namespaceURI, "polyline");
    line.setAttribute("class", "pov-line");
    line.setAttribute("points", pts.map(function (p) { return p[0] + "," + p[1]; }).join(" "));
    svg.appendChild(line);

    pts.forEach(function (p, i) {
      var c = document.createElementNS(svg.namespaceURI, "circle");
      c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", 2.5);
      if (i === pts.length - 1) c.setAttribute("class", "pov-dot pov-dot-now");
      else c.setAttribute("class", "pov-dot");
      svg.appendChild(c);
    });
    return svg;
  }

  function weekRow(wk, top) {
    var li = el("li", "pov-week" + (wk.w >= top ? " is-best" : ""));
    li.appendChild(el("span", "pov-n", "week " + wk.n));

    /* the reps that were done, where they were logged; the prescription
       where they weren't */
    var r = wk.ar == null ? wk.reps : wk.ar;
    var load = num(wk.w) + " kg";
    if (wk.sets && r) load += " · " + wk.sets + " × " + r;
    else if (r) load += " · " + r;
    li.appendChild(el("span", "pov-load", load));

    li.appendChild(el("span", "pov-d pov-d-" + wk.change.kind, wk.change.text));
    return li;
  }

  function card(ex) {
    var s = ex.series;
    var top = s.reduce(function (a, x) { return x.w > a ? x.w : a; }, 0);
    var art = el("article", "pov-card");

    var head = el("header", "pov-head");
    head.appendChild(el("h3", null, ex.name));
    var now = el("span", "pov-now", num(s[s.length - 1].w) + " kg");
    now.title = "Heaviest working weight last week logged";
    head.appendChild(now);
    art.appendChild(head);

    if (s.length > 1) art.appendChild(spark(s));

    var list = el("ul", "pov-weeks");
    var hidden = [];
    s.forEach(function (wk, i) {
      var prev = s[i - 1];
      var rows = [];
      if (prev && wk.n - prev.n > 1) {
        var off = wk.n - prev.n - 1;
        rows.push(el("li", "pov-gap", off === 1 ? "a week off" : off + " weeks off"));
      }
      rows.push(weekRow(wk, top));
      rows.forEach(function (r) {
        list.appendChild(r);
        if (i < s.length - SHOWN) { r.hidden = true; hidden.push(r); }
      });
    });
    art.appendChild(list);

    if (hidden.length) {
      var more = el("button", "pov-more", "Show all " + s.length + " weeks");
      more.type = "button";
      more.addEventListener("click", function () {
        hidden.forEach(function (r) { r.hidden = false; });
        more.parentNode.removeChild(more);
      });
      art.appendChild(more);
    }

    if (ex.verdict) art.appendChild(el("p", "pov-say pov-say-" + ex.verdict.kind, ex.verdict.text));
    return art;
  }

  function mount() {
    var host = $("#gbProgress");
    if (!host) return;
    var all = summary();
    host.innerHTML = "";

    if (!all.length) {
      host.appendChild(el("p", "gb-export-empty",
        "Nothing to plot yet. Log a weight on two different weeks and the line starts here."));
      return;
    }

    var stalled = all.filter(function (e) { return e.verdict && e.verdict.kind === "stall"; }).length;
    var lede = all.length + (all.length === 1 ? " exercise" : " exercises") + " tracked";
    if (stalled) lede += " · " + stalled + " going nowhere";
    host.appendChild(el("p", "pov-lede", lede + "."));

    var list = el("div", "pov-list");
    all.forEach(function (ex) { list.appendChild(card(ex)); });
    host.appendChild(list);
  }

  mount();
  document.addEventListener("gb:lift", mount);

  window.GBProgress = {
    series: series, verdict: verdict, summary: summary,
    change: change, monday: monday, reps: reps, mount: mount
  };
})();
