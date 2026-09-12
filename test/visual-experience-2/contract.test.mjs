import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('engine/visual-experience-2/target-pilot.js','utf8');
let registered, received, disposed=0;
const original={id:'target-shooter',version:'1.0.21',validate:()=>true,
  metadata:{routerProfile:{baseScore:68}},mount:args=>{received=args;return()=>disposed++;}};
const host={getMechanic:id=>id==='target-shooter'?original:null,registerMechanic:def=>registered=def};
vm.runInNewContext(source,{window:{DuduQ:host},document:{currentScript:{src:'https://example.test/engine/visual-experience-2/target-pilot.js'}},URL});
assert.equal(registered.id,original.id);
assert.equal(registered.version,original.version);
assert.equal(registered.validate,original.validate);
assert.deepEqual(registered.metadata.routerProfile,original.metadata.routerProfile);
let completed=0;
const payload=Object.freeze({questions:[Object.freeze({answer:'original',audio:'unchanged'})]});
const args={container:{querySelector:()=>null},payload,context:{stepIndex:0},onComplete:()=>completed++};
const destroy=registered.mount(args);
assert.equal(received,args,'Mount arguments must pass through by identity');
assert.equal(completed,0,'Visual installation cannot complete a question');
received.onComplete();assert.equal(completed,1);
destroy();assert.equal(disposed,1);
assert.equal(payload.questions[0].answer,'original');
console.log('PASS: adapter identity, validation, payload, callback and disposal contract');
