/**
 * Strict pedagogical concept matching. Similar words are NOT interchangeable.
 * In particular pen != pencil, book != notebook and hand != hands.
 */
export const normalizePedagogicalConcept = value =>
  String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');

export function isExactPedagogicalConcept(candidate, expected) {
  const a = normalizePedagogicalConcept(candidate);
  const b = normalizePedagogicalConcept(expected);
  return Boolean(a && b && a === b);
}
