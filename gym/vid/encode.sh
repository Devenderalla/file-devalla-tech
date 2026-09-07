#!/usr/bin/env bash
# Encode one raw take into a site-ready demo clip.
#
#   ./vid/encode.sh leg-press raw/leg-press.mov 4.5 14
#                   ^station  ^source           ^in  ^seconds
#
# Station ids and target durations are in vid/README.md. Writes
# vid/<station>.mp4 and reports the size against the 400 KB budget.
# Registering it in data.js is still a deliberate step — see the end.
set -euo pipefail

if [ $# -lt 3 ]; then
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
fi

station=$1
src=$2
start=$3
dur=${4:-10}
out="$(dirname "$0")/${station}.mp4"

[ -f "$src" ] || { echo "no such source: $src" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not installed" >&2; exit 1; }

# -ss before -i seeks fast; -an drops audio entirely (the clips are silent by
# design); +faststart moves the index to the front so it streams progressively.
# scale=720:-2 keeps the aspect and forces an even height for libx264.
ffmpeg -hide_banner -loglevel error -y \
  -ss "$start" -i "$src" -t "$dur" \
  -vf "scale=720:-2,fps=25" \
  -c:v libx264 -profile:v main -crf 27 -preset slow \
  -movflags +faststart -an \
  "$out"

bytes=$(stat -c%s "$out")
kb=$((bytes / 1024))
printf '%s  %s KB  ' "$out" "$kb"
if [ "$kb" -le 400 ]; then
  printf 'within budget\n'
else
  printf 'OVER the 400 KB target — raise -crf (28–30) or shorten the take\n'
fi

ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate:format=duration \
  -of default=nw=1 "$out" | sed 's/^/  /'

cat <<REGISTER

Now register it on the station in data.js:

      video: { src: "vid/${station}.mp4", sec: ${dur} },

Cues are derived automatically (setup / movement / the common mistake) unless
you pass your own:

      video: { src: "vid/${station}.mp4", sec: ${dur},
               segments: [[0,"..."],[4,"..."],[10,"..."]] },

The first clip you register will fail three smoke assertions that currently
guard the empty state — that is deliberate. See vid/README.md.
REGISTER
