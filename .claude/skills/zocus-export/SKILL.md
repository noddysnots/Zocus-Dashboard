---
name: zocus-export
description: Export a company's conversations from the Zocus database into the dashboard CSV, check it, and report what is missing or could be derived. Use when the user asks to download/export/pull the CSV or data for a company, dealership or store (optionally for a day or date range), or to check what the dashboard is missing for one.
---

# Zocus export

The user names a company (and optionally a day or range). Run everything yourself; never ask them to run a script.

1. Find the company: `node tools/export-from-db.mjs --list` (read-only; credentials in `.env`). If the name matches nothing or more than one, show the list and ask.
2. Export: `node tools/export-from-db.mjs --org "<name or id>"` plus any of `--date YYYY-MM-DD`, `--from/--to`, `--days N`, `--pii` (customer name + phone; only if the user asks), `--unknown followup|lost|skip`.
   It writes `data/db-export-<company>.csv` and `data/db-export-<company>.report.md`, and runs the dashboard's own validator (`tools/check-csv.mjs`).
   For the team's real test conversations use `node tools/export-from-db.mjs --cases data/cases.json`: one CSV per store in `data/cases/` (edit `data/cases.json` to change which conversation belongs to which store; the database has no store name per conversation). The dashboard header dropdown then lists those stores.
   **"Refresh the pilot"**: run `node tools/refresh-pilot.mjs` (exports the `pilot` store in `data/cases.json`, validates, commits `data/cases/pilot.*` locally, never pushes). Report its summary lines, anything still being analysed or failed, and remind the user to push. See `docs/PILOT.md`. If it says no company matches, show `--list` and ask which company is the dealership.
3. Reply with: the CSV path as a link, rows/reps/date span, whether the dashboard accepts it, then the report in plain words: (a) filled well, (b) worked out by formula and what the formula assumes (proxies are estimates, say so), (c) missing and what it would take to fill it, (d) what the user will notice on each dashboard page. Be honest about thin data (few reps, few rows, scores from the analysis review instead of rubric checks).
4. If the user wants a missing field filled, look in the database for it (tables: sessions, analysis_runs.result/execution_scoring, transcript_versions.segments, tasks, followup_opportunities, memberships), add a formula in `tools/export-from-db.mjs`, mark it with `mark(...)` so the report names it, and re-run.
5. To see it in the dashboard: Data menu (top right) > upload the CSV. Or serve it: it is in `data/`.

Never write the password into a reply, never commit `.env` or `data/db-export*`. Customer names/phones are off by default.
