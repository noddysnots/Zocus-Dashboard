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
   **"Refresh the pilot"** (see `docs/PILOT.md`): the user usually pastes WhatsApp notes with it. (a) Run `node tools/refresh-pilot.mjs --no-commit` to list the day's conversations (number, start time, length). (b) Read each new transcript **in full** (the `[m:ss]` lines of the CSV, not a summary) and match each note to a conversation by start time; write it into `data/pilot-notes.json` under `calls["<number>"]` (`rep`, `customer`, `segment`, `model`, `models`, `fuel`, `quote`, `priorities`, `value` in rupees, `remarks`, `prices`, `tr_en`, `drop: true` with `why`). If a note could match two recordings, ask. Never drop a call the user did not ask to drop; the script only suggests. Never name a customer from the audio. Mark unclear parts of a translation as unclear. (c) Run `node tools/refresh-pilot.mjs`: it exports, validates, runs **`tools/audit-pilot.mjs`** (CSV against the database, notes, transcript and `tests/pilot-golden.json`; a FAIL stops the commit) and commits `data/cases/pilot.*` and the notes locally, never pushing. Add the new conversation's checked answers to `tests/pilot-golden.json` once read by hand. (d) Reply with the conversation list, each value and where it came from, prices read from the transcript (to be checked), the audit's WARN lines, a short "to confirm" list (names, stages, outcome tags), calls that look weak, anything still being analysed, and remind the user to push. Before a push also run the browser check (`/tools/check.html`, see `docs/DASHBOARD_CONTRACT.md`): the dashboard must not change, only the data. The dealer's link is the site address plus `?dealer`.
3. Reply with: the CSV path as a link, rows/reps/date span, whether the dashboard accepts it, then the report in plain words: (a) filled well, (b) worked out by formula and what the formula assumes (proxies are estimates, say so), (c) missing and what it would take to fill it, (d) what the user will notice on each dashboard page. Be honest about thin data (few reps, few rows, scores from the analysis review instead of rubric checks).
4. If the user wants a missing field filled, look in the database for it (tables: sessions, analysis_runs.result/execution_scoring, transcript_versions.segments, tasks, followup_opportunities, memberships), add a formula in `tools/export-from-db.mjs`, mark it with `mark(...)` so the report names it, and re-run.
5. To see it in the dashboard: Data menu (top right) > upload the CSV. Or serve it: it is in `data/`.

Never write the password into a reply, never commit `.env` or `data/db-export*`. Customer names/phones are off by default.


Before interpreting any database row read `docs/DB_MAP.md`: orgs 2 and 3 are fictional fixtures, `sessions.rep_id` is the recording account (not the speaker), and org 1 has no store name. Test stores in `data/cases.json` with `"timeless": true` must never be shown with trends or time-of-day views.
