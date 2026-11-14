#!/usr/bin/env node
/* Pre-push audit of the pilot store. Read-only.
   Compares data/cases/pilot.csv with (1) the database, (2) the team notes and the transcript, (3) the golden answers in tests/pilot-golden.json,
   and runs the file through the dashboard's own parser. Prints OK / WARN / FAIL per check and exits 1 on any FAIL.
   node tools/audit-pilot.mjs            full audit (needs .env for the database)
   node tools/audit-pilot.mjs --no-db    skip the database comparison
   node tools/audit-pilot.mjs --csv f    audit another file (for example a scratch export) instead of data/cases/pilot.csv
   WARN = a human should look (for example a name that is spoken in the audio). FAIL = do not push. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const noDb = process.argv.includes('--no-db');
const read = f => fs.readFileSync(path.resolve(root, f), 'utf8');
const cases = JSON.parse(read('data/cases.json')), pilot = cases.stores.find(s => s.id === 'pilot');
const argCsv = (() => { const i = process.argv.indexOf('--csv'); return i >= 0 ? process.argv[i + 1] : null; })(), csvFile = argCsv || 'data/cases/pilot.csv';
const notes = pilot.notes ? JSON.parse(read(pilot.notes)) : { calls: {} };
const golden = JSON.parse(read('tests/pilot-golden.json'));

/* RFC 4180 reader: quoted fields, doubled quotes, newlines inside quotes */
function parseCsv(t) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const rows = parseCsv(read(csvFile));
const out = []; let fails = 0, warns = 0;
const say = (lvl, id, msg) => { out.push({ lvl, id, msg }); if (lvl === 'FAIL') fails++; if (lvl === 'WARN') warns++; };
const ok = (id, msg) => say('OK', id, msg), warn = (id, msg) => say('WARN', id, msg), fail = (id, msg) => say('FAIL', id, msg);
const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
const mmss = s => { const m = String(s).match(/^(\d+):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; };
const lines = r => String(r.transcript || '').split('\n').map(l => { const m = l.match(/^\[(\d+:\d{2})\] ([^:]+): ([\s\S]*)$/); return m ? { at: m[1], sec: mmss(m[1]), who: m[2], text: m[3] } : null; }).filter(Boolean);
const NOT_CAR_PRICE = /\bbatter(y|ies)\b|\bcharger\b|replacement/i;

/* ---------- the dashboard's own parser ---------- */
try { const chk = JSON.parse(execFileSync('node', ['tools/check-csv.mjs', csvFile], { cwd: root, encoding: 'utf8' })); chk.ok ? ok('file', `the dashboard parser accepts the file (${chk.convs} conversations)`) : fail('file', 'the dashboard parser rejects the file: ' + (chk.errors || []).slice(0, 3).map(e => e.msg || e).join(' | ')); } catch (e) { fail('file', 'check-csv failed: ' + e.message.split('\n')[0]); }

/* ---------- the database ---------- */
let dbRows = {};
if (!noDb) {
  try {
    const pg = (await import('pg')).default;
    const env = Object.fromEntries(read('.env').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
    const db = new pg.Client({ connectionString: (env.DATABASE_URL || '').replace('sslmode=require', 'sslmode=require&uselibpqcompat=true') });
    await db.connect(); await db.query('SET default_transaction_read_only = on');
    const ids = [...new Set(rows.flatMap(r => { let pj = []; try { pj = JSON.parse(r.parts_json || '[]'); } catch {} return [+r.conversation_id.replace(/\D/g, ''), ...pj.map(x => x.id)]; }))];
    const res = await db.query(`select s.id, s.captured_at, s.ended_at, s.deleted_at, s.summary, ar.completed_at analysed_at, ar.result,
        (select execution_scoring from analysis_runs x where x.session_id=s.id and x.purpose='scoring' and x.status='succeeded' order by x.id desc limit 1) scoring
      from sessions s left join analysis_runs ar on ar.id=s.current_analysis_run_id where s.id = any($1)`, [ids]);
    dbRows = Object.fromEntries(res.rows.map(r => [r.id, r]));
    await db.end();
  } catch (e) { warn('database', 'could not read the database, so rows were not compared with it: ' + e.message.split('\n')[0]); }
}
const local = d => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(d)).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`; };
const RUB_COUNT = ['need', 'budget', 'options', 'value_proof', 'price_offers', 'concerns', 'decision_timing', 'ask', 'next_step'], PTS = { done: 100, partly: 50, missed: 0 }, MK = { done: 'MET', partly: 'PARTLY', missed: 'NOT_MET' };
const parts = t => { const o = {}, ms = [...String(t || '').matchAll(/(Customer need|What happened|Outcome|Why|Next step):\s*/g)]; ms.forEach((mm, i) => { o[mm[1]] = String(t).slice(mm.index + mm[0].length, i + 1 < ms.length ? ms[i + 1].index : undefined).trim(); }); return o; };

for (const r of rows) {
  const n = +r.conversation_id.replace(/\D/g, ''), id = '#' + n, note = notes.calls[String(n)] || {}, L = lines(r), starts = new Set(L.map(l => l.at));
  const d = dbRows[n];
  if (!noDb && Object.keys(dbRows).length) {
    if (!d) fail(id, 'not found in the database');
    else {
      if (d.deleted_at) fail(id, 'deleted in the database but still in the file');
      local(d.captured_at) === r.captured_at ? ok(id, `start time matches the database (${r.captured_at})`) : fail(id, `start time ${r.captured_at} differs from the database ${local(d.captured_at)}`);
      let pj = []; try { pj = JSON.parse(r.parts_json || '[]'); } catch {}
      if (pj.length) {
        for (const q of pj) { const dq = dbRows[q.id]; if (!dq) { fail(id, `part #${q.id} not found in the database`); continue; } const okS = local(dq.captured_at).slice(11) === q.at, okE = dq.ended_at && local(dq.ended_at).slice(11) === q.end; okS && okE ? ok(id, `part #${q.id} times match the database (${q.at} to ${q.end})`) : fail(id, `part #${q.id} times ${q.at}-${q.end} differ from the database ${local(dq.captured_at).slice(11)}-${dq.ended_at ? local(dq.ended_at).slice(11) : 'none'}`); const sp2 = parts(dq.summary || dq.result?.summary); [['need', 'Customer need'], ['happened', 'What happened'], ['outcome', 'Outcome'], ['why', 'Why'], ['next', 'Next step']].every(([k, n2]) => norm(q.sum[k]) === norm(sp2[n2] || '')) ? ok(id, `part #${q.id}: the five summary parts match the database`) : fail(id, `part #${q.id}: summary parts differ from the database`); }
        const lastEnd = pj.map(q => q.end).sort().at(-1); r.ended_at.slice(11) === lastEnd ? ok(id, `end time is the last part's (${lastEnd})`) : fail(id, `end time ${r.ended_at.slice(11)} is not the last part's ${lastEnd}`);
      } else {
      d.ended_at && local(d.ended_at) === r.ended_at ? ok(id, `end time matches the database (${r.ended_at.slice(11)})`) : fail(id, `end time ${r.ended_at} differs from the database ${d.ended_at ? local(d.ended_at) : 'none'}`);
      d.analysed_at && local(d.analysed_at) === r.analysed_at ? ok(id, `analysed-at matches (${r.analysed_at.slice(11)})`) : fail(id, `analysed-at ${r.analysed_at} differs from the database ${d.analysed_at ? local(d.analysed_at) : 'none'}`);
      }
      const sp = parts(d.summary || d.result?.summary), map = { sum_need: 'Customer need', sum_happened: 'What happened', sum_outcome: 'Outcome', sum_why: 'Why', sum_next: 'Next step' };
      const bad = Object.entries(map).filter(([c, k]) => norm(r[c]) !== norm(sp[k] || '')).map(([c]) => c);
      bad.length ? fail(id, 'summary parts differ from the database: ' + bad.join(', ')) : ok(id, 'the five summary parts match the database word for word');
      const sc = d.scoring;
      if (r.scored === 'yes' && sc?.eligibility?.eligible && Array.isArray(sc.checks)) {
        const na = r.stage === 'finalising' ? ['need', 'budget'] : [], mism = [];
        for (const c of sc.checks.filter(c => PTS[c.mark] != null)) { const want = na.includes(c.id) ? 'NA' : MK[c.mark], m = r.ai_checks.match(new RegExp('(MET|PARTLY|NOT_MET|NA): [^|]*?\\(' + c.id + '\\)')); if (!m || m[1] !== want) mism.push(`${c.id}: file ${m ? m[1] : 'missing'}, database ${want}`); }
        mism.length ? fail(id, 'rubric marks differ: ' + mism.join('; ')) : ok(id, `all ${sc.checks.length} rubric marks match the database`);
        const cnt = sc.checks.filter(c => RUB_COUNT.includes(c.id) && !na.includes(c.id) && PTS[c.mark] != null), want = cnt.length ? Math.round(cnt.reduce((a, c) => a + PTS[c.mark], 0) / cnt.length) : null;
        want === +r.score ? ok(id, `score ${r.score} recomputes from the ${cnt.length} counted checks`) : fail(id, `score ${r.score} but the counted checks give ${want}`);
      } else if (r.scored === 'no') { r.score === '' ? ok(id, 'not scored, and no score is shown') : fail(id, 'marked not scored but has a score of ' + r.score); }
      const dt = pj.length ? pj.reduce((a, q) => a + (dbRows[q.id] && dbRows[q.id].ended_at ? Math.round((new Date(dbRows[q.id].ended_at) - new Date(dbRows[q.id].captured_at)) / 60000) : 0), 0) : d.ended_at ? Math.round((new Date(d.ended_at) - new Date(d.captured_at)) / 60000) : null;
      dt != null && Math.abs(dt - +r.duration_min) <= (pj.length || 1) ? ok(id, `length ${r.duration_min} min matches the database`) : warn(id, `length ${r.duration_min} min, database says ${dt} min between start and end`);
    }
  }

  /* English lines must belong to a real transcript line */
  let tr = {}; try { tr = JSON.parse(r.tr_en || '{}'); } catch { fail(id, 'tr_en is not valid JSON'); }
  const orphan = Object.keys(tr).filter(k => !starts.has(k));
  Object.keys(tr).length ? (orphan.length ? fail(id, `${orphan.length} English line(s) point at a time with no transcript line: ${orphan.join(', ')}`) : ok(id, `${Object.keys(tr).length} English lines all sit on a real transcript line`)) : warn(id, 'no English lines yet');
  const bareName = L.filter(l => /^[\[]?\s*$/.test(l.text)).length; if (bareName) warn(id, bareName + ' empty transcript lines');

  /* prices said: every figure must be on the line at the stated time */
  let prices = []; try { prices = JSON.parse(r.prices_json || '[]'); } catch { fail(id, 'prices_json is not valid JSON'); }
  const forms = v => { const f = new Set(); const grp = x => { const s = String(Math.round(x)); const l3 = s.slice(-3), rest = s.slice(0, -3); return rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + l3 : l3; }; f.add(String(Math.round(v))); f.add(grp(v)); f.add(Math.round(v).toLocaleString('en-US')); if (v >= 1e5) { const l = v / 1e5; f.add(String(+l.toFixed(2))); f.add(l.toFixed(2)); f.add(l.toFixed(1)); } if (v >= 1000 && v < 1e5) { f.add(String(Math.round(v / 1000)) + ' thousand'); } if (v >= 1e6 && v % 10000 === 0) f.add(String(v / 1000)); return [...f]; };
  const lineAt = at => { const s = mmss(at); if (s == null) return null; let best = null; for (const l of L) if (l.sec <= s) best = l; return best; };
  for (const p of prices) {
    const ln = lineAt(p.at); if (!ln) { fail(id, `price "${p.m}" has a time ${p.at} that is not in the transcript`); continue; }
    const nums = typeof p.p === 'number' ? [p.p] : (String(p.p).match(/\d[\d,]*(?:\.\d+)?/g) || []).map(x => +x.replace(/,/g, '')).map((x, i, a) => /lakh|lac/i.test(String(p.p)) ? x * 1e5 : x);
    const miss = nums.filter(v => !forms(v).some(s => ln.text.includes(s))), byHand = (golden.prices_checked_by_hand?.[String(n)] || []).includes(p.at);
    if (!miss.length || (typeof p.p !== 'number' && miss.length < nums.length)) ok(id, `price "${p.m}" is on the line at ${ln.at}`);
    else if (byHand) ok(id, `price "${p.m}" said in number words at ${ln.at}; checked by hand against the recording`);
    else typeof p.p === 'number' ? fail(id, `price "${p.m}" ${p.p} is not on the transcript line at ${ln.at} (if it is said in number words, check it by hand and list it in prices_checked_by_hand)`) : warn(id, `price "${p.m}" (${p.p}): figure not found as digits on the line at ${ln.at}; check by hand`);
  }

  let pr = []; try { pr = JSON.parse(r.promises_json || '[]'); } catch { fail(id, 'promises_json is not valid JSON'); }
  /* hand-written depth (stock, objections, follow-ups): every time given must be the start of a real transcript line; suggestions must be marked */
  const J = (col, dflt) => { try { return JSON.parse(r[col] || dflt); } catch { fail(id, col + ' is not valid JSON'); return JSON.parse(dflt); } };
  const obj = J('objections_json', '[]'), stk = J('stock_json', '{}'), hand = pr.filter(x => x.hand);
  const timed = [...obj.map(o => ['objection "' + o.t + '"', o.at]), ...hand.filter(f => !f.s).map(f => ['follow-up "' + f.t + '"', f.at]), ...(stk.at ? [['stock note', stk.at]] : [])];
  const badT = timed.filter(([, at]) => !at || !starts.has(at));
  if (timed.length) badT.length ? fail(id, 'no transcript line starts at the time given for: ' + badT.map(([n2, at]) => n2 + ' (' + (at || 'no time') + ')').join('; ')) : ok(id, `${timed.length} objections, follow-ups and stock notes each sit on a real transcript line`);
  const badV = obj.filter(o => !['answered', 'partly', 'open'].includes(o.v)); if (badV.length) fail(id, 'objection verdict must be answered, partly or open: ' + badV.map(o => o.t).join('; '));
  if (r.stock_json && !['yes', 'no', 'unknown'].includes(stk.inhand)) fail(id, 'stock.inhand must be yes, no or unknown');
  if (r.visit && !['first', 'repeat'].includes(r.visit)) fail(id, 'visit must be first or repeat');
  if (r.visit === 'repeat' && !r.visit_history) fail(id, 'a repeat visit needs a history line saying how we know');
  /* names: where does each name in the notes appear in the audio, and who says it */
  for (const [role, nm] of [['rep', note.rep], ['customer', note.customer]]) {
    if (!nm) continue; const tok = String(nm).trim(); if (tok.length < 3) continue;
    const hits = L.filter(l => new RegExp('\\b' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(l.text));
    const conf = (golden.confirmed_names?.[String(n)] || []).includes(tok);
    hits.length && conf ? ok(id, `the ${role} name "${nm}" is also spoken in the audio (${hits.map(h => h.at + ' ' + h.who).join(', ')}); confirmed by the floor`) : hits.length ? warn(id, `the ${role} name "${nm}" is also spoken in the audio: ${hits.map(h => h.at + ' ' + h.who).join(', ')}. Confirm who it belongs to`) : ok(id, `the ${role} name "${nm}" is a floor nickname (not in the audio)`);
  }
  /* drafts: no greeting by a name the team did not give */
  const greet = pr.filter(p => /^\s*(?:[Nn]amaste|[Nn]amaskar|[Hh]ello|[Hh]i|[Hh]ey|[Dd]ear)[\s,]+(?!(?:Sir|Madam|Sahab|Saheb|Ji|I|We|Please|Thank|Thanks|Your|The)\b)[A-Z][a-z]+/.test(p.d || '') && !note.customer);
  greet.length ? fail(id, 'a message draft greets the customer by a name the team never gave: "' + greet[0].d.slice(0, 40) + '"') : ok(id, 'message drafts do not greet by an unconfirmed name');
  /* the customer is never named from the audio */
  /^Customer \d+$/.test(r.customer_name) || note.customer ? ok(id, `customer shown as "${r.customer_name}"`) : fail(id, 'customer name not from the team: ' + r.customer_name);

  /* value */
  if (r.value_inr !== '') {
    if (r.value_source === 'call') {
      const v = +r.value_inr, hit = L.filter(l => forms(v).some(s => l.text.includes(s)));
      note.csv?.value_inr ? ok(id, `value ${r.value_inr} set in the notes`) : !hit.length ? warn(id, `value ${r.value_inr} (said in the call) not found in the transcript`) : hit.every(l => NOT_CAR_PRICE.test(l.text)) ? fail(id, `value ${r.value_inr} comes from a battery, charger or replacement line`) : ok(id, `value ${r.value_inr} is said on the line at ${hit[0].at}`);
    } else ok(id, `value ${r.value_inr} (${r.value_source})`);
  } else ok(id, 'no value shown ("–")');
  /* quotation claims */
  const repFig = L.filter(l => l.who === 'Rep' && /on[- ]?road|ex[- ]?showroom/i.test(l.text) && /\d/.test(l.text) && !NOT_CAR_PRICE.test(l.text));
  if (r.quote_given === 'no' && repFig.length) warn(id, 'quotation marked "no" but the rep said on-road/ex-showroom with a figure at ' + repFig.map(l => l.at).join(', '));
  if (r.quote_given === 'yes' && !L.some(l => l.who === 'Rep' && /\d/.test(l.text))) fail(id, 'quotation marked "yes" but the rep says no figure');
  /* flags */
  const bf = golden.must_not_contain_in_flags.filter(w => new RegExp(w, 'i').test(r.flags || ''));
  bf.length ? fail(id, 'flags contain the backend jewellery-catalogue remark: ' + r.flags) : ok(id, 'flags are about this conversation');

  /* golden */
  const g = golden.calls[String(n)];
  if (!g) warn(id, 'no golden answer yet: read the recording by hand and add it to tests/pilot-golden.json');
  else { const diff = Object.entries(g).filter(([k]) => !k.startsWith('_')).filter(([k, v]) => r[k] !== v).map(([k, v]) => `${k}: expected "${v}", got "${r[k]}"`); diff.length ? fail(id, 'differs from the checked answers: ' + diff.join('; ')) : ok(id, 'matches the checked answers'); }
}
for (const k of Object.keys(golden.calls)) if (!rows.some(r => r.conversation_id === 'ZC-' + k)) warn('golden', `#${k} has a golden answer but is not in the file`);

const w = Math.max(...out.map(o => o.id.length));
for (const o of out) console.log(`${o.lvl.padEnd(4)}  ${o.id.padEnd(w)}  ${o.msg}`);
console.log(`\n${out.filter(o => o.lvl === 'OK').length} OK · ${warns} WARN · ${fails} FAIL`);
process.exit(fails ? 1 : 0);
