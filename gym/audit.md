# 100-Point Conversion Audit — Gym Basics

Checklist: [Instapage 100-point landing page audit](https://instapage.com/blog/landing-page-audit-checklist)
Audited: **2026-08-13** · Pages: `index.html`, `nutrition.html`
Supersedes the 2026-08-07 run, which scored `index.html` as it stood before the week builder,
the nutrition engine and the scale correction shipped. That page has since been rebuilt around
photography and a two-CTA hero, so its scores are not directly comparable — where a category
moved for a reason, it is called out below.

Measured in real Chromium (Playwright) at 375×812 and 1440×900, not by eye. The script is
disposable; every number below is reproducible from the pages themselves.

**The seven mechanical findings in this document were fixed the same day it was written.** Scores
below are the state *after* those fixes; the "was" column is what the first pass measured, so the
two are comparable. Everything still outstanding needs a decision or a person, not a patch — see
*What needs you*.

## Score

| # | Category | `index.html` | was | `nutrition.html` | was | Notes |
|---|---|---|---|---|---|---|
| 1 | Headline | **14 / 15** | 14 | **15 / 15** | 13 | index's H1 is a judgment call, not a defect |
| 2 | Design | **14 / 14** | 13 | **14 / 14** | 13 | contrast and heading depth both fixed |
| 3 | Call to action | **12 / 14** | 12 | **13 / 14** | 11 | index still runs two hero CTAs, deliberately |
| 4 | Form | **n/a (0 fields)** | — | **16 / 17** | 14 | **new category** — the profile is a real form |
| 5 | User experience | **18 / 19** | 17 | **18 / 19** | 16 | heading order and layout shift both fixed |
| 6 | Social proof | **0 / 13** | 0 | **0 / 13** | 0 | **Nothing exists. Nothing invented.** |
| 7 | Tracking & integrations | **1 / 18** | 1 | **1 / 18** | 1 | needs real accounts and IDs |
| | **Applicable total** | **59 / 93** | 57 | **77 / 110** | 68 | |

Categories 6 and 7 carry 31 of the available points and are near-zero on both pages by choice,
not by oversight. Read those two sections before reading either total as a verdict.

*(The previous run reported "62/79" for index. That denominator can't be reconstructed from its
own category counts, which sum to 93 with the form category excluded. The arithmetic above is
shown per category so it can be checked.)*

---

## Verified by measurement, not by eye

| Check | Method | `index.html` | `nutrition.html` |
|---|---|---|---|
| Text contrast | WCAG ratio for every text-bearing element, translucent layers composited | **0 failures** of 213 *(was 1)* | **0 failures** of 117 |
| Lowest passing ratio | same | 4.70:1 | 4.63:1 |
| Horizontal scroll at 375px | `scrollWidth − clientWidth` | **0px** | **0px** |
| Above the fold at 375×812 | bounding boxes | h1, lede, both CTAs and the risk line (bottom 659px) | h1, lede, the jump CTA (437–483px) and the first question's buttons (753–797px) *(was: first input at 982px)* |
| Heading order | sequential scan of rendered h1–h6 | **no skips** *(was h1 → h3)* | **no skips** *(was h1 → h3 and h2 → h4)* |
| Images labelled | 14 `<img>`, 2 `<svg>` | all have `alt`; 1 correctly decorative; both SVGs `aria-hidden` | no images; both SVGs `aria-hidden` |
| Tap targets | rendered boxes of 44 / 54 interactive elements | 4 under 24px, all inline text links | 1 under 24px; **6** in the 24–43px band *(was 32)* |
| Works without JavaScript | JS disabled | 6,042 chars, 8 visible `h2` — **readable** | 3,189 chars — **both panels stay hidden, `<noscript>` shown** |
| Console errors | page + console listeners | **none** | **none** |
| Failed requests | network listener | **none** | **none** |
| Focus ring | first Tab stop, computed style | `3px solid #2563EB` on the skip link | same |
| Reduced motion | `prefers-reduced-motion: reduce` | 0 animating, 0 transitioning | 0 animating, 0 transitioning |
| First-load weight | transfer sizes, phone viewport, uncompressed | **611 KB** over 16 requests *(was 644 over 19)* | **376 KB** over 11 requests |
| First-load weight | over the wire, live, gzip | see *Performance* — text payload down ~79% | same |
| Paint | FCP / LCP / DCL | 152 / 152 / 33 ms | 64 / 64 / 41 ms |
| Layout shift | `layout-shift` observer | **CLS 0.000** first visit, 0.039 returning *(was 0.052)* | **CLS 0.000** both states *(was 0.071)* |
| Metadata | title / description / canonical / og / twitter | 46 / 147 chars, canonical set, 10 og, 4 twitter | 31 / 234 chars, canonical set, 10 og, 3 twitter |
| `lang` / `color-scheme` | computed | `en-IN` / light | `en-IN` / light |

---

## 1 · Headline

### `index.html` — 14/15

*"Know your gym. Train with purpose."* passes the header test: reading only that line tells you
what the page is. It is the largest element, sits fully above the fold on a 375px phone (top
172px, bottom 334px of 812), and the sub-headline expands rather than repeats it. Keywords
appear naturally in both the title tag and the H1.

**The miss:** this headline is weaker than the one it replaced. The 2026-08-07 version read
*"Walk into a gym knowing what everything does"* — which named the reader's actual fear. "Train
with purpose" is a benefit statement of the kind every fitness site already makes, and the #1
objection (being seen not knowing) has moved out of the headline and down into the risk line.
The eyebrow *"Free · No signup · No ads"* is doing more differentiating work than the H1.

### `nutrition.html` — 15/15 *(was 13)*

*"What should I eat?"* is the reader's own question verbatim, which is the strongest form a
headline on an informational page can take, and the title tag matches it.

**The miss, now fixed:** the lede ran **403px tall on a phone** (212→615px) — roughly 100 words
arguing that other calculators are wrong — before the reader could do anything. It was good
writing in the wrong slot. It now stops at the differentiator (212→413px) and the rest moved
below the form as `.nutri-how`, where it explains a target the reader can already see.

## 2 · Design

Both pages: clean type hierarchy, one accent, Barlow Condensed display against IBM Plex Mono for
figures, all photography carrying one CSS grade so mixed stock reads as one shoot. Zero
third-party requests on either page — fonts are self-hosted, so the footer's "no tracking" claim
is literally true rather than aspirational. No pop-ups, no interstitials. `color-scheme: light`
is declared, so neither page gets auto-inverted into something unreadable.

**`index.html` — 14/14 *(was 13)*. The one measured contrast defect is fixed:**

```
"See all programs →"   #2563EB on #0F1319   3.60:1   needed 4.5:1   (18px, weight 400)
                       index.html:87, inside .sec-lede on a .section-dark band
```

The cause was a missing rule, not a bad colour choice: the palette already carried `--elec:
#8FA8FF` as the accent for dark grounds, but nothing applied it to prose links, so they fell
through to the light-ground link blue. `.on-dark .sec-lede a, .on-dark .lede a, .on-dark p
a:not(.btn)` now does, at **8.2:1**. Scoped to prose deliberately — card and button links on dark
carry their own colour and must not be caught by it. All 213 text elements pass, lowest 4.70:1.

**`nutrition.html` — 14/14 *(was 13)*.** Zero contrast failures across 117 elements; the tightest
is the calculator's own output figure at 4.63:1. The point that came off for visual hierarchy is
restored: the primary output region was rendering at `h3` beneath nothing, and is now `h2` (see
UX), so the answer outranks the calculator instead of the other way round.

## 3 · Call to action

### `index.html` — 12/14

**Two hero CTAs where the previous audit found one.** "Build my week" (solid) and "Explore
equipment" (ghost) are visually ranked, both ≥44px, both above the fold, both resolving. This is
a defensible change — the site now genuinely has two entry points, and a returning user wants
the builder while a first-timer wants the library. But it costs the two checks that ask for a
single unambiguous action, and it should be measured rather than assumed: if "Explore equipment"
takes meaningful clicks from "Build my week", the ghost button is a leak, because the builder is
the page's real conversion.

**Deliberately failed — "creates urgency or offers an incentive."** Manufacturing urgency on a
page aimed at people who feel judged about exercise works against the entire argument. The
incentive is that the content is free and finishable, which the eyebrow states.

### `nutrition.html` — 13/14 *(was 11)*

The action is filling in five fields and saving. **It used to be entirely below the fold** — the
first input sat at 982px on a 375×812 phone, behind 400px of lede and a five-line panel intro,
with nothing above the fold to suggest the page was interactive at all.

Three changes, measured at each step: a `Work out my target ↓` anchor in the page head (now at
437–483px), the lede trimmed to its differentiator, and the panel intro cut from three claims to
one. The reader now sees the headline, the argument, a button, and **the first question's answer
buttons at 753–797px** without scrolling.

**The remaining point** is that the submit button is still far down the page — unavoidable with
five questions above it, and not worth solving with a sticky bar on a form filled once.

## 4 · Form — `nutrition.html` only, 16/17 *(was 14)*

**New category since the last audit.** The previous run excluded all 17 form checks because
`index.html` had no form. `nutrition.html` does: five questions asked once, stored locally,
deletable from the page.

Passing: minimal field count (five, none of them optional-but-asked-anyway), every field
programmatically labelled, correct `inputmode` on all three numeric inputs (`numeric` for age and
height, `decimal` for weight — so phones show the right keypad), clear per-field help text
explaining *why* each is asked, segmented controls as `role="group"` + `aria-labelledby` +
`aria-pressed` rather than unlabelled div soup, no account, no email, no server, and an explicit
delete control.

**Two of the three misses are fixed:**

1. ~~**No `autocomplete` attributes.**~~ All six number inputs now carry `autocomplete="off"`.
   Worth being precise about what this does and doesn't achieve: the HTML autofill spec has **no
   token for age, height or weight**, so there is nothing that would help a browser fill this
   form correctly. What `off` buys is the opposite — it stops the browser offering an unrelated
   saved value in a field that feeds a health calculation. The original finding was glib about
   this; the fix is real, but it is a suppression, not an autofill.
2. ~~**Help text not tied to its field.**~~ The three help paragraphs now carry ids, and each
   `role="group"` carries `aria-describedby` pointing at them, so "why we ask" is announced with
   the question rather than after it. The six numeric inputs still have no `id` — they are
   labelled by a wrapping `<label>`, which is valid, and the numeric group has no help text to
   describe, so nothing is lost.
3. ~~**Two-thirds of controls sized 24–43px.**~~ `.seg button` and `.seg-sm button` went from
   `min-height: 42px` to `44px`. **The 24–43px band is now 6 controls, down from 32.**

The privacy position is the form's strongest asset and should not be traded away: nothing here
is a subscription, an account or a food diary, and nothing leaves the device.

## 5 · User experience

Both pages: scannable structure, no horizontal scroll at either width, sticky nav, visible focus
rings (`3px solid #2563EB`), full keyboard operation, `prefers-reduced-motion` honoured with zero
animating and zero transitioning elements under `reduce`, every internal `#anchor` resolving to a
real target, a print stylesheet, and a skip link as the first tab stop on both.

**`index.html` — 18/19 *(was 17)***

- ~~**Heading order skips h2.**~~ The sequence began `h1, h3, h3, h2, …`: the injected
  `#todayCard` (`week.js`) and `#fuelCard` (`nutrition-ui.js`) are top-level page sections that
  were rendering their heading a level too deep, sitting between the hero and the first real
  `h2`. Both now emit `<h2>`, and the CSS that sized them was retargeted to match. **No skips.**
- ~~**CLS 0.052.**~~ **Now 0.000 on a first visit.** The first pass blamed the 14 images for
  lacking `width`/`height`; measuring the shift sources showed that was wrong. Every image sits
  in a `.ph` box that already declares `aspect-ratio`, so none of them shift. The entire 0.052
  was the **font swap** — `font-display: swap` with no preload, reflowing `DIV.hero-cta | P.lede
  | P.risk` at 119ms. The three above-the-fold faces are now preloaded and set to `font-display:
  optional`, so they are ready at first paint and never swap in late. Barlow 600 is card-level,
  below the fold, and keeps `swap`.
- **A 0.039 shift remains for returning visitors** — `#todayCard` and `#fuelCard` unhide after
  paint once JS reads the saved plan, pushing the levels section down. It is well inside the
  "good" band, it affects only people who already have a plan saved, and the alternatives
  (reserving a fixed height for a card of variable height, or duplicating the empty-state markup
  into the HTML) both cost more than the 0.039 is worth. Left deliberately; the point comes off
  for it.
- Four interactive elements measure under 24px, all inline links inside sentences ("beginner",
  "Pexels" in the photo credit). WCAG 2.5.8 exempts inline links in text; correct as they are.
- **Works with JavaScript off** — 6,042 characters and 8 visible sections render.

**`nutrition.html` — 18/19 *(was 16)***

- ~~**Heading order skips two levels.**~~ The whole primary output ("Today's fuel", "How that
  number is built", "Your week, as calories") rendered at `h3` with no `h2` above it, while the
  page's only `h2` was the secondary calculator — the structure claimed the calculator was the
  main content and the answer a subsection of nothing. The output blocks are now `h2`, what sits
  inside them is `h3`, and the calculator's own `h4`s became `h3`. **No skips in either state.**
- ~~**CLS 0.071.**~~ **Now 0.000 in both states.** Both panels start `hidden` so that with JS off
  the reader gets the `<noscript>` note rather than a form that cannot submit — which left
  `nutrition-ui.js` to unhide one of them after paint, reflowing everything below. A five-line
  inline script directly after the two panels now picks which one is coming, before paint. It
  only chooses; the real validation still happens in `nutrition-ui.js` a moment later.
  *(Trimming the lede briefly pushed this to 0.267 before the inline fix landed — the moved
  paragraph had more below it to shift. Worth recording that the first attempt made it worse.)*
- **The page does not work without JavaScript**, and correctly says so — `<noscript>` blocks
  cover both the output and the calculator, and both panels verifiably stay hidden with JS off.
  A calculator that needs a calculator is a reasonable dependency; the point comes off anyway,
  because it is still a page that does nothing without script.

## 6 · Social proof — 0/13, both pages

**Neither page has testimonials, ratings, logos, customer counts, awards or endorsements —
because none exist. Nothing in these thirteen checks was fabricated.**

Placeholder social proof that reads as real is the fastest way to lose a nervous reader, and it
would be a lie. In its place `index.html` carries an honesty statement in the eyebrow — *"Free ·
No signup · No ads"* — and a risk-reversal line under the CTAs.

**This scores zero on both pages and it is now the largest single gap on the site**, because the
nutrition page has raised the stakes since the last audit. A page that tells someone what to eat,
and then *changes that number* on the evidence of their own weigh-ins, is making a health claim
that no amount of good writing substitutes for.

**To actually score here, in order of value:**

1. **A registered dietitian reviews `nutrition.html` and the engine, and is credited by name and
   qualification.** Highest-value item on this document.
2. **A qualified trainer or physiotherapist reviews the exercise instructions**, credited the
   same way.
3. Three short quotes from real first-timers who used the guide, with first name and city.
4. A named gym willing to link to it for new members.

## 7 · Tracking & integrations — 1/18, both pages

Only "page speed monitored" is partially satisfied — measured at build, no ongoing monitor.
Everything else needs accounts and real IDs that cannot be invented: GA4 or Plausible, event and
conversion tracking, UTMs, heatmaps, funnel and drop-off tracking, A/B tooling, email platform,
CRM, retargeting and social pixels, ad tags, follow-up automation, affiliate parameters, feedback
tools, SMS.

**Before wiring any of it:** the footer promises *"no tracking"*. Adding analytics means either
removing that line or choosing a cookieless, self-hosted tool and saying so precisely. Don't
quietly break the promise — it is load-bearing for this audience.

---

## Performance

Both pages paint fast on a local network (FCP 116ms / 68ms), and the engine work is not the
bottleneck. Two things are worth fixing because they cost nothing to fix:

~~**Nothing is compressed.**~~ The live server was sending `styles.css` as 70,983 bytes with no
`Content-Encoding` — there was no `encode` directive in the `/gym` block of
`/etc/caddy/Caddyfile`. One line (`encode zstd gzip`) fixed it. Measured over the wire, live:

| File | Raw | Over the wire | |
|---|---|---|---|
| `styles.css` | 71,557 | **14,983** | 21% |
| `data.js` | 85,685 | **23,305** | 27% |
| `index.html` | 23,825 | **6,787** | 28% |
| `nutrition.html` | 17,228 | **4,987** | 29% |

~~**`index.html` loads 248 KB of JavaScript across ten files.**~~ Three of them did nothing on
the homepage: `session.js` (18.6 KB, the live-workout layer), `lift.js` (9.6 KB, load logging)
and `demo.js` (6.6 KB, video demos, which render nowhere since no `data.js` entry carries a
`video`). They are gone from `index.html` — **10 script tags down to 7, 16 requests instead of
19, 611 KB instead of 644.**

Removing `session.js` had one trap worth recording: **it was the only place the service worker
was registered**. Dropping it from the homepage would have silently broken offline install for
anyone landing there first — and it also explained why `nutrition.html`, which never loaded
`session.js`, was not registering the worker at all. The four lines moved to `app.js`, which
every page loads, fixing both.

**Still the largest single item: `data.js` at 85.7 KB (23.3 KB compressed)**, loaded by every
page including ones that render a handful of its entries. Splitting it by what each page actually
needs is the next real win, and unlike everything above it is not a one-liner.

---

## What needs you (ranked)

1. **A registered dietitian must review the nutrition engine, the food values and the correction
   before this is public.** The page no longer only estimates someone's calories — it changes
   them. `nutrition.html` carries its own warning covering pregnancy, under-18s, diabetes, kidney
   and liver disease and disordered eating; keep it, and add a named reviewer above it.
2. **A qualified trainer or physiotherapist must review the exercise instructions.** Every note
   is standard published beginner guidance, but nobody qualified has checked it. Unchanged from
   the last audit and still unresolved.
3. **Decide whether the site carries your name.** With no other proof available, a named author
   and one honest line of context would raise trust more than anything else currently possible.
4. **Decide whether "Explore equipment" earns its place in the hero** — and reconcile analytics
   with the "no tracking" promise before you can answer that.
5. **Decide whether the `index.html` H1 should go back to naming the fear.** *"Walk into a gym
   knowing what everything does"* was replaced by *"Know your gym. Train with purpose."* This is
   a copy judgment, not a defect, which is why it was not fixed with the other seven.

## What was fixed (2026-08-13, all seven applied and re-measured)

| | Fix | Result |
|---|---|---|
| 1 | `.on-dark` prose link colour → `var(--elec)` | 3.60:1 → **8.2:1**, 0 contrast failures |
| 2 | `#todayCard`/`#fuelCard` → `h2`; nutrition output `h3`→`h2`, `h4`→`h3`; CSS retargeted | **no heading skips** on either page |
| 3 | Anchor CTA in the page head, lede and panel intro trimmed | first question's buttons **above the fold** |
| 4 | `encode zstd gzip` in the Caddy `/gym` block | text payload **−79%** |
| 5 | Fonts preloaded + `font-display: optional`; inline pre-paint panel choice | CLS **0.052 → 0.000** and **0.071 → 0.000** |
| 6 | `session.js`/`lift.js`/`demo.js` off the homepage; SW registration moved to `app.js` | 19 → **16 requests**, and nutrition now registers the worker too |
| 7 | `.seg button` 42 → 44px; `autocomplete="off"`; `aria-describedby` on the field groups | 24–43px band: 32 → **6** |

`sw.js` bumped to `gb-v12`. All 455 smoke assertions still pass; the one test that read
`#fuelCard h3` was updated to `h2`.

**Two findings from the first pass were wrong and are corrected above:** the homepage CLS was
not the unsized images (their `.ph` boxes already declare `aspect-ratio`) but the font swap; and
`autocomplete` has no token for age/height/weight, so `off` suppresses bad autofill rather than
enabling good autofill.

## Found while fixing — since fixed across the whole site

**Five other pages had the same `h1 → h3` skip** index had: `equipment.html`, `exercises.html`,
`builder.html`, `week.html` and `programs.html`. In each case card headings sat directly under
the `h1` with no `h2` between. Fixed in a second pass:

| Page | Was | Now |
|---|---|---|
| `equipment.html` | `h1` → 30 × `h3` station cards, detail `h4`s | cards `h2`, detail `h3` |
| `exercises.html` | `h1` → `h3` exercise cards, detail `h4`s | cards `h2`, detail `h3` |
| `programs.html` | `h1` → 3 × `h3.h-card` level cards | cards `h2` |
| `builder.html` | `h1` → `h3` keybox; generated plan `h3` | both `h2` |
| `week.html` | `h1` → `h3` keybox; "Your week" `h3`, days `h4` | keybox and "Your week" `h2`, days `h3` |

Each library card is a top-level item of its page, the way posts are on an index — so `h2` is
where they belong, and no invented section heading was needed to bridge the gap. The homepage's
equipment strip is the exception and stays at `h3`: it sits under its own `h2` ("Explore modern
equipment"), so promoting it would have broken what was already correct. `.eq-body h2, .eq-body
h3` covers both.

**Verified across all twelve pages, in default *and* interacted states** (cards expanded, plan
generated, week built): **one `h1` each, no heading skips, no horizontal overflow, zero console
errors, zero failed requests.** Computed styles were checked before and after — every promoted
heading renders at the same size, weight, family and transform it did as an `h3`/`h4`.

**One regression caught in the process.** The first pass narrowed `.plan-head h3` to `.plan-head
h2` for the nutrition output, but `app.js` still emitted `h3` there for the builder's generated
plan — silently unstyling it. The rule now reads `.plan-head h2, .plan-head h3`, and the builder
heading is back to 26px/700 Barlow Condensed. It was invisible to the smoke tests, which assert
on content and behaviour rather than on computed style.

## What to measure first

1. **Does anyone reach the nutrition form?** It is below the fold behind 400px of prose. Scroll
   depth on that page answers whether the writing is an asset or a wall.
2. **The hero split on `index.html`** — "Build my week" versus "Explore equipment".
3. **Whether the correction is ever applied.** It needs a fortnight of weigh-ins to appear at
   all; if nobody logs weight twice, the most sophisticated thing on the site never runs.
4. Test the `index.html` headline first. It carries the largest effect and is the cheapest thing
   to change — and the current one is, by this document's reading, weaker than its predecessor.
