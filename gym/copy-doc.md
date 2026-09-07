# Site Copy — Gym Basics

**Archetype:** Hybrid
**Why:** The reader has accepted "gyms aren't for people like me" as normal (Barry's pain-first opening earns the first sentence), but the payload is scannable equipment and exercise explainers (Julian's feature machinery).
**Primary action:** **Build my week** — generate a personalised training week. Free, no signup, no product.
**Status:** **SHIPPED** at `https://file.devalla.tech/gym/`. This document now records the copy that is live rather than proposing copy to approve.

> Items marked **ASSUMED** are guesses that need validation with real readers.

---

## What changed since the first draft (2026-08-07 → 2026-08-13)

This started as a **single landing page**: one scroll, twelve machines, an SVG floor map, and
one action — *Start the walkthrough*. It is now a **twelve-page training platform**, and most of
the copy below was rewritten to match. Read this section before trusting any older passage.

| | First draft | Now |
|---|---|---|
| Shape | One page | 12 pages: home, programs, 3 level sessions, 2 libraries, builder, week planner, workout runner, nutrition, first-day guide |
| Primary action | Start the walkthrough | **Build my week** |
| Equipment | 12 machines, SVG diagrams | **30 stations**, photographed, plus **41 exercises** in their own library |
| Audience | People who have never trained | Widened: *"Built for people who've never trained — and the people who train daily."* |
| Nutrition | Not in scope | A whole page — calorie and protein targets read from the training week, plus a correction the scale argues for |
| Proof | None | **Still none.** Nothing was invented in the meantime. |

**Three copy changes made on 2026-08-13, all recorded in their sections below:**

1. The nutrition lede was cut from ~100 words to its differentiator, and a **`Work out my target ↓`**
   button added, because the form sat 982px down a phone screen behind a wall of argument.
2. The nutrition profile intro was cut from three claims to one; the sentence about training level
   moved below the form, where it explains a target the reader can already see.
3. Nothing else. The rest of this session's work was structural, not editorial.

**One open copy question the audit raised and did not decide:** the current H1 is judged weaker
than the one it replaced. See *Hero*.

---

## Discovery summary

| | |
|---|---|
| **Audience** | Primary: people who have never set foot in a gym. Secondary: joined but only use the treadmill; women who feel watched near free weights; older adults told by a doctor to start strength training. **Widened since the rebuild** to include people who already train — the hero says so outright. |
| **Not for** | ~~People who already train and want programming, macros, or advanced technique.~~ **No longer true.** The site now does programming (the week planner and the builder, through to advanced) and macros (the nutrition page). What it still does not do: coaching, one-to-one form correction, or anything requiring a qualified human. That is where it ends. |
| **Awareness** | Problem-aware about the *goal* (they know exercise is good), problem-unaware about the *real barrier* (nobody explained the room). |
| **Current alternative** | YouTube and Instagram reels made for people who already train; copying whatever the person next to them is doing; asking a friend who "goes to gym"; or simply not going. **ASSUMED** — worth confirming with 3 real beginners. |
| **#1 pain** (their words) | "I wouldn't know what to do in there." |
| **Cost of that pain** | Memberships paid for and unused. Months of "I'll start next month." For the doctor-advised reader, a health instruction they can't act on. |
| **Why we're better** | Fitness content assumes you already know the room. This explains the room itself — what each object is, how to spot it, what it's for, and the lightest honest way to start. |
| **#1 objection** | "Everyone will see I don't know what I'm doing." |
| **Objections 2–4** | 2 · "I'll injure myself." 3 · "I don't know where to start." 4 · "I should get fit first, then join." |
| **Specific verifiable claim** | 30 stations explained; 41 exercises with full instructions; a training week planned from three questions; calorie and protein targets read from that week; free, no signup, works offline. All checkable on the site itself. *(`data.js` holds 58 exercises, but 17 are warm-up and cool-down furniture the library never lists. **41 is the number a reader can count**, so 41 is the number to claim — do not "correct" it to 58.)* |
| **Proof available** | **None. Stated plainly rather than invented.** No testimonials, no user counts, no expert review yet. See "Proof" section for what to do instead. |

---

## Navbar — shipped

**Logo:** Gym Basics
**Links:** Programs · Nutrition · Equipment · Exercises · First day
**CTA button:** My week

*The nav is now the site map rather than a page outline, because there is a site.*

---

## Hero — shipped

**Eyebrow:** Free · No signup · No ads

**Header:**
> Know your gym.
> Train with purpose.

**Subheader:**
> From your first workout to advanced training — understand the equipment, follow structured sessions, and train with confidence.

**CTA buttons:** `Build my week` (solid) · `Explore equipment` (ghost)
**Risk-reducer line:** Built for people who've never trained — and the people who train daily.

**Image:** A photograph of a gym floor, graded to match the rest of the site's photography.
The first draft argued *against* this — "a photo of a busy gym floor would reproduce the
intimidation instead of removing it" — and the SVG floor map it proposed instead still survives
on `guide.html`, where it does that job. The homepage went to photography when the audience
widened past first-timers.

### ⚠ Open decision — the headline is weaker than the one it replaced

The 2026-08-13 audit scored this **14/15** and the miss is here. The original read:

> Walk into a gym knowing what everything does.

That named the reader's actual fear and passed the header test on its own. *"Train with purpose"*
is a benefit statement every fitness site already makes, and objection #1 — being seen not knowing
— has moved out of the headline down into the risk line. Right now the **eyebrow** (*Free · No
signup · No ads*) is doing more differentiating work than the H1.

The counter-argument is real: the site is no longer only for people who have never trained, and
the old headline excludes the reader who trains daily. But *"Know your gym"* already carries that
half. **Test the headline first** — it carries the largest effect and is the cheapest thing on the
site to change.

### ⚠ Open decision — two CTAs where there was one

`Build my week` and `Explore equipment` are visually ranked and both above the fold, and the site
genuinely has two entry points now. But it costs the single-action checks, and if the ghost button
takes meaningful clicks from the builder it is a leak, because the builder is the real conversion.
**Unmeasurable until analytics exists** — see *Footer*, where "no tracking" is a promise.

---

## Opening — the scene (Barry steps 2–4)

The doors are usually glass. You can see the whole floor from the street: rows of machines with cables and pins and levers, people who clearly know exactly what they're doing, and not one label explaining what any of it is for.

So you keep walking. Or you join, use the treadmill for twenty minutes because it's the only thing that's obvious, and go home.

That's how most memberships quietly go unused. Not for lack of motivation — nobody ever explained the room.

---

## Acknowledgment and the real obstacle (Barry steps 6–7)

You already know exercise is good for you. That was never the missing piece.

Here's the actual problem: a gym is one of the only public places where everyone is expected to already know how the equipment works, and nothing tells you. There are no instructions on the machines — just a brand name and a diagram of a muscle. So the barrier isn't fitness. It's not knowing the room, and not wanting to be seen not knowing it.

That's a solvable problem. It just needs somebody to describe the room before you have to stand in it.

---

## CTA blocks — shipped

The homepage now runs a **stepped** structure rather than repeating one button. Each section
opens with an eyebrow that numbers or names the step:

| Eyebrow | Section (H2) | Action |
|---|---|---|
| Step 01 · Pick your starting point | What's your training level? | three level cards |
| Step 02 · Pick a direction | What's your goal? | five goal cards |
| The floor, explained | Explore modern equipment | Full equipment library |
| The shape of every good workout | How a session works | — |
| Complete guided sessions | Featured workouts | Full guided session → |
| Your gym · your time · your plan | Build your workout | Open the builder |
| Questions | Before you ask | — |

**Closing block:** *Your next workout starts here.* → `Start your workout`
**Sub-line:** Free. Nothing to sign up for.

---

## Proof — honest position (unchanged, and still the largest gap)

**Format:** No testimonials, no logos, no counts. None exist, and inventing them would be the
fastest way to lose a nervous reader.

What runs in this slot instead — the hero eyebrow and risk line:

> Free · No signup · No ads
> Built for people who've never trained — and the people who train daily.

**This scored 0/13 on both audited pages and the stakes have risen since the first draft.** The
site now tells someone what to eat and then *changes that number* on the evidence of their own
weigh-ins. A dietitian's name above that page is worth more than every other proof item combined.

**Recommended real proof to add later, in order of value:**
1. **A registered dietitian reviews the nutrition engine and the correction**, credited by name
   and qualification. Highest-value item on the site — it is the page making the strongest claim.
2. **A qualified trainer or physiotherapist reviews the exercise instructions**, credited the same
   way. This is the only thing that answers "is this safe advice?"
3. Three short quotes from real first-timers who used it, with first name and city.
4. A named gym willing to link to it for new members.

Until #1 and #2 exist, no page may imply professional authority anywhere.

---

## Page inventory — what exists now

> **Hero promise being proved:** you will know what everything does *and* what to do with it.

| Page | Does what | H1 |
|---|---|---|
| `index.html` | Entry point, level → goal → builder | Know your gym. Train with purpose. |
| `programs.html` | The three levels side by side | Programs |
| `beginner/intermediate/advanced.html` | A complete guided session at each level | (level name) |
| `equipment.html` | 30 stations, filterable by zone and muscle | Equipment library |
| `exercises.html` | 41 exercises, full instructions | Exercise library |
| `builder.html` | One session to your constraints | Build your workout |
| `week.html` | A whole training week | Build my week |
| `workout.html` | The live session runner, with Focus mode | (session name) |
| `nutrition.html` | Calorie and protein targets from the training week | What should I eat? |
| `guide.html` | The original first-day content, floor map and weights primer | (first-day guide) |

### The week planner — the primary conversion

**Eyebrow:** Your gym · your time · your plan
**Promise:** three questions — level, days available, goal — and every session in the week is
planned. **Empty state** (what a first-time visitor sees on the homepage):

> **Build your training week**
> Three questions — your level, how many days you can train, and what you're training for — and
> you get a week with every session planned, ready to follow in the gym.

**Returning state** replaces it with today's session by name, its exercise count, its duration,
and `Start today's workout` — or `Do it again` if it is already done. This is the single most
valuable piece of copy on the site, because it is what a returning reader sees first.

### The libraries

**Equipment** — *Every station photographed and explained: what it does, the muscles it works,
how to use it, and where to start at every level.* Each card carries the station name, what it
is for, its muscles, and a `How to use it` disclosure holding primary muscles, method, per-level
starting points and the common mistake.

**Exercises** — full instructions per movement: starting position, movement, breathing, form cue,
common mistakes, a version for each level, and safety.

*Both libraries reach the demo clips through the station an exercise uses, so a clip filmed once
appears in both. No clips exist yet — see `vid/README.md`.*

### The session spine

**Eyebrow:** The shape of every good workout
**Promise:** *Every program on this site — beginner to advanced — follows the same six-phase
spine. Learn it once and no workout will ever feel improvised again.*
Phases: Pre-gym · Warm-up · Main workout · Accessory + core · Cool-down · Recovery.

### The set panel — fixed 2026-08-14 (every workout row)

The row used to carry one weight box for the whole exercise, so set 2 opened showing set 1's number
and typing over it destroyed set 1. Every set now has its own weight, reps and difficulty. The copy
that carries the fix:

| Element | Words |
|---|---|
| Panel heading | `SET 2 OF 3` — always the count as well as the number, so a 4-set row cannot be mistaken for a 3-set one |
| Done marker | `✓ done` on the selected set, and the dot fills in |
| Weight picker | opens on that set's last weight, dashed, with `from last time` under it; the prompt `Select weight` when there is no history; the last option is `+ Custom weight` |
| Reps picker | prompt is `Select reps`; 1–20 then 25, 30, 35, 40, 50 — the prescription is never one of them |
| Target | `target 8–12`, set under the reps picker in mono, so the row's ask cannot be read as the answer |
| The line | `last time 22.5 kg × 10 · felt right · try 25` — set 2 against set 2, never against the session |
| Best | `best yet`, only when today's heaviest set beats every previous session |

**The weight is offered, the reps are not.** A weight repeats week to week and is the tap worth
saving; reps are the number that actually varies set to set, and pre-filling those would be putting
words in the reader's mouth about how the set went. So the weight picker opens on last time and the
reps picker opens on `Select reps`.

**A suggestion is dashed until it is earned.** The dashed border and `from last time` say the number
is a proposal; ticking the set off or changing the picker makes it a record and the border goes
solid. Nothing in the log is ever a number the reader did not either choose or complete.

**No copy anywhere says "sets" where it means "the set you are on".** The two facts the dots carry
are different — filled means done, ringed means on screen — and the README documents the tap rule
that keeps them from fighting each other.

### Progressive overload — new 2026-08-14 (`week.html`)

**H2:** Are you actually getting stronger?

> The kg box tells you what you did last time, which is the question you have at the rack. This is
> the other one. One line per week per exercise, heaviest session of that week, and what changed
> since the week before — **because overload is not only weight**: a week that added two reps at the
> same load progressed, and is counted as progress here. Three weeks with nothing added is called
> what it is.

**The objection it answers:** *I've been going for two months and I don't know if anything is
happening.* The honest answer is in the log the reader already has, and until now nothing read it
back to them.

**Voice rules for the generated lines**, since they are copy even though a script writes them:

| Situation | What it says |
|---|---|
| First week | `First week logged. Next week has something to beat.` |
| Up on last week | `Up on last week — +2.5 kg. That is progressive overload.` |
| Same as last week | `Same as last week. Two in a row is fine; three is a plateau.` |
| Down | `Down on last week. One bad day is a bad day, not a trend.` |
| Three flat weeks | `3 weeks at 60 kg with the same sets and reps. Add 5 kg, or a rep on every set.` |
| Three flat weeks, last felt hard | `…It felt hard last time — hold here until it doesn't.` |

No streaks, no badges, no encouragement that isn't a fact about the log. The lede counts what is
tracked and, only when there is one, how many are `going nowhere` — the plainest word available,
because "needs attention" is the phrasing that gets ignored.

---

## Nutrition — new since the first draft

**Eyebrow:** Your training · your body · your target
**H1:** What should I eat?

**Lede (as trimmed on 2026-08-13):**
> Every calorie calculator asks you to pick a "training activity level" from a dropdown and guess.
> This one doesn't ask. It reads the training week you already built — the real sessions, their
> real length, what is actually in them — and costs the day from that.

**CTA:** `Work out my target ↓`

*Why it was cut:* the lede ran 403px tall on a phone — about 100 words arguing that other
calculators are wrong — and the first input sat at 982px, so nothing above the fold suggested the
page was even interactive. It now stops at the differentiator and the reader reaches the first
question without scrolling.

**Moved below the form**, where it describes a number the reader can already see:
> Lift today and the number goes up. Rest tomorrow and it comes back down. Your training level is
> never asked for — it comes from the week you already built, so the food can never disagree with
> the training. And because a beginner and an advanced lifter do not eat the same way, that level
> sets the protein, the size of the surplus or deficit, and how many times a day you eat.

**Form intro, cut from three claims to one:**
> Five things, once. It all stays on this device — no account, nothing sent anywhere.

**Every field says why it is asked.** Sex: *"The resting-energy equation needs it — men and women
of the same weight burn measurably differently at rest. It is not used for anything else."*
Activity is asked as a question about your day (*"Desk job, mostly sitting"*) rather than as
"lightly / moderately / very active", which is the phrasing nobody can answer honestly about
themselves.

### The correction — the copy that carries the most risk

**H2:** Is it working?  **H3:** Correction from the scale

The engine reads the weight log, fits a trend, and offers a calorie change. The copy rules it
follows are worth stating, because they are what keep it from reading as a black box:

- **The button says what it will do, in calories:** `Take off 250 kcal a day`, beside
  `today 2,220 → 1,970 kcal`. Nothing is applied until it is pressed.
- **It explains where the change lands**, not just its size: *"It lands on the expenditure
  estimate rather than on the target, so your deficit keeps being taken from a maintenance the
  scale agrees with."*
- **It sets the next expectation:** *"Then leave it a fortnight — a correction judged on the week
  it was made is not judged at all."*
- **When applied it says so and offers the way out:** *"−250 kcal a day is applied since 1 August.
  Every target on this page already includes it. Remove it."*
- **When it has nothing to say, it says why** rather than going quiet — not enough weigh-ins, not
  enough time, or a cut already sitting on the calorie floor, which is told to add training
  instead.
- **In kilos and calories, never in jargon.** No "TDEE adjustment", no "metabolic adaptation".

**Closing summary block (H2):** *The whole thing in six lines* — protein, calories, carbohydrate,
fat floor, consistency, and the scale as referee.

**Medical warning on this page must stay**, covering pregnancy, under-18s, diabetes, kidney and
liver disease, and disordered eating.

---

## Original landing-page features — superseded, kept for reference

*The five feature blocks below were written for the single-page version. The map and the
first-day material still live on `guide.html`; the 12 machines became the 30-station equipment
library. Kept because the objection mapping is still the clearest statement of why each block
exists.*

### Feature 1 — The map

**Header:** Every gym is the same three zones
**Paragraph:**
Cardio at the front, seated machines through the middle, free weights at the back. Once you can name the zones, the floor stops being one intimidating room and becomes three ordinary ones. Almost every gym in the world is laid out this way, so this map works for the gym you're actually joining.
**Objection handled:** #3 — "I don't know where to start."
**Image brief:** The overhead SVG floor map from the hero, repeated larger with each zone highlighted as you read about it.

### Feature 2 — The 12 machines

**Header:** What each machine is, how to spot it, and where to start
**Paragraph:**
Twelve entries. Each one tells you what the thing looks like so you can find it, which part of you it works, the three steps to use it, the lightest sensible starting point, and the one mistake beginners make on it. No programming, no jargon, no assumed knowledge.
**Objection handled:** #1 — the fear of being seen not knowing.
**Image brief:** One simple line diagram per machine, drawn as inline SVG in a single consistent style. Photographs would be better for recognition and should replace these later — but only real photos of real gym equipment, never stock imagery of models posing.

### Feature 3 — Your first 30 minutes

**Header:** A first session you can follow without deciding anything
**Paragraph:**
Warm up, four machines, cool down, leave. It uses only equipment explained above, tells you how many sets and how long to rest, and it ends. Deciding what to do is the hardest part of the first visit, so this page decides it for you.
**Objection handled:** #3 — "I don't know where to start."
**Image brief:** A simple numbered sequence, readable as a checklist on a phone screen at the gym. This is the section people will actually hold their phone up to read, so it must be legible at arm's length.

### Feature 4 — How to not look lost

**Header:** The unwritten rules, written down
**Paragraph:**
How to tell if a machine is free. The exact sentence to say if you're not sure. What to do between sets. Why putting weights back matters more than anything you lift. These are the rules everyone else learned by watching, and not knowing them is most of the fear.
**Objection handled:** #1 — the fear of being seen not knowing.
**Image brief:** No image. Short rules read better as a plain list, and an illustration here adds Labor without adding clarity.

### Feature 5 — What to wear, what to bring

**Header:** You need shoes, clothes and water. That's the list.
**Paragraph:**
No special gear, no gloves, no belt, no supplements. The kit question stops more first visits than it should, so it gets a straight forty-word answer.
**Objection handled:** #4 — "I should get ready first."
**Image brief:** None needed.

---

## Page content — the original 12 machines (final copy, now on `guide.html` and expanded to 30 in `equipment.html`)

### How the weights work — read this first

**Weight stacks (seated machines).** A column of numbered rectangular plates with a pin. Put the pin under the number you want; lower number, lighter weight. Start with the pin near the top.

**Barbells and plates.** The long bar in the rack weighs 20 kg on its own, and lifting only the bar is a normal starting point, not a beginner's embarrassment. Round plates slide onto the ends.

**Dumbbells.** Sold in pairs by weight, racked lightest to heaviest. Start at 2–4 kg to learn a movement.

**How much should I use?** The lightest weight that lets you do 8–10 repetitions with control, where the last two feel like work but your form doesn't change. If you can't finish the set smoothly, it's too heavy. Going lighter is not a failure — it's the actual technique.

---

### Zone 1 · Cardio — the front of the gym

The safest place to start, because there's nothing to set up and everyone here is doing exactly one obvious thing.

**1 · Treadmill**
*Spot it:* the row of belted walking machines, usually facing a wall or a window.
*What it's for:* walking and running indoors, with control over speed and slope.
*How to use it:* stand on the side rails, not the belt. Clip the red safety key to your clothing — if you slip, it stops the belt. Press Quick Start, then bring the speed up with the arrow keys.
*Start at:* 5 minutes of walking at 5 km/h, no incline.
*Common mistake:* gripping the handrails hard while you walk. It takes most of the work out of it. Let go, or slow down until you can.

**2 · Stationary bike**
*Spot it:* seated bikes, usually near the treadmills. The ones with a chair back are called recumbent.
*What it's for:* cardio with almost no impact on knees and ankles — the gentlest thing in the building.
*How to use it:* set the seat so your knee stays slightly bent at the bottom of the pedal stroke. Press Quick Start and choose a low resistance level.
*Start at:* 10 minutes at a pace where you could still hold a conversation.
*Common mistake:* seat too low. It's the single most common cause of sore knees on a bike.

**3 · Elliptical (cross-trainer)**
*Spot it:* the upright machine with two long foot pedals and handles that swing.
*What it's for:* whole-body cardio where your feet never leave the pedals, so there's no impact at all.
*How to use it:* step on with the pedals level, hold the moving handles, and push and pull as you stride.
*Start at:* 8 minutes at resistance 3–5.
*Common mistake:* leaning your body weight onto the handles. Stand tall; the legs should be doing it.

---

### Zone 2 · The seated machines — the middle of the gym

This zone is the best place for a beginner, and here's the reason: a machine moves along one fixed path. You cannot lose your balance or lose the position, so you can learn what an exercise feels like without also managing where your body is in space. Every machine here has a seat you adjust and a weight stack with a pin.

**4 · Leg press**
*Spot it:* a large angled seat with a wide footplate up above you.
*What it works:* thighs and glutes — the biggest muscles you have — with your back fully supported.
*How to use it:* sit back into the seat, feet shoulder-width in the middle of the plate. Push until your legs are almost straight, without snapping your knees locked. Lower under control until your knees are near a right angle.
*Start at:* the lightest plate, 8–10 repetitions.
*Common mistake:* letting the plate come down so far that your lower back lifts off the seat. Stop before that point.

**5 · Chest press**
*Spot it:* a seat with two handles at chest height that you push away from you.
*What it works:* chest, shoulders and the back of the arms — everything involved in pushing.
*How to use it:* set the seat so the handles line up with the middle of your chest. Push forward until your arms are almost straight, then let them come back slowly.
*Start at:* light enough for 8–10 controlled repetitions.
*Common mistake:* a seat set too high or too low, which quietly moves the work into your shoulders. Fix the seat first, every time.

**6 · Lat pulldown**
*Spot it:* a seat with thigh pads and a long bar hanging overhead.
*What it works:* the broad muscles across your back, plus your biceps.
*How to use it:* set the thigh pads snug so you don't lift off the seat. Take the bar a bit wider than your shoulders, pull it down to your collarbone, then let it rise slowly.
*Start at:* light enough for 8 clean repetitions.
*Common mistake:* leaning far back and yanking. Also, pulling the bar behind your neck — an old habit that's hard on the shoulders. In front, always.

**7 · Seated cable row**
*Spot it:* a low seat with a footplate and a handle on a cable in front of you.
*What it works:* mid-back and biceps — the pulling counterpart to the chest press.
*How to use it:* feet on the plate, knees slightly bent, back straight. Pull the handle to your stomach keeping your elbows close to your body, then let it out slowly.
*Start at:* 8–10 repetitions.
*Common mistake:* rounding your back, or swinging your whole torso to move the weight. If you're swinging, it's too heavy.

**8 · Leg curl and leg extension**
*Spot it:* two similar seated machines with a padded roller near your ankles.
*What they work:* the extension works the front of your thigh; the curl works the back.
*How to use them:* line your knee up with the machine's pivot point, set the roller just above your ankle, and move slowly in both directions.
*Start at:* very light. These work one joint only, so weight adds up faster than you'd expect.
*Common mistake:* too much weight, which turns it into a jerky swing and puts strain straight through the knee.

---

### Zone 3 · Free weights — the back of the gym

This is the part that looks like a private club. It isn't — it's just the equipment with no fixed path, which is why it comes last.

**9 · Dumbbells**
*Spot it:* the long rack of pairs along a wall, usually facing mirrors.
*What they're for:* the most useful objects in the building. One pair covers dozens of exercises.
*Three to start with:* goblet squat (hold one dumbbell upright against your chest, sit down and stand up); one-arm row (one knee on a bench, pull the dumbbell to your hip); seated shoulder press.
*Start at:* 2–4 kg while you learn the movement. The mirrors are there to check your form, not to be looked at.
*Common mistake:* not putting them back on the rack. It's the one thing everybody notices, and the easiest rule to follow.

**10 · Cable machine**
*Spot it:* two tall towers with pulleys you can slide up and down, and a bin of handles nearby.
*What it's for:* one machine that becomes many, because you choose the height. The cable keeps tension on the muscle through the whole movement.
*Three to start with:* cable row, triceps pushdown, face pull.
*Start at:* a low setting, standing far enough back that the cable is already under tension before you begin.
*Common mistake:* standing too close to the tower, which leaves the first half of the movement doing nothing.

**11 · Flat bench**
*Spot it:* a padded bench, often with a backrest that pins up to different angles.
*What it's for:* the base for most dumbbell work — pressing, rowing, step-ups — and where you sit between sets.
*How to use it:* to press, sit with the dumbbells resting on your thighs, then lie back and let your thighs push them up into position. Reverse that to put them down.
*Common mistake:* sitting on it with your phone while someone waits. Between sets is fine; between scrolls is not.

**12 · Squat rack**
*Spot it:* the tall metal cage at the back with a barbell in it.
*What it's for:* the most intimidating station in the gym, and one of the simplest. It's a frame with adjustable safety bars set so the barbell can't land on you.
*How to use it:* set the safety bars just below the lowest point you'll reach. The empty 20 kg bar is a real starting weight. If that's too much on day one, squat holding the frame for balance — that counts too.
*Common mistake:* using the rack for exercises that don't need it while someone waits to squat. It's the most complained-about thing in any gym, and it's easy to avoid.

---

### Your first 30 minutes

Do this on your first visit. It uses only the machines above, and it ends.

1. **Treadmill — 5 minutes.** Walk at 5 km/h. This is your warm-up.
2. **Leg press — 2 sets of 10.** Lightest plate. Rest 90 seconds between sets.
3. **Chest press — 2 sets of 10.** Rest 90 seconds.
4. **Lat pulldown — 2 sets of 10.** Rest 90 seconds.
5. **Seated row — 2 sets of 10.** Rest 90 seconds.
6. **Bike — 5 minutes, easy.** Cool down.
7. **Go home.**

That's a complete session: legs, a push, a pull, and a warm-up at each end. If a weight doesn't move smoothly for all 10, drop it — that's the technique working, not failing.

Two or three sessions a week is the standard starting point, with a rest day between them. **ASSUMED** — this matches common beginner guidance, but should be confirmed by the qualified reviewer before publishing.

---

### How to not look lost

The rules everyone else learned by watching:

- **Is this machine free?** If there's no towel, bottle or bag on it and nobody standing nearby, it's free. If you're unsure, the whole sentence is: *"Are you using this?"*
- **Someone's on the machine you want.** Say *"Mind if I work in?"* — it means taking turns between their sets. It's normal and expected.
- **Wipe it down after you use it.** The spray and paper are on the wall.
- **Put the weights back.** More noticed than anything you actually lift.
- **Nobody is watching you.** Between sets, people look at their phone or at themselves. The room is full of people thinking about their own set.
- **You are allowed to ask the staff.** Showing you how a machine works is literally their job, and asking on day one is the most normal thing in the building.
- **Headphones are a valid "not now" sign** — yours and everybody else's.
- **Don't stand right in front of the dumbbell rack.** Take the pair a step back so others can reach.

### What to wear, what to bring

Closed shoes with a reasonably flat sole. Clothes you can move in. A water bottle and a small towel.

That's the list. No gloves, no belt, no special kit, nothing to buy first.

---

## CTA block 2 — shipped

**Headline:** Your next workout starts here.
**Button:** Start your workout
**Sub-line:** Free. Nothing to sign up for.

*The first draft sent this button back up to the 12 machines, on the reasoning that a reader who
reaches the bottom wants to re-read one entry. That is no longer the best available action: the
site can now hand them an actual session.*

---

## FAQ — shipped (9 questions)

*One question was added when the site gained levels; the rest are unchanged from the draft and
still carry the medical caution verbatim.*

**Q:** Which level should I pick?
**A:** *(on page — see `index.html`)* The three levels differ in exercises, volume and depth
rather than in effort. Start where you actually are; the site grows with you.

**Q:** Do I need to get fit before I join?
**A:** No. That's what the gym is for. The lightest plate on every machine is a legitimate starting weight, and the empty bar is a legitimate lift. There's no fitness level you have to reach before you're allowed in.

**Q:** Everyone will see that I don't know what I'm doing.
**A:** Some of them might notice, briefly, and then go back to counting their own sets. Everyone in that room had a first day, including the person who looks most at home. The rules in "How to not look lost" are what they know that you don't — and there are only eight of them.

**Q:** What if I hurt myself?
**A:** The three biggest protections are all free: start on the lightest setting, use the seated machines before free weights, and stop the moment your form changes. If you have an injury, a heart condition, are pregnant, or your doctor has said anything to you about exercise, talk to them first — and ask a trainer at your gym to watch your form once, in person.

**Q:** I'm a woman and the free-weights area feels like a men's club.
**A:** It often looks that way, and that's a real thing to navigate rather than something to talk you out of. Two practical answers: zones 1 and 2 of this guide are a complete workout on their own, so nothing forces you into that corner on week one. And most gyms have quieter hours — mid-morning and early afternoon — where the same floor feels entirely different. Ask at the desk which hours are quietest.

**Q:** My doctor told me to start strength training. Where do I start?
**A:** Talk to your doctor about this page before you use it, and take their instructions over anything here. In general the seated machines in zone 2 are the usual starting point, because your back is supported and you can't lose your balance. Ask your gym whether they have staff experienced with medically-referred beginners — many do, and it's worth asking on the phone before you join.

**Q:** Do I need a personal trainer?
**A:** No. But one session — just one — is the cheapest shortcut there is, because someone watching your form in person catches things no written guide can. Ask for a single introductory session rather than a package.

**Q:** How do I know how much weight to use?
**A:** The lightest weight that lets you do 8–10 repetitions with control. The last two should feel like work; your form shouldn't change. If you can't finish smoothly, go lighter.

**Q:** How often should I go?
**A:** Two or three times a week with a rest day between is the usual starting point. Turning up twice a week for a month beats a perfect plan you do once.

---

## Footer — shipped

**Links:** My week · Nutrition · Programs · Equipment library · Exercise library · Beginner ·
Intermediate · Advanced · Workout builder · First-day guide
**Honesty line:** No ads. Nothing for sale. No account, no tracking.
**Medical disclaimer (must appear in full):**
> **Please read:** This website provides general fitness education and is not medical advice. It
> has not been reviewed by a doctor or a qualified trainer. If you have an injury or a health
> condition, are pregnant, or your doctor has advised you about exercise, speak to them before you
> start. Nothing written here replaces someone experienced watching what you're actually doing.

**Photo credit:** Photography from Pexels, free to use under the Pexels license.
**Legal:** © 2026 Gym Basics. Free to share.

> **"No tracking" is load-bearing.** Adding analytics means either removing that line or picking a
> cookieless, self-hosted tool and saying so precisely. It is currently literally true — every
> page makes zero third-party requests. Do not quietly break it to answer the two-CTA question.

---

## SEO & metadata — shipped

Every page now carries its own title, description, canonical and OG set — 10 `og:` and 3–4
`twitter:` tags each, all pointing at `https://file.devalla.tech/gym/`. Hosting anywhere else
means a search-and-replace of that base.

**Home — title tag:** Gym Basics — know your gym, train with purpose (46 chars)
**Home — meta description:** Understand every machine, follow structured sessions for beginner,
intermediate and advanced training… (147 chars)

**Nutrition — title tag:** What should I eat? — Gym Basics (31 chars)
**Nutrition — meta description:** Free BMR, TDEE and calorie calculator with a protein target,
read from the training week you actually do — higher on lifting days, lower on rest days.
(150 chars)

*Cut from 234 on 2026-08-13. What went was the tail that never rendered anyway — "Beginner,
intermediate and advanced. Offline, no food diary, no subscription." What stayed is the search
surface (BMR, TDEE, calorie calculator, protein target), the differentiator, and the one concrete
behaviour that makes the differentiator believable. "Worked out from" became "read from", which is
what the page's own lede says.*

**All twelve descriptions now sit within the guideline** — 139 to 160 characters, none over.
Four were trimmed from 163–167 the same day, and two of them got more specific rather than merely
shorter, which is the better trade:

| Page | Was | Now | Change |
|---|---|---|---|
| `equipment.html` | 167 | **140** | Dropped the category list ("cardio, machines, free weights and functional equipment") for the count: *All 30 gym stations*. A number is more use to a reader than a taxonomy, and it is checkable. |
| `exercises.html` | 163 | **139** | *"Every exercise in the programs"* → *"41 exercises"*, same reason. "Beginner-to-advanced variations" → "a version for every level". |
| `week.html` | 167 | **148** | Rebuilt around the site's own framing — *Three questions — your level, your days, your goal*. |
| `builder.html` | 166 | **144** | Phase list collapsed to *"a full session from warm-up to cool-down"*. |

*One thing checked rather than assumed: the builder description claims a cool-down, and a first
grep of `app.js` found only five phases, none of them a cool-down. It does emit one — the phase
number is computed, so the label did not match a naive search. The original claim was accurate and
was preserved.*

**Where the numbers come from:** 30 stations and 41 exercises are the library counts a reader can
verify by counting cards. See the *Specific verifiable claim* row for why the exercise figure is
41 and not the 58 in `data.js`.

**OG image:** the overhead floor map with the three zones labelled. Still communicates "map of a
gym" at thumbnail size — but it now represents a site that is mostly not a map. Worth revisiting.

---

## Self-review

| Dimension | Finding | Fixed? |
|---|---|---|
| **Conversion** | Yes — the ask is "keep reading," and the hero names the exact fear the reader arrived with. Risk is near zero since nothing is sold. | ✓ |
| **Interest (7/10)** | The opening scene and the 12 entries are strong. The "how the weights work" primer is the dullest passage but removes the most Confusion, so it stays — moved above the 12 so it's read once and not repeated per machine. | ✓ |
| **Clarity** | First draft used "reps" and "sets" before defining them. Now "repetitions" is spelled out on first use and sets are defined by example in the 30-minute plan. | ✓ |
| **Expansion** | Etiquette deserved more than a line — it's the #1 objection — so it became its own section with eight concrete rules. | ✓ |
| **Brevity** | Cutting 50% would keep: hero, the 12 entries, the 30-minute plan. The FAQ is the first thing to trim if the page feels long. | ✓ |
| **Disbelief** | Two triggers found and removed: (1) any implication of professional authority — the disclaimer now says plainly that no professional has reviewed it; (2) all health-outcome claims (weight loss, strength gains) — the page promises understanding only, which is the one thing it can actually deliver. | ✓ |

### Re-review after the rebuild (2026-08-13)

| Dimension | Finding | Fixed? |
|---|---|---|
| **Conversion** | The ask moved from "keep reading" to "build my week" — a real commitment, but one that costs nothing and produces something usable in three questions. Stronger than the original ask. | ✓ |
| **Clarity** | The nutrition page was arguing before it was offering: 403px of lede and the first input 982px down. Trimmed, with the action lifted above the fold. | ✓ |
| **Brevity** | Cutting 50% would keep: hero, the level cards, the week planner, the nutrition target. The FAQ and the six-phase spine are the first things to trim. | — |
| **Disbelief** | **A new trigger has appeared.** The site no longer only explains — it prescribes calories and adjusts them from the reader's weigh-ins. The disclaimer language has not caught up with the size of that claim, and the nutrition page's own warning is doing all the work. | ✗ |
| **Voice** | Held. Still plain, still refuses jargon, still says what it does not know — "No plan yet", "one weigh-in is not a trend", "a correction judged on the week it was made is not judged at all". | ✓ |
| **Proof** | Unchanged at zero, while the claims got larger. The gap is wider than it was on 2026-08-07. | ✗ |

**Open questions for the user:**
- **Does the H1 go back to naming the fear?** See *Hero*. The cheapest, highest-effect change on
  the site, and the only editorial decision this document is actively waiting on.
- **Does `Explore equipment` earn its place in the hero?** Unanswerable without analytics, and
  analytics is unanswerable without deciding the "no tracking" promise. Those two are one decision.
- Should the site carry a name and a face, or stay anonymous? A named author with a line of honest
  context ("I was the person who only used the treadmill for a year") would raise trust materially,
  since no other proof exists.
- Is the audience India-specific? `lang="en-IN"` and rupee-free but kirana-based food examples say
  yes; kilograms, centimetres and km/h are used throughout, correct for India and wrong for a US
  audience. Confirm.
- The nutrition meta description needs cutting to ~155 characters.

**Marked ASSUMED, needs validation:**
- The current alternative (YouTube/reels/copying others) — confirm with 3 real beginners.
- "Two or three times a week" frequency guidance — needs the qualified reviewer's sign-off.
- Every technique instruction across 30 stations and 41 exercises is standard, widely-published
  guidance, but **none of it has been checked by a professional.**
- **Every nutrition number** — the RMR equation, the activity multipliers, the session costs, the
  protein-per-kilo figures, the calorie floor, and the correction's ±250/±600 limits — is
  defensible from published work but **has not been reviewed by a dietitian.** The correction
  changes a real person's daily calories on the evidence of their own weigh-ins. This is now the
  single most important item in this document, ahead of the trainer review.
