#!/usr/bin/env node
/* CRM sheet for the pilot: one row per customer visit, built from data/cases/pilot.csv.
   Columns marked "(dealer)" are left blank for the dealer to fill, so their CRM / SalesGenie data can be matched with ours.
   Writes data/cases/pilot-crm.csv and the blank data/crm-template.csv. Phone numbers spoken in a recording are never copied here.
   node tools/make-crm.mjs   (tools/refresh-pilot.mjs runs it) */
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
function parseCsv(t) { const rows = []; let row = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c; } if (f || row.length) { row.push(f); rows.push(row); } const head = rows.shift().map(h => h.trim()); return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']))); }
const J = (s, d) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
const rows = parseCsv(fs.readFileSync(path.join(root, 'data/cases/pilot.csv'), 'utf8'));
const RES = { sold: 'Booked', followup: 'Will return', lost: 'Did not book' }, STG = { exploring: 'Exploring', finalising: 'Finalising model and price', after_booking: 'After booking' };
const COLS = [
  ['Date', r => r.captured_at.slice(0, 10)], ['Start time', r => r.captured_at.slice(11)], ['End time', r => (r.ended_at || '').slice(11)], ['Zocus conversation no.', r => r.conversation_id.replace(/\D/g, '')],
  ['Sales rep', r => r.rep_name], ['Visit (first or repeat)', r => r.visit ? r.visit[0].toUpperCase() + r.visit.slice(1) : ''], ['What we know of earlier visits', r => r.visit_history],
  ['Stage', r => STG[r.stage] || ''], ['Model', r => r.product], ['Variant', (r, c) => c.variant || ''], ['Fuel', r => r.fuel.replace(/\|/g, ' / ')], ['Colour', r => r.colour.replace(/\|/g, ' / ')],
  ['Delivery wanted by', (r, c) => c.delivery_wanted || ''], ['Finance or cash', (r, c) => c.payment || ''], ['Exchange', (r, c) => c.exchange || ''], ['Registration', (r, c) => c.registration || ''],
  ['Price discussed (Rs)', r => r.value_inr], ['Price basis', r => ({ call: 'said in the conversation', budget: 'customer budget', indicative: 'typical price for the model, not a quote', team: 'entered by the team', recorded: 'recorded in the app' })[r.value_source] || ''],
  ['Quotation given', r => r.kind === 'delivery' ? '' : ({ yes: 'Yes', promised: 'Promised', no: 'No' })[r.quote_given] || ''], ['Test drive in this visit', r => ({ yes: 'Yes', offered: 'Talked about', no: 'No' })[r.test_drive] || ''],
  ['Wanted (stock)', (r, c, s) => s.want || ''], ['Stock position', (r, c, s) => s.have || ''], ['Alternative offered', (r, c, s) => s.alt || ''],
  ['Result', r => r.kind === 'delivery' ? (r.result_label || 'After booking') : RES[r.outcome] || ''], ['Main objection', (r, c, s, o) => o[0] ? o[0].t : ''], ['Other objections', (r, c, s, o) => o.slice(1).map(x => x.t).join('; ')],
  ['Next step', (r, c, s, o, p) => (p.find(x => !x.s) || p[0] || {}).t || ''], ['Follow-up due', (r, c, s, o, p) => (p.find(x => !x.s) || p[0] || {}).due || ''], ['Remarks', r => r.remarks],
  ['Customer name (dealer)'], ['Mobile (dealer)'], ['Enquiry / SalesGenie ID (dealer)'], ['Need-analyzer answers (dealer)'], ['Counter punch-in time (dealer)'], ['Booking amount paid (dealer)'], ['Booking date (dealer)'], ['Promised delivery date (dealer)'], ['SalesGenie follow-up result (dealer)'], ['Final outcome (dealer)']];
const q = v => { const s = String(v ?? '').replace(/\b[6-9]\d{4}[ -]?\d{5}\b/g, '').replace(/\s+/g, ' ').trim(); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const head = COLS.map(c => q(c[0])).join(',');
const body = rows.map(r => { const c = J(r.crm_json, {}), s = J(r.stock_json, {}), o = J(r.objections_json, []), p = J(r.promises_json, []); return COLS.map(([, f]) => q(f ? f(r, c, s, o, p) : '')).join(','); });
fs.writeFileSync(path.join(root, 'data/cases/pilot-crm.csv'), '﻿' + [head, ...body].join('\n') + '\n');
fs.writeFileSync(path.join(root, 'data/crm-template.csv'), '﻿' + head + '\n');
console.log(`CRM sheet: ${rows.length} rows, ${COLS.length} columns (${COLS.filter(c => !c[1]).length} left for the dealer).`);
