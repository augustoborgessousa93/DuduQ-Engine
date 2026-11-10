#!/usr/bin/env python3
"""Extract 59 existing PNGs and Chromium screenshots from a pinned QA artifact.
Only creates compact human visual-review sheets; never modifies the game.
"""
import io, json, math, os, sys, tarfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
assert len(sys.argv)==3, "USAGE: build-last60-visual-review.py DOWNLOADED_ARTIFACT_DIR OUTPUT"
source=Path(sys.argv[1]); out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
reports=list(source.rglob("last60-candidate-20261110.json"))
tars=list(source.rglob("duduq-last60-candidate.tar.gz"))
assert len(reports)==1 and len(tars)==1,(reports,tars)
report=json.loads(reports[0].read_text())
assert report["mediaIdsUpdated"]==60 and report["uniqueSourcePngs"]==59
imgs=sorted(report["images"],key=lambda x:(x["semantic"],x["filename"]))
assert len(imgs)==59
font_paths=["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf","/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"]
font=next((ImageFont.truetype(p,15) for p in font_paths if Path(p).exists()),ImageFont.load_default())
smallfont=next((ImageFont.truetype(p,11) for p in font_paths if Path(p).exists()),ImageFont.load_default())
w,h=335,345
report_items=[]
with tarfile.open(tars[0],mode="r:gz") as archive:
    members={m.name.lstrip("./"):m for m in archive.getmembers() if m.isfile()}
    for i,img in enumerate(imgs):
        rel=img["url"]
        assert rel in members,("PNG_NOT_ARCHIVED",rel)
        raw=archive.extractfile(members[rel]).read()
        from hashlib import sha256
        assert sha256(raw).hexdigest()==img["sha256"],("SOURCE_HASH_CHANGED",rel)
        picture=Image.open(io.BytesIO(raw))
        assert picture.mode in ("RGBA","P"),(img["filename"],picture.mode)
        picture=picture.convert("RGBA")
        thumb=picture.copy();thumb.thumbnail((296,255),Image.Resampling.LANCZOS)
        report_items.append((img,thumb))
for part in range(6):
    selection=report_items[part*10:part*10+10]
    cols=5 if len(selection)>5 else len(selection)
    rows=math.ceil(len(selection)/cols)
    canvas=Image.new("RGB",(cols*w,rows*h),(238,242,249))
    draw=ImageDraw.Draw(canvas)
    for j,(meta,pic) in enumerate(selection):
        x=(j%cols)*w;y=(j//cols)*h
        draw.rounded_rectangle((x+6,y+6,x+w-6,y+h-6),radius=14,fill=(255,255,255),outline=(211,219,233),width=2)
        tile=Image.new("RGBA",(303,259),(250,250,252,255))
        tile.alpha_composite(pic,((303-pic.width)//2,(259-pic.height)//2))
        canvas.paste(tile.convert("RGB"),(x+16,y+15))
        semantic=meta["semantic"][:33]
        name=meta["filename"][:37]
        draw.text((x+16,y+280),semantic,font=font,fill=(21,50,84))
        draw.text((x+16,y+305),name,font=smallfont,fill=(84,99,116))
        draw.text((x+16,y+325),f"{meta['width']}x{meta['height']} / alpha",font=smallfont,fill=(68,115,102))
    path=out/f"lote-visual-{part+1:02d}.png"
    canvas.save(path)
    print("VISUAL_SHEET",str(path),len(selection))
for path in source.rglob("*.png"):
    if "last60-browser-" in str(path):
        target=out/"browser"/path.name
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(path.read_bytes())
(out/"summary.json").write_text(json.dumps({
 "schema":"DUDUQ_VISUAL_REVIEW_EXTRACT_V1",
 "sourceRun":42924245868,
 "images":len(report_items),
 "sheets":6,
 "chromiumScreenshots":len(list((out/"browser").glob("*.png"))),
 "qaOnly":True,
 "productionDeployed":False
},indent=2)+"\n")
