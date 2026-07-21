import { defineCustomElements } from '@revolist/revogrid/loader';
import { getHRColumnsCount, getHRData, HR_OPTIONS } from './sys-data/hr.data';
import type { HRGenerationProgress } from './sys-data/hr.data.generator';
import { getBaseHRColumns, getExtraHRColumns, HR_COLOR_BY_AGE, withHRShortDate } from './sys-data/hr.columns';
import { createHRColorSelectColumnType, renderHrColorPill } from './hr-color-select';
import { getHRLoadingOverlayHtml } from './hr-loading';
import './hr.css';

defineCustomElements();

export async function load(parentSelector: string, options: { isDark?: boolean } = {}) {
  const { isDark } = options;
  const parent = document.querySelector(parentSelector);
  if (!parent) return;

  let currentSize = 100;
  let rows: any[] = [];
  let loading = false;
  let activeController: AbortController | undefined;
  let progress: HRGenerationProgress = { loaded: 0, total: currentSize };

  const container = document.createElement('div');
  container.className = 'hr-demo grow h-full flex flex-col';
  container.innerHTML = `
    <div class="hr-toolbar">
      <span class="text-sm font-medium">Data Source</span>
      <select class="hr-select" id="size-select">
        ${HR_OPTIONS.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
      </select>
      <div id="loading-indicator" class="text-sm opacity-50 animate-pulse ml-2" style="display: none;">Loading data...</div>
    </div>
    <div class="hr-grid-wrapper flex-1 min-h-0" id="grid-container"></div>
  `;
  parent.appendChild(container);

  const gridContainer = container.querySelector('#grid-container')!;
  const select = container.querySelector('#size-select') as HTMLSelectElement;
  const loadingIndicator = container.querySelector('#loading-indicator') as HTMLElement;
  let overlayElement: HTMLElement | undefined;

  const grid = document.createElement('revo-grid') as HTMLRevoGridElement;
  grid.className = 'hr-scale-grid grow h-full w-full';
  grid.style.height = '100%';
  grid.style.width = '100%';
  grid.theme = isDark ? 'darkMaterial' : 'compact';
  grid.hideAttribution = true;
  grid.canMoveColumns = true;
  grid.rowSize = 36;

  const { BasePlugin } = await import('@revolist/revogrid');
  grid.plugins = [
    class HRPlugin extends BasePlugin {
      constructor(r: any, p: any) {
        super(r, p);
        this.addEventListener('rowdragstart', (e: any) => {
          if (e.detail.model) {
            e.detail.text = e.detail.model['name'];
          }
        });
      }
    }
  ];
  gridContainer.appendChild(grid);

  // Column types
  const [DateCol, NumeralCol, SelectCol] = await Promise.all([
    import('@revolist/revogrid-column-date'),
    import('@revolist/revogrid-column-numeral'),
    import('@revolist/revogrid-column-select')
  ]);

  grid.columnTypes = {
    date: withHRShortDate(new DateCol.default()),
    number: new NumeralCol.default(),
    select: new SelectCol.default(),
    colorSelect: createHRColorSelectColumnType(SelectCol.default)
  };

  const updateColumns = () => {
    const dropdownSource = Array.from(new Set(rows.map(r => r.company))).filter(Boolean) as string[];
    const baseCols = getBaseHRColumns(dropdownSource);

    // Apply TS-style templates (h function)
    const nameCol = (baseCols[0] as any).children[1];
    nameCol.cellTemplate = (h: any, props: any) => h('span', { class: 'flex items-center' }, [
      h('span', { class: 'hr-avatar' }, [
        h('img', { src: props.model.avatar, alt: props.value, class: 'w-full h-full object-cover' })
      ]),
      props.value
    ]);

    const personalGroup = baseCols[1] as any;
    const ageCol = personalGroup.children[0];
    ageCol.cellTemplate = (h: any, props: any) => [
      h('i', {
        class: 'hr-circle',
        style: { borderColor: HR_COLOR_BY_AGE(props.value) }
      }),
      props.value
    ];

    const eyesCol = personalGroup.children[2];
    eyesCol.cellTemplate = (h: any, props: any) => renderHrColorPill(h, props.value);

    grid.columns = [...baseCols, ...getExtraHRColumns(getHRColumnsCount(currentSize))];
  };

  const loadRows = async (size: number) => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    loading = true;
    progress = { loaded: 0, total: size };
    loadingIndicator.style.display = 'inline-block';
    select.disabled = true;
    renderLoadingOverlay();
    try {
      rows = await getHRData(size, getHRColumnsCount(size), {
        signal: controller.signal,
        onProgress: nextProgress => {
          progress = nextProgress;
          renderLoadingOverlay();
        },
      });
      grid.source = rows;
      updateColumns();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
    } finally {
      if (activeController === controller) {
        loading = false;
        activeController = undefined;
        loadingIndicator.style.display = 'none';
        select.disabled = false;
        renderLoadingOverlay();
      }
    }
  };

  const renderLoadingOverlay = () => {
    if (!loading) {
      overlayElement?.remove();
      overlayElement = undefined;
      return;
    }

    if (!overlayElement) {
      overlayElement = document.createElement('div');
      gridContainer.appendChild(overlayElement);
    }
    overlayElement.outerHTML = getHRLoadingOverlayHtml(progress);
    overlayElement = gridContainer.querySelector('.hr-loading-overlay') as HTMLElement | undefined;
  };

  select.addEventListener('change', (e) => {
    currentSize = parseInt((e.target as HTMLSelectElement).value, 10);
    loadRows(currentSize);
  });

  // Initial load
  loadRows(currentSize);

  return () => {
    activeController?.abort();
    container.remove();
  };
}
