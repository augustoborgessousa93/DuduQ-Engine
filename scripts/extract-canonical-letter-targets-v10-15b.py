import json
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "duduq-audio/.runtime/production-work/V10-15B-letter-candidates"
DEST = ROOT / "content/english/assets/audio/versions/CANONICAL_LETTERS/NATURAL_CLEAR_V3_CANDIDATE/lexical"
REPORT = ROOT / "duduq-audio/.runtime/production-work/V10-15B-letter-candidates/isolation-qc.json"
LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
FRAME_MS = 10
MIN_GAP_SECONDS = 0.22

def runs(mask):
    edges = np.flatnonzero(np.diff(np.r_[False, mask, False].astype(np.int8)))
    return [(int(start), int(end)) for start, end in zip(edges[::2], edges[1::2])]

def isolate(letter):
    alternates = [SOURCE / f"{letter.lower()}-alt2.wav", SOURCE / f"{letter.lower()}-alt1.wav"]
    source = next((candidate for candidate in alternates if candidate.is_file()), SOURCE / f"{letter.lower()}.wav")
    if not source.is_file():
        return {"letter": letter, "status": "ISSUE_CANDIDATE_MISSING"}
    samples, rate = sf.read(source, dtype="float32", always_2d=False)
    if samples.ndim > 1:
        samples = samples.mean(axis=1)
    frame = max(1, int(rate * FRAME_MS / 1000))
    rms = np.array([np.sqrt(np.mean(samples[i:i + frame] ** 2)) for i in range(0, len(samples), frame)])
    threshold = max(0.008, float(rms.max()) * 0.03)
    active = rms > threshold
    mask = active.copy()
    for start, end in runs(~active):
        if start > 0 and end < len(mask) and (end - start) * FRAME_MS <= 220:
            mask[start:end] = True
    segments = runs(mask)
    if len(segments) < 2:
        return {"letter": letter, "status": "ISSUE_TARGET_ISOLATION_GAP_NOT_FOUND", "segments": segments}
    start_frame, end_frame = segments[-1]
    previous_end = segments[-2][1]
    gap = (start_frame - previous_end) * FRAME_MS / 1000
    if gap < MIN_GAP_SECONDS:
        return {"letter": letter, "status": "ISSUE_TARGET_ISOLATION_GAP_TOO_SHORT", "gapSeconds": round(gap, 3)}
    duration = (end_frame - start_frame) * FRAME_MS / 1000
    maximum = 1.8 if letter == "W" else 1.15
    if duration < 0.16 or duration > maximum:
        return {"letter": letter, "status": "ISSUE_SUSPICIOUS_TARGET_DURATION", "durationSeconds": round(duration, 3), "maximumSeconds": maximum}
    crop_start = max(0, start_frame * frame - int(rate * 0.10))
    crop_end = min(len(samples), end_frame * frame + int(rate * 0.16))
    target = samples[crop_start:crop_end]
    if len(target) / rate < 0.28:
        return {"letter": letter, "status": "ISSUE_TARGET_CLIP_TOO_SHORT"}
    out = DEST / f"aud-en-letter-{letter.lower()}.wav"
    sf.write(out, target, rate, subtype="PCM_16")
    return {"letter": letter, "source": source.relative_to(ROOT).as_posix(), "output": out.relative_to(ROOT).as_posix(),
        "sourceDurationSeconds": round(len(samples) / rate, 3), "detectedContextToTargetGapSeconds": round(gap, 3),
        "isolatedTargetDurationSeconds": round(len(target) / rate, 3), "targetReferencesInSynthesisPrompt": 1,
        "voicedSegmentsBeforeIsolation": len(segments), "status": "TECHNICAL_SIGNAL_QC_PASS_HUMAN_LISTENING_PENDING"}

def main():
    DEST.mkdir(parents=True, exist_ok=True)
    results = [isolate(letter) for letter in LETTERS]
    for row in results:
        print(f"{row['status']} {row['letter']} {row.get('isolatedTargetDurationSeconds', row.get('durationSeconds', ''))}")
    issues = [row for row in results if not row["status"].startswith("TECHNICAL_SIGNAL_QC_PASS")]
    report = {"feature": "DUDUQ_FINAL_LETTER_AUDIO_REBUILD_V10_15B", "status": "ISSUE_SIGNAL_ISOLATION" if issues else "PASS_SIGNAL_ISOLATION_HUMAN_PENDING",
        "minimumContextGapSeconds": MIN_GAP_SECONDS, "cueToTargetRuntimeGapMs": 260, "targetReferencesPerAsset": 1,
        "humanPronunciationStatus": "PENDING", "letters": results, "issues": issues}
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"REPORT {REPORT.relative_to(ROOT).as_posix()} issues={len(issues)}")

if __name__ == "__main__":
    main()
