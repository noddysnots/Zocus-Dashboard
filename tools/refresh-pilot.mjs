#!/usr/bin/env node
/* Refresh the pilot store: export from the database (read-only), apply the team notes, validate with the dashboard's own parser,
   list every conversation with its rep, customer, model, value and where the value came from, then commit.
   node tools/refresh-pilot.mjs              export + commit data/cases/pilot.* and data/pilot-notes.json (never pushes)
   node tools/refresh-pilot.mjs --no-commit  export and report only
   ... --date 2026-10-29                     rehearse on another day (use with --no-commit)
   The pilot store is the entry with id "pilot" in data/cases.json. Team notes (rep, customer, segment, model, value, drop) live in
   the file named by its "notes" field; edit that file first, then run this. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sh = (cmd, args, o = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...o });
const argv = process.argv.slice(2), arg = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const csv = 'data/cases/pilot.csv', metaF = 'data/cases/pilot.meta.json', callsF = 'data/cases/pilot.calls.json';
const ids = t => new Set((t.match(/^ZC-\d+/gm) || []));
let before = new Set(); try { before = ids(sh('git', ['show', 'HEAD:' + csv])); } catch { before = new Set(); }
const cases = JSON.parse(fs.readFileSync(path.join(root, 'data/cases.json'), 'utf8')), pilot = cases.stores.find(s => s.id === 'pilot');
if (!pilot) { console.error('No store with id "pilot" in data/cases.json'); process.exit(1); }
const notesF = pilot.notes || null, date = arg('--date') || pilot.date;
let outTxt = '';
try { outTxt = sh('node', ['tools/export-from-db.mjs', '--cases', 'data/cases.json', '--store', 'pilot', ...(arg('--date') ? ['--date', arg('--date')] : [])], { env: { ...process.env, ZEXPORT_QUIET: '1', NODE_NO_WARNINGS: '1' } }); }
catch (e) { console.error('Export failed:\n' + (e.stdout || '') + (e.stderr || e.message)); process.exit(1); }
const read = f => fs.existsSync(path.join(root, f)) ? JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')) : null;
const meta = read(metaF), calls = read(callsF) || [];
if (!meta) { console.log(outTxt.trim() || 'Nothing exported.'); process.exit(2); }
const inr = v => v === '' || v == null ? '-' : v >= 1e7 ? '₹' + (v / 1e7).toFixed(2) + ' Cr' : v >= 1e5 ? '₹' + (v / 1e5).toFixed(1) + 'L' : '₹' + Math.round(v / 1e3) + 'K';
const SRC = { call: 'said in the call', budget: 'customer budget', indicative: 'indicative by model', team: 'entered by team', recorded: 'recorded in the app', '': 'value not known' };
const t12 = hm => { const [h, m] = String(hm).split(':').map(Number); return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' am' : ' pm'); };
console.log(`Pilot: ${meta.store} · ${date || 'all dates'} · exported ${meta.exportedLocal}`);
console.log(`Recorded ${meta.recorded} · shown ${meta.shown} · still being analysed ${meta.analysing.length} · not scorable ${meta.unscored.length} · failed uploads ${meta.failed.length} · left out by the team ${(meta.leftOut || []).length}`);
if (calls.length) {
  console.log('\nConversations (use the # to tag a rep, customer, model, fuel, colour, quotation or value, or to drop a call):');
  console.table(calls.map(c => ({ '#': c.id, time: t12(c.at), min: c.min, rep: c.rep, customer: c.customer, models: c.models || c.model, fuel: c.fuel || '-', quotation: c.quote, 'test drive': c.td, value: inr(c.value), 'value from': SRC[c.source] ?? c.source, stage: c.stage + (c.stageSrc === 'suggested' ? ' (suggested)' : ''), result: c.kind === 'delivery' ? 'after booking (not scored)' : ({ sold: 'booked', followup: 'will return', lost: 'did not book' })[c.outcome] })));
  const said = calls.filter(c => c.said); if (said.length) { console.log('Prices read from the conversation (check these):'); said.forEach(c => console.log(`  #${c.id} ${inr(c.value)}: "${c.said}"`)); }
  const sugg = calls.filter(c => c.stageSrc === 'suggested'); if (sugg.length) console.log('Stage guessed from the summary, please confirm in the notes: ' + sugg.map(c => '#' + c.id + ' ' + c.stage).join(', '));
  const untag = calls.filter(c => c.rep === 'Rep not tagged').length; if (untag) console.log(`${untag} of ${calls.length} have no rep tagged yet.`);
  const noVal = calls.filter(c => c.value === '').length, ind = calls.filter(c => c.source === 'indicative').length;
  console.log(`Values: ${calls.length - noVal - ind} from the conversation or the team, ${ind} indicative by model, ${noVal} not known.`);
}
const av = calls.filter(c => c.avail); if (av.length) { console.log('Availability came up (check these):'); av.forEach(c => console.log(`  #${c.id}: "${c.avail}"`)); }
for (const x of meta.suggestDrop || []) console.log(`Looks weak, drop it? #${x.id} at ${t12(x.at)} (${x.min} min): ${x.why}`);
for (const x of meta.leftOut || []) console.log(`Left out: #${x.id} (${x.why})`);
for (const x of meta.analysing) console.log(`Still being analysed: #${x.id} recorded at ${t12(x.at.slice(11))}`);
for (const x of meta.unscored) console.log(`Too short or unclear to score: #${x.id} recorded at ${t12(x.at.slice(11))}`);
if ((meta.history || []).length) console.log('Update log: ' + meta.history.map(h => `${t12(h.at.slice(11))}: ${h.shown}`).join(' · '));

if (meta.shown) {
  const chk = JSON.parse(sh('node', ['tools/check-csv.mjs', csv]));
  const now = ids(fs.readFileSync(path.join(root, csv), 'utf8')), fresh = [...now].filter(x => !before.has(x));
  console.log(`\nNew since the last commit: ${fresh.length}`);
  console.log(chk.ok ? `Dashboard check: OK (${chk.convs} conversations, ${chk.reps} reps)` : 'Dashboard check FAILED: ' + chk.errors.slice(0, 5).map(e => e.msg || e).join(' | '));
  for (const w of chk.warnings || []) console.log('Note: ' + w);
  if (!chk.ok) { console.log('Not committed because the dashboard would reject this file.'); process.exit(1); }
} else console.log(`\nNothing ready to show yet (${meta.recorded ? 'still being transcribed or analysed' : 'no recordings for that date'}). The dashboard will say "No conversations yet".`);
/* the audit: CSV against the database, the notes, the transcript and the checked answers (tools/audit-pilot.mjs). A FAIL stops the commit. */
let audit = '', auditOk = true;
try { audit = sh('node', ['tools/audit-pilot.mjs']); } catch (e) { audit = (e.stdout || '') + (e.stderr || ''); auditOk = false; }
const al = audit.split('\n').filter(l => /^(WARN|FAIL)/.test(l)), tail = audit.trim().split('\n').pop();
console.log('\nAudit: ' + tail); al.forEach(l => console.log('  ' + l));
if (!auditOk) { console.log('Not committed because the audit found a problem. Fix it (or, if the reading is right, update tests/pilot-golden.json and say why), then run again.'); process.exit(1); }
if (argv.includes('--no-commit')) { console.log('Not committed (--no-commit).'); process.exit(0); }
const files = [csv, metaF, ...(notesF ? [notesF] : [])];
sh('git', ['add', '-f', ...files]);
let changed = true; try { sh('git', ['diff', '--cached', '--quiet', '--', csv, ...(notesF ? [notesF] : [])]); changed = false; } catch { changed = true; }
if (!changed) { sh('git', ['reset', '-q', '--', metaF]); try { sh('git', ['checkout', '-q', '--', metaF]); } catch {} console.log('No change in the data since the last commit. Nothing committed.'); process.exit(0); }
sh('git', ['commit', '-q', '-m', `Pilot data refresh: ${meta.shown} conversations as of ${meta.exportedLocal}\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, '--', ...files]);
console.log('Committed locally. Push to GitHub to update the Vercel site.');
