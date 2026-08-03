import { defineCustomElements } from '@revolist/revogrid/loader';
import { KanbanPlugin } from '@revolist/revogrid-enterprise';
import { currentTheme } from '../../composables/useRandomData';
import { createKanbanShowcaseConfig, KANBAN_SHOWCASE_COLUMNS, resolveKanbanRows, type KanbanShowcaseCard } from './kanban.shared';
import './kanban.scss';

defineCustomElements();

export function load(parentSelector: string, rows?: KanbanShowcaseCard[]) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'kanban-showcase';
  const grid = document.createElement('revo-grid');

  grid.className = 'kanban-showcase__grid';
  grid.hideAttribution = true;
  grid.resize = true;
  grid.columns = KANBAN_SHOWCASE_COLUMNS;
  grid.plugins = [KanbanPlugin];
  grid.theme = currentTheme().isDark() ? 'darkCompact' : 'compact';
  grid.kanban = createKanbanShowcaseConfig();

  wrapper.append(grid);
  parent.append(wrapper);
  grid.source = resolveKanbanRows(rows);

  return () => {
    grid.remove();
    wrapper.remove();
  };
}
