# Export report: Horizon Realty (fictional demo)

Generated 2026-11-12 13:06 UTC from the live database (read-only). File: `data/db-export-horizon-realty.csv`

- **Rows exported:** 68 of 92 analysed conversations
- **Dates:** 2026-05-13 to 2026-10-04   **Reps:** 2 (Kabir Mehta, Arjun Rao)
- **Left out:** 0 outside the date range, 17 with no recorded outcome and no follow-up, 7 with no assessable score
- **Where scores came from:** 0 conversations from the AI rubric checks, 68 from the analysis review (observed / not observed). Real rubric scores are only produced for conversations the scorer judged eligible.

## What is filled

| Column | Filled | Powers |
|---|---|---|
| conversation_id | 100% |  |
| captured_at | 100% |  |
| rep_name | 100% |  |
| outcome | 100% |  |
| value_inr | 93% | Sales closed, money at stake, restock list values |
| product | 100% |  |
| score | 100% |  |
| score_need | 100% | Team skill table |
| score_budget | 100% | Team skill table |
| score_pitch | 94% | Team skill table |
| score_objection | 99% | Team skill table |
| score_close | 100% | Team skill table |
| reason | 62% | Why they did not buy chart; Insights > Lost sales |
| stage_reached | 66% | Funnel |
| customer_name | 0% | Names in lists (off unless --pii) |
| customer_phone | 0% | Call button (off unless --pii) |
| duration_min | 100% |  |
| customer_type | 100% | Who is walking in |
| in_stock | 0% | Stock-out and restock action |
| competitor | 85% | Competitor tab |
| competitor_offer | 0% | Competitor tab |
| keywords | 93% | Search suggestions, what customers say |
| customer_quote | 93% | Conversation panel quote |
| customer_quote_en | 0% |  |
| summary_wanted | 100% |  |
| summary_happened | 100% |  |
| summary_why | 3% |  |
| summary_next | 82% | Conversation panel "what next" |
| objection | 93% | Coaching plans |
| objection_resolved | 93% | Coaching: what works |
| objection_quote | 93% |  |
| objection_quote_en | 0% | English view of quotes |
| objection_reply | 93% | Coaching: how top reps answered (peer replies) |
| objection_reply_en | 0% |  |
| objection_at_sec | 93% | Coaching: "hear it" jump |
| followup_due | 54% | Follow-ups page |
| followup_done | 54% | Follow-ups page |
| rep_tenure | 0% | Rep profile "N years" line |
| store_name | 100% |  |
| owner_name | 0% |  |
| zocus_url | 0% | Open recording in Zocus link |
| ai_coaching | 85% | Conversation panel: What the AI said; rep coaching tab |
| ai_coaching_quote | 85% | Line the AI cites |
| ai_commitments | 100% | What the rep promised |
| ai_next_action | 3% | AI recommended next step |
| ai_notes | 100% | AI notes on missed skills |

## Worked out by formula (not stored as such in the database)

- **outcome** (28 rows): no recorded outcome; set to follow-up because a follow-up task exists
- **score_budget** (68 rows): proxy: was a budget captured in the conversation (100) or not (0)
- **score_close** (68 rows): proxy: sale closed or a next step / follow-up set (100), otherwise 0
- **stage_reached** (45 rows): estimated from what was captured (purpose, preference, price talk)
- **value_inr** (40 rows): customer-stated budget used where no amount was recorded
- **reason** (31 rows): no loss reason recorded; the main objection raised is used
- **objection_reply** (63 rows): next speaker's line in the transcript after the objection
- **objection_at_sec** (63 rows): start of the objection segment in the transcript
- **keywords** (63 rows): objection themes used as keywords

## Missing or thin, and what could fill it

- **customer_name** (0%): Available in the database. Left out on purpose; run with --pii for the pilot if the owner needs names. Affects: Names in lists (off unless --pii).
- **customer_phone** (0%): Available in the database. Left out on purpose; run with --pii. Affects: Call button (off unless --pii).
- **in_stock** (0%): Not in the database. If the store catalogue/stock list is loaded, in_stock = product found in stock. Affects: Stock-out and restock action.
- **competitor_offer** (0%): Not extracted yet by the AI analysis. Could be added as an analysis field, or read from the transcript line after a competitor mention. Affects: Competitor tab.
- **customer_quote_en** (0%): Same as objection_quote_en. Affects: minor.
- **summary_why** (3%): Not available in the database for this company. Affects: minor.
- **objection_quote_en** (0%): Needs a translation step. The transcript is stored in the spoken language; quotes could be translated once and saved. Affects: English view of quotes.
- **objection_reply_en** (0%): Not available in the database for this company. Affects: minor.
- **rep_tenure** (0%): Not stored. Could be set from a rep list the dealership gives us, or hidden. Affects: Rep profile "N years" line.
- **owner_name** (0%): Not available in the database for this company. Affects: minor.
- **ai_next_action** (3%): Not available in the database for this company. Affects: AI recommended next step.
- **Parked: recordings coming soon.** `zocus_url` and `objection_at_sec` are not used by the dashboard for now.
- **Only 2 reps** in this export, so Team ranking and peer coaching (best rep's answer) will be thin.

## Dashboard check

The dashboard's own upload check accepts this file: 68 conversations, 2 reps, 145 days of data.
- Note: 3 not-sold conversations have no reason. They are grouped as "No clear reason".
