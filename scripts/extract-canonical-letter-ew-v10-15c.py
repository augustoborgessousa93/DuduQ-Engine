import json
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "duduq-audio/.runtime/production-work/V10-15C-EW-candidates"
FRAME_MS = 10

def runs(mask):
    edges = np.flatnonzero(np.diff(np.r_[False, mask, False].astype(np.int8)))
    return [(int(start), int(end)) for start, end in zip(edges[::2], edges[1::2])]

def extract(name, target):
    source = SOURCE / name
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
        return {"letter": target, "source": name, "status": "ISSUE_TARGET_BOUNDARY_NOT_FOUND", "segments": segments}
    start_frame, end_frame = segments[-1]
    previous_end = segments[-2][1]
    gap = (start_frame - previous_end) * FRAME_MS / 1000
    if gap < 0.22:
        return {"letter": target, "source": name, "status": "ISSUE_TARGET_BOUNDARY_TOO_SHORT", "gapSeconds": round(gap, 3)}
    duration = (end_frame - start_frame) * FRAME_MS / 1000
    limit = 1.8 if target == "W" else 1.15
    if not 0.16 <= duration <= limit:
        return {"letter": target, "source": name, "status": "ISSUE_SUSPICIOUS_TARGET_DURATION", "durationSeconds": round(duration, 3)}
    # Deliberately tighter than V10.15B's 100 ms pre-roll: preserve onset safety
    # without importing residual context into the target.
    start = max(0, start_frame * frame - int(rate * 0.025))
    end = min(len(samples), end_frame * frame + int(rate * 0.14))
    output = SOURCE / f"{target.lower()}-{Path(name).stem}-target.wav"
    sf.write(output, samples[start:end], rate, subtype="PCM_16")
    return {"letter": target, "source": name, "output": output.relative_to(ROOT).as_posix(),
        "sampleRate": rate, "sourceDurationSeconds": round(len(samples) / rate, 3),
        "contextTargetGapSeconds": round(gap, 3), "voicedSegments": len(segments),
        "targetSegmentSeconds": round(duration, 3), "tightPreRollMs": 25,
        "isolatedDurationSeconds": round((end - start) / rate, 3),
        "targetReferencesInPrompt": 1, "status": "TECHNICAL_SIGNAL_PASS_HUMAN_PENDING"}

rows = [extract("e-pause.wav", "E"), extract("w-pause.wav", "W"),
        extract("w-context.wav", "W")]
issues = [row for row in rows if row["status"] != "TECHNICAL_SIGNAL_PASS_HUMAN_PENDING"]
report = {"feature": "DUDUQ_SURGICAL_E_W_AUDIO_REFINEMENT_V10_15C",
          "status": "ISSUE_SIGNAL_ISOLATION" if issues else "TECHNICAL_SIGNAL_PASS_HUMAN_PENDING",
          "candidates": rows, "issues": issues}
report_path = SOURCE / "isolation-qc.json"
report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
