/* ═══════════════════════════════════════════════════════════
   Gym Basics — nutrition UI
   The UI over nutrition.js, the way week.js is the UI over
   plan.js: the profile form, today's numbers, the week strip,
   the worked example of what it looks like as food, and the
   weight trend that checks the whole thing against reality.

   Renders three places: nutrition.html (everything), the
   homepage fuel card, and the line under a finished workout.
   Nothing leaves the device.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var GB = window.GB, GBP = window.GBPlan, GN = window.GBNutri, GF = window.GBFood;
  if (!GN || !GF) return;

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
  function load(k, f) { try { return JSON.parse(localStorage.getItem(k)) || f; } catch (e) { return f; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var PKEY = "gb:profile", WKEY = "gb:weightlog", PLAN_KEY = "gb:week", DONE_KEY = "gb:week:done",
      AKEY = "gb:nutri:adj";

  function getProfile() { return load(PKEY, null); }
  function getPlan() { return load(PLAN_KEY, null); }

  /* The correction the scale has argued for, if it has been accepted.
     It is a fact about how wrong the estimate is for this body, so it
     outlives a goal change — but the band it was judged against does
     not, so changing goal restarts the evidence clock rather than
     throwing the measurement away. */
  function getAdjust(plan) {
    var a = load(AKEY, null);
    if (!a || typeof a.kcal !== "number") return { kcal: 0, since: null, goal: plan && plan.goal };
    if (plan && a.goal && a.goal !== plan.goal) {
      a = { kcal: a.kcal, since: iso(), goal: plan.goal, at: a.at };
      save(AKEY, a);
    }
    return a;
  }
  function adjOf(plan) { return { adjust: getAdjust(plan).kcal }; }
  function pretty(d) {
    if (!d) return "";
    var m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var t = new Date(d);
    return isNaN(t) ? "" : t.getDate() + " " + m[t.getMonth()];
  }
  function signed(n) { return n === 0 ? "0" : (n > 0 ? "+" : "−") + Math.abs(n); }
  function today() { return GBP ? GBP.todayIndex() : (new Date().getDay() + 6) % 7; }
  function todayDay(plan) { return plan ? plan.week[today()] : null; }
  function iso(d) { return (d || new Date()).toISOString().slice(0, 10); }

  /* how much of today's session is actually ticked off — the same
     buckets session.js writes, read the same way week.js reads them */
  function sessionProgress(plan, day) {
    if (!plan || !day || day.type !== "train") return null;
    var total = 0;
    day.blocks.forEach(function (b) {
      b.items.forEach(function (it) { total += (it.rx && it.rx.sets) || 1; });
    });
    var ticks = load("gb:sets:week:w" + plan.weekNumber + ":d" + day.dow, {});
    var hit = Math.min(Object.keys(ticks).length, total);
    return { hit: hit, total: total, frac: total ? hit / total : 0 };
  }

  /* ═══ profile form ═══ */

  function readForm(form) {
    var v = function (n) { return $('[name="' + n + '"]', form); };
    var pressed = function (n, d) {
      var b = $('[name="' + n + '"][aria-pressed="true"]', form);
      return b ? b.dataset.val : d;
    };
    return {
      sex: pressed("sex", "male"),
      diet: pressed("diet", "veg"),
      activity: pressed("activity", "sitting"),
      age: +v("age").value,
      heightCm: +v("height").value,
      weightKg: +v("weight").value,
      updated: iso()
    };
  }

  function wireForm(form, existing, onSave) {
    var p = existing || { sex: "male", diet: "veg", activity: "sitting", age: 25, heightCm: 170, weightKg: 70 };
    if (!p.activity) p.activity = "sitting";
    ["age", "height", "weight"].forEach(function (n) {
      var input = $('[name="' + n + '"]', form);
      if (input) input.value = n === "height" ? p.heightCm : n === "weight" ? p.weightKg : p.age;
    });
    ["sex", "diet", "activity"].forEach(function (group) {
      $$('[name="' + group + '"]', form).forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.val === p[group] ? "true" : "false");
        b.addEventListener("click", function () {
          $$('[name="' + group + '"]', form).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
        });
      });
    });

    $(".nutri-save", form).addEventListener("click", function () {
      var next = readForm(form);
      var err = $(".nutri-err", form);
      if (!GN.validProfile(next)) {
        err.hidden = false;
        err.textContent = "Check the numbers — height in centimetres, weight in kilograms, and an age between 14 and 99.";
        return;
      }
      err.hidden = true;
      save(PKEY, next);

      /* first weight is the start of the trend line */
      var log = load(WKEY, []);
      if (!log.length || log[log.length - 1].kg !== next.weightKg) {
        log.push({ d: iso(), kg: next.weightKg });
        save(WKEY, log.slice(-60));
      }
      onSave(next);
    });
  }

  /* ═══ rendering pieces ═══ */

  function macroRow(name, grams, kcalEach, total, cls) {
    var kcal = grams * kcalEach;
    var pct = total ? kcal / total * 100 : 0;
    return '<div class="macro">' +
      '<span class="macro-name">' + name + "</span>" +
      '<span class="macro-g">' + grams + "<i>g</i></span>" +
      '<div class="macro-bar ' + cls + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<span class="macro-pct">' + Math.round(pct) + "%</span>" +
      "</div>";
  }

  function targetsBlock(t, restT, prog) {
    var delta = restT ? t.kcal - restT.kcal : 0;
    var chip = "";
    if (t.training && delta > 0) {
      chip = '<span class="fuel-delta is-up">▲ +' + delta + " because you train today</span>";
    } else if (!t.training) {
      chip = '<span class="fuel-delta is-rest">Rest day · ' + Math.abs(delta) + " under a training day</span>";
    }

    var live = "";
    if (prog && t.training) {
      var earned = Math.round(t.burn * prog.frac);
      live =
        '<div class="fuel-live' + (prog.frac >= 1 ? " is-done" : "") + '">' +
          '<div class="fuel-live-bar"><i style="width:' + (prog.frac * 100).toFixed(0) + '%"></i></div>' +
          "<p><b>" + prog.hit + " of " + prog.total + " sets logged</b> — " +
          (prog.frac >= 1
            ? "session complete, the whole +" + t.burn + " kcal is earned."
            : prog.frac === 0
              ? "the +" + t.burn + " kcal below assumes you finish it."
              : "+" + earned + " of the +" + t.burn + " kcal earned so far.") +
          "</p>" +
        "</div>";
    }

    return '<div class="fuel-head">' +
        '<span class="eyebrow">' + esc(t.dayName) + "</span>" +
        '<div class="fuel-kcal"><b>' + t.kcal.toLocaleString("en-IN") + "</b><span>kcal today</span></div>" +
        chip +
      "</div>" +
      live +
      '<div class="macros">' +
        macroRow("Protein", t.protein, 4, t.kcal, "is-p") +
        macroRow("Carbs", t.carbs, 4, t.kcal, "is-c") +
        macroRow("Fat", t.fat, 9, t.kcal, "is-f") +
      "</div>" +
      '<p class="fuel-perkg mono">' + t.proteinPerKg + " g protein per kg of bodyweight · " +
        esc(t.levelLabel.toLowerCase()) + " · " + esc(GB.GOALS[t.goal].toLowerCase()) + "</p>" +
      '<p class="fuel-why">' + esc(t.goalNote) + "</p>" +
      (t.floored ? '<div class="empty-note"><b>Held at a floor.</b> The goal maths wanted to go lower than is sensible to eat, so this is the floor instead. If fat loss has stalled here, add training rather than removing food.</div>' : "");
  }

  function mathsBlock(t) {
    return '<div class="fuel-maths">' +
      '<div><span class="mono">' + t.rmr + "</span><small>Resting — what you burn doing nothing at all</small></div>" +
      '<div><span class="mono">+ ' + (t.base - t.rmr) + "</span><small>Living — " + esc(t.activity.toLowerCase()) + "</small></div>" +
      '<div><span class="mono">+ ' + t.burn + "</span><small>" + (t.burn ? "Today's session, costed from the actual blocks in it" : "No session today") + "</small></div>" +
      (t.adjust ? '<div class="is-fix"><span class="mono">' + signed(t.adjust) +
        "</span><small>Measured correction — your weigh-ins say everything above runs " +
        (t.adjust > 0 ? "low" : "high") + " for you by about this much</small></div>" : "") +
      '<div><span class="mono">' + (t.adjPct >= 0 ? "+" : "") + t.adjPct + "%</span><small>" +
        esc(GB.GOALS[t.goal]) + " at " + esc(t.levelLabel.toLowerCase()) + " level</small></div>" +
      '<div class="is-total"><span class="mono">' + t.kcal + "</span><small>kcal</small></div>" +
      "</div>";
  }

  /* the beg / int / adv block, the way every exercise in data.js carries one */
  function levelBlock(t) {
    var tag = { 1: "tag-beg", 2: "tag-int", 3: "tag-adv" }[t.level] || "tag-beg";
    return '<div class="lvl-note">' +
      '<div class="lvl-head">' +
        '<span class="tag ' + tag + '">' + esc(t.levelLabel) + "</span>" +
        "<h3>" + esc(t.levelFocus) + "</h3>" +
      "</div>" +
      "<p>" + esc(t.levelNote) + "</p>" +
      '<p class="lvl-protein"><b>Protein at this level.</b> ' + esc(t.proteinNote) + "</p>" +
      '<p class="lvl-edit">Level comes from your training plan. <a href="week.html">Change it there</a> and everything on this page moves with it.</p>' +
      "</div>";
  }

  function mealsBlock(t, diet, seed, training) {
    var list = GF.meals(t, diet, seed, training, t.level);
    var tot = GF.totals(list);
    return '<div class="meals">' +
      list.map(function (m) {
        var mt = m.items.reduce(function (a, i) { return a + i.kcal; }, 0);
        var mp = m.items.reduce(function (a, i) { return a + i.p; }, 0);
        return '<div class="meal">' +
          '<div class="meal-head"><h3>' + esc(m.label) + "</h3>" +
            '<span class="mono">' + mt + " kcal · " + mp + "g P</span></div>" +
          '<ul>' + m.items.map(function (i) {
            return "<li>" + esc(i.text) + '<span class="mono">' + i.p + "g P</span></li>";
          }).join("") + "</ul>" +
        "</div>";
      }).join("") +
      '<p class="meal-foot">That day comes to <b>' + tot.kcal.toLocaleString("en-IN") + " kcal</b> and <b>" + tot.p +
      "g protein</b> against a target of " + t.kcal.toLocaleString("en-IN") + " and " + t.protein +
      "g. It will not land exactly, and it does not need to — this is one worked example of the shape, not a chart to follow. Swap anything for something with similar protein.</p>" +
      "</div>";
  }

  function weekBlock(profile, plan) {
    var w = GN.weekTargets(profile, plan, adjOf(plan));
    if (!w) return "";
    var t = today();
    var max = w.high;
    return '<div class="fuel-week">' +
      w.days.map(function (d) {
        var h = max ? Math.round(d.t.kcal / max * 100) : 0;
        return '<div class="fw-day' + (d.dow === t ? " is-today" : "") + " is-" + d.type + '">' +
          '<div class="fw-bar"><i style="height:' + h + '%"></i></div>' +
          '<span class="fw-kcal mono">' + d.t.kcal + "</span>" +
          '<span class="fw-dow">' + esc(d.short) + "</span>" +
        "</div>";
      }).join("") +
      "</div>" +
      '<p class="fuel-week-note">Low ' + w.low.toLocaleString("en-IN") + " · high " + w.high.toLocaleString("en-IN") +
      " · averaging " + w.avg.toLocaleString("en-IN") + " kcal a day across the week. The tall days are the days you lift. " +
      "Eating the same amount every day is not wrong, it is just less precise than eating with your training.</p>";
  }

  /* ── the correction ══════════════════════════════════════
     The trend used to end in advice — "add about 150 kcal a day" —
     addressed to a reader who then had to hold that number in their
     head against a target the page went on printing unchanged. This
     is the same sentence with the arithmetic done and a button on
     it, and nothing moves until the button is pressed: plan.js never
     adds weight to a bar on its own either. */

  function correctionBlock(profile, plan, day, onChange) {
    var log = load(WKEY, []);
    var cur = getAdjust(plan);
    var c = GN.correction(log, plan, cur, { profile: profile, day: day });
    var applied = "";

    if (cur.kcal) {
      var since = cur.at || cur.since;
      applied = '<p class="fix-applied"><b>' + signed(cur.kcal) + " kcal a day is applied</b>" +
        (since ? " since " + esc(pretty(since)) : "") +
        ". Every target on this page already includes it. " +
        '<button type="button" class="link-btn fix-remove">Remove it</button></p>';
    }

    var body;
    if (c.ready) {
      var now = GN.dayTargets(profile, plan, day, { adjust: c.have });
      var next = GN.dayTargets(profile, plan, day, { adjust: c.next });
      body = '<p>' + esc(c.why) + "</p>" +
        '<div class="fix-cta">' +
          '<button type="button" class="btn btn-primary btn-sm fix-apply">' +
            (c.step > 0 ? "Add " : "Take off ") + Math.abs(c.step) + " kcal a day</button>" +
          '<span class="fix-delta mono">today ' + now.kcal.toLocaleString("en-IN") + " → " +
            next.kcal.toLocaleString("en-IN") + " kcal</span>" +
        "</div>" +
        '<p class="fix-small">It lands on the expenditure estimate rather than on the target, so your ' +
        (now.adjPct < 0 ? "deficit" : now.adjPct > 0 ? "surplus" : "maintenance figure") +
        " keeps being taken from a maintenance the scale agrees with. " +
        "Then leave it a fortnight — a correction judged on the week it was made is not judged at all.</p>";
    } else {
      body = '<p class="fix-small">' + esc(c.reason || "") + "</p>";
    }

    return '<div class="fix' + (c.ready ? " is-ready" : "") + '">' +
      '<div class="fix-head"><h3>Correction from the scale</h3>' +
        '<span class="mono">' + (c.measured == null ? "measuring" : signed(c.measured) + " kg/wk over " + c.days + "d") + "</span></div>" +
      applied + body +
      "</div>";
  }

  function trendBlock(profile, plan, day, onLog) {
    var log = load(WKEY, []);
    var tr = GN.trend(log, plan ? plan.goal : "fitness");
    var html = '<div class="trend">' +
      '<div class="trend-head"><h2>Is it working?</h2>' +
        '<span class="mono">' + log.length + " weigh-in" + (log.length === 1 ? "" : "s") + "</span></div>";

    if (tr) {
      html += '<div class="trend-body is-' + tr.verdict.replace(/\s+/g, "-") + '">' +
        '<div class="trend-num"><b>' + (tr.perWeek > 0 ? "+" : "") + tr.perWeek + "</b><span>kg per week</span></div>" +
        "<p><b>" + esc(tr.verdict[0].toUpperCase() + tr.verdict.slice(1)) + ".</b> " +
        tr.from + " kg → " + tr.to + " kg over " + tr.days + " days" +
        (tr.fitted ? ", fitted through all " + tr.points + " weigh-ins rather than read off the first and last" : "") + ". " +
        "Target band for this goal is " + tr.band[0] + " to " + tr.band[1] + " kg a week.</p>" +
        "<p>" + esc(tr.advice) + "</p>" +
      "</div>";
    } else {
      html += '<p class="trend-empty">Every number on this page is an estimate. The scale is the measurement. ' +
        'Weigh yourself first thing, same day each week, and after a fortnight this becomes the only feedback ' +
        'that actually knows whether the target is right for you.</p>';
    }

    html += '<div class="trend-add">' +
        '<label for="trWeight">Today\'s weight</label>' +
        '<input id="trWeight" type="number" inputmode="decimal" step="0.1" min="25" max="300" value="' + profile.weightKg + '">' +
        '<span class="unit">kg</span>' +
        '<button type="button" class="btn btn-ghost btn-sm trend-save">Log it</button>' +
      "</div>" +
      (log.length > 1 ? '<p class="trend-log mono">' + log.slice(-8).map(function (e) { return e.kg; }).join(" → ") + "</p>" : "") +
      correctionBlock(profile, plan, day, onLog) +
      "</div>";

    var node = el(html);
    $(".trend-save", node).addEventListener("click", function () {
      var kg = +$("#trWeight", node).value;
      if (!(kg > 25 && kg < 300)) return;
      var l = load(WKEY, []);
      if (l.length && l[l.length - 1].d === iso()) l[l.length - 1].kg = kg;
      else l.push({ d: iso(), kg: kg });
      save(WKEY, l.slice(-60));
      var p = getProfile();
      p.weightKg = kg; p.updated = iso();
      save(PKEY, p);
      onLog();
    });

    var apply = $(".fix-apply", node);
    if (apply) {
      apply.addEventListener("click", function () {
        var c = GN.correction(load(WKEY, []), plan, getAdjust(plan), { profile: profile, day: day });
        if (!c.ready) return;
        /* `since` restarts here: the fortnight that argued for this
           change cannot also be the fortnight that judges it. */
        save(AKEY, { kcal: c.next, since: iso(), at: iso(), goal: plan && plan.goal });
        onLog();
      });
    }
    var drop = $(".fix-remove", node);
    if (drop) {
      drop.addEventListener("click", function () {
        save(AKEY, { kcal: 0, since: iso(), at: null, goal: plan && plan.goal });
        onLog();
      });
    }
    return node;
  }

  /* ═══ the nutrition page ═══ */

  var out = $("#nutriOut"), form = $("#nutriProfile");
  if (out && form) {
    var render = function () {
      var profile = getProfile();
      if (!GN.validProfile(profile)) { form.hidden = false; out.hidden = true; return; }
      form.hidden = true;
      out.hidden = false;

      var plan = getPlan();
      var day = todayDay(plan);
      var fix = adjOf(plan);
      var t = GN.dayTargets(profile, plan, day, fix);
      var restT = GN.dayTargets(profile, plan, { type: "rest" }, fix);
      var prog = sessionProgress(plan, day);

      out.innerHTML = "";
      out.appendChild(el(
        '<div class="plan-head">' +
          "<h2>Today's fuel</h2>" +
          '<span class="mono">' + (plan ? esc(t.levelLabel) + " · " + esc(GB.GOALS[plan.goal]) + " · week " + plan.weekNumber : "No plan yet") +
          " · " + profile.weightKg + " kg · " + esc(GF.DIET_LABEL[profile.diet] || "Vegetarian") + "</span>" +
        "</div>"
      ));

      if (!plan) {
        out.appendChild(el('<div class="empty-note"><b>These are rest-day numbers.</b><br>' +
          'Nothing here knows what you train yet. <a href="week.html">Build your week</a> and the target starts ' +
          "moving with your actual sessions — up on lifting days, back down on rest days.</div>"));
      }

      out.appendChild(el('<div class="fuel">' + targetsBlock(t, restT, prog) + "</div>"));
      out.appendChild(el('<h2 class="sub-h">What matters at your level</h2>'));
      out.appendChild(el(levelBlock(t)));
      out.appendChild(el('<h2 class="sub-h">How that number is built</h2>'));
      out.appendChild(el(mathsBlock(t)));

      if (plan) {
        out.appendChild(el('<h2 class="sub-h">Your week, as calories</h2>'));
        out.appendChild(el("<div>" + weekBlock(profile, plan) + "</div>"));

        var ad = GN.adherence(plan, load(DONE_KEY, {}), profile);
        if (ad && ad.missed > 0 && ad.done > 0) {
          out.appendChild(el('<div class="empty-note"><b>' + ad.done + " of " + ad.planned +
            " sessions done this week.</b><br>The targets above assume the plan happens. The " + ad.missed +
            " you have not done " + (ad.missed === 1 ? "is" : "are") + " worth about " + ad.lost +
            " kcal — if the week ends there, it ate more than it earned.</div>"));
        }
      }

      out.appendChild(el('<h2 class="sub-h">What that looks like on a plate</h2>'));
      out.appendChild(el(mealsBlock(t, profile.diet, today(), t.training)));

      out.appendChild(trendBlock(profile, plan, day, render));

      out.appendChild(el(
        '<div class="fuel-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="nuEdit">Edit my details</button> ' +
          '<button type="button" class="btn btn-ghost btn-sm" id="nuClear">Delete my details</button>' +
        "</div>"
      ));
      $("#nuEdit").addEventListener("click", function () {
        form.hidden = false;
        wireForm(form, getProfile(), render);
        if (form.scrollIntoView) form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      $("#nuClear").addEventListener("click", function () {
        if (!window.confirm("Delete your weight, height, age and weigh-in history from this device?")) return;
        /* the correction is nothing but a reading of the weigh-ins;
           deleting them and keeping it would leave a number on the
           page with no evidence left behind it */
        try { localStorage.removeItem(PKEY); localStorage.removeItem(WKEY); localStorage.removeItem(AKEY); } catch (e) {}
        out.hidden = true;
        form.hidden = false;
        wireForm(form, null, render);
      });
    };

    wireForm(form, getProfile(), render);
    render();
  }

  /* ═══ the calculator ═══

     The rest of the page answers "what should I eat today". This
     answers "what would I eat if" — five days instead of three, ten
     kilos from now, a different job. It runs the same engine on a
     throwaway plan, so it can never drift from the real numbers, and
     it saves nothing unless asked.

     BMR and maintenance are named as such. The page's own voice calls
     them resting and living, but these are the words people arrive
     already knowing, and a calculator that renames them is a
     calculator people don't trust. */

  var calcBox = $("#calcOut");
  if (calcBox && GBP) {
    var C = { sex: "male", activity: "sitting", level: 1, goal: "muscle", days: 3, duration: 45,
              age: 25, heightCm: 170, weightKg: 70 };

    /* start from whatever the person already told us, so the calculator
       opens on their own numbers rather than a stranger's */
    var seedP = getProfile(), seedPlan = getPlan();
    if (GN.validProfile(seedP)) {
      C.sex = seedP.sex; C.age = seedP.age; C.heightCm = seedP.heightCm;
      C.weightKg = seedP.weightKg; C.activity = seedP.activity || "sitting";
    }
    if (seedPlan) {
      C.level = +seedPlan.level || 1; C.goal = seedPlan.goal;
      C.days = seedPlan.days; C.duration = seedPlan.duration;
    }

    var row = function (label, val, note, cls) {
      return '<div class="' + (cls || "") + '"><span class="cr-label">' + label + "</span>" +
        '<span class="cr-val mono">' + val + "</span>" +
        '<span class="cr-note">' + (note || "") + "</span></div>";
    };

    function drawCalc() {
      var profile = { sex: C.sex, age: C.age, heightCm: C.heightCm, weightKg: C.weightKg, activity: C.activity };
      if (!GN.validProfile(profile)) {
        calcBox.innerHTML = '<div class="empty-note"><b>Check the numbers.</b><br>Height in centimetres, ' +
          "weight in kilograms, age between 14 and 99.</div>";
        return;
      }

      var plan = GBP.generate({ level: C.level, days: C.days, goal: C.goal, duration: C.duration,
                                kit: "full", weekNumber: 1 });
      var trainDay = plan.week.filter(function (d) { return d.type === "train"; })[0];
      /* The calculator has to carry the correction too. It is a fact
         about this body's expenditure, not about the plan on screen,
         and a calculator that answered a question the top of the page
         has already answered — with a different number — would be the
         one thing here nobody could reconcile. */
      var fx = adjOf(getPlan());
      var t = GN.dayTargets(profile, plan, trainDay, fx);
      var r = GN.dayTargets(profile, plan, { type: "rest" }, fx);
      var wk = GN.weekTargets(profile, plan, fx);
      var n = function (v) { return v.toLocaleString("en-IN"); };

      calcBox.innerHTML =
        '<div class="calc-rows">' +
          row("BMR", n(t.rmr), "asleep all day, burning nothing else") +
          row("Maintenance · rest", n(r.expend), "living, no session") +
          row("Maintenance · training", n(t.expend), "living, plus the session") +
          row("Target · rest", n(r.kcal), (r.adjPct >= 0 ? "+" : "") + r.adjPct + "% for " + esc(GB.GOALS[C.goal].toLowerCase()), "is-target") +
          row("Target · training", n(t.kcal), "the day you lift", "is-target") +
          row("Week average", n(wk.avg), C.days + " training days, " + (7 - C.days) + " off", "is-avg") +
        "</div>" +
        '<div class="calc-macros">' +
          '<div><h3>Training day</h3><p class="mono"><b>' + t.protein + "g</b> protein · <b>" + t.carbs +
            "g</b> carbs · <b>" + t.fat + "g</b> fat</p></div>" +
          '<div><h3>Rest day</h3><p class="mono"><b>' + r.protein + "g</b> protein · <b>" + r.carbs +
            "g</b> carbs · <b>" + r.fat + "g</b> fat</p></div>" +
        "</div>" +
        '<p class="calc-why">' + esc(t.levelLabel) + " · " + t.proteinPerKg + " g protein per kg · " +
          esc(t.activity.toLowerCase()) + ". " + esc(t.goalNote) +
          (t.adjust ? " Maintenance here carries the " + signed(t.adjust) +
            " kcal correction your own weigh-ins measured, so it matches the target above." : "") + "</p>" +
        (t.floored || r.floored ? '<div class="empty-note"><b>Held at a floor.</b> The goal wanted to go lower than is sensible to eat.</div>' : "") +
        '<div class="calc-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="calcSave">Save these body details</button>' +
          '<span class="calc-hint">Level, goal and training days live on <a href="week.html">your week</a> — saving here only keeps your body details.</span>' +
        "</div>";

      $("#calcSave").addEventListener("click", function () {
        var p = getProfile() || {};
        p.sex = C.sex; p.age = C.age; p.heightCm = C.heightCm; p.weightKg = C.weightKg;
        p.activity = C.activity; p.diet = p.diet || "veg"; p.updated = iso();
        save(PKEY, p);
        var log = load(WKEY, []);
        if (!log.length || log[log.length - 1].kg !== p.weightKg) {
          log.push({ d: iso(), kg: p.weightKg });
          save(WKEY, log.slice(-60));
        }
        location.reload();
      });
    }

    /* segmented controls */
    [["c-sex", "sex", String], ["c-activity", "activity", String], ["c-level", "level", Number],
     ["c-goal", "goal", String], ["c-days", "days", Number], ["c-duration", "duration", Number]
    ].forEach(function (pair) {
      var name = pair[0], key = pair[1], cast = pair[2];
      var btns = $$('[name="' + name + '"]');
      var mark = function () {
        btns.forEach(function (b) {
          b.setAttribute("aria-pressed", cast(b.dataset.val) === C[key] ? "true" : "false");
        });
      };
      btns.forEach(function (b) {
        b.addEventListener("click", function () { C[key] = cast(b.dataset.val); mark(); drawCalc(); });
      });
      mark();
    });

    /* number fields */
    [["c-age", "age"], ["c-height", "heightCm"], ["c-weight", "weightKg"]].forEach(function (pair) {
      var input = $('[name="' + pair[0] + '"]');
      if (!input) return;
      input.value = C[pair[1]];
      input.addEventListener("input", function () { C[pair[1]] = +input.value; drawCalc(); });
    });

    drawCalc();
  }

  /* ═══ the fuel card on the homepage ═══ */

  var card = $("#fuelCard");
  if (card) {
    var pr = getProfile();
    if (!GN.validProfile(pr)) {
      card.innerHTML =
        '<div class="today-inner today-empty">' +
          '<span class="eyebrow">Eat for it</span>' +
          "<h2>What should I eat today?</h2>" +
          "<p>Four questions and your calorie and protein target is worked out from the week you actually " +
          "train — higher on lifting days, back down on rest days. No subscription, no food diary.</p>" +
          '<a class="btn btn-primary" href="nutrition.html">Set my target</a>' +
        "</div>";
    } else {
      var pl = getPlan(), dy = todayDay(pl), fc = adjOf(pl);
      var tt = GN.dayTargets(pr, pl, dy, fc);
      var rt = GN.dayTargets(pr, pl, { type: "rest" }, fc);
      var dl = tt.kcal - rt.kcal;
      card.innerHTML =
        '<div class="today-inner is-fuel">' +
          '<span class="eyebrow">Today · fuel</span>' +
          "<h2>" + tt.kcal.toLocaleString("en-IN") + " kcal · " + tt.protein + "g protein</h2>" +
          "<p>" + (tt.training
            ? "Training day — that is " + dl + " kcal more than a rest day, earned by the session in your plan."
            : "Rest day, so the target steps back down. Protein stays where it is; that is what you recover on.") +
          "</p>" +
          '<a class="btn btn-primary" href="nutrition.html">See today\'s food</a>' +
        "</div>";
    }
    card.hidden = false;
  }

  /* ═══ the line under a finished workout ═══ */

  var post = $("#fuelAfter");
  if (post) {
    var pf = getProfile();
    if (GN.validProfile(pf)) {
      var pn = getPlan();
      var dow = +(new URLSearchParams(location.search).get("d"));
      if (isNaN(dow)) dow = today();
      var dd = pn && pn.week[dow];
      var ft = GN.dayTargets(pf, pn, dd, adjOf(pn));
      post.innerHTML =
        "<p><b>" + ft.protein + "g protein and " + ft.kcal.toLocaleString("en-IN") +
        " kcal is today's target</b> — " + (ft.burn ? "the session you just did is " + ft.burn + " kcal of it. " : "") +
        'Get a proper meal in rather than a shake if you can. <a href="nutrition.html">What that looks like</a>.</p>';
      post.hidden = false;
    }
  }
})();
