import { mountImportDemo } from './import-demo';

export function load(parentSelector: string): () => void {
  const parent = document.querySelector<HTMLElement>(parentSelector);
  if (!parent) throw new Error(`Missing demo parent: ${parentSelector}`);
  const host = document.createElement('div');
  parent.append(host);
  const cleanup = mountImportDemo(host);
  return () => { cleanup(); host.remove(); };
}
