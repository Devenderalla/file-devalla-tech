/* ═══════════════════════════════════════════════════════════
   Gym Basics — nutrition engine
   The counterpart to plan.js: pure calculation, no DOM.

   The point of this file is that nothing here is a dropdown the
   user guesses at. The "activity level" that every calculator
   asks for is derived from the week plan.js already generated —
   the actual sessions, their actual length, their actual
   composition — and from how much of today's session has
   genuinely been ticked off in session.js.

   Train more, eat more. Skip the session, and the number moves
   back down on its own.
   ═══════════════════════════════════════════════════════════ */

window.GBNutri = (function () {
  "use strict";

  /* ── energy model ─────────────────────────────────────────

     RMR    Mifflin-St Jeor. The least-wrong of the simple
            equations for people who aren't lean athletes.
     NEAT   everything that isn't training: walking, standing,
            fidgeting, the commute. Comes from ACTIVITY below.
            Training is NOT in here — it's added per day.
     MET    per block role, for time actually under load. Values
            are gross, so 1 MET (what you would have burned lying
            still) is subtracted before adding to a TDEE that
            already covers all 24 hours. Skipping that subtraction
            is the most common way these numbers get inflated.

     Rest between sets is costed separately and much lower. It
     matters: a strength day runs three-minute rests, and charging
     those at the lifting rate would have the engine claim a
     strength session burns half again what a hypertrophy session
     does purely for standing around longer. It doesn't.
  */

  /* Life outside the gym. This is the one thing the plan genuinely
     cannot tell us — a site engineer and a software engineer of the
     same weight running the same programme are hundreds of calories
     apart, and no amount of reading the training plan will say which
     is which. So it is asked, but asked as a question about your day
     rather than as "lightly / moderately / very active", which is the
     phrasing nobody can answer honestly about themselves. */
  var ACTIVITY = {
    sitting:  { mult: 1.25, label: "Desk job, mostly sitting" },
    mixed:    { mult: 1.40, label: "On your feet a fair bit" },
    physical: { mult: 1.60, label: "Physical work all day" }
  };
  var NEAT_DEFAULT = "sitting";

  var MET = {
    warmup: 4.0, main: 6.5, accessory: 6.0,
    conditioning: 9.0, core: 5.0, cooldown: 2.5
  };
  var MET_REST = 2.8;              /* between sets — standing, breathing hard, not resting */
  var MET_ACTIVE = 3.2;            /* an active-recovery day: a walk, some mobility */
  var SET_SECONDS = 45;            /* time under load for one set, as plan.js estimates it */

  /* ── goal × level ─────────────────────────────────────────

     Goal sets the direction; level sets how hard to push it.
     Percentages are of total daily expenditure, not of RMR.

     The pattern is not "advanced means more of everything". A
     beginner gains muscle faster than they ever will again, and on
     less — a big surplus at that stage is mostly fat, and they can
     often add muscle and lose fat at once, which nobody can do
     later. An advanced lifter gains so slowly that a large surplus
     is also mostly fat, just for the opposite reason. It is the
     intermediate, past the free gains and still far from the
     ceiling, who needs the most deliberate surplus.
  */
  var GOAL_ADJ = {
    muscle:    { 1:  0.08, 2:  0.10, 3:  0.06 },
    strength:  { 1:  0.06, 2:  0.08, 3:  0.05 },
    fatloss:   { 1: -0.15, 2: -0.20, 3: -0.22 },
    fitness:   { 1:  0.00, 2:  0.00, 3:  0.00 },
    endurance: { 1:  0.02, 2:  0.03, 3:  0.04 }
  };

  /* No percentages in this copy. The size of the surplus or deficit
     now depends on level, and a note that hardcodes "a 20% deficit"
     ends up sitting next to a figure reading −22%. The number is
     shown; this says what it is for. */
  var GOAL_NOTE = {
    muscle:    "A surplus — enough to build with, small enough that most of the gain is muscle rather than what covers it.",
    strength:  "A small surplus. Strength work is neural as much as it is size, so you don't need to eat like you're bulking.",
    fatloss:   "A deficit — aggressive enough to show on the scale inside a fortnight, gentle enough that your lifts survive it.",
    fitness:   "Maintenance. You eat what you spend, and the training changes the body composition rather than the weight.",
    endurance: "A slight surplus. Endurance work eats carbohydrate, and running a deficit on top of it is how people end up flat."
  };

  /* protein in grams per kg of bodyweight, by goal and by level.

     Two things push it up. A deficit does, because that is when
     protein is doing the most work — holding onto muscle while the
     calories are down. And training age does, because a beginner
     grows from almost any adequate intake while an advanced lifter
     is close enough to their ceiling that the margin has to be
     bought. Telling a beginner to eat 2.2 g/kg is how people decide
     the gym is expensive and stop going. */
  var PROTEIN_PER_KG = {
    muscle:    { 1: 1.6, 2: 1.9, 3: 2.2 },
    strength:  { 1: 1.6, 2: 1.8, 3: 2.1 },
    fatloss:   { 1: 1.8, 2: 2.1, 3: 2.4 },
    fitness:   { 1: 1.4, 2: 1.6, 3: 1.8 },
    endurance: { 1: 1.4, 2: 1.6, 3: 1.8 }
  };

  var LV_LABEL = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };

  /* The beg / int / adv pattern data.js uses for every exercise,
     applied to eating. What actually matters changes at each stage,
     and most of what an advanced lifter worries about is noise to
     someone in their first month. */
  var LEVEL_NOTE = {
    1: {
      focus: "Consistency, not precision",
      note: "Hit the protein, eat roughly this much, and that is the whole job. You are in the one window " +
        "where you can add muscle and lose fat at the same time, and it happens on ordinary food if you train " +
        "and sleep. Do not buy supplements, do not weigh your rice, do not track every gram — precision now " +
        "costs you the habit, and the habit is the thing that actually works. Three solid meals with protein " +
        "in each, plus something after training, for eight weeks.",
      protein: "1.6 g per kg is plenty at this stage. You will grow on it."
    },
    2: {
      focus: "Pick a direction and hold it",
      note: "Recomposition is over — your body no longer improves in both directions at once. Run a surplus " +
        "or a deficit deliberately for eight to twelve weeks instead of drifting between them, which is what " +
        "most people at this level actually do and why they look the same each year. This is also where " +
        "spreading protein starts to matter: the same 150 g across four meals beats 100 g of it at dinner. " +
        "Weigh in weekly and adjust from the trend, never from one morning.",
      protein: "1.8–2.1 g per kg, and split across four meals rather than won or lost at dinner."
    },
    3: {
      focus: "Timing and recovery, not the number",
      note: "The margins are thin. Your rate of gain is slow enough that a large surplus is mostly fat, which " +
        "is why the surplus above is tighter than an intermediate's, not looser — expect months, not weeks. " +
        "Get 30–40 g of protein on both sides of the session, keep carbohydrate high on heavy days and let it " +
        "fall on rest days, and treat sleep as part of the programme rather than what is left of the evening. " +
        "At this level the gap between two programmes is smaller than the gap between a week you ate and slept " +
        "properly and a week you didn't.",
      protein: "2.1–2.4 g per kg, across five feeds, with two of them around training."
    }
  };

  /* fat as a share of calories, with a floor further down —
     fat is not the lever here, it is the thing you don't go under */
  var FAT_PCT = { muscle: 0.27, strength: 0.28, fatloss: 0.25, fitness: 0.28, endurance: 0.25 };

  var FAT_FLOOR_PER_KG = 0.6;      /* below this, hormones and joints start complaining */
  var FAT_FLOOR_PCT = 0.20;        /* and never under a fifth of the day's calories */
  var PROTEIN_CAP_PCT = 0.40;      /* protein can't eat the whole budget in a hard deficit */

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function round5(n) { return Math.round(n / 5) * 5; }

  /* ── the profile ─────────────────────────────────────────── */

  function validProfile(p) {
    return !!p && p.weightKg > 25 && p.weightKg < 300 &&
      p.heightCm > 120 && p.heightCm < 230 &&
      p.age > 13 && p.age < 100 &&
      (p.sex === "male" || p.sex === "female");
  }

  function rmr(p) {
    var s = p.sex === "female" ? -161 : 5;
    return Math.round(10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + s);
  }

  /* ── what a session actually costs ────────────────────────

     Same minute estimate plan.js uses for "~45 min", reused per
     block so a conditioning finisher is not costed like a set of
     curls. */

  function loadOf(items) {
    var work = 0, rest = 0;
    items.forEach(function (it) {
      var r = it.rx || {};
      if (r.time) {
        var m = String(r.time).match(/(\d+)\s*min/);
        work += m ? +m[1] : 1;                        /* a drill is about a minute */
      } else {
        var sets = r.sets || 1;
        work += sets * SET_SECONDS / 60;
        rest += sets * (r.rest || 60) / 60;
      }
    });
    return { work: work, rest: rest };
  }

  /* kcal above resting for one block */
  function blockKcal(role, l, kg) {
    var met = MET[role] || 5;
    return ((met - 1) * l.work + (MET_REST - 1) * l.rest) * 3.5 * kg / 200;
  }

  function sessionKcal(day, kg) {
    if (!day) return 0;
    if (day.type === "active") return Math.round((MET_ACTIVE - 1) * 3.5 * kg / 200 * (day.minutes || 25));
    if (day.type !== "train" || !day.blocks) return 0;
    var total = 0;
    day.blocks.forEach(function (b) {
      total += blockKcal(b.role, loadOf(b.items), kg);
    });
    return Math.round(total);
  }

  /* ── macros ───────────────────────────────────────────────

     Resolved in priority order: protein first (it is the reason
     the training works), then a fat floor, then carbohydrate takes
     whatever is left. In a deep deficit the remainder can go
     negative, so protein and fat give ground in that order rather
     than the day silently not adding up. */

  function perKg(goal, level) {
    var row = PROTEIN_PER_KG[goal] || PROTEIN_PER_KG.fitness;
    return row[level] || row[1];
  }

  function goalAdj(goal, level) {
    var row = GOAL_ADJ[goal] || GOAL_ADJ.fitness;
    return row[level] == null ? row[1] : row[level];
  }

  function macros(kcal, kg, goal, level) {
    var protein = Math.round(perKg(goal, level) * kg);
    protein = Math.min(protein, Math.floor(kcal * PROTEIN_CAP_PCT / 4));

    var fat = Math.round(kcal * (FAT_PCT[goal] || 0.27) / 9);
    var fatFloor = Math.max(Math.round(FAT_FLOOR_PER_KG * kg), Math.round(kcal * FAT_FLOOR_PCT / 9));
    fat = Math.max(fat, fatFloor);

    var carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);

    if (carbs < 40) {
      /* give back fat first, down to the floor, then protein down to 1.6 g/kg */
      var need = (40 - carbs) * 4;
      var fatGive = Math.min(fat - fatFloor, Math.floor(need / 9));
      fat -= fatGive; need -= fatGive * 9;
      if (need > 0) {
        var pFloor = Math.round(Math.min(1.6, perKg(goal, level)) * kg);
        protein -= Math.min(Math.max(protein - pFloor, 0), Math.floor(need / 4));
      }
      carbs = Math.max(40, Math.round((kcal - protein * 4 - fat * 9) / 4));
    }

    return { protein: protein, carbs: carbs, fat: fat };
  }

  /* ── one day ──────────────────────────────────────────────

     opts.progress — 0..1, the share of today's sets actually
     ticked off. Passing it does not change the target: the target
     is what the day is worth if you do the session you planned.
     It reports how much of the training bump has been earned so
     far, which is the honest way round. A number that shrinks
     while you're mid-session would just make people stop ticking.

     opts.adjust — kcal/day of measured correction from the scale,
     from correction() below. It lands on expenditure rather than on
     the finished target, so the goal percentage is applied to a
     maintenance figure the scale has already agreed with. */

  function dayTargets(profile, plan, day, opts) {
    if (!validProfile(profile)) return null;
    opts = opts || {};
    var kg = profile.weightKg;
    var goal = (plan && plan.goal) || "fitness";
    var level = (plan && +plan.level) || 1;

    var act = ACTIVITY[profile.activity] || ACTIVITY[NEAT_DEFAULT];
    var r = rmr(profile);
    var base = Math.round(r * act.mult);
    var burn = sessionKcal(day, kg);
    var fix = clamp(Math.round(opts.adjust || 0), -CORRECT_TOTAL, CORRECT_TOTAL);
    var expend = base + burn + fix;

    var adj = goalAdj(goal, level);
    var kcal = Math.round(expend * (1 + adj));

    /* a floor no goal is allowed to argue with */
    var floor = Math.max(Math.round(r * 1.05), profile.sex === "female" ? 1200 : 1500);
    var floored = kcal < floor;
    if (floored) kcal = floor;
    kcal = round5(kcal);

    var m = macros(kcal, kg, goal, level);
    var trained = day && (day.type === "train" || day.type === "active");
    var lv = LEVEL_NOTE[level] || LEVEL_NOTE[1];

    return {
      kcal: kcal,
      protein: m.protein, carbs: m.carbs, fat: m.fat,
      rmr: r, base: base, burn: burn, expend: expend, adjust: fix,
      activity: act.label, activityMult: act.mult,
      adjPct: Math.round(adj * 100),
      goal: goal, goalNote: GOAL_NOTE[goal],
      level: level, levelLabel: LV_LABEL[level],
      levelFocus: lv.focus, levelNote: lv.note, proteinNote: lv.protein,
      proteinPerKg: perKg(goal, level),
      floored: floored,
      training: trained,
      dayType: (day && day.type) || "rest",
      dayName: (day && day.name) || "Rest day",
      /* how much of the training bump is banked so far */
      progress: opts.progress == null ? null : clamp(opts.progress, 0, 1),
      earned: opts.progress == null ? null : Math.round(burn * clamp(opts.progress, 0, 1))
    };
  }

  /* the whole week, so the cycling is visible rather than asserted */
  function weekTargets(profile, plan, opts) {
    if (!validProfile(profile) || !plan) return null;
    var days = plan.week.map(function (d) {
      var t = dayTargets(profile, plan, d, opts);
      return { dow: d.dow, dayName: d.dayName, short: d.short, type: d.type, name: d.name, t: t };
    });
    var sum = days.reduce(function (a, d) { return a + d.t.kcal; }, 0);
    var kcals = days.map(function (d) { return d.t.kcal; });
    return {
      days: days,
      avg: round5(sum / 7),
      low: Math.min.apply(null, kcals),
      high: Math.max.apply(null, kcals),
      weekly: sum
    };
  }

  /* ── did the week actually happen? ───────────────────────

     Targets assume the plan is followed. This compares planned
     training days against the ones marked done, and says what the
     gap costs — because a fat-loss week where two sessions were
     skipped is not the week the numbers were written for. */

  function adherence(plan, doneMap, profile) {
    if (!plan || !validProfile(profile)) return null;
    var train = plan.week.filter(function (d) { return d.type === "train"; });
    var done = train.filter(function (d) { return !!doneMap["w" + plan.weekNumber + ":" + d.dow]; });
    var missed = train.length - done.length;
    var lost = train.reduce(function (a, d) {
      return a + (doneMap["w" + plan.weekNumber + ":" + d.dow] ? 0 : sessionKcal(d, profile.weightKg));
    }, 0);
    return {
      planned: train.length, done: done.length, missed: missed,
      pct: train.length ? Math.round(done.length / train.length * 100) : 0,
      lost: Math.round(lost * (1 + goalAdj(plan.goal, +plan.level || 1)))
    };
  }

  /* ── weight trend ─────────────────────────────────────────

     The only real feedback loop. Every equation above is an
     estimate; the scale over a fortnight is measurement. If they
     disagree, the scale is right.

     Two points can't tell a trend from a bad morning. Bodyweight
     swings a kilo either way on salt, sleep, carbohydrate and
     whether you've been to the toilet — which is the same size as
     a fortnight of real fat loss. So the slope is fitted through
     every weigh-in in the window by least squares rather than read
     off the first and last, and the scatter around that line is
     kept, because a slope through noisy points deserves to be
     described as one.

     The window is deliberately short. A six-month log will happily
     report the average of a bulk and a cut, which is a true number
     about the past and a useless one for deciding what to eat this
     week.

     log: [{ d: "2026-08-13", kg: 74.2 }, …] oldest first */

  var TREND_WINDOW = 28;           /* days of weigh-ins the slope is fitted through */
  var TREND_MIN_SPAN = 7;          /* and the span it needs before it says anything */
  /* Residual scatter past which the log is describing the scales rather
     than the body. Half a kilo sounds tolerant, and is: it is roughly a
     normal day's swing on salt and water. But a fortnight of honest fat
     loss is only about a kilo and a half, so at this much noise the
     signal and the error are the same size, and the line deserves to be
     called shaky rather than quoted to two decimal places. */
  var NOISY_SCATTER = 0.5;

  var BAND = {
    muscle:    [0.10, 0.40],
    strength:  [0.00, 0.30],
    fatloss:   [-0.90, -0.30],
    fitness:   [-0.20, 0.20],
    endurance: [-0.20, 0.20]
  };

  function bandFor(goal) { return BAND[goal] || BAND.fitness; }

  function dayGap(a, b) { return (new Date(b) - new Date(a)) / 86400000; }

  /* the last `days` of the log, counted back from the most recent entry
     rather than from today — a log nobody has added to for a month
     should describe the month it covers, not report itself as empty */
  function recent(log, days) {
    if (!log || !log.length) return [];
    var last = log[log.length - 1].d;
    return log.filter(function (e) {
      return e && e.kg > 0 && dayGap(e.d, last) <= days;
    });
  }

  /* least squares through (day, kg) */
  function fit(pts) {
    var n = pts.length;
    if (n < 2) return null;
    var t0 = pts[0].d;
    var xs = pts.map(function (e) { return dayGap(t0, e.d); });
    var ys = pts.map(function (e) { return e.kg; });
    var mx = xs.reduce(function (a, v) { return a + v; }, 0) / n;
    var my = ys.reduce(function (a, v) { return a + v; }, 0) / n;
    var num = 0, den = 0, i;
    for (i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) * (xs[i] - mx); }
    if (!den) return null;
    var slope = num / den;
    var intercept = my - slope * mx;
    var ss = 0;
    for (i = 0; i < n; i++) { var r = ys[i] - (intercept + slope * xs[i]); ss += r * r; }
    var span = xs[n - 1];
    return {
      n: n, span: span, slope: slope,
      scatter: n > 2 ? Math.sqrt(ss / (n - 2)) : 0,
      from: intercept, to: intercept + slope * span
    };
  }

  function trend(log, goal) {
    var pts = recent(log, TREND_WINDOW);
    if (pts.length < 2) return null;
    var f = fit(pts);
    if (!f || f.span < TREND_MIN_SPAN) return null;

    var perWeek = f.slope * 7;
    var want = bandFor(goal);
    var noisy = f.scatter > NOISY_SCATTER;

    var verdict, advice;
    if (perWeek < want[0]) {
      verdict = goal === "fatloss" ? "faster than planned" : "going down";
      advice = goal === "fatloss"
        ? "Losing quicker than the target band. That is usually muscle joining the party — the correction below adds it back, mostly as carbohydrate around training."
        : "You are eating less than you are spending. The correction below closes the gap; check again in a fortnight.";
    } else if (perWeek > want[1]) {
      verdict = goal === "fatloss" ? "not moving" : "faster than planned";
      advice = goal === "fatloss"
        ? "The deficit is not landing. Before cutting further, weigh a normal week honestly — the estimate is usually fine and the intake is usually higher than remembered."
        : "Gaining quicker than the target band, which past a point is just fat.";
    } else {
      verdict = "on target";
      advice = "This is the band you were aiming for. Change nothing and let it keep working.";
    }

    if (noisy) {
      advice += " Your weigh-ins scatter about " + (Math.round(f.scatter * 10) / 10) +
        " kg around that line, which is a lot for a fortnight of real change — weigh first thing, after the toilet, before food, and the line gets easier to trust.";
    }

    return {
      perWeek: Math.round(perWeek * 100) / 100,
      total: Math.round((f.to - f.from) * 10) / 10,
      days: Math.round(f.span),
      points: f.n,
      from: Math.round(f.from * 10) / 10,
      to: Math.round(f.to * 10) / 10,
      rawFrom: pts[0].kg, rawTo: pts[pts.length - 1].kg,
      scatter: Math.round(f.scatter * 100) / 100,
      noisy: noisy,
      fitted: f.n > 2,
      band: want, verdict: verdict, advice: advice
    };
  }

  /* ── the correction ───────────────────────────────────────

     Everything above the trend is an estimate stacked on an
     estimate: Mifflin-St Jeor is a population average, the NEAT
     multiplier is a guess about your day, and the MET table costs a
     session it never watched. Any of them can be 200 kcal out for
     one person, and for that person the whole page is quietly wrong
     for as long as they use it.

     The scale knows. Weight moving faster or slower than the goal
     band, over a fortnight, is a direct measurement of how wrong the
     estimate is — 7,700 kcal to the kilo — so it can be turned back
     into the number of calories the estimate is missing by.

     Three things keep this from oscillating:

       · it is applied to EXPENDITURE, not to the target. Correcting
         maintenance from 2,600 to 2,400 makes a 20% cut 1,920 rather
         than 2,080. Correcting the target instead would leave the
         percentage sitting on a number known to be wrong, and would
         have to be thrown away every time the goal changed. This
         survives a goal change, because the estimate error is a fact
         about the person, not about what they are trying to do.
       · it aims a quarter of the way INTO the band, not at its
         centre, and only 60% of the calculated gap is taken in one
         step. Chasing the middle overshoots, and an overshoot reads
         on the scale a fortnight later as the opposite problem.
       · it needs fresh evidence SINCE THE LAST CHANGE. Weigh-ins
         from before a correction describe the old target, and
         judging a change by data that predates it is how a number
         ends up moving every time the page is opened.

     Nothing is applied automatically. plan.js never adds weight to a
     bar on its own and lift.js only ever suggests the next jump; a
     page that quietly re-cut your calories overnight would be the
     one thing on this site that changed your numbers without asking. */

  var KCAL_PER_KG = 7700;          /* the usual figure for body mass, fat and the water it carries */
  var CORRECT_MIN_SPAN = 14;       /* a fortnight of evidence, minimum */
  var CORRECT_MIN_POINTS = 3;      /* and enough points that one bad morning can't carry it */
  var CORRECT_DAMPING = 0.6;       /* take most of the gap, not all of it */
  var CORRECT_STEP = 250;          /* the most one correction may move */
  var CORRECT_TOTAL = 600;         /* and the most they may add up to, ever */
  var CORRECT_ROUND = 25;

  /* current: { kcal, since } — what is applied now and the date the
     evidence clock was last reset. Both may be absent.

     opts.profile / opts.day — optional, and worth passing. Without
     them this can only say what the scale wants; with them it can
     check whether the target is free to move that far, and a
     correction the floor is going to swallow is not offered. A button
     promising 250 kcal that delivers 25 is worse than no button. */
  function correction(log, plan, current, opts) {
    opts = opts || {};
    var goal = (plan && plan.goal) || "fitness";
    var level = (plan && +plan.level) || 1;
    var have = clamp(Math.round((current && current.kcal) || 0), -CORRECT_TOTAL, CORRECT_TOTAL);
    var since = current && current.since;

    var pts = recent(log, TREND_WINDOW).filter(function (e) {
      return !since || dayGap(since, e.d) >= 0;
    });

    var base = {
      have: have, step: 0, next: have, ready: false,
      points: pts.length, band: bandFor(goal), goal: goal
    };

    if (pts.length < CORRECT_MIN_POINTS) {
      base.reason = (since && !pts.length)
        ? "Waiting on fresh evidence. Weigh in weekly from here and in a fortnight this can say whether the change was the right size — the weigh-ins that argued for it cannot also be the ones that judge it."
        : "Needs " + CORRECT_MIN_POINTS + " weigh-ins" +
          (since ? " since the last change" : "") + " before it can say anything — " +
          pts.length + " so far.";
      return base;
    }

    var f = fit(pts);
    if (!f || f.span < CORRECT_MIN_SPAN) {
      base.reason = "Needs a fortnight of weigh-ins" + (since ? " since the last change" : "") +
        " — " + Math.round((f && f.span) || 0) + " days so far.";
      return base;
    }

    var perWeek = f.slope * 7;
    var want = bandFor(goal);
    base.measured = Math.round(perWeek * 100) / 100;
    base.days = Math.round(f.span);
    base.scatter = Math.round(f.scatter * 100) / 100;

    if (perWeek >= want[0] && perWeek <= want[1]) {
      base.onBand = true;
      base.reason = have
        ? "Weight is moving inside the band with the correction applied, which is the correction doing its job. Leave it."
        : "Weight is moving inside the band, so the estimate is right for you. Nothing to correct.";
      return base;
    }

    /* aim a quarter of the way into the band from the edge you crossed */
    var width = want[1] - want[0];
    var aim = perWeek < want[0] ? want[0] + width * 0.25 : want[1] - width * 0.25;

    /* kg/week off target → kcal/day of intake → kcal/day of expenditure,
       since the goal percentage sits on top of whatever this returns */
    var intake = (aim - perWeek) * KCAL_PER_KG / 7;
    var step = intake * CORRECT_DAMPING / (1 + goalAdj(goal, level));
    step = clamp(step, -CORRECT_STEP, CORRECT_STEP);
    step = Math.round(step / CORRECT_ROUND) * CORRECT_ROUND;

    var next = clamp(have + step, -CORRECT_TOTAL, CORRECT_TOTAL);
    step = next - have;

    if (!step) {
      base.reason = have
        ? "Already corrected as far as this is allowed to go. If it still isn't moving, the gap is bigger than a calorie estimate can explain — change the training or the honesty of the food log, not this number."
        : "Off the band, but by less than this is willing to chase. Give it another fortnight.";
      return base;
    }

    /* Can the target actually move that far? For a small person already
       cutting, the floor is doing the deciding, and stacking corrections
       underneath it would move the stored number every fortnight while
       the target on screen stayed exactly where it was. */
    if (opts.profile && step < 0) {
      var nowT = dayTargets(opts.profile, plan, opts.day, { adjust: have });
      var nextT = dayTargets(opts.profile, plan, opts.day, { adjust: next });
      if (nowT && nextT) {
        base.delivers = nextT.kcal - nowT.kcal;
        if (nextT.floored && Math.abs(base.delivers) < Math.abs(step) * 0.5) {
          base.floorBound = true;
          base.reason = "The target is already at the floor this page will not go under, so taking calories off it would " +
            "change almost nothing. A cut that has stalled at the floor is not a calorie problem — it is a training one or " +
            "an honesty one. Add a session or a daily walk, and weigh one normal week without rounding anything down.";
          return base;
        }
      }
    }

    base.ready = true;
    base.step = step;
    base.next = next;
    base.aim = Math.round(aim * 100) / 100;
    base.why = "Over " + base.days + " days you have been " +
      (perWeek > 0 ? "gaining " : perWeek < 0 ? "losing " : "holding at ") +
      Math.abs(base.measured) + " kg a week against a band of " + want[0] + " to " + want[1] +
      ". Weight moves at roughly 7,700 kcal to the kilogram, so the gap says the day's expenditure above is " +
      (step > 0 ? "understated" : "overstated") + " by about " + Math.abs(step) + " kcal.";
    return base;
  }

  return {
    ACTIVITY: ACTIVITY, MET: MET, GOAL_ADJ: GOAL_ADJ, GOAL_NOTE: GOAL_NOTE,
    PROTEIN_PER_KG: PROTEIN_PER_KG, LEVEL_NOTE: LEVEL_NOTE, LV_LABEL: LV_LABEL,
    BAND: BAND, CORRECT_TOTAL: CORRECT_TOTAL, TREND_WINDOW: TREND_WINDOW,
    perKg: perKg, goalAdj: goalAdj, bandFor: bandFor,
    validProfile: validProfile, rmr: rmr,
    sessionKcal: sessionKcal, macros: macros,
    dayTargets: dayTargets, weekTargets: weekTargets,
    adherence: adherence, trend: trend, correction: correction
  };
})();
