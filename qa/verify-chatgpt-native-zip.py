#!/usr/bin/env python3
"""Validate and safely unpack the original ChatGPT 10-PNG batch. No external APIs or deploy."""
import hashlib, io, json, pathlib, shutil, sys, zipfile
from PIL import Image
if len(sys.argv)!=3: raise SystemExit('USAGE: verify-chatgpt-native-zip.py archive.zip output-dir')
source=pathlib.Path(sys.argv[1]).resolve(); out=pathlib.Path(sys.argv[2]).resolve()
if not source.is_file() or source.stat().st_size>25000000: raise SystemExit('ARCHIVE_MISSING_OR_TOO_LARGE')
out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(source) as z:
    infos=[i for i in z.infolist() if not i.is_dir()]
    if len(infos)>20 or sum(i.file_size for i in infos)>40000000:
        raise SystemExit('ARCHIVE_CONTENTS_UNSAFE')
    for entry in infos:
        p=pathlib.PurePosixPath(entry.filename)
        if p.is_absolute() or not p.parts or any(part in ('..','.') for part in p.parts) or '\\' in entry.filename:
            raise SystemExit('ZIP_PATH_UNSAFE:'+entry.filename)
        if (entry.external_attr >> 16)&0o170000==0o120000:
            raise SystemExit('ZIP_SYMLINK_REFUSED')
        dest=(out/p).resolve()
        if not dest.is_relative_to(out): raise SystemExit('ZIP_PATH_ESCAPE')
        dest.parent.mkdir(parents=True,exist_ok=True)
        with z.open(entry) as f, dest.open('wb') as g: shutil.copyfileobj(f,g)
manifest=json.loads((out/'batch-manifest.json').read_text('utf8'))
if manifest.get('schemaVersion')!='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1':
    raise SystemExit('WRONG_MANIFEST_SCHEMA')
assets=manifest.get('assets',[])
if len(assets)!=10 or sum(len(a.get('bindings',[])) for a in assets)!=12:
    raise SystemExit('EXPECTED_TEN_IMAGES_TWELVE_EXACT_BINDINGS')
if manifest.get('source')!='Native ChatGPT image generation (not Cloudflare)':
    raise SystemExit('SOURCE_NOT_NATIVE_CHATGPT')
seen=set(); bound=set(); stats={'verifiedFiles':0,'boundAssets':0,'bindings':0,'unmappedAssets':0}
for a in assets:
    name=a.get('file')
    if not isinstance(name,str) or not name.startswith('images/') or '/' in name[len('images/'):]:
        raise SystemExit('INVALID_ASSET_FILENAME')
    if name in seen: raise SystemExit('DUPLICATE_FILE')
    seen.add(name)
    p=out/name
    raw=p.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=a.get('sha256'):
        raise SystemExit('IMAGE_HASH_MISMATCH:'+name)
    if not raw.startswith(b'\x89PNG\r\n\x1a\n'): raise SystemExit('NOT_PNG:'+name)
    im=Image.open(io.BytesIO(raw))
    im.load()
    if im.mode!='RGBA' or im.size!=(1254,1254):
        raise SystemExit('NOT_NATIVE_RGBA_1254:'+name)
    if (a.get('nativeWidth'),a.get('nativeHeight'))!=im.size or a.get('rgba') is not True or a.get('transparent') is not True:
        raise SystemExit('MANIFEST_IMAGE_METADATA_MISMATCH:'+name)
    alpha=im.getchannel('A')
    if alpha.getextrema()!=(0,255): raise SystemExit('NO_REAL_ALPHA:'+name)
    # The source manifest records the visible alpha footprint above level 32.
    recorded_bounds=a.get('alphaBounds')
    visible_bounds=alpha.point(lambda value: 255 if value>32 else 0).getbbox()
    if not isinstance(recorded_bounds,list) or len(recorded_bounds)!=4 or list(visible_bounds or ())!=recorded_bounds:
        raise SystemExit('ALPHA_BOUNDS_MANIFEST_MISMATCH:'+name)
    if a.get('bindings'):
        stats['boundAssets']+=1
        for b in a['bindings']:
            if b['mediaId'] in bound: raise SystemExit('DUPLICATE_BINDING')
            bound.add(b['mediaId']); stats['bindings']+=1
        if a.get('review')!='MODEL_SEMANTIC_PRECHECK_PASSED':
            raise SystemExit('MISSING_PRECHECK_FOR_MAPPED_ASSET')
    else: stats['unmappedAssets']+=1
    stats['verifiedFiles']+=1
if stats!={'verifiedFiles':10,'boundAssets':7,'bindings':12,'unmappedAssets':3}:
    raise SystemExit('UNEXPECTED_BATCH_COUNTS')
print(json.dumps({'status':'CHATGPT_NATIVE_BATCH_PNG_PREFLIGHT_PASS',**stats},ensure_ascii=False))
