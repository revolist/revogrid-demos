// src/gantt.ts
import './gantt.scss';
import { defineCustomElements } from '@revolist/revogrid/loader';
defineCustomElements();

import { GanttPlugin } from '@revolist/revogrid-enterprise';
import { ExportExcelPlugin, RowStatusPlugin } from '@revolist/revogrid-pro';
import {
  STANDARD_CALENDAR,
  SHOWCASE_ASSIGNMENTS,
  SHOWCASE_BASELINES,
  SHOWCASE_COLUMNS_WITH_COMPLETION,
  SHOWCASE_DEFAULT_HIDDEN,
  SHOWCASE_DEPENDENCIES,
  SHOWCASE_GANTT_CONFIG,
  SHOWCASE_RESOURCES,
  SHOWCASE_TASKS,
  renderShowcaseTaskBarColor,
  renderShowcaseTaskBarContent,
} from './shared/gantt-project-data';
import { currentTheme } from '../../composables/useRandomData';

// ─── Entry point ──────────────────────────────────────────────────────────────

export function load(parentSelector: string): void {
  const parent = document.querySelector(parentSelector);
  if (!parent) return;
  const darkTheme = currentTheme().isDark();

  const container = document.createElement('div');
  container.className = `gantt-showcase-shell grow h-full ${darkTheme ? 'gantt-showcase-shell--dark' : 'gantt-showcase-shell--light'}`;
  parent.appendChild(container);

  const grid = document.createElement('revo-grid') as HTMLRevoGridElement;
  const controls = document.createElement('div');
  controls.className = 'gantt-showcase-controls';
  container.appendChild(controls);

  grid.theme          = darkTheme ? 'darkCompact' : 'compact';
  grid.readonly       = false;
  grid.range          = true;
  grid.resize         = true;
  grid.rowSize        = 42;
  grid.rowHeaders     = false;
  grid.hideAttribution = true;
  grid.autoSizeColumn = false;
  grid.classList.add('gantt-showcase-grid');
  grid.plugins        = [GanttPlugin, ExportExcelPlugin, RowStatusPlugin];
  grid.hideColumns    = [...SHOWCASE_DEFAULT_HIDDEN];
  grid.columns        = [...SHOWCASE_COLUMNS_WITH_COMPLETION];
  grid.source         = [...SHOWCASE_TASKS];
  grid.ganttDependencies = [...SHOWCASE_DEPENDENCIES];
  grid.ganttCalendars    = [{ ...STANDARD_CALENDAR }];
  grid.ganttResources    = [...SHOWCASE_RESOURCES];
  grid.ganttAssignments  = [...SHOWCASE_ASSIGNMENTS];
  grid.ganttBaselines    = [...SHOWCASE_BASELINES];
  let showCriticalPath = Boolean(SHOWCASE_GANTT_CONFIG.visuals.showCriticalPath);
  let showBaseline = false;

  function applyGanttConfig() {
    grid.gantt = {
      ...SHOWCASE_GANTT_CONFIG,
      visuals: {
        ...SHOWCASE_GANTT_CONFIG.visuals,
        showCriticalPath,
        showBaseline,
        taskBarColorHook: renderShowcaseTaskBarColor,
        taskBarContentHook: renderShowcaseTaskBarContent,
      },
    } as typeof grid.gantt;
  }

  function createToggle(label: string, checked: () => boolean, onChange: (value: boolean) => void) {
    const control = document.createElement('label');
    control.className = 'gantt-showcase-control';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'gantt-showcase-control__input';
    const text = document.createElement('span');
    text.className = 'gantt-showcase-control__label';
    text.textContent = label;
    const sync = () => {
      input.checked = checked();
    };
    input.addEventListener('change', () => {
      onChange(input.checked);
      applyGanttConfig();
    });
    control.append(input, text);
    sync();
    return control;
  }

  controls.append(
    createToggle('Critical path', () => showCriticalPath, (value) => {
      showCriticalPath = value;
    }),
    createToggle('Baselines', () => showBaseline, (value) => {
      showBaseline = value;
    }),
  );

  applyGanttConfig();
  container.appendChild(grid);
}
