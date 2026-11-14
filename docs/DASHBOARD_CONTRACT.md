# Dashboard contract

The dealer, and any analytics team, expects the dashboard to stay put: the same pages, the same sections, the same words. Conversations change every day; the dashboard does not. This file says what is fixed, where new things may go, and which rules change a number.

It is enforced by three checks you run before every push (see the end).

## 1. What is fixed

**The six pages and the menu**: Overview, Insights, Team, Coaching, Conversations, Follow-ups. No page is added, renamed or removed.

**The standard stores** (the sample jewellery store, Mira, Horizon, and the real test stores Tanishq, TVS two-wheeler) look exactly as they did before the pilot work (recorded on commit `6e0f797`): same headings, same number cards, same figures. `tests/contract.json` holds the recorded menu, headings and number cards.

**Accepted change, 14 Nov 2026:** stores whose vertical is `car` use car-dealer wording (Booking conversion, Bookings won, showroom, booked). This applies to the Mahindra test store and the pilot.

## 2. The pilot Overview

Original blocks, in the original order, with the original card style:

1. Briefing with the "Average skill score" and "Results" panel
2. Three number cards: **Booking conversion**, **Bookings won** (the revenue card), **Conversations recorded**. A dash, never a made-up figure, where there is nothing to show, with a line saying what is known ("None booked yet · ₹27.3L quoted so far")
3. "Do these next" and "Team at a glance"
4. Reps, Time with customers, Latest conversations

**Three additions, each one line or one slim card, and nothing else may be added without changing this file:**

| Slot | What | Shown when |
|---|---|---|
| Alert line (top) | "1 delivery-day conversation needs attention" with the AI outcome, opens the conversation | a conversation after the booking (a delivery, a dispute) exists |
| Stage chips (under the number cards) | Exploring · Finalising · After booking, with counts; tap to filter | always on a one-day pilot |
| The day so far (before Reps) | one slim timeline of the day | always on a one-day pilot |

Also inside the original blocks: the open promises are the entries of "Do these next" (copy-message buttons in the same rows); the floor's note for the day is one muted sentence under the briefing; the after-booking conversation is a row in Latest conversations with a purple pill.

**Removed on purpose** (they made the Overview busy): three journey cards, a day-note box, a large "After the sale" card, a separate "Promises to keep" card. Their detail lives in the conversation panel, the Follow-ups page and the "After the booking" tab.

## 2b. Depth added on 14 Nov (afternoon), inside existing pages

The floor asked for more detail per conversation because volumes are low. Nothing was added to the Overview. Each item below appears only when it has content, starts with one plain sentence and keeps the detail folded.

| Where | What |
|---|---|
| Conversation panel | "This visit" (first or repeat, what happened before, wait time, need-analyzer answers), "Stock match" (wanted, in hand, what else was offered), "Objections and answers" (replaces "Customer concerns" and "In their words" when written by hand), "Follow-ups" (was "Promised") |
| Follow-ups page | Follow-ups written by hand from the recording; our own suggestions carry a "Suggested" pill and are not counted in the menu badge |
| Coaching page | One card, "Objections today and how they were answered", per rep, with a suggested line |
| Insights | One tab, last in the row: "Demand vs stock" |
| Data menu | "Day report (PDF)": one long page built from the same panel sections, printed by the browser. "CRM sheet (CSV)": one row per visit, with blank columns for the dealer |

Added 14 Nov, 6 pm: a folded **CRM record** card in the conversation panel (the rep app's fields, filled from the conversation, with sources), a **Parts of this visit** card (only when one visit was recorded in several parts), and a CRM sheet laid out like the rep app. Nothing was added to the Overview or the menus.

A booked customer with open follow-ups shows "Booked · follow-up open" in the panel and the day report.

## 3. Rules that change a number

Everything below differs from the pre-pilot dashboard. Each is limited to one-day pilot stores (`snapshot`) or to car stores unless stated; the standard stores keep the original rule.

| Rule | Effect | Applies to |
|---|---|---|
| A conversation after the booking (delivery, accessories, a dispute) is left out of the sales numbers, is not scored, has no value | Sales counts show only sales conversations; the other is shown separately | pilot |
| No real score means a dash, never a made-up number | "Score not available yet" | pilot |
| **Scores are the backend's own** (changed 14 Nov, 7 pm): the mean of all the checks the backend marked, done 100, partly 50, missed 0, the test drive and the need and budget of a finalising customer included | The team sees the same numbers (best today 50); a note on the Overview says the scorer is strict | pilot |
| Team page (changed for the pilot): every rep with a conversation appears on Skills by rep; cells read as score/100; thin rows (fewer than 3 conversations) stay visible but are not coloured green/red against the showroom; a leader is named only if that rep has 3 or more conversations and scores at or above the showroom, otherwise the lead says the best conversation score and "N reps, M with enough conversations to compare"; the Reps table lists everyone sorted by score, ranks only from 3 conversations ("needs 3" instead of a dash), and the hint is "3 or more conversations are needed to rank". Top/Coach labels still need 3 conversations. Contract checks for Team were extended only for pilot / pilot-day / dealer | Skills grid shows all four reps; Jatin is not falsely named the leader | pilot |
| A single-rep store coaches on the rep's lowest skill, not always the first one | Coaching action names the real weakest step | pilot |
| Value: team number, recorded amount, price said in the call, customer budget, indicative by model (3 models or fewer compared), else "–" | Source is shown next to each value | car stores |
| A battery, charger or replacement cost is never a car price | The ₹10 lakh battery cost in #266 is not the car's value | car stores |
| Budget is read only from the customer's own lines, not from range-in-km talk | | car stores |
| "Quotation given" needs an on-road or ex-showroom figure from the rep or a quotation written for the customer; a spoken range ("15 to 17 lakh") is not a quotation | Overcounting removed | car stores |
| An all-electric shortlist is fuel "Electric" (the rep listing petrol, diesel and CNG as other versions does not count) | | car stores |
| A staff tag in the app decides the result ("yes" = Booked, "no" = Did not book) unless the notes override it; #262 is Booked from its tag, #261 is Will return by the user's choice | Booking conversion 1 of 4, Bookings won ₹11.2L | pilot |
| Customers are named only from the team's notes ("Customer at 11:54 am" otherwise); message drafts do not greet by a name the team never gave | | pilot |

## 4. What is checked before a push

1. `node tools/audit-pilot.mjs`: compares every pilot conversation with the database (times, summary, rubric marks, score), the notes and the transcript (every English line sits on a real line; every price is on the line at its time; names spoken in the audio are flagged), and with the checked answers in `tests/pilot-golden.json`. Any FAIL means do not push. WARN needs a person to look.
2. Browser check: serve the site (`node tools/serve.mjs 4173`) and open `/tools/check.html`. It loads every store at 1200 px and 375 px wide, walks the six pages, and fails on console errors, sideways scroll, a missing or unexpected heading, and any difference from the recorded standard stores. Also run on `/?dealer`.
3. `node tools/check-csv.mjs data/cases/pilot.csv` (the audit runs it): the dashboard's own parser accepts the file.

To change the contract on purpose: edit this file and `tests/contract.json` in the same commit and say why.

Price tables in the conversation panel show the exact rupee figure (for example ₹1,07,500), not a rounded lakh, so each figure can be checked against the transcript.

## Added 14 Nov, 8 pm

- **Overview, same slot:** the one-line "Rupee figures" hint under the number cards is now a folded card, "How these numbers are worked out": Bookings won, Quoted not booked (every figure with the line and time it came from, or the model's typical price marked ~), and Booking conversion with the counts. Closed by default; nothing else on the Overview moved. The day report prints it open.
- **Critical follow-up:** when the floor says a conversation needs one, it is a red "Critical" pill, the first row in "Do these next" and the first group ("Critical") on the Follow-ups page.
- **A result is shown as Booked only when the recording or the dealer says so.** The "sale: yes/no" tag in the Zocus app is set by the recording account (Abhishek), hours after the recording; it is shown as a source, not as a booking. #262 and #266 therefore read Will return (like #261) until the dealer confirms. Every conversation's panel and the breakdown card say where its figure and its result come from.

