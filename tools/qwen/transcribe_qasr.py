"""Scenario B audio model: re-transcribe the same speech chunks with Qwen3-ASR 1.7B (mlx), keeping the speaker grouping.
Usage: python transcribe_qasr.py <conv_dir>   (reads turns.json, writes turns_qasr.json)"""
import sys, os, json, time, warnings
import soundfile as sf
warnings.filterwarnings("ignore")
import mlx_qwen3_asr as q
d = sys.argv[1]; T = json.load(open(os.path.join(d, "turns.json")))
wav, _ = sf.read(os.path.join(d, "audio.wav"), dtype="float32"); t0 = time.time()
for t in T["turns"]:
    seg = wav[int(t["start"] * 16000):int(t["end"] * 16000)]
    if len(seg) < 4000: t["text"], t["quality"] = "", "none"; continue
    try:
        text = q.transcribe(seg, model="Qwen/Qwen3-ASR-1.7B", language="Gujarati" if t["lang"] == "gu" else "Hindi").text.strip()
    except Exception: text = ""
    t["text"], t["quality"] = text, ("ok" if text else "none")
T["thin_speech_share"] = round(sum(t["end"] - t["start"] for t in T["turns"] if t["quality"] != "ok") / max(1, sum(t["end"] - t["start"] for t in T["turns"])), 3)
T["asr"] = "Qwen3-ASR-1.7B"; T["seconds_taken"] = round(time.time() - t0, 1)
json.dump(T, open(os.path.join(d, "turns_qasr.json"), "w"), ensure_ascii=False); print(os.path.basename(d), "done", T["seconds_taken"], "s thin", T["thin_speech_share"])
