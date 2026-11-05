#!/usr/bin/env python3
"""Read-only Cloudflare Workers AI V3 eraser QA. No inference or production writes."""
import hashlib, io, json, pathlib, urllib.request
import numpy as np
from PIL import Image
from rembg import remove, new_session

SOURCE="https://duduq-media-qa-staging.brasilculturalgames.workers.dev/assets/duduq-3d-eraser-v3-klein4b-20261029.jpg"
EXPECTED_JPEG_SHA="b4c09926644ea26dbec8d999dab7a8f1116713e68e2e9f966325d662808bd64c"
OUT=pathlib.Path("qa/media-inbox/cloudflare-eraser-v3-20261029")
DEST=OUT/"images/CF-Y1M04-ERASER-V3.png"
REPORT=pathlib.Path("qa/results/cloudflare-eraser-v3-technical.json")
def fail(msg): raise RuntimeError("ERASER_V3_TECHNICAL_REJECTED:"+msg)
req=urllib.request.Request(SOURCE,headers={"User-Agent":"DUDUQ-V3-QA/1.0"})
with urllib.request.urlopen(req,timeout=50) as response:
    if response.status!=200 or not response.headers.get("Content-Type","").lower().startswith("image/jpeg"):fail("SOURCE_HTTP_OR_MIME")
    raw=response.read(8*1024*1024+1)
if len(raw)>8*1024*1024 or not raw.startswith(b"\xff\xd8\xff"):fail("NOT_JPEG_OR_OVERSIZED")
source_sha=hashlib.sha256(raw).hexdigest()
if source_sha!=EXPECTED_JPEG_SHA:fail("SOURCE_JPEG_SHA_MISMATCH:"+source_sha)
source=Image.open(io.BytesIO(raw))
if source.size!=(1920,1920):fail("SOURCE_NOT_NATIVE_1920")
try:
    png=remove(raw,session=new_session("u2netp"),alpha_matting=True)
except Exception as e:fail("REMBG_FAILED:"+str(e)[:200])
image=Image.open(io.BytesIO(png)).convert("RGBA")
if image.size!=(1920,1920):fail("REMBG_RESIZED")
alpha=np.asarray(image.getchannel("A"),dtype=np.uint8)
clear=float((alpha<12).mean())
opaque=float((alpha>=245).mean())
if clear<.08 or opaque<.12:fail("ALPHA_COVERAGE_INVALID")
box=image.getchannel("A").point(lambda x:255 if x>25 else 0).getbbox()
if not box:fail("EMPTY_SUBJECT")
if min(box[0],box[1],1920-box[2],1920-box[3])<12:fail("SUBJECT_CROPPED")
if (box[2]-box[0])<700 or (box[3]-box[1])<500:fail("SUBJECT_TOO_SMALL")
pixels=np.asarray(image,dtype=np.uint8)
colors=pixels[:,:,:3][alpha>=230].astype(np.float32)
if colors.shape[0]<10000:fail("NO_SOLID_FOREGROUND")
luma=.2126*colors[:,0]+.7152*colors[:,1]+.0722*colors[:,2]
chroma=colors.max(axis=1)-colors.min(axis=1)
spread=float(np.percentile(luma,90)-np.percentile(luma,10))
vivid=float((chroma>70).mean())
if spread<82 and vivid<.48:fail("LOW_CONTRAST_AND_VIBRANCE")
DEST.parent.mkdir(parents=True,exist_ok=True)
REPORT.parent.mkdir(parents=True,exist_ok=True)
image.save(DEST,format="PNG",optimize=True)
final=DEST.read_bytes()
png_sha=hashlib.sha256(final).hexdigest()
report={"schemaVersion":"DUDUQ_ERASER_V3_TECHNICAL_QA_V1",
 "sourceKey":"duduq-3d-eraser-v3-klein4b-20261029","sourceSha256":source_sha,
 "png":str(DEST),"pngSha256":png_sha,"nativePixels":[1920,1920],
 "rgba":True,"transparentFraction":round(clear,5),"opaqueFraction":round(opaque,5),
 "bbox":box,"contrastSpread":round(spread,2),"vividFraction":round(vivid,4),
 "technicalPassed":True,"semanticQa":"PENDING","pedagogicalQa":"PENDING",
 "integratedInGame":False,"productionPublished":False}
REPORT.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
print(json.dumps(report))
