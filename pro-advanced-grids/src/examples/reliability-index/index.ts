import { mountAdvancedGrid } from '../../demo-entry';

export function load(parentSelector: string) {
  const host = document.querySelector<HTMLElement>(parentSelector);
  return host ? mountAdvancedGrid(host, 'reliability-index') : undefined;
}
