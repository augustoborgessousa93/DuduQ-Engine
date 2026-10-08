#!/usr/bin/env python3
"""High-quality human foreground segmentation and safe 1024 RGBA canvas output."""
import json
import hashlib
import os
import sys
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx"
MODEL_MD5 = "c09ddc2e0104f800e3e1bb4652583d1f"


def fail(code: str) -> None:
    print(json.dumps({"status": "ISSUE", "error": code}))
    raise SystemExit(2)


def model_path() -> Path:
    home = Path(os.environ.get("REMBG_HOME", ".rembg"))
    return home / "models" / "u2net_human_seg" / "u2net_human_seg.onnx"


def ensure_model() -> Path:
    target = model_path()
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(".download")
        urllib.request.urlretrieve(MODEL_URL, temporary)
        digest = hashlib.md5(temporary.read_bytes()).hexdigest()
        if digest != MODEL_MD5:
            temporary.unlink(missing_ok=True)
            fail("HUMAN_SEGMENTATION_MODEL_CHECKSUM_FAILED")
        temporary.replace(target)
    digest = hashlib.md5(target.read_bytes()).hexdigest()
    if digest != MODEL_MD5:
        fail("HUMAN_SEGMENTATION_MODEL_CHECKSUM_FAILED")
    return target


def prepare() -> None:
    target = ensure_model()
    session = ort.InferenceSession(str(target), providers=["CPUExecutionProvider"])
    if not session.get_inputs() or not session.get_outputs():
        fail("HUMAN_SEGMENTATION_MODEL_INVALID")
    print(json.dumps({"status": "PASS", "segmenter": "U2Net human segmentation", "model": "u2net_human_seg", "modelMd5": MODEL_MD5, "providers": session.get_providers()}))


def main() -> None:
    if len(sys.argv) == 2 and sys.argv[1] == "--prepare":
        try:
            prepare()
        except Exception as exc:
            fail("HUMAN_SEGMENTATION_PREPARE_FAILED:" + type(exc).__name__)
        return
    if len(sys.argv) != 3:
        fail("USAGE: remove-image-background.py input.jpg output.png")
    source_path, target_path = map(Path, sys.argv[1:])
    try:
        with Image.open(source_path) as im:
            im.load()
            if im.format != "JPEG" or im.width < 512 or im.height < 512:
                fail("SOURCE_JPEG_INVALID_OR_TOO_SMALL")
            source_size = [im.width, im.height]
            source = im.convert("RGB")
    except Exception:
        fail("SOURCE_JPEG_DECODE_FAILED")

    try:
        session = ort.InferenceSession(str(ensure_model()), providers=["CPUExecutionProvider"])
        model_input = source.resize((320, 320), Image.Resampling.LANCZOS)
        array = np.asarray(model_input, dtype=np.float32)
        array /= max(float(np.max(array)), 1e-6)
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        array = ((array - mean) / std).transpose((2, 0, 1))[None, ...].astype(np.float32)
        predicted = session.run(None, {session.get_inputs()[0].name: array})[0][:, 0, :, :]
        predicted = predicted[0]
        low, high = float(predicted.min()), float(predicted.max())
        if high - low < 1e-6:
            fail("HUMAN_SEGMENTATION_MASK_EMPTY")
        mask = Image.fromarray(np.uint8(np.clip((predicted - low) / (high - low) * 255.0, 0, 255)), mode="L")
        # Preserve the model's soft edge probabilities; a slight blur only antialiases the resized matte.
        mask = mask.resize(source.size, Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(radius=0.65))
        segmented = source.convert("RGBA")
        segmented.putalpha(mask)
    except Exception as exc:
        # Avoid printing arbitrary exception text that might include environment values.
        fail("REMBG_SEGMENTATION_FAILED:" + type(exc).__name__)

    alpha = segmented.getchannel("A")
    # A soft matte retains hair/fingers; use alpha > 8 only to measure actual subject bounds.
    measured = alpha.point(lambda v: 255 if v > 8 else 0)
    bbox = measured.getbbox()
    if not bbox:
        fail("SUBJECT_REMOVED_OR_EMPTY")
    subject = segmented.crop(bbox)
    bw, bh = subject.size
    if bw < 180 or bh < 180 or bw * bh < source.width * source.height * 0.07:
        fail("SUBJECT_SCALE_TOO_SMALL")

    # Contain the full segmented subject on a fixed transparent square with safe padding.
    canvas_size, max_extent = 1024, 900
    scale = min(max_extent / bw, max_extent / bh)
    resized = subject.resize((max(1, round(bw * scale)), max(1, round(bh * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    x, y = (canvas_size - resized.width) // 2, (canvas_size - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    out_alpha = canvas.getchannel("A")
    alpha_extrema = out_alpha.getextrema()
    visible = sum(1 for value in out_alpha.getdata() if value > 8)
    solid = sum(1 for value in out_alpha.getdata() if value > 240)
    output_bbox = out_alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    if alpha_extrema[0] != 0 or alpha_extrema[1] < 128 or visible < 1024 or solid < 1024:
        fail("FINAL_ALPHA_QC_FAILED")
    if not output_bbox or output_bbox[0] < 8 or output_bbox[1] < 8 or output_bbox[2] > 1016 or output_bbox[3] > 1016:
        fail("TRANSPARENT_BORDER_OR_CROP_QC_FAILED")
    coverage = ((output_bbox[2] - output_bbox[0]) * (output_bbox[3] - output_bbox[1])) / (canvas_size * canvas_size)
    if coverage < 0.14:
        fail("FINAL_SUBJECT_SCALE_TOO_SMALL")
    target_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target_path, format="PNG", optimize=True)
    with Image.open(target_path) as check:
        check.load()
        if check.format != "PNG" or check.mode != "RGBA" or check.size != (1024, 1024):
            fail("FINAL_PNG_FORMAT_QC_FAILED")

    print(json.dumps({
        "status": "PASS", "sourceDimensions": {"width": source_size[0], "height": source_size[1]},
        "mode": "RGBA", "dimensions": "1024x1024", "alphaExtrema": list(alpha_extrema),
        "transparentPixels": canvas_size * canvas_size - visible, "opaquePixels": solid,
        "boundingBox": list(output_bbox), "subjectBoundsCoverage": round(coverage, 4),
        "subjectScaleQc": "PASS", "backgroundRemoval": "local U2Net human-segmentation mask with soft-alpha edge preservation"
    }))


if __name__ == "__main__":
    main()
