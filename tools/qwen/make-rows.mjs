#!/usr/bin/env node
/* Turn open-model results (data/qwen/<id>/insights_<tag>.json + turns) into the row shape the dashboard exporter reads from the database,
   so every existing reading rule applies unchanged.  No database, no network.
   node tools/qwen/make-rows.mjs --tag q14 --turns turns.json --store "Pilot: Qwen 14B, IndicConformer" --out data/qwen/rows_q14.json
   Only who recorded and when (from data/cases/pilot.csv) is copied from the existing export; everything the AI decides comes from the open-model result. */
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const args = process.argv.slice(2), val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const tag = val('--tag', 'q14'), turnsName = val('--turns', 'turns.json'), store = val('--store', 'Open-model run'), outFile = val('--out', `data/qwen/rows_${tag}.json`), modelName = val('--model', 'qwen3-14b');
function parseCSV(s) { const rows = []; let r = [], f = '', q = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c; } return rows; }
const T = parseCSV(fs.readFileSync(path.join(root, 'data/cases/pilot.csv'), 'utf8')), H = T[0];
const meta = id => { const r = T.find(x => x[0] === 'ZC-' + id); if (!r) return null; const g = k => r[H.indexOf(k)]; return { at: g('captured_at'), rep: g('rep_name') }; };
const iso = s => new Date(s.replace(' ', 'T') + ':00+05:30').toISOString();
const dir = path.join(root, 'data/qwen'), rows = [], notes = {};
/* Dropdown values and written insights are English only: a value in Devanagari or Gujarati script is a transcript quote leaking through, so it is dropped (values) or the sentence is removed (summaries). */
const SCRIPT = /[\u0900-\u0DFF]/;
const val1 = v => (typeof v === 'string' && SCRIPT.test(v) ? null : v);
const eng = t => typeof t === 'string' ? t.split(/(?<=[.!?])\s+/).filter(x => !SCRIPT.test(x)).join(' ').trim() : t;
for (const id of fs.readdirSync(dir).filter(d => /^\d+$/.test(d)).sort()) {
  const ip = path.join(dir, id, `insights_${tag}.json`); if (!fs.existsSync(ip)) continue;
  const I = JSON.parse(fs.readFileSync(ip, 'utf8')); if (I.error || !I.written) { console.error(id, 'skipped: no usable result'); continue; }
  const D = JSON.parse(fs.readFileSync(path.join(dir, id, turnsName), 'utf8')), m = meta(id); if (!m) continue;
  const F0 = I.facts, clean = v => (v && v !== 'not_stated' && !SCRIPT.test(v) ? v : null), F = { ...F0, colour: clean(F0.colour), competitor: clean(F0.competitor), purpose: clean(F0.purpose), budget_said: clean(F0.budget_said), timing: clean(F0.timing) }, W = I.written, map = I.roles?.mapping || {}, speakers = I.roles?.speakers || [];
  const segs = D.turns.filter(t => t.text).map((t, i) => ({ id: 'g' + i, speaker: map['voice_' + t.voice] || 'Other_1', startMs: Math.round(t.start * 1000), endMs: Math.round(t.end * 1000), text: t.text }));
  const captured = iso(m.at), ended = new Date(new Date(captured).getTime() + D.audio_sec * 1000).toISOString();
  const find = q => q ? segs.find(s => s.text.replace(/\s+/g, ' ').includes(q.replace(/\s+/g, ' ').slice(0, 40))) : null;
  const objections = F.objections.map(o => { const s = find(o.customer_quote); return { theme: val1(o.theme) || 'other', resolution: o.rep_answer_quote || '', evidence: s ? [{ segmentId: s.id, quote: o.customer_quote }] : [{ quote: o.customer_quote }] }; });
  const ROLE = id => /^Rep/.test(id) ? 'rep' : /^Customer/.test(id) ? 'customer' : 'unidentified';
  const rolesOut = { speakers: speakers.map(s => ({ label: s.id, role: ROLE(s.id), reason: s.category })) };
  const prod = F.products.map(p => p.name), prefer = [...new Set([...prod, ...F.fuel, F.colour].filter(Boolean))].join(', ');
  const S = Object.fromEntries(Object.entries(W.summary).map(([k, v]) => [k, eng(v)])), summary = `Customer need: ${S.need} What happened: ${S.happened} Outcome: ${S.outcome} Why: ${S.why} Next step: ${S.next_step}`;
  const after = I.kind === 'after_booking';
  const lossText = (W.loss_reason === 'No clear reason' || SCRIPT.test(W.loss_reason || '')) ? '' : `${W.loss_reason}. ${eng(W.root_cause)}`;
  const row = {
    id: +id, captured_at: captured, ended_at: ended, customer_name: null, customer_phone: null, summary, sale_tag: null, outcome: {}, rep: m.rep, store: null,
    result: { summary,
      fields: [['purpose', F.purpose], ['preference', prefer], ['budget', F.budget_said], ['timing', F.timing], ['competitor', F.competitor], ['profile', F.customer_type]].filter(x => x[1]).map(([key, value]) => ({ key, value })),
      objections, commitments: [...new Set([...(W.followups || []), ...F.rep_promises.map(p => p.text)].filter(x => typeof x === 'string' && x.length >= 25 && !SCRIPT.test(x) && !/not stated|not clear/i.test(x)))].map(text => ({ text, evidence: [] })), coaching: [], followupOpportunities: [], actions: [], sop: [], warnings: [],
      relevance: { status: 'relevant' }, outcome: W.outcome_stage === 'unknown' ? {} : { stage: W.outcome_stage },
      revenueRecovery: { rootCause: lossText, intent: F.intent, outcomeReason: '' } },
    segments: segs, transcript: segs.map(s => s.text).join('\n'), analysed_at: new Date().toISOString(), ai_provider: 'ollama', ai_model: modelName, ai_held: false, quality: 'complete', cat: null,
    media_ms: Math.round(D.audio_sec * 1000), roles: rolesOut,
    scoring: after || !I.checks.length ? null : { eligibility: { eligible: true }, checks: I.checks.map(c => ({ id: c.id, mark: c.mark, reason: c.reason, quote: c.quote })), concerns: W.concerns },
    task_due: null, task_done: null, fu_wake: null, tagev: null, fu_title: (W.followups || []).find(x => !SCRIPT.test(x)) || null };
  rows.push(row);
  notes[id] = { rep: m.rep, ...(after ? { kind: 'delivery', stage: 'after_booking' } : {}) };
}
fs.writeFileSync(path.join(root, outFile), JSON.stringify({ store, rows }, null, 1));
fs.writeFileSync(path.join(root, outFile.replace(/\.json$/, '.notes.json')), JSON.stringify({ backend_only: true, calls: notes }, null, 1));
console.log(`${rows.length} rows -> ${outFile}`);
