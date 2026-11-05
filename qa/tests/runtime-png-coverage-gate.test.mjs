import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyRuntimePngCoverage} from '../runtime-png-coverage-gate.mjs';

test('accepts an unrendered occurrence alias only when identical PNG bytes were visibly observed',()=>{
  const result=classifyRuntimePngCoverage(new Map([
    ['visible-option.png','hash-a'],['metadata-alias.png','hash-a'],['other-visible.png','hash-b']
  ]),new Set(['visible-option.png','other-visible.png']));
  assert.equal(result.pass,true);
  assert.deepEqual(result.missingRuntimePaths,['metadata-alias.png']);
  assert.deepEqual(result.transportOnlyAliases,[{path:'metadata-alias.png',sha256:'hash-a',
    visuallyObservedEquivalentPaths:['visible-option.png']}]);
  assert.equal(result.visuallyObservedUniquePngHashes.length,2);
});

test('fails closed when any unique PNG hash has no visible occurrence',()=>{
  const result=classifyRuntimePngCoverage(new Map([
    ['visible.png','hash-a'],['never-rendered.png','hash-b']
  ]),new Set(['visible.png']));
  assert.equal(result.pass,false);
  assert.deepEqual(result.missingVisualHashes,['hash-b']);
  assert.deepEqual(result.transportOnlyAliases,[]);
});
