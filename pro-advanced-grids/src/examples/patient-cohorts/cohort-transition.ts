type SequentialOutcome = 'verified' | 'booked' | 'arrived' | 'started';

/** Return the preceding checkpoint for a sequential outcome; holds are independent. */
export function cohortTransition(outcome: string, counts: Record<string, number>) {
  const previous: Record<SequentialOutcome, [string, string]> = {
    verified: ['answers', 'answers'],
    booked: ['verified', 'verified'],
    arrived: ['booked', 'booked'],
    started: ['arrived', 'arrived'],
  };
  if (!(outcome in previous)) return null;
  const [key, label] = previous[outcome as SequentialOutcome];
  const denominator = Number(counts[key]) || 0;
  const count = Number(counts[outcome]) || 0;
  return { label, count, denominator, percent: denominator > 0 ? Math.round(count / denominator * 100) : null };
}
