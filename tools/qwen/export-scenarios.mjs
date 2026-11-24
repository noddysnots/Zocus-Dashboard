#!/usr/bin/env node
/* Build the open-model dashboard stores: rows from each scenario's insights, then the normal exporter (no database).
   node tools/qwen/export-scenarios.mjs            all scenarios that have results
   node tools/qwen/export-scenarios.mjs q14        one scenario (tag)
   Scenario tags: q14 (Qwen 14B, IndicConformer), q14qa (Qwen 14B, Qwen3-ASR 1.7B), q4 (Qwen 4B, IndicConformer). Stores are defined in data/cases.json (group "openmodel"). */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
function parseCSV(s) { const rows = []; let r = [], f = '', q = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; } else if (c !== '\r') f += c; } return rows; }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SC = { q14: { store: 'qwen14ic', turns: 'turns.json', model: 'qwen3-14b' }, q14qa: { store: 'qwen14qa', turns: 'turns_qasr.json', model: 'qwen3-14b' }, q4: { store: 'qwen4ic', turns: 'turns.json', model: 'qwen3-4b' } };
const want = process.argv[2] ? [process.argv[2]] : Object.keys(SC);
const cases = JSON.parse(fs.readFileSync(path.join(root, 'data/cases.json'), 'utf8'));
for (const tag of want) {
  const sc = SC[tag], st = cases.stores.find(s => s.id === sc.store);
  if (!st) { console.error(`no store ${sc.store} in data/cases.json`); continue; }
  const rows = `data/qwen/rows_${tag}.json`;
  const o1 = execFileSync('node', ['tools/qwen/make-rows.mjs', '--tag', tag, '--turns', sc.turns, '--store', st.name, '--model', sc.model, '--out', rows], { cwd: root, encoding: 'utf8' });
  const o2 = execFileSync('node', ['tools/export-from-db.mjs', '--cases', 'data/cases.json', '--store', sc.store, '--rows-json', rows, '--notes', rows.replace(/\.json$/, '.notes.json')], { cwd: root, encoding: 'utf8', env: { ...process.env, ZEXPORT_QUIET: '1' } });
  // the dashboard shows insights only: blank the transcript columns of these stores
  const csvPath = path.join(root, st.file || `data/cases/${sc.store}.csv`), T = parseCSV(fs.readFileSync(csvPath, 'utf8')), H = T[0];
  for (const col of ['transcript', 'tr_en']) { const k = H.indexOf(col); if (k >= 0) for (let i = 1; i < T.length; i++) T[i][k] = ''; }
  const cell = v => { v = String(v ?? ''); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  fs.writeFileSync(csvPath, T.filter(r => r.length > 1 || r[0]).map(r => r.map(cell).join(',')).join('\n') + '\n');
  console.log(o1.trim(), '|', o2.trim());
}
