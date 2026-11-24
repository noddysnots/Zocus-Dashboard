"""Step 3: compare Qwen insights with the backend's (Sonnet) marks stored in data/cases/pilot.csv. No database, no network.
Usage: python compare.py [conversation numbers...]   (default: every folder in data/qwen with insights.json)
"""
import sys, os, csv, json, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MAP = {"MET": "done", "PARTLY": "partly", "NOT_MET": "missed"}
V = {"done": 100, "partly": 50, "missed": 0}
rows = {r["conversation_id"]: r for r in csv.DictReader(open(os.path.join(ROOT, "data/cases/pilot.csv"), encoding="utf-8"))}
ids = sys.argv[1:] or sorted(d for d in os.listdir(os.path.join(ROOT, "data/qwen")) if os.path.exists(os.path.join(ROOT, "data/qwen", d, "insights.json")))
tot_eq = tot_n = 0
for n in ids:
    p = os.path.join(ROOT, "data/qwen", n, "insights.json")
    if not os.path.exists(p): continue
    q = json.load(open(p)); r = rows.get("ZC-" + n)
    if "error" in q or not r: print(n, "no result"); continue
    sm = {}
    for part in (r["ai_checks"] or "").split(" | "):
        m = re.match(r"(MET|PARTLY|NOT_MET): .*?\((\w+)\)", part)
        if m: sm[m.group(2)] = MAP[m.group(1)]
    both = [c for c in q["checks"] if c["id"] in sm]
    eq = sum(c["mark"] == sm[c["id"]] for c in both); tot_eq += eq; tot_n += len(both)
    off1 = sum(abs(V[c["mark"]] - V[sm[c["id"]]]) > 50 for c in both)
    print(f"#{n}: marks equal {eq}/{len(both)}  (two steps apart: {off1})  score Qwen {q['score']} vs backend {r['score'] or '-'}  stage {q['outcome_stage']} vs {r['outcome']}  flags: {len(q['review_flags'])}")
    for c in both:
        if c["mark"] != sm[c["id"]]: print(f"    {c['id']}: Qwen {c['mark']} {c['votes']} | backend {sm[c['id']]}")
print(f"TOTAL marks equal {tot_eq}/{tot_n}" + (f" = {round(100*tot_eq/tot_n)}%" if tot_n else ""))
