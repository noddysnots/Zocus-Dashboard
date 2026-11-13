#!/usr/bin/env node
/* Zocus DB -> dashboard CSV.  Read-only. Credentials from ../.env (never committed).
   node tools/export-from-db.mjs --list
   node tools/export-from-db.mjs --org "Mira"            company by id or part of its name
   ...        --date 2026-10-03                          one day (store local time)
   ...        --from 2026-09-01 --to 2026-10-03          date range      (or --days 30 = last 30 days of data)
   ...        --pii                                      include customer name + phone
   ...        --unknown followup|lost|skip               rows with no recorded outcome (default followup if a follow-up exists, else skipped)
   ...        --out file.csv
   node tools/export-from-db.mjs --cases data/cases.json   one CSV per store in data/cases/ (real test conversations, see that file); add --public to drop transcripts and customer details
   Writes data/db-export-<company>.csv and data/db-export-<company>.report.md (what is filled, derived, missing). */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2), has = f => args.includes(f), val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
// encrypted; certificate not verified because the server uses a self-signed one
const db = new pg.Client({ connectionString: (env.DATABASE_URL || '').replace('sslmode=require', 'sslmode=require&uselibpqcompat=true') });
await db.connect(); await db.query('SET default_transaction_read_only = on');
const q = async (s, p) => (await db.query(s, p)).rows;
const quiet = process.env.ZEXPORT_QUIET;

const orgs = await q(`select o.id, o.name, o.vertical, o.timezone, o.is_demo demo, (select count(*) from sessions s where s.organization_id=o.id and s.deleted_at is null and s.record_kind='interaction') sessions, (select count(distinct rep_id) from sessions s where s.organization_id=o.id) reps, (select max(captured_at)::date from sessions s where s.organization_id=o.id) latest from organizations o order by id`);
const casesFile = val('--cases'), cases = casesFile ? JSON.parse(fs.readFileSync(path.resolve(root, casesFile), 'utf8')) : null;
const orgArg = val('--org') || (cases && String(cases.org || 1));
if (has('--list') || !orgArg) { console.table(orgs); console.log('Pick one with --org "<id or part of the name>"'); await db.end(); process.exit(0); }
const findOrg = a => orgs.filter(o => String(o.id) === String(a) || o.name.toLowerCase().includes(String(a).toLowerCase()));
const hit = findOrg(orgArg);
if (hit.length !== 1) { console.error(hit.length ? 'More than one match: ' + hit.map(o => o.name).join(' | ') : 'No company matches "' + orgArg + '". Known: ' + orgs.map(o => o.name).join(' | ')); process.exit(1); }
let org = hit[0], tz = org.timezone || 'Asia/Kolkata';
const pii = has('--pii') || (!!cases && !has('--public')), pub = has('--public'), unknown = val('--unknown', 'followup');
let slug = org.name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------- Car showroom helpers (used when the store's vertical is "car") ----------
   The AI analysis does not extract a model or a quoted price, so both are read from the transcript.
   Models and indicative price bands come from data/price-list.json. */
const PL = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'data/price-list.json'), 'utf8')); } catch { return { models: [], min: 3e5, max: 6e6, competitors: [], competitorModels: {} }; } })();
const normTxt = (s, keepCase) => ' ' + (keepCase ? String(s || '') : String(s || '').toLowerCase()).replace(/[^A-Za-z0-9]+/g, ' ') + ' ';
/* every model mentioned, most-mentioned first (ties: mentioned last). Longer names are matched and masked first, so "Thar Roxx" is not also counted as "Thar". */
function carModels(text) {
  let low = normTxt(text), cs = normTxt(text, true); const hit = {};
  const al = PL.models.flatMap(m => m.aliases.map(a => ({ m, a }))).sort((x, y) => y.a.length - x.a.length);
  for (const { m, a } of al) {
    const key = (m.caseSensitive ? a : a.toLowerCase()).replace(/[^A-Za-z0-9]+/g, ' ').trim().replace(/ /g, ' ?');
    const re = new RegExp(' ' + key + '(?= )', 'g');
    const hitFn = (s, i) => { const h = hit[m.id] ||= { m, n: 0, last: 0 }; h.n++; h.last = Math.max(h.last, i); return ' ' + '#'.repeat(s.length - 1); };
    if (m.caseSensitive) cs = cs.replace(re, hitFn); else low = low.replace(re, hitFn);
  }
  return Object.values(hit).sort((a, b) => b.n - a.n || b.last - a.last);
}
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const TENS = 'twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety', UNITS = 'one|two|three|four|five|six|seven|eight|nine';
const digits = s => String(s || '').replace(new RegExp(`\\b(${TENS})[\\s-]+(${UNITS})\\b`, 'gi'), (m, a, b) => NUMW[a.toLowerCase()] + NUMW[b.toLowerCase()])
  .replace(new RegExp(`\\b(${Object.keys(NUMW).join('|')})\\b`, 'gi'), m => NUMW[m.toLowerCase()])
  .replace(/(\d+)\s+and\s+a\s+half/gi, '$1.5').replace(/(\d+)\s+point\s+(\d+)/gi, '$1.$2').replace(/\bsaa?dh?e\s+(\d+)/gi, (m, a) => +a + 0.5);
/* rupee amounts in a piece of text that could be the price of a car (within the price-list bounds) */
function rupeeFigures(s) {
  const out = [];
  for (const m of digits(s).matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr\b)?(?:\s*(?:and\s+)?(\d[\d,]*)\s*(?:thousand|hazaa?r|k\b))?/gi)) {
    let v = +m[1].replace(/,/g, ''); const u = (m[2] || '').toLowerCase();
    if (u.startsWith('c')) v *= 1e7; else if (u) v *= 1e5;
    if (u && m[3]) v += +m[3].replace(/,/g, '') * 1000;
    if (v >= PL.min && v <= PL.max) out.push(Math.round(v));
  }
  return out;
}
const PRICE_RE = /on[- ]?road|ex[- ]?showroom|\bprice[ds]?\b|pricing|quotation|\bquote[ds]?\b|\bcosts?\b|kimat|keemat|\bdaam\b|kitne (ka|ki|mein)/i;
const NOT_PRICE = /\bemi\b|down ?payment|discount|exchange|insurance|\bloan\b|per month|monthly|a month|accessor|booking amount|\btoken\b|cashback|\bbonus\b|waiver|warranty|budget|salary|resale|old car/i;
const BUDGET_RE = /budget|afford|\bspend\b|price range|\brange\b/i;
/* the last car-sized rupee figure said on a matching line of the conversation */
function saidInCall(turns, re) {
  let f = null;
  for (const t of turns) for (const s of String(t.text || '').split(/(?<=[.?!।])\s+/)) {
    if (!re.test(s) || (re === PRICE_RE && NOT_PRICE.test(s))) continue;
    const v = rupeeFigures(s); if (v.length) f = { v: v.at(-1), who: t.who, text: s.trim().slice(0, 160) };
  }
  return f;
}
const COMP_RE = PL.competitors.map(b => ({ b, re: new RegExp('\\b(' + [b, ...(PL.competitorModels?.[b] || [])].join('|') + ')\\b', 'gi') }));
const carCompetitor = text => { const c = COMP_RE.map(x => ({ b: x.b, n: (String(text).match(x.re) || []).length })).filter(x => x.n).sort((a, b) => b.n - a.n)[0]; return c ? c.b : ''; };
function carSegment(t) {
  const s = String(t || '').toLowerCase();
  if (/electric|\bev\b|charging|\bbe ?6\b|\bxev\b/.test(s)) return 'Switching to electric';
  if (/first car|first vehicle|first[- ]time (buyer|car)|pehli gaadi/.test(s)) return 'First car in the family';
  if (/7[- ]?seater|seven[- ]seater|joint family|big family|large family|third row|six or seven|five to seven|5 to 7|(six|seven|6|7) people|family of (five|six|seven|eight|[5-9])/.test(s)) return 'Family upgrade to a 7-seater';
  if (/off[- ]?road|adventure|lifestyle|4x4|four[- ]wheel drive|trek|hills|mountain/.test(s)) return 'Lifestyle and off-road';
  if (/second[- ]hand|used car|pre[- ]?owned/.test(s)) return 'Used car buyer';
  if (/exchang|replac|upgrad|current car|old car|existing car|present car/.test(s)) return 'Replacing current car';
  if (/business|commercial|taxi|fleet|company (car|vehicle)|for staff/.test(s)) return 'Business use';
  if (/commute|office|city|daily/.test(s)) return 'Daily city use';
  if (/family|kids|children|wife|parents/.test(s)) return 'Family car';
  return 'Not clear';
}
const BRANDS_RE = new RegExp('\\b(' + PL.competitors.concat(Object.values(PL.competitorModels || {}).flat()).join('|') + ')\\b', 'i');
function carReason(t) {
  const s = String(t || '').toLowerCase(); if (!s) return '';
  if (/waiting|wait time|delivery (time|date|period)|not available|unavailab|out of stock|\bstock\b|months? (of )?(wait|delay)/.test(s)) return 'stock';
  if (/exchange|old car|trade[- ]?in|resale/.test(s)) return 'exchange';
  if (/test[- ]?(drive|ride)|comfort|\bseat|handling|ride quality|suspension|drive feel|legroom|\bboot\b|feature/.test(s)) return 'design';
  if (/\bemi\b|\bloan\b|financ|down ?payment|budget|afford/.test(s)) return 'budget';
  if (BRANDS_RE.test(s) || /compar|another (brand|dealer|showroom)|other (brand|option|dealer)|elsewhere|competitor/.test(s)) return 'competitor';
  if (/on[- ]?road|price|discount|cost|expensive|charges|offer/.test(s)) return 'making';
  if (/family|wife|husband|father|mother|parents|approval|at home|consult/.test(s)) return 'family';
  if (/brows|just looking|enquir|exploring|not decided|undecided|early stage|research/.test(s)) return 'browse';
  return String(t).replace(/\s+/g, ' ').trim().slice(0, 60);
}
const TEST_DRIVE_RE = /\b(took|taken|had|did|done|after|finished|completed|back from|went for|gone for)\b[^.?!]{0,40}test[- ]?(drive|ride)|test[- ]?(drive|ride)[^.?!]{0,25}\b(done|taken|completed|felt|went)\b|test[- ]?drove/i;
const CHK_CAR = { D1: 'Asked what the car is for', D2: 'Confirmed the model or body type', D3: 'Asked the budget', D4: 'Confirmed variant, fuel and features wanted', P1: 'Gave a correct fact about the car', P2: 'Addressed the customer\'s priority', P3: 'Explained the value', O1: 'Acknowledged the objection', O2: 'Explored the objection', O3: 'Answered the objection', C1: 'Handled the comparison with another brand', SOP1: 'Stayed respectful', SOP2: 'Used the showroom offer', N1: 'Agreed a next step and contact' };

async function runExport(o) {
if (o.org != null) { const h = findOrg(o.org); if (h.length !== 1) { console.log(`${o.storeName || o.org}: skipped, ${h.length ? 'more than one company matches' : 'no company matches'} "${o.org}" (known: ${orgs.map(x => x.name).join(' | ')})`); return; } org = h[0]; tz = org.timezone || 'Asia/Kolkata'; }
const rows = await q(`
  select s.id, s.captured_at, s.ended_at, s.customer_name, s.customer_phone, s.summary, s.sale_tag, s.outcome, u.name rep, l.name store, ar.result,
    tv.segments, tv.text transcript, ar.provider ai_provider, ar.model ai_model, s.ai_held, s.qualification_status::text quality,
    (select c.result from category_projections c where c.session_id=s.id and c.state='complete' order by c.id desc limit 1) cat,
    (select m.duration_ms from interaction_media m where m.session_id=s.id and m.state='ready' order by m.id desc limit 1) media_ms,
    (select result from speaker_role_assessments a where a.session_id=s.id order by a.id desc limit 1) roles,
    (select execution_scoring from analysis_runs x where x.session_id=s.id and x.purpose='scoring' and x.status='succeeded' order by x.id desc limit 1) scoring,
    (select min(t.due_at) from tasks t where t.session_id=s.id and t.state::text<>'cancelled') task_due,
    (select bool_and(t.state::text='done') from tasks t where t.session_id=s.id and t.state::text<>'cancelled') task_done,
    (select min(f.wake_up_at) from followup_opportunities f where f.session_id=s.id) fu_wake,
    coalesce((select f.proposal->>'title' from followup_opportunities f where f.session_id=s.id order by f.id limit 1),(select t.title from tasks t where t.session_id=s.id and t.state::text<>'cancelled' order by t.id limit 1)) fu_title
  from sessions s
  left join users u on u.id=s.rep_id left join locations l on l.id=s.location_id
  join analysis_runs ar on ar.id=s.current_analysis_run_id
  left join transcript_versions tv on tv.id=s.current_transcript_version_id
  where s.organization_id=$1 and s.deleted_at is null and s.record_kind='interaction' and ($2::int[] is null or s.id = any($2)) order by s.captured_at`, [org.id, o.ids || null]);
const allSessions = await q(`select s.id, s.captured_at, s.ended_at, u.name rep, s.status::text status, s.analysis_state, s.transcription_state from sessions s left join users u on u.id=s.rep_id where s.organization_id=$1 and s.deleted_at is null and s.record_kind='interaction' and ($2::int[] is null or s.id = any($2)) order by s.captured_at`, [org.id, o.ids || null]);
const ownerRaw = (await q(`select u.name from memberships m join users u on u.id=m.user_id where m.organization_id=$1 and m.role='company_admin' and m.active order by m.id limit 1`, [org.id]))[0]?.name || '';
const owner = o.ownerName != null ? o.ownerName : /administrator|admin$/i.test(ownerRaw) ? '' : ownerRaw;

const fmt = (d, time = true) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(d)).map(x => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}` + (time ? ` ${p.hour}:${p.minute}` : ''); };
const fld = (res, key) => { const f = (res?.fields || []).find(x => x.key === key); const v = f?.value; return v == null ? '' : typeof v === 'string' ? v : (v.text ?? v.value ?? JSON.stringify(v)); };
const clip = (s, n = 220) => (s || '').replace(/\s+/g, ' ').replace(/^(visitor|advisor|customer|staff|rep|salesperson)\s*:\s*/i, '').trim().slice(0, n);
const pct = (m, n) => (m + n ? Math.round(100 * m / (m + n)) : null);
const money = t => { const m = String(t || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(lakh|lac|l|crore|cr|k)?/i); if (!m) return ''; let v = +m[1]; const u = (m[2] || '').toLowerCase(); if (u === 'k') v *= 1e3; else if (/^l/.test(u)) v *= 1e5; else if (/^c/.test(u)) v *= 1e7; return Math.round(v); };

/* rubric checks -> dashboard skills (meanings from backend/src/integrations/openai/scoring.ts):
   D1 occasion, D2 category/metal, D4 specs -> need | D3 budget | P1 product fact, P2 priority, P3 value -> pitch | O1-O3 objection, C1 competitor -> objection | SOP1 respect, SOP2 hook, N1 next step -> close */
const CHK = { D1: 'need', D2: 'need', D4: 'need', D3: 'budget', P1: 'pitch', P2: 'pitch', P3: 'pitch', O1: 'objection', O2: 'objection', O3: 'objection', C1: 'objection', SOP1: 'close', SOP2: 'close', N1: 'close' };
const SOP = { discovery: 'need', product_knowledge: 'pitch', objection_handling: 'objection', competitor_handling: 'objection' };
const reasonCode = t => { const s = (t || '').toLowerCase(); if (!s) return ''; if (/family|approval|discuss|husband|wife|mother|parents/.test(s)) return 'family'; if (/competitor|another|other jeweller|elsewhere/.test(s)) return 'competitor'; if (/budget|price|cost|making|charge|discount|expensive/.test(s)) return 'budget'; if (/design|style|pattern/.test(s)) return 'design'; if (/stock|unavailable|size/.test(s)) return 'stock'; if (/browsing|just looking/.test(s)) return 'browse'; return clip(t, 60); };

const head = ['conversation_id', 'captured_at', 'rep_name', 'outcome', 'value_inr', 'product', 'score', 'score_need', 'score_budget', 'score_pitch', 'score_objection', 'score_close', 'reason', 'stage_reached', 'customer_name', 'customer_phone', 'duration_min', 'customer_type', 'in_stock', 'competitor', 'competitor_offer', 'keywords', 'customer_quote', 'customer_quote_en', 'summary_wanted', 'summary_happened', 'summary_why', 'summary_next', 'objection', 'objection_resolved', 'objection_quote', 'objection_quote_en', 'objection_reply', 'objection_reply_en', 'objection_at_sec', 'followup_due', 'followup_done', 'rep_tenure', 'store_name', 'owner_name', 'zocus_url', 'ai_coaching', 'ai_coaching_quote', 'ai_commitments', 'ai_next_action', 'ai_notes', 'ai_checks', 'transcript', 'vertical', 'talk_rep_pct', 'segments_n', 'quality', 'ai_model', 'value_source'];
const DERIVED = {}; const mark = (col, how) => { (DERIVED[col] ||= { how, n: 0 }).n++; };
const exported = new Set(), unscored = []; let fixtureN = 0, heldN = 0, partialN = 0;
const skip = { range: 0, noOutcome: 0, noScore: 0, dropped: 0 }, src = { checks: 0, 'analysis review': 0 }, srcN = {}, calls = [];
const isCar = o.vertical === 'car';
/* team notes for a pilot day: rep, customer, segment, model, value, drop (see data/pilot-notes.json) */
const NOTES = (() => { if (!o.notes) return {}; try { return JSON.parse(fs.readFileSync(path.resolve(root, o.notes), 'utf8')).calls || {}; } catch (e) { console.error('Could not read the notes file ' + o.notes + ': ' + e.message); return {}; } })();
const from = val('--date') || o.date || val('--from'), to = val('--date') || o.date || val('--to');
let lastDay = rows.length ? fmt(rows.at(-1).captured_at, false) : null;
const dayN = val('--days') ? (() => { const d = new Date(lastDay + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - (+val('--days') - 1)); return d.toISOString().slice(0, 10); })() : null;
const inRange = d => { const day = fmt(d, false); return !((from && day < from) || (to && day > to) || (dayN && day < dayN)); };
const dayIds = allSessions.filter(x => inRange(x.captured_at)).map(x => x.id);
const out = [];
for (const r of rows) {
  const day = fmt(r.captured_at, false);
  if ((from && day < from) || (to && day > to) || (dayN && day < dayN)) { skip.range++; continue; }
  const note = NOTES[String(r.id)] || {};
  if (note.drop) { skip.dropped++; continue; }
  const res = r.result || {}, oc = r.outcome || {}, rr = res.revenueRecovery || {}, sc = r.scoring;
  const stage = oc.stage, tag = r.sale_tag;
  let outcome = stage === 'won' || tag === 'yes' ? 'sold' : stage === 'follow_up' ? 'followup' : stage === 'lost' || tag === 'no' ? 'lost' : null;
  const hasNext = !!(r.task_due || r.fu_wake);
  if (!outcome) { const a = res.outcome?.stage; const m2 = { lost: 'lost', considering: 'followup', interested: 'followup', follow_up: 'followup', committed: 'followup', won: 'sold' }; if (m2[a]) { outcome = m2[a]; mark('outcome', 'no outcome recorded by staff; taken from the AI\'s reading of the conversation (considering = follow-up)'); } }
  if (!outcome) { outcome = unknown === 'skip' ? null : unknown === 'lost' ? 'lost' : (hasNext ? 'followup' : null); if (!outcome && o.keepAll) outcome = 'followup'; if (!outcome) { skip.noOutcome++; continue; } mark('outcome', o.keepAll ? 'outcome not clear from the conversation; counted as open (will return)' : 'no recorded outcome; set to follow-up because a follow-up task exists'); }

  // skills
  const tally = {}; let m = 0, n = 0, source = null;
  if (sc?.eligibility?.eligible) for (const o of sc.observations || []) { const k = CHK[o.checkId]; if (!k || !['MET', 'NOT_MET'].includes(o.state)) continue; const t = tally[k] ||= [0, 0]; o.state === 'MET' ? (t[0]++, m++) : (t[1]++, n++); }
  if (m + n) source = 'checks';
  else { m = n = 0; for (const k in tally) delete tally[k]; for (const s of res.sop || []) { const k = SOP[s.dimensionId]; if (!k || !['observed', 'not_observed'].includes(s.assessment)) continue; const t = tally[k] ||= [0, 0]; s.assessment === 'observed' ? (t[0]++, m++) : (t[1]++, n++); } if (m + n) source = 'analysis review'; }
  if (!source) { skip.noScore++; unscored.push(r.id); continue; }
  const sk = Object.fromEntries(Object.entries(tally).map(([k, [a, b]]) => [k, pct(a, b)]));
  const budgetText = fld(res, 'budget');
  if (sk.budget == null) { sk.budget = budgetText ? 100 : 0; mark('score_budget', 'proxy: was a budget captured in the conversation (100) or not (0)'); }
  if (sk.close == null) { sk.close = outcome === 'sold' || hasNext ? 100 : 0; mark('score_close', 'proxy: sale closed or a next step / follow-up set (100), otherwise 0'); }
  const have = Object.values(sk).filter(v => v != null);
  const overall = source === 'checks' ? pct(m, n) : Math.round(have.reduce((a, b) => a + b, 0) / have.length);
  src[source]++;

  // speaker turns. Label by the AI's role guess only: the account that recorded (rep_id) is NOT the person speaking, so never use its name here.
  const roleOf = Object.fromEntries((r.roles?.speakers || []).map(x => [x.label, x.role === 'rep' ? 'Rep' : x.role === 'customer' ? 'Customer' : (x.role === 'other_staff' || x.role === 'assisting_staff') ? 'Other staff' : 'Unidentified']));
  const ts = ms => { const t = Math.floor(ms / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  const turns = []; for (const g of Array.isArray(r.segments) ? r.segments : []) { const who = roleOf[g.speaker] || g.speaker || ''; const last = turns.at(-1); if (last && last.who === who && last.text.length < 600) last.text += ' ' + (g.text || '').trim(); else turns.push({ who, at: g.startMs || 0, text: (g.text || '').trim() }); }
  const transcript = turns.length > 1 ? turns.map(t => `[${ts(t.at)}] ${t.who}: ${t.text.replace(/\s+/g, ' ')}`).join('\n') : (r.transcript || '').replace(/\s+/g, ' ').trim();
  const wRep = (r.roles?.speakers || []).filter(x => x.role === 'rep' || x.role === 'assisting_staff').reduce((a, x) => a + (x.words || 0), 0), wCust = (r.roles?.speakers || []).filter(x => x.role === 'customer').reduce((a, x) => a + (x.words || 0), 0);
  const durSec = turns.length ? Math.round((r.segments.at(-1).endMs || 0) / 1000) : 0;
  const fullText = turns.length > 1 ? turns.map(t => t.text).join(' ') : (r.transcript || ''), sumText = r.summary || res.summary || '';
  const sayTurns = turns.length > 1 ? turns : [{ who: '', text: fullText }];

  // car: which model was discussed (notes win, else the most-mentioned model in the transcript)
  const models = isCar ? carModels([fullText, sumText, fld(res, 'preference')].join(' . ')) : [];
  const noteModel = note.model ? (carModels(String(note.model))[0]?.m || { label: String(note.model).trim() }) : null;
  const mainModel = noteModel || models[0]?.m || null, alsoModels = models.map(x => x.m.label).filter(l => l !== mainModel?.label);
  if (isCar && mainModel && !noteModel) mark('product', 'car model read from the transcript: the most-mentioned model from data/price-list.json');

  // value: first match wins, and where it came from is kept in value_source
  let value = '', vsrc = ''; const setV = (v, s) => { if (value === '' && v > 0) { value = Math.round(v); vsrc = s; } };
  setV(+note.value || 0, 'team');
  if (oc.amountMinor != null) setV(Number(oc.amountMinor) / 100, 'recorded');
  /* the AI's own value: basis says whether it is a price quoted in the conversation or the customer's budget */
  if (rr.value?.amountMinor != null) setV(Number(rr.value.amountMinor) / 100, /budget/i.test(rr.value.basis || '') ? 'budget' : 'call');
  const priceLine = isCar ? saidInCall(sayTurns, PRICE_RE) : null;
  if (isCar) {
    if (priceLine) setV(priceLine.v, 'call');
    setV(rupeeFigures(budgetText).at(-1) || saidInCall(sayTurns, BUDGET_RE)?.v || 0, 'budget');
    if (mainModel?.range) setV((mainModel.range[0] + mainModel.range[1]) / 2, 'indicative');
  } else if (budgetText && money(budgetText)) setV(money(budgetText), 'budget');
  const VS_HOW = { call: 'price said in the conversation', budget: 'customer-stated budget, used where no price was said', indicative: 'no price said: midpoint of the model\'s indicative band in data/price-list.json', team: 'entered by the team in the notes file' };
  if (VS_HOW[vsrc]) mark('value_inr: ' + vsrc, VS_HOW[vsrc]);
  srcN[vsrc || 'none'] = (srcN[vsrc || 'none'] || 0) + 1;

  const lossText = oc.lossReason || (outcome !== 'sold' ? rr.rootCause : '') || '';
  const ob0 = (res.objections || [])[0];
  let lossFinal = lossText;
  if (!oc.lossReason && outcome !== 'sold' && rr.rootCause) mark('reason', 'grouped from the AI root-cause text');
  if (!lossFinal && outcome !== 'sold' && ob0?.theme) { lossFinal = ob0.theme; mark('reason', 'no loss reason recorded; the main objection raised is used'); }

  // objection + the rep's reply from the transcript
  const ob = (res.objections || [])[0]; let reply = '', at = '';
  if (ob) {
    const segs = Array.isArray(r.segments) ? r.segments : [], id = ob.evidence?.[0]?.segmentId, i = segs.findIndex(s => s.id === id);
    if (i >= 0) { at = Math.round(segs[i].startMs / 1000); const nx = segs.slice(i + 1).find(s => s.speaker !== segs[i].speaker); if (nx) { reply = clip(nx.text, 300); mark('objection_reply', 'next speaker\'s line in the transcript after the objection'); } mark('objection_at_sec', 'start of the objection segment in the transcript'); }
  }
  const priceTalk = /price|budget|making|charge|discount|negotiat/i.test(lossText + (ob?.theme || ''));
  const stageMap = isCar
    ? [['price_quoted', () => outcome === 'sold' || !!priceLine || vsrc === 'call' || priceTalk || /on[- ]?road|ex[- ]?showroom|quotation/i.test(fullText)], ['product_shown', () => TEST_DRIVE_RE.test(fullText + ' . ' + sumText)], ['need_understood', () => !!fld(res, 'purpose') || !!fld(res, 'profile')]]
    : [['price_quoted', () => outcome === 'sold' || priceTalk], ['product_shown', () => !!fld(res, 'preference')], ['need_understood', () => !!fld(res, 'purpose')]];
  const stageReached = outcome === 'sold' ? '' : (stageMap.find(([, f]) => f())?.[0] || 'talked'); if (stageReached) mark('stage_reached', isCar ? 'estimated from the conversation (purpose captured, test drive taken, price discussed)' : 'estimated from what was captured (purpose, preference, price talk)');
  const due = r.task_due || r.fu_wake, dur0 = r.ended_at ? Math.max(1, Math.round((new Date(r.ended_at) - new Date(r.captured_at)) / 60000)) : '';
  const dmin = Math.max(+dur0 || 0, Math.round(durSec / 60), Math.round((r.media_ms || 0) / 60000)) || dur0;
  const occasionOf = cat => { const a = (cat?.attributes || []).find(x => x.dimension === 'occasion' && x.canonicalId); return a ? a.canonicalId.split('.').pop().replace(/_/g, ' ').replace(/^./, ch => ch.toUpperCase()) : ''; };
  const uniq = a => [...new Set(a.filter(Boolean))];
  const aiCoach = (res.coaching || []).map(c => c.title && c.suggestion ? `${c.title}: ${c.suggestion}` : c.title || c.suggestion);
  const aiPromises = uniq((res.commitments || []).map(c => c.text));
  const ra = rr.recommendedAction, aiNext = clip(typeof ra === 'string' ? ra : ra?.text || ra?.summary || ra?.description || '', 250);
  // the company is set up as jewellery in the backend, so for a car store drop the AI's remarks about the jewellery catalogue
  const NOTE_SKIP = isCar ? /source coverage|not attributable|no matching|jewell?ery|catalogu?e|tanishq|\bgold\b/i : /source coverage|not attributable|no matching/i;
  const aiNotes = uniq((res.sop || []).filter(x => x.note && !NOTE_SKIP.test(x.note)).map(x => x.note));
  const CHK_LABEL = isCar ? CHK_CAR : { D1: 'Asked the occasion or purpose', D2: 'Confirmed the category or type', D3: 'Asked the budget', D4: 'Confirmed specifications', P1: 'Gave a correct product fact', P2: 'Addressed the customer\'s priority', P3: 'Explained the value', O1: 'Acknowledged the objection', O2: 'Explored the objection', O3: 'Answered the objection', C1: 'Handled the competitor comparison', SOP1: 'Stayed respectful', SOP2: 'Used the store offer or hook', N1: 'Agreed a next step and contact' };
  const seenChk = new Set(), aiChecks = (sc?.observations || []).filter(x => ['MET', 'NOT_MET'].includes(x.state)).filter(x => { const k = x.checkId + x.state; if (seenChk.has(k)) return false; seenChk.add(k); return true; })
    .map(x => `${x.state}: ${CHK_LABEL[x.checkId] || x.checkId} (${x.checkId})${x.reason ? '. ' + clip(String(x.reason).replace(/\|/g, '/'), 180) : ''}`).join(' | ');

  // who: team notes win; then "Rep / Customer" typed in the app's customer box; the recording account is only a last resort
  const box = String(r.customer_name || '').trim(), bp = o.notes && /[\/|]/.test(box) ? box.split(/\s*[\/|]\s*/).map(x => x.trim()) : null;
  const repName = note.rep || (bp && bp[0]) || o.rep || (o.notes ? 'Rep not tagged' : r.rep) || 'Unknown';
  let custName = note.customer || (bp ? bp.slice(1).join(' / ') : box);
  if (!custName && o.notes) custName = 'Customer ' + (dayIds.indexOf(r.id) + 1);
  const product = isCar ? (mainModel?.label || 'Model not decided') : (fld(res, 'preference') || 'Not captured');
  const weak = []; if (+dmin && +dmin < 3) weak.push('under 3 minutes'); if (r.quality && r.quality !== 'complete') weak.push('recording marked ' + r.quality); if (res.relevance?.status && res.relevance.status !== 'relevant') weak.push('AI: not a sales conversation'); if (rr.outcomeReason === 'truncated') weak.push('ends mid-conversation'); if ((r.roles?.speakers || []).length && !wCust) weak.push('no customer voice found');
  calls.push({ id: r.id, at: fmt(r.captured_at).slice(11), min: dmin, rep: repName, customer: custName, model: product, value, source: vsrc, outcome, said: vsrc === 'call' ? clip(rr.value?.evidence?.at(-1)?.quote || priceLine?.text || '', 120) : '', weak });

  exported.add(r.id); fixtureN += r.ai_provider === 'fictional_fixture' ? 1 : 0; heldN += r.ai_held ? 1 : 0; partialN += r.quality && r.quality !== 'complete' ? 1 : 0;
  const rec = {
    conversation_id: 'ZC-' + r.id, captured_at: fmt(r.captured_at), rep_name: repName, outcome, value_inr: value, value_source: vsrc, product,
    score: overall, score_need: sk.need ?? '', score_budget: sk.budget ?? '', score_pitch: sk.pitch ?? '', score_objection: sk.objection ?? '', score_close: sk.close ?? '',
    reason: outcome === 'sold' ? '' : (isCar ? carReason(lossFinal) : reasonCode(lossFinal)), stage_reached: stageReached,
    customer_name: pii && !pub ? custName : '', customer_phone: pii && !pub ? r.customer_phone || '' : '', duration_min: dmin,
    customer_type: note.segment || (isCar ? carSegment([fld(res, 'profile'), fld(res, 'purpose'), fld(res, 'preference')].join(' . ')) : occasionOf(r.cat) || fld(res, 'profile') || fld(res, 'purpose')),
    competitor: fld(res, 'competitor') || (isCar ? carCompetitor(fullText) : ''), customer_quote: clip(ob?.evidence?.[0]?.quote),
    summary_wanted: (isCar ? [mainModel ? mainModel.label + (alsoModels.length ? ' (also discussed: ' + alsoModels.join(', ') + ')' : '') : '', fld(res, 'preference'), fld(res, 'purpose')] : [fld(res, 'preference'), fld(res, 'purpose')]).filter(Boolean).join(' · '),
    summary_happened: clip(r.summary || res.summary, 300), summary_why: outcome === 'sold' ? '' : clip(rr.rootCause, 300),
    summary_next: clip(r.fu_title || aiNext, 200),
    ai_coaching: aiCoach.join(' | '), ai_coaching_quote: clip((res.coaching || [])[0]?.evidence?.[0]?.quote), ai_commitments: aiPromises.join(' | '), ai_next_action: aiNext, ai_notes: aiNotes.slice(0, 3).join(' | '),
    keywords: (res.objections || []).map(o => o.theme).filter(Boolean).slice(0, 3).join('|'),
    objection: ob?.theme ? (isCar ? carReason(ob.theme) : ob.theme) : '', objection_resolved: ob ? (ob.resolution ? 'yes' : 'no') : '', objection_quote: clip(ob?.evidence?.[0]?.quote), objection_reply: reply, objection_at_sec: at,
    followup_due: due && outcome !== 'sold' ? fmt(due, false) : '', followup_done: due && outcome !== 'sold' ? (r.task_done ? 'yes' : 'no') : '',
    store_name: o.storeName || (r.store && r.store !== 'Main' ? r.store : org.name), owner_name: owner,
    ai_checks: aiChecks, transcript: pub ? '' : transcript, vertical: o.vertical || (org.vertical === 'jewellery' && !o.ids ? 'jewellery' : org.vertical || ''),
    quality: r.quality && r.quality !== 'complete' ? r.quality : '', ai_model: r.ai_model || '', talk_rep_pct: wRep + wCust ? Math.round(100 * wRep / (wRep + wCust)) : '', segments_n: turns.length || '',
  };
  if (rec.keywords) mark('keywords', 'objection themes used as keywords');
  out.push(head.map(h => rec[h] ?? ''));
}
const file = path.resolve(root, o.file || val('--out', `data/db-export-${slug}.csv`)), metaPath = file.replace(/\.csv$/, '.meta.json');
const scoped = allSessions.filter(x => inRange(x.captured_at)), isDrop = x => !!(NOTES[String(x.id)] || {}).drop, kept = scoped.filter(x => !isDrop(x));
const pend = x => ({ id: x.id, at: fmt(x.captured_at), rep: o.notes ? (NOTES[String(x.id)] || {}).rep || 'Rep not tagged' : x.rep || 'Unknown', min: x.ended_at ? Math.max(1, Math.round((new Date(x.ended_at) - new Date(x.captured_at)) / 60000)) : null });
const dateKey = val('--date') || o.date || null, nowLocal = fmt(new Date());
/* update log for a one-day snapshot: how many conversations were shown at each refresh that changed the count */
let history = []; try { const pm = JSON.parse(fs.readFileSync(metaPath, 'utf8')); if (pm.date === dateKey && Array.isArray(pm.history)) history = pm.history; } catch {}
if (o.keepAll && dateKey && (!history.length || history.at(-1).shown !== out.length)) history.push({ at: nowLocal, shown: out.length });
const repCount = o.notes ? calls.reduce((a, c) => { a[c.rep] = (a[c.rep] || 0) + 1; return a; }, {}) : scoped.reduce((a, x) => { a[x.rep || 'Unknown'] = (a[x.rep || 'Unknown'] || 0) + 1; return a; }, {});
const meta = { store: o.storeName || org.name, exportedAt: new Date().toISOString(), exportedLocal: nowLocal, date: dateKey, recorded: scoped.length, shown: out.length,
  analysing: kept.filter(x => !exported.has(x.id) && !unscored.includes(x.id) && x.analysis_state !== 'succeeded' && x.status !== 'reupload_required').map(pend),
  failed: kept.filter(x => x.status === 'reupload_required').map(pend),
  unscored: kept.filter(x => unscored.includes(x.id)).map(pend),
  leftOut: scoped.filter(isDrop).map(x => ({ id: x.id, at: fmt(x.captured_at), why: NOTES[String(x.id)].why || 'Left out by the team' })),
  suggestDrop: calls.filter(c => c.weak.length).map(c => ({ id: c.id, at: c.at, min: c.min, why: c.weak.join(', ') })),
  valueSources: srcN, history,
  reps: Object.entries(repCount).map(([name, n]) => ({ name, recorded: n })) };
const cell = v => { v = String(v ?? ''); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
fs.mkdirSync(path.dirname(file), { recursive: true });
if (o.notes) fs.writeFileSync(file.replace(/\.csv$/, '.calls.json'), JSON.stringify(calls, null, 1));
if (!out.length) {
  /* a pilot day with nothing ready yet still gets a (header-only) file, so the dashboard can say "no conversations yet" */
  if (o.keepAll) { fs.writeFileSync(file, head.join(',') + '\n'); fs.writeFileSync(metaPath, JSON.stringify(meta, null, 1)); }
  console.error(`No rows to export for ${o.storeName || org.name}${from || dayN ? ' in that date range' : ''}. Skipped: ${JSON.stringify(skip)}`); return;
}
fs.writeFileSync(file, [head, ...out].map(l => l.map(cell).join(',')).join('\n') + '\n');
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 1));

/* ---- report ---- */
const total = out.length, fill = head.map((h, i) => ({ column: h, n: out.filter(l => l[i] !== '' && l[i] != null).length }));
const reps = [...new Set(out.map(l => l[2]))];
const PARKED = ['zocus_url', 'objection_at_sec'];
const IMPACT = {
  quality: 'Partial / unassessable recording', ai_model: 'Which AI model analysed it', talk_rep_pct: 'Talk share (rep vs customer)', segments_n: 'Transcript turns',
  ai_checks: 'Conversation panel: Skill checks; coaching: checks missed most', transcript: 'Conversation panel: Transcript', vertical: 'Wording (piece / model / bike)',
  ai_coaching: 'Conversation panel: What the AI said; rep coaching tab', ai_coaching_quote: 'Line the AI cites', ai_commitments: 'What the rep promised', ai_next_action: 'AI recommended next step', ai_notes: 'AI notes on missed skills',
  value_inr: 'Sales closed, money at stake, restock list values', value_source: 'Where each value came from (said in the call, budget, indicative, team)', reason: 'Why they did not buy chart; Insights > Lost sales', stage_reached: 'Funnel',
  in_stock: 'Stock-out and restock action', competitor_offer: 'Competitor tab', keywords: 'Search suggestions, what customers say', customer_quote: 'Conversation panel quote',
  summary_next: 'Conversation panel "what next"', objection_reply: 'Coaching: how top reps answered (peer replies)', objection_at_sec: 'Coaching: "hear it" jump', objection_quote_en: 'English view of quotes',
  customer_name: 'Names in lists (off unless --pii)', customer_phone: 'Call button (off unless --pii)', zocus_url: 'Open recording in Zocus link', rep_tenure: 'Rep profile "N years" line', score_need: 'Team skill table', score_budget: 'Team skill table', score_pitch: 'Team skill table', score_objection: 'Team skill table', score_close: 'Team skill table',
  followup_due: 'Follow-ups page', followup_done: 'Follow-ups page', objection: 'Coaching plans', objection_resolved: 'Coaching: what works', customer_type: 'Who is walking in', competitor: 'Competitor tab',
};
const NEXT = {
  in_stock: 'Not in the database. If the store catalogue/stock list is loaded, in_stock = product found in stock.',
  zocus_url: 'Needs the web-app link pattern for one conversation from the Zocus frontend (e.g. https://app.zocus.in/.../<id>). Give the pattern and it becomes a formula on the id.',
  rep_tenure: 'Not stored. Could be set from a rep list the dealership gives us, or hidden.',
  competitor_offer: 'Not extracted yet by the AI analysis. Could be added as an analysis field, or read from the transcript line after a competitor mention.',
  objection_quote_en: 'Needs a translation step. The transcript is stored in the spoken language; quotes could be translated once and saved.',
  customer_quote_en: 'Same as objection_quote_en.',
  customer_name: 'Available in the database. Left out on purpose; run with --pii for the pilot if the owner needs names.',
  customer_phone: 'Available in the database. Left out on purpose; run with --pii.',
};
const L = [];
L.push(`# Export report: ${o.storeName || org.name}`, '', `Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC from the live database (read-only). File: \`${path.relative(root, file)}\``, '');
L.push(`- **Rows exported:** ${total} of ${rows.length} analysed conversations${from || dayN ? ` (date filter ${from || dayN}${to ? ' to ' + to : ''})` : ''}`);
L.push(`- **Dates:** ${out[0][1].slice(0, 10)} to ${out.at(-1)[1].slice(0, 10)}   **Reps:** ${reps.length} (${reps.join(', ')})`);
L.push(fixtureN ? `- **FICTIONAL DATA.** ${fixtureN} of ${total} rows come from the backend's fixture seed (provider \`fictional_fixture\`, summaries start "Fictional..."). This is not real AI output; show it only as a demo.` : '- **Real data:** analysed by live AI models.');
L.push(`- **Row quality:** ${partialN} partial or unassessable recordings, ${heldN} with AI processing paused (analysis comes from an earlier run), recorded by account(s): ${[...new Set(rows.map(x => x.rep))].join(', ')} (the account that recorded, not necessarily who spoke).`);
L.push(`- **Recorded vs shown:** ${meta.recorded} recorded, ${meta.shown} shown, ${meta.analysing.length} still being analysed, ${meta.unscored.length} too short or unclear to score, ${meta.failed.length} failed upload`);
L.push(`- **Left out:** ${skip.range} outside the date range, ${skip.dropped} dropped by the team (notes file), ${skip.noOutcome} with no recorded outcome and no follow-up, ${skip.noScore} with no assessable score`);
if (isCar) L.push(`- **Where values came from:** ${Object.entries(srcN).map(([k, n]) => `${n} ${({ call: 'said in the call', budget: 'customer budget', indicative: 'indicative by model', team: 'entered by team', recorded: 'recorded in the app', none: 'value not known' })[k] || k}`).join(', ')}`);
L.push(`- **Where scores came from:** ${src.checks} conversations from the AI rubric checks, ${src['analysis review']} from the analysis review (observed / not observed). Real rubric scores are only produced for conversations the scorer judged eligible.`, '');
L.push('## What is filled', '', '| Column | Filled | Powers |', '|---|---|---|');
for (const f of fill) L.push(`| ${f.column} | ${Math.round(100 * f.n / total)}% | ${IMPACT[f.column] || ''} |`);
L.push('', '## Worked out by formula (not stored as such in the database)', '');
const dk = Object.entries(DERIVED); L.push(dk.length ? dk.map(([c, d]) => `- **${c}** (${d.n} rows): ${d.how}`).join('\n') : '- none');
const gaps = fill.filter(f => f.n / total < 0.5 && !PARKED.includes(f.column));
L.push('', '## Missing or thin, and what could fill it', '');
for (const f of gaps) L.push(`- **${f.column}** (${Math.round(100 * f.n / total)}%): ${NEXT[f.column] || 'Not available in the database for this company.'} Affects: ${IMPACT[f.column] || 'minor'}.`);
L.push('- **Parked: recordings coming soon.** `zocus_url` and `objection_at_sec` are not used by the dashboard for now.');
if (reps.length < 3) L.push(`- **Only ${reps.length} rep${reps.length === 1 ? '' : 's'}** in this export, so Team ranking and peer coaching (best rep's answer) will be thin.`);
if (total < 30) L.push(`- **Only ${total} conversations**: 7-day and 30-day trends will be noisy; Today/Yesterday views may be empty.`);
try { const { execFileSync } = await import('node:child_process'); const chk = JSON.parse(execFileSync('node', [path.join(root, 'tools/check-csv.mjs'), file], { encoding: 'utf8' }));
  L.push('', '## Dashboard check', '', chk.ok ? `The dashboard's own upload check accepts this file: ${chk.convs} conversations, ${chk.reps} reps, ${chk.days} days of data.` : `**The dashboard rejects this file:** ${chk.errors.slice(0, 5).join(' | ')}`);
  for (const w of chk.warnings || []) L.push(`- Note: ${w}`); } catch (e) { L.push('', '## Dashboard check', '', 'Could not run: ' + e.message.split('\n')[0]); }
fs.writeFileSync(file.replace(/\.csv$/, '.report.md'), L.join('\n') + '\n');
if (!quiet) { console.log(L.join('\n')); } else console.log(`${o.storeName || org.name}: ${out.length} rows -> ${path.relative(root, file)}`);
}
const only = val('--store');
if (cases) { for (const st of cases.stores) if (!only || st.id === only) await runExport({ org: st.org, date: st.date, keepAll: !!st.org, ids: st.sessions, storeName: st.name, ownerName: st.owner || '', vertical: st.vertical, file: (only && val('--out')) || st.file || `data/cases/${st.id}.csv`, notes: val('--notes') || st.notes, rep: st.rep, featured: st.featured }); } else await runExport({});
await db.end();
