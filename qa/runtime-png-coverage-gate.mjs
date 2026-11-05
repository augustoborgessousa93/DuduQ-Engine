/**
 * Separate transport identity from visual identity. Every runtime path must be
 * fetched and hash-checked by the browser. When occurrence-scoped registry
 * aliases intentionally serve identical PNG bytes, one visible occurrence
 * proves those pixels while the other aliases remain transport-only evidence.
 */
export function classifyRuntimePngCoverage(expectedPaths,observedPaths){
  const expected=expectedPaths instanceof Map?expectedPaths:new Map(expectedPaths||[]);
  const observed=new Set(observedPaths||[]),observedHashes=new Set();
  for(const path of observed){
    const sha256=expected.get(path);
    if(sha256)observedHashes.add(sha256);
  }
  const missingPaths=[...expected.keys()].filter(path=>!observed.has(path)).sort();
  const transportOnlyAliases=missingPaths.filter(path=>observedHashes.has(expected.get(path))).map(path=>({
    path,sha256:expected.get(path),visuallyObservedEquivalentPaths:[...observed]
      .filter(candidate=>expected.get(candidate)===expected.get(path)).sort()
  }));
  const missingVisualHashes=[...new Set(missingPaths.map(path=>expected.get(path)).filter(sha256=>!observedHashes.has(sha256)))].sort();
  return {expectedRuntimePaths:expected.size,expectedUniquePngHashes:new Set(expected.values()).size,
    observedRuntimePaths:[...observed].filter(path=>expected.has(path)).sort(),visuallyObservedUniquePngHashes:[...observedHashes].sort(),
    missingRuntimePaths:missingPaths,transportOnlyAliases,missingVisualHashes,
    pass:missingVisualHashes.length===0};
}
