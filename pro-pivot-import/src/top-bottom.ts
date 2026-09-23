import type { RawRow } from './import-data';

export interface TopBottomSelection {
  direction: 'top' | 'bottom';
  count: number;
  includeOther: boolean;
}

export interface RankedRows {
  rows: RawRow[];
  keptMembers: number;
  remainderMembers: number;
  otherLabel?: string;
}

/**
 * Rank the selected row field by sum of the selected numeric measure across all
 * column members. Equal scores retain first appearance order; exactly N
 * members are selected. The optional Other bucket preserves the source total.
 */
export function rankImportedRows(
  rows: RawRow[],
  rowField: string,
  measureField: string,
  selection: TopBottomSelection | null,
): RankedRows {
  if (!selection) return { rows, keptMembers: 0, remainderMembers: 0 };
  if (!Number.isSafeInteger(selection.count) || selection.count < 1) {
    throw new TypeError('Top/Bottom N must be a positive whole number.');
  }
  const groups = new Map<RawRow[string], { rows: RawRow[]; sum: number; first: number }>();
  rows.forEach((row, index) => {
    const member = row[rowField] ?? null;
    let group = groups.get(member);
    if (!group) { group = { rows: [], sum: 0, first: index }; groups.set(member, group); }
    group.rows.push(row);
    const amount = row[measureField];
    if (amount !== null && amount !== undefined) {
      if (typeof amount !== 'number' || !Number.isFinite(amount)) throw new TypeError('Top/Bottom N requires a numeric measure.');
      group.sum += amount;
    }
  });
  const ranked = [...groups.entries()].map(([member, group]) => ({ member, ...group }))
    .sort((left, right) =>
      (selection.direction === 'top' ? right.sum - left.sum : left.sum - right.sum)
      || left.first - right.first);
  const kept = ranked.slice(0, selection.count);
  const remainder = ranked.slice(selection.count);
  if (!remainder.length || !selection.includeOther) {
    return {
      rows: kept.flatMap(group => group.rows),
      keptMembers: kept.length,
      remainderMembers: remainder.length,
    };
  }
  let otherLabel = 'Other';
  for (let i = 2; groups.has(otherLabel); i++) otherLabel = `Other (ranked remainder ${i})`;
  return {
    rows: [
      ...kept.flatMap(group => group.rows),
      ...remainder.flatMap(group => group.rows.map(row => ({ ...row, [rowField]: otherLabel }))),
    ],
    keptMembers: kept.length,
    remainderMembers: remainder.length,
    otherLabel,
  };
}
