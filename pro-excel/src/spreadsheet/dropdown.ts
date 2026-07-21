/** Pure dropdown-source normalization helpers. */
export type SpreadsheetDropdownOption = {
  value: unknown;
  label: string;
  [key: string]: unknown;
};

export type SpreadsheetDropdown = {
  source: SpreadsheetDropdownOption[];
  [key: string]: unknown;
};

/**
 * Deduplicates named-range options and appends missing fallback values.
 * The first option object for a value is retained so renderer metadata survives.
 */
export function mergeDropdownOptions(dropdown: SpreadsheetDropdown, values: string[]): SpreadsheetDropdown {
  const seen = new Set<string>();
  const source = dropdown.source.filter(option => {
    const key = String(option.value);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  values.forEach(value => {
    const key = String(value);
    if (!seen.has(key)) {
      seen.add(key);
      source.push({ value, label: value });
    }
  });

  return {
    ...dropdown,
    source,
  };
}
