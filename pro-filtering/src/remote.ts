import { mountRemoteFilteringRecipe } from './remote.shared';

export function load(parentSelector: string) {
  const parent = document.querySelector<HTMLElement>(parentSelector);
  return parent ? mountRemoteFilteringRecipe(parent) : () => undefined;
}
