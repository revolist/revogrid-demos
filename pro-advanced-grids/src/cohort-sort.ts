export type CohortSortKey = 'label' | 'answers' | 'verified' | 'booked' | 'arrived' | 'started' | 'hold';
export interface CohortSortable {
  label: string;
  answers: number;
  verified: number;
  booked: number;
  arrived: number;
  started: number;
  hold: number;
}

/** Outcome columns compare rates, so groups and signals use the same scale. */
export function compareCohorts(a: CohortSortable, b: CohortSortable, key: CohortSortKey, direction: 1 | -1) {
  if (key === 'label') return direction * a.label.localeCompare(b.label);
  if (key === 'answers') return direction * (a.answers - b.answers);
  const aRate = a.answers ? a[key] / a.answers : 0;
  const bRate = b.answers ? b[key] / b.answers : 0;
  return direction * (aRate - bRate);
}
