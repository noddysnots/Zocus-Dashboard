"""Step 2: roles (Argon's speaker-roles-audio-v3 instruction) and analysis (ten checks) with Qwen3 14B via Ollama.

Usage: python analyse.py <out_dir>      (reads <out_dir>/turns.json, writes <out_dir>/insights.json)
Everything runs on this Mac. Ollama must be running.
"""
import sys, os, json, re, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.environ.get("QWEN_MODEL", "huihui_ai/qwen3-abliterated:14b")
OLLAMA = "http://127.0.0.1:11434/api/chat"
RUNS = 3
CATEGORIES = ["STORE_REP_PRIMARY", "STORE_REP_SPECIALIST", "STORE_MANAGER_ESCALATION", "STORE_BILLING_CRM", "STORE_SUPPORT",
              "CUSTOMER_DECIDER", "CUSTOMER_WEARER_USER", "CUSTOMER_FACILITATOR", "CUSTOMER_INFLUENCER_CRITIC",
              "CUSTOMER_ACCOMPANYING", "BACKGROUND_UNRELATED", "UNCLEAR"]
CHECKS = ["need", "budget", "decision_timing", "options", "experience", "value_proof", "price_offers", "concerns", "ask", "next_step"]
MARKS = {"done": 100, "partly": 50, "missed": 0}

ROLES_SCHEMA = {"type": "object", "required": ["speakers", "mapping"], "properties": {
    "speakers": {"type": "array", "items": {"type": "object", "required": ["id", "category", "situational_role", "voice", "confidence", "evidence_times"], "properties": {
        "id": {"type": "string"}, "category": {"type": "string", "enum": CATEGORIES}, "situational_role": {"type": "string"},
        "voice": {"type": "string"}, "confidence": {"type": "number"}, "evidence_times": {"type": "array", "items": {"type": "number"}}}}},
    "mapping": {"type": "object", "additionalProperties": {"type": "string"}}, "notes": {"type": "string"}}}
STR_OR_NULL = {"type": ["string", "null"]}
ANALYSIS_SCHEMA = {"type": "object", "required": ["summary", "outcome_stage", "concerns", "objections", "followups", "checks"], "properties": {
    "summary": {"type": "object", "required": ["need", "happened", "outcome", "why", "next_step"], "properties": {k: {"type": "string"} for k in ["need", "happened", "outcome", "why", "next_step"]}},
    "outcome_stage": {"type": "string", "enum": ["won", "considering", "follow_up", "lost", "unknown"]},
    "concerns": {"type": "array", "items": {"type": "object", "required": ["concern", "status"], "properties": {"concern": {"type": "string"}, "status": {"type": "string", "enum": ["answered", "partly", "open"]}}}},
    "objections": {"type": "array", "items": {"type": "object", "required": ["theme", "customer_quote", "rep_answer"], "properties": {"theme": {"type": "string"}, "customer_quote": STR_OR_NULL, "rep_answer": STR_OR_NULL}}},
    "followups": {"type": "array", "items": {"type": "object", "required": ["title", "quote"], "properties": {"title": {"type": "string"}, "quote": STR_OR_NULL}}},
    "checks": {"type": "array", "items": {"type": "object", "required": ["id", "mark", "reason", "quote"], "properties": {"id": {"type": "string", "enum": CHECKS}, "mark": {"type": "string", "enum": list(MARKS)}, "reason": {"type": "string"}, "quote": STR_OR_NULL}}}}}


def chat(system, user, schema, temperature, num_predict, seed):
    body = {"model": MODEL, "stream": False, "think": False, "format": schema,
            "options": {"temperature": temperature, "num_ctx": 32768, "num_predict": num_predict, "seed": seed},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    r = json.load(urllib.request.urlopen(urllib.request.Request(OLLAMA, json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=3600))
    return json.loads(r["message"]["content"]), r.get("prompt_eval_count")


def mmss(t):
    return f"{int(t // 60)}:{int(t % 60):02d}"


def norm(s):
    return re.sub(r"[\s​.,!?;:'\"।|\-–—()\[\]]+", " ", s or "").strip().lower()


def roles(turns):
    system = open(os.path.join(HERE, "prompts", "speaker-roles-audio-v3.txt")).read()
    lines = [f"[{t['start']:.1f}] voice_{t['voice']}: {t['text']}" for t in turns if t["text"]]
    user = ("The audio was already transcribed and the voices separated by software, and you cannot hear it. Work from the text and times below. "
            "Each line starts with its start time in seconds and a voice id; the voice id can be wrong in places. Follow the instruction above. "
            "Give every voice an id (Rep_N, Customer_N or Other_N; two voices may be one person, so reuse an id to merge them), a category, a situational_role, "
            "a confidence from 0 to 1, voice (write exactly \"unknown\", because you cannot hear), and evidence_times: copy start times of lines (the number in brackets) that show the role. "
            "Also give mapping from each voice (voice_0, voice_1 ...) to its id. The rep typically quotes prices, offers and features; the customer asks and objects.\n\n" + "\n".join(lines))
    starts = {}
    for t in turns:
        starts.setdefault(f"voice_{t['voice']}", []).append(t["start"])
    best = None
    for attempt, temp in enumerate((0.1, 0.3, 0.5)):
        try:
            r, _ = chat(system, user, ROLES_SCHEMA, temp, 1500, attempt + 1)
        except Exception as e:
            continue
        probs = []
        mp = r["mapping"]
        by_id = {}
        inv = {}
        for vk, sid in mp.items():
            inv.setdefault(sid, []).append(vk)
        for s in r["speakers"]:
            vs = inv.get(s["id"], [])
            ok = [e for e in s["evidence_times"] if any(abs(e - x) <= 3 for v in vs for x in starts.get(v, []))]
            s["evidence_valid"] = ok
            if s["confidence"] < 0.85:
                probs.append(f"{s['id']} confidence {s['confidence']}")
            if len(ok) < 2 and s["category"].startswith("STORE_REP"):
                probs.append(f"{s['id']} has {len(ok)} valid evidence passages")
            by_id[s["id"]] = s
        if not any(s["category"] == "STORE_REP_PRIMARY" for s in r["speakers"]):
            probs.append("no primary rep")
        for v in starts:
            if v not in mp:
                probs.append(f"{v} not mapped")
        score = len(probs)
        if best is None or score < best[0]:
            best = (score, r, probs, attempt + 1)
        if not probs:
            break
    if best is None:
        return None, ["roles step failed"], 0
    return best[1], best[2], best[3]


def labelled(turns, mapping):
    out = []
    for t in turns:
        if t["text"]:
            out.append(f"[{mmss(t['start'])}] {mapping.get('voice_%d' % t['voice'], 'Other_1')}: {t['text']}")
    return "\n".join(out)


def verify(a, transcript_norm):
    """Drop quotes that are not in the transcript; done without a real quote becomes partly."""
    issues = 0
    def ok(q):
        return bool(q) and norm(q) in transcript_norm
    for c in a["checks"]:
        if c["quote"] and not ok(c["quote"]):
            c["quote"] = None; issues += 1
        if c["mark"] == "done" and not c["quote"]:
            c["mark"] = "partly"; c["reason"] += " (downgraded: no verified quote)"
    for o in a["objections"]:
        for k in ("customer_quote", "rep_answer"):
            if o[k] and not ok(o[k]):
                o[k] = None; issues += 1
    for f in a["followups"]:
        if f["quote"] and not ok(f["quote"]):
            f["quote"] = None; issues += 1
    return issues


def analyse(transcript):
    system = open(os.path.join(HERE, "prompts", "analysis-v2.txt")).read()
    tn = norm(transcript)
    runs = []
    for i in range(RUNS):
        for attempt in range(2):
            try:
                a, ptok = chat(system, "TRANSCRIPT:\n" + transcript, ANALYSIS_SCHEMA, 0.3, 4000, 11 * (i + 1) + attempt)
            except Exception:
                continue
            ids = [c["id"] for c in a["checks"]]
            if sorted(ids) != sorted(CHECKS):
                continue
            a["checks"] = sorted(a["checks"], key=lambda c: CHECKS.index(c["id"]))
            a["_quote_issues"] = verify(a, tn); a["_prompt_tokens"] = ptok
            runs.append(a); break
    return runs


def vote(runs):
    checks = []
    for cid in CHECKS:
        cs = [next(c for c in r["checks"] if c["id"] == cid) for r in runs]
        marks = [c["mark"] for c in cs]
        counts = {m: marks.count(m) for m in MARKS}
        top = max(counts.values())
        winners = [m for m in MARKS if counts[m] == top]
        mark = winners[0] if len(winners) == 1 else sorted(marks, key=lambda m: MARKS[m])[len(marks) // 2]   # no majority -> median
        pick = next((c for c in cs if c["mark"] == mark and c["quote"]), next(c for c in cs if c["mark"] == mark))
        checks.append({"id": cid, "mark": mark, "reason": pick["reason"], "quote": pick["quote"], "votes": marks, "agree": top == len(marks)})
    return checks


def main(out_dir):
    d = json.load(open(os.path.join(out_dir, "turns.json")))
    turns = d["turns"]; t0 = time.time()
    r, probs, attempts = roles(turns)
    mapping = r["mapping"] if r else {}
    transcript = labelled(turns, mapping)
    runs = analyse(transcript)
    if not runs:
        json.dump({"error": "analysis failed", "roles": r}, open(os.path.join(out_dir, "insights.json"), "w")); print("analysis failed"); return
    checks = vote(runs)
    consensus = {c["id"]: c["mark"] for c in checks}
    best = max(runs, key=lambda a: (sum(c["mark"] == consensus[c["id"]] for c in a["checks"]), -a["_quote_issues"]))
    stages = [a["outcome_stage"] for a in runs]
    stage = max(set(stages), key=stages.count)
    score = round(sum(MARKS[c["mark"]] for c in checks) / len(checks))
    thin = d.get("thin_speech_share", 0)
    low_lang = sum(1 for t in turns if t["lang_margin"] < 0.03) / max(1, len(turns))
    flags = []
    if probs: flags.append("roles not fully validated: " + "; ".join(probs))
    if len(runs) < RUNS: flags.append(f"only {len(runs)} of {RUNS} analysis runs were valid")
    if thin > 0.15: flags.append(f"{round(thin * 100)}% of the speech came out as little or no text (needs review)")
    if low_lang > 0.3: flags.append(f"language unsure on {round(low_lang * 100)}% of chunks")
    dis = sum(1 for c in checks if not c["agree"])
    if dis >= 4: flags.append(f"{dis} of 10 marks differed between runs")
    out = {"source": d["source"], "model": MODEL, "score": score, "outcome_stage": stage, "stage_votes": stages,
           "summary": best["summary"], "concerns": best["concerns"], "objections": best["objections"], "followups": best["followups"],
           "checks": checks, "roles": r, "roles_attempts": attempts, "review_flags": flags,
           "quote_issues_per_run": [a["_quote_issues"] for a in runs], "prompt_tokens": runs[0]["_prompt_tokens"],
           "seconds_taken": round(time.time() - t0, 1)}
    json.dump(out, open(os.path.join(out_dir, "insights.json"), "w"), ensure_ascii=False, indent=1)
    open(os.path.join(out_dir, "transcript_labelled.txt"), "w").write(transcript)
    print("score", score, "stage", stage, "flags", flags, "secs", out["seconds_taken"], "prompt tokens", out["prompt_tokens"])


if __name__ == "__main__":
    main(sys.argv[1])
