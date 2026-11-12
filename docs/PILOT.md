# Pilot day flow (Saturday 14 Nov 2026)

The dashboard has three kinds of store, chosen from the dropdown in the header (the Data menu on phones):

| Group | What it is | Shows time and trends? |
|---|---|---|
| **Pilot (live)** | The dealership's real recordings for the pilot day | Yes: the day in 2-hour blocks, each block against the one before it |
| **Real test calls** | The team's own test recordings (Tanishq, TVS, Mahindra) | No. They were recorded by one account on random days, so only per-conversation analysis is shown |
| **Demo (fictional)** | Invented data showing a prospective customer what the dashboard looks like once reps have logins | Yes. "Apex Motors: pilot day" is the one to show for the Saturday experience |

## Before the day (Friday)

1. **Backend:** the dealership is created as its own company, with one login per rep (name = what should appear on screen). Each rep records on their **own** login: `rep` on the dashboard means "the account that recorded", not the voice in the audio.
2. **Config:** in `data/cases.json`, entry `pilot`, set `org` to the company name exactly as `node tools/export-from-db.mjs --list` shows it, `date` to `2026-11-14`, `name` to the dealership name, `vertical` (`car`, `two-wheeler`, `jewellery`), and delete the `note`. (Ask Claude: "set up the pilot for <company>".)
3. **Deploy:** commit and push the dashboard code so Vercel has the Live view. Open the Vercel link on a phone and a laptop.
4. **Rehearse** with "Apex Motors: pilot day (fictional demo)".

## On the day

1. **Introduce the product** on the demo store: Live strip, blocks, reps, a long conversation with its transcript, AI tips, skill checks.
2. **Switch the dropdown to the pilot store** once real recordings exist.
3. **Refresh about every 3 hours, or whenever you ask** ("refresh the pilot"): Claude runs `node tools/refresh-pilot.mjs`, which exports the company's conversations for the pilot date (read-only), validates the file with the dashboard's own parser, prints recorded / shown / new / still analysing / failed, per-rep counts, and commits locally. It never pushes. **You push to GitHub, Vercel redeploys in about a minute, reload the page.**
4. The top line says when the data was pulled, how many conversations, how many are still being analysed, and when the last recording was. Long recordings take time to transcribe and score: they show as "Being analysed" and join the numbers on the next refresh.
5. Fallbacks: Data menu, Upload CSV, `data/cases/pilot.csv`; or present from `http://localhost:4173`.

## After

Final refresh, then export the day's CSV for the owner. Pick **All day** for the totals.

## What the audience sees

- **Overview:** results so far, conversations per 2-hour block, reps (chats, talk time, score, results), time with customers, latest conversations with the AI's one-line summary.
- **Block chips:** tap one and every page filters to it; arrows compare with the previous block only. The first block has nothing to compare with, so it shows no arrows.
- **A conversation:** AI summary, coaching tips, skill checks, the transcript as speaker turns (Rep / Customer / Other staff) with search, and "What was said". Audio is **Coming soon**.

## Things to say out loud

- Scores are real rubric scores only when the scorer judged the conversation complete enough; otherwise they are an estimate from the AI's review, and the export report says which.
- Outcomes come from staff tags when present, otherwise from the AI's reading. Unclear ones count as "will return".
- Sale value is the recorded amount, else the customer's stated budget.
- Speaker labels (Rep / Customer) are the AI's guess.

## Known risks

- **Real customer names, phones and full transcripts are in the committed pilot file, and the Vercel link is open** (decision 12 Nov). The site sends `noindex`, which only keeps it out of search engines. To withhold personal details run the export with `--public`.
- Reps sharing a login will make the rep views meaningless.
- If the dealership's company or rep logins are not in the database by Saturday morning, show the demo store and say so.
