import { defineCustomElements } from '@revolist/revogrid/loader';
import { createGrouping, PROJECT_COLUMNS, PROJECTS } from './project-portfolio.shared';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './project-portfolio.css';
defineCustomElements();

export async function load(parentSelector: string, options: { isDark?: boolean } = {}) {
  const parent = document.querySelector(parentSelector); if (!parent) return;
  let expanded = true;
  const container = document.createElement('section'); container.className = `portfolio-demo${options.isDark ? ' is-dark' : ''}`;
  container.innerHTML = `<div class="portfolio-toolbar"><div class="portfolio-grouping"><span>Grouped by</span><strong>Department → Status</strong></div><button class="portfolio-toggle" type="button" aria-label="Collapse all groups" title="Collapse all groups"><i class="fa-solid fa-angles-up" aria-hidden="true"></i></button></div>`;
  const grid = document.createElement('revo-grid') as HTMLRevoGridElement; grid.className = 'portfolio-grid'; grid.theme = options.isDark ? 'darkCompact' : 'compact'; grid.source = PROJECTS; grid.columns = PROJECT_COLUMNS; grid.grouping = createGrouping(expanded); grid.filter = true; grid.range = true; grid.resize = true; grid.hideAttribution = true; grid.canMoveColumns = true; grid.rowSize = 44; container.appendChild(grid); parent.appendChild(container);
  const button = container.querySelector<HTMLButtonElement>('.portfolio-toggle')!;
  const icon = button.querySelector<HTMLElement>('i')!;
  button.addEventListener('click', () => {
    expanded = !expanded;
    grid.grouping = createGrouping(expanded);
    const label = expanded ? 'Collapse all groups' : 'Expand all groups';
    button.setAttribute('aria-label', label);
    button.title = label;
    icon.classList.toggle('fa-angles-up', expanded);
    icon.classList.toggle('fa-angles-down', !expanded);
  });
  return () => container.remove();
}
