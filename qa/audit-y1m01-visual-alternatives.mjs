#!/usr/bin/env node
import {readFileSync} from 'node:fs';
const base='qa/fast-bilingual-immutable-candidate/';
const qs=JSON.parse(readFileSync(base+'content/english/year-1/module-01/questions.json')).items;
for(const q of qs){
 const options=(q.options||[]).map(o=>({id:o.optionId,media:o.mediaId,label:o.label,correct:o.correct}));
 console.log('Y1M01_ALTERNATIVES='+JSON.stringify({id:q.item_id,correct:q.answerKey,mechanic:q.mechanicId,options}));
}
