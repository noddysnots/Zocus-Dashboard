#!/usr/bin/env node
/* Fictional "pilot day" demo: a car dealership, one day, five named reps, 2-hour blocks, a few 40 to 50 minute conversations
   with full speaker-turn transcripts. Everything here is invented. It shows what the dashboard looks like once real reps have
   logins. Writes data/demo/pilot-day.csv and data/demo/pilot-day.meta.json.   node tools/make-pilot-demo.mjs */
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let seed = 20261114; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)], ri = (a, b) => Math.floor(a + rnd() * (b - a + 1)), pad = n => String(n).padStart(2, '0');
const DAY = '2026-11-14', STORE = 'Apex Motors (fictional demo)', OWNER = 'Mr. Kapoor';
const REPS = [{ n: 'Rohan Desai', sk: 80 }, { n: 'Meera Iyer', sk: 76 }, { n: 'Imran Qureshi', sk: 62 }, { n: 'Sneha Patil', sk: 58 }, { n: 'Vikram Nair', sk: 42 }];
const MODELS = [['Apex Trail SUV', 1450000], ['Apex City hatchback', 780000], ['Apex Glide sedan', 1180000], ['Apex Volt EV', 1650000], ['Apex Haul pickup', 1320000], ['Apex Trail SUV diesel', 1790000]];
const TYPES = ['First car buyer', 'Upgrading from an older car', 'Family with kids', 'Company or fleet', 'Used car exchange'];
const CUST = ['Karan Malhotra', 'Anjali Rao', 'Farhan Sheikh', 'Divya Menon', 'Sanjay Gupta', 'Pooja Nair', 'Rahul Verma', 'Neha Kulkarni', 'Arvind Joshi', 'Tanvi Shah', 'Manish Bhat', 'Kavya Reddy', 'Suresh Pillai', 'Ritu Arora', 'Gaurav Sinha', 'Ishita Das', 'Naveen Kumar', 'Shweta Jain', 'Deepak Iyer', 'Sunita Rane'];
const COMPS = [['Northgate Motors', '0% processing fee this week'], ['Skyline Autos', 'Free accessories worth 40,000']];
const OBJ = [
  { code: 'budget', q: 'The on-road price is above what we planned.', a: 'Let me show you the finance option: the EMI works out lower than you expect, and the exchange value comes off the top.', t: 'Price above budget' },
  { code: 'competitor', q: 'Northgate quoted me less for a similar car.', a: 'Can I see their quote? Usually the difference is insurance and accessories. Let us line them up item by item.', t: 'Compared with another dealer' },
  { code: 'family', q: 'My wife and parents need to see it first.', a: 'Bring them for a test drive on Sunday. I will keep the car ready and hold this price for three days.', t: 'Needs family approval' },
  { code: 'stock', q: 'I wanted the white one, but you have only grey.', a: 'The white comes in on Tuesday. I can reserve it with a small token and call you the day it arrives.', t: 'Colour or variant not available' },
  { code: 'design', q: 'The mileage worries me for daily office travel.', a: 'The petrol variant gives about 17 in the city, and the EV costs a third as much per kilometre. Shall we compare both on a drive?', t: 'Mileage or running cost' },
];
const LINES = {
  greet: ['Good morning, welcome to Apex Motors. Looking for something specific today?', 'Hello, welcome. Have you had a look at our new arrivals?'],
  need: ['Tell me how you will use the car, mostly city or highway?', 'How many people usually travel with you?', 'Is this your first car or are you replacing one?'],
  needC: ['Mostly city, office and back, and long drives once a month.', 'Family of four, so space matters.', 'Replacing a seven year old hatchback.'],
  budget: ['What range are you comfortable with, including insurance?', 'Shall we talk about budget and whether you want a loan?'],
  budgetC: ['Around {B}, not much more than that.', 'We can stretch a little, but {B} is comfortable.'],
  show: ['This is the {M}. Turbo engine, six airbags, and a seven inch touchscreen as standard.', 'Let me walk you around the {M}. Boot space is the biggest in its class.', 'The top trim adds a sunroof and ventilated seats. Do you want to sit inside?'],
  showC: ['The seat is comfortable. How is the rear legroom?', 'Does it come with a service package?', 'What is the warranty on the battery and engine?'],
  drive: ['Let us take it for a drive. I will take the highway loop so you feel the pickup.', 'Notice the steering at low speed, it is very light in the city.'],
  driveC: ['Smooth. The suspension is better than my current car.', 'A little firm on the bumps, but okay.'],
  price: ['The ex-showroom is {P}. With insurance and registration it comes to about {O}.', 'With your exchange the net outgo is about {N}.'],
  priceC: ['That is on the higher side.', 'Okay, what would the monthly instalment be?'],
  close: ['I can hold the car for you for three days. Shall I note your number and book the test drive for the family?', 'If you decide this week the free accessory kit is included. I will call you on Friday.'],
  closeC: ['Yes, please call me on Friday.', 'Let me think it over and discuss at home.', 'Okay, book it, I will pay the token.'],
};
const fill = (t, m) => t.replace('{M}', m.model).replace('{P}', inr(m.price)).replace('{O}', inr(m.price * 1.13)).replace('{N}', inr(m.price * 1.13 - 250000)).replace('{B}', inr(m.budget));
const inr = v => 'Rs ' + (v / 100000).toFixed(1) + ' lakh';
const ts = sec => Math.floor(sec / 60) + ':' + pad(sec % 60);
function transcript(rep, m, dur, ob) {
  const flow = ['greet', 'need', 'needC', 'show', 'showC', 'budget', 'budgetC', 'drive', 'driveC', 'price', 'priceC', 'OBJ', 'close', 'closeC'];
  const turns = Math.max(14, Math.round(dur * 5)), out = []; const tot = dur * 60;
  for (let i = 0; i < turns; i++) {
    const phase = flow[Math.min(flow.length - 1, Math.floor(i / turns * flow.length))], at = Math.round(i / turns * tot);
    if (phase === 'OBJ') { out.push([at, i % 2 ? 'Rep' : 'Customer', i % 2 ? ob.a : ob.q]); continue; }
    const who = phase.endsWith('C') ? 'Customer' : 'Rep'; out.push([at, who, fill(pick(LINES[phase]), m)]);
    if (dur > 30 && rnd() < 0.5) out.push([at + 8, who === 'Rep' ? 'Customer' : 'Rep', who === 'Rep' ? pick(['Okay.', 'Right, and what about the service cost?', 'Can you explain that once more?', 'Hmm, and the resale value?']) : pick(['Sure, let me explain.', 'Good question. It is covered for three years.', 'I will check with the manager on that.'])]);
  }
  return out.sort((a, b) => a[0] - b[0]).map(t => `[${ts(t[0])}] ${t[1]}: ${t[2]}`).join('\n');
}
const CH = [['D1', 'Asked the occasion or purpose', 'need'], ['D3', 'Asked the budget', 'budget'], ['D4', 'Confirmed specifications', 'need'], ['P2', "Addressed the customer's priority", 'pitch'], ['P3', 'Explained the value', 'pitch'], ['O3', 'Answered the objection', 'objection'], ['N1', 'Agreed a next step and contact', 'close']];
const slots = [10, 10, 10, 11, 11, 11, 11, 11, 12, 12, 12, 13, 13, 13, 13, 13, 14, 14, 14, 15, 15, 15, 15, 15, 16, 16, 16, 17, 17, 17, 17, 17, 18, 18];
const rows = [], pending = [];
slots.forEach((h, i) => {
  const rep = REPS[(i * 3 + ri(0, 1)) % REPS.length], mm = pick(MODELS), min = ri(0, 55), at = `${DAY} ${pad(h)}:${pad(min)}`;
  const dur = rnd() < 0.18 ? ri(38, 52) : rnd() < 0.5 ? ri(14, 30) : ri(6, 13);
  const noise = ri(-12, 12), score = Math.max(25, Math.min(96, rep.sk + noise + (dur > 30 ? 4 : 0)));
  const sk = { need: score + ri(-8, 8), budget: score + ri(-10, 10), pitch: score + ri(-8, 8), objection: score + ri(-12, 6), close: score + ri(-12, 8) };
  Object.keys(sk).forEach(k => sk[k] = Math.max(15, Math.min(98, sk[k])));
  const roll = rnd() * 100, outcome = roll < score - 28 ? 'sold' : roll < score + 18 ? 'followup' : 'lost';
  const ob = pick(OBJ), comp = ob.code === 'competitor' || rnd() < 0.2 ? pick(COMPS) : null, budget = Math.round(mm[1] * (0.9 + rnd() * 0.2) / 50000) * 50000;
  const m = { model: mm[0], price: mm[1], budget }, tx = transcript(rep, m, dur, ob), turnsN = tx.split('\n').length;
  const cust = pick(CUST), checks = CH.map(([id, label, k]) => { const met = rnd() * 100 < sk[k]; return `${met ? 'MET' : 'NOT_MET'}: ${label} (${id}). ${met ? 'The rep did this clearly in the conversation.' : 'The rep did not do this when the opportunity came up.'}`; }).join(' | ');
  const low = Object.entries(sk).sort((a, b) => a[1] - b[1])[0][0];
  const TIP = { need: 'Ask what the car is for before showing models: the daily use decides the variant.', budget: 'Confirm the budget and whether a loan is needed before quoting the price.', pitch: 'Tie each feature to what the customer said they care about.', objection: 'Acknowledge the price concern, then compare total cost, not just the sticker price.', close: 'End with a booked next step: test-drive time, or a call date the customer agrees to.' };
  rows.push({
    conversation_id: 'ZC-' + (7001 + i), captured_at: at, rep_name: rep.n, outcome, value_inr: outcome === 'sold' ? mm[1] : budget, product: mm[0], score: Math.round(Object.values(sk).reduce((a, b) => a + b) / 5),
    score_need: sk.need, score_budget: sk.budget, score_pitch: sk.pitch, score_objection: sk.objection, score_close: sk.close,
    reason: outcome === 'sold' ? '' : ob.code, stage_reached: outcome === 'sold' ? '' : pick(['need_understood', 'product_shown', 'price_quoted']),
    customer_name: cust, customer_phone: `98${ri(10, 99)}x ${ri(10000, 99999)}`, duration_min: dur, customer_type: pick(TYPES), in_stock: rnd() < 0.85 ? 'yes' : 'no',
    competitor: comp ? comp[0] : '', competitor_offer: comp ? comp[1] : '', keywords: [ob.t, mm[0]].join('|'), customer_quote: ob.q,
    summary_wanted: `${mm[0]} around ${inr(budget)}`, summary_happened: `${rep.n.split(' ')[0]} showed the ${mm[0]}${dur > 20 ? ' and took a test drive' : ''}. ${ob.t}.`, summary_why: outcome === 'sold' ? '' : ob.t, summary_next: outcome === 'sold' ? 'Hand over documents and schedule delivery.' : 'Call the customer back and book a test drive.',
    objection: ob.code, objection_resolved: rnd() * 100 < sk.objection ? 'yes' : 'no', objection_quote: ob.q, objection_reply: ob.a,
    followup_due: outcome === 'sold' ? '' : '2026-11-16', followup_done: outcome === 'sold' ? '' : 'no', store_name: STORE, owner_name: OWNER,
    ai_coaching: score < 72 ? `${TIP[low].split(':')[0].split('.')[0]}: ${TIP[low]}` : '', ai_coaching_quote: score < 72 ? ob.q : '', ai_commitments: outcome === 'sold' ? 'Deliver within a week | Free first service' : 'Call back with the on-road price', ai_next_action: outcome === 'sold' ? '' : 'Call back within two days and offer a test drive.', ai_notes: '',
    ai_checks: checks, transcript: tx, vertical: 'car', talk_rep_pct: Math.round(rep.sk > 70 ? 46 + ri(-4, 4) : 62 + ri(-6, 6)), segments_n: turnsN, quality: '', ai_model: 'demo',
  });
});
pending.push({ id: 7101, at: `${DAY} 17:20`, rep: 'Sneha Patil', min: 47 }, { id: 7102, at: `${DAY} 18:05`, rep: 'Rohan Desai', min: 11 });
const head = ['conversation_id', 'captured_at', 'rep_name', 'outcome', 'value_inr', 'product', 'score', 'score_need', 'score_budget', 'score_pitch', 'score_objection', 'score_close', 'reason', 'stage_reached', 'customer_name', 'customer_phone', 'duration_min', 'customer_type', 'in_stock', 'competitor', 'competitor_offer', 'keywords', 'customer_quote', 'summary_wanted', 'summary_happened', 'summary_why', 'summary_next', 'objection', 'objection_resolved', 'objection_quote', 'objection_reply', 'followup_due', 'followup_done', 'store_name', 'owner_name', 'ai_coaching', 'ai_coaching_quote', 'ai_commitments', 'ai_next_action', 'ai_notes', 'ai_checks', 'transcript', 'vertical', 'talk_rep_pct', 'segments_n', 'quality', 'ai_model'];
const cell = v => { v = String(v ?? ''); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
fs.mkdirSync(path.join(root, 'data/demo'), { recursive: true });
fs.writeFileSync(path.join(root, 'data/demo/pilot-day.csv'), [head, ...rows.map(r => head.map(h => r[h]))].map(l => l.map(cell).join(',')).join('\n') + '\n');
fs.writeFileSync(path.join(root, 'data/demo/pilot-day.meta.json'), JSON.stringify({ store: STORE, exportedAt: `${DAY}T14:35:00.000Z`, exportedLocal: `${DAY} 20:05`, date: DAY, recorded: rows.length + pending.length, shown: rows.length, analysing: pending.slice(0, 1), failed: [], unscored: pending.slice(1), reps: REPS.map(r => ({ name: r.n, recorded: rows.filter(x => x.rep_name === r.n).length })) }, null, 1));
console.log(`Wrote ${rows.length} fictional conversations (${rows.filter(r => +r.duration_min >= 38).length} over 38 minutes) to data/demo/pilot-day.csv`);
