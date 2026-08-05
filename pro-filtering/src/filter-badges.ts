import type { ColumnProp, FilterData, MultiFilterItem } from '@revolist/revogrid';

export type FilterBadgeRenderValue =
  | Node
  | string
  | number
  | null
  | undefined
  | readonly FilterBadgeRenderValue[];

export interface FilterBadgeFormatContext {
  prop: ColumnProp;
  filter: FilterData;
  index: number;
}

export interface FilterBadgeItem extends FilterBadgeFormatContext {
  key: string;
  label: string;
  remove: () => Promise<void>;
}

export interface GridFilterBadgesOptions {
  grid: HTMLRevoGridElement;
  root: HTMLElement;
  className?: string;
  badgeClassName?: string;
  emptyClassName?: string;
  emptyLabel?: string;
  formatLabel?: (context: FilterBadgeFormatContext) => string;
  renderBadge?: (item: FilterBadgeItem) => FilterBadgeRenderValue;
  render?: (items: readonly FilterBadgeItem[]) => FilterBadgeRenderValue;
}

export interface GridFilterBadgesController {
  destroy(): void;
  refresh(items?: MultiFilterItem): void;
}

function cloneFilterItems(items: MultiFilterItem = {}): MultiFilterItem {
  return Object.fromEntries(Object.entries(items).map(([prop, filters]) => [
    prop,
    filters.map(filter => ({
      ...filter,
      value: filter.value instanceof Set ? new Set(filter.value) : filter.value,
    })),
  ]));
}

function classTokens(...values: Array<string | undefined>) {
  return values.flatMap(value => value?.split(/\s+/).filter(Boolean) ?? []);
}

function appendValue(parent: Node, value: FilterBadgeRenderValue) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach(item => appendValue(parent, item));
    return;
  }
  if (value instanceof Node) {
    parent.appendChild(value);
    return;
  }
  parent.appendChild(document.createTextNode(String(value)));
}

function filterItemsFromGrid(grid: HTMLRevoGridElement): MultiFilterItem {
  return typeof grid.filter === 'object' && grid.filter?.multiFilterItems
    ? cloneFilterItems(grid.filter.multiFilterItems)
    : {};
}

/**
 * Standalone gallery adapter for the public badge API introduced in the Pro
 * source. It keeps this demo compatible with the current trial package while
 * preserving direct grid properties and DOM-safe custom rendering.
 */
export async function mountGridFilterBadges({
  grid,
  root,
  className,
  badgeClassName,
  emptyClassName,
  emptyLabel = 'No active filters',
  formatLabel = ({ prop, filter }) => `${String(prop)}: ${String(filter.type)}`,
  renderBadge,
  render,
}: GridFilterBadgesOptions): Promise<GridFilterBadgesController> {
  await grid.componentOnReady?.();

  let activeItems = filterItemsFromGrid(grid);
  let destroyed = false;
  const addedClasses = classTokens('rv-filter-badges', className)
    .filter(token => !root.classList.contains(token));
  addedClasses.forEach(token => root.classList.add(token));
  const initialRole = root.getAttribute('role');
  const initialAriaLabel = root.getAttribute('aria-label');
  const initialAriaLive = root.getAttribute('aria-live');
  let managedRole: string | undefined;
  root.setAttribute('aria-label', 'Active filters');
  root.setAttribute('aria-live', 'polite');

  const setManagedRole = (role: string) => {
    root.setAttribute('role', role);
    managedRole = role;
  };
  const releaseManagedRole = () => {
    if (managedRole !== undefined && root.getAttribute('role') === managedRole) {
      restoreAttribute(root, 'role', initialRole);
    }
    managedRole = undefined;
  };

  const apply = async (items: MultiFilterItem) => {
    const current = typeof grid.filter === 'object' ? grid.filter : {};
    grid.filter = { ...current, multiFilterItems: cloneFilterItems(items) };
  };

  const controller: GridFilterBadgesController = {
    refresh(items = filterItemsFromGrid(grid)) {
      if (destroyed) return;
      activeItems = cloneFilterItems(items);
      const badgeItems: FilterBadgeItem[] = Object.entries(activeItems).flatMap(([prop, filters]) => (
        filters.map((filter, index) => {
          const context = { prop, filter, index };
          return {
            ...context,
            key: `${prop}-${filter.id}-${index}`,
            label: formatLabel(context),
            remove: async () => {
              const next = cloneFilterItems(activeItems);
              const currentFilters = next[prop] ?? [];
              const exactIndex = currentFilters[index]?.id === filter.id
                ? index
                : currentFilters.findIndex(candidate => candidate.id === filter.id);
              if (exactIndex < 0) return;
              currentFilters.splice(exactIndex, 1);
              if (!currentFilters.length) delete next[prop];
              await apply(next);
            },
          };
        })
      ));

      root.replaceChildren();
      if (render) {
        releaseManagedRole();
        appendValue(root, render(badgeItems));
        return;
      }
      if (!badgeItems.length) {
        setManagedRole('status');
        const empty = document.createElement('span');
        classTokens('rv-filter-badges-empty', emptyClassName)
          .forEach(token => empty.classList.add(token));
        empty.textContent = emptyLabel;
        root.append(empty);
        return;
      }

      setManagedRole('list');
      badgeItems.forEach(item => {
        const badge = document.createElement('span');
        classTokens('rv-btn-pill rv-filter-badge', badgeClassName)
          .forEach(token => badge.classList.add(token));
        badge.setAttribute('role', 'listitem');
        appendValue(badge, renderBadge?.(item) ?? item.label);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'rv-chip-remove';
        remove.setAttribute('aria-label', `Remove ${item.label} filter`);
        remove.textContent = '×';
        remove.addEventListener('click', () => void item.remove());
        badge.append(remove);
        root.append(badge);
      });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      grid.removeEventListener('beforefilterapply', syncFromEvent);
      grid.removeEventListener('afterfilterapply', syncFromEvent);
      root.replaceChildren();
      addedClasses.forEach(token => root.classList.remove(token));
      if (managedRole !== undefined && root.getAttribute('role') === managedRole) {
        restoreAttribute(root, 'role', initialRole);
      }
      if (root.getAttribute('aria-label') === 'Active filters') {
        restoreAttribute(root, 'aria-label', initialAriaLabel);
      }
      if (root.getAttribute('aria-live') === 'polite') {
        restoreAttribute(root, 'aria-live', initialAriaLive);
      }
    },
  };

  const syncFromEvent = (event: Event) => {
    const detail = (event as CustomEvent<{
      filterItems?: MultiFilterItem;
      multiFilterItems?: MultiFilterItem;
    }>).detail;
    const items = detail?.filterItems ?? detail?.multiFilterItems;
    queueMicrotask(() => controller.refresh(items ?? filterItemsFromGrid(grid)));
  };
  grid.addEventListener('beforefilterapply', syncFromEvent);
  grid.addEventListener('afterfilterapply', syncFromEvent);
  controller.refresh(activeItems);
  return controller;
}

function restoreAttribute(element: Element, name: string, value: string | null) {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}
