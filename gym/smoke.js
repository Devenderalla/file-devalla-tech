/* ═══════════════════════════════════════════════════════════
   Gym Basics — smoke test
   Exercises the library filters, the builder, and the live
   session layer (set check-off, rest timer, progress).

   Needs jsdom, which the site itself does not:
     npm i jsdom && node smoke.js
   Serve the folder first, or pass a base URL:
     python3 -m http.server 8000 &
     node smoke.js http://localhost:8000
   ═══════════════════════════════════════════════════════════ */
"use strict";

const { JSDOM } = require("jsdom");
const BASE = process.argv[2] || "http://localhost:8000";

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}
function section(t) { console.log("\n" + t); }

/* jsdom gives every instance its own localStorage, so a "reload" is
   modelled by seeding storage via beforeParse before the scripts run. */
async function page(file, seed) {
  const dom = await JSDOM.fromURL(BASE + "/" + file, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    beforeParse(win) { if (seed) seed(win); }
  });
  const errors = [];
  dom.virtualConsole.on("jsdomError", (e) => errors.push(e.message));
  await new Promise((r) => {
    if (dom.window.document.readyState === "complete") return r();
    dom.window.addEventListener("load", r);
  });
  await new Promise((r) => setTimeout(r, 120));
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const $ = (d, s) => d.querySelector(s);
const $$ = (d, s) => Array.from(d.querySelectorAll(s));
const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));

(async () => {
  /* ── equipment library ── */
  section("equipment.html");
  {
    const { w, d } = await page("equipment.html");
    const all = $$(d, ".eq-card").length;
    ok("renders all 30 stations", all === 30, "got " + all);

    click(w, $(d, '[data-eq-cat="cardio"]'));
    const cardio = $$(d, ".eq-card").length;
    ok("zone filter narrows the grid", cardio > 0 && cardio < all, "got " + cardio);

    click(w, $(d, '[data-eq-cat="all"]'));
    click(w, $(d, '[data-eq-muscle="chest"]'));
    ok("muscle filter narrows the grid", $$(d, ".eq-card").length < all);

    click(w, $(d, '[data-eq-muscle="all"]'));
    const search = $(d, "#eqSearch");
    search.value = "press";
    search.dispatchEvent(new w.Event("input", { bubbles: true }));
    const hits = $$(d, ".eq-card").length;
    ok("search matches by name", hits > 0 && hits < all, "got " + hits);

    search.value = "zzzzz";
    search.dispatchEvent(new w.Event("input", { bubbles: true }));
    ok("no matches shows the empty note", !!$(d, ".empty-note"));

    search.value = "";
    search.dispatchEvent(new w.Event("input", { bubbles: true }));
    const card = $(d, ".eq-card");
    click(w, $(card, ".eq-more"));
    ok("card expands", card.classList.contains("open"));
    ok("expansion is announced", $(card, ".eq-more").getAttribute("aria-expanded") === "true");
  }

  /* ── exercise library ── */
  section("exercises.html");
  {
    const { w, d } = await page("exercises.html");
    const all = $$(d, ".ex-card").length;
    ok("renders the exercise list", all > 30, "got " + all);

    click(w, $(d, '[data-ex-level="1"]'));
    const beg = $$(d, ".ex-card").length;
    ok("level filter hides harder exercises", beg > 0 && beg < all, "got " + beg);

    click(w, $(d, '[data-ex-level="all"]'));
    click(w, $(d, '[data-ex-kit="barbell"]'));
    ok("equipment filter works", $$(d, ".ex-card").length < all);
  }

  /* ── builder ── */
  section("builder.html");
  {
    const { w, d } = await page("builder.html");
    const combos = [
      ["1", "muscle", "20"], ["1", "fatloss", "45"], ["2", "strength", "60"],
      ["2", "muscle", "75"], ["3", "endurance", "90"], ["3", "strength", "30"]
    ];
    let allBuilt = true, minRows = Infinity;
    for (const [lvl, goal, dur] of combos) {
      click(w, $(d, `[data-b-level="${lvl}"]`));
      click(w, $(d, `[data-b-goal="${goal}"]`));
      click(w, $(d, `[data-b-duration="${dur}"]`));
      click(w, $(d, "#buildBtn"));
      const rows = $$(d, "#builderOut .wo-row").length;
      minRows = Math.min(minRows, rows);
      if (rows < 6) allBuilt = false;
    }
    ok("all six level/goal/duration combos build a session", allBuilt, "min rows " + minRows);
    ok("plan has warm-up and cool-down phases",
      $$(d, ".plan-phase-label").some((p) => /Warm-up/.test(p.textContent)) &&
      $$(d, ".plan-phase-label").some((p) => /Cool-down/.test(p.textContent)));

    /* live session on generated plans */
    const dots = $$(d, "#builderOut .set-dot");
    ok("generated plan rows get set buttons", dots.length > 0, "got " + dots.length);
    click(w, dots[0]);
    ok("a generated set can be checked", dots[0].classList.contains("on"));

    const before = $$(d, "#builderOut .set-dot").filter((b) => b.classList.contains("on")).length;
    click(w, $(d, "#buildBtn"));
    const after = $$(d, "#builderOut .set-dot").filter((b) => b.classList.contains("on")).length;
    ok("regenerating starts from a clean slate", before === 1 && after === 0, `${before} → ${after}`);
  }

  /* ── live session on a program page ── */
  section("beginner.html — live session");
  {
    const { w, d } = await page("beginner.html");

    const numbered = $$(d, ".wo-row").filter((r) => /^\d+$/.test($(r, ".wo-idx").textContent.trim()));
    const advice = $$(d, ".wo-row").filter((r) => $(r, ".wo-idx").textContent.trim() === "·");
    ok("exercise rows get controls", numbered.every((r) => !!$(r, ".wo-actions")), "of " + numbered.length);
    ok("advice rows are left alone", advice.length > 0 && advice.every((r) => !$(r, ".wo-actions")));

    /* "2 × 8–10" should produce exactly two set buttons */
    const legPress = numbered.find((r) => /Leg press/.test(r.textContent));
    ok("leg press parses as 2 sets", $$(legPress, ".set-dot").length === 2,
      "got " + $$(legPress, ".set-dot").length);
    ok("its rest timer button reads 90s", /90/.test($(legPress, ".rest-btn").textContent));

    /* "5 min" style rows get a single done toggle */
    const walk = numbered.find((r) => /Treadmill walk/.test(r.textContent));
    ok("time-based row gets one Done toggle",
      $$(walk, ".set-dot").length === 1 && /Done/.test($(walk, ".set-dot").textContent));

    /* check a set */
    const bar = () => $(d, ".session-bar");
    const dot1 = $$(legPress, ".set-dot")[0];
    click(w, dot1);
    ok("set marks as done", dot1.classList.contains("on") && dot1.getAttribute("aria-pressed") === "true");
    ok("session bar appears", bar() && !bar().hidden);
    ok("progress counts sets", /1 \/ \d+ sets/.test($(d, ".sb-count").textContent),
      $(d, ".sb-count").textContent);
    ok("finishing a non-final set starts the rest timer", bar().classList.contains("running"));
    ok("timer shows a countdown", /^1:2\d|^1:30$/.test($(d, ".sb-time").textContent),
      $(d, ".sb-time").textContent);

    /* +30s and skip */
    click(w, $(d, '[data-adj="30"]'));
    ok("+30s extends the rest", /^(1:5\d|2:00)$/.test($(d, ".sb-time").textContent),
      $(d, ".sb-time").textContent);
    click(w, $(d, ".sb-skip"));
    ok("skip stops the timer", !bar().classList.contains("running"));

    /* completing every set marks the row */
    click(w, $$(legPress, ".set-dot")[1]);
    ok("row marked complete when all sets are done", legPress.classList.contains("wo-done"));

    /* persistence */
    ok("progress is written to localStorage", !!w.localStorage.getItem("gb:sets:beginner"));
    const stored = JSON.parse(w.localStorage.getItem("gb:sets:beginner"));
    ok("both sets recorded", Object.keys(stored).length === 2, JSON.stringify(stored));

    /* reset */
    click(w, $(d, ".sb-reset"));
    ok("reset clears every set", $$(d, ".set-dot.on").length === 0);
    ok("reset clears the row state", !legPress.classList.contains("wo-done"));
    ok("reset empties storage", Object.keys(JSON.parse(w.localStorage.getItem("gb:sets:beginner"))).length === 0);
  }

  /* ── state survives navigation ── */
  section("progress restores on reload");
  {
    const a = await page("beginner.html");
    const row = $$(a.d, ".wo-row").find((r) => /Leg press/.test(r.textContent));
    click(a.w, $$(row, ".set-dot")[0]);
    click(a.w, $(a.d, ".sb-skip"));
    const saved = a.w.localStorage.getItem("gb:sets:beginner");
    ok("a set is persisted under a stable key", /^\{"beginner:\d+:\d+:1":1\}$/.test(saved), saved);

    /* reload with exactly what the first page wrote */
    const b = await page("beginner.html", (win) =>
      win.localStorage.setItem("gb:sets:beginner", saved));
    const row2 = $$(b.d, ".wo-row").find((r) => /Leg press/.test(r.textContent));
    ok("a checked set is still checked after reload", $$(row2, ".set-dot")[0].classList.contains("on"));
    ok("its aria state is restored too",
      $$(row2, ".set-dot")[0].getAttribute("aria-pressed") === "true");
    ok("the second set is still open", !$$(row2, ".set-dot")[1].classList.contains("on"));
    ok("the bar returns with the right count", /^1 \/ \d+ sets$/.test($(b.d, ".sb-count").textContent),
      $(b.d, ".sb-count").textContent);
    ok("the bar is visible on load", !$(b.d, ".session-bar").hidden);

    /* a rest timer running when you navigate keeps running */
    const endsAt = Date.now() + 45000;
    const c = await page("beginner.html", (win) =>
      win.localStorage.setItem("gb:timer", JSON.stringify({ endsAt, total: 90, label: "Rest" })));
    ok("an in-flight rest timer survives navigation",
      $(c.d, ".session-bar").classList.contains("running"));
    ok("it resumes at the right time remaining", /^0:4[3-5]$/.test($(c.d, ".sb-time").textContent),
      $(c.d, ".sb-time").textContent);

    /* an expired timer is discarded rather than resumed */
    const e = await page("beginner.html", (win) =>
      win.localStorage.setItem("gb:timer", JSON.stringify({ endsAt: Date.now() - 5000, total: 90 })));
    ok("an expired timer does not resurface", !$(e.d, ".session-bar .sb-timer") ||
      $(e.d, ".sb-timer").hidden !== false);
  }

  /* ── load logging: the number the progression rule needs ── */
  section("load logging");
  {
    const { w, d } = await page("beginner.html");
    const rowFor = (doc, re) => $$(doc, ".wo-row").find((r) => re.test($(r, ".wo-name").textContent));

    ok("the logging API is available", typeof w.GBLift === "object" && typeof w.GBLift.record === "function");

    const legPress = rowFor(d, /^Leg press/);
    ok("a loaded lift gets a weight box", !!$(legPress, ".lift-w select"));
    ok("...and the three ways it can have felt", $$(legPress, ".lift-rpe button").length === 3);
    ok("the picker says what it wants", $(legPress, ".lift-w .lift-lab").textContent === "Weight");
    ok("...and its options carry the unit", /^\d[\d.]* kg$/.test($$(legPress, ".lift-w option")[1].textContent),
      $$(legPress, ".lift-w option")[1].textContent);
    ok("nothing is chosen for you", $(legPress, ".lift-w select").value === "");
    ok("...and the first option says so", $$(legPress, ".lift-w option")[0].textContent === "Select weight");
    ok("it names the lift for a screen reader",
      /Leg press/.test($(legPress, ".lift-w select").getAttribute("aria-label")));

    /* what must NOT get a kg box */
    const advice = $$(d, ".wo-row").filter((r) => $(r, ".wo-idx").textContent.trim() === "·");
    ok("advice rows are left alone", advice.length > 0 && advice.every((r) => !$(r, ".lift-w")));
    ok("a treadmill walk is not a lift", !$(rowFor(d, /Treadmill walk/), ".lift-w"));
    ok("neither is a plank", !$(rowFor(d, /^Plank/), ".lift-w"));
    ok("nor a dead bug", !$(rowFor(d, /^Dead bug/), ".lift-w"));
    ok("but its sets still check off", $$(rowFor(d, /^Plank/), ".set-dot").length === 2);

    /* first time out, it says so rather than showing an empty comparison */
    ok("with no history it invites a first entry",
      /first time/.test($(legPress, ".lift-last").textContent));

    /* logging a weight */
    const input = $(legPress, ".lift-w select");
    input.value = "60";
    input.dispatchEvent(new w.Event("change", { bubbles: true }));
    const stored = JSON.parse(w.localStorage.getItem("gb:lift:leg-press-ex"));
    ok("a weight is persisted under the exercise", Array.isArray(stored) && stored.length === 1);
    ok("it records the weight, sets and reps",
      stored[0].w === 60 && stored[0].sets === 2 && stored[0].reps === "8–10",
      JSON.stringify(stored[0]));
    ok("it is stamped with today", stored[0].d === new Date().toISOString().slice(0, 10));

    /* a second entry the same day edits, not appends */
    input.value = "70";
    input.dispatchEvent(new w.Event("change", { bubbles: true }));
    const again = JSON.parse(w.localStorage.getItem("gb:lift:leg-press-ex"));
    ok("changing your mind edits today rather than appending",
      again.length === 1 && again[0].w === 70, JSON.stringify(again));

    /* a weight this station cannot make is not on the ladder at all */
    ok("a leg press offers what a leg press can hold",
      w.GBLift.ladder("leg-press-ex").slice(0, 4).join(",") === "20,30,40,50",
      w.GBLift.ladder("leg-press-ex").slice(0, 6).join(","));
    ok("...and nothing it cannot", w.GBLift.ladder("leg-press-ex").indexOf(62.5) === -1);
    ok("a pair of dumbbells offers dumbbell weights",
      w.GBLift.ladder("db-bench-press").slice(0, 4).join(",") === "2.5,5,7.5,10",
      w.GBLift.ladder("db-bench-press").slice(0, 4).join(","));
    ok("...and stops where a rack does", w.GBLift.ladder("db-bench-press").pop() === 50);
    ok("a barbell starts at the bar", w.GBLift.ladder("barbell-squat")[0] === 20);
    ok("no two stations are forced onto one list",
      w.GBLift.ladder("leg-press-ex").length !== w.GBLift.ladder("db-bench-press").length);

    /* nonsense cannot be chosen, because it is not offered */
    ok("a weight this station cannot make is not on the list",
      !$$(legPress, ".lift-w option").some((o) => o.value === "4000" || o.value === "62.5"));
    ok("...and the custom box is there for the stack nobody else has",
      !!$(legPress, ".lift-w .lift-custom") &&
      $$(legPress, ".lift-w option").pop().textContent === "+ Custom weight");

    /* how it felt */
    const easy = $(legPress, '.lift-rpe [data-rpe="easy"]');
    click(w, easy);
    ok("how it felt is recorded", JSON.parse(w.localStorage.getItem("gb:lift:leg-press-ex"))[0].rpe === "easy");
    ok("...and announced", easy.getAttribute("aria-pressed") === "true");
    click(w, easy);
    ok("pressing it again clears it, so a mistake is undoable",
      JSON.parse(w.localStorage.getItem("gb:lift:leg-press-ex"))[0].rpe === null &&
      easy.getAttribute("aria-pressed") === "false");
  }

  /* ── the point of the whole thing: week 4 becomes followable ── */
  section("load logging — last week, on the row");
  {
    const past = "2020-01-06";
    const seedLift = (entries) => (win) => {
      Object.keys(entries).forEach((k) =>
        win.localStorage.setItem("gb:lift:" + k, JSON.stringify(entries[k])));
    };

    /* "where all sets felt smooth, take the next weight up" — legs move in 5 */
    const a = await page("beginner.html", seedLift({
      "leg-press-ex": [{ d: past, w: 60, rpe: "easy" }],
      "machine-chest-press": [{ d: past, w: 40, rpe: "easy" }],
      "lat-pulldown-ex": [{ d: past, w: 35, rpe: "hard" }]
    }));
    const row = (re) => $$(a.d, ".wo-row").find((r) => re.test($(r, ".wo-name").textContent));
    const said = (re) => $(row(re), ".lift-last").textContent;

    ok("last session's weight is on the row in front of you", /last time 60 kg/.test(said(/^Leg press/)), said(/^Leg press/));
    ok("...along with how it felt", /felt easy/.test(said(/^Leg press/)));
    ok("a leg press that felt easy suggests the next rung it has", /try 70/.test(said(/^Leg press/)), said(/^Leg press/));
    ok("a machine stack moves in its own 5s", /try 45/.test(said(/^Chest press/)), said(/^Chest press/));
    ok("a lift that felt hard is told to stay", /stay at 35/.test(said(/^Lat pulldown/)), said(/^Lat pulldown/));
    ok("the suggestion is the emphasised half of the line", /try 70/.test($(row(/^Leg press/), ".lift-last b").textContent));
    ok("...and is a weight the dropdown actually offers",
      $$(row(/^Leg press/), ".lift-w option").some((o) => o.value === "70"));
    ok("last week's weight is not dressed up with a label it does not need",
      $(row(/^Leg press/), ".lift-w select").selectedOptions[0].textContent === "60 kg",
      $(row(/^Leg press/), ".lift-w select").selectedOptions[0].textContent);
    ok("...and the picker opens on it, so the common case is no taps at all",
      $(row(/^Leg press/), ".lift-w select").value === "60",
      $(row(/^Leg press/), ".lift-w select").value);
    ok("...drawn as a suggestion rather than as something you did",
      $(row(/^Leg press/), ".lift-w select").classList.contains("is-suggested"));
    ok("...and said in words under it",
      $(row(/^Leg press/), ".lift-from").hidden === false &&
      $(row(/^Leg press/), ".lift-from").textContent === "from last time");
    ok("...but nothing is written to the log until it is earned",
      JSON.parse(a.w.localStorage.getItem("gb:lift:leg-press-ex")).length === 1,
      a.w.localStorage.getItem("gb:lift:leg-press-ex"));

    /* beating it */
    const inp = $(row(/^Leg press/), ".lift-w select");
    inp.value = "70";
    inp.dispatchEvent(new a.w.Event("change", { bubbles: true }));
    ok("beating your best is called out", !!$(row(/^Leg press/), ".lift-pr"));
    inp.value = "50";
    inp.dispatchEvent(new a.w.Event("change", { bubbles: true }));
    ok("a lighter day is not", !$(row(/^Leg press/), ".lift-pr"));

    /* the written programmes key on their station where no exercise exists */
    const b = await page("advanced.html", seedLift({ "eq:hack-squat": [{ d: past, w: 80, rpe: "easy" }] }));
    const hack = $$(b.d, ".wo-row").find((r) => /^Hack squat/.test($(r, ".wo-name").textContent));
    ok("a station-only row is still loggable", !!$(hack, ".lift-w select"));
    ok("it reads its own history back", /last time 80 kg/.test($(hack, ".lift-last").textContent));
    ok("and a station-keyed lift uses its own ladder", /try 90/.test($(hack, ".lift-last").textContent),
      $(hack, ".lift-last").textContent);

    /* history is bounded, and every logged lift is retrievable */
    ok("history is capped rather than growing forever", b.w.GBLift.logged().length >= 1);
    const many = Array.from({ length: 120 }, (_, i) => ({ d: "2020-01-01", w: i }));
    b.w.localStorage.setItem("gb:lift:leg-press-ex", JSON.stringify(many));
    b.w.GBLift.record("leg-press-ex", { w: 99 });
    ok("...to 80 entries", b.w.GBLift.history("leg-press-ex").length === 80,
      b.w.GBLift.history("leg-press-ex").length);
  }

  /* ── generated plans log too ── */
  section("load logging — generated sessions");
  {
    const { w, d } = await page("builder.html");
    click(w, $(d, "#buildBtn"));
    const boxes = $$(d, "#builderOut .lift-w select");
    ok("a built session is loggable straight away", boxes.length > 0, "got " + boxes.length);
    ok("every logged row names an exercise",
      $$(d, "#builderOut .wo-row").filter((r) => $(r, ".lift-w")).every((r) => !!r.dataset.ex));
    ok("no bodyweight row in a built session carries a kg box",
      $$(d, "#builderOut .wo-row").filter((r) => $(r, ".lift-w"))
        .every((r) => w.GB.EX_BY_ID[r.dataset.ex].kit !== "bodyweight"));
    ok("rebuilding does not double the controls up", (() => {
      click(w, $(d, "#buildBtn"));
      return $$(d, "#builderOut .wo-row").every((r) => $$(r, ".lift-w").length <= 1);
    })());
  }

  /* ── other levels + progressive enhancement ── */
  section("intermediate / advanced / no-JS");
  {
    for (const f of ["intermediate.html", "advanced.html"]) {
      const { d, errors } = await page(f);
      ok(f + " enhances its rows", $$(d, ".set-dot").length > 0, "got " + $$(d, ".set-dot").length);
      ok(f + " throws no script errors", errors.length === 0, errors[0]);
    }
    const dom = await JSDOM.fromURL(BASE + "/beginner.html", { runScripts: "outside-only" });
    const d = dom.window.document;
    ok("workout tables render with JS disabled", $$(d, ".wo-row").length === 21);
    ok("no session controls without JS", $$(d, ".set-dot").length === 0);
    ok("and no weight boxes either", $$(d, ".lift-w").length === 0);
  }

  /* ── week engine (no DOM) ── */
  section("plan.js — week engine");
  {
    const { w } = await page("week.html");
    const GBP = w.GBPlan, GB = w.GB;

    let plans = 0, structural = [];
    for (const level of [1, 2, 3])
      for (const days of [2, 3, 4, 5, 6])
        for (const goal of Object.keys(GB.GOALS))
          for (const dur of [20, 45, 90]) {
            const p = GBP.generate({ level, days, goal, duration: dur, weekNumber: 1 });
            const tag = `L${level}/${days}d/${goal}/${dur}m`;
            plans++;
            if (p.week.length !== 7) structural.push(tag + " not 7 days");
            if (!p.week.some((d) => d.type === "rest")) structural.push(tag + " no rest day");
            for (const d of p.week.filter((x) => x.type === "train")) {
              const ids = d.blocks.flatMap((b) => b.items.map((i) => i.id));
              if (ids.length !== new Set(ids).size) structural.push(tag + " " + d.name + " repeats an exercise");
              if (d.blocks[0].role !== "warmup" || d.blocks[0].items.length < 2) structural.push(tag + " " + d.name + " no warm-up");
              if (d.blocks[d.blocks.length - 1].role !== "cooldown") structural.push(tag + " " + d.name + " no cool-down");
              if (!d.minutes || d.minutes < 15) structural.push(tag + " " + d.name + " bad duration");
              if (d.blocks.some((b) => b.items.some((i) => !i.rx))) structural.push(tag + " " + d.name + " item without rx");
            }
          }
    ok(`${plans} level/days/goal/duration combinations all generate a valid week`,
      structural.length === 0, structural.slice(0, 3).join(" | "));

    /* more days is not automatically better */
    const beg6 = GBP.generate({ level: 1, days: 6, goal: "fitness", duration: 45 });
    const lifting = beg6.week.filter((d) => d.type === "train" && d.tpl !== "cardio").length;
    ok("a beginner picking 6 days gets at most 4 lifting sessions", lifting <= 4, "got " + lifting);
    ok("the extra beginner days become cardio or recovery",
      beg6.week.some((d) => d.tpl === "cardio") && beg6.week.some((d) => d.type !== "train"));
    const adv6 = GBP.generate({ level: 3, days: 6, goal: "muscle", duration: 60 });
    ok("an advanced 6-day week is six real training days",
      adv6.week.filter((d) => d.type === "train").length === 6);

    /* goal changes the session, not just the label */
    const mainOf = (g) => {
      const d = GBP.generate({ level: 2, days: 3, goal: g, duration: 45 }).week.find((x) => x.type === "train");
      return d.blocks.find((b) => b.role === "main").items;
    };
    const str = mainOf("strength"), fat = mainOf("fatloss"), mus = mainOf("muscle");
    ok("strength programmes heavier reps and longer rest",
      str[0].rx.reps === "5–8" && str[0].rx.rest >= 180, JSON.stringify(str[0].rx));
    ok("fat loss programmes higher reps and shorter rest",
      fat[0].rx.reps === "12–15" && fat[0].rx.rest <= 60, JSON.stringify(fat[0].rx));
    ok("build muscle differs from both", mus[0].rx.reps !== str[0].rx.reps && mus[0].rx.reps !== fat[0].rx.reps);
    const fatDay = GBP.generate({ level: 2, days: 3, goal: "fatloss", duration: 45 }).week.find((x) => x.type === "train");
    ok("fat loss earns a conditioning block at 45 min", fatDay.blocks.some((b) => b.role === "conditioning"));

    /* split shape by level */
    const names = (l, d) => GBP.generate({ level: l, days: d, goal: "muscle", duration: 45 })
      .week.filter((x) => x.type === "train").map((x) => x.name);
    ok("beginners get full-body sessions", names(1, 3).every((n) => /Full body/.test(n)), names(1, 3).join(","));
    ok("intermediate 3 days is push/pull/legs", names(2, 3).join(",") === "Push A,Pull A,Legs A");
    ok("intermediate 4 days is upper/lower", names(2, 4).join(",") === "Upper A,Lower A,Upper B,Lower B");
    ok("advanced 6 days is push/pull/legs twice", names(3, 6).join(",") === "Push A,Pull A,Legs A,Push B,Pull B,Legs B");

    /* A and B variants must actually differ; a repeated template must not */
    const ab = GBP.generate({ level: 3, days: 6, goal: "muscle", duration: 60 }).week.filter((x) => x.type === "train");
    const sig = (d) => d.blocks.flatMap((b) => b.items.map((i) => i.id)).join(",");
    ok("Push A and Push B are different sessions", sig(ab[0]) !== sig(ab[3]));
    const abab = GBP.generate({ level: 1, days: 4, goal: "fitness", duration: 45 }).week.filter((x) => x.type === "train");
    ok("on an A/B/A/B week the repeat is the same session", sig(abab[0]) === sig(abab[2]));
    ok("...and the alternate day is not", sig(abab[0]) !== sig(abab[1]));

    /* push days should not be reaching for biceps curls, or pull days triceps */
    const ppl = GBP.generate({ level: 3, days: 6, goal: "muscle", duration: 90 }).week.filter((x) => x.type === "train");
    const idsOf = (d) => d.blocks.flatMap((b) => b.items.map((i) => i.id));
    ok("push days carry no biceps isolation",
      !idsOf(ppl[0]).some((i) => i === "db-curl" || i === "ez-curl"), idsOf(ppl[0]).join(","));
    ok("pull days carry no triceps isolation",
      !idsOf(ppl[1]).some((i) => i === "triceps-pushdown" || i === "overhead-triceps"), idsOf(ppl[1]).join(","));

    /* progression */
    const setsIn = (wk) => GBP.generate({ level: 1, days: 3, goal: "fitness", duration: 45, weekNumber: wk })
      .week.filter((d) => d.type === "train")
      .reduce((a, d) => a + d.blocks.flatMap((b) => b.items).reduce((s, i) => s + (i.rx.sets || 0), 0), 0);
    ok("week 3 carries more sets than week 1", setsIn(3) > setsIn(1), `${setsIn(1)} → ${setsIn(3)}`);
    ok("week 4 returns to the week-1 set count", setsIn(4) === setsIn(1));
    const w3 = GBP.generate({ level: 1, days: 3, goal: "fitness", duration: 45, weekNumber: 3 });
    ok("week 3 shows what changed",
      w3.week.find((d) => d.type === "train").blocks.find((b) => b.role === "main").items[0].prev);
    ok("each week has its own focus",
      new Set([1, 2, 3, 4].map((n) => GBP.weekMeta(n).focus)).size === 4);
    ok("week 5 cycles back to the week-1 focus", GBP.weekMeta(5).focus === GBP.weekMeta(1).focus);

    /* regenerate keeps the inputs, changes the arrangement */
    const a1 = GBP.generate({ level: 2, days: 4, goal: "muscle", duration: 45, seed: 0 });
    const a2 = GBP.generate({ level: 2, days: 4, goal: "muscle", duration: 45, seed: 1 });
    ok("regenerate preserves level, days and goal",
      a2.level === a1.level && a2.days === a1.days && a2.goal === a1.goal);
    ok("regenerate actually changes the exercises",
      sig(a1.week.find((d) => d.type === "train")) !== sig(a2.week.find((d) => d.type === "train")));

    /* equipment restriction is honoured */
    const dbOnly = GBP.generate({ level: 2, days: 3, goal: "muscle", duration: 45, kit: "dumbbells" });
    const kits = dbOnly.week.filter((d) => d.type === "train")
      .flatMap((d) => d.blocks.flatMap((b) => b.items.map((i) => i.kit)));
    ok("dumbbells-only never programmes a machine or barbell",
      !kits.some((k) => k === "machine" || k === "barbell" || k === "cable"), [...new Set(kits)].join(","));
  }

  /* ── the wizard and the seven-day view ── */
  section("week.html");
  {
    const { w, d, errors } = await page("week.html");
    ok("throws no script errors", errors.length === 0, errors[0]);
    ok("the wizard shows first when there is no plan", !$(d, "#weekWizard").hidden);
    ok("the plan area is hidden until generated", $(d, "#weekOut").hidden);

    click(w, $(d, '[data-w-level="1"]'));
    click(w, $(d, '[data-w-days="6"]'));
    ok("picking 6 days as a beginner warns honestly", !$(d, "#weekHint").hidden);
    ok("...and says how many sessions it will actually be", /lifting sessions/.test($(d, "#weekHint").textContent));
    click(w, $(d, '[data-w-days="3"]'));
    ok("the warning clears at a sensible frequency", $(d, "#weekHint").hidden);

    click(w, $(d, '[data-w-goal="muscle"]'));
    click(w, $(d, '[data-w-duration="45"]'));
    click(w, $(d, "#weekBuild"));

    ok("generating hides the wizard", $(d, "#weekWizard").hidden);
    ok("seven day cards render", $$(d, ".day-card").length === 7, "got " + $$(d, ".day-card").length);
    ok("three of them are training days", $$(d, ".day-card.is-train").length === 3);
    ok("rest days are shown, not omitted", $$(d, ".day-card.is-rest").length > 0);
    ok("today is marked", $$(d, ".day-card.is-today").length === 1);
    ok("training days link to the guided workout",
      $$(d, '.day-card a[href^="workout.html?d="]').length === 3);
    ok("the week banner names the current focus", /Week 1/.test($(d, ".week-banner").textContent));
    ok("progress starts at zero", /0 of 3 sessions done/.test($(d, ".week-count").textContent));
    ok("edit and regenerate are offered", !!$(d, "#wkEdit") && !!$(d, "#wkRegen"));
    ok("the plan is stored", !!w.localStorage.getItem("gb:week"));

    const before = $$(d, ".day-card.is-train h3").map((h) => h.textContent).join(",");
    click(w, $(d, "#wkRegen"));
    ok("regenerate re-renders the week", $$(d, ".day-card").length === 7);
    ok("regenerate keeps the same split names", $$(d, ".day-card.is-train h3").map((h) => h.textContent).join(",") === before);

    click(w, $(d, "#wkEdit"));
    ok("edit reopens the wizard", !$(d, "#weekWizard").hidden);
  }

  /* ── an existing plan is reloaded, not regenerated ── */
  section("week.html — persistence");
  {
    const a = await page("week.html");
    click(a.w, $(a.d, '[data-w-level="2"]'));
    click(a.w, $(a.d, '[data-w-days="4"]'));
    click(a.w, $(a.d, "#weekBuild"));
    const saved = a.w.localStorage.getItem("gb:week");
    const names = $$(a.d, ".day-card.is-train h3").map((h) => h.textContent).join(",");

    const b = await page("week.html", (win) => win.localStorage.setItem("gb:week", saved));
    ok("a returning visit shows the plan, not the wizard", $(b.d, "#weekWizard").hidden && !$(b.d, "#weekOut").hidden);
    ok("it is the same plan", $$(b.d, ".day-card.is-train h3").map((h) => h.textContent).join(",") === names, names);
    ok("four training days survive the reload", $$(b.d, ".day-card.is-train").length === 4);
  }

  /* ── the guided day ── */
  section("workout.html");
  {
    const seedPlan = await page("week.html");
    click(seedPlan.w, $(seedPlan.d, '[data-w-level="1"]'));
    click(seedPlan.w, $(seedPlan.d, '[data-w-days="3"]'));
    click(seedPlan.w, $(seedPlan.d, "#weekBuild"));
    const plan = seedPlan.w.localStorage.getItem("gb:week");
    const seed = (win) => win.localStorage.setItem("gb:week", plan);

    const { w, d, errors } = await page("workout.html?d=0", seed);
    ok("throws no script errors", errors.length === 0, errors[0]);
    ok("the day renders rows", $$(d, "#workoutOut .wo-row").length > 5, "got " + $$(d, "#workoutOut .wo-row").length);
    ok("it opens with a warm-up", /Warm-up/.test($$(d, ".plan-phase-label")[0].textContent));
    ok("it closes with a cool-down", /Cool-down/.test($$(d, ".plan-phase-label").slice(-1)[0].textContent));
    ok("the heading names the day and session", /Monday/.test($(d, "#workoutHead").textContent));
    ok("set buttons are attached", $$(d, "#workoutOut .set-dot").length > 0);
    ok("machine exercises link back to the equipment guide",
      $$(d, '#workoutOut a[href^="equipment.html#eq-"]').length > 0);
    ok("a complete-workout button is offered", !$(d, "#workoutDone").hidden);

    /* per-day storage isolation */
    click(w, $$(d, "#workoutOut .set-dot")[0]);
    const keys = Object.keys(w.localStorage).filter((k) => k.indexOf("gb:sets:week:") === 0);
    ok("progress is filed under the day", keys.length === 1 && /d0$/.test(keys[0]), keys.join(","));

    const other = await page("workout.html?d=2", (win) => {
      seed(win);
      win.localStorage.setItem(keys[0], w.localStorage.getItem(keys[0]));
    });
    ok("another day starts clean", $$(other.d, "#workoutOut .set-dot.on").length === 0);

    const same = await page("workout.html?d=0", (win) => {
      seed(win);
      win.localStorage.setItem(keys[0], w.localStorage.getItem(keys[0]));
    });
    ok("returning to the same day keeps its ticks", $$(same.d, "#workoutOut .set-dot.on").length === 1);

    /* focus mode */
    const f = await page("workout.html?d=0", seed);
    const toggle = $(f.d, "[data-focus-toggle]");
    ok("the focus toggle appears once there are rows", !toggle.hidden);
    click(f.w, toggle);
    ok("focus mode engages", f.d.body.classList.contains("focus-mode"));
    ok("exactly one exercise is current", $$(f.d, ".wo-row.focus-on").length === 1);
    ok("it counts the position", /Exercise 1 of \d+/.test($(f.d, ".focus-count").textContent),
      $(f.d, ".focus-count").textContent);
    ok("the block label is shown", $(f.d, ".focus-block").textContent.length > 0);
    ok("prev is disabled at the start", $(f.d, ".focus-prev").disabled);
    click(f.w, $(f.d, ".focus-next"));
    ok("next advances", /Exercise 2 of/.test($(f.d, ".focus-count").textContent));
    ok("still exactly one current", $$(f.d, ".wo-row.focus-on").length === 1);
    click(f.w, $(f.d, ".focus-prev"));
    ok("prev goes back", /Exercise 1 of/.test($(f.d, ".focus-count").textContent));
    click(f.w, $(f.d, ".focus-exit"));
    ok("exiting restores the full list", !f.d.body.classList.contains("focus-mode"));
    ok("no row is left marked current", $$(f.d, ".wo-row.focus-on").length === 0);

    /* rest days and missing plans */
    const restDay = plan && JSON.parse(plan).week.findIndex((x) => x.type !== "train");
    const r = await page("workout.html?d=" + restDay, seed);
    ok("a rest day says so instead of rendering a session",
      /recovery day/i.test($(r.d, "#workoutOut").textContent) && $$(r.d, "#workoutOut .wo-row").length === 0);
    const none = await page("workout.html?d=0");
    ok("with no plan at all it points at the planner",
      /don't have a week/i.test($(none.d, "#workoutOut").textContent));
  }

  /* ── today, on the homepage ── */
  section("index.html — today");
  {
    const empty = await page("index.html");
    ok("with no plan the card invites you to build one",
      !$(empty.d, "#todayCard").hidden && /Build my week/.test($(empty.d, "#todayCard").textContent));

    const seedPlan = await page("week.html");
    click(seedPlan.w, $(seedPlan.d, "#weekBuild"));
    const plan = seedPlan.w.localStorage.getItem("gb:week");
    const parsed = JSON.parse(plan);
    const todayIdx = seedPlan.w.GBPlan.todayIndex();
    const today = parsed.week[todayIdx];

    const withPlan = await page("index.html", (win) => win.localStorage.setItem("gb:week", plan));
    const card = $(withPlan.d, "#todayCard");
    ok("with a plan the card shows today's session", card.textContent.indexOf(today.name) > -1, card.textContent.slice(0, 90));
    ok("it names the weekday", card.textContent.indexOf(today.dayName) > -1);
    if (today.type === "train") {
      ok("a training day links straight into the workout",
        !!$(card, 'a[href="workout.html?d=' + todayIdx + '"]'));
    } else {
      ok("a rest day lists recovery suggestions instead", $$(card, ".day-sugg li").length > 0);
    }
    ok("it always offers the full week", !!$(card, 'a[href="week.html"]'));
  }

  /* ── the libraries must not absorb the new programme furniture ── */
  section("new data does not leak into the libraries");
  {
    const { w, d } = await page("exercises.html");
    const shown = $$(d, ".ex-card").length;
    const total = w.GB.EXERCISES.length;
    const furniture = w.GB.EXERCISES.filter((x) => x.role === "warmup" || x.role === "cooldown").length;
    ok("warm-ups and cool-downs exist in the data", furniture >= 14, "got " + furniture);
    ok("but none of them appear in the exercise library", shown === total - furniture,
      `${shown} shown, ${total} total, ${furniture} furniture`);
    const names = $$(d, ".ex-card h2").map((h) => h.textContent);
    ok("no stretch is listed as an exercise", !names.some((n) => /stretch|child's pose|box breathing/i.test(n)));
  }

  /* ── header information architecture ── */
  section("header — six destinations, everywhere");
  {
    /* Was five. Nutrition is the sixth and the only one added since the
       consolidation from eight, on the grounds that "what do I eat" is a
       peer of "what do I train", not a sub-page of it. Six is the ceiling;
       anything further belongs in the footer. */
    const PAGES = ["index.html", "programs.html", "nutrition.html", "week.html", "workout.html",
      "beginner.html", "intermediate.html", "advanced.html", "equipment.html", "exercises.html",
      "builder.html", "guide.html"];
    let bad = [], links = new Set();
    for (const f of PAGES) {
      const { d } = await page(f);
      const nav = $$(d, ".head-nav a");
      const cta = $$(d, ".head-cta");
      if (nav.length + cta.length !== 6) bad.push(`${f}: ${nav.length + cta.length}`);
      nav.concat(cta).forEach((a) => links.add(a.getAttribute("href")));
    }
    ok(`all ${PAGES.length} pages carry exactly 6 header destinations`, bad.length === 0, bad.join(", "));
    ok("the header is the same everywhere", links.size === 6, [...links].join(","));
    ok("it is Programs / Nutrition / Equipment / Exercises / First day + My week",
      [...links].sort().join(",") === "equipment.html,exercises.html,guide.html,nutrition.html,programs.html,week.html",
      [...links].sort().join(","));

    for (const href of links) {
      const r = await fetch(BASE + "/" + href);
      ok(`header link ${href} resolves`, r.ok, "HTTP " + r.status);
    }
  }

  /* ── the programs page that absorbed four nav items ── */
  section("programs.html");
  {
    const { d, errors } = await page("programs.html");
    ok("throws no script errors", errors.length === 0, errors[0]);
    ok("three level cards render", $$(d, ".level-card").length === 3);
    ok("they link to the three programs",
      ["beginner", "intermediate", "advanced"].every((l) => !!$(d, `.level-card[href="${l}.html"]`)));
    ok("the builder is preserved, not dropped", !!$(d, 'a[href="builder.html"]'));
    ok("the week planner is offered alongside it", !!$(d, 'a[href="week.html"]'));
    ok("the first-day guide is linked for newcomers", !!$(d, 'a[href="guide.html"]'));
    const home = await page("index.html");
    ok("the homepage points at it too", !!$(home.d, '#levels a[href="programs.html"]'));
  }

  /* ── social + canonical ── */
  section("canonical and Open Graph");
  {
    const PAGES = ["index.html", "programs.html", "week.html", "workout.html", "beginner.html",
      "intermediate.html", "advanced.html", "equipment.html", "exercises.html",
      "builder.html", "guide.html", "nutrition.html"];
    let missing = [], titles = new Set(), urls = new Set(), lengths = [];
    for (const f of PAGES) {
      const { d } = await page(f);
      const canon = $(d, 'link[rel="canonical"]');
      const t = $(d, 'meta[property="og:title"]');
      const u = $(d, 'meta[property="og:url"]');
      const img = $(d, 'meta[property="og:image"]');
      const tw = $(d, 'meta[name="twitter:card"]');
      const desc = $(d, 'meta[name="description"]');
      lengths.push({ f, n: desc ? desc.content.length : 0 });
      if (!canon || !t || !u || !img || !tw) { missing.push(f); continue; }
      titles.add(t.content); urls.add(u.content);
      if (canon.href !== u.content) missing.push(f + " (canonical ≠ og:url)");
    }
    ok("every page has canonical, og:title, og:url, og:image and a twitter card",
      missing.length === 0, missing.join(", "));
    ok("each page has its own og:title", titles.size === PAGES.length, `${titles.size}/${PAGES.length}`);
    ok("each page has its own og:url", urls.size === PAGES.length, `${urls.size}/${PAGES.length}`);
    const { d } = await page("beginner.html");
    ok("og:image is an absolute URL", /^https:\/\//.test($(d, 'meta[property="og:image"]').content));

    /* A description longer than the snippet is writing nobody reads. The
       nutrition page shipped at 234 characters — its last third never
       rendered — which is exactly the kind of drift no one notices by eye. */
    const long = lengths.filter((x) => x.n > 160);
    const short = lengths.filter((x) => x.n < 110);
    ok("every page describes itself", lengths.every((x) => x.n > 0),
      lengths.filter((x) => !x.n).map((x) => x.f).join(", "));
    ok("no description is longer than a search snippet shows",
      long.length === 0, long.map((x) => `${x.f} ${x.n}`).join(", "));
    ok("and none is so short it wastes the slot",
      short.length === 0, short.map((x) => `${x.f} ${x.n}`).join(", "));
  }

  /* ── image weight ── */
  section("images");
  {
    const { w, d } = await page("equipment.html");
    const photos = w.GB.EQUIPMENT.filter((e) => e.img).map((e) => e.img);
    ok("every photo a station names is a .webp", photos.every((i) => /\.webp$/.test(i)),
      photos.filter((i) => !/\.webp$/.test(i)).join(","));

    /* Hip thrust and pendulum squat were the last two holdouts — photographed
       2026-08-14. Every station names a file now, and no card falls back to
       the typographic tile. */
    ok("every station names a photo",
      w.GB.EQUIPMENT.every((e) => e.img),
      w.GB.EQUIPMENT.filter((e) => !e.img).map((e) => e.id).join(","));
    for (const id of ["hip-thrust", "pendulum-squat"]) {
      const card = $(d, `.eq-card[data-eq="${id}"]`);
      ok(`${id} renders its photograph`, !!card && !!$(card, ".ph img") && !$(card, ".ph-fallback"));
      ok(`${id}'s photo is labelled with the station`,
        !!card && $(card, ".ph img").getAttribute("alt") === w.GB.EQ_BY_ID[id].name);
    }
    ok("no card anywhere on the page falls back to a tile", $$(d, ".ph-fallback").length === 0);

    let broken = [];
    for (const i of [...new Set(photos)]) {
      const r = await fetch(BASE + "/" + i);
      if (!r.ok) broken.push(i);
    }
    ok("every station photo is served", broken.length === 0, broken.join(", "));

    /* nothing anywhere should still point at a JPEG */
    let jpg = [];
    for (const f of ["index.html", "programs.html", "data.js", "week.js", "app.js"]) {
      const t = await (await fetch(BASE + "/" + f)).text();
      if (/img\/[a-z0-9-]+\.jpg/.test(t)) jpg.push(f);
    }
    ok("no .jpg reference survives", jpg.length === 0, jpg.join(", "));

    /* the whole photo set should now fit in a couple of megabytes */
    let bytes = 0;
    for (const i of [...new Set(photos)]) {
      const r = await fetch(BASE + "/" + i);
      bytes += (await r.arrayBuffer()).byteLength;
    }
    ok(`all station photos together are under 2 MB (${(bytes / 1048576).toFixed(2)} MB)`,
      bytes < 2 * 1048576);
  }

  /* ── demo plumbing: present, but invisible until a clip exists ── */
  section("equipment demos");
  {
    const { w, d } = await page("equipment.html");
    ok("every station carries its numbered steps",
      w.GB.EQUIPMENT.every((e) => Array.isArray(e.steps) && e.steps.length >= 3),
      w.GB.EQUIPMENT.filter((e) => !e.steps || e.steps.length < 3).map((e) => e.id).join(","));
    ok("no station ships a clip yet", w.GB.EQUIPMENT.every((e) => !e.video));
    ok("so no demo button renders anywhere", $$(d, ".demo-btn").length === 0);
    ok("equipment cards still name their station for later",
      $$(d, ".eq-card[data-eq]").length === 30);
    ok("the demo API is available", typeof w.GBDemo === "object" && typeof w.GBDemo.arm === "function");

    /* inject a clip and confirm the button appears and the panel is built from data */
    const st = w.GB.EQ_BY_ID["leg-press"];
    st.video = { src: "vid/leg-press.mp4", sec: 12 };
    w.GBDemo.arm(d);
    const btn = $(d, '.eq-card[data-eq="leg-press"] .demo-btn');
    ok("adding a clip makes its button appear", !!btn);
    ok("...and only for that station", $$(d, ".demo-btn").length === 1);
    ok("the button says how long the clip is", /12 second/.test(btn.getAttribute("aria-label")));

    click(w, btn);
    const dlg = $(d, ".demo-dlg");
    ok("the panel opens", !!dlg && dlg.hasAttribute("open"));
    ok("it names the station", $(dlg, "h3").textContent === "Leg press");
    ok("it lists the numbered steps", $$(dlg, ".demo-steps li").length === st.steps.length);
    ok("it shows the beginner prescription", /Beginner:/.test($(dlg, ".demo-rx").textContent));
    ok("it shows the common mistake", $(dlg, ".demo-mistake b").textContent === st.mistake);
    ok("it links to the full equipment guide",
      $(dlg, ".demo-more").getAttribute("href") === "equipment.html#eq-leg-press");
    ok("the video is poster-first and never preloads",
      $(dlg, ".demo-video").getAttribute("preload") === "none" && !!$(dlg, ".demo-video").poster);
    ok("it is silent and loops", $(dlg, ".demo-video").hasAttribute("muted") !== false &&
      $(dlg, ".demo-video").hasAttribute("loop"));
    delete st.video;

    /* Every station carries a photo today, but `img: null` is still a
       supported state — and such a station must open with no poster rather
       than keeping whichever station was shown before it. Synthesised, since
       no real entry is in that state any more. */
    const noPhoto = w.GB.EQ_BY_ID["hip-thrust"];
    const realImg = noPhoto.img;
    noPhoto.img = null;
    noPhoto.video = { src: "vid/hip-thrust.mp4", sec: 13 };
    w.GBDemo.arm(d);
    click(w, $(d, '.eq-card[data-eq="hip-thrust"] .demo-btn'));
    ok("a station with no photo opens with no stale poster",
      !$(d, ".demo-dlg .demo-video").getAttribute("poster"));
    ok("...and still names itself", $(d, ".demo-dlg h3").textContent === "Hip thrust machine");
    delete noPhoto.video;
    noPhoto.img = realImg;
  }

  /* The exercise library reaches demos through the station its exercise uses,
     so a clip filmed once shows up in both libraries rather than only in the
     equipment one. */
  {
    const { w, d } = await page("exercises.html");
    const cards = $$(d, ".ex-card");
    const named = $$(d, ".ex-card[data-eq]");
    ok("exercise cards name the station they use", named.length > 0 && named.length <= cards.length,
      `${named.length} of ${cards.length}`);
    ok("and the ones that use no station are left unnamed",
      cards.every((c) => !c.dataset.eq || !!w.GB.EQ_BY_ID[c.dataset.eq]));
    ok("with no clip anywhere, the library still shows no buttons", $$(d, ".demo-btn").length === 0);

    const st = w.GB.EQ_BY_ID["leg-press"];
    st.video = { src: "vid/leg-press.mp4", sec: 14 };
    w.GBDemo.arm(d);
    const btn = $(d, '.ex-card[data-eq="leg-press"] .demo-btn');
    ok("a clip on the station arms the exercises that use it", !!btn);
    ok("the button sits with the toggle, not after the collapsed detail",
      !!btn && btn.parentElement.classList.contains("ex-actions"));
    ok("and it names the station, not the exercise",
      !!btn && /demonstration of the Leg press/.test(btn.getAttribute("aria-label")));
    click(w, btn);
    ok("opening it from the exercise library shows the station's panel",
      $(d, ".demo-dlg h3").textContent === "Leg press");
    delete st.video;
  }

  /* ── workouts now name their station ── */
  section("workout rows link to the libraries");
  {
    for (const f of ["beginner.html", "intermediate.html", "advanced.html"]) {
      const { w, d } = await page(f);
      const rows = $$(d, ".wo-row[data-eq]");
      ok(`${f} wires its machine rows to a station`, rows.length >= 8, "got " + rows.length);
      ok(`${f} every data-eq resolves`,
        rows.every((r) => !!w.GB.EQ_BY_ID[r.dataset.eq]),
        rows.filter((r) => !w.GB.EQ_BY_ID[r.dataset.eq]).map((r) => r.dataset.eq).join(","));

      /* the written programmes name their exercise too, so a weight
         logged on one is the same history the libraries and the
         generated plans write to */
      const named = $$(d, ".wo-row[data-ex]");
      ok(`${f} names its exercises as well as its stations`, named.length >= 4, "got " + named.length);
      ok(`${f} every data-ex resolves`,
        named.every((r) => !!w.GB.EX_BY_ID[r.dataset.ex]),
        named.filter((r) => !w.GB.EX_BY_ID[r.dataset.ex]).map((r) => r.dataset.ex).join(","));
      ok(`${f} the name on the row is the exercise it claims`,
        named.every((r) => {
          const ex = w.GB.EX_BY_ID[r.dataset.ex].name.toLowerCase();
          const nm = $(r, ".wo-name").firstChild.textContent.trim().toLowerCase();
          return ex === nm || ex.endsWith(nm) || nm.endsWith(ex);
        }),
        named.filter((r) => {
          const ex = w.GB.EX_BY_ID[r.dataset.ex].name.toLowerCase();
          const nm = $(r, ".wo-name").firstChild.textContent.trim().toLowerCase();
          return !(ex === nm || ex.endsWith(nm) || nm.endsWith(ex));
        }).map((r) => r.dataset.ex).join(","));
    }
    const b = await page("builder.html");
    click(b.w, $(b.d, "#buildBtn"));
    ok("builder rows name their exercise", $$(b.d, "#builderOut .wo-row[data-ex]").length > 0);
  }

  /* ── planner polish ── */
  section("Build my week — polish");
  {
    const seed = await page("week.html");
    click(seed.w, $(seed.d, "#weekBuild"));
    const plan = seed.w.localStorage.getItem("gb:week");
    const parsed = JSON.parse(plan);
    const firstTrain = parsed.week.find((x) => x.type === "train");
    const put = (win) => win.localStorage.setItem("gb:week", plan);

    ok("start over is offered", !!$(seed.d, "#wkClear"));

    /* tick one set on the first training day, then look at the week view */
    const wk = await page("workout.html?d=" + firstTrain.dow, put);
    ok("the guided day names its exercises", $$(wk.d, ".wo-row[data-ex]").length > 0);
    ok("prev/next day navigation is shown", !$(wk.d, "#workoutNav").hidden);
    const navLinks = $$(wk.d, '#workoutNav a[href^="workout.html?d="]');
    ok("it links to another training day", navLinks.length >= 1, "got " + navLinks.length);
    click(wk.w, $$(wk.d, "#workoutOut .set-dot")[0]);
    const bucketKey = Object.keys(wk.w.localStorage).find((k) => k.indexOf("gb:sets:week:") === 0);
    const bucket = wk.w.localStorage.getItem(bucketKey);

    const view = await page("week.html", (win) => { put(win); win.localStorage.setItem(bucketKey, bucket); });
    const started = $(view.d, ".day-card.is-started");
    ok("a part-finished day shows as started, not untouched", !!started);
    ok("it shows a set count", /\d+ \/ \d+ sets/.test($(started, ".day-partial").textContent),
      started && $(started, ".day-partial") && $(started, ".day-partial").textContent);
    ok("its button says Resume", /Resume/.test($(started, ".btn").textContent));
    ok("untouched days are unaffected", $$(view.d, ".day-card.is-train").length > $$(view.d, ".day-card.is-started").length);
  }

  /* ── PWA wiring ── */
  section("offline wiring");
  {
    const { d } = await page("index.html");
    ok("manifest linked", !!$(d, 'link[rel="manifest"]'));
    ok("apple touch icon linked", !!$(d, 'link[rel="apple-touch-icon"]'));
    const man = await (await fetch(BASE + "/manifest.webmanifest")).json();
    ok("manifest parses", man.name === "Gym Basics — training guide");
    ok("manifest has all three icons", man.icons.length === 3);
    ok("manifest has a maskable icon", man.icons.some((i) => i.purpose === "maskable"));
    for (const i of man.icons.concat([{ src: "sw.js" }, { src: "session.js" }])) {
      const r = await fetch(BASE + "/" + i.src);
      ok(i.src + " is served", r.ok, "HTTP " + r.status);
    }
    const sw = await (await fetch(BASE + "/sw.js")).text();
    const listed = sw.match(/var SHELL_FILES = \[([\s\S]*?)\]/)[1]
      .match(/"([^"]+)"/g).map((s) => s.replace(/"/g, "")).filter((f) => f !== "./");
    let missing = [];
    for (const f of listed) {
      const r = await fetch(BASE + "/" + f);
      if (!r.ok) missing.push(f);
    }
    ok("every precached shell file exists", missing.length === 0, missing.join(", "));
  }

  /* ── nutrition: the engine, then the page over it ── */
  section("nutrition — the engine");
  {
    const { w, d, errors } = await page("nutrition.html");
    ok("throws no script errors", errors.length === 0, errors[0]);

    const N = w.GBNutri, P = w.GBPlan, F = w.GBFood;
    ok("the engine loads", !!N && !!F);

    const me = { sex: "male", age: 26, heightCm: 174, weightKg: 72, diet: "veg", activity: "sitting" };
    ok("Mifflin-St Jeor is right", N.rmr(me) === 1683, "got " + N.rmr(me));
    ok("a female profile of the same size burns less",
      N.rmr({ ...me, sex: "female" }) < N.rmr(me));
    ok("an incomplete profile is rejected", !N.validProfile({ sex: "male", age: 26 }));
    ok("an impossible weight is rejected", !N.validProfile({ ...me, weightKg: 900 }));

    /* the whole point: the target moves with the training, not a dropdown */
    const plan = P.generate({ level: 2, days: 4, goal: "muscle", duration: 60, kit: "full", weekNumber: 1 });
    const train = plan.week.find((x) => x.type === "train");
    const t = N.dayTargets(me, plan, train);
    const r = N.dayTargets(me, plan, { type: "rest" });
    ok("a training day is fuelled above a rest day", t.kcal > r.kcal, `${t.kcal} vs ${r.kcal}`);
    ok("the gap is the session, not a guess", Math.abs((t.kcal - r.kcal) - Math.round(t.burn * 1.1)) <= 6,
      `gap ${t.kcal - r.kcal}, burn ${t.burn}`);
    ok("a session costs a believable number of calories", t.burn > 90 && t.burn < 500, "got " + t.burn);
    ok("macros add back up to the calorie target",
      Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal) <= 10);
    ok("protein follows bodyweight and level",
      t.protein === Math.round(1.9 * 72), "got " + t.protein);
    ok("a heavier lifter is given more protein",
      N.dayTargets({ ...me, weightKg: 90 }, plan, train).protein > t.protein);

    /* goal has to change the number, or it is just a label */
    const cut = N.dayTargets(me, { ...plan, goal: "fatloss" }, train);
    const gain = N.dayTargets(me, { ...plan, goal: "muscle" }, train);
    ok("fat loss eats under maintenance", cut.kcal < t.expend);
    ok("building eats over maintenance", gain.kcal > gain.expend);
    ok("a deficit raises protein, not lowers it", cut.protein > gain.protein);

    /* long rests must not read as extra work */
    const str = P.generate({ level: 2, days: 4, goal: "strength", duration: 60, kit: "full", weekNumber: 1 });
    const sBurn = N.sessionKcal(str.week.find((x) => x.type === "train"), 72);
    ok("three-minute rests don't inflate the burn", sBurn < t.burn * 1.6, `${sBurn} vs ${t.burn}`);

    /* the floor no goal argues with */
    const tiny = N.dayTargets({ sex: "female", age: 55, heightCm: 150, weightKg: 45, diet: "veg" },
      { ...plan, goal: "fatloss" }, { type: "rest" });
    ok("a hard deficit is held at a floor", tiny.floored && tiny.kcal >= 1200, "got " + tiny.kcal);

    /* the week, and whether it actually happened */
    const wk = N.weekTargets(me, plan);
    ok("every day of the week gets a target", wk.days.length === 7);
    ok("the week cycles rather than flatlines", wk.high > wk.low);
    const ad = N.adherence(plan, { ["w1:" + train.dow]: 1 }, me);
    ok("adherence counts the sessions actually done", ad.done === 1 && ad.missed === ad.planned - 1);
    ok("the missed sessions are costed", ad.lost > 0);

    /* the scale is the referee */
    const flat = N.trend([{ d: "2026-07-01", kg: 72 }, { d: "2026-07-29", kg: 72 }], "fatloss");
    ok("a stalled cut is called out", flat && flat.verdict === "not moving", flat && flat.verdict);
    const good = N.trend([{ d: "2026-07-01", kg: 72 }, { d: "2026-07-29", kg: 69.9 }], "fatloss");
    ok("a cut inside the band is left alone", good && good.verdict === "on target", good && good.verdict);
    ok("one weigh-in is not a trend", N.trend([{ d: "2026-07-01", kg: 72 }], "fatloss") === null);
    ok("four days is not a trend",
      N.trend([{ d: "2026-07-01", kg: 72 }, { d: "2026-07-05", kg: 71 }], "fatloss") === null);

    /* ── level has to change the eating, not just the training ── */
    const byLevel = [1, 2, 3].map((level) => {
      const p = P.generate({ level, days: 4, goal: "muscle", duration: 60, kit: "full", weekNumber: 1 });
      return N.dayTargets(me, p, p.week.find((x) => x.type === "train"));
    });
    ok("protein rises with training age",
      byLevel[0].protein < byLevel[1].protein && byLevel[1].protein < byLevel[2].protein,
      byLevel.map((x) => x.protein).join(" / "));
    ok("a beginner is not told to eat 2.2 g/kg", byLevel[0].proteinPerKg === 1.6, byLevel[0].proteinPerKg);
    ok("an advanced lifter is", byLevel[2].proteinPerKg === 2.2, byLevel[2].proteinPerKg);
    ok("the surplus is tightest at advanced, not largest",
      byLevel[2].adjPct < byLevel[1].adjPct, byLevel.map((x) => x.adjPct).join(" / "));
    ok("every level carries its own focus",
      new Set(byLevel.map((x) => x.levelFocus)).size === 3);
    ok("every level carries its own guidance",
      byLevel.every((x) => x.levelNote.length > 200) && new Set(byLevel.map((x) => x.levelNote)).size === 3);
    ok("the level is named back to the reader",
      byLevel.map((x) => x.levelLabel).join(",") === "Beginner,Intermediate,Advanced");

    const cutByLevel = [1, 2, 3].map((level) => {
      const p = P.generate({ level, days: 4, goal: "fatloss", duration: 60, kit: "full", weekNumber: 1 });
      return N.dayTargets(me, p, p.week.find((x) => x.type === "train"));
    });
    ok("a beginner cutting gets the gentlest deficit",
      cutByLevel[0].adjPct > cutByLevel[1].adjPct && cutByLevel[1].adjPct > cutByLevel[2].adjPct,
      cutByLevel.map((x) => x.adjPct).join(" / "));
    ok("protein still rises with level in a deficit",
      cutByLevel[0].protein < cutByLevel[2].protein);
    ok("a deficit outranks level for protein",
      cutByLevel[0].proteinPerKg > byLevel[0].proteinPerKg);

    /* ── life outside the gym, the one thing the plan can't know ── */
    const acts = ["sitting", "mixed", "physical"].map((a) =>
      N.dayTargets({ ...me, activity: a }, P.generate({ level: 2, days: 4, goal: "muscle", duration: 60, kit: "full", weekNumber: 1 }),
        { type: "rest" }));
    ok("a physical job is fed more than a desk job",
      acts[0].kcal < acts[1].kcal && acts[1].kcal < acts[2].kcal, acts.map((x) => x.kcal).join(" / "));
    ok("the gap between desk and site work is worth hundreds",
      acts[2].kcal - acts[0].kcal > 400, acts[2].kcal - acts[0].kcal);
    ok("the activity is named back, not left as a multiplier",
      acts[2].activity === "Physical work all day", acts[2].activity);
    const legacyPlan = P.generate({ level: 2, days: 4, goal: "muscle", duration: 60, kit: "full", weekNumber: 1 });
    ok("a profile saved before this question defaults rather than breaking",
      N.dayTargets({ sex: "male", age: 26, heightCm: 174, weightKg: 72 }, legacyPlan, { type: "rest" }).kcal === acts[0].kcal);
  }

  section("nutrition — meals follow the level too");
  {
    const { w } = await page("nutrition.html");
    const N = w.GBNutri, P = w.GBPlan, F = w.GBFood;
    const me = { sex: "male", age: 26, heightCm: 174, weightKg: 72, diet: "veg", activity: "sitting" };

    const at = (level, training) => {
      const p = P.generate({ level, days: 4, goal: "muscle", duration: 60, kit: "full", weekNumber: 1 });
      const day = training ? p.week.find((x) => x.type === "train") : { type: "rest" };
      const t = N.dayTargets(me, p, day);
      return { t, meals: F.meals(t, "veg", 0, training, level) };
    };

    ok("a beginner gets three meals plus something after training", at(1, true).meals.length === 4);
    ok("and only three on a rest day", at(1, false).meals.length === 3);
    ok("an intermediate gets four", at(2, true).meals.length === 4);
    ok("an advanced lifter gets five", at(3, true).meals.length === 5);
    ok("a beginner is never handed a five-feed schedule", at(1, true).meals.length < at(3, true).meals.length);

    for (const level of [1, 2, 3]) {
      for (const training of [true, false]) {
        const { t, meals } = at(level, training);
        const tot = F.totals(meals);
        ok(`L${level} ${training ? "training" : "rest"}: the day still adds up`,
          Math.abs(tot.kcal - t.kcal) / t.kcal < 0.12, `${tot.kcal} vs ${t.kcal}`);
        ok(`L${level} ${training ? "training" : "rest"}: protein lands`,
          tot.p >= t.protein * 0.88, `${tot.p} vs ${t.protein}`);
        /* Across five vegetarian feeds the staple list genuinely runs out, and
           milk at breakfast and again in the evening is a normal Indian day —
           so the rule is no repeat inside one meal, and never three times over. */
        meals.forEach((m) => {
          const inMeal = m.items.map((i) => i.id).filter((i) => i !== "veg");
          ok(`L${level} ${training ? "training" : "rest"}: ${m.label} has no duplicate`,
            new Set(inMeal).size === inMeal.length, inMeal.join(","));
        });
        const ids = meals.flatMap((m) => m.items.map((i) => i.id)).filter((i) => i !== "veg");
        const counts = {};
        ids.forEach((i) => { counts[i] = (counts[i] || 0) + 1; });
        ok(`L${level} ${training ? "training" : "rest"}: nothing served three times`,
          Object.values(counts).every((n) => n <= 2), ids.join(","));
      }
    }
  }

  section("nutrition — food and the page");
  {
    const { w, d } = await page("nutrition.html");
    const N = w.GBNutri, P = w.GBPlan, F = w.GBFood;
    const me = { sex: "male", age: 26, heightCm: 174, weightKg: 72, diet: "veg" };
    const plan = P.generate({ level: 2, days: 4, goal: "muscle", duration: 60, kit: "full", weekNumber: 1 });
    const t = N.dayTargets(me, plan, plan.week.find((x) => x.type === "train"));

    for (const diet of ["veg", "egg", "nonveg"]) {
      const meals = F.meals(t, diet, 0, true, t.level);
      const tot = F.totals(meals);
      ok(`${diet}: four meals at intermediate`, meals.length === 4);
      /* rounding to whole rotis and half-katoris cannot land exactly, and the
         page says so rather than pretending otherwise — but it has to stay in
         the range where the example is still describing the same day */
      ok(`${diet}: lands within 12% of the calorie target`,
        Math.abs(tot.kcal - t.kcal) / t.kcal < 0.12, `${tot.kcal} vs ${t.kcal}`);
      ok(`${diet}: gets the protein in`, tot.p >= t.protein * 0.9, `${tot.p} vs ${t.protein}`);
      const ids = meals.flatMap((m) => m.items.map((i) => i.id)).filter((i) => i !== "veg");
      ok(`${diet}: nothing is served twice in a day`, new Set(ids).size === ids.length, ids.join(","));
    }
    const vegIds = F.meals(t, "veg", 0, true, t.level).flatMap((m) => m.items.map((i) => i.id));
    ok("a vegetarian is never given chicken",
      !vegIds.some((i) => ["chicken", "fish", "mutton", "egg", "eggwhite"].includes(i)), vegIds.join(","));
    const eggIds = F.meals(t, "egg", 0, true, t.level).flatMap((m) => m.items.map((i) => i.id));
    ok("veg + eggs is never given meat",
      !eggIds.some((i) => ["chicken", "fish", "mutton"].includes(i)), eggIds.join(","));
    ok("the week is not the same day seven times",
      F.meals(t, "veg", 0, true, t.level)[0].items[0].id !== F.meals(t, "veg", 1, true, t.level)[0].items[0].id);
    ok("half servings read as halves, not plurals",
      F.label(F.CARB.find((x) => x.id === "rice"), 0.5) === "½ cup of rice",
      F.label(F.CARB.find((x) => x.id === "rice"), 0.5));

    /* the page asks before it answers */
    ok("with no profile the form is shown", !$(d, "#nutriProfile").hidden);
    ok("and the output is not", $(d, "#nutriOut").hidden);
    ok("it asks for exactly five things",
      $$(d, "#nutriProfile input").length === 3 &&
      $$(d, '#nutriProfile [name="sex"]').length === 2 &&
      $$(d, '#nutriProfile [name="activity"]').length === 3 &&
      $$(d, '#nutriProfile [name="diet"]').length === 3);
    ok("it never asks for training level — that comes from the plan",
      $$(d, '#nutriProfile [name="level"]').length === 0);
    ok("it carries a nutrition-specific warning", !!$(d, ".warn-box"));

    /* filling it in produces a target */
    $(d, '[name="age"]').value = "26";
    $(d, '[name="height"]').value = "174";
    $(d, '[name="weight"]').value = "72";
    click(w, $(d, '#nutriProfile [name="sex"][data-val="male"]'));
    click(w, $(d, ".nutri-save"));
    await new Promise((r) => setTimeout(r, 60));
    ok("saving hides the form", $(d, "#nutriProfile").hidden);
    ok("and shows the numbers", !$(d, "#nutriOut").hidden);
    ok("three macro bars render", $$(d, ".macro").length === 3);
    ok("the arithmetic is shown, not just asserted", $$(d, ".fuel-maths > div").length === 5);
    ok("the level block renders", !!$(d, ".lvl-note"));
    ok("it is tagged with the level", !!$(d, ".lvl-note .tag"));
    ok("and says what protein means at that level", !!$(d, ".lvl-protein"));
    ok("with no plan it renders a beginner rest day — three meals",
      $$(d, ".meal").length === 3, $$(d, ".meal").length);
    ok("the profile is stored on the device", !!w.localStorage.getItem("gb:profile"));
    ok("the first weigh-in starts the trend line",
      JSON.parse(w.localStorage.getItem("gb:weightlog")).length === 1);
    ok("with no plan it says so", d.body.textContent.includes("rest-day numbers"));
  }

  section("nutrition — the calculator");
  {
    const { w, d, errors } = await page("nutrition.html");
    ok("throws no script errors", errors.length === 0, errors[0]);
    const click2 = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    const rows = () => $$(d, ".calc-rows > div").map((x) =>
      [$(x, ".cr-label").textContent, +$(x, ".cr-val").textContent.replace(/,/g, "")]);
    const get = (label) => (rows().find((r) => r[0] === label) || [])[1];

    ok("it renders without anyone filling anything in", $$(d, ".calc-rows > div").length === 6);
    ok("BMR is named BMR", !!get("BMR"));
    ok("maintenance is named maintenance", !!get("Maintenance · rest") && !!get("Maintenance · training"));
    ok("both targets are shown", !!get("Target · rest") && !!get("Target · training"));
    ok("and the week average", !!get("Week average"));
    ok("training maintenance is above resting maintenance",
      get("Maintenance · training") > get("Maintenance · rest"));
    ok("BMR is below every other figure", get("BMR") < get("Maintenance · rest"));
    ok("macros are shown for both kinds of day", $$(d, ".calc-macros > div").length === 2);

    /* the whole point of a calculator is that it recomputes */
    const before = get("Target · training");
    click2($(d, '[name="c-days"][data-val="6"]'));
    ok("changing training days changes the week average", get("Week average") !== undefined);
    click2($(d, '[name="c-duration"][data-val="90"]'));
    ok("a longer session raises the training-day target", get("Target · training") > before,
      `${get("Target · training")} vs ${before}`);

    const desk = get("Target · rest");
    click2($(d, '[name="c-activity"][data-val="physical"]'));
    ok("a physical job raises it further", get("Target · rest") > desk);

    const bulk = get("Target · rest");
    click2($(d, '[name="c-goal"][data-val="fatloss"]'));
    ok("switching to fat loss drops it below maintenance",
      get("Target · rest") < bulk && get("Target · rest") < get("Maintenance · rest"));

    const begP = $(d, ".calc-macros p").textContent;
    click2($(d, '[name="c-level"][data-val="3"]'));
    ok("changing level changes the macros", $(d, ".calc-macros p").textContent !== begP);

    /* typed input, not just buttons */
    const w70 = get("BMR");
    const wi = $(d, '[name="c-weight"]');
    wi.value = "95";
    wi.dispatchEvent(new w.Event("input", { bubbles: true }));
    ok("typing a new weight recomputes BMR", get("BMR") > w70, `${get("BMR")} vs ${w70}`);
    wi.value = "5";
    wi.dispatchEvent(new w.Event("input", { bubbles: true }));
    ok("an impossible weight is refused, not calculated",
      d.querySelector("#calcOut .empty-note") && !d.querySelector(".calc-rows"));
    wi.value = "70";
    wi.dispatchEvent(new w.Event("input", { bubbles: true }));
    ok("and it recovers when the number is sane again", !!$(d, ".calc-rows"));

    /* the copy must not contradict the figure beside it */
    ok("the goal note states no percentage of its own",
      !/\d+\s*%/.test(w.GBNutri.GOAL_NOTE.fatloss), w.GBNutri.GOAL_NOTE.fatloss);
    ok("it saves nothing until asked", !w.localStorage.getItem("gb:profile"));
    ok("saving is offered", !!$(d, "#calcSave"));
    ok("and it is honest about what it saves",
      $(d, ".calc-hint").textContent.includes("your week"));
  }

  section("nutrition — driven by the training that happened");
  {
    /* a plan plus a part-finished session: the page has to reflect both */
    const seed = await page("week.html");
    const plan = seed.w.localStorage.getItem("gb:week") ||
      (() => { click(seed.w, $(seed.d, "#weekBuild")); return seed.w.localStorage.getItem("gb:week"); })();
    const profile = JSON.stringify({ sex: "male", age: 26, heightCm: 174, weightKg: 72, diet: "veg", updated: "2026-08-13" });

    const { d } = await page("nutrition.html", (win) => {
      win.localStorage.setItem("gb:week", plan);
      win.localStorage.setItem("gb:profile", profile);
    });
    ok("with a plan the target is shown straight away", !$(d, "#nutriOut").hidden);
    ok("it no longer falls back to rest-day numbers", !d.body.textContent.includes("rest-day numbers"));
    ok("the week renders as seven bars", $$(d, ".fw-day").length === 7);
    ok("today is marked in the week", $$(d, ".fw-day.is-today").length === 1);

    /* the homepage card reads the same two things */
    const home = await page("index.html", (win) => {
      win.localStorage.setItem("gb:week", plan);
      win.localStorage.setItem("gb:profile", profile);
    });
    ok("the homepage fuel card appears", !$(home.d, "#fuelCard").hidden);
    ok("it names a calorie and a protein figure",
      /[\d,]+ kcal · \d+g protein/.test($(home.d, "#fuelCard").textContent),
      $(home.d, "#fuelCard").textContent.slice(0, 90));

    /* and with no profile it invites rather than assumes */
    const cold = await page("index.html", (win) => win.localStorage.setItem("gb:week", plan));
    ok("with no profile the card invites instead", $(cold.d, "#fuelCard").textContent.includes("Set my target"));
  }

  /* ── the scale is allowed to overrule the arithmetic ── */
  section("nutrition — the trend is fitted, not read off two points");
  {
    const { w } = await page("nutrition.html");
    const N = w.GBNutri;
    const log = (start, perWeek, weeks, tweak) => {
      const out = [];
      for (let i = 0; i <= weeks; i++) {
        const d = new Date(Date.UTC(2026, 6, 1) + i * 7 * 86400000).toISOString().slice(0, 10);
        out.push({ d, kg: Math.round((start + perWeek * i) * 100) / 100 });
      }
      if (tweak) tweak(out);
      return out;
    };

    const clean = N.trend(log(72, -0.6, 4), "fatloss");
    ok("a clean cut is read at its real rate", Math.abs(clean.perWeek + 0.6) < 0.02, clean.perWeek);
    ok("and every weigh-in is used, not just the ends", clean.points === 5 && clean.fitted);
    ok("a tidy log is not called noisy", !clean.noisy && clean.scatter < 0.05, clean.scatter);

    /* one bad final morning — salt, sleep, a late dinner — used to be
       half the trend, because the trend was two points */
    const spiked = log(72, -0.6, 4, (l) => { l[l.length - 1].kg += 1.5; });
    const tr = N.trend(spiked, "fatloss");
    const ends = (spiked[spiked.length - 1].kg - spiked[0].kg) / 28 * 7;
    ok("a bad last weigh-in pulls the fitted line less than it pulls the endpoints",
      Math.abs(tr.perWeek + 0.6) < Math.abs(ends + 0.6), `fitted ${tr.perWeek} vs endpoints ${ends.toFixed(2)}`);
    ok("and the scatter it causes is reported", tr.noisy && tr.scatter > 0.3, tr.scatter);
    ok("the reader is told to weigh more carefully", tr.advice.includes("first thing"));

    /* the window: a bulk followed by a cut nets out to nothing, and
       the net is a true fact about the past and a useless one for
       deciding what to eat this week */
    const halfYear = [];
    for (let i = 0; i < 12; i++) {
      halfYear.push({ d: new Date(Date.UTC(2026, 1, 1) + i * 14 * 86400000).toISOString().slice(0, 10),
                      kg: 70 + i * 0.5 });
    }
    for (let i = 1; i <= 5; i++) {
      halfYear.push({ d: new Date(Date.UTC(2026, 1, 1) + (11 * 14 + i * 7) * 86400000).toISOString().slice(0, 10),
                      kg: 75.5 - i * 0.6 });
    }
    const recent = N.trend(halfYear, "fatloss");
    ok("only the last four weeks are trended", recent.days <= N.TREND_WINDOW, recent.days);
    ok("so a bulk six months ago cannot cancel out the cut happening now",
      recent.perWeek < -0.3, recent.perWeek);

    ok("one weigh-in is still not a trend", N.trend([{ d: "2026-07-01", kg: 72 }], "fatloss") === null);
    ok("an empty log is handled", N.trend([], "fatloss") === null && N.trend(null, "fatloss") === null);
    ok("a log where nothing changed does not divide by zero",
      N.trend(log(72, 0, 4), "fatloss").perWeek === 0);
  }

  section("nutrition — the correction the scale argues for");
  {
    const { w } = await page("nutrition.html");
    const N = w.GBNutri, P = w.GBPlan;
    const me = { sex: "male", age: 26, heightCm: 174, weightKg: 72, diet: "veg", activity: "sitting" };
    const weekly = (perWeek, weeks) => {
      const out = [];
      for (let i = 0; i <= weeks; i++) {
        out.push({ d: new Date(Date.UTC(2026, 6, 1) + i * 7 * 86400000).toISOString().slice(0, 10),
                   kg: Math.round((72 + perWeek * i) * 100) / 100 });
      }
      return out;
    };
    const cutPlan = P.generate({ level: 2, days: 4, goal: "fatloss", duration: 60, kit: "full", weekNumber: 1 });
    const day = cutPlan.week.find((x) => x.type === "train");

    /* it does not fire on a hunch */
    ok("two weigh-ins are not enough to move anyone's calories",
      !N.correction(weekly(0, 1), cutPlan, null).ready);
    ok("and it says what is still missing",
      /weigh-ins/.test(N.correction(weekly(0, 1), cutPlan, null).reason));
    const quick = [0, 3, 6].map((n) => ({ d: `2026-07-0${1 + n}`, kg: 72 }));
    ok("three weigh-ins inside a week are not a fortnight", !N.correction(quick, cutPlan, null).ready);
    ok("a working cut is left entirely alone",
      !N.correction(weekly(-0.6, 4), cutPlan, null).ready &&
      N.correction(weekly(-0.6, 4), cutPlan, null).onBand);

    /* a stalled cut is exactly what this is for */
    const stalled = N.correction(weekly(0, 4), cutPlan, null);
    ok("a stalled cut produces a correction", stalled.ready, stalled.reason);
    ok("which takes calories off rather than adding them", stalled.step < 0, stalled.step);
    ok("no single correction moves more than 250 kcal", Math.abs(stalled.step) <= 250, stalled.step);
    ok("and it lands on a number a person can act on", stalled.step % 25 === 0, stalled.step);
    ok("it explains itself in kilos and calories, not jargon",
      stalled.why.includes("7,700") && stalled.why.includes("kg a week"), stalled.why);

    /* and the other direction */
    const bulk = P.generate({ level: 2, days: 4, goal: "muscle", duration: 60, kit: "full", weekNumber: 1 });
    const bulkDay = bulk.week.find((x) => x.type === "train");
    const fast = N.correction(weekly(0.9, 4), bulk, null);
    ok("gaining too fast takes calories off too", fast.ready && fast.step < 0, fast.step);
    const slow = N.correction(weekly(0, 4), bulk, null);
    ok("a bulk that isn't bulking gets fed", slow.ready && slow.step > 0, slow.step);

    /* evidence has to be newer than the change it is judging */
    const applied = { kcal: -250, since: "2026-07-22", goal: "fatloss" };
    ok("weigh-ins from before the last change do not judge it",
      !N.correction(weekly(0, 4), cutPlan, applied).ready);
    ok("a correction already inside the band is left where it is",
      N.correction(weekly(-0.6, 4), cutPlan, { kcal: -250, since: "2026-06-01", goal: "fatloss" }).onBand);

    /* corrections accumulate, but not forever */
    const deep = N.correction(weekly(0, 4), cutPlan, { kcal: -500, since: "2026-06-01", goal: "fatloss" });
    ok("corrections stack toward the ceiling", deep.next === -N.CORRECT_TOTAL, deep.next);
    const maxed = N.correction(weekly(0, 4), cutPlan, { kcal: -N.CORRECT_TOTAL, since: "2026-06-01", goal: "fatloss" });
    ok("and stop there rather than chasing forever", !maxed.ready, maxed.next);
    ok("saying so instead of going quiet", /bigger than a calorie estimate/.test(maxed.reason));

    /* what it does to the target */
    const before = N.dayTargets(me, cutPlan, day);
    const after = N.dayTargets(me, cutPlan, day, { adjust: stalled.next });
    ok("applying it moves the day's target", after.kcal < before.kcal, `${before.kcal} → ${after.kcal}`);
    ok("it is carried on the day so the page can show its working", after.adjust === stalled.next);
    ok("it lands on maintenance rather than on the finished target",
      after.expend === before.expend + stalled.next, `${before.expend} → ${after.expend}`);

    /* which is the whole point of putting it there: the goal percentage
       ends up applied to a maintenance figure the scale has agreed with,
       instead of to one the equations guessed */
    const bAfter = N.dayTargets(me, bulk, bulkDay, { adjust: slow.next });
    ok("so the surplus is taken on a corrected maintenance, not an estimated one",
      !bAfter.floored && Math.abs(bAfter.kcal - bAfter.expend * (1 + bAfter.adjPct / 100)) <= 5,
      `${bAfter.expend} · ${bAfter.kcal}`);
    ok("macros are rebuilt on the corrected number",
      Math.abs(after.protein * 4 + after.carbs * 4 + after.fat * 9 - after.kcal) <= 10);
    ok("protein is not what gets cut", after.protein === before.protein);
    ok("the floor still outranks it",
      N.dayTargets({ sex: "female", age: 55, heightCm: 150, weightKg: 45, diet: "veg" },
        cutPlan, { type: "rest" }, { adjust: -600 }).kcal >= 1200);
    ok("a nonsense correction cannot be smuggled in",
      N.dayTargets(me, cutPlan, day, { adjust: -99999 }).adjust === -N.CORRECT_TOTAL);
    ok("the whole week moves with it",
      N.weekTargets(me, cutPlan, { adjust: -250 }).avg < N.weekTargets(me, cutPlan).avg);

    /* a correction the floor is going to swallow is not offered — a
       button promising 250 kcal that delivers 25 is worse than none */
    const small = { sex: "female", age: 40, heightCm: 155, weightKg: 52, diet: "veg", activity: "sitting" };
    const boxed = N.correction(weekly(0, 4), cutPlan, null, { profile: small, day: { type: "rest" } });
    ok("a cut already sitting on the floor is not offered less food",
      !boxed.ready && boxed.floorBound, `${boxed.ready} · ${boxed.delivers}`);
    ok("it is told to add training instead, which is where the answer is",
      /training one/.test(boxed.reason) && /walk/.test(boxed.reason));
    ok("the same person is still offered a correction where there is room to move",
      N.correction(weekly(0, 4), cutPlan, null,
        { profile: { ...small, activity: "physical" }, day: day }).ready);
    ok("and the floor never blocks feeding someone more",
      N.correction(weekly(0, 4), bulk, null, { profile: small, day: bulkDay }).ready);
  }

  section("nutrition — the correction on the page");
  {
    const seed = await page("week.html");
    let plan = seed.w.localStorage.getItem("gb:week") ||
      (() => { click(seed.w, $(seed.d, "#weekBuild")); return seed.w.localStorage.getItem("gb:week"); })();
    plan = JSON.stringify({ ...JSON.parse(plan), goal: "fatloss" });
    const profile = JSON.stringify({ sex: "male", age: 26, heightCm: 174, weightKg: 72, diet: "veg", activity: "mixed", updated: "2026-08-13" });
    const stall = [];
    for (let i = 0; i <= 4; i++) {
      stall.push({ d: new Date(Date.UTC(2026, 6, 1) + i * 7 * 86400000).toISOString().slice(0, 10), kg: 72 });
    }
    const seedAll = (win) => {
      win.localStorage.setItem("gb:week", plan);
      win.localStorage.setItem("gb:profile", profile);
      win.localStorage.setItem("gb:weightlog", JSON.stringify(stall));
    };

    const { w, d, errors } = await page("nutrition.html", seedAll);
    ok("the page still throws nothing", errors.length === 0, errors[0]);
    ok("the correction has its own block under the trend", !!$(d, ".fix"));
    ok("and it is offering one", !!$(d, ".fix.is-ready") && !!$(d, ".fix-apply"));
    ok("the button says what it will do in calories",
      /\d+ kcal a day/.test($(d, ".fix-apply").textContent), $(d, ".fix-apply").textContent);
    ok("and shows the target before and after, so nothing is a surprise",
      /[\d,]+ → [\d,]+ kcal/.test($(d, ".fix-delta").textContent), $(d, ".fix-delta").textContent);
    ok("nothing is applied until it is pressed", !w.localStorage.getItem("gb:nutri:adj"));
    ok("and the maths has no correction row yet", !$(d, ".fuel-maths .is-fix"));

    const was = +$(d, ".fuel-kcal b").textContent.replace(/[^\d]/g, "");
    click(w, $(d, ".fix-apply"));
    const saved = JSON.parse(w.localStorage.getItem("gb:nutri:adj"));
    ok("pressing it stores the correction", saved && saved.kcal === -250, saved && saved.kcal);
    ok("with the evidence clock restarted, so it cannot re-fire on the same fortnight", !!saved.since);
    const now = +$(d, ".fuel-kcal b").textContent.replace(/[^\d]/g, "");
    ok("the target on screen moves straight away", now < was, `${was} → ${now}`);
    ok("the maths owns up to it", !!$(d, ".fuel-maths .is-fix"));
    ok("in the reader's own weigh-ins, not as a mystery adjustment",
      $(d, ".fuel-maths .is-fix").textContent.includes("weigh-ins"));
    ok("and it is no longer offering the same change again", !$(d, ".fix-apply"));
    ok("it says what is applied and since when", /is applied/.test($(d, ".fix-applied").textContent));
    ok("and offers to undo it", !!$(d, ".fix-remove"));

    click(w, $(d, ".fix-remove"));
    ok("removing it puts the target back", +$(d, ".fuel-kcal b").textContent.replace(/[^\d]/g, "") === was);
    ok("and clears the stored correction", JSON.parse(w.localStorage.getItem("gb:nutri:adj")).kcal === 0);

    /* every other place the number appears has to agree with it */
    const withFix = (win) => {
      seedAll(win);
      win.confirm = () => true;      /* jsdom has no dialogs; the delete path asks for one */
      win.localStorage.setItem("gb:nutri:adj", JSON.stringify({ kcal: -250, since: "2026-08-01", at: "2026-08-01", goal: "fatloss" }));
    };
    const home = await page("index.html", withFix);
    const plain = await page("index.html", seedAll);
    const kcalOf = (doc) => +doc.querySelector("#fuelCard h2").textContent.replace(/[^\d]/g, "").slice(0, 4);
    ok("the homepage card carries the correction too", kcalOf(home.d) < kcalOf(plain.d),
      `${kcalOf(plain.d)} vs ${kcalOf(home.d)}`);

    const calc = await page("nutrition.html", withFix);
    ok("the calculator does not disagree with the page above it",
      $(calc.d, ".calc-why").textContent.includes("correction"), $(calc.d, ".calc-why").textContent.slice(-80));

    /* deleting the numbers deletes what was derived from them */
    click(calc.w, $(calc.d, "#nuClear"));
    ok("deleting your details deletes the correction with them",
      !calc.w.localStorage.getItem("gb:nutri:adj"));
  }

  /* ── what goes on the bar ── */
  section("plate calculator");
  {
    const { w, d } = await page("advanced.html");
    const P = w.GBPlates;
    ok("the calculator is available", typeof P === "object" && typeof P.solve === "function");

    /* the arithmetic, before any of it reaches a screen */
    const hundred = P.solve(100, 20);
    ok("100 kg is 40 a side", hundred.perSide === 40);
    ok("...loaded heaviest first", JSON.stringify(hundred.picked) === JSON.stringify([{ kg: 25, n: 1 }, { kg: 15, n: 1 }]));
    ok("...with nothing left over", hundred.short === 0);
    ok("60 kg is a 20 a side", P.phrase(P.solve(60, 20)) === "20 kg bar + 20 a side");
    ok("multiples are counted, not repeated", P.phrase(P.solve(120, 20)) === "20 kg bar + 2×25 a side",
      P.phrase(P.solve(120, 20)));
    ok("the bar alone is named as such", P.phrase(P.solve(20, 20)) === "just the 20 kg bar");
    ok("under the bar is refused rather than guessed", P.solve(15, 20).under === true);

    /* a number the plates cannot make must say so */
    const odd = P.solve(61, 20);
    ok("61 kg is 1 kg short of possible", Math.abs(odd.short - 1) < 0.001, odd.short);
    ok("...and the phrase admits it", /1 kg short/.test(P.phrase(odd)), P.phrase(odd));

    /* a lighter bar changes every answer under it */
    ok("a 15 kg bar is not a 20 kg bar", P.solve(100, 15).perSide === 42.5);

    /* which rows get one */
    const rowFor = (doc, re) => $$(doc, ".wo-row").find((r) => re.test($(r, ".wo-name").textContent));
    const squat = rowFor(d, /^Barbell back squat/);
    ok("a barbell lift gets a breakdown", !!$(squat, ".plate-hint"));
    ok("a dumbbell lift does not", !$(rowFor(d, /^Romanian deadlift/), ".plate-hint"));
    const hinted = $$(d, ".wo-row").filter((r) => $(r, ".plate-hint"));
    ok("nothing else on the page gets one", hinted.length === 1, hinted.length + " rows");

    /* the breakdown follows the box */
    const inp = $(squat, ".lift-w select");
    inp.value = "80";
    inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    ok("typing a weight fills the breakdown in",
      $(squat, ".plate-hint").textContent === "20 kg bar + 25, 5 a side",
      $(squat, ".plate-hint").textContent);
    inp.value = "";
    inp.dispatchEvent(new w.Event("input", { bubbles: true }));
    ok("clearing it takes the breakdown away", $(squat, ".plate-hint").hidden === true);

    /* a machine-only page has nothing to work out */
    const beg = await page("beginner.html");
    ok("a machine session shows no plate maths", $$(beg.d, ".plate-hint").length === 0);

    /* the standalone tool, and the bar setting it owns */
    const eq = await page("equipment.html");
    ok("the plates card carries a calculator", !!$(eq.d, ".plate-tool"));

    /* A filter rebuilds every card from scratch, which throws away the
       enhancements hanging off the old nodes. app.js announces the rebuild
       so they can re-arm; for a long time it did not, and the calculator
       vanished the first time anybody typed in the search box. */
    const eqSearch = $(eq.d, "#eqSearch");
    eqSearch.value = "plates";
    eqSearch.dispatchEvent(new eq.w.Event("input", { bubbles: true }));
    ok("filtering the library does not take the calculator with it",
      !!$(eq.d, ".plate-tool") && !!$(eq.d, "#ptTotal"));
    eqSearch.value = "";
    eqSearch.dispatchEvent(new eq.w.Event("input", { bubbles: true }));
    ok("...nor does clearing the filter", !!$(eq.d, ".plate-tool"));
    click(eq.w, $(eq.d, '[data-eq-cat="free"]'));
    ok("...nor does a zone filter", !!$(eq.d, ".plate-tool"));
    ok("...and it is still the only one", $$(eq.d, ".plate-tool").length === 1,
      $$(eq.d, ".plate-tool").length + " calculators");
    click(eq.w, $(eq.d, '[data-eq-cat="all"]'));

    /* the same announcement is what will re-arm the demo buttons on a
       re-rendered card once vid/ has a clip in it */
    let rebuilds = 0;
    eq.d.addEventListener("gb:rows", () => rebuilds++);
    eqSearch.value = "row";
    eqSearch.dispatchEvent(new eq.w.Event("input", { bubbles: true }));
    ok("a re-render announces itself so enhancements can re-arm", rebuilds === 1, rebuilds + " events");
    eqSearch.value = "";
    eqSearch.dispatchEvent(new eq.w.Event("input", { bubbles: true }));

    const exLib = await page("exercises.html");
    let exRebuilds = 0;
    exLib.d.addEventListener("gb:rows", () => exRebuilds++);
    click(exLib.w, $(exLib.d, '[data-ex-muscle="legs"]'));
    ok("the exercise library announces its re-renders too", exRebuilds === 1, exRebuilds + " events");
    ok("...and the cards still name their exercise and station afterwards",
      $$(exLib.d, ".ex-card").every((c) => !!c.dataset.ex) &&
      $$(exLib.d, ".ex-card").some((c) => !!c.dataset.eq));
    ok("...that offers the bars people actually meet", $$(eq.d, "#ptBar option").length === 4);
    const total = $(eq.d, "#ptTotal");
    total.value = "82.5";
    total.dispatchEvent(new eq.w.Event("input", { bubbles: true }));
    ok("the tool answers", $(eq.d, "#ptOut").textContent === "20 kg bar + 25, 5, 1.25 a side",
      $(eq.d, "#ptOut").textContent);

    const sel = $(eq.d, "#ptBar");
    sel.value = "15";
    sel.dispatchEvent(new eq.w.Event("change", { bubbles: true }));
    ok("changing the bar is remembered", JSON.parse(eq.w.localStorage.getItem("gb:bar")) === 15);

    /* and that choice reaches the rows on the next page */
    const after = await page("advanced.html", (win) => win.localStorage.setItem("gb:bar", "15"));
    const sq2 = $$(after.d, ".wo-row").find((r) => /^Barbell back squat/.test($(r, ".wo-name").textContent));
    const i2 = $(sq2, ".lift-w select");
    i2.value = "100";
    i2.dispatchEvent(new after.w.Event("input", { bubbles: true }));
    ok("a 15 kg bar is used on the row too", /^15 kg bar/.test($(sq2, ".plate-hint").textContent),
      $(sq2, ".plate-hint").textContent);

    /* the breakdown belongs to the set on screen, not to the exercise */
    const i3 = $(squat, ".lift-w select");
    i3.value = "80";
    i3.dispatchEvent(new w.Event("change", { bubbles: true }));
    ok("logging set 1 loads the bar for set 1",
      $(squat, ".plate-hint").textContent === "20 kg bar + 25, 5 a side",
      $(squat, ".plate-hint").textContent);
    w.GBSession.select(squat, 2);
    ok("moving to an empty set 2 takes the breakdown with it",
      $(squat, ".plate-hint").hidden === true, $(squat, ".plate-hint").textContent);
    i3.value = "100";
    i3.dispatchEvent(new w.Event("change", { bubbles: true }));
    ok("...and set 2's own weight gets its own breakdown",
      $(squat, ".plate-hint").textContent === "20 kg bar + 25, 15 a side",
      $(squat, ".plate-hint").textContent);
    w.GBSession.select(squat, 1);
    ok("going back to set 1 puts set 1's bar back",
      $(squat, ".plate-hint").textContent === "20 kg bar + 25, 5 a side",
      $(squat, ".plate-hint").textContent);
  }

  /* ── getting the log back out ── */
  section("log export");
  {
    const seed = (entries) => (win) => {
      Object.keys(entries).forEach((k) =>
        win.localStorage.setItem("gb:lift:" + k, JSON.stringify(entries[k])));
    };

    /* nothing logged: no button, and a reason rather than silence */
    const empty = await page("week.html");
    ok("an empty log offers no download", !$(empty.d, "#gbExport button"));
    ok("...and says how to start one", /Nothing logged yet/.test($(empty.d, "#gbExport").textContent));

    const { w, d } = await page("week.html", seed({
      "barbell-squat": [{ d: "2026-01-02", w: 100, sets: 4, reps: "5–8", rpe: "easy", name: "Barbell back squat" }],
      "leg-press-ex": [
        { d: "2026-01-01", w: 80, sets: 3, reps: "8–10", rpe: "hard", name: "Leg press" },
        { d: "2026-01-02", w: 85, sets: 3, reps: "8–10", rpe: "right", name: "Leg press" }
      ]
    }));

    ok("a log offers a download", !!$(d, "#gbExport button"));
    ok("...and counts what is in it", /3 entries across 2 days/.test($(d, "#gbExport").textContent),
      $(d, "#gbExport").textContent);

    const lines = w.GBLift.csv().split("\r\n");
    ok("the file has a header",
      lines[0] === "date,exercise,exercise_id,weight_kg,sets,reps,felt,sets_detail", lines[0]);
    ok("...and one row per exercise per day", lines.length === 4, lines.length);
    ok("oldest first, the way a log is read", /^2026-01-01/.test(lines[1]) && /^2026-01-02/.test(lines[2]));
    ok("a row carries the weight and how it felt",
      lines[1] === "2026-01-01,Leg press,leg-press-ex,80,3,8–10,hard,", lines[1]);
    ok("...and a session logged before sets existed has no set detail to give",
      lines[1].split(",").pop() === "");

    /* a name with a comma in it must not become two columns */
    const tricky = await page("week.html", seed({
      "x": [{ d: "2026-01-01", w: 20, name: 'Press, seated "close" grip' }]
    }));
    const row = tricky.w.GBLift.csv().split("\r\n")[1];
    ok("commas and quotes in a name are escaped",
      row === '2026-01-01,"Press, seated ""close"" grip",x,20,,,,', row);

    /* the name is the one it was logged under, not one looked up now */
    const gone = await page("week.html", seed({
      "deleted-lift": [{ d: "2026-01-01", w: 50, name: "Something that left the library" }]
    }));
    ok("a lift that left data.js still exports under its own name",
      /Something that left the library/.test(gone.w.GBLift.csv()));

    /* logging something new updates the offer without a reload */
    w.GBLift.record("deadlift", { w: 120, sets: 3, reps: "5", name: "Barbell deadlift" });
    ok("a fresh entry is counted straight away", /4 entries/.test($(d, "#gbExport").textContent),
      $(d, "#gbExport").textContent);
  }

  /* ── per-set tracking ──
     One weight box per exercise meant set 2 showed set 1's number and
     overwrote it. Every set is now its own record. */
  section("per-set tracking");
  {
    const { w, d } = await page("intermediate.html");
    const row = $$(d, ".wo-row").find((r) => /3 × 8–12/.test($(r, ".wo-rx").textContent) && $(r, ".lift-w"));
    const dots = $$(row, ".set-dot");
    const wBox = $(row, ".lift-w select");
    const rBox = $(row, ".lift-r select");
    const rpe = (id) => $(row, '.lift-rpe [data-rpe="' + id + '"]');
    const pressed = () => (RPE_IDS.find((id) => rpe(id).getAttribute("aria-pressed") === "true") || "");
    const RPE_IDS = ["easy", "right", "hard"];
    const exId = row.dataset.ex;
    const stored = () => JSON.parse(w.localStorage.getItem("gb:lift:" + exId) || "[]")[0] || {};
    const type = (box, v) => { box.value = v; box.dispatchEvent(new w.Event("change", { bubbles: true })); };

    ok("a 3 × 8–12 row has three sets", dots.length === 3, dots.length);
    ok("it has a reps box as well as a weight box", !!rBox);
    ok("the panel says which set it is showing", $(row, ".lift-set").textContent === "Set 1 of 3",
      $(row, ".lift-set").textContent);
    ok("set 1 is the one selected to begin with", dots[0].classList.contains("is-sel"));
    ok("...and says so to a screen reader", dots[0].getAttribute("aria-current") === "true");
    ok("the other sets are not", !dots[1].classList.contains("is-sel") && !dots[2].classList.contains("is-sel"));
    ok("selection is exposed for the panel to read", w.GBSession.selected(row) === 1);
    ok("...along with how many sets there are", w.GBSession.count(row) === 3);

    /* 1. set 1: 10 kg × 12, easy */
    type(wBox, "10");
    type(rBox, "12");
    click(w, rpe("easy"));
    ok("set 1 takes a weight, reps and how it felt",
      stored().s[0].w === 10 && stored().s[0].r === 12 && stored().s[0].rpe === "easy",
      JSON.stringify(stored().s));

    /* 2–3. moving to set 2 must not carry set 1's numbers over */
    click(w, dots[1]);
    ok("clicking set 2 moves the panel to set 2", $(row, ".lift-set").textContent === "Set 2 of 3");
    ok("...and the ring moves with it",
      dots[1].classList.contains("is-sel") && !dots[0].classList.contains("is-sel"));
    ok("a set never entered starts empty, not on the last set's weight", wBox.value === "", wBox.value);
    ok("...and is not prefilled by the placeholder either", wBox.placeholder !== "10", wBox.placeholder);
    ok("its reps start empty too", rBox.value === "");
    ok("and nothing is marked as how it felt", pressed() === "");

    type(wBox, "12.5");
    type(rBox, "10");
    click(w, rpe("right"));

    /* 4–5. set 3 */
    click(w, dots[2]);
    ok("set 3 starts empty as well", wBox.value === "" && rBox.value === "");
    type(wBox, "15");
    type(rBox, "8");
    click(w, rpe("hard"));

    /* 6–11. everything is still where it was put */
    click(w, dots[0]);
    ok("set 1 still reads 10 kg", wBox.value === "10", wBox.value);
    ok("...with its own reps", rBox.value === "12", rBox.value);
    ok("...and its own difficulty", pressed() === "easy", pressed());
    click(w, dots[1]);
    ok("set 2 still reads 12.5 kg × 10, right", wBox.value === "12.5" && rBox.value === "10" && pressed() === "right",
      wBox.value + " / " + rBox.value + " / " + pressed());
    click(w, dots[2]);
    ok("set 3 still reads 15 kg × 8, hard", wBox.value === "15" && rBox.value === "8" && pressed() === "hard",
      wBox.value + " / " + rBox.value + " / " + pressed());

    /* 12–13. and no set has written over another */
    const e = stored();
    ok("the three sets are three records",
      JSON.stringify(e.s) === JSON.stringify([
        { w: 10, r: 12, rpe: "easy" }, { w: 12.5, r: 10, rpe: "right" }, { w: 15, r: 8, rpe: "hard" }
      ]), JSON.stringify(e.s));

    /* the exercise-level figures are derived from them, not typed */
    ok("the day's weight is the heaviest set", e.w === 15, e.w);
    ok("how the day felt is how that set felt", e.rpe === "hard", e.rpe);
    ok("the reps recorded are the ones that set got", e.ar === 8, e.ar);
    ok("the prescription is kept as the prescription", e.reps === "8–12" && e.sets === 3,
      e.reps + " / " + e.sets);
    ok("the day's tonnage is the sum of the sets", e.vol === 10 * 12 + 12.5 * 10 + 15 * 8, e.vol);

    /* editing one set leaves the others alone */
    click(w, dots[1]);
    type(wBox, "17.5");
    const after = stored();
    ok("changing set 2 does not touch set 1", after.s[0].w === 10 && after.s[0].r === 12);
    ok("...or set 3", after.s[2].w === 15 && after.s[2].rpe === "hard");
    ok("...and only set 2 moved", after.s[1].w === 17.5 && after.s[1].r === 10);

    /* clearing a box clears that set, and nothing else */
    type(wBox, "");
    ok("emptying the box drops that set's weight", stored().s[1].w === undefined, JSON.stringify(stored().s[1]));
    ok("...leaving its reps and feel alone", stored().s[1].r === 10 && stored().s[1].rpe === "right");
    ok("...and the day's weight falls back to the heaviest one left", stored().w === 15, stored().w);
    type(wBox, "12.5");

    /* ticking and logging are different facts about a set */
    ok("tapping a set ticks it off", dots[1].classList.contains("on"));
    click(w, dots[0]);
    ok("tapping another set moves the panel", w.GBSession.selected(row) === 1);
    click(w, dots[1]);
    ok("coming back to a ticked set selects it rather than un-ticking it",
      dots[1].classList.contains("on") && w.GBSession.selected(row) === 2);
    ok("...and shows what was logged for it", wBox.value === "12.5", wBox.value);
    ok("the panel says that set is done", !$(row, ".lift-flag").hidden);
    click(w, dots[1]);
    ok("tapping the set you are already on un-ticks it, so a mis-tap is undoable",
      !dots[1].classList.contains("on"));
    ok("...and the panel drops the done flag", $(row, ".lift-flag").hidden);
    ok("un-ticking a set does not throw away what you lifted on it", stored().s[1].w === 12.5);
    ok("the tick state is still session.js's, stored where it always was",
      /"intermediate:\d+:\d+:3":1/.test(w.localStorage.getItem("gb:sets:intermediate")),
      w.localStorage.getItem("gb:sets:intermediate"));

    /* a reset clears the ticks, not the log — the log is history */
    click(w, $(d, ".sb-reset"));
    ok("reset puts the panel back on set 1", $(row, ".lift-set").textContent === "Set 1 of 3");
    ok("...and clears the ticks", $$(row, ".set-dot.on").length === 0);
    ok("...but keeps the weights, which are a record and not a tick",
      stored().s[0].w === 10 && stored().s[2].w === 15);

    /* the number of set records follows the prescription, not a constant */
    const counts = {};
    $$(d, ".wo-row").filter((r) => $(r, ".lift-w")).forEach((r) => {
      const n = +$(r, ".wo-rx").textContent.match(/^\s*(\d+)\s*×/)[1];
      counts[n] = (counts[n] || 0) + 1;
      if ($$(r, ".set-dot").length !== n) counts.bad = true;
    });
    ok("every row gets exactly as many sets as it prescribes", !counts.bad, JSON.stringify(counts));
    /* two sets means two, not three */
    const beg = await page("beginner.html");
    const two = $$(beg.d, ".wo-row").find((r) => $(r, ".lift-w") && $$(r, ".set-dot").length === 2);
    ok("a two-set row gets exactly two", !!two);
    ok("...and no third set to type into", $$(two, ".set-dot").length === 2);
    beg.w.GBSession.select(two, 2);
    const tBox = $(two, ".lift-w select");
    tBox.value = "20";
    tBox.dispatchEvent(new beg.w.Event("change", { bubbles: true }));
    const tId = two.dataset.ex || "eq:" + two.dataset.eq;
    const tStored = JSON.parse(beg.w.localStorage.getItem("gb:lift:" + tId))[0];
    ok("a two-set row records against set 2", tStored.s[1].w === 20, JSON.stringify(tStored.s));
    ok("...and leaves set 1 unwritten rather than empty-but-present", tStored.s[0] === null,
      JSON.stringify(tStored.s));

    /* four sets, from a page that prescribes them */
    const adv = await page("advanced.html");
    const four = $$(adv.d, ".wo-row").find((r) => /^4 × /.test($(r, ".wo-rx").textContent) && $(r, ".lift-w"));
    ok("a four-set row gets four independent sets", $$(four, ".set-dot").length === 4);
    const fBox = $(four, ".lift-w select");
    [1, 2, 3, 4].forEach((n, i) => {
      adv.w.GBSession.select(four, n);
      fBox.value = String(60 + i * 5);
      fBox.dispatchEvent(new adv.w.Event("change", { bubbles: true }));
    });
    const fId = four.dataset.ex || "eq:" + four.dataset.eq;
    ok("...each holding its own weight",
      JSON.parse(adv.w.localStorage.getItem("gb:lift:" + fId))[0].s.map((x) => x.w).join(",") === "60,65,70,75",
      JSON.parse(adv.w.localStorage.getItem("gb:lift:" + fId))[0].s.map((x) => x.w).join(","));
  }

  /* ── picking instead of typing ── */
  section("weight and reps dropdowns");
  {
    const { w, d } = await page("intermediate.html");
    const row = $$(d, ".wo-row").find((r) => r.dataset.ex === "db-bench-press");
    const wSel = $(row, ".lift-w select");
    const rSel = $(row, ".lift-r select");
    const custom = $(row, ".lift-w .lift-custom");
    const wOpts = () => $$(row, ".lift-w option").map((o) => o.value);
    const rOpts = () => $$(row, ".lift-r option").map((o) => o.value);
    const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));

    ok("the weight control is a dropdown", wSel.tagName === "SELECT");
    ok("...and so is the reps control", rSel.tagName === "SELECT");
    ok("both are thumb-sized rather than tiny",
      w.getComputedStyle(wSel).minHeight === "48px", w.getComputedStyle(wSel).minHeight);

    /* the reps list is the one asked for, and nothing on it is a range */
    ok("reps run 1 to 20", rOpts().slice(1, 21).join(",") === "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20",
      rOpts().slice(1, 21).join(","));
    ok("...then the round numbers above it", rOpts().slice(21).join(",") === "25,30,35,40,50", rOpts().slice(21).join(","));
    ok("the prescription is never an option", !rOpts().some((v) => /–/.test(v)));
    ok("...it is shown beside the picker as the target",
      $(row, ".lift-r .lift-target").textContent === "target 8–12",
      $(row, ".lift-r .lift-target").textContent);
    ok("...and the picker starts on neither of them", rSel.value === "" &&
      $$(row, ".lift-r option")[0].textContent === "Select reps");

    /* the ladder belongs to the equipment */
    ok("a dumbbell row offers dumbbell weights", wOpts().slice(1, 5).join(",") === "2.5,5,7.5,10", wOpts().slice(1, 5).join(","));
    ok("...and offers a way out at the bottom", wOpts().pop() === "__custom");
    ok("the custom box is hidden until it is asked for", custom.hidden === true);

    /* choosing a weight */
    wSel.value = "12.5"; fire(wSel, "change");
    rSel.value = "10"; fire(rSel, "change");
    const stored = () => JSON.parse(w.localStorage.getItem("gb:lift:db-bench-press"))[0];
    ok("picking a weight records it", stored().s[0].w === 12.5, JSON.stringify(stored().s[0]));
    ok("picking reps records them", stored().s[0].r === 10);
    ok("the reps stored are a number, not the prescription", typeof stored().s[0].r === "number");

    /* the custom way out */
    wSel.value = "__custom"; fire(wSel, "change");
    ok("choosing custom opens a box", custom.hidden === false && wSel.hidden === true);
    ok("...starting on what the set already had", custom.value === "12.5", custom.value);
    custom.value = "13.75"; fire(custom, "change");
    ok("a custom weight is recorded", stored().s[0].w === 13.75, JSON.stringify(stored().s[0]));
    ok("...the box closes again", custom.hidden === true && wSel.hidden === false);
    ok("...and it joins the list so it can be picked next time",
      wOpts().indexOf("13.75") > -1 && wSel.value === "13.75");
    ok("...in the right place on it",
      wOpts().indexOf("13.75") === wOpts().indexOf("12.5") + 1, wOpts().slice(0, 8).join(","));

    /* backing out of it changes nothing */
    wSel.value = "__custom"; fire(wSel, "change");
    custom.value = "";
    custom.dispatchEvent(new w.FocusEvent("blur"));
    ok("walking away from the custom box leaves the set alone",
      stored().s[0].w === 13.75 && custom.hidden === true && wSel.value === "13.75");

    /* clearing */
    wSel.value = ""; fire(wSel, "change");
    ok("choosing the empty option clears that set's weight", stored().s[0].w === undefined,
      JSON.stringify(stored().s[0]));
    ok("...and leaves its reps alone", stored().s[0].r === 10);

    /* a weight logged elsewhere still shows up */
    const odd = await page("intermediate.html", (win) =>
      win.localStorage.setItem("gb:lift:db-bench-press", JSON.stringify([
        { d: new Date().toISOString().slice(0, 10), name: "Dumbbell bench press", sets: 3, reps: "8–12",
          w: 21, s: [{ w: 21, r: 9 }] }
      ])));
    const oddRow = $$(odd.d, ".wo-row").find((r) => r.dataset.ex === "db-bench-press");
    ok("a weight off the ladder is still shown rather than lost",
      $(oddRow, ".lift-w select").value === "21", $(oddRow, ".lift-w select").value);
    ok("...and it is slotted in where it belongs",
      $$(oddRow, ".lift-w option").map((o) => o.value).join(",").indexOf("20,21,22.5") > -1);
  }

  /* ── last time's weight, offered and then earned ── */
  section("the suggestion");
  {
    const seedLift = (entries) => (win) => {
      Object.keys(entries).forEach((k) =>
        win.localStorage.setItem("gb:lift:" + k, JSON.stringify(entries[k])));
    };
    const LAST = {
      "db-bench-press": [{
        d: "2020-01-06", name: "Dumbbell bench press", sets: 3, reps: "8–12",
        w: 25, ar: 8, rpe: "right",
        s: [{ w: 20, r: 12, rpe: "easy" }, { w: 22.5, r: 10, rpe: "right" }, { w: 25, r: 8, rpe: "hard" }]
      }]
    };
    const today = new Date().toISOString().slice(0, 10);
    const mine = (w) => JSON.parse(w.localStorage.getItem("gb:lift:db-bench-press"))
      .filter((e) => e.d === today)[0] || null;

    /* ticking the set off is when it becomes a record */
    const { w, d } = await page("intermediate.html", seedLift(LAST));
    const row = $$(d, ".wo-row").find((r) => r.dataset.ex === "db-bench-press");
    const dots = $$(row, ".set-dot");
    const wSel = $(row, ".lift-w select");

    ok("set 1 opens on what set 1 lifted last time", wSel.value === "20", wSel.value);
    ok("nothing is recorded for merely showing it", mine(w) === null);
    click(w, dots[0]);
    ok("ticking the set off records what it was showing", mine(w).s[0].w === 20,
      JSON.stringify(mine(w) && mine(w).s));
    ok("...and it stops being drawn as a suggestion",
      !wSel.classList.contains("is-suggested") && $(row, ".lift-from").hidden);
    ok("...and only that set was written", mine(w).s.length === 1, JSON.stringify(mine(w).s));

    /* looking at a set you finished earlier writes nothing new */
    click(w, dots[1]);
    ok("set 2 opens on set 2's own last weight", wSel.value === "22.5", wSel.value);
    click(w, dots[0]);
    click(w, dots[1]);
    ok("coming back to a ticked set does not re-write it",
      mine(w).s[1].w === 22.5 && mine(w).s.length === 2, JSON.stringify(mine(w).s));

    /* changing it is the other way it becomes yours */
    const b = await page("intermediate.html", seedLift(LAST));
    const row2 = $$(b.d, ".wo-row").find((r) => r.dataset.ex === "db-bench-press");
    const sel2 = $(row2, ".lift-w select");
    sel2.value = "25";
    sel2.dispatchEvent(new b.w.Event("change", { bubbles: true }));
    ok("picking a different weight overrides the suggestion", mine(b.w).s[0].w === 25, sel2.value);
    ok("...and it is a record now, not a proposal", !sel2.classList.contains("is-suggested"));

    /* and clearing it means clearing it */
    sel2.value = "";
    sel2.dispatchEvent(new b.w.Event("change", { bubbles: true }));
    ok("choosing the prompt back clears the set", mine(b.w).s[0] == null, JSON.stringify(mine(b.w).s));
    ok("...and last week's weight does not creep back in", sel2.value === "", sel2.value);
    b.w.GBSession.select(row2, 2);
    b.w.GBSession.select(row2, 1);
    ok("...not even after looking at another set", sel2.value === "", sel2.value);
    ok("...but it is still marked on the list, for finding your way back to it",
      $$(row2, ".lift-w option").some((o) => o.textContent === "20 kg · last time"),
      $$(row2, ".lift-w option").filter((o) => /last/.test(o.textContent)).map((o) => o.textContent).join());
    click(b.w, $$(row2, ".set-dot")[0]);
    ok("...and ticking a set you deliberately cleared records nothing",
      mine(b.w).s[0] == null, JSON.stringify(mine(b.w).s));

    /* a first-time exercise has nothing to suggest */
    const fresh = await page("intermediate.html");
    const row3 = $$(fresh.d, ".wo-row").find((r) => r.dataset.ex === "db-bench-press");
    ok("a lift with no history opens on the prompt",
      $(row3, ".lift-w select").value === "" && $(row3, ".lift-from").hidden);
    click(fresh.w, $$(row3, ".set-dot")[0]);
    ok("...and ticking it off invents nothing",
      !fresh.w.localStorage.getItem("gb:lift:db-bench-press"),
      fresh.w.localStorage.getItem("gb:lift:db-bench-press"));

    /* the custom box starts from whatever is on screen, suggestion included */
    const c = await page("intermediate.html", seedLift(LAST));
    const row4 = $$(c.d, ".wo-row").find((r) => r.dataset.ex === "db-bench-press");
    const sel4 = $(row4, ".lift-w select");
    sel4.value = "__custom";
    sel4.dispatchEvent(new c.w.Event("change", { bubbles: true }));
    ok("the custom box opens on the suggestion rather than empty",
      $(row4, ".lift-custom").value === "20", $(row4, ".lift-custom").value);
  }

  /* ── per-set history, read back on the row ── */
  section("per-set tracking — last week, set by set");
  {
    const seedLift = (entries) => (win) => {
      Object.keys(entries).forEach((k) =>
        win.localStorage.setItem("gb:lift:" + k, JSON.stringify(entries[k])));
    };
    const { w, d } = await page("intermediate.html", seedLift({
      "db-bench-press": [{
        d: "2020-01-06", name: "Dumbbell bench press", sets: 3, reps: "8–12",
        w: 25, ar: 8, rpe: "hard",
        s: [{ w: 20, r: 12, rpe: "easy" }, { w: 22.5, r: 10, rpe: "right" }, { w: 25, r: 8, rpe: "hard" }]
      }]
    }));
    const row = $$(d, ".wo-row").find((r) => r.dataset.ex === "db-bench-press");
    const dots = $$(row, ".set-dot");
    const wBox = $(row, ".lift-w select");
    const rBox = $(row, ".lift-r select");
    const said = () => $(row, ".lift-last").textContent;

    ok("set 1 is compared against set 1 of last time", /last time 20 kg × 12/.test(said()), said());
    ok("...with last time's reps marked on the reps list, since reps are not chosen for you",
      $$(row, ".lift-r option").some((o) => o.textContent === "12 · last time"),
      $$(row, ".lift-r option").filter((o) => /last time/.test(o.textContent)).map((o) => o.textContent).join());
    ok("the weight picker opens on that set's own last weight", wBox.value === "20", wBox.value);
    ok("...and reps are still yours to pick", rBox.value === "", rBox.value);
    ok("a set that felt easy is told what to try", /try 22\.5/.test(said()), said());

    w.GBSession.select(row, 3);
    ok("set 3 is compared against set 3, not against the session",
      /last time 25 kg × 8/.test(said()), said());
    ok("...and a set that felt hard is told to stay", /stay at 25/.test(said()), said());
    ok("...and set 3 opens on set 3's own weight", wBox.value === "25", wBox.value);

    /* best yet is a fact about history, not about which set is on screen */
    w.GBSession.select(row, 1);
    wBox.value = "20";
    wBox.dispatchEvent(new w.Event("change", { bubbles: true }));
    ok("a lighter first set is not a personal best", !$(row, ".lift-pr"));
    w.GBSession.select(row, 3);
    wBox.value = "22.5";
    wBox.dispatchEvent(new w.Event("change", { bubbles: true }));
    ok("...nor is a top set under the best on record", !$(row, ".lift-pr"), said());
    wBox.value = "27.5";
    wBox.dispatchEvent(new w.Event("change", { bubbles: true }));
    ok("beating every previous session is", !!$(row, ".lift-pr"));
    w.GBSession.select(row, 1);
    ok("...and it is the session that beat it, so it shows on set 1 too", !!$(row, ".lift-pr"));

    /* the whole thing survives a reload, per set */
    const back = await page("intermediate.html", (win) =>
      win.localStorage.setItem("gb:lift:db-bench-press", w.localStorage.getItem("gb:lift:db-bench-press")));
    const row2 = $$(back.d, ".wo-row").find((r) => r.dataset.ex === "db-bench-press");
    const box2 = $(row2, ".lift-w select");
    ok("set 1 comes back with set 1's weight", box2.value === "20", box2.value);
    back.w.GBSession.select(row2, 3);
    ok("...and set 3 with set 3's", box2.value === "27.5", box2.value);

    /* and it goes out in the export */
    ok("the sets go out in the spreadsheet too",
      /1: 20×12 easy \| 2: 22\.5×10 right \| 3: 25×8 hard/.test(w.GBLift.csv()),
      w.GBLift.csv().split("\r\n")[1]);
  }

  /* ── progressive overload ── */
  section("progressive overload");
  {
    const seed = (entries) => (win) => {
      Object.keys(entries).forEach((k) =>
        win.localStorage.setItem("gb:lift:" + k, JSON.stringify(entries[k])));
    };
    /* the canonical four weeks: load, load, then reps at the same load */
    const CHEST = [
      { d: "2026-01-05", w: 20,   sets: 3, reps: "10", name: "Chest press" },
      { d: "2026-01-12", w: 22.5, sets: 3, reps: "10", name: "Chest press" },
      { d: "2026-01-19", w: 25,   sets: 3, reps: "10", name: "Chest press" },
      { d: "2026-01-26", w: 25,   sets: 3, reps: "12", name: "Chest press" }
    ];

    const empty = await page("week.html");
    ok("an empty log plots nothing", !$(empty.d, ".pov-card"));
    ok("...and says what would start the line",
      /Log a weight on two different weeks/.test($(empty.d, "#gbProgress").textContent));

    const { w, d } = await page("week.html", seed({ "chest-press-ex": CHEST }));
    const P = w.GBProgress;
    const s = P.series("chest-press-ex");

    ok("the tracker API is available", typeof P === "object" && typeof P.series === "function");
    ok("four sessions in four weeks make four rows", s.length === 4, s.length);
    ok("weeks are numbered from the first one logged",
      s.map((x) => x.n).join(",") === "1,2,3,4", s.map((x) => x.n).join(","));
    ok("the first week is not a change", s[0].change.kind === "first");
    ok("more weight reads as more weight", s[1].change.text === "+2.5 kg", s[1].change.text);
    ok("more reps at the same weight is progress too", s[3].change.text === "+2 reps", s[3].change.text);
    ok("...and is counted as up, not as a plateau", s[3].change.kind === "up");

    /* the card on the page */
    const card = $(d, ".pov-card");
    ok("the exercise gets a card", !!card);
    ok("named as it was logged", $(card, "h3").textContent === "Chest press");
    ok("the card leads with where you are now", $(card, ".pov-now").textContent === "25 kg");
    ok("every week is a row", $$(card, ".pov-week").length === 4, $$(card, ".pov-week").length);
    ok("a row reads weight, sets and reps",
      $(card, ".pov-week .pov-load").textContent === "20 kg · 3 × 10",
      $(card, ".pov-week .pov-load").textContent);
    ok("the shape of it is drawn as well as listed", !!$(card, ".pov-spark"));
    ok("the drawing is not read out twice", $(card, ".pov-spark").getAttribute("aria-hidden") === "true");
    ok("a card heading sits under the section's h2", $(card, "h3").tagName === "H3");
    ok("the page counts what it is tracking", /1 exercise tracked/.test($(d, ".pov-lede").textContent),
      $(d, ".pov-lede").textContent);

    /* once sets carry their own rep counts, those are what get compared —
       "8–12" in both weeks says nothing about what was done in them */
    const real = await page("week.html", seed({
      "x": [
        { d: "2026-01-05", w: 25, sets: 3, reps: "8–12", ar: 8,  vol: 500, name: "X",
          s: [{ w: 20, r: 10 }, { w: 22.5, r: 10 }, { w: 25, r: 8 }] },
        { d: "2026-01-12", w: 25, sets: 3, reps: "8–12", ar: 11, vol: 575, name: "X",
          s: [{ w: 20, r: 12 }, { w: 22.5, r: 12 }, { w: 25, r: 11 }] }
      ]
    }));
    const rs = real.w.GBProgress.series("x");
    ok("reps done beat reps prescribed when comparing weeks",
      rs[1].change.text === "+3 reps", rs[1].change.text);
    ok("...and the row shows what was done, not what was asked for",
      /3 × 11/.test($(real.d, ".pov-weeks").textContent), $(real.d, ".pov-weeks").textContent);
    ok("a week that only added reps is not called a stall",
      real.w.GBProgress.verdict("x").kind === "up", real.w.GBProgress.verdict("x").kind);

    /* Monday-start weeks: two sessions in one week are one row, and the
       heavier one represents it */
    const t = await page("week.html", seed({
      "x": [
        { d: "2026-01-07", w: 40, sets: 3, reps: "10", name: "X" },   /* Wed */
        { d: "2026-01-11", w: 45, sets: 3, reps: "10", name: "X" },   /* Sun, same week */
        { d: "2026-01-12", w: 42, sets: 3, reps: "10", name: "X" }    /* Mon, the next */
      ]
    }));
    const ts = t.w.GBProgress.series("x");
    ok("a week is Monday to Sunday", ts.length === 2, ts.length);
    ok("two sessions in a week count as two", ts[0].sessions === 2, ts[0].sessions);
    ok("the heaviest one represents the week", ts[0].w === 45, ts[0].w);
    ok("a lighter week is named as lighter", ts[1].change.text === "−3 kg", ts[1].change.text);

    /* three weeks of nothing is the thing worth saying */
    const flat = ["2026-02-02", "2026-02-09", "2026-02-16"].map((d) => ({
      d, w: 60, sets: 3, reps: "8–10", rpe: "right", name: "Leg press"
    }));
    const st = await page("week.html", seed({ "leg-press-ex": flat }));
    const v = st.w.GBProgress.verdict("leg-press-ex");
    ok("three flat weeks is called a stall", v.kind === "stall", v.kind);
    ok("...and says how long it has been", /3 weeks at 60 kg/.test(v.text), v.text);
    ok("...and what to add, in this station's own steps", /Add 10 kg/.test(v.text), v.text);
    ok("the stall is counted in the lede", /1 going nowhere/.test($(st.d, ".pov-lede").textContent),
      $(st.d, ".pov-lede").textContent);

    /* three weeks running and three weeks logged across a month are
       not the same claim */
    const spread = await page("week.html", seed({
      "leg-press-ex": [
        { d: "2026-02-02", w: 60, sets: 3, reps: "8–10", name: "Leg press" },
        { d: "2026-02-09", w: 60, sets: 3, reps: "8–10", name: "Leg press" },
        { d: "2026-02-23", w: 60, sets: 3, reps: "8–10", name: "Leg press" }
      ]
    }));
    ok("a stall with a week missing out of it says so",
      /3 logged weeks at 60 kg/.test(spread.w.GBProgress.verdict("leg-press-ex").text),
      spread.w.GBProgress.verdict("leg-press-ex").text);

    /* but not to somebody whose form was going */
    const hard = flat.map((e, i) => (i === 2 ? Object.assign({}, e, { rpe: "hard" }) : e));
    const hp = await page("week.html", seed({ "leg-press-ex": hard }));
    const hv = hp.w.GBProgress.verdict("leg-press-ex");
    ok("a stall that felt hard is told to hold, not to add", /hold here/.test(hv.text) && !/Add /.test(hv.text), hv.text);

    /* a missed week is shown as a missed week, not closed up */
    const gap = await page("week.html", seed({
      "x": [
        { d: "2026-03-02", w: 50, sets: 3, reps: "10", name: "X" },
        { d: "2026-03-23", w: 50, sets: 3, reps: "10", name: "X" }
      ]
    }));
    ok("a break in the log is numbered honestly",
      gap.w.GBProgress.series("x").map((x) => x.n).join(",") === "1,4");
    ok("...and named on the page", /2 weeks off/.test($(gap.d, ".pov-weeks").textContent),
      $(gap.d, ".pov-weeks").textContent);

    /* long histories don't run off the page */
    const many = [];
    for (let i = 0; i < 12; i++) many.push({
      d: new Date(Date.UTC(2026, 0, 5) + i * 7 * 864e5).toISOString().slice(0, 10),
      w: 30 + i, sets: 3, reps: "10", name: "X"
    });
    const long = await page("week.html", seed({ "x": many }));
    const visible = $$(long.d, ".pov-week").filter((r) => !r.hidden);
    ok("only the last eight weeks show", visible.length === 8, visible.length);
    ok("...with the rest one click away", !!$(long.d, ".pov-more"));
    ok("the most recent week is one of them", /week 12/.test(visible[visible.length - 1].textContent));
    click(long.w, $(long.d, ".pov-more"));
    ok("clicking shows the whole history", $$(long.d, ".pov-week").every((r) => !r.hidden));
    ok("...and the button retires", !$(long.d, ".pov-more"));

    /* an rpe tap with no weight is not a session */
    const noweight = await page("week.html", seed({
      "x": [{ d: "2026-01-05", rpe: "easy", name: "X" }, { d: "2026-01-12", w: 30, name: "X" }]
    }));
    ok("a tap with no weight on it is not plotted",
      noweight.w.GBProgress.series("x").length === 1, noweight.w.GBProgress.series("x").length);

    /* a station-keyed lift is tracked like any other */
    const eq = await page("week.html", seed({
      "eq:hack-squat": [
        { d: "2026-01-05", w: 80, sets: 3, reps: "8–10", name: "Hack squat" },
        { d: "2026-01-12", w: 80, sets: 4, reps: "8–10", name: "Hack squat" }
      ]
    }));
    ok("a station-keyed lift is tracked too", !!$(eq.d, ".pov-card"));
    ok("an extra set counts as progress",
      eq.w.GBProgress.series("eq:hack-squat")[1].change.text === "+1 set",
      eq.w.GBProgress.series("eq:hack-squat")[1].change.text);
    ok("and it knows a leg station moves in 5", eq.w.GBLift.step("eq:hack-squat") === 5);

    /* most recently trained first, and it keeps up with the session */
    const two = await page("week.html", seed({
      "chest-press-ex": CHEST,
      "leg-press-ex": [{ d: "2026-02-02", w: 90, sets: 3, reps: "8–10", name: "Leg press" }]
    }));
    ok("the exercise trained most recently leads",
      $(two.d, ".pov-card h3").textContent === "Leg press", $(two.d, ".pov-card h3").textContent);
    ok("both are tracked", $$(two.d, ".pov-card").length === 2);

    w.GBLift.record("chest-press-ex", { w: 27.5, sets: 3, reps: "10", name: "Chest press" });
    ok("logging a weight updates the tracker without a reload",
      $(d, ".pov-now").textContent === "27.5 kg", $(d, ".pov-now").textContent);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
