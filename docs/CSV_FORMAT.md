# Zocus dashboard CSV format

One row per recorded conversation. UTF-8, comma-separated, header row required (column order does not matter, names are case-insensitive). Download a ready example from the **Data** menu (top right) or `data/template.csv`. A full 646-row example is `data/sample.csv`.

Upload validates the whole file first. If any row is bad, nothing is loaded and the first 25 problems are listed.

## Required columns

| Column | Format | Example | Used for |
|---|---|---|---|
| `captured_at` | `YYYY-MM-DD HH:MM`, store local time | `2026-11-04 17:32` | 7 / 30 day periods, trends, follow-up due dates. "Today" = the latest row. |
| `rep_name` | text | `Priya Sharma` | Team, coaching, filters |
| `outcome` | `sold` / `followup` / `lost` | `followup` | conversion, funnel, follow-ups |
| `value_inr` | whole rupees, blank = 0 | `85000` | sales closed, money at stake |
| `value_source` | optional: `call` (price said in the conversation), `budget` (customer budget), `indicative` (typical price of the model), `team` (entered by hand), `recorded` (recorded in the app). Blank with a blank value = not known | `indicative` | the source shown next to each value; rupee totals say how many are indicative or unknown |
| `product` | text | `Lightweight 22K bangles` | What they want, restock action |
| `score` | 0-100 | `67` | score rings, ranking |

## Strongly recommended

| Column | Format | Used for |
|---|---|---|
| `score_need`, `score_budget`, `score_pitch`, `score_objection`, `score_close` | 0-100 | Team skill table, coaching focus. If missing, `score` is used for all five and coaching shows no skill gaps. |
| `reason` | `browse` `stock` `design` `making` `budget` `competitor` `family` `exchange`, or free text. Blank on sold rows. | "Why they did not buy". Free text appears as its own reason. Blank on a not-sold row becomes "No clear reason". |
| `stage_reached` | `talked` `need_understood` `product_shown` `price_quoted`. Blank on sold rows. | Funnel. Defaults from the reason if blank. |
| `conversation_id` | text, unique | reference only |

## Coaching columns (personalised plans)

Coaching works without these, using built-in example answers. With them, every rep's plan shows how reps who score high on the same skill resolved the same objection.

| Column | Format | Notes |
|---|---|---|
| `objection` | same codes as `reason`, or free text | The objection raised in the conversation, **sold or not**. |
| `objection_resolved` | `yes` / `no` | Only resolved ones count as "what works". |
| `objection_quote`, `objection_quote_en` | text (original language + English) | What the customer said. |
| `objection_reply`, `objection_reply_en` | text (original language + English) | The rep's answer. This is what other reps see. |
| `objection_at_sec` | seconds from start | "Hear it" jumps here in the player. |

## Optional columns

`customer_name`, `customer_phone`, `duration_min`, `customer_type` (e.g. Wedding shopping), `in_stock` (`yes`/`no`), `competitor`, `competitor_offer`, `keywords` (`a|b|c`), `customer_quote`, `customer_quote_en`, `summary_wanted`, `summary_happened`, `summary_why`, `summary_next`, `followup_due` (`YYYY-MM-DD`, default visit + 2 days), `followup_done` (`yes`/`no`), `rep_tenure`, `store_name` and `owner_name` (same on every row; they set the store name, greeting and browser tab title, so uploading another store's CSV re-brands the whole dashboard).

## AI commentary columns (what the AI said about each conversation)

Optional. When present, the conversation panel shows a "What the AI said" card and the rep coaching tab lists the AI's most frequent tips.

| Column | Format | Backend source |
|---|---|---|
| `ai_coaching` | `title: suggestion`, several joined by ` \| ` | analysis `coaching[]` |
| `ai_coaching_quote` | text | `coaching[0].evidence[0].quote` |
| `ai_commitments` | what the rep promised, joined by ` \| ` | analysis `commitments[].text` |
| `ai_next_action` | text | `revenueRecovery.recommendedAction` |
| `ai_notes` | AI notes on missed skills, joined by ` \| ` | analysis `sop[].note` |

| `ai_checks` | rubric results, ` \| ` between items, each `MET: <label> (D3). <reason>` or `NOT_MET: ...` | `execution_scoring.observations` (MET / NOT_MET only) |
| `transcript` | the conversation, one turn per line as `[mm:ss] Speaker: text` (plain text also accepted) | `transcript_versions.text` |
| `vertical` | `jewellery`, `car`, `two-wheeler`, ... (same on every row) | `data/cases.json` |
| `talk_rep_pct` | 0-100, share of words spoken by staff | `speaker_role_assessments.result.speakers[].words` |
| `segments_n` | number of transcript turns | derived |

`ai_checks` fills the "Skill checks" card and the coaching tab's "Skill checks missed most"; `transcript` fills the collapsed "Transcript" card.

**Recordings are coming soon.** The dashboard does not play or link audio for now. `zocus_url` and `objection_at_sec` are accepted but ignored; they are reserved for when recordings ship (audio stays in private storage, played only to logged-in users, deleted after 6 months).

Accepted aliases: `interaction_id`, `employee`, `store`. If there is no `outcome` column but there is `sale_recorded` (the existing backend export), `yes` becomes `sold` and anything else `lost`.

## Where each value comes from in the Zocus backend

The repo already has `GET /api/v1/organizations/:orgId/interactions/export?format=csv` (`backend/src/modules/intelligence/interactions.ts`). It already carries `interaction_id`, `captured_at`, `employee`, `store`, `customer_name`, `customer_phone`, `summary`, `sale_recorded`, `score` and `score_dimensions`. Ask the engineer to extend it with:

| Column | Backend source |
|---|---|
| `outcome` | `sale_recorded`; otherwise `sessions.outcome.stage` (`lost`, or `follow_up`/`considering`/`committed`/`interested`) |
| `value_inr`, `value_source` | team notes, else `sessions.outcome.amountMinor / 100`, else AI `revenueRecovery.value` (basis `quoted_price`), else for car stores a price read from the transcript, the customer budget, or the model band in `data/price-list.json` |
| `product` | normalised category `product_type` (relation `requested`) |
| `score_*` | `score_dimensions`: `pitch_knowledge`, `objection_handling`, `sop_closing`. See gap 1. |
| `reason` | `outcome.lossReason` or `revenueRecovery.rootCause` |
| `stage_reached` | scoring `stages[]` (`discovery`, `presentation`, `commercials`, `closing`); last one `reached` |
| `objection*` | analysis `objections[]` (`theme`, `resolution`, evidence quote and segment start time) |
| `duration_min` | `ended_at - captured_at` |
| `followup_due`, `followup_done` | `followup_opportunities.wake_up_at` / status, or `tasks.due_at` / state |

### Gaps in the backend today

1. **Skills:** the backend scores 4 dimensions (discovery, pitch and product knowledge, objection handling, SOP and closing). The dashboard splits discovery into "Understanding the need" and "Asking the budget". Needs per-check results (D1-D4) to split.
2. **Loss reason** is free text; the dashboard wants it grouped into the 7 reasons above (or accepts free text).
3. **Not captured by analysis yet:** `customer_type`, `in_stock`, `competitor_offer`, `keywords`, and English translations of quotes. The matching Insights tabs stay thin until the analysis adds them.
4. Export only conversations that are analysed and included.


## Car showrooms

When `vertical` is `car` the dashboard uses showroom wording (Booked, test drive, on-road price) and the reason codes read: `browse` just enquiring, `stock` long waiting period, `design` not convinced after the test drive, `making` on-road price too high, `budget` over budget or EMI, `competitor` another brand, `family` family approval, `exchange` exchange value too low. `stage_reached` `product_shown` means "test drive done". `product` is the model; `Model not decided` when none was named.
