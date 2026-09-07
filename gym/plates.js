/* ═══════════════════════════════════════════════════════════
   Gym Basics — plate calculator
   What to actually hang on the bar.

   lift.js put a kg box on every row. On a machine the number
   in it is the number on the stack and there is nothing to
   work out. On a barbell it isn't: 80 kg is a 20 kg bar and
   30 kg a side, and a beginner standing at the rack doing that
   arithmetic while somebody waits is a beginner who loads it
   wrong or picks a rounder number than they meant to.

   So the breakdown appears under the box the moment a weight
   is entered, on barbell rows only. A "25, 5 a side" hint on a
   leg press would be a guess dressed up as a fact.

   Enhancement over lift.js, in the same way lift.js is an
   enhancement over session.js. Nothing leaves the device.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var GB = window.GB;

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  var BAR_KEY = "gb:bar";

  /* What data.js already tells people is on the rack: "1.25 to 25 kg
     discs". The calculator is not allowed to know about plates the
     equipment library doesn't. */
  var PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

  /* 20 kg is the Olympic bar every one of these programmes assumes.
     The rest are here because plenty of gyms have them and a woman
     handed a 15 kg bar should not be told she is lifting 5 kg more
     than she is. */
  var BARS = [
    { kg: 20, label: "20 kg — standard Olympic bar" },
    { kg: 15, label: "15 kg — women's bar" },
    { kg: 10, label: "10 kg — technique bar" },
    { kg: 7.5, label: "7.5 kg — EZ curl bar" }
  ];

  /* Stations where the number on the row is a bar plus discs.
     Smith machines are deliberately missing: the carriage is
     counterweighted, no two are the same, and a breakdown would be
     a confident guess. Plate-loaded leg presses and hack squats are
     missing for the same reason — the sled has a weight nobody
     publishes. */
  var BARBELL_EQ = ["barbell", "power-rack", "squat-rack"];

  function load(k, f) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? f : v; } catch (e) { return f; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function barWeight() {
    var v = load(BAR_KEY, 20);
    return typeof v === "number" && v > 0 && v < 100 ? v : 20;
  }
  function setBar(kg) {
    save(BAR_KEY, kg);
    document.dispatchEvent(new CustomEvent("gb:bar", { detail: { kg: kg } }));
  }

  /* 62.50 → "62.5", 60.0 → "60" */
  function num(n) { return String(Math.round(n * 100) / 100); }

  /* ── the arithmetic ──
     Greedy off the heaviest disc down, which is also how anybody
     loads a bar by hand. Returns what is left over rather than
     rounding it away — a bar that cannot make 61 kg should say so,
     not quietly claim 60. */
  function solve(total, bar) {
    if (!(total > 0)) return null;
    bar = bar || barWeight();
    if (total < bar - 0.001) return { bar: bar, under: true };

    var rem = (total - bar) / 2;
    var picked = [];
    PLATES.forEach(function (p) {
      var n = Math.floor((rem + 1e-6) / p);
      if (n > 0) { picked.push({ kg: p, n: n }); rem -= n * p; }
    });
    return { bar: bar, total: total, picked: picked, perSide: (total - bar) / 2, short: rem * 2 };
  }

  /* "bar + 25, 5 a side" — gym-speak, not a table */
  function phrase(r) {
    if (!r) return "";
    if (r.under) return "lighter than the " + num(r.bar) + " kg bar";
    if (!r.picked.length) return "just the " + num(r.bar) + " kg bar";
    var discs = r.picked.map(function (p) {
      return (p.n > 1 ? p.n + "×" : "") + num(p.kg);
    }).join(", ");
    var out = num(r.bar) + " kg bar + " + discs + " a side";
    if (r.short > 0.01) out += " · " + num(r.short) + " kg short";
    return out;
  }

  /* ── which rows get one ── */

  function isBarbellRow(row) {
    if (!GB) return false;
    var exId = row.dataset.ex;
    var ex = exId && GB.EX_BY_ID && GB.EX_BY_ID[exId];
    if (ex) return ex.kit === "barbell";
    var eq = row.dataset.eq;
    return !!eq && BARBELL_EQ.indexOf(eq) > -1;
  }

  function armRow(row) {
    if (row.dataset.gbPlates) return;
    if (!isBarbellRow(row)) return;

    /* lift.js owns the weight control — a dropdown of what this
       station can actually make, with a custom box behind it. No
       control, nothing to annotate, and no reason to build one. */
    var wrap = $(".lift", row);
    var input = wrap && $(".lift-w select, .lift-w input", wrap);
    if (!input) return;

    row.dataset.gbPlates = "1";

    var hint = document.createElement("span");
    hint.className = "plate-hint";
    wrap.appendChild(hint);

    function paint() {
      var v = parseFloat(input.value || input.placeholder || "");
      var r = (v > 0) ? solve(v, barWeight()) : null;
      if (!r) { hint.textContent = ""; hint.hidden = true; return; }
      hint.hidden = false;
      hint.textContent = phrase(r);
      hint.classList.toggle("is-short", !!(r.short > 0.01) || !!r.under);
    }

    input.addEventListener("input", paint);
    input.addEventListener("change", paint);
    document.addEventListener("gb:bar", paint);
    paint();
  }

  function arm(scope) {
    $$(".wo-row", scope || document).forEach(armRow);
    if (scope && scope.classList && scope.classList.contains("wo-row")) armRow(scope);
  }

  /* ── the standalone tool ──
     Lives in the "Weight plates" card in the equipment library,
     which is where somebody who doesn't yet know what a 20 kg bar
     weighs is already standing. */
  function buildTool() {
    var card = $('.eq-card[data-eq="plates"]');
    if (!card || card.dataset.gbTool) return;
    var detail = $(".eq-detail", card);
    if (!detail) return;
    card.dataset.gbTool = "1";

    var box = document.createElement("div");
    box.className = "plate-tool";
    box.innerHTML =
      "<h3>What goes on the bar</h3>" +
      '<div class="pt-row">' +
        '<label class="pt-field"><span>Weight you want</span>' +
          '<span class="pt-input"><input type="number" id="ptTotal" inputmode="decimal" step="0.5" min="0" max="500" placeholder="80"><span>kg</span></span>' +
        "</label>" +
        '<label class="pt-field"><span>Bar</span>' +
          '<select id="ptBar">' +
            BARS.map(function (b) {
              return '<option value="' + b.kg + '">' + b.label + "</option>";
            }).join("") +
          "</select>" +
        "</label>" +
      "</div>" +
      '<p class="pt-out" id="ptOut" aria-live="polite"></p>' +
      '<p class="pt-note">Plates go on in pairs, so this is one side. The bar setting is remembered and ' +
      "the same breakdown appears under the weight box on every barbell row in a workout.</p>";
    detail.appendChild(box);

    var total = $("#ptTotal", box);
    var bar = $("#ptBar", box);
    var out = $("#ptOut", box);
    bar.value = String(barWeight());

    function paint() {
      var v = parseFloat(total.value);
      if (!(v > 0)) { out.textContent = "Enter a weight and this says what to hang on each end."; out.className = "pt-out"; return; }
      var r = solve(v, parseFloat(bar.value));
      out.textContent = phrase(r);
      out.className = "pt-out" + ((r.short > 0.01 || r.under) ? " is-short" : "");
    }
    total.addEventListener("input", paint);
    bar.addEventListener("change", function () {
      setBar(parseFloat(bar.value));
      paint();
    });
    paint();
  }

  arm(document);
  buildTool();
  document.addEventListener("gb:plan", function (e) { arm(e.target || document); });
  document.addEventListener("gb:rows", function (e) { arm(e.target || document); buildTool(); });

  window.GBPlates = {
    solve: solve, phrase: phrase, arm: arm,
    barWeight: barWeight, setBar: setBar,
    PLATES: PLATES, BARS: BARS, BAR_KEY: BAR_KEY
  };
})();
