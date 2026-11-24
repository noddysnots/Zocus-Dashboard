"""Step 1: audio -> speech chunks -> IndicConformer text (Hindi or Gujarati per chunk) -> speaker clusters.

Usage: python transcribe.py <conversation.m4a> <out_dir>
Writes <out_dir>/turns.json. Nothing here touches the database or the network
(the model is read from the local Hugging Face cache).
"""
import sys, os, json, subprocess, time, warnings
import numpy as np, torch, soundfile as sf
warnings.filterwarnings("ignore")
from silero_vad import load_silero_vad, get_speech_timestamps
from transformers import AutoModel
from speechbrain.inference.speaker import EncoderClassifier
from sklearn.cluster import SpectralClustering
from sklearn.metrics import silhouette_score

SR = 16000
MAX_CHUNK = 10.0     # IndicConformer returns nothing on long clips
LANGS = ("hi", "gu")
VOICES = 3           # ECAPA fallback; about 82% rep/customer agreement with Argon on #272 (rep share alone is 68%)
HERE = os.path.dirname(os.path.abspath(__file__))


def load_audio(src, out_dir):
    wav_path = os.path.join(out_dir, "audio.wav")
    if not os.path.exists(wav_path):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-ac", "1", "-ar", str(SR), wav_path], check=True)
    wav, _ = sf.read(wav_path, dtype="float32")
    return wav


def chunks(wav):
    vad = load_silero_vad()
    sp = get_speech_timestamps(torch.from_numpy(wav), vad, sampling_rate=SR, min_speech_duration_ms=250,
                               min_silence_duration_ms=150, max_speech_duration_s=MAX_CHUNK, speech_pad_ms=120)
    out = []
    for e in sp:
        a, b = e["start"] / SR, e["end"] / SR
        if out and a - out[-1][1] < 0.35 and b - out[-1][0] <= MAX_CHUNK:
            out[-1][1] = b
        else:
            out.append([a, b])
    return out


def lang_scores(m, seg):
    enc, _ = m.encode(torch.from_numpy(seg).unsqueeze(0))
    lp = m.models["ctc_decoder"].run(["logprobs"], {"encoder_output": enc})[0]
    s = {}
    for lg in LANGS:
        l = torch.from_numpy(lp[:, :, m.language_masks[lg]]).log_softmax(-1)[0]
        s[lg] = l.max(-1).values.mean().item()
    return s


def transcribe_chunk(m, seg):
    s = lang_scores(m, seg)
    best = max(LANGS, key=lambda k: s[k] + (0.02 if k == "hi" else 0))   # tie goes to Hindi
    margin = abs(s["hi"] - s["gu"])
    t = torch.from_numpy(seg).unsqueeze(0)
    text = m(t, best, "rnnt").strip()
    quality = "ok"
    if not text:                                     # one retry in the other language
        other = "gu" if best == "hi" else "hi"
        text, best = m(t, other, "rnnt").strip(), other
    if not text:                                     # CTC decoder still returns partial words: keep, but mark low
        best = max(LANGS, key=lambda k: s[k] + (0.02 if k == "hi" else 0))
        text = m(t, best, "ctc").strip()
        quality = "low" if text else "none"
    return best, round(margin, 3), text, quality


def speakers(wav, spans):
    enc = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb",
                                         savedir=os.path.join(HERE, ".ecapa"), run_opts={"device": "cpu"})
    W, H = int(1.5 * SR), int(0.75 * SR)
    wins = []
    for a, b in spans:
        a, b = int(a * SR), int(b * SR)
        if b - a < W:
            wins.append((a, b))
        else:
            s = a
            while s + W <= b:
                wins.append((s, s + W)); s += H
            if b - (s - H + W) > 8000:
                wins.append((b - W, b))
    E = []
    with torch.no_grad():
        for a, b in wins:
            E.append(enc.encode_batch(torch.from_numpy(wav[a:b]).unsqueeze(0)).squeeze().numpy())
    E = np.array(E); E /= np.linalg.norm(E, axis=1, keepdims=True)
    # Fixed at 3 voices (rep, customer, one more): choosing the count by silhouette collapsed everyone into one voice.
    k = VOICES
    lab = SpectralClustering(n_clusters=k, affinity="nearest_neighbors", n_neighbors=10, random_state=0).fit_predict(E)
    sc = silhouette_score(E, lab, metric="cosine")
    return [(a / SR, b / SR) for a, b in wins], lab, round(float(sc), 3), k


def main(src, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    t0 = time.time()
    wav = load_audio(src, out_dir)
    spans = chunks(wav)
    m = AutoModel.from_pretrained("ai4bharat/indic-conformer-600m-multilingual", trust_remote_code=True)
    turns = []
    for a, b in spans:
        seg = wav[int(a * SR):int(b * SR)]
        if len(seg) < 4000:
            continue
        lg, margin, text, quality = transcribe_chunk(m, seg)
        turns.append({"start": round(a, 2), "end": round(b, 2), "lang": lg, "lang_margin": margin, "text": text, "quality": quality})
    wins, lab, sil, k = speakers(wav, spans)
    for t in turns:
        c = {}
        for i, (x, y) in enumerate(wins):
            ov = min(y, t["end"]) - max(x, t["start"])
            if ov > 0:
                c[int(lab[i])] = c.get(int(lab[i]), 0) + ov
        t["voice"] = max(c, key=c.get) if c else -1
    dur = {}
    for t in turns:
        dur[t["voice"]] = dur.get(t["voice"], 0) + t["end"] - t["start"]
    json.dump({"source": os.path.basename(src), "audio_sec": round(len(wav) / SR, 1), "voices": k, "silhouette": sil,
               "speech_by_voice": {str(a): round(b, 1) for a, b in dur.items()}, "empty_chunks": sum(1 for t in turns if t["quality"] == "none"), "low_chunks": sum(1 for t in turns if t["quality"] == "low"), "thin_speech_share": round(sum(t["end"] - t["start"] for t in turns if t["quality"] != "ok") / max(1, sum(t["end"] - t["start"] for t in turns)), 3),
               "seconds_taken": round(time.time() - t0, 1), "turns": turns}, open(os.path.join(out_dir, "turns.json"), "w"), ensure_ascii=False)
    print(os.path.basename(src), "turns", len(turns), "voices", k, "silhouette", sil, "low", sum(1 for t in turns if t["quality"] == "low"), "none", sum(1 for t in turns if t["quality"] == "none"), "secs", round(time.time() - t0))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
