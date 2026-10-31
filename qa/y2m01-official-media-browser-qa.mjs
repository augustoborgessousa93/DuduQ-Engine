#!/usr/bin/env node
/** Run the shared native mouse/touch browser gate against Y2M01. */
process.env.DUDUQ_BROWSER_QA_MODULE='Y2M01';
await import('./y1m05-official-media-browser-qa.mjs?module=Y2M01');
