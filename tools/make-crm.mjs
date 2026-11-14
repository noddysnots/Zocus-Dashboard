#!/usr/bin/env node
/* CRM sheet for the pilot: one row per customer visit, in the order and with the field names of the rep's CRM app (14 Nov screenshots),
   built from data/cases/pilot.csv (its crm_json column). Columns ending "(dealer)" are for the dealer or the CRM to fill so the two sides can be matched.
   Writes data/cases/pilot-crm.csv and the blank data/crm-template.csv. Phone numbers spoken in a recording are never copied here.
   node tools/make-crm.mjs   (tools/refresh-pilot.mjs runs it) */
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
function parseCsv(t) { const rows = []; let row = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c; } if (f || row.length) { row.push(f); rows.push(row); } const head = rows.shift().map(h => h.trim()); return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']))); }
const J = (s, d) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
const rows = parseCsv(fs.readFileSync(path.join(root, 'data/cases/pilot.csv'), 'utf8'));
const recs = rows.map(r => ({ r, crm: J(r.crm_json, { groups: [] }), p: J(r.promises_json, []), o: J(r.concerns_json, []) }));
const first = recs.find(x => x.crm.groups && x.crm.groups.length), layout = first ? first.crm.groups.flatMap(g => g.f.map(f => [g.g, f[0]])) : [];
const RES = { sold: 'Booked', followup: 'Will return', lost: 'Did not book' };
const DEALER = ['Customer name (dealer)', 'Mobile (dealer)', 'Alternate mobile (dealer)', 'Enquiry number (dealer)', 'DMS enquiry number (dealer)', 'Need-analyzer answers (dealer)', 'Counter punch-in time (dealer)', 'Customer comments (dealer)', 'Booking amount paid (dealer)', 'Booking date (dealer)', 'Promised delivery date (dealer)', 'SalesGenie follow-up result (dealer)', 'Final outcome (dealer)'];
const COLS = [['Date', x => x.r.captured_at.slice(0, 10)], ['Start time', x => x.r.captured_at.slice(11)], ['End time', x => (x.r.ended_at || '').slice(11)], ['Zocus conversation no.', x => x.r.conversation_id.replace(/\D/g, '')], ['Visit (first or repeat)', x => x.r.visit ? x.r.visit[0].toUpperCase() + x.r.visit.slice(1) : ''], ['What we know of earlier visits', x => x.r.visit_history],
  ...layout.map(([g, f]) => [`${g}: ${f}`, x => { const gg = (x.crm.groups || []).find(q => q.g === g), ff = gg && gg.f.find(q => q[0] === f); return ff ? ff[1] : ''; }]),
  ['Zocus: price discussed (Rs)', x => x.r.value_inr], ['Zocus: price basis', x => ({ call: 'said in the conversation', budget: 'customer budget', indicative: 'typical price for the model, not a quote', team: 'entered by the team', recorded: 'recorded in the app' })[x.r.value_source] || ''], ['Zocus: quotation given', x => x.r.kind === 'delivery' ? '' : ({ yes: 'Yes', promised: 'Promised', no: 'No' })[x.r.quote_given] || ''],
  ['Zocus: result', x => x.r.kind === 'delivery' ? (x.r.result_label || 'After booking') : RES[x.r.outcome] || ''], ['Zocus: customer concerns', x => x.o.map(c => c.t).join('; ')], ['Zocus: remarks from the floor', x => x.r.remarks],
  ...DEALER.map(h => [h])];
const q = v => { const s = String(v ?? '').replace(/\b[6-9]\d{4}[ -]?\d{5}\b/g, '').replace(/\s+/g, ' ').trim(); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const head = COLS.map(c => q(c[0])).join(',');
const body = recs.map(x => COLS.map(([, f]) => q(f ? f(x) : '')).join(','));
fs.writeFileSync(path.join(root, 'data/cases/pilot-crm.csv'), '﻿' + [head, ...body].join('\n') + '\n');
fs.writeFileSync(path.join(root, 'data/crm-template.csv'), '﻿' + head + '\n');
console.log(`CRM sheet: ${rows.length} rows, ${COLS.length} columns (${DEALER.length} left for the dealer, ${layout.length} in the rep app's order).`);
