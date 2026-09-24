import { mountOperationsDemo } from './operations-demo';
export function load(parentSelector: string): () => void {
  const parent = document.querySelector<HTMLElement>(parentSelector);
  if (!parent) throw new Error(`Missing demo parent: ${parentSelector}`);
  const host = document.createElement('div'); parent.append(host);
  const cleanup = mountOperationsDemo(host);
  return () => { cleanup(); host.remove(); };
}
