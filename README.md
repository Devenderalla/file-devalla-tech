# file.devalla.tech

The static remainder of `file.devalla.tech`, served by GitHub Pages so the
domain keeps working after the server behind it was retired. Paths match the
old Caddy routes, so existing links still resolve.

| Path | What it is |
|---|---|
| `/budget/` | Budget Tracker — offline PWA, runs entirely in the browser |
| `/gym/` | Gym Basics — static site |
| `/invoices/`, `/health/`, `/jobs/` | Stub pages explaining the service was retired |
| `/404.html` | Served by Pages for anything else |

`/budget/` and `/gym/` are copies, not submodules. The canonical source stays in
`budget-tracker` and `gym-basics`; edit there and copy across, or this drifts.

## Pointing the domain here

The domain still has an **A record to `200.141.9.20`**, the old server. Replace
it at the registrar with a CNAME:

```
Type:   CNAME
Name:   file          (i.e. file.devalla.tech)
Value:  devenderalla.github.io
TTL:    3600
```

Delete the old A record — a CNAME cannot coexist with an A record on the same
name, and while both exist resolvers may still reach the dead server.

Once it propagates (minutes to a few hours), GitHub issues a Let's Encrypt
certificate on its own. Then turn on **Settings → Pages → Enforce HTTPS**, or:

```bash
gh api -X PUT repos/Devenderalla/file-devalla-tech/pages -F https_enforced=true
```

`CNAME` in this repo already names the domain; do not delete it, or Pages stops
answering on `file.devalla.tech`.

## Checking it before DNS moves

GitHub serves the site regardless of where DNS points, so it can be tested by
resolving the name by hand:

```bash
curl --resolve file.devalla.tech:80:185.199.111.153 http://file.devalla.tech/budget/
```
