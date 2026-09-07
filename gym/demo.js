/* ═══════════════════════════════════════════════════════════
   Gym Basics — equipment demos
   A short silent clip plus the numbered steps, opened from a
   workout row without leaving the workout.

   Nothing renders until a station actually has a clip: the
   button is added only for entries with a `video` in data.js,
   so the site looks unchanged until you drop an MP4 into vid/
   and each one lights up on its own.

   Video is poster-first — `preload="none"` with the existing
   photo as the poster — so a library of 30 demos costs zero
   bytes on load.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var GB = window.GB;
  if (!GB) return;

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function stationFor(node) {
    var id = node.dataset.eq || node.dataset.demo;
    if (id && GB.EQ_BY_ID[id]) return GB.EQ_BY_ID[id];
    /* a row may name an exercise instead; follow it to its station */
    var ex = node.dataset.ex && GB.EX_BY_ID[node.dataset.ex];
    if (ex && ex.eq && GB.EQ_BY_ID[ex.eq]) return GB.EQ_BY_ID[ex.eq];
    return null;
  }
  function hasClip(st) { return !!(st && st.video && st.video.src); }

  /* ── the panel ── */
  var dlg, vid, reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function build() {
    if (dlg) return;
    dlg = document.createElement("dialog");
    dlg.className = "demo-dlg";
    dlg.innerHTML =
      '<form method="dialog" class="demo-close-form">' +
        '<button class="demo-close" aria-label="Close demonstration">✕</button>' +
      "</form>" +
      '<div class="demo-stage">' +
        '<video class="demo-video" muted loop playsinline preload="none"></video>' +
        '<p class="demo-cue" aria-hidden="true"></p>' +
      "</div>" +
      '<div class="demo-body">' +
        '<span class="demo-eyebrow"></span>' +
        "<h3></h3>" +
        '<ol class="demo-steps"></ol>' +
        '<p class="demo-rx"></p>' +
        '<div class="mistake demo-mistake"><span>Common mistake</span><b></b></div>' +
        '<a class="demo-more" href="#">Full equipment guide →</a>' +
      "</div>";
    document.body.appendChild(dlg);
    vid = $(".demo-video", dlg);

    /* cues are HTML over the frame, not burned into it — editable without
       re-encoding, and they scale and stay selectable */
    vid.addEventListener("timeupdate", function () {
      var cue = $(".demo-cue", dlg);
      var segs = vid.dataset.segments ? JSON.parse(vid.dataset.segments) : null;
      if (!segs) return;
      var t = vid.currentTime, text = "";
      for (var i = 0; i < segs.length; i++) if (t >= segs[i][0]) text = segs[i][1];
      cue.textContent = text;
    });
    dlg.addEventListener("close", function () {
      try { vid.pause(); vid.removeAttribute("src"); vid.load(); } catch (e) {}
    });
    /* click the backdrop to dismiss */
    dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
  }

  function close() {
    if (!dlg) return;
    if (dlg.close) dlg.close();
    else { dlg.removeAttribute("open"); dlg.dispatchEvent(new CustomEvent("close")); }
  }

  function open(st) {
    build();
    var sec = (st.video && st.video.sec) || 10;
    $(".demo-eyebrow", dlg).textContent = GB.CATS[st.cat] + " · " + sec + " second demonstration";
    $("h3", dlg).textContent = st.name;
    $(".demo-steps", dlg).innerHTML = (st.steps || [])
      .map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    $(".demo-rx", dlg).innerHTML = "<b>Beginner:</b> " + esc(st.beg);
    $(".demo-mistake b", dlg).textContent = st.mistake;
    $(".demo-more", dlg).href = "equipment.html#eq-" + st.id;

    if (st.img) vid.poster = st.img; else vid.removeAttribute("poster");
    vid.src = st.video.src;
    /* setup · movement · the thing people get wrong */
    vid.dataset.segments = JSON.stringify(st.video.segments ||
      [[0, st.steps && st.steps[0] ? st.steps[0] : "Set up"],
       [sec * 0.3, "Correct movement"],
       [sec * 0.75, st.mistake ? st.mistake.split(".")[0] : "Watch your form"]]);

    /* showModal gives focus trapping and a backdrop for free; the bare `open`
       attribute still shows the panel where it isn't available */
    if (dlg.showModal) dlg.showModal();
    else dlg.setAttribute("open", "");
    /* autoplay can be refused, and not every environment implements play() */
    if (!reduce) {
      try { var p = vid.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    }
  }

  /* ── attach buttons wherever a station with a clip is named ── */
  function arm(scope) {
    $$("[data-eq], [data-ex], [data-demo]", scope || document).forEach(function (node) {
      if (node.dataset.demoArmed) return;
      var st = stationFor(node);
      if (!hasClip(st)) return;          /* no clip yet → no button, no gap */
      node.dataset.demoArmed = "1";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "demo-btn";
      btn.textContent = "Watch demo";
      btn.setAttribute("aria-label", "Watch a " + ((st.video && st.video.sec) || 10) +
        " second demonstration of the " + st.name);
      btn.addEventListener("click", function (e) { e.preventDefault(); open(st); });

      /* workout rows put it with the set buttons; cards get it on the photo */
      var actions = $(".wo-actions, .ex-actions", node);
      if (actions) actions.appendChild(btn);
      else if (node.classList.contains("eq-card")) {
        var ph = $(".ph", node);
        (ph || node).appendChild(btn);
        if (ph) ph.classList.add("has-demo");
      } else {
        node.appendChild(btn);
      }
    });
  }

  arm(document);
  /* rows arrive later from the builder, the planner and the session layer */
  document.addEventListener("gb:plan", function (e) { arm(e.target || document); });
  document.addEventListener("gb:rows", function (e) { arm(e.target || document); });
  window.GBDemo = { arm: arm, open: open, close: close, hasClip: hasClip, stationFor: stationFor };
})();
