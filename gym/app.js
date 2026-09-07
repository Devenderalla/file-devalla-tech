/* ═══════════════════════════════════════════════════════════
   Gym Basics — shared behaviour
   Progressive enhancement: every page renders its core static
   content without JS; the libraries and builder need it.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var GB = window.GB || null;
  var GBP = window.GBPlan || null;   /* selection + week engine */
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  /* ── offline ──
     Lives here rather than in session.js because app.js is the one
     script every page loads. It used to sit in session.js, which meant
     nutrition.html never registered the worker at all, and which kept
     the whole live-session layer on the critical path of the homepage
     purely to run these four lines. */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  /* ── build stamp ──
     Which build is this phone actually running? After an update the old
     worker still serves its cached copy for a load or two, so the footer
     names the build that answered. The controlling worker is asked first;
     a worker older than that message cannot reply, so the cache it left
     behind is read instead — which is exactly the "you are still on the
     old one" case worth seeing. */
  var legal = $(".foot-legal");
  if (legal) {
    var tag = document.createElement("span");
    tag.className = "build-stamp";
    legal.appendChild(tag);

    var told = false;
    var say = function (text) { told = true; tag.textContent = " · " + text; };

    if (!("serviceWorker" in navigator) || location.protocol === "file:") {
      say("no offline copy");
    } else {
      var sw = navigator.serviceWorker;
      var ask = function () {
        if (sw.controller) sw.controller.postMessage("version");
      };
      sw.addEventListener("message", function (e) {
        if (e.data && e.data.build) say("build " + e.data.build);
      });
      sw.addEventListener("controllerchange", ask);
      ask();

      setTimeout(function () {
        if (told || !window.caches) return;
        caches.keys().then(function (keys) {
          var shell = keys.filter(function (k) { return /-shell$/.test(k); })[0];
          say(shell ? "build " + shell.replace(/-shell$/, "") : "offline copy installing");
        }).catch(function () {});
      }, 1200);
    }
  }

  /* ── mobile nav ── */
  var toggle = $(".nav-toggle"), nav = $(".head-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ── scroll reveal ── */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ── photo fallback: swap a missing image for a typographic tile ── */
  function armFallbacks(scope) {
    $$(".ph img", scope).forEach(function (img) {
      if (img.dataset.armed) return;
      img.dataset.armed = "1";
      img.addEventListener("error", function () {
        var tile = document.createElement("div");
        tile.className = "ph-fallback";
        tile.innerHTML = "<span></span>";
        tile.firstChild.textContent = img.dataset.name || img.alt || "Gym Basics";
        img.replaceWith(tile);
      });
      if (img.complete && img.naturalWidth === 0 && img.src) {
        img.dispatchEvent(new Event("error"));
      }
    });
  }
  armFallbacks(document);

  /* All 30 stations carry a photo as of 2026-08-14, but `img: null` stays
     supported: a station without one renders its tile straight away rather
     than requesting a file that was never there and waiting for the 404 —
     same markup the fallback above produces. */
  function phot(e, ratio) {
    var box = '<div class="ph ph-' + (ratio || "3x2") + '">';
    if (!e.img) return box + '<div class="ph-fallback"><span>' + esc(e.name) + "</span></div></div>";
    return box + '<img loading="lazy" src="' + esc(e.img) + '" alt="' + esc(e.name) +
      '" data-name="' + esc(e.name) + '"></div>';
  }

  /* ── floor map jump (guide page) ── */
  $$(".fm-m").forEach(function (m) {
    m.setAttribute("tabindex", "0");
    m.setAttribute("role", "link");
    var go = function () {
      var t = document.getElementById(m.dataset.go);
      if (t) { t.scrollIntoView({ behavior: "smooth", block: "start" }); t.classList.add("open"); }
    };
    m.addEventListener("click", go);
    m.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });

  /* ── helpers ── */
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }
  var LV_LABEL = { 1: "Beginner", 2: "Intermediate", 3: "Advanced" };
  var LV_TAG = { 1: "tag-beg", 2: "tag-int", 3: "tag-adv" };
  var KIT_LABEL = { machine: "Machine", cable: "Cable", dumbbell: "Dumbbells", barbell: "Barbell", kettlebell: "Kettlebell", bodyweight: "Bodyweight", cardio: "Cardio" };

  function rxText(rx) {
    if (!rx) return "";
    if (rx.time) return rx.time;
    return rx.sets + " × " + rx.reps + (rx.rest ? " · rest " + rx.rest + "s" : "");
  }
  function bestRx(ex, lv) {
    return GBP.bestRx(ex, lv);
  }

  /* ═══ equipment library ═══ */
  var eqGrid = $("#eqGrid");
  if (eqGrid && GB) {
    var eqState = { q: "", cat: param("cat") || "all", muscle: param("muscle") || "all" };

    function eqCard(e) {
      var card = el(
        '<article class="eq-card" id="eq-' + esc(e.id) + '" data-eq="' + esc(e.id) + '">' +
          phot(e) +
          '<div class="eq-body">' +
            '<div class="eq-top"><span class="eq-cat">' + esc(GB.CATS[e.cat]) + "</span></div>" +
            "<h2>" + esc(e.name) + "</h2>" +
            '<p class="eq-what">' + esc(e.what) + "</p>" +
            '<div class="eq-muscles">' + e.muscles.map(function (m) { return "<span>" + esc(GB.MUSCLE_LABEL[m]) + "</span>"; }).join("") + "</div>" +
            '<button class="eq-more" type="button" aria-expanded="false">How to use it</button>' +
          "</div>" +
          '<div class="eq-detail">' +
            "<h3>Primary muscles</h3><p>" + esc(e.musclesText) + "</p>" +
            "<h3>How to use it</h3><p>" + esc(e.how) + "</p>" +
            "<h3>By level</h3>" +
            '<div class="lv b"><i></i><p><b>Beginner start:</b> ' + esc(e.beg) + "</p></div>" +
            '<div class="lv i"><i></i><p><b>Intermediate:</b> ' + esc(e.int) + "</p></div>" +
            '<div class="lv a"><i></i><p><b>Advanced:</b> ' + esc(e.adv) + "</p></div>" +
            '<div class="mistake"><span>Common mistake</span>' + esc(e.mistake) + "</div>" +
          "</div>" +
        "</article>"
      );
      var btn = $(".eq-more", card);
      btn.addEventListener("click", function () {
        var open = card.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      return card;
    }

    function renderEq() {
      eqGrid.innerHTML = "";
      var q = eqState.q.toLowerCase();
      var shown = 0;
      GB.EQUIPMENT.forEach(function (e) {
        if (eqState.cat !== "all" && e.cat !== eqState.cat) return;
        if (eqState.muscle !== "all" && e.muscles.indexOf(eqState.muscle) === -1) return;
        if (q && (e.name + " " + e.what + " " + e.musclesText).toLowerCase().indexOf(q) === -1) return;
        eqGrid.appendChild(eqCard(e));
        shown++;
      });
      var note = $("#eqCount");
      if (note) note.textContent = shown + " of " + GB.EQUIPMENT.length + " stations";
      if (!shown) {
        eqGrid.appendChild(el('<div class="empty-note"><b>Nothing matches that combination.</b><br>Clear a filter or try a different word — “press”, “row”, “squat”.</div>'));
      }
      armFallbacks(eqGrid);
      /* The grid was just rebuilt from scratch, so every enhancement hung
         off these cards went with the old nodes. demo.js, plates.js and
         lift.js all listen for this; nothing was dispatching it, which is
         why the plate calculator disappeared the first time anybody used
         a filter. */
      eqGrid.dispatchEvent(new CustomEvent("gb:rows", { bubbles: true }));
    }

    var eqSearch = $("#eqSearch");
    if (eqSearch) eqSearch.addEventListener("input", function () { eqState.q = eqSearch.value; renderEq(); });
    $$("[data-eq-cat]").forEach(function (c) {
      c.addEventListener("click", function () {
        eqState.cat = c.dataset.eqCat;
        $$("[data-eq-cat]").forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
        renderEq();
      });
      if (c.dataset.eqCat === eqState.cat) c.setAttribute("aria-pressed", "true");
    });
    $$("[data-eq-muscle]").forEach(function (c) {
      c.addEventListener("click", function () {
        eqState.muscle = c.dataset.eqMuscle;
        $$("[data-eq-muscle]").forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
        renderEq();
      });
      if (c.dataset.eqMuscle === eqState.muscle) c.setAttribute("aria-pressed", "true");
    });
    renderEq();
    /* deep link: equipment.html#eq-leg-press opens that card */
    if (location.hash) {
      var target = $(location.hash.replace(/[^#\w-]/g, ""));
      if (target) { target.classList.add("open"); target.scrollIntoView(); }
    }
  }

  /* ═══ exercise library ═══ */
  var exGrid = $("#exGrid");
  if (exGrid && GB && GBP) {
    var exState = { q: "", muscle: param("muscle") || "all", level: param("level") || "all", kit: "all" };

    function exCard(x) {
      var lv = exState.level === "all" ? x.level : Math.max(x.level, +exState.level);
      var rx = bestRx(x, exState.level === "all" ? x.level : +exState.level);
      var card = el(
        '<article class="ex-card" data-ex="' + esc(x.id) + '"' +
          (x.eq ? ' data-eq="' + esc(x.eq) + '"' : "") + ">" +
          '<div class="ex-head">' +
            "<div><h2>" + esc(x.name) + "</h2>" +
              '<div class="ex-meta">' +
                "<span><b>" + esc(x.musclesText) + "</b></span>" +
                "<span>" + esc(KIT_LABEL[x.kit]) + "</span>" +
                '<span class="tag ' + LV_TAG[x.level] + '">' + LV_LABEL[x.level] + "+</span>" +
              "</div></div>" +
            '<span class="ex-rx">' + esc(rxText(rx)) + "</span>" +
          "</div>" +
          '<div class="ex-actions">' +
            '<button class="ex-toggle" type="button" aria-expanded="false">Full instructions</button>' +
          "</div>" +
          '<div class="ex-detail">' +
            '<div class="ex-grid-2"><div>' +
              "<h3>Starting position</h3><p>" + esc(x.position) + "</p>" +
              "<h3>Movement</h3><p>" + esc(x.movement) + "</p>" +
              "<h3>Breathing</h3><p>" + esc(x.breathing) + "</p>" +
              "<h3>Form cue</h3><p>" + esc(x.cue) + "</p>" +
            "</div><div>" +
              "<h3>Common mistakes</h3><ul>" + x.mistakes.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>" +
              "<h3>Beginner version</h3><p>" + esc(x.var1) + "</p>" +
              "<h3>Intermediate</h3><p>" + esc(x.var2) + "</p>" +
              "<h3>Advanced</h3><p>" + esc(x.var3) + "</p>" +
              "<h3>Safety</h3><p>" + esc(x.safety) + "</p>" +
            "</div></div>" +
            (x.eq && GB.EQ_BY_ID[x.eq] ? '<p style="margin-top:12px"><a href="equipment.html#eq-' + esc(x.eq) + '">Equipment guide: ' + esc(GB.EQ_BY_ID[x.eq].name) + " →</a></p>" : "") +
          "</div>" +
        "</article>"
      );
      var btn = $(".ex-toggle", card);
      btn.addEventListener("click", function () {
        var open = card.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      return card;
    }

    function renderEx() {
      exGrid.innerHTML = "";
      var q = exState.q.toLowerCase();
      var shown = 0;
      GB.EXERCISES.forEach(function (x) {
        if (x.role === "warmup" || x.role === "cooldown") return; /* programme furniture, not library entries */
        if (exState.muscle !== "all" && x.muscle !== exState.muscle) return;
        if (exState.level !== "all" && x.level > +exState.level) return;
        if (exState.kit !== "all" && x.kit !== exState.kit) return;
        if (q && (x.name + " " + x.musclesText + " " + KIT_LABEL[x.kit]).toLowerCase().indexOf(q) === -1) return;
        exGrid.appendChild(exCard(x));
        shown++;
      });
      var note = $("#exCount");
      if (note) note.textContent = shown + " exercises";
      if (!shown) {
        exGrid.appendChild(el('<div class="empty-note"><b>Nothing matches that combination.</b><br>Clear a filter — level filters hide exercises above your pick.</div>'));
      }
      /* same again: re-rendered cards need re-arming */
      exGrid.dispatchEvent(new CustomEvent("gb:rows", { bubbles: true }));
    }

    var exSearch = $("#exSearch");
    if (exSearch) exSearch.addEventListener("input", function () { exState.q = exSearch.value; renderEx(); });
    [["exMuscle", "muscle"], ["exLevel", "level"], ["exKit", "kit"]].forEach(function (pair) {
      $$("[data-" + pair[0].replace(/[A-Z]/g, function (c) { return "-" + c.toLowerCase(); }) + "]").forEach(function (c) {
        var val = c.dataset[pair[0]];
        c.addEventListener("click", function () {
          exState[pair[1]] = val;
          $$("[data-" + pair[0].replace(/[A-Z]/g, function (ch) { return "-" + ch.toLowerCase(); }) + "]").forEach(function (x) {
            x.setAttribute("aria-pressed", x === c ? "true" : "false");
          });
          renderEx();
        });
        if (val === exState[pair[1]]) c.setAttribute("aria-pressed", "true");
      });
    });
    renderEx();
  }

  /* ═══ homepage: equipment showcase ═══ */
  var homeEquip = $("#homeEquip");
  if (homeEquip && GB) {
    var picks = ["treadmill", "leg-press", "lat-pulldown", "cable-crossover", "dumbbells", "squat-rack", "rower", "smith-machine"];
    picks.forEach(function (id) {
      var e = GB.EQ_BY_ID[id];
      if (!e) return;
      homeEquip.appendChild(el(
        '<a class="card-link eq-card" href="equipment.html#eq-' + esc(e.id) + '">' +
          phot(e) +
          '<div class="eq-body"><div class="eq-top"><span class="eq-cat">' + esc(GB.CATS[e.cat]) + "</span></div>" +
          "<h3>" + esc(e.name) + "</h3>" +
          '<p class="eq-what">' + esc(e.what) + "</p></div>" +
        "</a>"
      ));
    });
    armFallbacks(homeEquip);
  }

  /* ═══ workout builder ═══ */
  var buildBtn = $("#buildBtn");
  if (buildBtn && GB && GBP) {
    var B = {
      level: +(param("level") || 1),
      goal: param("goal") || "muscle",
      muscles: ["full"],
      duration: 45,
      kit: "full"
    };
    /* wire segmented controls */
    function wireSeg(attr, apply) {
      $$("[data-" + attr + "]").forEach(function (b) {
        b.addEventListener("click", function () {
          apply(b.dataset[attr.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })], b);
        });
      });
    }
    function pressOnly(attr, btn) {
      $$("[data-" + attr + "]").forEach(function (x) { x.setAttribute("aria-pressed", x === btn ? "true" : "false"); });
    }
    wireSeg("b-level", function (v, b) { B.level = +v; pressOnly("b-level", b); });
    wireSeg("b-goal", function (v, b) { B.goal = v; pressOnly("b-goal", b); });
    wireSeg("b-duration", function (v, b) { B.duration = +v; pressOnly("b-duration", b); });
    wireSeg("b-kit", function (v, b) { B.kit = v; pressOnly("b-kit", b); });
    /* muscles: multi-select; "full" is exclusive */
    $$("[data-b-muscle]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.dataset.bMuscle;
        if (v === "full") { B.muscles = ["full"]; }
        else {
          var i = B.muscles.indexOf(v);
          if (i > -1) B.muscles.splice(i, 1); else B.muscles.push(v);
          B.muscles = B.muscles.filter(function (m) { return m !== "full"; });
          if (!B.muscles.length) B.muscles = ["full"];
        }
        $$("[data-b-muscle]").forEach(function (x) {
          x.setAttribute("aria-pressed", B.muscles.indexOf(x.dataset.bMuscle) > -1 ? "true" : "false");
        });
      });
    });
    /* set initial pressed states from defaults / URL params */
    $$("[data-b-level]").forEach(function (b) { b.setAttribute("aria-pressed", +b.dataset.bLevel === B.level ? "true" : "false"); });
    $$("[data-b-goal]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.bGoal === B.goal ? "true" : "false"); });
    $$("[data-b-duration]").forEach(function (b) { b.setAttribute("aria-pressed", +b.dataset.bDuration === B.duration ? "true" : "false"); });
    $$("[data-b-kit]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.bKit === B.kit ? "true" : "false"); });
    $$("[data-b-muscle]").forEach(function (b) { b.setAttribute("aria-pressed", B.muscles.indexOf(b.dataset.bMuscle) > -1 ? "true" : "false"); });

    /* structure, selection and goal shaping all live in plan.js so the
       weekly planner runs the same engine instead of a second copy */
    var STRUCT = GBP.STRUCT;
    function goalRx(ex, role) { return GBP.rx(ex, B.level, B.goal, role); }
    function pickExercises(role, count, used, usedMuscles) {
      return GBP.pick(role, count, {
        level: B.level, goal: B.goal, kit: B.kit, muscles: B.muscles,
        used: used, usedMuscles: usedMuscles
      });
    }

    function woRow(i, name, sub, target, rx, restNote, ex) {
      return '<div class="wo-row"' +
        (ex ? ' data-ex="' + esc(ex.id) + '"' + (ex.eq ? ' data-eq="' + esc(ex.eq) + '"' : "") : "") + ">" +
        '<span class="wo-idx">' + (i < 10 ? "0" + i : i) + "</span>" +
        '<span class="wo-name">' + esc(name) + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span>" +
        '<span class="wo-target">' + esc(target || "") + "</span>" +
        '<span class="wo-rx">' + esc(rx) + (restNote ? "<small>" + esc(restNote) + "</small>" : "") + "</span>" +
      "</div>";
    }

    buildBtn.addEventListener("click", function () {
      var st = STRUCT[B.duration];
      var used = [], usedMuscles = [];
      var mains = pickExercises("main", st.main, used, usedMuscles);
      /* muscle picks with no compound lifts (e.g. arms only): promote accessories */
      if (mains.length < st.main) {
        mains = mains.concat(pickExercises("accessory", st.main - mains.length, used, usedMuscles));
      }
      var accs = pickExercises("accessory", st.acc, used, usedMuscles.slice());
      var cores = pickExercises("core", st.core, used, []);
      var conds = (B.goal === "fatloss" || B.goal === "endurance" || B.goal === "fitness") && st.cond
        ? pickExercises("conditioning", st.cond, used, []) : [];

      var out = $("#builderOut");
      var muscleText = B.muscles.indexOf("full") > -1 ? "Full body"
        : B.muscles.map(function (m) { return GB.MUSCLE_LABEL[m]; }).join(" + ");
      var warmCardio = B.kit === "dumbbells"
        ? "March on the spot, arm circles, hip hinges and 10 slow bodyweight squats"
        : "Easy cardio — treadmill walk, bike or rower at a conversational pace";

      var n = 0;
      var html =
        '<div class="plan-head"><h2>' + esc(muscleText) + " · " + B.duration + " min</h2>" +
          '<span class="mono">' + esc(LV_LABEL[B.level]) + " · " + esc(GB.GOALS[B.goal]) + "</span></div>" +
        '<div class="plan-body">' +
        '<p class="plan-phase-label">Phase 1 · Warm-up — about ' + (B.duration >= 60 ? 10 : 5) + " min</p><div class=\"wo\">" +
          woRow(++n, "General warm-up", warmCardio, "Whole body", (B.duration >= 60 ? "8–10 min" : "5 min")) +
          woRow(++n, "Movement prep", "Arm circles, hip circles, and one light practice set of your first exercise", "Joints and patterns", "2–3 min") +
        "</div>";

      function section(label, list, role) {
        if (!list.length) return "";
        var s = '<p class="plan-phase-label">' + label + "</p><div class=\"wo\">";
        list.forEach(function (x) {
          var rx = goalRx(x, role);
          s += woRow(++n, x.name, KIT_LABEL[x.kit], x.musclesText, rx.time ? rx.time : rx.sets + " × " + rx.reps, rx.rest ? "rest " + rx.rest + "s" : "", x);
        });
        return s + "</div>";
      }
      html += section("Phase 2 · Main work", mains, "main");
      html += section("Phase 3 · Accessory work", accs, "accessory");
      html += section("Phase 4 · Core", cores, "core");
      html += section("Phase 5 · Conditioning", conds, "conditioning");
      html +=
        '<p class="plan-phase-label">Phase ' + (5 + (conds.length ? 1 : 0) - (accs.length ? 0 : 1)) + " · Cool-down — 5 min</p><div class=\"wo\">" +
        woRow(++n, "Easy movement", "Slow walk or easy pedal until breathing settles", "Recovery", "2–3 min") +
        woRow(++n, "Stretch what you trained", "30 seconds per muscle, no bouncing", "Trained muscles", "2–3 min") +
        "</div>" +
        '<div style="padding:16px 24px"><p style="font-size:14.5px;color:var(--ink-3)">Weights: the lightest that allows every listed rep with control — the last two should feel like work. ' +
        (B.level === 1 ? "As a beginner, stop every set two reps before failure and add weight only when all sets feel smooth." :
         B.level === 2 ? "Add a small amount of weight when you hit the top of a rep range on every set." :
         "Push main lifts close to failure on the final set only; accessories can go closer.") + "</p></div></div>";

      out.innerHTML = html;
      out.hidden = false;
      /* let session.js hang set check-off and rest timers off the new plan */
      out.dispatchEvent(new CustomEvent("gb:plan", { bubbles: true }));
      if (out.scrollIntoView) out.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ═══ mark current page in nav ═══ */
  var here = location.pathname.split("/").pop() || "index.html";
  $$(".head-nav a").forEach(function (a) {
    if (a.getAttribute("href") === here) a.setAttribute("aria-current", "page");
  });
})();
