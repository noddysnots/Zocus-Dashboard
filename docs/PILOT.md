# Pilot day runbook (Saturday 14 Nov 2026)

The dashboard opens on the store marked `"default": true` in `data/cases.json` (id `pilot`) and shows it in **Live** view: the day in 2-hour blocks, each block compared with the block before it, no week-over-week comparisons.

## Before the first recording

1. Open `data/cases.json`, entry `pilot`: set `org` to the dealership's company name as it appears in the database (`node tools/export-from-db.mjs --list`), `date` to `2026-11-14`, `name` to the dealership name, `vertical` to `car` (or `two-wheeler`, `jewellery`), and delete the `note`.
2. Check each rep has their own login in that company. Rep names on the dashboard are the login names.
3. Commit and push the dashboard code once, so the Vercel site has the Live view.

## Every refresh (about every 3 hours, or on request)

Ask Claude: "refresh the pilot". Claude runs `node tools/refresh-pilot.mjs`, which:

- exports that company's conversations for the pilot date from the database (read-only),
- checks the file with the dashboard's own parser,
- prints: recorded, shown, new since last time, still being analysed, not scorable, failed uploads, per-rep counts,
- commits `data/cases/pilot.csv` and `data/cases/pilot.meta.json` locally. It never pushes.

Then push to GitHub. Vercel redeploys in about a minute; reload the page.

Fallback if git or Vercel misbehaves: Data menu (top right) > Upload CSV > `data/cases/pilot.csv`, or present from `http://localhost:4173`.

## What the audience sees

- Top line: when the data was pulled, how many conversations, how many are still being analysed, when the last recording was.
- Block chips (All day, 10 to 12, 12 to 2, ...): tap one and every page filters to it.
- Overview: results so far, conversations by block, reps today (chats, talk time, score, results), time with customers, latest conversations with the AI's one-line summary.
- A conversation: AI summary, coaching tips, skill checks, and the full transcript as speaker turns with search. Audio is "coming soon".

## Known limits

- **The pilot file holds real customer names, phones and full transcripts, and the Vercel link is open** (decision taken 12 Nov). The site sends `noindex`, which only keeps it out of search engines. To withhold them, run the export with `--public`.
- Long recordings take time to transcribe and analyse; until then they show as "Being analysed".
- Scores: real rubric scores exist only when the scorer judged the conversation eligible; otherwise the score is an estimate from the AI's observed / not observed review.
- Outcomes come from staff tags when present, otherwise from the AI's reading; unclear ones are counted as "will return".
- Sale value is the recorded amount, otherwise the customer's stated budget.
