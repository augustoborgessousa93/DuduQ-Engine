#!/usr/bin/env bash
set -Eeuo pipefail

# Phase 2 prebuilt candidate. This script downloads a public, immutable, verified GitHub
# release asset. It does not need a Cloudflare token or GitHub Actions secrets.
# Preview deployment first; production requires separate verified promotion.
TAG="duduq-phase2-orange-fruit-color-corrected-20261103"
NAME="duduq-phase2-orange-fruit-color-corrected.tar.gz"
SHA256="cf049f8c7a5f3d02696f7997b6dd1e31ec7b28942f6c77b96af656e72b5a1800"
URL="https://github.com/augustoborgessousa93/DuduQ-Engine/releases/download/${TAG}/${NAME}"
FILE="$(mktemp -t duduq-v28-XXXXXX.tar.gz)"
trap 'rm -f "$FILE"' EXIT
curl -fLSs --retry 3 --retry-delay 3 --connect-timeout 20 --max-time 360 "$URL" -o "$FILE"
echo "${SHA256}  ${FILE}" | sha256sum --check --status || { echo "PHASE2_RELEASE_TAR_SHA_CHANGED"; exit 1; }
mkdir -p dist-pages
tar -xzf "$FILE" -C dist-pages
test -s dist-pages/.duduq-pages-manifest
test -s dist-pages/content/english/media/media-registry.json
node --input-type=module <<'NODE'
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist-pages');
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=readFileSync(path.join(root,'.duduq-pages-manifest'),'utf8').trimEnd().split(/\r?\n/);
assert(manifest.length===2891,'PARTIAL_DUDUQ_DISTRIBUTION');
for(const item of manifest){
 const n=item.lastIndexOf(' '),rel=item.slice(0,n),expected=item.slice(n+1);
 assert(n>0&&/^[a-f0-9]{64}$/.test(expected),'INVALID_MANIFEST');
 const file=path.resolve(root,rel);
 assert(file.startsWith(root+path.sep),'UNSAFE_ASSET_PATH');
 assert.equal(sha(readFileSync(file)),expected,'DISTRIBUTION_ASSET_MODIFIED:'+rel);
}
let count=0;
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
 const p=path.join(root,'content','english','year-'+year,'module-'+String(module).padStart(2,'0'),'questions.json');
 const obj=JSON.parse(readFileSync(p,'utf8'));
 assert.equal(obj.items.length,20,'BAD_CURRICULUM_MODULE:'+year+'/'+module);
 count+=20;
}
assert.equal(count,600,'BAD_CURRICULUM_TOTAL');
const media=JSON.parse(readFileSync(path.join(root,'content/english/media/media-registry.json')));
const fruit=media.entries.find(e=>e.mediaId==='IMG-ASSETS-DUDUQ-ORANGE-FRUIT-PHASE2');
const color=media.entries.find(e=>e.mediaId==='IMG-Y1M03-Q001-ORANGE');
assert(fruit&&color&&fruit.urlOrPath!==color.urlOrPath,'ORANGE_CONTEXT_SPLIT_MISSING');
assert.equal(fruit.provenance?.sourcePath,'Imagens Ilustrativa/Orange Fruit -laranja fruta.png');
assert.equal(sha(readFileSync(path.join(root,fruit.urlOrPath))),fruit.sha256);
console.log(JSON.stringify({status:'PREBUILT_PHASE2_EXACT_SOURCE_READY',manifestEntries:manifest.length,questions:count,releaseApproved:false,productionDeployed:false}));
NODE
