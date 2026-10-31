#!/usr/bin/env node
/** Run the shared native pointer/touch browser gate against Y1M06. */
process.env.DUDUQ_BROWSER_QA_MODULE='Y1M06';
await import('./y1m05-official-media-browser-qa.mjs?module=Y1M06');
