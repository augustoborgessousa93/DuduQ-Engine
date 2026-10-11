import { createHash } from 'node:crypto';

export function contentHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

const identityKeys = ['item_id', 'optionId', 'mediaId', 'audioId', 'pairId', 'targetId', 'role', 'id'];
function identityOf(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  for (const key of identityKeys) if (typeof value[key] === 'string' && value[key]) return `${key}:${value[key]}`;
  return null;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function mergeValue(base, local, current, path, conflicts) {
  if (same(local, base)) return structuredClone(current);
  if (same(current, base) || same(local, current)) return structuredClone(local);

  if (base && local && current && !Array.isArray(base) && !Array.isArray(local) && !Array.isArray(current)
      && typeof base === 'object' && typeof local === 'object' && typeof current === 'object') {
    const result = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(current)]);
    for (const key of keys) {
      const b = Object.hasOwn(base, key) ? base[key] : undefined;
      const l = Object.hasOwn(local, key) ? local[key] : undefined;
      const c = Object.hasOwn(current, key) ? current[key] : undefined;
      const value = mergeValue(b, l, c, `${path}/${key}`, conflicts);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }

  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(current)) {
    const ids = [base, local, current].map(rows => rows.map(identityOf));
    if (ids.every(group => group.every(Boolean) && new Set(group).size === group.length)) {
      const bm = new Map(base.map(x => [identityOf(x), x]));
      const lm = new Map(local.map(x => [identityOf(x), x]));
      const cm = new Map(current.map(x => [identityOf(x), x]));
      const bOrder = base.map(identityOf), lOrder = local.map(identityOf), cOrder = current.map(identityOf);
      const localOrderChanged = !same(lOrder, bOrder), currentOrderChanged = !same(cOrder, bOrder);
      if (localOrderChanged && currentOrderChanged && !same(lOrder, cOrder)) {
        conflicts.push({ path: `${path}/$order`, base: bOrder, local: lOrder, current: cOrder });
        return structuredClone(current);
      }
      const order = localOrderChanged ? lOrder : cOrder;
      const merged = [];
      for (const id of new Set([...order, ...lOrder, ...cOrder, ...bOrder])) {
        const value = mergeValue(bm.get(id), lm.get(id), cm.get(id), `${path}/${id}`, conflicts);
        if (value !== undefined) merged.push(value);
      }
      return merged;
    }
  }

  conflicts.push({ path, base: structuredClone(base), local: structuredClone(local), current: structuredClone(current) });
  return structuredClone(current);
}

export function threeWayMerge(base, local, current) {
  const conflicts = [];
  const merged = mergeValue(base, local, current, '', conflicts);
  return { merged, conflicts };
}
