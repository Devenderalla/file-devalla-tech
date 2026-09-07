/* ═══════════════════════════════════════════════════════════
   Gym Basics — food database + meal shapes
   What data.js is to the exercise library, this is to the
   nutrition page.

   Every item is something sold in a normal Indian kirana or
   already in the fridge. No powders, no bars, nothing that has
   to be ordered. A target you can't buy is not a target.

   Values are per the serving named, not per 100 g, because
   nobody weighs a katori of dal. They are ordinary published
   averages and will be a few per cent out for your kitchen —
   which is well inside the error of the calorie estimate they
   are being matched against.
   ═══════════════════════════════════════════════════════════ */

window.GBFood = (function () {
  "use strict";

  /* meals: b breakfast · l lunch · s snack/post-gym · d dinner
     step:  the smallest sensible increment, in servings
     max:   past this it stops being a meal and starts being a dare */

  var PROTEIN = [
    { id: "egg", one: "egg", many: "eggs", diet: "egg", kcal: 78, p: 6.3, c: 0.6, f: 5.3,
      step: 1, max: 6, meals: ["b", "s", "d"] },
    { id: "eggwhite", one: "egg white", many: "egg whites", diet: "egg", kcal: 17, p: 3.6, c: 0.2, f: 0.1,
      step: 2, max: 8, meals: ["b", "s"] },
    { id: "paneer", one: "100g paneer", diet: "veg", kcal: 296, p: 18, c: 1.2, f: 25,
      step: 0.25, max: 1.5, grams: 100, meals: ["b", "l", "s", "d"] },
    { id: "curd", one: "katori of curd", many: "katori of curd", diet: "veg", kcal: 92, p: 5.3, c: 7, f: 5,
      step: 0.5, max: 3, meals: ["b", "l", "s", "d"] },
    { id: "dal", one: "katori of dal", many: "katori of dal", diet: "veg", kcal: 175, p: 10, c: 30, f: 1,
      step: 0.5, max: 3, meals: ["l", "d"] },
    { id: "rajma", one: "katori of rajma or chana", many: "katori of rajma or chana", diet: "veg", kcal: 269, p: 14.5, c: 45, f: 4.2,
      step: 0.5, max: 2, meals: ["l", "d"] },
    { id: "soya", one: "50g soya chunks", diet: "veg", kcal: 172, p: 26, c: 16, f: 0.3,
      step: 0.5, max: 2, grams: 50, meals: ["l", "s", "d"] },
    { id: "sprouts", one: "katori of sprouts", many: "katori of sprouts", diet: "veg", kcal: 100, p: 8, c: 17, f: 0.5,
      step: 0.5, max: 2, meals: ["b", "s", "l"] },
    { id: "chana", one: "50g roasted chana", diet: "veg", kcal: 182, p: 10, c: 30, f: 3,
      step: 0.5, max: 1.5, grams: 50, meals: ["b", "s"] },
    { id: "tofu", one: "100g tofu", diet: "veg", kcal: 76, p: 8, c: 1.9, f: 4.8,
      step: 0.5, max: 2, grams: 100, meals: ["l", "s", "d"] },
    { id: "milk", one: "glass of milk", many: "glasses of milk", diet: "veg", kcal: 145, p: 8, c: 12, f: 6.5,
      step: 0.5, max: 2, meals: ["b", "s"] },
    { id: "chicken", one: "100g chicken breast", diet: "nonveg", kcal: 165, p: 31, c: 0, f: 3.6,
      step: 0.25, max: 2.5, grams: 100, meals: ["l", "s", "d"] },
    { id: "fish", one: "100g fish", diet: "nonveg", kcal: 120, p: 20, c: 0, f: 4,
      step: 0.25, max: 2.5, grams: 100, meals: ["l", "d"] },
    { id: "mutton", one: "100g mutton", diet: "nonveg", kcal: 258, p: 25, c: 0, f: 17,
      step: 0.25, max: 1, grams: 100, meals: ["l", "d"] }
  ];

  var CARB = [
    { id: "oats", one: "40g oats", diet: "veg", kcal: 152, p: 5.2, c: 27, f: 2.8,
      step: 0.5, max: 2, grams: 40, meals: ["b", "s"] },
    { id: "poha", one: "plate of poha", many: "plates of poha", diet: "veg", kcal: 250, p: 4, c: 45, f: 6,
      step: 0.5, max: 1.5, meals: ["b", "s"] },
    { id: "upma", one: "plate of upma", many: "plates of upma", diet: "veg", kcal: 250, p: 6, c: 40, f: 8,
      step: 0.5, max: 1.5, meals: ["b", "s"] },
    { id: "idli", one: "idli", many: "idlis", diet: "veg", kcal: 58, p: 2, c: 12, f: 0.4,
      step: 1, max: 6, meals: ["b", "s"] },
    { id: "dosa", one: "plain dosa", many: "plain dosas", diet: "veg", kcal: 133, p: 3, c: 21, f: 4,
      step: 1, max: 4, meals: ["b", "d"] },
    { id: "bread", one: "slice of brown bread", many: "slices of brown bread", diet: "veg", kcal: 70, p: 2.4, c: 13, f: 0.9,
      step: 1, max: 4, meals: ["b", "s"] },
    { id: "rice", one: "cup of rice", many: "cups of rice", diet: "veg", kcal: 195, p: 4, c: 43, f: 0.4,
      step: 0.5, max: 3, meals: ["l", "d"] },
    { id: "roti", one: "roti", many: "rotis", diet: "veg", kcal: 110, p: 3.2, c: 20, f: 2,
      step: 1, max: 5, meals: ["l", "d"] },
    { id: "sweetpotato", one: "150g sweet potato", diet: "veg", kcal: 129, p: 2.4, c: 30, f: 0.2,
      step: 1, max: 2, grams: 150, meals: ["l", "s", "d"] },
    { id: "banana", one: "banana", many: "bananas", diet: "veg", kcal: 105, p: 1.3, c: 27, f: 0.4,
      step: 1, max: 3, meals: ["b", "s"] }
  ];

  var EXTRA = [
    { id: "peanuts", one: "30g peanuts", diet: "veg", kcal: 170, p: 7.7, c: 5, f: 14.7, grams: 30 },
    { id: "almonds", one: "a handful of almonds", diet: "veg", kcal: 87, p: 3.2, c: 3.3, f: 7.5 },
    { id: "pb", one: "tbsp peanut butter", many: "tbsp peanut butter", diet: "veg", kcal: 94, p: 4, c: 3, f: 8 },
    { id: "ghee", one: "tsp ghee", many: "tsp ghee", diet: "veg", kcal: 45, p: 0, c: 0, f: 5 }
  ];

  /* always on the plate at lunch and dinner, never counted as the point of the meal */
  var VEG = { one: "a bowl of sabzi or salad", kcal: 80, p: 3, c: 10, f: 3 };

  var DIETS = {
    veg:    ["veg"],
    egg:    ["veg", "egg"],
    nonveg: ["veg", "egg", "nonveg"]
  };
  var DIET_LABEL = { veg: "Vegetarian", egg: "Egg-etarian", nonveg: "Non-vegetarian" };

  function allowed(list, diet, meal) {
    var ok = DIETS[diet] || DIETS.veg;
    return list.filter(function (f) {
      return ok.indexOf(f.diet) > -1 && (!meal || !f.meals || f.meals.indexOf(meal) > -1);
    });
  }

  /* how many servings to hit a macro target, in the food's own increments */
  function servingsFor(food, target, key) {
    if (!food[key]) return food.step;
    var raw = target / food[key];
    var n = Math.round(raw / food.step) * food.step;
    return Math.max(food.step, Math.min(food.max, n));
  }

  function label(food, n) {
    var name = n <= 1 ? food.one : (food.many || food.one);
    if (food.grams) {
      /* "100g paneer" × 2.5 reads better as "250g paneer" */
      var g = Math.round(food.grams * n);
      return name.replace(/^\d+g/, g + "g");
    }
    var qty = n % 1 === 0 ? String(n) : String(n).replace(/\.5$/, "½").replace(/^0½/, "½");
    return qty + " " + name;
  }

  function portion(food, n) {
    return {
      id: food.id, text: label(food, n), servings: n,
      kcal: Math.round(food.kcal * n), p: Math.round(food.p * n),
      c: Math.round(food.c * n), f: Math.round(food.f * n)
    };
  }

  /* ── the day's meals ──────────────────────────────────────

     Not a meal plan in the diet-chart sense — one worked example
     of what the day's numbers look like as food, so the target
     stops being abstract. Shares are the ordinary Indian shape of
     a day: a real breakfast, the biggest meal at lunch, something
     after training, a lighter dinner.

     `seed` is the day of the week, so Tuesday isn't Monday again
     but Tuesday is still Tuesday when you reopen the page. */

  /* How many times a day you eat is itself a level decision. A
     beginner given a five-feed schedule quits in a fortnight and
     concludes the gym is for other people; three meals and something
     after training is the version that survives contact with a job.
     The extra feeds only start earning their keep once total protein
     is high enough that landing it in four sittings is a chore. */
  var SLOTS = {
    1: [
      { key: "b", label: "Breakfast", p: 0.30, c: 0.28, veg: false, restP: 0.34, restC: 0.34 },
      { key: "l", label: "Lunch",     p: 0.32, c: 0.34, veg: true,  restP: 0.36, restC: 0.38 },
      { key: "s", label: "Post-gym",  p: 0.16, c: 0.18, veg: false, trainingOnly: true },
      { key: "d", label: "Dinner",    p: 0.22, c: 0.20, veg: true,  restP: 0.30, restC: 0.28 }
    ],
    2: [
      { key: "b", label: "Breakfast", p: 0.28, c: 0.26, veg: false },
      { key: "l", label: "Lunch",     p: 0.28, c: 0.32, veg: true  },
      { key: "s", label: "Post-gym",  p: 0.18, c: 0.20, veg: false, restLabel: "Evening snack" },
      { key: "d", label: "Dinner",    p: 0.26, c: 0.22, veg: true  }
    ],
    3: [
      { key: "b", label: "Breakfast",   p: 0.22, c: 0.20, veg: false },
      { key: "s", label: "Mid-morning", p: 0.16, c: 0.14, veg: false },
      { key: "l", label: "Lunch",       p: 0.24, c: 0.28, veg: true  },
      { key: "s", label: "Post-gym",    p: 0.18, c: 0.20, veg: false, restLabel: "Evening snack" },
      { key: "d", label: "Dinner",      p: 0.20, c: 0.18, veg: true  }
    ]
  };

  /* Drop the training-only slots on a rest day and use that level's
     rest-day shares, so the day still adds up to one whole day. */
  function slotsFor(level, training) {
    var rows = SLOTS[level] || SLOTS[1];
    return rows.filter(function (s) {
      return training || !s.trainingOnly;
    }).map(function (s) {
      if (training || s.restP == null) return s;
      return { key: s.key, label: s.label, veg: s.veg, restLabel: s.restLabel, p: s.restP, c: s.restC };
    });
  }

  /* Pick the item that lands closest to what the slot still needs,
     penalising anything that would blow the slot's share of the fat
     budget — that is what stops a vegetarian breakfast coming back as
     a quarter-kilo of paneer. Anything already used today is dropped
     first, so nobody is told to eat rajma at lunch and again at
     dinner. Among the ones that fit, the seed rotates, so the week
     isn't Monday seven times. */
  function choose(pool, used, want, key, budget, seed) {
    var fresh = pool.filter(function (f) { return used.indexOf(f.id) === -1; });
    if (!fresh.length) fresh = pool;
    if (!fresh.length) return null;

    var scored = fresh.map(function (f) {
      var p = portion(f, servingsFor(f, want, key));
      var miss = Math.abs(p[key] - want) / Math.max(want, 1);
      /* An item is picked for one macro but arrives carrying the other two.
         Three katori of dal is the best protein fit for a dinner and brings
         90 g of carbohydrate nobody asked for; a breakfast built to protein
         alone comes back as paneer. Every macro the slot cannot afford is
         charged for, or the day lands on protein and misses everything. */
      var over = 0;
      if (budget) {
        ["c", "f"].forEach(function (m) {
          if (m !== key && budget[m] != null) over += Math.max(0, p[m] - budget[m]) / Math.max(budget[m], 1);
        });
      }
      return { food: f, portion: p, score: miss + over * 0.7 };
    }).sort(function (a, b) { return a.score - b.score; });

    var top = scored.slice(0, Math.min(3, scored.length));
    return top[seed % top.length];
  }

  function meals(target, diet, seed, training, level) {
    diet = diet || "veg";
    seed = seed || 0;
    var usedP = [], usedC = [];
    /* Rounding to whole rotis and half-katoris never lands exactly, and
       left alone the error compounds across the day — five small slots
       each rounding up is how an advanced day ends up 400 kcal over.
       Both macros are carried, so each slot asks for its share minus
       whatever the day is already holding. */
    var carryP = 0, carryC = 0;

    var out = slotsFor(+level || 1, training).map(function (slot, i) {
      var shareP = target.protein * slot.p;
      var shareC = target.carbs * slot.c;
      var wantP = Math.max(shareP * 0.4, shareP - carryP);
      var wantC = Math.max(0, shareC - carryC);
      var wantF = target.fat * slot.p;     /* fat rides along with the protein share */
      var items = [];

      var pool = allowed(PROTEIN, diet, slot.key);
      var pick = choose(pool, usedP, wantP, "p", { c: wantC, f: wantF }, seed + i);
      if (pick) {
        usedP.push(pick.food.id);
        items.push(pick.portion);
        wantC -= pick.portion.c;           /* dal and rajma are carbohydrate too */
      }

      /* No single item can carry a whole slot once the meals get big —
         a katori of curd caps out around 16 g of protein. Real plates
         have two sources on them, so when the first anchor lands well
         short, a second one goes on beside it rather than the day
         quietly missing its protein. */
      if (pick && pick.portion.p < wantP * 0.7) {
        var second = choose(pool, usedP, wantP - pick.portion.p, "p",
          { c: Math.max(0, wantC), f: Math.max(0, wantF - pick.portion.f) }, seed + i + 1);
        if (second && second.food.id !== pick.food.id) {
          usedP.push(second.food.id);
          items.push(second.portion);
          wantC -= second.portion.c;
        }
      }

      if (wantC > 8) {
        var cpick = choose(allowed(CARB, diet, slot.key), usedC, wantC, "c",
          { f: Math.max(0, wantF - items.reduce(function (a, it) { return a + it.f; }, 0)) }, seed + i);
        if (cpick) { usedC.push(cpick.food.id); items.push(cpick.portion); }
      }

      if (slot.veg) items.push({ id: "veg", text: VEG.one, servings: 1, kcal: VEG.kcal, p: VEG.p, c: VEG.c, f: VEG.f });

      carryP += items.reduce(function (a, it) { return a + it.p; }, 0) - shareP;
      carryC += items.reduce(function (a, it) { return a + it.c; }, 0) - shareC;

      return {
        label: (!training && slot.restLabel) ? slot.restLabel : slot.label,
        items: items
      };
    });

    /* fat lands last: protein and carbohydrate are chosen for their own
       reasons, and whatever fat is still owed goes on as something you'd
       actually add to a plate rather than by adjusting everything above */
    var sofar = totals(out);
    var owed = target.fat - sofar.f;
    if (owed > 6) {
      var pool = allowed(EXTRA, diet);
      var ef = pool[seed % pool.length];
      var n = Math.max(1, Math.round(owed / ef.f));
      var slot = (seed % 2) ? 0 : Math.min(2, out.length - 1);
      out[slot].items.push(portion(ef, Math.min(n, 3)));
    }

    return out;
  }

  function totals(mealList) {
    var t = { kcal: 0, p: 0, c: 0, f: 0 };
    mealList.forEach(function (m) {
      m.items.forEach(function (it) {
        t.kcal += it.kcal; t.p += it.p; t.c += it.c; t.f += it.f;
      });
    });
    return t;
  }

  return {
    PROTEIN: PROTEIN, CARB: CARB, EXTRA: EXTRA, VEG: VEG,
    DIETS: DIETS, DIET_LABEL: DIET_LABEL, SLOTS: SLOTS,
    allowed: allowed, slotsFor: slotsFor, meals: meals, totals: totals, label: label
  };
})();
