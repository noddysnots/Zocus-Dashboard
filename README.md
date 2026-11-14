# Zocus Store Briefing

Store-owner dashboard for Zocus AI: briefing, insights, team, coaching, conversations and follow-ups. Static HTML, CSS and JavaScript with no build step. Numbers come from a CSV (no backend yet).

## Run locally

```bash
node tools/serve.mjs
```

Open http://localhost:4173. Do not double-click `index.html`; the CSV is loaded with `fetch`, which needs a web server.

## Data

- Default: `data/sample.csv` (fictional store, 62 days, 646 conversations).
- **Data** button (top right): upload a CSV, export the loaded data, download the template, reset to the sample. Uploaded files are stored in that browser only (IndexedDB).
- Format and backend mapping: [docs/CSV_FORMAT.md](docs/CSV_FORMAT.md).
- Export from the Zocus database (read-only, credentials in `.env`, never committed): `npm i pg`, then `node tools/export-from-db.mjs --list` and `node tools/export-from-db.mjs --org 2`. Writes `data/db-export-org<id>.csv` (git-ignored) and prints how complete each column is.
- **Store switcher (real test conversations).** `data/cases.json` maps database conversation ids to the store or dealership they were about (the database stores no store name per conversation). `node tools/export-from-db.mjs --cases data/cases.json` writes `data/cases/<store>.csv` (git-ignored, contains real call text and customer details; add `--public` to drop them). The header dropdown (and the Data menu on phones) lists every store whose CSV is present, plus the sample store.
- **Store groups:** Pilot (one day shown as a single snapshot, `"snapshot": true` in `data/cases.json`), Real test calls (no trends, `"timeless": true`), Demo (fictional: sample, Apex Motors pilot day from `node tools/make-pilot-demo.mjs`, and the backend's fictional Mira and Horizon companies). Pilot-day flow: [docs/PILOT.md](docs/PILOT.md).
- **Pilot day:** team notes (rep, customer, segment, model, value, calls to drop) go in `data/pilot-notes.json`; indicative prices per model are in `data/price-list.json`; `node tools/refresh-pilot.mjs` exports, lists every conversation with its value and source, and commits. The dealer's link is the site address plus `?dealer` (their store only). **Before a push:** `node tools/audit-pilot.mjs` (the refresh runs it) and the browser check `/tools/check.html` on the local server; what the dashboard must keep and which rules change a number is in [docs/DASHBOARD_CONTRACT.md](docs/DASHBOARD_CONTRACT.md).
- **Car showrooms:** a store with `"vertical": "car"` gets showroom wording (Booked, test drive, on-road price) and the exporter reads the model and any price said from the transcript. What each database table means: [docs/DB_MAP.md](docs/DB_MAP.md). Note: **"rep" = the account that recorded**, not the voice in the audio.
- Regenerate the sample and template: `node tools/make-sample.mjs`.

## Layout

| Path | What |
|---|---|
| `index.html` | shell, splash, Data menu |
| `css/styles.css` | prototype styles, then additions (splash, menu, coaching) |
| `js/data.js` | CSV parse + validation, builds `window.ZD`, Data menu |
| `js/app.js` | dashboard (the prototype logic, reading `window.ZD`) |
| `js/coaching.js` | AI coaching plans, drills, readiness |
| `js/splash.js` | "Zocus AI." splash |

## Deploy on Vercel

Import the repo as a static project (framework preset "Other", no build command, output directory `.`). `vercel.json` is included. Keep real customer CSVs out of the repo; upload them in the browser or serve them from the backend later.

## Connecting the backend later

Everything reads one dataset object (`window.ZD`, built in `js/data.js`). Replace `load()` so it builds the same object from an API response and the rest of the app is unchanged.
