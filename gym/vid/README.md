# Demo clips

Drop an MP4 in here named after its station id and it appears on the site
automatically — no code change. Nothing renders for a station without one.

## Encoding

Use `encode.sh` — it runs the command below, checks the result against the
400 KB budget, prints the actual dimensions and duration, and tells you the
exact `data.js` line to paste:

```bash
./vid/encode.sh leg-press raw/leg-press.mov 4.5 14
#               station   source            in   seconds
```

Or by hand:

```bash
ffmpeg -ss <start> -i raw/leg-press.mov -t <sec> \\
  -vf "scale=720:-2,fps=25" \\
  -c:v libx264 -profile:v main -crf 27 -preset slow \\
  -movflags +faststart -an \\
  vid/leg-press.mp4
```

`-an` strips audio entirely. `+faststart` lets it stream progressively.
Target under 400 KB per clip. Cue text is HTML over the frame, not burned
in — do not add captions in the edit.

## Registering a clip

Add to the station in `data.js`:

```js
video: { src: "vid/leg-press.mp4", sec: 12 },
```

Optionally override the on-screen cues:

```js
video: { src: "...", sec: 12, segments: [[0,"Adjust the seat"],[3,"Push smoothly"],[9,"Do not lock your knees"]] },
```

## Shot list

Structure every clip the same way: setup close-up, then the movement from
the side, then the wrong version corrected. It loops, so it ends where it
begins.

| Station | id | Target | Setup to show |
|---|---|---|---|
| Treadmill | `treadmill` | 10s | Stand on the side rails |
| Curved treadmill | `curved-treadmill` | 10s | Hold the rails, step on mid-belt |
| Stationary bike | `bike` | 10s | Set the seat to hip height |
| Assault bike | `assault-bike` | 10s | Set the seat like a normal bike |
| Elliptical | `elliptical` | 10s | Step on with the pedals level |
| Rowing machine | `rower` | 14s | Strap your feet in |
| Stair climber | `stair-climber` | 10s | Start at the slowest step rate |
| SkiErg | `skierg` | 10s | Reach tall to start |
| Chest press | `chest-press` | 12s | Set the seat to line up with mid-chest |
| Shoulder press machine | `shoulder-press` | 12s | Set the seat so handles sit at ear height |
| Lat pulldown | `lat-pulldown` | 13s | Set the thigh pads snug |
| Seated cable row | `seated-row` | 13s | Feet on the plate, knees slightly bent |
| Leg press | `leg-press` | 14s | Sit back into the seat |
| Hack squat | `hack-squat` | 13s | Shoulders under the pads |
| Pendulum squat | `pendulum-squat` | 12s | Shoulders under the pads |
| Leg extension | `leg-extension` | 10s | Line your knee up with the pivot |
| Leg curl | `leg-curl` | 10s | Line your knee up with the pivot |
| Pec deck | `pec-deck` | 10s | Set the seat so elbows are shoulder-height |
| Hip thrust machine | `hip-thrust` | 13s | Upper back on the pad |
| Calf raise | `calf-raise` | 10s | Balls of your feet on the edge |
| Dumbbells | `dumbbells` | 10s | Find your weight on the rack |
| Olympic barbell | `barbell` | 10s | The bar alone is 20 kg |
| Weight plates | `plates` | 10s | Carry with both hands |
| Kettlebells | `kettlebells` | 10s | Take the handle with both hands |
| Adjustable bench | `bench` | 10s | Set the backrest angle you need |
| Cable crossover | `cable-crossover` | 13s | Slide each pulley to the height you need |
| Functional trainer | `functional-trainer` | 13s | Slide the pulley to your working height |
| Smith machine | `smith-machine` | 12s | Set the bar to your starting height |
| Power rack | `power-rack` | 25s | Set the J-hooks at collarbone height |
| Squat rack | `squat-rack` | 25s | Set the hooks at collarbone height |

**2 stations need two clips or ~25s** — the racks carry J-hook height,
safety pins, unrack, walkout, reps and re-rack. Do not squeeze that into 10
seconds; it teaches nothing.

Start with the seven the beginner session uses — treadmill, leg-press,
chest-press, lat-pulldown, seated-row, leg-curl, dumbbells — which covers the
whole beginner experience in one 45-minute shoot.

## Pipeline verified — 2026-08-13

Until now nothing had ever run this path against a real file: `vid/` held only
this README and no `data.js` entry carried a `video`. It was tested end to end
in Chromium with a synthetic 14s 720×404 H.264 clip encoded to the settings
above, registered on `leg-press`, then removed. **Everything works — drop an
MP4 in and it appears, exactly as claimed.** What was confirmed:

- the button renders on **only** the station with a clip, with the right
  `aria-label` ("Watch a 14 second demonstration of the Leg press")
- **zero bytes are fetched until it is opened** — `preload="none"` held; the
  first `.mp4` request happened on click, not on page load
- the panel is built from `data.js`: name, numbered steps, beginner
  prescription, common mistake, link to the equipment guide
- the clip plays muted, loops without stalling, and the loop wrap is clean
- **the cue overlay advances through all three auto-derived segments** — setup
  text at 0s, "Correct movement" at `sec × 0.3`, the mistake at `sec × 0.75`
- `prefers-reduced-motion: reduce` opens the panel without autoplaying
- focus lands inside the dialog, Escape closes it, and closing releases the
  video `src` rather than leaving it buffering

Three things worth knowing before the first real clip lands:

1. **Three smoke assertions currently guard the empty state** and will fail the
   moment a clip ships — by design, so nobody adds one silently:
   `no station ships a clip yet`, `so no demo button renders anywhere`, and
   `the button says how long the clip is` (it injects its own `sec: 12`, which
   a real registration overrides). Rewrite those three when the first clip is
   registered; the other twelve demo assertions pass unchanged.
2. ~~**The exercise library cannot show demos.**~~ **Fixed.** `.ex-card` now
   carries `data-ex` and, where the exercise uses one, `data-eq` — so a clip
   filmed once appears in the equipment library, the exercise library and the
   workout rows. 38 of 41 exercises name a station; the three that use none
   are left unnamed and never get a button. The button goes in a new
   `.ex-actions` row beside "Full instructions" rather than being appended to
   the card, where it would have jumped to the bottom on expand. **This means
   every station on the shot list now pays off in three places**, so film in
   the order the beginner session needs rather than by library.
3. **The 400 KB target needs checking against real footage.** The synthetic
   test clip came out at 947 KB for 14s, but noise is the worst case an
   encoder can be handed — a real gym scene at CRF 27 should land far under
   it. Measure on the first clip rather than trusting either number.
