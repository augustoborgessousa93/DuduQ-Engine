#!/usr/bin/env python3
"""Verify SHA-locked native ChatGPT HEAD PNG candidate ZIP, safely extract it."""
from pathlib import Path, PurePosixPath
import sys,zipfile,json,hashlib,io,shutil
from PIL import Image
EXPECTED_ZIP="8d08dce1881e10906f4604f6a6f24609f1980913eb6e1850a11947d27880090d"
EXPECTED_PNG="3c00647e61d7b7c8ee365454b1a349088254352988a0538e4cec348366db6401"
if len(sys.argv)!=3:raise SystemExit("USAGE: verify-native-head-zip.py zip output-dir")
src=Path(sys.argv[1]);dst=Path(sys.argv[2])
if not src.is_file() or src.stat().st_size>6*1024*1024:raise SystemExit("MISSING_OR_OVERSIZED_HEAD_ZIP")
if hashlib.sha256(src.read_bytes()).hexdigest()!=EXPECTED_ZIP:raise SystemExit("HEAD_ZIP_SHA256_MISMATCH")
dst.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(src) as z:
    entries=[x for x in z.infolist() if not x.is_dir()]
    if len(entries)!=4 or sum(x.file_size for x in entries)>5*1024*1024:raise SystemExit("HEAD_ZIP_CONTENTS_MISMATCH")
    for e in entries:
        name=PurePosixPath(e.filename)
        if name.is_absolute() or '..' in name.parts or '\\' in e.filename or (e.external_attr>>16)&0o170000==0o120000:raise SystemExit("UNSAFE_ZIP_ENTRY")
        target=(dst/name).resolve()
        if not target.is_relative_to(dst.resolve()):raise SystemExit("ZIP_ESCAPE")
        target.parent.mkdir(parents=True,exist_ok=True)
        with z.open(e) as i,target.open("wb") as o:shutil.copyfileobj(i,o)
m=json.loads((dst/"batch-manifest.json").read_text())
if m.get("schemaVersion")!="DUDUQ_CHATGPT_MEDIA_BINDINGS_V1" or len(m.get("assets",[]))!=1:raise SystemExit("HEAD_MANIFEST_MISMATCH")
asset=m["assets"][0]
if asset["semanticTarget"]!="head" or asset["sha256"]!=EXPECTED_PNG or asset.get("review")!="MODEL_SEMANTIC_PRECHECK_PASSED":raise SystemExit("HEAD_CONCEPT_OR_REVIEW_UNTRUSTED")
if len(asset.get("bindings",[]))!=7 or len({a["mediaId"] for a in asset["bindings"]})!=7:raise SystemExit("HEAD_EXPECTS_SEVEN_SAFE_IDS")
if any(not a["questionId"].startswith("Y1M05-") or a["mediaId"]=="IMG-Y1M05-Q001-HEAD" for a in asset["bindings"]):raise SystemExit("CROSS_MODULE_ID_NOT_ALLOWED")
raw=(dst/asset["file"]).read_bytes()
if hashlib.sha256(raw).hexdigest()!=EXPECTED_PNG:raise SystemExit("HEAD_PNG_CHANGED")
im=Image.open(io.BytesIO(raw));im.load()
if im.format!="PNG" or im.mode!="RGBA" or im.size!=(1254,1254) or im.getchannel("A").getextrema()!=(0,255):raise SystemExit("HEAD_PNG_ALPHA_OR_SIZE_INVALID")
print(json.dumps({"status":"NATIVE_HEAD_BATCH_PREFLIGHT_PASS","images":1,"safeBindings":7,"excludedCrossModule":1,"originalSize":[1254,1254],"humanQA":"PENDING"}))
