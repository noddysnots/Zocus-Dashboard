# Pilot day flow (Saturday 14 Nov 2026, Mahindra showroom)

Decided with the team on 13 Nov. This replaces the earlier plan (one login per rep, 2-hour blocks).

- **One day, one snapshot.** No hourly view, no trends, no comparisons. The dashboard is refreshed 2 to 3 times (about 12 pm, 4 pm, 8 pm) and shows when it was updated and how many conversations it held at each earlier update.
- **One phone records everything.** A Zocus team member records every conversation back to back, in the existing Zocus company. The database therefore cannot tell which showroom rep handled a customer.
- **The team's notes fill the gaps.** Rep name, customer name, segment, model, a value, and which calls to drop come from the Zocus WhatsApp group and go into `data/pilot-notes.json`.
- **Car wording.** Booked / Will return / Did not book, test drive, on-road price, showroom. "After the booking" lists accessories and add-ons with prices, payment and open issues once a customer has come back after booking, and says "To be updated" until then.
- **The dealer gets a locked link**: `https://<site>/?dealer`.

## What the floor told us (14 Nov, Abhishek)

- XUV 7XO and Scorpio are about 70% of sales, mostly diesel. The dealer wants to move the other models.
- Customers arrive with a model and colour in mind and choose between 2, at most 3. They may upgrade, never downgrade. Availability decides.
- Mahindra buyers care about performance, not mileage.
- Giving a quotation is the big step; a test drive does not move the needle much.
- 8 reps for regular customers, 2 for EV; the EV rep shows the EV first.

(This was the first design. The Overview is now conversation by conversation: see "How the pilot day is shown" below.) The quotation is still the key step; the funnel is Talked, Need understood, Options shown, **Quotation given**, Booked; and there are cards for the model mix (best sellers vs other models vs EV), models compared, what customers care about, fuel, colour, availability and test drives. The first action is always "send the quotation to customers who left without one". Reps with fewer than 3 conversations are not ranked or rated. Add fuel, colour and "quotation given?" to the WhatsApp line when they are not said aloud.

## Who sees what

Three addresses. The plain site opens on the Mahindra pilot store with a dropdown that also offers the fictional sample day (no upload, no other stores). **`/?dealer`** is the one to share: the pilot store only, no dropdown. `/?all` is for the Zocus team: every store, the demos and the test calls, and upload.

## The stores in the dropdown (/?all)

| Group | What it is |
|---|---|
| **Pilot** | "Mahindra showroom (pilot)": every recording in the Zocus company on the pilot date, minus the calls the team dropped |
| **Real test calls** | The team's own test recordings (Tanishq, TVS, Mahindra): per-conversation analysis only. These files are not on the public site |
| **Demo (fictional)** | "Mahindra showroom: sample day (fictional data)" shows what a full pilot day looks like; the sample store shows several weeks of a jewellery store |

## Before the day

1. Set the dealership's name: `name` of the `pilot` entry in `data/cases.json` (ask Claude: "the pilot dealership is called …").
2. Push the code so Vercel has it. The pilot store then says "No conversations yet today".
3. If the dealer has a price list, replace the bands in `data/price-list.json`. Until then the bands are the placeholders from the team's sample.

## During the day

**Each conversation**

- Record on the phone. If you can, type the customer's name in the app's customer box. Typing `Rep / Customer` (for example `Rohan / Mr Shah`) tags both automatically.
- Post one line on WhatsApp: start time, rep, customer, anything that was not said aloud (model, price), and whether to keep or drop the call.
- If the rep says the on-road price during the conversation, it is picked up automatically. Saying the model name once also helps ("so, the Scorpio N…").

**Each refresh (about 12 pm, 4 pm, 8 pm)**

1. Paste the WhatsApp notes to Claude and say "refresh the pilot".
2. Claude matches each note to a recording by its start time, updates `data/pilot-notes.json`, and runs `node tools/refresh-pilot.mjs`. That exports the day (read-only), applies the notes, checks the file with the dashboard's own parser and commits locally. It never pushes.
3. Claude replies with the list of conversations (number, time, length, rep, customer, model, value and where the value came from), the calls that look weak, and what is still being analysed.
4. You push to GitHub. Vercel redeploys in about a minute. Reload the page.

**Dropping calls.** Nothing is dropped automatically. On each refresh the list flags calls that look weak (under 3 minutes, marked partial, cut off mid-conversation, no customer voice, not a sales conversation). Say which numbers to drop and why; the dashboard shows "2 left out (recording cut short)".

**Backup audio on the second phone.** Not part of the dashboard. The backend accepts uploaded recordings, so ask the backend person whether a backup file can be uploaded into Zocus; if it can, it appears at the next refresh like any other call.

## After

Final refresh, push, send the dealer `https://<site>/?dealer`. The link opens their store only: no store switcher, no demo stores, no upload. It hides the rest, it does not secure it: the link is open to anyone who has it, and the pilot file holds real customer names, phone numbers and conversation text (accepted 12 Nov).

## How each number is worked out

**Rep.** Team notes, else `Rep / Customer` typed in the app, else "Rep not tagged". Comparing reps with each other needs at least two tagged reps with three conversations each; until then each rep is compared with the showroom average.

**Customer.** Team notes, else the name typed in the app, else "Customer 1, 2, …" in the order of the day.

**Model.** Team notes, else the model named most often in the conversation (matched against `data/price-list.json`), else "Model not decided".

**Value.** First match wins, and the dashboard shows the source next to every value:

1. a number the team sent ("entered by team")
2. an amount recorded in the app ("recorded in the app")
3. a price said in the conversation: the AI's quoted price if it found one, else the last rupee figure on a line about on-road, ex-showroom, price or quotation. Lines about EMI, down payment, discount, exchange, insurance, **a battery, a charger or a replacement** are ignored (a ₹10 lakh battery replacement cost once looked like a car price), and only ₹3 lakh to ₹60 lakh counts ("said in the call")
4. the customer's stated budget, read only from the customer's own lines ("customer budget")
5. the midpoint of the model's band in `data/price-list.json` ("indicative by model", shown with a ~), only when the customer compared **3 models or fewer**
6. no model decided, or 4 or more models compared: no value. The conversation still counts everywhere except in rupee totals ("value not known")

**Segment.** Team notes, else mapped from what the AI captured about the buyer: First car in the family, Family upgrade to a 7-seater, Switching to electric, Lifestyle and off-road, Replacing current car, Used car buyer, Business use, Daily city use, Family car, else "Not clear".

**Quotation given.** Yes when the rep gave an on-road or ex-showroom figure (or a price for the variant), or a quotation was written for the customer. A spoken range ("15 to 17 lakh") or a rough price is **not** a quotation. "Promised" when the rep said it would be sent.

**Fuel.** Petrol, diesel and electric as the customer discussed them. When every model compared is electric the fuel is Electric, whatever versions the rep listed.

**Result.** Staff tag if there is one, else the AI's reading of the conversation. Unclear ones count as "Will return".

**Step reached.** Estimated: need understood (a purpose was captured), test drive done (the conversation shows one was taken), price quoted (a price was discussed).

**Scores.** Real rubric scores when the scorer judged the conversation complete enough, otherwise an estimate from the AI's review. The export report says which.

**Coaching examples.** A rep's answer is shown as "What works" only if the objection was resolved and that conversation scored 70 or more on the skill. Otherwise the dashboard shows a line marked "Suggested line · Zocus playbook", which is never credited to a rep.

## Known limits

- The Zocus company is set up as a jewellery store in the backend (the backend knows only jewellery and real estate). The AI cannot check car facts against a car catalogue, so the "Walkaround and test drive" score rests on fewer checks, and the AI's remarks about the jewellery catalogue are filtered out. Fix if wanted: the backend swaps that company's product list and field names to Mahindra; it only affects calls recorded after the change.
- A price read from the transcript can be wrong when several figures are said. Every refresh lists the prices it read so they can be corrected on WhatsApp.
- Number words in Hindi ("atharah lakh") are not read as prices; digits and English number words are.
- The price bands are placeholders until the dealer shares a price list.
- Not built: the add-ons section ("After the booking"), a PDF report, a multi-week Mahindra sample store.

## How the pilot day is shown (from 14 Nov, 11 am)

The screen is built **conversation by conversation**, for the dealer's owner and managers.

- **Overview:** the team's original layout and card style (briefing with the skill and results panel, Booking conversion, **Bookings won in rupees** and Conversations recorded, Do these next, Team at a glance, Reps, Time with customers, Latest conversations) with **three small additions**: an alert line at the top when a conversation after the booking needs attention, one line of stage chips (Exploring, Finalising, After booking) under the number cards, and one slim timeline of the day. The open promises are the entries of "Do these next"; the floor's note for the day is one muted sentence under the briefing. Where no price or booking exists the cards show a dash and say what is known (for example "None booked yet · ₹27.3L quoted so far"). What is fixed and what may be added is written in `docs/DASHBOARD_CONTRACT.md`.
- **Conversation panel:** the five-part AI summary (Customer need, What happened, Outcome, Why, Next step), what the customer wants, **prices quoted** (written by Claude at each refresh from the AI summary and the recording), customer concerns, promises with messages, **How the rep did** (10 checks, Done / Partly / Missed, each with the reason and the line), the transcript (side talk and phone calls collapsed, English under key lines) and notes from the floor.
- **Times:** start to end of each conversation everywhere, clock time on every transcript line, and "analysed at" in the panel footer.
- **Scores:** from the backend's automotive scoring (points-score-v3): the checks that apply give the score (done 100, partly 50, missed 0): 9 of the 10 for early enquiries, 7 of the 10 for customers who have already chosen a model; the test-drive check is shown but not scored because the dealer says it matters little. A conversation with no real score shows "Score not available yet", never an invented number.
- **Reps** are nicknames from the floor (rep 1 Speed Racer, rep 2 Black and White Stripe). A rep is ranked only from 3 conversations.
- **The dealer link** (the site address plus `/?dealer`) hides the store menu, the demo, the "left out" counts and the first-visit tour.

### Refresh (each time the team posts notes)
1. Paste the WhatsApp notes here. Claude updates `data/pilot-notes.json`: `rep`, `models`, `fuel`, `colour`, `remarks`, `prices` (what was quoted), `tr_en` (English for key transcript lines), `csv` (any column), `drop`.
2. Claude reads each new transcript **in full**, writes the notes, and runs `node tools/refresh-pilot.mjs`. The refresh exports (read-only), applies the notes and then runs **the audit** (`tools/audit-pilot.mjs`): times, summary, rubric marks and score against the database; every English line and every price against the transcript; names spoken in the audio; the checked answers in `tests/pilot-golden.json`. A FAIL stops the commit. Claude commits locally and sends you the list of things to confirm (names, stages, prices).
3. Before every push Claude also runs the browser check (`/tools/check.html`: all stores, desktop and phone, the dealer link) and reports it.
4. You push; Vercel redeploys; reload.

A call is dropped only when the team says so (for example #263, a fragment, was dropped on 14 Nov).

### Conversations after the sale
A delivery-day conversation (accessories, a dispute) is not a sales pitch. Mark it in `data/pilot-notes.json` with `"kind": "delivery"` (and `result_label`, for example "Delivery dispute"). It then stays out of every sales number, is not scored, has no value, and is shown in its own card "After the sale: needs attention", on the timeline in purple, in the conversation list and with its promises. First case: #264, 14 Nov.

### Journey stage (14 Nov, from the floor)
Abhishek, 11:48 am: today's traffic is mostly model finalisation, accessory selection and payment finalisation; a normal day is mostly early enquiries. Every conversation now carries a stage, set in the notes file (`"stage"`) or guessed from the AI summary (the refresh list says which, please confirm):
- **exploring**: early enquiry; all nine scored checks count.
- **finalising**: the customer has chosen a model and is settling variant, price, finance, stock; "understand the need" and "ask the budget" are shown as "Not counted" and are left out of the score.
- **after_booking**: accessories, payment, delivery or a dispute; not scored, left out of the sales numbers, shown under "After the sale" and in the "After the booking" tab (accessories and add-ons with prices, payment status, open issues). `payment` in the notes shows the payment status.
The team's one-line note about the day goes in the notes file as `"daynote"` and is shown on the Overview.

### Going deeper per conversation (14 Nov, afternoon)
Volumes are low, so each conversation carries more, all written by hand into `data/pilot-notes.json` at the refresh and checked by the audit (every time given must be the start of a real transcript line):
- `visit` and `history`: first or repeat visit and what we know of earlier visits (from the floor, or from the recording).
- `stock`: what the customer wanted, what is in hand (`inhand`: yes, no, unknown), what else the rep offered. This is the dealer's main aim: sell what is in stock, move waiting customers to another colour or a higher model.
- `objections`: the customer's line, the rep's answer, a verdict and a suggested line (marked "Zocus playbook").
- `followups`: what was promised, by when, with a message; `s: 1` marks our own suggestion.
- `arrived` (counter punch-in, gives the wait time) and `need_form` (Mahindra's need-analyzer answers): empty until the dealer shares them. Do not fill Mahindra's form.
- `crm`: variant, payment, delivery wanted, exchange, registration.

**CRM sheet.** `node tools/make-crm.mjs` (run by the refresh) writes `data/cases/pilot-crm.csv`: one row per visit, our columns filled, ten columns left for the dealer (customer name, mobile, enquiry or SalesGenie ID, need-analyzer answers, punch-in time, booking amount, booking date, promised delivery, SalesGenie follow-up result, final outcome). `data/crm-template.csv` is the same sheet empty. Mobile numbers spoken in a recording are never copied into it. Download: Data menu, "CRM sheet (CSV)".

**Day report.** Data menu, "Day report (PDF)": the day's numbers, one table of all conversations, then every conversation in full. "Save as PDF" uses the browser's print.

### The rep's CRM record (14 Nov, 5:40 pm)
Abhishek sent screenshots of the rep's CRM app: the fields a rep types by hand every day (enquiry details, product, variant, customer profile, owned vehicle, test drive, remarks, follow-up, lost reason). We emulate them for every conversation: the panel has a folded **CRM record** card in the app's order, and the CRM sheet (Data menu) has the same fields as columns. Each value shows where it came from (recording, backend analysis, floor, team, rule). Age, gender and address are never inferred; customer name, phone, enquiry numbers, need-analyzer answers and booking details are dealer columns, left blank. Customer names, phones and addresses seen in the screenshots are not copied into this repository. The exporter builds it (`buildCrm` in `tools/export-from-db.mjs`) from the backend's analysis plus the `crm` note (variant, seating, occupation, purchase type, delivery wanted, payment); the later step is to move the same fields into the backend.

### One visit recorded in several parts
When the same customer is recorded again (for example a test drive with another rep), add `"merges": [{"parts": [275, 281], "label": "Test drive with Hardik"}]` to the notes file. The next refresh shows one row: first start to last end, lengths added, the follow-ups, concerns, prices and English lines of both parts, the transcript with a "Part 2" divider and correct clock times, and a "Parts of this visit" card with each part's own backend summary (no combined summary is written). The checks and score are the first part's; the first part's rep is the row's rep. The merge waits until every part is analysed. The audit checks each part against the database.

### Names
Customers are shown as "Customer at 11:54 am" and are never named from the recording; message drafts do not greet by a name the team has not given. Reps are the floor nicknames and names the team gives. A name that is also **spoken in the audio** is flagged by the audit until the floor confirms it. For #266 the rep is **Hardik** (Hardikkumar Joshi in the rep's CRM app, seen on 14 Nov, 5:40 pm): "Hardik Joshi" at 23:18 is the rep giving his own name for WhatsApp, and "Hardik bhai" at 15:11 is customers addressing the rep. The dashboard shows first names only. The rep's customer record for the 11:45 am XEV 9e walk-in probably matches #266; that customer's name, phone and address are not copied here.

### Things to know
- **"Mark done" on promises is saved in the browser it was clicked in.** It does not sync, so the dealer's screen will not show what the team marked.
- **Outcome tags:** a result comes from a tag set in the app when there is one, otherwise from the AI. #261 was tagged "no" in the app while the AI reads the customer as still considering; on 14 Nov the user chose "Will return", set in the notes (`"csv": {"outcome": "followup"}`). The tag in the app is unchanged.
- **Seconds:** clock times on transcript lines are the recording start plus the offset, shown to the minute.
- **The pilot file in the public repository contains the full transcripts**, including any names spoken in the room and in side talk (accepted on 12 Nov).
