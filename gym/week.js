/* ═══════════════════════════════════════════════════════════
   Gym Basics — Build my week
   The UI over plan.js: the wizard, the seven-day view, the
   guided day, and the "today" card on the homepage.

   The plan itself is generated once and stored, so Monday's
   session does not quietly change between visits. Everything
   stays in localStorage — nothing leaves the device.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var GB = window.GB, GBP = window.GBPlan;
  if (!GB || !GBP) return;

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  var KEY = "gb:week", DONE_KEY = "gb:week:done";
  var LV_LABEL = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };
  var LV_TAG = { 1: "tag-beg", 2: "tag-int", 3: "tag-adv" };
  var KIT_LABEL = { machine: "Machine", cable: "Cable", dumbbell: "Dumbbells", barbell: "Barbell", kettlebell: "Kettlebell", bodyweight: "Bodyweight", cardio: "Cardio" };

  function load(k, f) { try { return JSON.parse(localStorage.getItem(k)) || f; } catch (e) { return f; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function getPlan() { return load(KEY, null); }
  function getDone() { return load(DONE_KEY, {}); }
  function dayKey(plan, dow) { return "w" + plan.weekNumber + ":" + dow; }
  function isDone(plan, dow) { return !!getDone()[dayKey(plan, dow)]; }

  /* session.js files each day's ticks under its own bucket; read them back so
     a half-finished day doesn't look untouched on the week view */
  function dayProgress(plan, day) {
    if (day.type !== "train") return null;
    var total = 0;
    day.blocks.forEach(function (b) {
      b.items.forEach(function (it) { total += (it.rx && it.rx.sets) || 1; });
    });
    var ticks = load("gb:sets:week:w" + plan.weekNumber + ":d" + day.dow, {});
    var hit = Object.keys(ticks).length;
    return { hit: Math.min(hit, total), total: total, pct: total ? Math.min(hit, total) / total * 100 : 0 };
  }

  function rxText(rx) {
    if (!rx) return "";
    if (rx.time) return rx.time;
    return rx.sets + " × " + rx.reps;
  }

  /* ═══ the seven-day view ═══ */

  function dayCard(plan, day, today) {
    var done = day.type === "train" && isDone(plan, day.dow);
    var cls = "day-card is-" + day.type + (day.dow === today ? " is-today" : "") + (done ? " is-done" : "");
    var body;
    if (day.type === "train") {
      var pr = dayProgress(plan, day);
      var started = pr && pr.hit > 0 && !done;
      if (started) cls += " is-started";
      body =
        "<h3>" + esc(day.name) + "</h3>" +
        '<p class="day-meta">' + day.count + " exercises · ~" + day.minutes + " min</p>" +
        (started
          ? '<div class="day-meter" role="img" aria-label="' + pr.hit + " of " + pr.total + ' sets done">' +
              '<i style="width:' + pr.pct.toFixed(0) + '%"></i></div>' +
            '<span class="day-partial">' + pr.hit + " / " + pr.total + " sets</span>"
          : "") +
        '<a class="btn ' + (day.dow === today ? "btn-primary" : "btn-ghost") + ' btn-sm" href="workout.html?d=' + day.dow + '">' +
          (done ? "Do it again" : started ? "Resume" : "Start workout") + "</a>";
    } else {
      body =
        "<h3>" + esc(day.name) + "</h3>" +
        '<ul class="day-sugg">' + day.suggestions.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>";
    }
    return el(
      '<article class="' + cls + '">' +
        '<span class="day-dow">' + esc(day.dayName) + (day.dow === today ? " <b>· today</b>" : "") + "</span>" +
        body +
        (done ? '<span class="day-done">✓ done</span>' : "") +
      "</article>"
    );
  }

  function renderWeek(plan, into) {
    var today = GBP.todayIndex();
    var trained = plan.week.filter(function (d) { return d.type === "train"; });
    var complete = trained.filter(function (d) { return isDone(plan, d.dow); }).length;

    into.innerHTML = "";
    into.appendChild(el(
      '<div class="plan-head">' +
        "<h2>Your week</h2>" +
        '<span class="mono">' + esc(LV_LABEL[plan.level]) + " · " + plan.days + " days · " +
          esc(GB.GOALS[plan.goal]) + " · " + plan.duration + " min</span>" +
      "</div>"
    ));
    into.appendChild(el(
      '<div class="week-banner">' +
        '<span class="mono">Week ' + plan.weekNumber + " · " + esc(plan.focus) + "</span>" +
        "<p>" + esc(plan.note) + "</p>" +
        '<div class="week-meter"><i style="width:' + (trained.length ? complete / trained.length * 100 : 0) + '%"></i></div>' +
        '<span class="mono week-count">' + complete + " of " + trained.length + " sessions done</span>" +
      "</div>"
    ));

    var grid = el('<div class="week-days"></div>');
    plan.week.forEach(function (d) { grid.appendChild(dayCard(plan, d, today)); });
    into.appendChild(grid);

    var acts = el(
      '<div class="week-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm" id="wkEdit">Edit plan</button> ' +
        '<button type="button" class="btn btn-ghost btn-sm" id="wkRegen">Regenerate this week</button> ' +
        '<button type="button" class="btn btn-ghost btn-sm" id="wkClear">Start over</button> ' +
        (complete === trained.length && trained.length
          ? '<button type="button" class="btn btn-primary btn-sm" id="wkNext">Start week ' + (plan.weekNumber + 1) + "</button>"
          : "") +
      "</div>"
    );
    into.appendChild(acts);

    $("#wkEdit", acts).addEventListener("click", function () {
      var w = $("#weekWizard");
      if (w) { w.hidden = false; if (w.scrollIntoView) w.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
    $("#wkRegen", acts).addEventListener("click", function () {
      /* same level, days and goal — a different arrangement of them */
      var next = GBP.generate({
        level: plan.level, days: plan.days, goal: plan.goal, duration: plan.duration,
        kit: plan.kit, weekNumber: plan.weekNumber, seed: (plan.seed || 0) + 1
      });
      save(KEY, next);
      save(DONE_KEY, {});
      renderWeek(next, into);
    });
    $("#wkClear", acts).addEventListener("click", function () {
      if (!window.confirm("Delete this plan and start the questions again? Your set progress goes too.")) return;
      try {
        Object.keys(localStorage).filter(function (k) {
          return k === KEY || k === DONE_KEY || k.indexOf("gb:sets:week:") === 0;
        }).forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {}
      into.hidden = true;
      into.innerHTML = "";
      var wz = $("#weekWizard");
      if (wz) { wz.hidden = false; if (wz.scrollIntoView) wz.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });

    var nextBtn = $("#wkNext", acts);
    if (nextBtn) nextBtn.addEventListener("click", function () {
      var next = GBP.generate({
        level: plan.level, days: plan.days, goal: plan.goal, duration: plan.duration,
        kit: plan.kit, weekNumber: plan.weekNumber + 1, seed: plan.seed
      });
      save(KEY, next);
      save(DONE_KEY, {});
      renderWeek(next, into);
      if (into.scrollIntoView) into.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ═══ the wizard ═══ */

  var wizard = $("#weekWizard");
  var weekOut = $("#weekOut");
  if (wizard && weekOut) {
    var existing = getPlan();
    var W = existing
      ? { level: existing.level, days: existing.days, goal: existing.goal, duration: existing.duration, kit: existing.kit || "full" }
      : { level: 1, days: 3, goal: "fitness", duration: 45, kit: "full" };

    function press(attr, val) {
      $$("[data-" + attr + "]").forEach(function (b) {
        var v = b.dataset[attr.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })];
        b.setAttribute("aria-pressed", String(v) === String(val) ? "true" : "false");
      });
    }
    function wire(attr, key, cast) {
      $$("[data-" + attr + "]").forEach(function (b) {
        b.addEventListener("click", function () {
          W[key] = cast(b.dataset[attr.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })]);
          press(attr, W[key]);
          hint();
        });
      });
      press(attr, W[key]);
    }
    var num = function (v) { return +v; }, str = function (v) { return v; };
    wire("w-level", "level", num);
    wire("w-days", "days", num);
    wire("w-goal", "goal", str);
    wire("w-duration", "duration", num);
    wire("w-kit", "kit", str);

    /* honest note when the frequency outruns what the level needs */
    function hint() {
      var h = $("#weekHint");
      if (!h) return;
      var split = GBP.SPLITS[W.level][W.days] || [];
      var lifting = split.filter(function (t) { return t !== "cardio"; }).length;
      if (W.level === 1 && W.days >= 5) {
        h.hidden = false;
        h.innerHTML = "<b>" + W.days + " days is more than a beginner needs.</b> Your week will hold " +
          lifting + " lifting sessions plus cardio and active recovery — that is what actually builds the habit " +
          "without outrunning your recovery. More days is not automatically better.";
      } else { h.hidden = true; }
    }
    hint();

    $("#weekBuild").addEventListener("click", function () {
      var plan = GBP.generate({
        level: W.level, days: W.days, goal: W.goal, duration: W.duration, kit: W.kit,
        weekNumber: 1, seed: 0
      });
      save(KEY, plan);
      save(DONE_KEY, {});
      wizard.hidden = true;
      weekOut.hidden = false;
      renderWeek(plan, weekOut);
      if (weekOut.scrollIntoView) weekOut.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    if (existing) {
      wizard.hidden = true;
      weekOut.hidden = false;
      renderWeek(existing, weekOut);
    }
  }

  /* ═══ the guided day ═══ */

  var woOut = $("#workoutOut");
  if (woOut) {
    var plan = getPlan();
    var dow = +(new URLSearchParams(location.search).get("d"));
    if (isNaN(dow)) dow = GBP.todayIndex();
    var day = plan && plan.week[dow];

    if (!plan) {
      woOut.innerHTML = '<div class="empty-note"><b>You don\'t have a week yet.</b><br>' +
        '<a href="week.html">Build my week</a> takes about twenty seconds.</div>';
    } else if (!day || day.type !== "train") {
      woOut.innerHTML = '<div class="empty-note"><b>' + esc(day ? day.dayName : "That day") +
        ' is a recovery day.</b><br>' + (day && day.suggestions ? esc(day.suggestions[0]) + "<br>" : "") +
        '<a href="week.html">Back to your week</a></div>';
    } else {
      var n = 0, html = "";
      day.blocks.forEach(function (b) {
        html += '<p class="plan-phase-label">' + esc(b.label) + "</p><div class=\"wo\">";
        b.items.forEach(function (it) {
          n++;
          var sub = KIT_LABEL[it.kit] || "";
          if (it.prev) sub += " · up from " + it.prev + " last week";
          if (it.eq && GB.EQ_BY_ID[it.eq]) {
            sub += ' · <a href="equipment.html#eq-' + esc(it.eq) + '">how to use it</a>';
          }
          html +=
            '<div class="wo-row" data-ex="' + esc(it.id) + '"' +
              (it.eq ? ' data-eq="' + esc(it.eq) + '"' : "") + ">" +
              '<span class="wo-idx">' + (n < 10 ? "0" + n : n) + "</span>" +
              '<span class="wo-name">' + esc(it.name) + "<small>" + sub + "</small></span>" +
              '<span class="wo-target">' + esc(it.muscles || "") + "</span>" +
              '<span class="wo-rx">' + esc(rxText(it.rx)) +
                (it.rx && it.rx.rest ? "<small>rest " + it.rx.rest + "s</small>" : "") +
              "</span>" +
            "</div>";
        });
        html += "</div>";
      });

      woOut.innerHTML = html;
      /* each day gets its own bucket so Monday's ticks are not Tuesday's */
      woOut.dataset.sessionKey = "week:w" + plan.weekNumber + ":d" + dow;

      var head = $("#workoutHead");
      if (head) {
        head.innerHTML =
          '<span class="eyebrow">' + esc(day.dayName) + " · Week " + plan.weekNumber + "</span>" +
          '<h1 class="h-sec">' + esc(day.name) + "</h1>" +
          '<p class="lede">' + day.count + " exercises · about " + day.minutes + " minutes · " +
            esc(plan.focus).toLowerCase() + "</p>" +
          '<span class="tag ' + LV_TAG[plan.level] + '">' + esc(LV_LABEL[plan.level]) + " · " + esc(GB.GOALS[plan.goal]) + "</span>";
      }

      var done = $("#workoutDone");
      if (done) {
        done.hidden = false;
        if (isDone(plan, dow)) done.querySelector("button").textContent = "Marked complete ✓";
        done.querySelector("button").addEventListener("click", function () {
          var d = getDone();
          d[dayKey(plan, dow)] = 1;
          save(DONE_KEY, d);
          location.href = "week.html";
        });
      }

      /* move through the week without going back to the plan */
      var nav = $("#workoutNav");
      if (nav) {
        var trainDays = plan.week.filter(function (x) { return x.type === "train"; }).map(function (x) { return x.dow; });
        var at = trainDays.indexOf(dow);
        var prev = at > 0 ? trainDays[at - 1] : null;
        var next = at > -1 && at < trainDays.length - 1 ? trainDays[at + 1] : null;
        nav.innerHTML =
          (prev !== null ? '<a class="btn btn-ghost btn-sm" href="workout.html?d=' + prev + '">← ' + esc(plan.week[prev].name) + "</a>" : "<span></span>") +
          (next !== null ? '<a class="btn btn-ghost btn-sm" href="workout.html?d=' + next + '">' + esc(plan.week[next].name) + " →</a>" : "<span></span>");
        nav.hidden = false;
      }

      /* tell session.js there are fresh rows to enhance */
      woOut.dispatchEvent(new CustomEvent("gb:plan", { bubbles: true }));
    }
  }

  /* ═══ today, on the homepage ═══ */

  var todayBox = $("#todayCard");
  if (todayBox) {
    var p = getPlan();
    if (!p) {
      todayBox.innerHTML =
        '<div class="today-inner today-empty">' +
          '<span class="eyebrow">Start here</span>' +
          "<h2>Build your training week</h2>" +
          "<p>Three questions — your level, how many days you can train, and what you're training for — " +
          "and you get a week with every session planned, ready to follow in the gym.</p>" +
          '<a class="btn btn-primary" href="week.html">Build my week</a>' +
        "</div>";
    } else {
      var t = GBP.todayIndex(), d = p.week[t];
      var complete = d.type === "train" && isDone(p, t);
      todayBox.innerHTML =
        '<div class="today-inner is-' + d.type + '">' +
          '<span class="eyebrow">Today · ' + esc(d.dayName) + "</span>" +
          "<h2>" + esc(d.name) + "</h2>" +
          (d.type === "train"
            ? "<p>" + d.count + " exercises · about " + d.minutes + " minutes · week " + p.weekNumber + ", " + esc(p.focus).toLowerCase() + "</p>" +
              '<a class="btn btn-primary" href="workout.html?d=' + t + '">' + (complete ? "Do it again" : "Start today's workout") + "</a> " +
              '<a class="btn btn-ghost" href="week.html">See the week</a>'
            : '<ul class="day-sugg">' + d.suggestions.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" +
              '<a class="btn btn-ghost" href="week.html">See the week</a>') +
        "</div>";
    }
    todayBox.hidden = false;
  }
})();
