import { defineCustomElements } from '@revolist/revogrid/loader';
import { examples } from './screens';
import '../../composables/clickup-theme.css';

/** Mount one example without the standalone gallery navigation. */
export function mountAdvancedGrid(host: HTMLElement, id: string) {
  const example = examples.find((entry) => entry.id === id);
  if (!example) throw new Error(`Unknown advanced grid example: ${id}`);
  void defineCustomElements();
  return example.mount(host);
}
