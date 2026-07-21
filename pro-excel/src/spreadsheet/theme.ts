/** Theme detection and document-observer lifecycle helpers. */
export function isSpreadsheetDarkTheme(doc = typeof document !== 'undefined' ? document : undefined): boolean {
  const root = doc?.documentElement;
  return root?.getAttribute('data-theme') === 'dark' || Boolean(root?.classList.contains('dark'));
}

export function getSpreadsheetGridTheme(isDark = isSpreadsheetDarkTheme()): HTMLRevoGridElement['theme'] {
  return isDark ? 'dark' : 'default';
}

/** Observes document theme markers and returns a disposer for the observer. */
export function observeSpreadsheetTheme(
  onChange: (isDark: boolean) => void,
  doc = typeof document !== 'undefined' ? document : undefined,
) {
  onChange(isSpreadsheetDarkTheme(doc));
  const root = doc?.documentElement;
  if (!root || typeof MutationObserver === 'undefined') {
    return () => {};
  }

  const observer = new MutationObserver(() => {
    onChange(isSpreadsheetDarkTheme(doc));
  });
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });

  return () => observer.disconnect();
}
