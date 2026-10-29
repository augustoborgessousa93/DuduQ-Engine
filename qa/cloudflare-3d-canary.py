#!/usr/bin/env python3
"""DUDUQ canary: download ONE candidate from isolated Cloudflare QA and produce native-size transparent PNG.
No paid image API, no Windows executables, no game changes, no deployment.
"""
import hashlib, io, json, os, pathlib, sys, urllib.request
from PIL import Image
from rembg import remove, new_session

URL = "https://duduq-media-qa-staging.brasilculturalgames.workers.dev/assets/duduq-3d-eraser-v2-klein4b-20261029.jpg"
OUT = pathlib.Path("qa/media-inbox/cloudflare-eraser-20261029")
FILE = "images/CF-Y1M04-ERASER-V2.png"
def fail(reason): raise RuntimeError("DUDUQ_CANARY_REJECTED:" + reason)
req = urllib.request.Request(URL, headers={"User-Agent":"DUDUQ-Image-QA/1.0"})
with urllib.request.urlopen(req, timeout=45) as response:
    if response.status!=200 or not (response.headers.get("Content-Type","").lower().startswith("image/jpeg")):
        fail("JPEG_SOURCE_NOT_READY")
    raw=response.read(9*1024*1024)
    if len(raw)>8*1024*1024 or not raw.startswith(b"\xff\xd8\xff"): fail("INVALID_SOURCE_JPEG")
original=Image.open(io.BytesIO(raw))
if original.size!=(1920,1920): fail("NOT_NATIVE_1920_SQUARE")
try:
    png=remove(raw,session=new_session("u2netp"),alpha_matting=True)
except Exception as e:
    fail("BACKGROUND_REMOVAL_FAILED:"+str(e)[:160])
image=Image.open(io.BytesIO(png)).convert("RGBA")
if image.size != original.size: fail("UNEXPECTED_RESIZE")
a=image.getchannel("A")
lo,hi=a.getextrema()
if lo!=0 or hi<240: fail("NOT_REAL_ALPHA")
hist=a.histogram()
clear=sum(hist[:12])/(1920*1920)
opaque=sum(hist[245:])/(1920*1920)
if clear<0.08 or opaque<0.12: fail("CUTOUT_UNSAFE_OR_EMPTY")
bb=a.point(lambda x:255 if x>25 else 0).getbbox()
if not bb: fail("EMPTY_FOREGROUND")
w=(bb[2]-bb[0])/1920
h=(bb[3]-bb[1])/1920
if w<0.25 or h<0.25: fail("SUBJECT_TOO_SMALL")
if min(bb[0],bb[1],1920-bb[2],1920-bb[3])<12:
    fail("CROPPED_SUBJECT_OR_EDGE_BACKGROUND")
# Premium clarity gate: reject washed-out, low-contrast art that is illegible in small game cards.
import numpy as np
pixels=np.asarray(image,dtype=np.uint8)
rgb=pixels[:,:,:3].astype(np.float32)
mask=pixels[:,:,3]>=230
colors=rgb[mask]
if colors.shape[0]<10000: fail("INSUFFICIENT_SOLID_FOREGROUND")
luma=.2126*colors[:,0]+.7152*colors[:,1]+.0722*colors[:,2]
chroma=colors.max(axis=1)-colors.min(axis=1)
spread=float(np.percentile(luma,90)-np.percentile(luma,10))
colorful=float((chroma>70).mean())
if spread<82 and colorful<.48: fail("LOW_CONTRAST_AND_VIBRANCE:spread="+str(round(spread,1))+",vivid="+str(round(colorful,3)))

preview=OUT/"QA_IMAGE_PREVIEW.png"
preview.parent.mkdir(parents=True,exist_ok=True)
image.save(preview,format="PNG",optimize=True)
dest=OUT/FILE
dest.parent.mkdir(parents=True,exist_ok=True)
image.save(dest,format="PNG",optimize=True)
actual=dest.read_bytes()
sha=hashlib.sha256(actual).hexdigest()
if sha!='aa9e4f93e83c0769d97f781be2ceee8bb9cf11950e668130cb5e5aba3bb5a5c2': fail('REVIEWED_V2_ASSET_HASH_CHANGED')
manifest={"schemaVersion":"DUDUQ_CHATGPT_MEDIA_BINDINGS_V1",
 "created":"2026-10-29","productionSafe":False,
 "source":"Cloudflare Workers AI free-quota 3D canary; generated at native 1920px, alpha from rembg",
 "humanReview":"MODEL_SEMANTIC_PRECHECK_ONLY",
 "assets":[{"assetKey":"CF-Y1M04-ERASER-V2","file":FILE,"semanticTarget":"eraser",
 "pixelWidth":1920,"pixelHeight":1920,"rgbaAlpha":True,"sha256":sha,
 "bindings":[{"questionId":"Y1M04-Q015","mediaId":"IMG-Y1M04-Q015-ERASER"},
             {"questionId":"Y1M04-Q020","mediaId":"IMG-Y1M04-Q020-ERASER"}],
 "review":"MODEL_SEMANTIC_PRECHECK_PASSED","reviewEvidence":"qa/semantic-evidence/CF-Y1M04-ERASER-V2.json"}]}
(OUT/"batch-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
preview.unlink(missing_ok=True)
print(json.dumps({"result":"STAGED_ONLY","file":str(dest),"sha256":sha,
"native":image.size,"transparentFraction":round(clear,4),"opaqueFraction":round(opaque,4),
"bbox":bb,"contrastSpread":round(spread,2),"vividForegroundFraction":round(colorful,4),"bindings":2,"humanReview":"PENDING","cost":"No image API charge"},ensure_ascii=False))
