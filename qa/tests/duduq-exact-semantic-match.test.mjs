import test from 'node:test';
import assert from 'node:assert/strict';
import { isExactPedagogicalConcept, normalizePedagogicalConcept } from '../../scripts/duduq-exact-semantic-match.mjs';

test('exact school vocabulary concepts match, ignoring case and whitespace only', () => {
  assert.equal(isExactPedagogicalConcept('PENCIL   CASE', 'pencil case'), true);
  assert.equal(isExactPedagogicalConcept(' eraser ', 'eraser'), true);
  assert.equal(normalizePedagogicalConcept('  BLUE  BOOK '), 'blue book');
});
test('reject misleading substring or related-object matches', () => {
  for (const [actual, expected] of [
    ['pencil', 'pen'], ['pencil case', 'pencil'], ['notebook', 'book'],
    ['backpack', 'pack'], ['hands', 'hand'], ['legs', 'leg'],
    ['pencil sharpener', 'sharpener'], ['crayons', 'crayon'],
    ['pencil case', 'case'], ['', 'eraser'], ['eraser', ''],
  ]) assert.equal(isExactPedagogicalConcept(actual, expected), false, actual+' vs '+expected);
});
