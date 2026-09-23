# Pivot your own data

Run `pnpm --dir pro-pivot-import dev`. Choose a CSV or flat JSON array, check inferred field types, optionally derive calendar groups or numeric bins, then create a Pivot. The file is processed in browser memory and never uploaded.

The Top/Bottom N setup ranks the chosen row field by the sum of the selected numeric measure across all column members. Exactly N members are kept; equal scores retain their first appearance order. The optional Other bucket is enabled by default and preserves the full source total. Turning it off excludes the remaining members and their values from the report total. This local preparation works with Pivot 2.9.5.

Dates use ISO `YYYY-MM-DD` or ISO timestamps and are grouped by their written calendar date. This standalone demo cannot import the monorepo's internal Pro dates module through the published package boundary. Invalid typed values become blanks and are counted beside the report. The report accepts up to 100,000 rows or a 20 MB file.
