# Gym Basics

A free training platform for beginner, intermediate and advanced gym users. It grew out of a
single-page beginner guide (still preserved as the first-day guide) into a small multi-page site:
a weekly training planner, equipment and exercise libraries, three complete level programs, an
interactive workout builder, and a nutrition layer driven by the training you actually do — with a
live session layer (set check-off, rest timer) that works offline on the gym floor. Static files, no
build step, no dependencies, no tracking.

It answers two questions end to end: **"I'm going to the gym today. What exactly should I do?"** and
**"What exactly should I eat?"**

## Preview

```bash
cd /root/practice/websites/gym-basics
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works. The libraries and the builder are rendered by
JavaScript; everything else works with JS disabled.

## Pages

```
index.html         hero → today's session → level selector → goals → equipment showcase
                   → session spine → featured workouts → libraries → builder → FAQ → CTA
programs.html      the three level programs + the two ways to plan a session
nutrition.html     calorie and macro targets built from your own week, plus what that
                   looks like as food, a BMR/TDEE calculator, and the weight
                   trend that checks the whole thing against reality
week.html          Build my week: level → days → goal → duration → a full seven-day plan
workout.html       one day from that plan, guided set by set (?d=0 … ?d=6)
beginner.html      full guided machine session (6 phases) + first-4-weeks roadmap
intermediate.html  push/pull/legs split with a fully guided push day + progression rules
advanced.html      guided lower-body strength day, 5-day week, intensity techniques
equipment.html     30 stations, searchable, filterable by zone and muscle
exercises.html     41 exercises with full instructions, filterable by muscle/level/equipment
builder.html       level + goal + muscles + duration + equipment → structured session
guide.html         the original first-day content: floor map, weights primer,
                   first 30 minutes, etiquette, what to bring
```

## Files

```
styles.css   design system shared by all pages
data.js      the database: 30 equipment entries + 58 exercises, and the weight
             ladders each station steps in (single source of truth)
plan.js      training engine — exercise selection, split templates, week generation
app.js       nav, scroll reveal, library rendering, filters, workout builder
week.js      the planner UI: wizard, seven-day view, guided day, today card
nutrition.js the nutrition engine — RMR, what a session costs, macros, weight trend
foods.js     the food database: Indian staples per real serving + the meal shapes
nutrition-ui.js  the nutrition UI: profile, today's numbers, week strip, trend
demo.js      equipment demo panel — short clip + numbered steps (see vid/README.md)
session.js   live session layer: set check-off, rest timer, progress, offline
lift.js      load logging, per set — weight, reps and how it felt for each set,
             what to try next, CSV export
progress.js  progressive overload — that log read week by week, and whether it moved
plates.js    what to hang on the bar — under the kg box, and in the equipment library
sw.js        service worker — caches the whole site for the gym floor
manifest.webmanifest  installable to a phone home screen
smoke.js     jsdom smoke test (needs jsdom; the site itself has no deps)
fonts/       Rubik (body), Barlow Condensed (display), IBM Plex Mono (training data)
img/         real equipment photography from Pexels (WebP) — see img/SOURCES.md
vid/         short demonstration clips — shot list, encode.sh and the verified
             pipeline notes in vid/README.md (no clips shot yet)
assets/      favicon, PWA icons, Open Graph image
copy-doc.md  the copy, as shipped — every page, plus the open editorial decisions
audit.md     100-point audit of index.html and nutrition.html, current
```

## Build my week

The planner is the spine the rest of the site now hangs off. Answer four questions —
level, days you can train, goal, session length — and `plan.js` generates a complete week:
which days you train, what each session is, and which days you deliberately don't.

```
Equipment library → Exercise library → plan.js → your week → today's workout
```

- **The split follows the level.** Beginners get full-body sessions, because that is how
  movements get learned. Intermediate and advanced weeks run upper/lower or push/pull/legs.
- **The goal changes the training, not just a label.** Strength moves main lifts to 5–8 reps
  with three-minute rests; fat loss and endurance move to 12–15 with short rests and add a
  conditioning finisher. Selection is goal-weighted too.
- **More days is not automatically better.** A beginner asking for six days gets four lifting
  sessions plus cardio and active recovery, and the planner says so before generating.
  Level 1 has 14 main+accessory exercises — six lifting days would just repeat them.
- **Rest days are part of the plan**, with recovery suggestions, not gaps between the real days.
- **Weeks progress.** Week 1 learn, week 2 same weights better reps, week 3 one extra set on
  the main lifts, week 4 add load where all sets felt smooth. Rows show what changed. Nothing
  gets heavier automatically — but `lift.js` now knows what "smooth" was and what the weight
  was, so week 4 arrives with the number already on the row. See **What you lifted** and
  **Progressive overload**.
- **Regenerate** keeps your level, days and goal and varies the exercises. **Edit plan**
  reopens the wizard.

The generated week is stored, so Monday's session doesn't quietly change between visits.
`index.html` shows today's card at the top; `workout.html?d=N` is the guided session.

## Nutrition

Every calorie calculator asks you to pick an activity level from a dropdown, which is the one number
in the whole calculation nobody can answer honestly. This one doesn't ask. `nutrition.js` reads the
week `plan.js` already generated and costs each day from what is actually in it — the blocks, their
real set counts, their real rest periods.

```
your body ─┐
           ├─→ RMR ─→ + living ─→ + today's session ─→ × goal × level ─→ target
your week ─┘              ▲                  ▲
                     your day job     gb:sets:week:…  how much of it you've ticked off
```

- **Five questions, once.** Weight, height, age, sex, and what your days are like outside the
  gym. Everything else is derived. Stored in `localStorage` with the rest of it, and deletable
  from the page.
- **Training level is never asked for.** It comes from the plan `plan.js` already holds, so the
  nutrition cannot disagree with the training. Change your level on `week.html` and every number
  here moves with it.
- **Life outside the gym is asked for**, because it is the one thing the plan genuinely cannot
  know — a site engineer and a software engineer of the same weight on the same programme are
  600 kcal apart. It is asked as a question about your day ("desk job, mostly sitting") rather
  than as "lightly / moderately / very active", which is the phrasing nobody can answer honestly
  about themselves.
- **Training days are fuelled above rest days**, by the amount that session actually costs — a
  90-minute advanced day is worth about 330 kcal, a 30-minute beginner one about 110.
- **Rest between sets is costed separately and much lower** than time under load. Charging a
  strength day's three-minute rests at the lifting rate would claim it burns half again what a
  hypertrophy day does purely for standing around longer. It doesn't.
- **The set ticks feed back in.** Start a session and the page reports how much of the day's bump
  you have earned so far. The target itself doesn't shrink while you train — a number that fell as
  you worked would just teach people to stop ticking.
- **Skipped sessions are named.** If the week is half done, it says what the missed sessions were
  worth rather than quietly assuming the plan happened.
- **Protein is set per kilo of bodyweight, by goal and by level** — 1.6 g/kg for a beginner
  building, 2.2 for an advanced one, 2.4 in an advanced deficit. It goes *up* in a deficit, which
  is when it is doing the most work. Telling a beginner to eat 2.2 g/kg is how people decide the
  gym is expensive and stop going. Fat has a floor. Carbohydrate takes the remainder, so it rises
  on lifting days on its own.
- **A floor no goal can argue with** — the deficit maths is not allowed to prescribe less than
  RMR × 1.05, or 1200/1500 kcal.
### The same beg / int / adv split the exercises use

`data.js` gives every exercise a `beg`, `int` and `adv` note, because what matters changes at each
stage. Nutrition works the same way, and the page carries the note for your level.

| | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Protein, building | 1.6 g/kg | 1.9 g/kg | 2.2 g/kg |
| Protein, cutting | 1.8 g/kg | 2.1 g/kg | 2.4 g/kg |
| Surplus to build | +8% | +10% | +6% |
| Deficit to cut | −15% | −20% | −22% |
| Meals a day | 3, plus one after training | 4 | 5 |
| What actually matters | Consistency, not precision | Pick a direction and hold it | Timing and recovery |

The surplus is **tightest at advanced, not largest**, and that is deliberate. A beginner gains
muscle faster than they ever will again and can often add muscle while losing fat, so a big
surplus at that stage is mostly fat. An advanced lifter gains so slowly that a large surplus is
also mostly fat, for the opposite reason. It is the intermediate — past the free gains, far from
the ceiling — who needs the most deliberate surplus.

Meal count is a level decision too. A beginner handed a five-feed schedule quits in a fortnight
and concludes the gym is for other people; three meals and something after training is the version
that survives contact with a job. The extra feeds only earn their keep once total protein is high
enough that landing it in four sittings is a chore.

- **Then the food.** `foods.js` turns the day's numbers into four meals of things sold in a normal
  kirana — dal, curd, paneer, chana, eggs, chicken, rice, roti. Nothing is served twice in a day,
  the seed varies it across the week, and vegetarian and egg-only diets are honoured. It is one
  worked example of the shape, not a diet chart, and the page says so. Rounding to whole rotis and
  half-katoris lands within about 10% of the target rather than exactly on it.
- **The scale is the referee.** Log your weight weekly and it compares the actual trend against the
  band the goal implies, then says which way to move. Every number above it is an estimate; this is
  the only measurement. The trend is a least-squares fit over the last four weeks, not the first
  and last weigh-in — one bad morning should tilt the line, not define it — and the scatter around
  that line is reported, so a noisy log is called noisy rather than read as a stall.

### The correction

The trend is only worth having if it can change something. Mifflin-St Jeor is a population average,
the NEAT multiplier is a guess about your day, and the MET table costs a session it never watched;
any of them can be 200 kcal out for one person, and for that person the whole page is quietly wrong
for as long as they use it. Weight moving outside the goal band over a fortnight is a direct
measurement of how wrong the estimate is — 7,700 kcal to the kilo — so `correction()` in
`nutrition.js` turns it back into calories and offers the fix under the trend.

```
weigh-ins ─→ fitted rate ─→ gap to the goal band ─→ ×0.6, rounded to 25, capped at ±250
                                                          │
                                            applied to MAINTENANCE, not to the target
```

- **It lands on expenditure, not on the target.** Correcting maintenance from 2,600 to 2,400 makes
  a 20% cut 1,920 rather than 2,080. Correcting the target instead would leave the percentage
  sitting on a number known to be wrong, and would have to be thrown away every time the goal
  changed. Estimate error is a fact about the person, not about what they are trying to do, so this
  one survives a goal change.
- **It aims a quarter of the way into the band and takes 60% of the gap** — chasing the centre
  overshoots, and an overshoot reads on the scale a fortnight later as the opposite problem.
  ±250 kcal per step, ±600 in total, ever.
- **It needs fresh evidence since the last change.** Applying a correction restarts the clock;
  weigh-ins from before it describe the old target. Judging a change with data that predates it is
  how a number ends up moving every time the page is opened.
- **Nothing is applied automatically.** The button says what it will do in calories and shows the
  target before and after; the maths block then owns up to the row in the reader's own weigh-ins,
  and there is an undo. `plan.js` never adds weight to a bar on its own — a page that quietly
  re-cut your calories overnight would be the one thing here that changed your numbers without
  asking.
- **A correction the floor would swallow is never offered.** A cut already sitting on the floor is
  told to add training instead, which is where the answer actually is. A button promising 250 kcal
  that delivers 25 is worse than no button.
- **One correction, everywhere.** The homepage fuel card, the week strip and the calculator all
  read the same stored figure, so nothing on the site can disagree with anything else. Deleting
  your details deletes the correction with them.

### The calculator

The rest of the page answers *what should I eat today*. The calculator at the bottom answers
*what would I eat if* — five days instead of three, ten kilos from now, a different job — and
saves nothing unless asked.

```
BMR                      1,643    asleep all day, burning nothing else
Maintenance · rest       2,054    living, no session
Maintenance · training   2,192    living, plus the session
Target · rest            2,220    +8% for build muscle
Target · training        2,365    the day you lift
Week average             2,285    3 training days, 4 off
```

It runs the same engine on a throwaway plan from `plan.js`, so it can never drift from the real
numbers above it. **BMR and maintenance are named as such** — the page's own voice calls them
resting and living, but these are the words people arrive already knowing, and a calculator that
renames them is a calculator nobody trusts.

Because the size of the surplus or deficit now depends on level, none of the goal copy states a
percentage of its own; the figure is shown beside it instead. A note reading "a 20% deficit" next
to a row reading −22% is worse than no note.

Nothing here is a subscription, an account, or a food diary, and nothing leaves the device.

### Focus mode

On `workout.html`, **Focus mode** collapses the session to one exercise at a time — big
type, big set buttons, prev/next, arrow keys and Escape. It is the same rows and the same
state as the list, only the CSS changes, so nothing can drift between the two views.

## Using it during a workout

The three program pages, the builder's output and every generated day are not just tables to read —
`session.js` turns every numbered exercise row into something you can operate
one-handed between sets:

- **Tap each set off** as you finish it. The row fills in when all its sets are done.
- **The set you tap is the set on screen.** The dots say two different things at once — filled
  means you did it, ringed means the boxes below belong to it. Tapping a set that is *already*
  ticked and *not* on screen only brings it up, so going back to fix set 1's weight cannot throw
  away the fact that set 1 happened; tap it again, now that it is selected, and it un-ticks. One
  tap per set on the way up, and a mis-tap is still one tap to undo.
- **The rest timer starts on its own** when you complete a set that has rest after it
  (`rest 90s` in the row is where the number comes from). Pause, ±time, or skip from
  the bar; it chirps and vibrates at zero.
- **Progress and the timer live in one sticky bar** at the bottom. On phones it replaces
  the "Start workout" button once the session is under way.
- **It survives** navigating between pages and closing the tab — a running rest timer
  picks up where it left off. The screen is kept awake while a timer runs.
- **Reset** clears the session.

Rows indexed `·` rather than a number (pre-gym, recovery) are advice, not sets, and are
deliberately left alone.

## What you lifted

`plan.js` already tells you what week 4 is for: *where all sets felt smooth, take the next weight
up*. Until now nothing on the site could tell you what the previous weight **was**, or whether it
felt smooth — so the instruction was unfollowable, which is the polite way of saying it was
decoration. `lift.js` logs both, and puts last week's number on the row in front of you while you
decide today's.

```
Dumbbell bench press   3 × 8–12   [1] (2) [3]        ← ringed: the set on screen

                       SET 2 OF 3   ✓ DONE
                       WEIGHT            REPS
                       [ 25 kg      ▾ ]  [ 10        ▾ ]
                                         target 8–12
                       [ Easy ][ Right ][ Hard ]
                       last time 22.5 kg × 10 · felt right · try 27.5
```

- **Pick, don't type.** Weight and reps are dropdowns, one per set — see the two bullets below on
  where the numbers in them come from.
- **Every set is its own record.** The first version kept one working weight per exercise per
  session, on the grounds that this is how people talk about it ("three by ten at eighty"). It was
  wrong: a set is where a weight actually happens, and anyone climbing 10 → 12.5 → 15 across three
  sets — or dropping the last one because form went — was handed a single box that quietly
  overwrote what they had already typed. The model is now

  ```
  exercise → sets[] → { w, r, rpe }
  ```

  and the exercise-level figures are **derived** from it, never typed: the day's weight is its
  heaviest set, how the day felt is how *that* set felt, the reps recorded are the ones it got, and
  `vol` is the day's real tonnage. So there is one answer to "what did you lift today" with the sets
  underneath it, and `progress.js`, the progression line and the export all keep reading the same
  fields they always did.
- **A set opens on what that same set lifted last time**, so the common case — the week you repeat
  a weight — costs no taps at all. Set 3 opens on set 3, never on set 1: people go up and down
  across a session, and set 2's box is not the place to find out what set 1 weighed. A lift with no
  history opens on `Select weight`, because there is nothing honest to put there.
- **A suggestion is shown, not recorded.** It is drawn dashed and labelled `from last time`, and it
  becomes a record at the moment it is earned: when the set is **ticked off**, or when the picker is
  changed. Writing it on sight would put a weight in the log that nobody had lifted yet — and the
  log is the thing `progress.js`, the CSV and every "best yet" read. Ticking straight down a row
  (1, 2, 3) records each set from **its own** history, including sets whose panel was never opened.
- **Clearing it means clearing it.** Choosing the prompt back empties that set and stops last
  week's weight reappearing on the next repaint — and ticking a set you deliberately cleared
  records nothing. The rung stays marked `20 kg · last time` in the open list, for finding the way
  back to it; the mark comes off whichever option is currently showing, where it would only be
  clutter in a 141px box.
- **Reps are what you got, not what was asked for.** The list runs 1–20 and then 25, 30, 35, 40,
  50; the number you pick is what actually happened, and it is what `progress.js` compares week to
  week — "8–12" in both weeks says nothing about either.
- **Ticking a set and logging a set are different facts.** Un-ticking a set, or resetting the whole
  session, leaves the log alone: the ticks are session state, the weights are history.
- **How it felt is three buttons, not a 1–10 scale.** Easy, Right, Hard — *went up smoothly*,
  *hard but every rep was clean*, *form started going*. Easy turns into a number: the next weight
  up. Hard says stay. Right says nothing, because nothing needs to change.
- **You pick, you don't type.** A number keyboard mid-set needs two hands and a look down; a
  native `<select>` needs a thumb, and the phone gives it a full-height wheel for free — along with
  keyboard and screen-reader support nothing hand-built would have had. 48px targets throughout.
- **The ladder belongs to the equipment**, and lives in `data.js` beside the machine it describes.
  `LOADS` holds a default per kit; a station whose stack disagrees carries its own `load`, and an
  exercise may override its station in turn. Segments are `[from, to, step]`, because a rack does
  not step evenly all the way up:

  ```
  dumbbells   2.5 … 30 by 2.5, then to 50 by 5
  barbell     20 (the bar) … 60 by 2.5, then to 200 by 5
  machine     5 … 100 by 5, then to 150 by 10
  leg press   20 … 100 by 10, then to 400 by 20      ← nobody presses 62.5
  kettlebells 4 … 24 by 2, then to 48 by 4           ← the sizes they are cast in
  ```

- **`+ Custom weight`** sits at the bottom of every weight list for the stack nobody else has. It
  opens a box in place, commits on change, and backs out on Escape or empty — and the number then
  joins that list, in the right place on it, so it is one tap next time. A weight that arrives from
  history off the ladder is slotted in the same way rather than dropped.
- **The jump follows the equipment.** *Take the next weight up* now means **the next rung this
  station actually has** — 70 after 60 on a leg press, 22.5 after 20 on dumbbells. The old
  muscle-based rule (5 kg for legs, glutes, back and full-body, 2.5 for everything else) survives
  in `step()` as the fallback for a lift already sitting at the top of its ladder. A suggestion the
  dropdown cannot offer is not a suggestion.
- **Target and actual are different fields.** The prescription sits under the reps picker as
  `target 8–12` and is never an option in it; what you choose is what you got. `8–12` cannot be
  selected as a rep count, because it is not a rep count.
- **Last week's weight is the placeholder, never the value.** The box starts empty. A prefilled
  number is a number that gets left there on a day you didn't earn it.
- **Nothing that isn't loaded gets a box.** Planks, dead bugs, hanging knee raises and anything
  marked `kit: "bodyweight"` are skipped, as are time-based rows (`5 min easy`) and the `·` advice
  rows. A kg field on a treadmill walk is clutter on the row and a lie in the history.
- **Beating your best is called out** and nothing else is. No streaks, no badges, no chart of a
  number that is supposed to go up forever. "Best yet" means **today's heaviest set beats every
  session before it** — not the entry you are typing into, which would flag itself, and not the
  selected set, which would flag set 3 for outweighing set 1.
- **It is the same history everywhere.** The written programmes now carry `data-ex` alongside
  `data-eq`, so a weight logged on `beginner.html` is the same record the builder and the generated
  week read back. Two stations carry a single lift with no exercise entry of its own (hack squat,
  standing calf raise); those rows key on the station instead, so they are loggable too.
- Eighty sessions are kept per exercise, and nothing leaves the device.

Like `demo.js`, this is an enhancement layered over whatever `session.js` has already built, so
with JavaScript off the rows render exactly as they always did.

### What goes on the bar

On a machine the number in the kg box is the number on the stack and there is nothing to work out.
On a barbell it isn't: 80 kg is a 20 kg bar and 30 kg a side, and a beginner doing that arithmetic
at the rack while somebody waits is a beginner who loads it wrong or picks a rounder number than
they meant to. `plates.js` puts the answer under the box as you type.

```
Barbell back squat   4 × 5–8   [ 80 kg ] [ Easy · Right · Hard ]
                     20 kg bar + 25, 5 a side
```

- **Barbell rows only.** Anything with `kit: "barbell"`, plus rows keyed to the barbell, power rack
  or squat rack. Smith machines are deliberately excluded — the carriage is counterweighted and no
  two are the same, so a breakdown would be a confident guess. Plate-loaded sleds are out for the
  same reason: nobody publishes what the carriage weighs.
- **It only knows the plates the equipment library does** — 1.25 to 25 kg, exactly what
  `data.js` tells people is on the rack.
- **A weight the plates cannot make says so.** 61 kg comes back as *20 kg bar + 20 a side · 1 kg
  short* rather than quietly rounding to 60 and letting you believe otherwise.
- **The bar is a setting, not an assumption.** 20 kg is the default because that is what these
  programmes assume, but 15, 10 and 7.5 are there — a woman handed a 15 kg bar should not be told
  she is lifting 5 kg more than she is. Set it once in the **Weight plates** card in the equipment
  library and every barbell row follows it.
- **The standalone calculator lives in that card**, which is where somebody who does not yet know
  what a bar weighs is already standing.

### Progressive overload

`lift.js` answers *what did I do last time*, which is the question you have at the rack. The one
you have at home is *am I actually getting stronger*, and a log that can only be read one row at a
time cannot answer it — which is how somebody does 20 kg for four months and calls it training.
`progress.js` reads the same history back as a line, on `week.html`.

```
Chest press                                      25 kg
week 1   20 kg · 3 × 10      first logged
week 2   22.5 kg · 3 × 10    +2.5 kg
week 3   25 kg · 3 × 10      +2.5 kg
week 4   25 kg · 3 × 12      +2 reps
```

- **Overload is not only load.** Week 4 above added nothing to the bar and is still progress; a
  tracker that only watches the kg column would call it a plateau and tell somebody who is
  progressing to push harder. Heavier is checked first, then reps, then sets — the order a lifter
  asks it in — and `held` is a real answer that is not dressed up as one of the others.
- **Reps done beat reps prescribed.** Where both weeks logged their sets one by one, the comparison
  uses `ar` (what the top set actually got) and the row shows that number; where they didn't, it
  falls back to the prescription's midpoint. Two weeks both reading `8–12` say nothing about either.
  The stall check uses the day's real tonnage (`vol`) for the same reason — otherwise a week that
  added a rep on every set would be reported as three weeks of nothing.
- **One row per week, not per session.** The week is represented by its **heaviest session**, and
  by the most work at that weight if there were two. Averaging a heavy day with a light one
  describes a session nobody had, and summing the two makes a twice-a-week block look like progress
  over a once-a-week one when nothing got heavier.
- **Weeks run Monday to Sunday** and are numbered from the first one logged for that exercise, so
  a Sunday session belongs to the week it finished.
- **A missed week is shown as a missed week.** Numbering jumps and the row says `2 weeks off`. A
  gap closed up silently turns a broken month into a smooth climb.
- **Three weeks with nothing added is called a stall**, with the number of weeks, the weight, and
  the jump this lift actually moves in — `GBLift.step()`, so 5 kg on legs and back, 2.5 elsewhere.
  Everything shorter is left to the rows, because two identical weeks is normal.
- **Unless the last one felt hard**, in which case it says hold. Telling somebody whose form was
  going to add weight is the one piece of advice here that could hurt them.
- **A weight is what makes a session.** Tapping *Easy* without putting a number in the box logs how
  it felt but does not draw a point — the line is of load, and a point with no load is a guess.
- The sparkline is **decoration for the numbers beside it**: `aria-hidden`, no axis, and a flat log
  draws a flat line rather than being normalised into a climb.
- It **reads what `lift.js` stores and writes nothing of its own**, so there is no second copy of
  the history to disagree with the first.

### Getting it out

A log you cannot read anywhere else isn't a record, it's a hostage. The **What you lifted** block on
`week.html` downloads the whole history as a spreadsheet: one row per exercise per day, oldest
first, with the date, weight, sets, reps and how it felt.

```
date,exercise,exercise_id,weight_kg,sets,reps,felt,sets_detail
2026-01-01,Leg press,leg-press-ex,80,3,8–10,hard,1: 70×10 easy | 2: 80×8 right | 3: 80×6 hard
2026-01-02,Barbell back squat,barbell-squat,100,4,5–8,easy,
```

- **The button only appears when there is something to download**, with a count of what's in it.
  An export button over an empty log is a promise the page can't keep.
- **The name exported is the one it was logged under**, read off the entry rather than looked up
  now, so a lift that later leaves `data.js` still exports as itself.
- **UTF-8 with a byte-order mark and CRLF endings**, so the en-dashes in `8–10` survive being
  opened in Excel.
- **`sets_detail` is appended, never inserted.** The seven columns that were there before still mean
  what they meant, so anything already reading the file goes on working; the sets arrive as an
  eighth, numbered (`1:`, `2:`, `3:`) so a set that was skipped cannot be read as the one after it.
  Sessions logged before sets existed leave it empty rather than inventing one.

All of this is progressive enhancement: with JavaScript off, every page still renders
and reads exactly as it did before. State lives in `localStorage` and never leaves the
device, so the footer's "no tracking" promise stays literally true.

## Offline

The site installs to a phone home screen and works with no connection — which is the
normal state of a gym basement. `sw.js` precaches the shell (all pages, CSS, JS, fonts)
on first visit and caches photos as they are seen, so a first load doesn't pull the
whole image folder down a bad connection.

**Bump `VERSION` in `sw.js` whenever a shell file changes**, or returning visitors keep
the old cached copy.

## Navigation

Six destinations, and no more:

```
Programs · Nutrition · Equipment · Exercises · First day          [ My week ]
```

Nutrition is the only destination added since the consolidation from eight, on the grounds that
"what do I eat" is a peer of "what do I train" rather than a sub-page of it. Six is the ceiling.

`programs.html` holds the three level programs and the two ways to have a session planned
for you — the week planner for an ongoing plan, the builder for one session right now. The
levels and the builder used to sit in the header directly, which put eight destinations up
there. The footer still links everything.

## Equipment demos

`demo.js` opens a short silent clip plus the numbered steps, the beginner prescription and
the common mistake — in a panel over the workout, so **you never leave the session to look
something up**. Any element carrying `data-eq` (a station) or `data-ex` (an exercise, which
is followed to its station) gets the button, which covers program rows, generated plans,
builder output, the equipment cards and — since 2026-08-13 — the exercise cards, which
carry both and reach the demo through the station their exercise uses. So a clip filmed once
appears in both libraries. 38 of the 41 exercises name a station; the three that use none
(bodyweight and cardio work) are correctly left unnamed and never get a button.

Placement follows the surface: workout rows put it with the set buttons, equipment cards
float it over the photo, exercise cards put it in the `.ex-actions` row beside "Full
instructions" — deliberately, because appending it to the card would park it after the
collapsed detail and make it jump to the bottom the moment anyone expanded the card.

**The button only renders for a station that has a clip.** With `vid/` empty the site looks
exactly as it did, and each MP4 you add lights up on its own. `vid/README.md` has the shot
list, per-station target durations, the encode command and `encode.sh`, which runs it and
checks the result against the size budget. **The whole path is verified end to end** — see
that file; the plumbing had never been run against a real MP4 until it was tested with one.

Cue text is HTML positioned over the frame and timed to `timeupdate` — not burned in — so it
stays editable, scales with the viewport and is readable by a screen reader.

## Design

Athletic system built on the original's deep blue: dark "gym floor" bands (hero, level
selector, session spine, CTAs) on a light ground; Barlow Condensed caps for display type;
IBM Plex Mono for sets/reps/rest — the workout-log voice; a blue → amber → red heat scale
coding the three levels. All photos carry one CSS grade (`saturate/contrast`) so mixed stock
reads as one shoot. The floor map from v1 survives as the signature of the first-day guide.

Photos are WebP, sized to how they actually render — 900px for cards (a 3-column grid in a
1152px content box is ~362 CSS px, so this covers 2× on a phone) and 1600px for the hero.
That took the site from 6.1 MB to 2.4 MB.

All 30 stations carry a photo as of 2026-08-14. The last two holdouts — hip thrust machine and
pendulum squat, which no free-licensed library had — were supplied by the site owner and are the
only two images not from Pexels; they are also the only two below the 900px convention (488px and
316px, their native size — upscaling would add bytes, not detail). `img: null` remains a supported
state: such a card renders the typographic tile directly, no request goes out. The `onerror`
fallback in `app.js` stays as the net for a photo that is named but fails to load. See
`img/SOURCES.md`.

## Content model

Everything the libraries and builder show lives in `data.js`. Each equipment entry carries
what/muscles/how, level-specific use and a common mistake; each exercise carries position,
movement, breathing, per-level set/rep/rest prescriptions, mistakes, cue, level variations
and safety notes. Edit there, and every page updates.

## Copy and metadata

`copy-doc.md` is where the copy lives — every page as shipped, the objection each block answers,
and the editorial decisions still open. It is the place to argue about wording; this file is the
place to find out how it is wired.

- **Every meta description sits between 139 and 160 characters.** Search engines truncate around
  there, so anything longer is writing nobody reads. The nutrition page was 234 — roughly its last
  third never rendered — and four others sat at 163–167. All twelve are now within the guideline.
  Check the count when editing one; it is the easiest thing on the site to quietly break.
- **Two descriptions carry a number rather than a list.** *All 30 gym stations* and *41 exercises*
  replaced a taxonomy and a vague "every exercise in the programs". If the libraries grow, these
  two strings and the *Specific verifiable claim* row in `copy-doc.md` have to move together.
- **41, not 58.** `data.js` holds 58 exercises, but 17 are warm-up and cool-down furniture the
  library filters out (`role === "warmup" || role === "cooldown"`). 41 is what a reader can count
  on the page, so 41 is the number that may be claimed anywhere public.
- **The nutrition page's opening order is deliberate and measured**, not stylistic. Headline, three
  sentences of lede, then the `Work out my target ↓` button — all above the fold on a 375×812
  phone, with the first question's answer buttons at 753px. It used to run ~100 words of lede with
  the first input at 982px, entirely out of sight. If that copy grows back, the action falls off
  the screen again. The sentences that were cut are not lost: they sit below the form as
  `.nutri-how`, where they describe a target the reader can already see.
- **Titles, canonicals and OG tags are per page**, all pointing at `https://file.devalla.tech/gym/`.
  **`smoke.js` now enforces the length rule** — it fails if any description exceeds 160
  characters or falls under 110, so this cannot drift again by eye. `nutrition.html` was also
  missing from that test's page list entirely and has been added.

## Before publishing

Still open:

1. **Get a qualified trainer or physiotherapist to review the exercise instructions.**
   Nothing here has been professionally reviewed; the footer disclaimer says so plainly.
2. **Get a registered dietitian to review the nutrition engine and the food values**, the same way
   the exercise instructions need a trainer. `nutrition.html` carries its own warning covering
   pregnancy, under-18s, diabetes, kidney and liver disease and disordered eating — keep it there.
   This matters more since the correction shipped: the page no longer only *estimates* someone's
   calories, it *changes* them on the evidence of their own weigh-ins.
3. **Get the exercise instructions reviewed before shooting any demo clips.** Video gets imitated
   literally in a way text does not. `demo.js`, the cue overlay and `vid/README.md`'s shot list are
   all in place, but no entry in `data.js` carries a `video` yet, so the button renders nowhere.
4. The footer promises "no tracking" — keep it true if adding analytics.

Done, but keep true:

- **`audit.md` is current** as of 2026-08-13 and covers both `index.html` and `nutrition.html`,
  measured in real Chromium. Its seven mechanical findings were fixed the same day; what remains
  in it needs a decision or a qualified person, not a patch.
- **Canonical and og URLs** are set per page to `https://file.devalla.tech/gym/…`. Hosting anywhere
  else means a search-and-replace of that base across `*.html`.
- **The server compresses.** `encode zstd gzip` is in the `/gym` block of `/etc/caddy/Caddyfile`;
  without it `styles.css` alone ships 71 KB instead of 15 KB.
- **The service worker is registered from `app.js`**, which every page loads. It used to live in
  `session.js`, which meant `nutrition.html` never registered it. Don't move it back.
- **The three above-the-fold faces are preloaded and set to `font-display: optional`.** That pairing
  is what keeps CLS at zero — dropping either half brings the swap-reflow back.
- **Heading levels are correct on all twelve pages** — one `h1`, no skipped levels, checked with
  cards expanded and plans generated as well as at rest. Library cards are `h2` because each is a
  top-level item of its page; the homepage equipment strip stays `h3` because it sits under its
  own `h2`. If you add a card grid, give it either an `h2` section heading or `h2` cards.
- **A library re-render announces itself.** `renderEq()` and `renderEx()` in `app.js` wipe the
  grid and rebuild every card, which throws away the enhancements `demo.js`, `plates.js` and
  `lift.js` hang off the old nodes. Both now dispatch `gb:rows`, which those three already
  listened for and nothing had ever sent — the visible symptom was the plate calculator
  disappearing the first time anyone used a filter, and the latent one was that a demo clip added
  to `vid/` would stop lighting up after a search. If you add another enhancement to library
  cards, listen for `gb:rows` and it will keep working.
- **The working docs are not part of the site.** `README.md`, `copy-doc.md`, `audit.md`,
  `vid/README.md`, `img/SOURCES.md`, `smoke.js` and the `planing*` notes sit in this folder because
  they belong beside the code, and Caddy serves the folder directly — so the `/gym` block in
  `/etc/caddy/Caddyfile` 404s `*.md`, `*.sh`, `/smoke.js` and the planning notes ahead of
  `file_server`. Any new doc dropped in here is covered if it is Markdown or a shell script, and
  needs adding to that matcher if it is neither. `vid/encode.sh` was served publicly for exactly
  as long as it took to notice — check a new file's URL before assuming it is private.

## Testing

`smoke.js` covers the library filters, six builder combinations, the whole live session
layer, load logging and its progression suggestions, the week engine across every level/days/goal
combination, the nutrition engine and its food shaping across all three diets and all three levels,
the weight trend and the correction it argues for — engine and page both — per-set tracking (the
whole thirteen-step switch-between-sets sequence, plus 2-, 3- and 4-set rows, ticking versus
logging, and reset), the progressive-overload tracker (week grouping, what counts as progress, the
stall rule), the header IA, social tags and description lengths, image weight, and the demo plumbing
on both the equipment and exercise libraries — **679 assertions**, all passing as of 2026-08-14.
It needs
jsdom, which is deliberately *not* a dependency of the site:

```bash
python3 -m http.server 8000 &
npm i jsdom && node smoke.js http://localhost:8000
```

Run it after touching `app.js`, `session.js`, `lift.js`, `progress.js`, `nutrition.js` or `foods.js`.
`session.js` and `lift.js` now share a boundary — session.js owns which set is selected and whether
it is ticked (`GBSession.count/selected/select/isDone`, and a `gb:set` event on the row), lift.js
owns what is in it. Changing either side means running both sections.
