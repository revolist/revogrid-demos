import { mountConstructionFabricationWorkspace } from './workspace';

export function load(parentSelector: string): (() => void) | undefined {
  const parent = document.querySelector<HTMLElement>(parentSelector);
  if (!parent) return undefined;
  return mountConstructionFabricationWorkspace(parent);
}
