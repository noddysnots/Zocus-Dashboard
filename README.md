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
