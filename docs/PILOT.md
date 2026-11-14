# Pilot day flow (Saturday 14 Nov 2026, Mahindra showroom)

Decided with the team on 13 Nov. This replaces the earlier plan (one login per rep, 2-hour blocks).

- **One day, one snapshot.** No hourly view, no trends, no comparisons. The dashboard is refreshed 2 to 3 times (about 12 pm, 4 pm, 8 pm) and shows when it was updated and how many conversations it held at each earlier update.
- **One phone records everything.** A Zocus team member records every conversation back to back, in the existing Zocus company. The database therefore cannot tell which showroom rep handled a customer.
- **The team's notes fill the gaps.** Rep name, customer name, segment, model, a value, and which calls to drop come from the Zocus WhatsApp group and go into `data/pilot-notes.json`.
- **Car wording.** Booked / Will return / Did not book, test drive, on-road price, showroom. "After the booking" (add-ons) says "To be updated".
- **The dealer gets a locked link**: `https://<site>/?dealer`.

## What the floor told us (14 Nov, Abhishek)

- XUV 7XO and Scorpio are about 70% of sales, mostly diesel. The dealer wants to move the other models.
- Customers arrive with a model and colour in mind and choose between 2, at most 3. They may upgrade, never downgrade. Availability decides.
- Mahindra buyers care about performance, not mileage.
- Giving a quotation is the big step; a test drive does not move the needle much.
- 8 reps for regular customers, 2 for EV; the EV rep shows the EV first.

So the Overview leads with customers, high-intent customers and **quotations given**; the funnel is Talked, Need understood, Options shown, **Quotation given**, Booked; and there are cards for the model mix (best sellers vs other models vs EV), models compared, what customers care about, fuel, colour, availability and test drives. The first action is always "send the quotation to customers who left without one". Reps with fewer than 3 conversations are not ranked or rated. Add fuel, colour and "quotation given?" to the WhatsApp line when they are not said aloud.

## Who sees what

The site opens on the pilot store only (no switcher, demos or upload). The full app with demos and test stores is at `/?all`.

## The stores in the dropdown (/?all)

| Group | What it is |
|---|---|
| **Pilot** | "Mahindra showroom (pilot)": every recording in the Zocus company on the pilot date, minus the calls the team dropped |
| **Real test calls** | The team's own test recordings (Tanishq, TVS, Mahindra): per-conversation analysis only. These files are not on the public site |
| **Demo (fictional)** | "Apex Motors: pilot day" shows what a full pilot day looks like; the sample store shows several weeks of a jewellery store |

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
3. a price said in the conversation: the AI's quoted price if it found one, else the last rupee figure on a line about on-road, ex-showroom, price or quotation. Lines about EMI, down payment, discount, exchange or insurance are ignored, and only ₹3 lakh to ₹60 lakh counts ("said in the call")
4. the customer's stated budget ("customer budget")
5. the midpoint of the model's band in `data/price-list.json` ("indicative by model", shown with a ~)
6. no model decided: no value. The conversation still counts everywhere except in rupee totals ("value not known")

**Segment.** Team notes, else mapped from what the AI captured about the buyer: First car in the family, Family upgrade to a 7-seater, Switching to electric, Lifestyle and off-road, Replacing current car, Used car buyer, Business use, Daily city use, Family car, else "Not clear".

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

- **Overview, "Today at the showroom":** one sentence of facts, the day timeline (each conversation from start to end; gaps are visible), **Promises to keep** (what the rep promised each customer, when, and a ready message with Copy and Mark done), one card per conversation, and a small day strip. Bigger charts return at 8 or more conversations.
- **Conversation panel:** the five-part AI summary (Customer need, What happened, Outcome, Why, Next step), what the customer wants, **prices quoted** (written by Claude at each refresh from the AI summary and the recording), customer concerns, promises with messages, **How the rep did** (10 checks, Done / Partly / Missed, each with the reason and the line), the transcript (side talk and phone calls collapsed, English under key lines) and notes from the floor.
- **Times:** start to end of each conversation everywhere, clock time on every transcript line, and "analysed at" in the panel footer.
- **Scores:** from the backend's automotive scoring (points-score-v3): 9 of the 10 checks give the score (done 100, partly 50, missed 0); the test-drive check is shown but not scored because the dealer says it matters little. A conversation with no real score shows "Score not available yet", never an invented number.
- **Reps** are nicknames from the floor (rep 1 Speed Racer, rep 2 Black and White Stripe). A rep is ranked only from 3 conversations.
- **The dealer link** (the site address plus `/?dealer`) hides the store menu, the demo, the "left out" counts and the first-visit tour.

### Refresh (each time the team posts notes)
1. Paste the WhatsApp notes here. Claude updates `data/pilot-notes.json`: `rep`, `models`, `fuel`, `colour`, `remarks`, `prices` (what was quoted), `tr_en` (English for key transcript lines), `csv` (any column), `drop`.
2. Claude runs `node tools/refresh-pilot.mjs`, reads the new conversations against the recording, checks prices and values, and commits locally.
3. You push; Vercel redeploys; reload.

A call is dropped only when the team says so (for example #263, a fragment, was dropped on 14 Nov).
