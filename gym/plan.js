/* ═══════════════════════════════════════════════════════════
   Gym Basics — training engine
   Two layers, no DOM:

   1. Selection  — pick / rx / bestRx / STRUCT. Lifted out of the
      workout builder so the weekly planner uses the same logic
      instead of a second copy that drifts.
   2. Week       — split templates, day generation, progression.

   Loads after data.js, before app.js.
   ═══════════════════════════════════════════════════════════ */

window.GBPlan = (function () {
  "use strict";
  var GB = window.GB;

  /* ═══ 1. selection engine ═══ */

  /* which kit each "available equipment" answer allows */
  var KIT_SETS = {
    full: null, /* everything */
    machines: ["machine", "cable", "cardio", "bodyweight"],
    dumbbells: ["dumbbell", "kettlebell", "bodyweight", "cardio"]
  };

  /* structure by duration: how many of each role */
  var STRUCT = {
    20: { main: 1, acc: 1, core: 1, cond: 0 },
    30: { main: 2, acc: 1, core: 1, cond: 0 },
    45: { main: 3, acc: 2, core: 1, cond: 0 },
    60: { main: 3, acc: 3, core: 1, cond: 1 },
    75: { main: 4, acc: 3, core: 2, cond: 1 },
    90: { main: 4, acc: 4, core: 2, cond: 1 }
  };

  function bestRx(ex, lv) {
    return ex.rx[lv] || ex.rx[lv - 1] || ex.rx[lv + 1] || ex.rx[1] || ex.rx[2] || ex.rx[3];
  }

  /* goal reshapes the prescription rather than the exercise: the
     database is too thin on fatloss/endurance tags to select on alone */
  function rx(ex, level, goal, role) {
    var base = bestRx(ex, level);
    if (!base || base.time) return base;
    var out = { sets: base.sets, reps: base.reps, rest: base.rest };
    if (role === "main") {
      if (goal === "strength" && level > 1) { out.reps = "5–8"; out.rest = Math.max(base.rest, 180); }
      if (goal === "fatloss" || goal === "endurance") { out.reps = "12–15"; out.rest = Math.min(base.rest, 60); }
    }
    return out;
  }

  /* opts: {level, goal, kit, muscles, used, usedMuscles, offset}
     `used` and `usedMuscles` are mutated, as the builder relies on. */
  function pick(role, count, opts) {
    if (!count) return [];
    var kits = KIT_SETS[opts.kit];
    var muscles = opts.muscles || ["full"];
    var used = opts.used || [];
    var usedMuscles = opts.usedMuscles || [];
    var wantAll = muscles.indexOf("full") > -1;

    var pool = GB.EXERCISES.filter(function (x) {
      if (x.role !== role) return false;
      if (x.level > opts.level) return false;
      if (kits && kits.indexOf(x.kit) === -1) return false;
      if (used.indexOf(x.id) > -1) return false;
      /* core and conditioning serve any focus, so they skip the muscle filter */
      if (!wantAll && muscles.indexOf(x.muscle) === -1 &&
          !(role === "conditioning" || role === "core" || role === "warmup" || role === "cooldown")) return false;
      if (!bestRx(x, opts.level)) return false;
      return true;
    });

    /* goal match first, then exact level match, then spread across muscles */
    pool.sort(function (a, b) {
      var ga = a.goals.indexOf(opts.goal) > -1 ? 0 : 1;
      var gb = b.goals.indexOf(opts.goal) > -1 ? 0 : 1;
      if (ga !== gb) return ga - gb;
      var la = a.level === opts.level ? 0 : 1;
      var lb = b.level === opts.level ? 0 : 1;
      if (la !== lb) return la - lb;
      return 0;
    });

    /* offset rotates *within* the tier of equally-good candidates, so two
       days of the same split (Full body A / B) differ without either
       becoming the worse session. offset 0 reproduces the builder exactly. */
    var offset = opts.offset || 0;
    var out = [];
    while (out.length < count && pool.length) {
      var fresh = [];
      pool.forEach(function (x, i) { if (usedMuscles.indexOf(x.muscle) === -1) fresh.push(i); });
      var idx = fresh.length ? fresh[offset % fresh.length] : (offset % pool.length);
      var chosen = pool.splice(idx, 1)[0];
      out.push(chosen);
      used.push(chosen.id);
      usedMuscles.push(chosen.muscle);
    }
    return out;
  }

  /* ═══ 2. week engine ═══ */

  var DOW = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  /* The muscle taxonomy has a single "arms" bucket, so a pull day would
     otherwise be free to pick triceps work and a push day biceps curls. */
  var TRICEPS = ["triceps-pushdown", "overhead-triceps"];
  var BICEPS = ["db-curl", "ez-curl"];

  /* day templates — a name plus a muscle focus. Counts still come from
     STRUCT[duration], so a day generates through the proven builder path. */
  var TPL = {
    fullA:   { name: "Full body A", muscles: ["full"], offset: 0 },
    fullB:   { name: "Full body B", muscles: ["full"], offset: 1 },
    fullC:   { name: "Full body C", muscles: ["full"], offset: 2 },
    upperA:  { name: "Upper A", muscles: ["chest", "back", "shoulders", "arms"], offset: 0 },
    upperB:  { name: "Upper B", muscles: ["chest", "back", "shoulders", "arms"], offset: 1 },
    lowerA:  { name: "Lower A", muscles: ["legs", "glutes"], offset: 0 },
    lowerB:  { name: "Lower B", muscles: ["legs", "glutes"], offset: 1 },
    pushA:   { name: "Push A", muscles: ["chest", "shoulders", "arms"], offset: 0, avoid: BICEPS },
    pushB:   { name: "Push B", muscles: ["chest", "shoulders", "arms"], offset: 1, avoid: BICEPS },
    pullA:   { name: "Pull A", muscles: ["back", "arms"], offset: 0, avoid: TRICEPS },
    pullB:   { name: "Pull B", muscles: ["back", "arms"], offset: 1, avoid: TRICEPS },
    legsA:   { name: "Legs A", muscles: ["legs", "glutes"], offset: 0 },
    legsB:   { name: "Legs B", muscles: ["legs", "glutes"], offset: 1 },
    cardio:  { name: "Cardio + core", muscles: ["full"], offset: 0, cardioDay: true }
  };

  /* Beginners are not given six lifting days. Level 1 has 14 main+accessory
     exercises (back: 2, glutes: 0) — six lifting days would repeat the same
     handful, and more days is not automatically better. Extra days become
     cardio and active recovery instead. */
  var SPLITS = {
    1: {
      2: ["fullA", "fullB"],
      3: ["fullA", "fullB", "fullC"],
      4: ["fullA", "fullB", "fullA", "fullB"],
      5: ["fullA", "fullB", "cardio", "fullC"],
      6: ["fullA", "fullB", "cardio", "fullC", "fullA"]
    },
    2: {
      2: ["upperA", "lowerA"],
      3: ["pushA", "pullA", "legsA"],
      4: ["upperA", "lowerA", "upperB", "lowerB"],
      5: ["pushA", "pullA", "legsA", "upperB", "lowerB"],
      6: ["pushA", "pullA", "legsA", "pushB", "pullB", "legsB"]
    },
    3: {
      2: ["upperA", "lowerA"],
      3: ["pushA", "pullA", "legsA"],
      4: ["upperA", "lowerA", "upperB", "lowerB"],
      5: ["pushA", "pullA", "legsA", "upperB", "lowerB"],
      6: ["pushA", "pullA", "legsA", "pushB", "pullB", "legsB"]
    }
  };

  /* which weekdays carry the training, spread for recovery */
  var PLACEMENT = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };

  /* week 1–4 focus. Progression is real but conservative: volume before load,
     and never an automatic weight jump. */
  var WEEKS = {
    1: { focus: "Learn the movements", note: "Lightest settings that still feel like work. Success this week is finishing every session.", sets: 0 },
    2: { focus: "Same weights, better reps", note: "Nothing gets heavier. Slow the lowering, use the full range, breathe on rhythm.", sets: 0 },
    3: { focus: "Add volume", note: "One extra set on the main lifts. Weights stay exactly where they were.", sets: 1 },
    4: { focus: "Add load", note: "Back to the week-2 set count. Where all sets felt smooth, take the next weight up — a small jump.", sets: 0 }
  };

  var ACTIVE = {
    name: "Active recovery",
    suggestions: ["A 20–30 minute walk, outdoors if you can", "Easy mobility — hip circles, cat–cow, shoulder rolls", "Stretch whatever is still sore from the last session"]
  };
  var REST = {
    name: "Rest",
    suggestions: ["Nothing planned — this is where the training actually pays off", "Eat normally, drink water, sleep well", "A gentle walk is fine if you want to move"]
  };

  function weekMeta(n) { return WEEKS[((n - 1) % 4) + 1]; }

  /* rough session length from the work itself, per planing1 */
  function estimateMinutes(day) {
    var mins = 0;
    day.blocks.forEach(function (b) {
      b.items.forEach(function (it) {
        if (it.rx.time) {
          var m = String(it.rx.time).match(/(\d+)\s*min/);
          mins += m ? +m[1] : 1;                       /* a drill is about a minute */
        } else {
          var sets = it.rx.sets || 1;
          mins += sets * (45 + (it.rx.rest || 60)) / 60; /* ~45s under load + the rest */
        }
      });
    });
    return Math.max(15, Math.round(mins / 5) * 5);
  }

  function buildDay(tplId, cfg) {
    var tpl = TPL[tplId];
    var wk = weekMeta(cfg.weekNumber);
    var st = STRUCT[cfg.duration] || STRUCT[45];
    /* fat loss and endurance always earn a conditioning finisher, not only
       at the longer durations the builder reserves it for */
    var wantCond = st.cond || ((cfg.goal === "fatloss" || cfg.goal === "endurance") && cfg.duration >= 30);
    /* keyed to the template, not the weekday: on an A/B/A/B week, Monday's
       Full body A and Thursday's Full body A are deliberately the same
       session — that repetition is how the movement gets learned. */
    var offset = (tpl.offset || 0) + (cfg.seed || 0);

    /* seeding `used` is how a template rules an exercise out */
    var used = (tpl.avoid || []).slice(), usedMuscles = [];
    var base = { level: cfg.level, goal: cfg.goal, kit: cfg.kit || "full", used: used };

    function take(role, count, muscles, um, off) {
      return pick(role, count, {
        level: base.level, goal: base.goal, kit: base.kit, muscles: muscles,
        used: used, usedMuscles: um, offset: off
      });
    }

    /* pre-gym: one easy cardio piece + two dynamic drills */
    var warmCardio = take("warmup", 1, ["full"], [], offset);
    var warmPrep = GB.EXERCISES.filter(function (x) {
      return x.role === "warmup" && x.kit !== "cardio" && used.indexOf(x.id) === -1;
    });
    var prep = [];
    for (var i = 0; i < 2 && warmPrep.length; i++) {
      var pk = warmPrep.splice((offset + i) % warmPrep.length, 1)[0];
      used.push(pk.id); prep.push(pk);
    }

    var mains = tpl.cardioDay ? [] : take("main", st.main, tpl.muscles, usedMuscles, offset);
    if (!tpl.cardioDay && mains.length < st.main) {
      mains = mains.concat(take("accessory", st.main - mains.length, tpl.muscles, usedMuscles, offset));
    }
    var accs = tpl.cardioDay ? [] : take("accessory", st.acc, tpl.muscles, usedMuscles.slice(), offset);
    var cores = take("core", tpl.cardioDay ? 2 : st.core, ["full"], [], offset);
    var conds = (tpl.cardioDay || wantCond) ? take("conditioning", tpl.cardioDay ? 2 : (st.cond || 1), ["full"], [], offset) : [];

    /* post-gym: three stretches, rotated so it is not the same three daily */
    var coolPool = GB.EXERCISES.filter(function (x) { return x.role === "cooldown"; });
    var cools = [];
    for (var j = 0; j < 3 && coolPool.length; j++) {
      cools.push(coolPool.splice((offset + j * 2) % coolPool.length, 1)[0]);
    }

    function item(ex, role) {
      var r = rx(ex, cfg.level, cfg.goal, role);
      var out = { id: ex.id, name: ex.name, kit: ex.kit, eq: ex.eq || null, muscles: ex.musclesText, role: role, rx: r };
      /* week 3 adds a set to the main lifts; show what changed */
      if (role === "main" && r && !r.time && wk.sets) {
        out.rx = { sets: r.sets + wk.sets, reps: r.reps, rest: r.rest };
        out.prev = r.sets + " × " + r.reps;
      }
      return out;
    }
    function block(label, list, role) {
      return { label: label, role: role, items: list.map(function (x) { return item(x, role); }) };
    }

    var blocks = [block("Pre-gym · Warm-up", warmCardio.concat(prep), "warmup")];
    if (mains.length) blocks.push(block("Main work", mains, "main"));
    if (accs.length) blocks.push(block("Accessory work", accs, "accessory"));
    if (conds.length) blocks.push(block("Conditioning", conds, "conditioning"));
    if (cores.length) blocks.push(block("Core", cores, "core"));
    blocks.push(block("Post-gym · Cool-down", cools, "cooldown"));

    var day = { type: "train", tpl: tplId, name: tpl.name, blocks: blocks };
    day.count = blocks.reduce(function (a, b) {
      return a + (b.role === "warmup" || b.role === "cooldown" ? 0 : b.items.length);
    }, 0);
    day.minutes = estimateMinutes(day);
    return day;
  }

  /* cfg: {level, days, goal, duration, kit, weekNumber, seed} */
  function generate(cfg) {
    cfg = cfg || {};
    var c = {
      level: +cfg.level || 1,
      days: Math.min(6, Math.max(2, +cfg.days || 3)),
      goal: cfg.goal || "fitness",
      duration: +cfg.duration || 45,
      kit: cfg.kit || "full",
      weekNumber: +cfg.weekNumber || 1,
      seed: +cfg.seed || 0
    };
    var split = (SPLITS[c.level] || SPLITS[1])[c.days] || SPLITS[1][3];
    var slots = PLACEMENT[c.days] || PLACEMENT[3];

    var week = [], t = 0;
    for (var d = 0; d < 7; d++) {
      var slot = slots.indexOf(d);
      if (slot > -1 && t < split.length) {
        var day = buildDay(split[t], c);
        day.dow = d; day.dayName = DOW[d]; day.short = DOW_SHORT[d];
        week.push(day); t++;
      } else {
        /* one active-recovery day; the rest are honest rest days */
        var isActive = (slot > -1) || (d === 5 && c.days <= 3);
        var r = isActive ? ACTIVE : REST;
        week.push({
          type: isActive ? "active" : "rest", dow: d, dayName: DOW[d], short: DOW_SHORT[d],
          name: r.name, suggestions: r.suggestions.slice(), blocks: [], count: 0, minutes: isActive ? 25 : 0
        });
      }
    }

    var wk = weekMeta(c.weekNumber);
    return {
      v: 1, level: c.level, days: c.days, goal: c.goal, duration: c.duration, kit: c.kit,
      weekNumber: c.weekNumber, seed: c.seed,
      focus: wk.focus, note: wk.note,
      trainingDays: split.length,
      week: week
    };
  }

  /* Monday-first index for today */
  function todayIndex(now) {
    var d = (now || new Date()).getDay(); /* 0 = Sunday */
    return (d + 6) % 7;
  }

  return {
    /* selection */
    KIT_SETS: KIT_SETS, STRUCT: STRUCT, bestRx: bestRx, rx: rx, pick: pick,
    /* week */
    TPL: TPL, SPLITS: SPLITS, WEEKS: WEEKS, DOW: DOW, DOW_SHORT: DOW_SHORT,
    generate: generate, weekMeta: weekMeta, todayIndex: todayIndex, estimateMinutes: estimateMinutes
  };
})();
