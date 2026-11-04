#!/usr/bin/env bash
# Isolated staging certification, NEVER publish to official duduq-engine.
set -Eeuo pipefail
export CI=true
export EXPECTED_ARTIFACT_SHA256="46507A5A595ADB4AFB467D45AC0CEC1849E913E7F1C8722FE8B1CDA5CB3E0B69"
export DUDUQ_CANDIDATE_BUILD_HASH="$EXPECTED_ARTIFACT_SHA256"
export DUDUQ_QA_ORIGIN="http://127.0.0.1:8788"
mkdir -p /tmp/duduq-stage-qa qa/results artifacts/qa-visual-fix-46507 docs/qa
base64 --decode qa/input/duduq-visual-fix-46507-overlay.zip.b64 > /tmp/duduq-stage-qa/overlay.zip
echo "B65C6EF0300091DAC4EE1997AD0171D5DA845FBDE8504A993AB416F24FE882A9  /tmp/duduq-stage-qa/overlay.zip" | sha256sum --check
node --input-type=module <<'NODE_ZIP'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { inflateRawSync } from 'node:zlib';
const archive=readFileSync('/tmp/duduq-stage-qa/overlay.zip');
let end=-1;
for(let i=archive.length-22;i>=Math.max(0,archive.length-65557);i--){if(archive.readUInt32LE(i)===0x06054b50){end=i;break;}}
if(end<0)throw Error('ZIP_EOCD_MISSING');
let cursor=archive.readUInt32LE(end+16);
const count=archive.readUInt16LE(end+10);
for(let i=0;i<count;i++){
 if(archive.readUInt32LE(cursor)!==0x02014b50)throw Error('ZIP_CENTRAL_DIRECTORY_INVALID');
 const method=archive.readUInt16LE(cursor+10),size=archive.readUInt32LE(cursor+20);
 const nameLength=archive.readUInt16LE(cursor+28),extraLength=archive.readUInt16LE(cursor+30),commentLength=archive.readUInt16LE(cursor+32);
 const local=archive.readUInt32LE(cursor+42);
 const name=archive.subarray(cursor+46,cursor+46+nameLength).toString('utf8').replaceAll('\\','/');
 cursor+=46+nameLength+extraLength+commentLength;
 if(!name.startsWith('dist-pages/')||name.split('/').includes('..'))throw Error('ZIP_UNSAFE_PATH:'+name);
 if(name.endsWith('/')){mkdirSync(name,{recursive:true});continue;}
 if(archive.readUInt32LE(local)!==0x04034b50)throw Error('ZIP_LOCAL_HEADER_INVALID:'+name);
 const dataStart=local+30+archive.readUInt16LE(local+26)+archive.readUInt16LE(local+28);
 const compressed=archive.subarray(dataStart,dataStart+size);
 const bytes=method===8?inflateRawSync(compressed):method===0?compressed:null;
 if(!bytes)throw Error('ZIP_UNSUPPORTED_METHOD:'+method);
 mkdirSync(dirname(name),{recursive:true});writeFileSync(name,bytes);
 console.log('OVERLAY_EXTRACTED:'+name+' '+bytes.length+' bytes');
}
NODE_ZIP
node qa/prepare-visual-fix-candidate.mjs
node qa/verify-artifact.mjs
echo "695E973CC8F9F36FE09A42827334AB8C22887B58BD5F41CA1C51576ACB3866C1  functions/play/english/_middleware.js" | sha256sum --check
node qa/derive-visual-fix-46507-v2.mjs
export EXPECTED_ARTIFACT_SHA256="$(cat qa/results/derived-manifest-sha256.txt)"
export DUDUQ_CANDIDATE_BUILD_HASH="$EXPECTED_ARTIFACT_SHA256"
node qa/verify-artifact.mjs
echo "$(cat qa/results/derived-function-sha256.txt)  functions/play/english/_middleware.js" | sha256sum --check
if [[ "${DUDUQ_QA_STATIC_PREVIEW:-0}" == 1 ]]; then echo "DUDUQ_QA_STATIC_PREVIEW_INTEGRITY_PASS:$EXPECTED_ARTIFACT_SHA256"; exit 0; fi
npm install --no-audit --no-fund --no-save --no-package-lock
npx playwright install chromium
npx wrangler pages dev dist-pages --ip 127.0.0.1 --port 8788 --compatibility-date 2026-10-22 > qa/results/wrangler-pages.log 2>&1 &
WRANGLER_PID=$!
trap 'kill "$WRANGLER_PID" 2>/dev/null || true' EXIT
READY=0
for i in $(seq 1 75); do
  if curl -fsS "http://127.0.0.1:8788/" >/dev/null 2>&1; then READY=1; break; fi
  sleep 2
done
if [[ "$READY" != 1 ]]; then tail -n 80 qa/results/wrangler-pages.log; exit 1; fi
curl -fsS -D qa/results/fit-route.headers -o /dev/null "http://127.0.0.1:8788/play/english/year-1/module-03/?duduqModule=Y1M03&duduqItem=Y1M03-Q002&__duduq_fit=1"
grep -Eiq '^X-DUDUQ-Fit:[[:space:]]*1' qa/results/fit-route.headers
export DUDUQ_EVIDENCE_DIR="artifacts/qa-visual-fix-46507/grouping"
export DUDUQ_REPORT_PATH="docs/qa/DUDUQ_VISUAL_FIX_GROUPING_46507.json"
node qa/tests/grouping-visual-fix-46507.e2e.mjs
if [[ "${DUDUQ_QA_GROUPING_ONLY:-0}" == 1 ]]; then echo 'GROUPING_ONLY_DIAGNOSTIC=PASS'; exit 0; fi
node qa/tests/feedback-fullscreen-visual-fix-46507.e2e.mjs
export DUDUQ_BUBBLE_ACTIVITY="Y1M01-Q002"
export DUDUQ_BUBBLE_WIDTH=900 DUDUQ_BUBBLE_HEIGHT=600 DUDUQ_EVIDENCE_DIR="artifacts/qa-visual-fix-46507/bubble-900x600"
node qa/tests/responsive-bubble-pop-v6_8.e2e.mjs
export DUDUQ_BUBBLE_WIDTH=600 DUDUQ_BUBBLE_HEIGHT=600 DUDUQ_EVIDENCE_DIR="artifacts/qa-visual-fix-46507/bubble-600x600"
node qa/tests/responsive-bubble-pop-v6_8.e2e.mjs
node qa/tests/responsive-matching-curricular-v6_5.e2e.mjs
node qa/verify-artifact.mjs
echo "DUDUQ_CANDIDATE_46507_TECHNICAL_QA=PASS"
