import { defineCustomElements } from '@revolist/revogrid/loader';
import { filterPrompts, PROMPT_CATEGORIES, PROMPT_COLUMNS, PROMPTS } from './prompt-library.shared';
import { PROMPT_EDITORS } from './prompt-editor';
import './prompt-library.css';

defineCustomElements();

export async function load(parentSelector: string, options: { isDark?: boolean } = {}) {
  const parent = document.querySelector(parentSelector);
  if (!parent) return;

  const container = document.createElement('section');
  container.className = `prompt-demo${options.isDark ? ' is-dark' : ''}`;
  container.innerHTML = `
    <div class="prompt-toolbar">
      <label class="prompt-search"><span>Search</span><input data-search type="search" placeholder="Role, prompt, or tag…" /></label>
      <label><span>Category</span><select data-category>${PROMPT_CATEGORIES.map(item => `<option>${item}</option>`).join('')}</select></label>
      <span class="prompt-hint">Double-click a prompt to edit it</span>
    </div>`;

  const grid = document.createElement('revo-grid') as HTMLRevoGridElement;
  grid.className = 'prompt-grid';
  grid.theme = options.isDark ? 'darkCompact' : 'compact';
  grid.source = PROMPTS;
  grid.columns = PROMPT_COLUMNS;
  grid.editors = PROMPT_EDITORS;
  grid.filter = true;
  grid.range = true;
  grid.resize = true;
  grid.rowHeaders = true;
  grid.hideAttribution = true;
  grid.canMoveColumns = true;
  grid.rowSize = 108;
  container.appendChild(grid);
  parent.appendChild(container);

  const search = container.querySelector('[data-search]') as HTMLInputElement;
  const category = container.querySelector('[data-category]') as HTMLSelectElement;
  const refresh = () => {
    const rows = filterPrompts(PROMPTS, search.value, category.value);
    grid.source = rows;
  };
  search.addEventListener('input', refresh);
  category.addEventListener('change', refresh);

  return () => container.remove();
}
