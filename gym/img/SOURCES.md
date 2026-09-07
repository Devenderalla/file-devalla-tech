# Photo sources

All photography is real (non-AI) stock from Pexels, free to use under the
[Pexels license](https://www.pexels.com/license/). Attribution is not required
but the source photo IDs are recorded here so images can be re-downloaded at
any size via `https://images.pexels.com/photos/<id>/...jpeg?auto=compress&cs=tinysrgb&w=<px>`.

| file | pexels photo id |
|---|---|
| hero.jpg | 20418606 |
| level-beginner.jpg | 4944954 |
| level-intermediate.jpg | 7289250 |
| level-advanced.jpg | 1552103 |
| eq-treadmill.jpg | 31012865 |
| eq-curved-treadmill.jpg | 1954524 |
| eq-bike.jpg | 19254701 |
| eq-assault-bike.jpg | 6390237 |
| eq-elliptical.jpg | 4842734 |
| eq-rower.jpg | 7690214 |
| eq-stair-climber.jpg | 31012859 |
| eq-skierg.jpg | 9545914 |
| eq-chest-press.jpg | 3838937 |
| eq-shoulder-press.jpg | 3837293 |
| eq-lat-pulldown.jpg | 37208480 |
| eq-seated-row.jpg | 18060085 |
| eq-leg-press.jpg | 37570727 |
| eq-hack-squat.jpg | 11191173 |
| eq-leg-extension.jpg | 19722966 |
| eq-leg-curl.jpg | 28731788 |
| eq-pec-deck.jpg | 3838926 |
| eq-calf-raise.jpg | 11191177 |
| eq-smith-machine.jpg | 5327534 |
| eq-dumbbells.jpg | 19025674 |
| eq-barbell.jpg | 19025673 |
| eq-plates.jpg | 32610334 |
| eq-kettlebells.jpg | 14502821 |
| eq-bench.jpg | 7289250 |
| eq-cable-crossover.jpg | 19254704 |
| eq-functional-trainer.jpg | 5769127 |
| eq-power-rack.jpg | 19025671 |
| eq-squat-rack.jpg | 13106591 |

## The last two stations — not from Pexels

| file | source |
|---|---|
| eq-hip-thrust.webp | supplied by the site owner, 2026-08-14 |
| eq-pendulum-squat.webp | supplied by the site owner, 2026-08-14 |

Hip thrust machine and pendulum squat had no usable photo on Pexels, and none on
Openverse either (searched 2026-08-12: "hip thrust machine" returned nothing,
"pendulum squat" returned two photographs of a church interior). They stayed
`img: null` until the site owner dropped two JPEGs into `pics/` on 2026-08-14;
those were converted to WebP here and wired into `data.js`.

**Their licence is unrecorded.** Every other file in this folder is Pexels stock
under a licence that permits commercial use; these two arrived without a source,
so they are not covered by the statement at the top of this file. Confirm the
rights before this site is used commercially, or replace them.

They are also the only two below the 900px convention — 488×628 and 474×316,
near their native size. They are not upscaled, which would add bytes and no
detail; at roughly 1× on a phone they are visibly softer than the rest of the
library, which is sized for 2×. A larger original would be a straight swap:
same filename, same folder, no code change.

`eq-hip-thrust.webp` is padded, not cropped. The original is a 316×316 product
shot on white; `object-fit: cover` on the 3:2 card box cut the lifter's head
off, so the canvas was extended to 474×316 with white instead. The white meets
a white card, so it reads as a product shot rather than as a border.

    ffmpeg -i "pics/images (1).jpeg" -vf "pad=474:316:(ow-iw)/2:0:white" \
      -c:v libwebp -quality 86 -compression_level 6 img/eq-hip-thrust.webp

Both are studio shots — one on blue seamless, one cut out on white — against a
library of real gym interiors. The `saturate(.82) contrast(1.05)` grade in
`.ph img` narrows the gap but does not close it.
