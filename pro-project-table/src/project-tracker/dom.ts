export function findHeaderFilterControl(
  root: ParentNode | undefined | null,
  title?: string,
  prop?: string,
): HTMLButtonElement | HTMLInputElement | null {
  if (!root) return null;
  if ('querySelector' in root) {
    const controls = Array.from(root.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
      '.filter-header-selection-trigger, revogr-header .filter-input input:not([disabled])',
    ));
    const direct = prop
      ? controls.find((control) => control.dataset.filterHeaderProp === prop)
      : title
      ? controls.find((control) => control.title === title)
      : controls[0];
    if (direct) return direct;
    const elements = root.querySelectorAll<HTMLElement>('*');
    for (const element of Array.from(elements)) {
      const found = findHeaderFilterControl(element.shadowRoot, title, prop);
      if (found) return found;
    }
  }
  return null;
}

export function clearHeaderFilterInputValues(root: ParentNode | undefined | null) {
  if (!root || !('querySelectorAll' in root)) {
    return;
  }

  root.querySelectorAll<HTMLInputElement>('revogr-header .filter-input input').forEach((input) => {
    input.value = '';
  });
  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    clearHeaderFilterInputValues(element.shadowRoot);
  });
}
