# Zocus Store Briefing

Store-owner dashboard for Zocus AI: briefing, insights, team, coaching, conversations and follow-ups. Static HTML, CSS and JavaScript with no build step. Numbers come from a CSV (no backend yet).

## Run locally

```bash
node tools/serve.mjs
```

Open http://localhost:4173. Do not double-click `index.html`; the CSV is loaded with `fetch`, which needs a web server.

## Data

- **Shipped store:** Mahindra showroom (pilot) only (`data/cases/pilot.csv`). Open `/?dealer` for the locked dealer link.
- **Data** button (top right): day reports, CRM, export the loaded CSV, download the template. On `?all`, upload is also available (stays in that browser only).
- Format and backend mapping: [docs/CSV_FORMAT.md](docs/CSV_FORMAT.md).
- Export from the Zocus database (read-only, credentials in `.env`, never committed): `npm i pg`, then `node tools/export-from-db.mjs --list` / `--cases data/cases.json`.
- **Pilot day:** notes in `data/pilot-notes.json`; prices in `data/price-list.json`; flow in [docs/PILOT.md](docs/PILOT.md). **Before a push:** `node tools/audit-pilot.mjs --no-db` and `/tools/check.html`. Contract: [docs/DASHBOARD_CONTRACT.md](docs/DASHBOARD_CONTRACT.md).
- **Car showrooms:** `"vertical": "car"` gets showroom wording. Note: **"rep" = the account that recorded**, not the voice in the audio.

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
