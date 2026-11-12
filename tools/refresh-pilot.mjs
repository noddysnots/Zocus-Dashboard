#!/usr/bin/env node
/* Refresh the pilot store: export from the database (read-only), validate with the dashboard's own parser, summarise, commit.
   node tools/refresh-pilot.mjs              export + commit data/cases/pilot.* (never pushes)
   node tools/refresh-pilot.mjs --no-commit  export and report only
   The pilot store is the entry with id "pilot" in data/cases.json (org = the dealership's company, date = the pilot day). */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sh = (cmd, args, o = {}) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...o });
const csv = 'data/cases/pilot.csv', metaF = 'data/cases/pilot.meta.json';
const ids = t => new Set((t.match(/^ZC-\d+/gm) || []));
let before = new Set(); try { before = ids(sh('git', ['show', 'HEAD:' + csv])); } catch { try { before = new Set(); } catch {} }
const cases = JSON.parse(fs.readFileSync(path.join(root, 'data/cases.json'), 'utf8')), pilot = cases.stores.find(s => s.id === 'pilot');
if (!pilot) { console.error('No store with id "pilot" in data/cases.json'); process.exit(1); }
let outTxt = '';
try { outTxt = sh('node', ['tools/export-from-db.mjs', '--cases', 'data/cases.json', '--store', 'pilot'], { env: { ...process.env, ZEXPORT_QUIET: '1', NODE_NO_WARNINGS: '1' } }); }
catch (e) { console.error('Export failed:\n' + (e.stdout || '') + (e.stderr || e.message)); process.exit(1); }
const meta = fs.existsSync(path.join(root, metaF)) ? JSON.parse(fs.readFileSync(path.join(root, metaF), 'utf8')) : null;
if (!meta) { console.log(outTxt.trim() || 'Nothing exported.'); process.exit(2); }
console.log(`Pilot: ${meta.store} · ${pilot.date || 'all dates'} · exported ${meta.exportedLocal}`);
if (!meta.shown) { console.log(`Recorded ${meta.recorded}, nothing ready to show yet (${meta.recorded ? 'still being transcribed or analysed' : 'no recordings for that date'}). Nothing committed.`); process.exit(0); }
const chk = JSON.parse(sh('node', ['tools/check-csv.mjs', csv]));
const now = ids(fs.readFileSync(path.join(root, csv), 'utf8')), fresh = [...now].filter(x => !before.has(x));
console.log(`Recorded ${meta.recorded} · shown ${meta.shown} · new since last commit ${fresh.length} · still being analysed ${meta.analysing.length} · not scorable ${meta.unscored.length} · failed uploads ${meta.failed.length}`);
console.log('Reps: ' + meta.reps.map(r => `${r.name} ${r.recorded}`).join(', '));
console.log(chk.ok ? `Dashboard check: OK (${chk.convs} conversations, ${chk.reps} reps)` : 'Dashboard check FAILED: ' + chk.errors.slice(0, 5).map(e => e.msg || e).join(' | '));
for (const w of chk.warnings || []) console.log('Note: ' + w);
if (!chk.ok) { console.log('Not committed because the dashboard would reject this file.'); process.exit(1); }
if (process.argv.includes('--no-commit')) { console.log('Not committed (--no-commit).'); process.exit(0); }
sh('git', ['add', '-f', csv, metaF]);
let changed = true; try { sh('git', ['diff', '--cached', '--quiet', '--', csv]); changed = false; } catch { changed = true; }
if (!changed) { sh('git', ['reset', '-q', '--', metaF]); try { sh('git', ['checkout', '-q', '--', metaF]); } catch {} console.log('No change in the data since the last commit. Nothing committed.'); process.exit(0); }
sh('git', ['commit', '-q', '-m', `Pilot data refresh: ${meta.shown} conversations as of ${meta.exportedLocal}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`, '--', csv, metaF]);
console.log('Committed locally. Push to GitHub to update the Vercel site.');
