# Zocus database map

What each table and row means, what the dashboard takes from it, and the traps. Checked read-only against the live database on 12 Nov 2026. Re-check before relying on counts.

## The three companies

| id | name | what it is |
|---|---|---|
| 1 | Zocus | **Real.** Phone recordings (`source_kind = android`) analysed by live AI. Org-1 data is the team's own tests: one recording account, random days and times, mixed businesses (jewellery, cars, bikes, a phone, a freezer). One location, "Main". |
| 2 | Mira Jewellery (fictional demo) | **Fixture.** Seeded by the backend: `analysis_runs.provider = fictional_fixture`, model `not-live-ai`, summaries start "Fictional ...". Not AI output. |
| 3 | Horizon Realty (fictional demo) | Fixture, real estate. |

The exporter prints "FICTIONAL DATA" in its report when a company's rows come from the fixture.

## Who is the rep?

`sessions.rep_id` is **the account that recorded** (`users.id`). It is not the person speaking.

- Org 1 has two accounts, both `company_admin`; all 40 sessions belong to Abhishek (id 48).
- Who actually speaks is an AI guess in `speaker_role_assessments.result.speakers[]`: `label` (Speaker 1), `role` (`rep`, `customer`, `other_staff`, `unidentified`), `words`, `reason`. It never has a name.
- In the tests the "rep" voice is often a script or AI assistant and Abhishek was often the customer.
- Roles in `memberships.role`: `company_admin`, `manager`, `rep`. `recording_location_id` is empty everywhere.
- **For the pilot each rep must record on their own login**, otherwise rep views are wrong.

## Tables

| Table | One row is | Dashboard use |
|---|---|---|
| `organizations` | a company (`vertical`, `timezone`, `is_demo`) | store name fallback, timezone, vertical |
| `locations`, `membership_locations` | a store; which users work at it | store name when it is not "Main" |
| `users`, `memberships`, `identity_provisioning_requests` | a login; its role in a company; a request to create a login | rep names |
| **`sessions`** | **one recorded conversation** | the main row of the CSV |
| `capture_parts` | one uploaded audio chunk of a session | none (upload progress) |
| `interaction_media` | the finished audio file (`duration_ms`, `state = ready`, expires about 6 months after recording) | true recording length; audio later |
| `transcript_versions` | one transcript of a session (`segments[]` with `speaker`, `startMs`, `endMs`, `text`) | transcript turns and timestamps |
| `speaker_role_assessments` | AI guess of who is rep / customer per voice | speaker labels, talk share |
| `analysis_runs` | one AI run. `purpose = full`: summary, fields, objections, coaching tips, commitments, SOP notes, revenue recovery. `purpose = scoring`: 14-check rubric in `execution_scoring` | most AI columns, scores, skill checks |
| `category_projections` | the AI's answers mapped to a fixed taxonomy (`occasion`, `material`, `concern`, `product_type`) | customer type (jewellery only; cars are unmapped) |
| `reviews` | a manager's approved version of the notes (`approved_payload`) | not used yet; none exist for org 1 |
| `outcome_events` / `sale_tag_events` | who set the outcome / the yes-no sale tag, and when | outcome, sold |
| `followup_opportunities`, `opportunity_events` | AI-proposed follow-ups and their history | follow-up due, next step |
| `tasks` | a to-do (`state` open / done / cancelled, `origin` review / ai_generated / manual) | follow-up due and done |
| `coaching_assignments`, `practice_attempts`, `coaching_interests` | backend coaching: a manager assigns a scenario, the rep answers a short scored practice. Fixture data only | not used; the dashboard computes coaching from scores |
| `deletion_tombstones` | a recording deleted on request (19 in org 1) | never exported |
| `ai_provider_calls`, `ai_model_configurations`, `ai_configuration_validations`, `ai_validation_calls`, `ai_runtime_state` | AI usage, models and routing | none |
| `configuration_versions` | a company's rubric configuration | none |
| `audit_events`, `legacy_entity_ids`, `zocus_migrations`, `pgboss.*`, `support_grants`, `inclusion_events` | audit, plumbing, job queue | none |

## `sessions` columns that matter

- **Pipeline:** `capture_state` -> `transcription_state` -> `analysis_state` (`succeeded`, `queued`, `pending`) -> `review_state` (`unreviewed`, `approved`). `status`: `transcript_ready`, `analysing`, `review_ready`, `approved`, `reupload_required`. Until `analysis_state = succeeded` the conversation shows as "Being analysed".
- **Business:** `outcome` (JSON `stage`, `amountMinor`, `lossReason`), `sale_tag` (`yes` / `no`), `customer_name`, `customer_phone`, `summary`, `captured_at`, `ended_at` (UTC; shown in the company timezone).
- **Quality:** `qualification_status` (`complete`, `partial`, `unassessable`), `ai_held` (AI processing paused; the session keeps analysis from an earlier run), `analysis_runs.model` / `prompt_version` (older runs used older prompts).
- **Lifecycle:** `deleted_at`, `expires_at` (6-month retention).

## Traps

1. Fixture companies are fake. Never present them as real.
2. `rep_id` is the recorder, not the speaker.
3. A score exists only if the rubric run was judged eligible. Otherwise the exporter estimates from the analysis "observed / not observed" review and says so.
4. Staff rarely tag outcomes. The exporter falls back to the AI's outcome stage (`considering` counts as "will return").
5. Sale value is the recorded amount, else the customer's stated budget.
6. A recording is not in the CSV until it has an analysis; the exporter's meta file lists the rest as "still being analysed", "too short to score" or "upload failed".
7. Org 1 has no store name; `data/cases.json` supplies names for test stores, and the pilot entry names the dealership.
