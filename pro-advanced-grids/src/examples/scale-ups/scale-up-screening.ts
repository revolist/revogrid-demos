/** Keep unanswered screening results distinct from negative answers. */
export function summarizeScreening(values: readonly string[]) {
  return values.reduce(
    (counts, value) => {
      if (value === 'Yes') counts.yes++;
      else if (value === 'No') counts.no++;
      else if (value === 'N/A') counts.missing++;
      return counts;
    },
    { yes: 0, no: 0, missing: 0 },
  );
}
