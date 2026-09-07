# Budget Tracker

**A financial diary for every Indian household** — works fully offline, weighs under 300 KB, and collects zero data.

Live: https://file.devalla.tech/budget/ · Pitch: https://file.devalla.tech/budget/pitch/ · By [@Devenderalla](https://github.com/Devenderalla)

## Why

Most Indian households never see where the month's money went. Popular finance apps are 50+ MB, demand constant internet, push ads and instant loans, and ship personal financial data to third-party servers. A budgeting habit needs a tool that is instant, private, and works everywhere — including where the network doesn't.

## Features

- **Log an expense in seconds** — amount, note, category, paid via Cash / UPI / Card / Bank
- **Add from a bank message** — paste (or, on Android, *share*) an SMS/UPI alert and it
  reads the amount, date, merchant and payment method, guesses the category, and skips
  anything already added. OTPs, promos and balance alerts are ignored. Parsing is local —
  no SMS permission, no backend, nothing uploaded
- **Categories for Indian life** — Kirana, Petrol, EMI, Bills, Family, Haircut… rename, recolor, add your own
- **Monthly budgets** per category with over-spend warnings
- **Gullak** — savings goals ("₹5,000 by Diwali") with progress
- **Trends** — day-by-day bars, six-month view, month-vs-month delta, insight callouts
- **Income & balance**, recurring entries (rent, subscriptions), search & filters
- **Dark mode**, keyboard shortcuts, undo on delete
- **Data ownership** — everything stays in the browser's localStorage; CSV export/import, JSON backup/restore, one-tap erase
- **Bank statement import** — reads real statement exports too (Narration / Withdrawal Amt.
  / Deposit Amt. columns, day-first dates) and auto-categorises from the narration
- **Installable PWA** — add to home screen, then fully offline

## Why capture is one tap, not zero

Reading bank SMS automatically needs Android's `READ_SMS`, which the web platform does not
expose and which Google restricted in 2019 to default SMS handlers — personal finance is
exactly the category that was cut. The Web OTP API only reads an origin-bound OTP, not a
debit alert. The remaining fully-automatic routes each cost the thing this app is built on:
Gmail parsing needs OAuth accounts and an annual CASA assessment, and India's Account
Aggregator framework needs registration as an RBI-regulated Financial Information User.

So capture is share-or-paste. The parser is the valuable half and it is input-agnostic —
the same code backs the share target, the paste box and statement import. The cost is one
confirming tap per purchase; the gain is no permissions, no backend, no account, and no
message ever leaving the device.

## Tech

No framework, no build step, no dependencies. Plain HTML/CSS/JS + a service worker:

```
index.html   markup
app.css      styles (light + dark token sets)
app.js       all logic; localStorage schema v4 with automatic migrations
sw.js        offline-first service worker — bump VERSION on every change
manifest     PWA metadata + a Web Share Target so Android's share sheet can send
             a bank SMS straight into the capture dialog (arrives as ?text=…)
fonts/       self-hosted variable fonts (Bricolage Grotesque, Instrument Sans, Spline Sans Mono)
icons/       PWA icons
pitch/       printable one-pager with QR install card
```

Chart colors follow a CVD-validated 8-slot categorical palette (light and dark variants validated against their surfaces). Category identity is never carried by color alone.

## Run it

Serve the folder with any static server, e.g.:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works (without offline install).

## Deploy

Any static host. With Caddy, serving under a subpath:

```caddy
example.com {
    redir /budget /budget/
    handle_path /budget/* {
        root * /path/to/budget-tracker
        file_server
    }
}
```

All URLs are relative, so it works at any path. After changing files, bump `VERSION` in `sw.js` so installed clients update.

## Privacy

There is no backend, no analytics, no accounts. Your data lives in your browser and leaves only when you export it.

## License

[MIT](LICENSE)
