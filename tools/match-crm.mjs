#!/usr/bin/env node
/* Match CRM / need-analyzer enquiries to the day's recordings (fuzzy: time, consultant, model, colour, fuel). Local and private.
   node tools/match-crm.mjs --test                      run tests/crm-match-fixture.json
   node tools/match-crm.mjs [file.csv] [--write-notes]  match data/crm-import/enquiries.csv (git-ignored; columns: time, consultant, model, colour, fuel, budget, name, phone ...)
   Customers wait a long time at a showroom, so the enquiry time is the START of the wait: the recording starts 0 to about 2 hours later.
   Output: best match, runner-up, confidence. Only high confidence is ever written (--write-notes), and only non-personal fields: wait time (arrived) and
   what the customer chose in the form (need_form: model, budget). Names, phones and addresses are never written to the repository. */
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2), has = f => argv.includes(f);
function parseCsv(t) { const rows = []; let row = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c; } if (f || row.length) { row.push(f); rows.push(row); } const head = rows.shift().map(h => h.trim()); return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']))); }
const rec = parseCsv(fs.readFileSync(path.join(root, 'data/cases/pilot.csv'), 'utf8')).filter(r => r.kind !== 'delivery');
const minutes = t => { const m = String(t || '').match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i); if (!m) return null; let h = +m[1]; const ap = (m[3] || '').toLowerCase(); if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; return h * 60 + +m[2]; };
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const modelTokens = s => norm(s).split(' ').filter(w => w.length > 1 && !['xuv', 'xev', 'mahindra', 'the', 'pack'].includes(w));
function score(e, r) {
  const start = minutes(r.captured_at.slice(11)), et = minutes(e.time); let ts = 0, d = null;
  if (start != null && et != null) { d = start - et; ts = d < -10 ? 0 : d <= 15 ? 1 : d <= 45 ? .8 : d <= 90 ? .5 : d <= 150 ? .2 : 0; }
  const rep = norm(r.rep_name), cons = norm(e.consultant).split(' ')[0];
  const rs = !cons ? .3 : rep.split(' ').includes(cons) ? 1 : /not tagged|lead rep|^$/.test(rep) ? .3 : 0;
  const mt = modelTokens(e.model), have = norm(r.models_considered + ' ' + r.product), ms = !mt.length ? 0 : mt.some(w => have.split(' ').includes(w)) ? 1 : 0;
  const cs = e.colour && (norm(r.colour).includes(norm(e.colour)) || norm(r.transcript).includes(norm(e.colour))) ? 1 : 0;
  const fs2 = e.fuel && norm(r.fuel).includes(norm(e.fuel).slice(0, 5)) ? 1 : 0;
  return { total: +(.35 * ts + .25 * rs + .3 * ms + .05 * cs + .05 * fs2).toFixed(2), wait: d, parts: { time: ts, consultant: rs, model: ms, colour: cs, fuel: fs2 } };
}
function match(e) {
  const all = rec.map(r => ({ id: +r.conversation_id.replace(/\D/g, ''), at: r.captured_at.slice(11), ...score(e, r) })).sort((a, b) => b.total - a.total), [a, b] = all;
  const margin = a.total - (b ? b.total : 0), conf = a.total >= .8 && margin >= .2 ? 'high' : a.total >= .6 && margin >= .1 ? 'medium' : 'low';
  return { best: a, runnerUp: b, confidence: conf };
}
if (has('--test')) {
  const fx = JSON.parse(fs.readFileSync(path.join(root, 'tests/crm-match-fixture.json'), 'utf8')); let bad = 0;
  for (const e of fx.enquiries) { const m = match(e), got = m.confidence === 'high' ? m.best.id : 'none', ok = got === e.expect; if (!ok) bad++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${e.name}: best #${m.best.id} (${m.best.total}, ${m.confidence}), runner-up #${m.runnerUp.id} (${m.runnerUp.total}); expected ${e.expect}, got ${got}`); }
  process.exit(bad ? 1 : 0);
}
const file = argv.find(a => !a.startsWith('--')) || 'data/crm-import/enquiries.csv';
if (!fs.existsSync(path.join(root, file))) { console.log(`No CRM file at ${file}. Put the export there (the folder is git-ignored) and run this again.`); process.exit(0); }
const enq = parseCsv(fs.readFileSync(path.join(root, file), 'utf8')), out = [];
for (const e of enq) { const m = match({ time: e.time || e.enquiry_time || e['Enquiry Date & Time'], consultant: e.consultant || e['Sales Consultant'], model: e.model || e.Model, colour: e.colour || e.color || e.Color, fuel: e.fuel || e['Fuel Type'] }); out.push({ enquiry: e, ...m }); console.log(`enquiry ${e.time || e.enquiry_time || ''} ${e.model || e.Model || ''}: #${m.best.id} at ${m.best.at} (${m.best.total}, ${m.confidence}); runner-up #${m.runnerUp ? m.runnerUp.id : '-'} (${m.runnerUp ? m.runnerUp.total : '-'}); wait ${m.best.wait} min`); }
fs.writeFileSync(path.join(root, 'data/crm-import/matches.json'), JSON.stringify(out, null, 1));
if (has('--write-notes')) {
  const nf = path.join(root, 'data/pilot-notes.json'), notes = JSON.parse(fs.readFileSync(nf, 'utf8')); let n = 0;
  for (const m of out) if (m.confidence === 'high') { const e = m.enquiry, c = (notes.calls[m.best.id] ||= {}), t = minutes(e.time || e.enquiry_time || e['Enquiry Date & Time']); if (t != null) { c.arrived = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); n++; } const need = [e.model || e.Model ? 'Model chosen: ' + (e.model || e.Model) : '', e.budget || e.Budget ? 'Budget: ' + (e.budget || e.Budget) : ''].filter(Boolean).join('; '); if (need) c.need_form = need; }
  fs.writeFileSync(nf, JSON.stringify(notes, null, 2) + '\n'); console.log(`Wrote wait time and form answers for ${n} high-confidence matches (no names, phones or addresses).`);
}
