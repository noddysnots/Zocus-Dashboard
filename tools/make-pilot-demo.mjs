#!/usr/bin/env node
/* Fictional "pilot day" demo: a car showroom, one day shown as a single snapshot, five named reps, a few 40 to 50 minute
   conversations with full speaker-turn transcripts, values with their source (said in the call / customer budget / indicative by
   model / not known), one call left out by the team and an update log (12 pm, 4 pm, 8 pm). Everything here is invented.
   It shows what the dashboard looks like on a pilot day. Writes data/demo/pilot-day.csv and data/demo/pilot-day.meta.json.
   node tools/make-pilot-demo.mjs */
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let seed = 20261114; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)], ri = (a, b) => Math.floor(a + rnd() * (b - a + 1)), pad = n => String(n).padStart(2, '0');
const DAY = '2026-11-14', STORE = 'Mahindra showroom: sample day (fictional data)', OWNER = 'Mr. Kapoor';
const PL = JSON.parse(fs.readFileSync(path.join(root, 'data/price-list.json'), 'utf8'));
const REPS = [{ n: 'Rohan Desai', sk: 80 }, { n: 'Meera Iyer', sk: 76 }, { n: 'Imran Qureshi', sk: 62 }, { n: 'Sneha Patil', sk: 58 }, { n: 'Vikram Nair', sk: 42 }];
const MODELS = PL.models.map(m => [m.label, Math.round((m.range[0] + m.range[1]) / 2), m]);
const BESTS = MODELS.filter(x => x[2].bestSeller), OTHERS = MODELS.filter(x => !x[2].bestSeller && !x[2].ev), EVS = MODELS.filter(x => x[2].ev);
const PRI = ['Performance', 'Safety', 'Features', 'Space', 'Comfort', 'Price and offers', 'Mileage', 'Service'], PRI_W = [9, 6, 5, 4, 4, 5, 1, 2];
const wpick = (a, w) => { let r = rnd() * w.reduce((x, y) => x + y, 0); for (let i = 0; i < a.length; i++) { r -= w[i]; if (r <= 0) return a[i]; } return a[0]; };
const TYPES = ['First car in the family', 'Family upgrade to a 7-seater', 'Switching to electric', 'Lifestyle and off-road', 'Replacing current car', 'Daily city use'];
const CUST = ['Karan Malhotra', 'Anjali Rao', 'Farhan Sheikh', 'Divya Menon', 'Sanjay Gupta', 'Pooja Nair', 'Rahul Verma', 'Neha Kulkarni', 'Arvind Joshi', 'Tanvi Shah', 'Manish Bhat', 'Kavya Reddy', 'Suresh Pillai', 'Ritu Arora', 'Gaurav Sinha', 'Ishita Das', 'Naveen Kumar', 'Shweta Jain', 'Deepak Iyer', 'Sunita Rane'];
const COMPS = [['Tata', 'A bigger festive discount'], ['Hyundai', 'Quicker delivery on the Creta']];
const OBJ = [
  { code: 'making', q: 'The on-road price is coming out too high, and the discount is small.', a: 'Let me write one final on-road price, with the exchange bonus and the corporate offer netted off.', t: 'On-road price too high' },
  { code: 'budget', q: 'Our budget was lower than this, and the EMI is too high.', a: 'How much would you like to put down? I will work out the EMI right now.', t: 'Over budget, EMI not worked out' },
  { code: 'competitor', q: 'We will look at Tata and Hyundai once, then let you know.', a: 'Do compare. Also compare the safety rating, resale value and service network.', t: 'Comparing with another brand' },
  { code: 'family', q: 'My father wants to drive it once, we will bring him on Sunday.', a: 'I will send a test-drive car home on Sunday, so your father can drive it there.', t: 'Needs family approval' },
  { code: 'stock', q: 'I wanted the diesel automatic, and you say the wait is four months.', a: 'The petrol automatic is in stock. You could take a test drive today.', t: 'Long waiting period for the variant' },
  { code: 'design', q: 'The drive was fine, but nobody showed us the features.', a: 'This time you drive, and I will show you ADAS and the other features on the way.', t: 'Not convinced after the test drive' },
  { code: 'exchange', q: 'This little for my old car? I am getting more outside.', a: 'I will get your car evaluated in 15 minutes, and you also get the exchange bonus.', t: 'Exchange value too low' },
];
const LINES = {
  greet: ['Good morning, welcome to the showroom. Looking for something specific today?', 'Hello, welcome. Have you had a look at our new arrivals?'],
  need: ['Tell me how you will use the car, mostly city or highway?', 'How many people usually travel with you?', 'Is this your first car or are you replacing one?'],
  needC: ['Mostly city, office and back, and long drives once a month.', 'Family of six, so space matters.', 'Replacing a seven year old hatchback.'],
  budget: ['What range are you comfortable with, including insurance?', 'Shall we talk about budget and whether you want a loan?'],
  budgetC: ['Around {B}, not much more than that.', 'We can stretch a little, but {B} is comfortable.'],
  show: ['This is the {M}. Six airbags and a ten inch touchscreen as standard.', 'Let me walk you around the {M}. The boot is the biggest in its class.', 'The top variant adds a sunroof and ventilated seats. Do you want to sit inside?'],
  showC: ['The seat is comfortable. How is the rear legroom?', 'Does it come with a service package?', 'What is the warranty on the engine?'],
  drive: ['Let us take it for a test drive. I will take the highway loop so you feel the pickup.', 'Notice the steering at low speed, it is very light in the city.'],
  driveC: ['Smooth. The suspension is better than my current car.', 'A little firm on the bumps, but okay.'],
  price: ['The on-road price of the {M} comes to {O}, with insurance and registration.', 'With your exchange the net outgo is lower. I will write it down for you.'],
  priceC: ['That is on the higher side.', 'Okay, what would the monthly instalment be?'],
  close: ['I can hold the car for you for three days. Shall I note your number and book the test drive for the family?', 'If you decide this week the accessory pack is included. I will call you on Friday.'],
  closeC: ['Yes, please call me on Friday.', 'Let me think it over and discuss at home.', 'Okay, book it, I will pay the booking amount.'],
};
const inr = v => 'Rs ' + (v / 100000).toFixed(1) + ' lakh';
const fill = (t, m) => t.replace('{M}', m.model).replace('{O}', inr(m.price)).replace('{B}', inr(m.budget));
const ts = sec => Math.floor(sec / 60) + ':' + pad(sec % 60);
function transcript(m, dur, ob, phases) {
  const turns = Math.max(14, Math.round(dur * 5)), out = [], tot = dur * 60;
  for (let i = 0; i < turns; i++) {
    const phase = phases[Math.min(phases.length - 1, Math.floor(i / turns * phases.length))], at = Math.round(i / turns * tot);
    if (phase === 'OBJ') { out.push([at, i % 2 ? 'Rep' : 'Customer', i % 2 ? ob.a : ob.q]); continue; }
    const who = phase.endsWith('C') ? 'Customer' : 'Rep'; out.push([at, who, fill(pick(LINES[phase]), m)]);
    if (dur > 30 && rnd() < 0.5) out.push([at + 8, who === 'Rep' ? 'Customer' : 'Rep', who === 'Rep' ? pick(['Okay.', 'Right, and what about the service cost?', 'Can you explain that once more?', 'Hmm, and the resale value?']) : pick(['Sure, let me explain.', 'Good question. It is covered for three years.', 'I will check with the manager on that.'])]);
  }
  return out.sort((a, b) => a[0] - b[0]).map(t => `[${ts(t[0])}] ${t[1]}: ${t[2]}`).join('\n');
}
const CH = [['D1', 'Asked what the car is for', 'need'], ['D3', 'Asked the budget', 'budget'], ['D4', 'Confirmed variant, fuel and features wanted', 'need'], ['P2', "Addressed the customer's priority", 'pitch'], ['P3', 'Explained the value', 'pitch'], ['O3', 'Answered the objection', 'objection'], ['N1', 'Agreed a next step and contact', 'close']];
const TIP = { need: 'Ask what the car is for before showing models: the daily use decides the variant.', budget: 'Confirm the budget and whether a loan is needed before quoting the price.', pitch: 'Tie each feature to what the customer said they care about.', objection: 'Acknowledge the price concern, then compare total cost, not just the sticker price.', close: 'End with a written on-road quotation in hand and a call date the customer agrees to.' };
/* one phone records back to back, so conversations never overlap: a morning run, a lunch gap, an afternoon run */
const sched = []; { let tc = 10 * 60 + 8; while (tc < 19 * 60 + 20 && sched.length < 40) { if (tc >= 13 * 60 && tc < 14 * 60 + 20) tc = 14 * 60 + 20; const d = rnd() < 0.18 ? ri(30, 48) : rnd() < 0.5 ? ri(14, 26) : ri(6, 12); sched.push({ start: tc, dur: d }); tc += d + ri(2, 14); } }
const hhmm = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const RUBS = [['need', 'Understood what the customer wants', 'need'], ['budget', 'Asked the budget', 'budget'], ['options', 'Showed the right options', 'pitch'], ['experience', 'Offered a test drive or showroom visit', 'pitch'], ['value_proof', 'Explained why this car is worth it', 'pitch'], ['price_offers', 'Gave a clear price and offers', 'objection'], ['concerns', "Answered the customer's concerns", 'objection'], ['decision_timing', 'Found out when and how they decide', 'close'], ['ask', 'Asked for the booking', 'close'], ['next_step', 'Agreed a next step with a date', 'close']];
const REAS = { done: ['The rep did this clearly and the customer responded.', 'Handled well, with a specific example for this customer.'], partly: ['The rep did this only in part; a detail was left open.', 'Raised it, but did not follow it through.'], missed: ['This did not come up in the conversation.', 'The customer asked for it and the rep moved on.'] };
const PTS = { done: 100, partly: 50, missed: 0 }, MET = { done: 'MET', partly: 'PARTLY', missed: 'NOT_MET' };

const rows = [];
sched.forEach(({ start, dur: dur0 }, i) => {
  const rep = REPS[(i * 3 + ri(0, 1)) % REPS.length], ev = rnd() < 0.12, mm = ev ? pick(EVS) : rnd() < 0.68 ? pick(BESTS) : pick(OTHERS), at = `${DAY} ${hhmm(start)}`;
  const dur = dur0;
  const noise = ri(-12, 12), score = Math.max(25, Math.min(96, rep.sk + noise + (dur > 30 ? 4 : 0)));
  const sk = { need: score + ri(-8, 8), budget: score + ri(-10, 10), pitch: score + ri(-8, 8), objection: score + ri(-12, 6), close: score + ri(-12, 8) };
  Object.keys(sk).forEach(k => sk[k] = Math.max(15, Math.min(98, sk[k])));
  const roll = rnd() * 100, outcome = roll < score - 28 ? 'sold' : roll < score + 18 ? 'followup' : 'lost';
  const ob = pick(OBJ), comp = ob.code === 'competitor' || rnd() < 0.2 ? pick(COMPS) : null, budget = Math.round(mm[1] * (0.9 + rnd() * 0.2) / 50000) * 50000;
  /* how much of the conversation happened decides where the value comes from */
  const undecided = outcome !== 'sold' && dur < 12 && rnd() < 0.45;                    // browsing: no model, no value
  const priced = outcome === 'sold' || (!undecided && rnd() < 0.45);                   // rep quoted an on-road price
  const budgeted = !priced && !undecided && rnd() < 0.4;                               // customer gave a budget
  const stage = outcome === 'sold' ? '' : undecided ? pick(['talked', 'need_understood']) : priced ? 'price_quoted' : dur > 18 ? 'product_shown' : 'need_understood';
  const phases = undecided ? ['greet', 'need', 'needC', 'OBJ', 'close', 'closeC'] : ['greet', 'need', 'needC', 'show', 'showC', ...(budgeted || priced ? ['budget', 'budgetC'] : []), ...(dur > 18 ? ['drive', 'driveC'] : []), ...(priced ? ['price', 'priceC'] : []), 'OBJ', 'close', 'closeC'];
  const price = Math.round(mm[1] * (0.94 + rnd() * 0.12) / 10000) * 10000;
  const m = { model: mm[0], price, budget }, tx = transcript(m, dur, ob, phases), turnsN = tx.split('\n').length;
  const [value, source] = undecided ? ['', ''] : priced ? [price, 'call'] : budgeted ? [budget, 'budget'] : [mm[1], 'indicative'];
  const product = undecided ? 'Model not decided' : mm[0];
  const nAlt = undecided ? 0 : rnd() < 0.45 ? 0 : rnd() < 0.75 ? 1 : 2, pool = (ev ? EVS : MODELS.filter(x => !x[2].ev)).filter(x => x[0] !== mm[0]);
  const considered = undecided ? [] : [mm[0], ...Array.from({ length: nAlt }, () => pick(pool)[0])].filter((x, j, a) => a.indexOf(x) === j);
  const fuel = ev ? 'Electric' : undecided ? '' : rnd() < 0.72 ? 'Diesel' : rnd() < 0.85 ? 'Petrol' : 'Diesel|Petrol';
  const colour = undecided || rnd() < 0.35 ? '' : pick(['Everest White', 'Stealth Black', 'Galaxy Grey', 'Deep Forest', 'Tango Red', 'Napoli Black']).toLowerCase();
  const avail = rnd() < 0.28, prio = [...new Set(Array.from({ length: ri(1, 3) }, () => wpick(PRI, PRI_W)))].concat(avail ? ['Availability'] : []);
  const quote = priced ? 'yes' : !undecided && rnd() < 0.35 ? 'promised' : 'no', td = dur > 18 ? 'yes' : rnd() < 0.2 ? 'offered' : 'no';
  const intent = outcome === 'sold' || (priced && rnd() < 0.6) ? 'high' : undecided ? 'low' : rnd() < 0.5 ? 'medium' : 'high';
  const cust = pick(CUST), checks = CH.map(([id, label, k]) => { const met = rnd() * 100 < sk[k]; return `${met ? 'MET' : 'NOT_MET'}: ${label} (${id}). ${met ? 'The rep did this clearly in the conversation.' : 'The rep did not do this when the opportunity came up.'}`; }).join(' | ');
  const low = Object.entries(sk).sort((a, b) => a[1] - b[1])[0][0];
  rows.push({
    conversation_id: 'ZC-' + (7001 + i), captured_at: at, rep_name: rep.n, outcome, value_inr: value, value_source: source, product, score: Math.round(Object.values(sk).reduce((a, b) => a + b) / 5),
    score_need: sk.need, score_budget: sk.budget, score_pitch: sk.pitch, score_objection: sk.objection, score_close: sk.close,
    reason: outcome === 'sold' ? '' : undecided ? 'browse' : ob.code, stage_reached: stage,
    customer_name: cust, customer_phone: `98${ri(10, 99)}x ${ri(10000, 99999)}`, duration_min: dur, customer_type: undecided ? 'Not clear' : ev ? 'Switching to electric' : pick(TYPES.filter(x => x !== 'Switching to electric')), in_stock: ob.code === 'stock' && outcome !== 'sold' && !undecided ? 'no' : 'yes',
    competitor: comp ? comp[0] : '', competitor_offer: comp ? comp[1] : '', keywords: [ob.t, ...(undecided ? [] : [mm[0]])].join('|'), customer_quote: undecided ? 'Abhi bas dekh rahe hain, kuch final nahi hai.' : ob.q,
    summary_wanted: undecided ? 'Still deciding what kind of car' : `${mm[0]}${source === 'budget' ? ' around ' + inr(budget) : ''}`, summary_happened: undecided ? `${rep.n.split(' ')[0]} asked a few questions; the customer was only enquiring.` : `${rep.n.split(' ')[0]} showed the ${mm[0]}${dur > 18 ? ' and took a test drive' : ''}${priced ? ', then quoted the on-road price' : ''}. ${ob.t}.`, summary_why: outcome === 'sold' ? '' : undecided ? 'Just enquiring' : ob.t, summary_next: outcome === 'sold' ? 'Confirm the delivery date.' : quote === 'yes' ? 'Call back on the quotation within two days.' : 'Send the written on-road quotation and call back.',
    objection: undecided ? '' : ob.code, objection_resolved: rnd() * 100 < sk.objection ? 'yes' : 'no', objection_quote: ob.q, objection_reply: ob.a,
    followup_due: outcome === 'sold' ? '' : '2026-11-16', followup_done: outcome === 'sold' ? '' : 'no', store_name: STORE, owner_name: OWNER,
    ai_coaching: score < 72 ? `${TIP[low].split(':')[0].split('.')[0]}: ${TIP[low]}` : '', ai_coaching_quote: score < 72 ? ob.q : '', ai_commitments: outcome === 'sold' ? 'Deliver within three weeks | Free first service' : 'Call back with the final on-road price', ai_next_action: outcome === 'sold' ? '' : 'Call back within two days with the on-road quotation.', ai_notes: '',
    ai_checks: checks, transcript: tx, vertical: 'car',
    models_considered: [...new Set([...(undecided ? [] : [product]), ...considered])].join('|'), model_group: undecided ? '' : mm[2].ev ? 'ev' : mm[2].bestSeller ? 'best' : 'other', fuel, colour, quote_given: quote, test_drive: td,
    availability: avail ? 'yes' : 'no', availability_quote: avail ? pick(['Diesel automatic mein abhi 6 weeks ki waiting chal rahi hai.', 'This colour has a waiting period of about two months.', 'Kab tak milegi? I need it before Diwali next year.']) : '', priorities: [...new Set(prio)].join('|'), intent, decision: considered.length === 1 ? 'decided' : considered.length >= 2 ? 'choosing' : 'exploring', talk_rep_pct: Math.round(rep.sk > 70 ? 46 + ri(-4, 4) : 62 + ri(-6, 6)), segments_n: turnsN, quality: '', ai_model: 'demo',
  });
  const end = start + dur, endAt = `${DAY} ${hhmm(end)}`, analysedAt = `${DAY} ${hhmm(Math.min(end + ri(4, 25), 20 * 60 + 2))}`;
  const lines = tx.split('\n');
  const marks = RUBS.map(([id, label, k]) => { const r = rnd() * 100, mk = r < sk[k] * 0.62 ? 'done' : r < sk[k] * 0.62 + (100 - sk[k] * 0.62) * 0.55 ? 'partly' : 'missed'; const ln = pick(lines.filter(l => /Rep:|Customer:/.test(l))).replace(/^\[[\d:]+\] (Rep|Customer): /, ''); return { id, label, k, mk, reason: pick(REAS[mk]), q: ln.slice(0, 120) }; });
  const sc = {}; marks.filter(x => x.id !== 'experience').forEach(x => (sc[x.k] ||= []).push(PTS[x.mk]));
  const skm = Object.fromEntries(Object.entries(sc).map(([k, a]) => [k, Math.round(a.reduce((x, y) => x + y, 0) / a.length)]));
  const overall = Math.round(marks.filter(x => x.id !== 'experience').reduce((a, x) => a + PTS[x.mk], 0) / 9);
  const first = rep.n.split(' ')[0], cf = cust.split(' ')[0];
  const promises = [];
  if (!undecided && (quote !== 'yes' || rnd() < 0.5)) promises.push({ t: `Send the ${mm[0]} quotation on WhatsApp`, d: `Hello ${cf}, this is ${first} from the showroom. Here is the on-road quotation for the ${mm[0]} we spoke about. Shall I book a test drive for you this week?`, q: 'I will send the quotation on WhatsApp to this number.', k: '', ph: '', due: '' });
  if (avail) promises.push({ t: `Confirm the delivery date for the ${mm[0]} and call the customer back`, d: `Hello ${cf}, ${first} here. I have checked: the ${mm[0]} can be delivered in about four weeks. Shall I reserve it with a token?`, q: 'Let me check the stock with the warehouse and call you back.', k: 'stock_check', ph: '', due: 'within about an hour' });
  if (outcome === 'followup' && rnd() < 0.5) promises.push({ t: 'Call back after the family has seen the car', d: '', q: ob.q, k: '', ph: '', due: '' });
  if (outcome === 'sold') promises.push({ t: 'Confirm the delivery date and paperwork', d: `Hello ${cf}, congratulations on your booking! I will confirm the delivery date shortly.`, q: 'Okay, book it, I will pay the booking amount.', k: '', ph: '', due: '' });
  const concerns = undecided ? [] : [{ t: ob.t, s: rnd() * 100 < sk.objection ? 'done' : 'partly', a: ob.a }];
  const flags = [rnd() < 0.25 ? 'Phone calls or other conversations interrupted the recording' : '', rnd() < 0.18 ? 'Several people were speaking' : ''].filter(Boolean);
  const prices = priced ? [{ m: mm[0], p: price, b: 'on-road, about', at: '5:12' }, ...(considered[1] ? [{ m: considered[1], p: Math.round((MODELS.find(x => x[0] === considered[1]) || [0, price])[1] / 10000) * 10000, b: 'on-road, about', at: '8:40' }] : [])] : [];
  const txx = [...lines]; if (rnd() < 0.5) txx.splice(Math.min(6, txx.length - 1), 0, `[0:55] Customer's companion: ${pick(['Ask about the mileage once.', 'What about the service cost?', 'Check the colour options also.'])}`); if (rnd() < 0.25) txx.push(`[${Math.floor(dur)}:10] Background: ${pick(['Sorry, I was just talking to the manager.', 'Yes, I will come to you in two minutes.'])}`);
  const sumParts = { need: undecided ? 'Customer was exploring and had not decided on a model.' : `Customer wants a ${mm[0]}${colour ? ' in ' + colour : ''}${budgeted ? ' with a budget of about ' + inr(budget) : ''}.`, happened: undecided ? `${first} asked a few questions; the customer was only enquiring.` : `${first} showed the ${mm[0]}${dur > 18 ? ' and took a test drive' : ''}${priced ? ', then quoted the on-road price at about ' + inr(price) : ''}. ${ob.t}.`, outcome: outcome === 'sold' ? 'The customer booked the car.' : 'No booking was made in the conversation.', why: outcome === 'sold' ? 'The price and delivery date suited the customer.' : (undecided ? 'The customer was only looking.' : ob.t + '.'), next: outcome === 'sold' ? 'Confirm the delivery date.' : quote === 'yes' ? 'Call back on the quotation within two days.' : 'Send the written on-road quotation and call back.' };
  Object.assign(rows.at(-1), {
    scored: 'yes', score: overall, score_need: skm.need, score_budget: skm.budget, score_pitch: skm.pitch, score_objection: skm.objection, score_close: skm.close,
    ai_checks: marks.map(x => `${MET[x.mk]}: ${x.label} (${x.id}). ${x.reason} ❝${x.q}❞`).join(' | '), transcript: txx.join('\n'),
    ended_at: endAt, analysed_at: analysedAt, sum_need: sumParts.need, sum_happened: sumParts.happened, sum_outcome: sumParts.outcome, sum_why: sumParts.why, sum_next: sumParts.next,
    promises_json: promises.length ? JSON.stringify(promises) : '', concerns_json: concerns.length ? JSON.stringify(concerns) : '', flags: flags.join('|'), remarks: rnd() < 0.15 ? 'A finance person joined the conversation.' : '', prices_json: prices.length ? JSON.stringify(prices) : '',
    f_budget: budgeted ? `About ${inr(budget)}` : '', f_preference: `${product}${colour ? ', ' + colour : ''}`, f_timing: avail ? 'Wants delivery soon' : '', f_competitor: comp ? comp[0] : '', tr_en: '',
  });
});
const head = ['conversation_id', 'captured_at', 'rep_name', 'outcome', 'value_inr', 'value_source', 'product', 'score', 'score_need', 'score_budget', 'score_pitch', 'score_objection', 'score_close', 'reason', 'stage_reached', 'customer_name', 'customer_phone', 'duration_min', 'customer_type', 'in_stock', 'competitor', 'competitor_offer', 'keywords', 'customer_quote', 'summary_wanted', 'summary_happened', 'summary_why', 'summary_next', 'objection', 'objection_resolved', 'objection_quote', 'objection_reply', 'followup_due', 'followup_done', 'store_name', 'owner_name', 'ai_coaching', 'ai_coaching_quote', 'ai_commitments', 'ai_next_action', 'ai_notes', 'ai_checks', 'transcript', 'vertical', 'talk_rep_pct', 'segments_n', 'quality', 'ai_model', 'models_considered', 'model_group', 'fuel', 'colour', 'quote_given', 'test_drive', 'availability', 'availability_quote', 'priorities', 'intent', 'decision', 'ended_at', 'analysed_at', 'scored', 'sum_need', 'sum_happened', 'sum_outcome', 'sum_why', 'sum_next', 'promises_json', 'concerns_json', 'flags', 'remarks', 'prices_json', 'f_budget', 'f_preference', 'f_timing', 'f_competitor', 'tr_en'];
const cell = v => { v = String(v ?? ''); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const upTo = hm => rows.filter(r => r.analysed_at.slice(11) <= hm).length;
const meta = {
  store: STORE, exportedAt: `${DAY}T14:35:00.000Z`, exportedLocal: `${DAY} 20:05`, date: DAY, recorded: rows.length + 2, shown: rows.length,
  analysing: [{ id: 7101, at: `${DAY} 19:48`, rep: 'Sneha Patil', min: 14 }], failed: [], unscored: [],
  leftOut: [{ id: 7103, at: `${DAY} 12:40`, why: 'Recording cut short' }],
  history: [{ at: `${DAY} 12:05`, shown: upTo('11:55') }, { at: `${DAY} 16:10`, shown: upTo('16:05') }, { at: `${DAY} 20:05`, shown: rows.length }],
  reps: REPS.map(r => ({ name: r.n, recorded: rows.filter(x => x.rep_name === r.n).length })),
};
fs.mkdirSync(path.join(root, 'data/demo'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/demo/pilot-day.csv'), [head, ...rows.map(r => head.map(h => r[h]))].map(l => l.map(cell).join(',')).join('\n') + '\n');
fs.writeFileSync(path.join(root, 'data/demo/pilot-day.meta.json'), JSON.stringify(meta, null, 1));
const by = k => rows.filter(r => r.value_source === k).length;
console.log(`Wrote ${rows.length} fictional conversations (${rows.filter(r => +r.duration_min >= 38).length} over 38 minutes) to data/demo/pilot-day.csv. Values: ${by('call')} said in the call, ${by('budget')} customer budget, ${by('indicative')} indicative, ${by('')} not known.`);
