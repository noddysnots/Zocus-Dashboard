# Export report: Horizon Realty (fictional)

Generated 2026-11-12 13:52 UTC from the live database (read-only). File: `data/demo/horizon.csv`

- **Rows exported:** 83 of 92 analysed conversations
- **Dates:** 2026-05-13 to 2026-10-04   **Reps:** 2 (Kabir Mehta, Arjun Rao)
- **FICTIONAL DATA.** 77 of 83 rows come from the backend's fixture seed (provider `fictional_fixture`, summaries start "Fictional..."). This is not real AI output; show it only as a demo.
- **Row quality:** 1 partial or unassessable recordings, 80 with AI processing paused (analysis comes from an earlier run), recorded by account(s): Kabir Mehta, Arjun Rao (the account that recorded, not necessarily who spoke).
- **Recorded vs shown:** 92 recorded, 83 shown, 0 still being analysed, 9 too short or unclear to score, 0 failed upload
- **Left out:** 0 outside the date range, 0 with no recorded outcome and no follow-up, 9 with no assessable score
- **Where scores came from:** 0 conversations from the AI rubric checks, 83 from the analysis review (observed / not observed). Real rubric scores are only produced for conversations the scorer judged eligible.

## What is filled

| Column | Filled | Powers |
|---|---|---|
| conversation_id | 100% |  |
| captured_at | 100% |  |
| rep_name | 100% |  |
| outcome | 100% |  |
| value_inr | 90% | Sales closed, money at stake, restock list values |
| product | 100% |  |
| score | 100% |  |
| score_need | 100% | Team skill table |
| score_budget | 100% | Team skill table |
| score_pitch | 95% | Team skill table |
| score_objection | 98% | Team skill table |
| score_close | 100% | Team skill table |
| reason | 65% | Why they did not buy chart; Insights > Lost sales |
| stage_reached | 72% | Funnel |
| customer_name | 48% | Names in lists (off unless --pii) |
| customer_phone | 0% | Call button (off unless --pii) |
| duration_min | 100% |  |
| customer_type | 100% | Who is walking in |
| in_stock | 0% | Stock-out and restock action |
| competitor | 84% | Competitor tab |
| competitor_offer | 0% | Competitor tab |
| keywords | 90% | Search suggestions, what customers say |
| customer_quote | 90% | Conversation panel quote |
| customer_quote_en | 0% |  |
| summary_wanted | 100% |  |
| summary_happened | 100% |  |
| summary_why | 2% |  |
| summary_next | 72% | Conversation panel "what next" |
| objection | 90% | Coaching plans |
| objection_resolved | 90% | Coaching: what works |
| objection_quote | 90% |  |
| objection_quote_en | 0% | English view of quotes |
| objection_reply | 90% | Coaching: how top reps answered (peer replies) |
| objection_reply_en | 0% |  |
| objection_at_sec | 90% | Coaching: "hear it" jump |
| followup_due | 45% | Follow-ups page |
| followup_done | 45% | Follow-ups page |
| rep_tenure | 0% | Rep profile "N years" line |
| store_name | 100% |  |
| owner_name | 0% |  |
| zocus_url | 0% | Open recording in Zocus link |
| ai_coaching | 84% | Conversation panel: What the AI said; rep coaching tab |
| ai_coaching_quote | 84% | Line the AI cites |
| ai_commitments | 100% | What the rep promised |
| ai_next_action | 2% | AI recommended next step |
| ai_notes | 100% | AI notes on missed skills |
| ai_checks | 4% | Conversation panel: Skill checks; coaching: checks missed most |
| transcript | 100% | Conversation panel: Transcript |
| vertical | 100% | Wording (piece / model / bike) |
| talk_rep_pct | 7% | Talk share (rep vs customer) |
| segments_n | 100% | Transcript turns |
| quality | 1% | Partial / unassessable recording |
| ai_model | 100% | Which AI model analysed it |

## Worked out by formula (not stored as such in the database)

- **outcome** (45 rows): no outcome recorded by staff; taken from the AI's reading of the conversation (considering = follow-up)
- **score_budget** (83 rows): proxy: was a budget captured in the conversation (100) or not (0)
- **score_close** (83 rows): proxy: sale closed or a next step / follow-up set (100), otherwise 0
- **stage_reached** (60 rows): estimated from what was captured (purpose, preference, price talk)
- **value_inr** (52 rows): customer-stated budget used where no amount was recorded
- **reason** (43 rows): no loss reason recorded; the main objection raised is used
- **objection_reply** (75 rows): next speaker's line in the transcript after the objection
- **objection_at_sec** (75 rows): start of the objection segment in the transcript
- **keywords** (75 rows): objection themes used as keywords

## Missing or thin, and what could fill it

- **customer_name** (48%): Available in the database. Left out on purpose; run with --pii for the pilot if the owner needs names. Affects: Names in lists (off unless --pii).
- **customer_phone** (0%): Available in the database. Left out on purpose; run with --pii. Affects: Call button (off unless --pii).
- **in_stock** (0%): Not in the database. If the store catalogue/stock list is loaded, in_stock = product found in stock. Affects: Stock-out and restock action.
- **competitor_offer** (0%): Not extracted yet by the AI analysis. Could be added as an analysis field, or read from the transcript line after a competitor mention. Affects: Competitor tab.
- **customer_quote_en** (0%): Same as objection_quote_en. Affects: minor.
- **summary_why** (2%): Not available in the database for this company. Affects: minor.
- **objection_quote_en** (0%): Needs a translation step. The transcript is stored in the spoken language; quotes could be translated once and saved. Affects: English view of quotes.
- **objection_reply_en** (0%): Not available in the database for this company. Affects: minor.
- **followup_due** (45%): Not available in the database for this company. Affects: Follow-ups page.
- **followup_done** (45%): Not available in the database for this company. Affects: Follow-ups page.
- **rep_tenure** (0%): Not stored. Could be set from a rep list the dealership gives us, or hidden. Affects: Rep profile "N years" line.
- **owner_name** (0%): Not available in the database for this company. Affects: minor.
- **ai_next_action** (2%): Not available in the database for this company. Affects: AI recommended next step.
- **ai_checks** (4%): Not available in the database for this company. Affects: Conversation panel: Skill checks; coaching: checks missed most.
- **talk_rep_pct** (7%): Not available in the database for this company. Affects: Talk share (rep vs customer).
- **quality** (1%): Not available in the database for this company. Affects: Partial / unassessable recording.
- **Parked: recordings coming soon.** `zocus_url` and `objection_at_sec` are not used by the dashboard for now.
- **Only 2 reps** in this export, so Team ranking and peer coaching (best rep's answer) will be thin.

## Dashboard check

The dashboard's own upload check accepts this file: 83 conversations, 2 reps, 145 days of data.
- Note: 6 not-sold conversations have no reason. They are grouped as "No clear reason".
