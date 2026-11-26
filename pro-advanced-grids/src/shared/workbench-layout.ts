import { createButtonElement, type createSearchActionBar } from '@revolist/ui/native';
import { PopoverController } from '@revolist/ui/core/popover-controller';
import { CONFIGURATOR_AREA_ICONS } from '@revolist/ui/configurator-actions';
export const layouts: Record<
  string,
  {
    row: number;
    header: number;
    search: string;
    checks?: boolean;
    inline?: boolean;
    merges?: boolean;
    page?: boolean;
  }
> = {
  'reliability-index': { row: 52, header: 32, search: 'Search SLOs' },
  'supplier-quality': { row: 56, header: 48, search: 'Search suppliers', merges: true },
  'job-schedule': { row: 50, header: 41, search: 'Client, street or crew…', checks: true, page: true },
  'patient-cohorts': { row: 56, header: 32, search: 'Search signals' },
  'campaign-performance': {
    row: 51,
    header: 32,
    search: 'Search campaign, ID, market…',
    checks: true,
    page: true,
  },
  'product-kpis': {
    row: 51,
    header: 32,
    search: 'Search products',
    checks: true,
    page: true,
  },
  'service-visits': {
    row: 51,
    header: 52,
    search: 'Kitchen, manager or crew…',
    checks: true,
    page: true,
  },
  'scale-up-index': {
    row: 44,
    header: 32,
    search: 'Search companies',
    inline: true,
    merges: true,
  },
  'sales-to-target': {
    row: 36,
    header: 40,
    search: 'Search stores',
    inline: true,
    merges: true,
  },
  'brand-scorecard': {
    row: 28,
    header: 56,
    search: 'Search brands',
    inline: true,
    merges: true,
  },
  'project-budget': {
    row: 41,
    header: 32,
    search: 'Line, vendor or person…',
    checks: true,
  },
};

function glyph(button: HTMLButtonElement, icon: string, iconOnly: boolean) {
  button.dataset.icon = icon;
  if (iconOnly) {
    button.classList.add('workbench-icon');
    button.setAttribute('aria-label', button.textContent ?? '');
  }
}

export function arrangeToolbar({
  id,
  section,
  heading,
  toolbar,
  searchBar,
  columns,
  download,
  controls,
  onDispose,
  closeColumns,
}: {
  id: string;
  section: HTMLElement;
  heading: HTMLElement;
  toolbar: HTMLElement;
  searchBar: ReturnType<typeof createSearchActionBar>;
  columns: HTMLButtonElement;
  download: HTMLButtonElement;
  controls: Element[];
  onDispose: (callback: () => void) => void;
  closeColumns: () => Promise<void>;
}) {
  columns.dataset.icon = 'columns';
  columns.style.setProperty('--glyph', `url("data:image/svg+xml,${encodeURIComponent(CONFIGURATOR_AREA_ICONS.columns)}")`);
  const headerActions = heading.querySelector('.primary');
  const layout = layouts[id];
  const document = section.ownerDocument;
  const search = searchBar.element;
  const cluster = search;
  const spacer = document.createElement('span');
  spacer.className = 'workbench-toolbar-spacer';
  glyph(
    columns,
    'columns',
    layout.inline || id === 'product-kpis' || id === 'service-visits',
  );
  glyph(download, 'download', !!layout.inline);
  if (id === 'reliability-index') {
    toolbar.replaceChildren(search, spacer, ...controls);
    return;
  }
  if (id === 'supplier-quality') {
    glyph(columns, 'columns', true);
    glyph(download, 'download', true);
    searchBar.setActions([columns, download, ...controls.slice(0, 1)]);
    heading.append(cluster, ...controls.slice(1));
    if (headerActions instanceof HTMLButtonElement) { headerActions.dataset.icon = 'plus'; heading.append(headerActions); }
    toolbar.hidden = true;
    return;
  }
  if (layout.inline) {
    const trigger = createButtonElement(document, { label: 'Filter', text: '', className: 'rv-btn workbench-icon' });
    trigger.title = 'Filter';
    trigger.dataset.icon = 'filter';
    const panel = document.createElement('div');
    panel.className = 'workbench-filter-panel';
    panel.hidden = true;
    section.append(panel);
    const popover = new PopoverController();
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', async () => {
      if (popover.isOpen) { popover.close(false); return; }
      await closeColumns();
      if (!trigger.isConnected) return;
      trigger.setAttribute('aria-expanded', 'true');
      popover.open({ anchor: trigger, content: panel, appendTo: section, display: 'grid', onClose: () => trigger.setAttribute('aria-expanded', 'false') });
    });
    const closeFilter = () => popover.close(false);
    columns.addEventListener('click', closeFilter);
    onDispose(() => { columns.removeEventListener('click', closeFilter); popover.destroy(); panel.remove(); });
    for (const control of controls) {
      if ((control as HTMLElement).dataset.toolbar === 'main')
        toolbar.append(control);
      else panel.append(control);
    }
    searchBar.setActions([trigger, columns, download]);
    heading.insertBefore(cluster, heading.children[1] ?? null);
    if (headerActions instanceof HTMLButtonElement)
      headerActions.dataset.icon = 'plus';
    toolbar.hidden = !toolbar.children.length;
    return;
  }
  if (headerActions instanceof HTMLButtonElement)
    headerActions.dataset.icon = 'plus';
  if (id === 'patient-cohorts') {
    download.textContent = 'Export';
    glyph(download, 'download', false);
    heading.append(download);
    toolbar.replaceChildren(
      controls[0],
      controls[1],
      search,
      spacer,
      ...controls.slice(2),
    );
  } else if (id === 'campaign-performance') {
    download.textContent = 'Export';
    glyph(download, 'download', false);
    heading.insertBefore(download, headerActions);
    glyph(controls[0] as HTMLButtonElement, 'filter', true);
    searchBar.setActions([controls[0]]);
    toolbar.replaceChildren(search, spacer, ...controls.slice(1));
  } else if (id === 'product-kpis') {
    glyph(controls[0] as HTMLButtonElement, 'filter', true);
    searchBar.setActions([controls[0]]);
    toolbar.replaceChildren(
      search,
      spacer,
      controls[1],
      columns,
      ...controls.slice(2),
    );
  } else if (id === 'job-schedule') {
    columns.classList.add('workbench-icon');
    columns.setAttribute('aria-label', 'Columns');
    searchBar.setActions([columns]);
    toolbar.replaceChildren(...controls, spacer, search);
  } else if (id === 'service-visits') {
    if (headerActions instanceof HTMLButtonElement) headerActions.dataset.icon = 'calendar-add';
    glyph(download, 'download', true);
    searchBar.setActions(controls.slice(0, 2));
    toolbar.replaceChildren(
      search,
      spacer,
      ...controls.slice(2),
      columns,
      download,
    );
  } else if (id === 'project-budget') {
    glyph(columns, 'columns', true);
    glyph(download, 'download', true);
    searchBar.setActions([...controls.slice(2, 4), columns, download]);
    toolbar.replaceChildren(...controls.slice(0, 2), spacer, search, ...controls.slice(4));
  } else {
    glyph(download, 'download', true);
    searchBar.setActions([columns, download]);
    toolbar.replaceChildren(...controls, spacer, search);
  }
}
