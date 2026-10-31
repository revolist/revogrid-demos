import '@revolist/ui/styles.css';
import { Input as UiInput } from '@revolist/ui/react-control';
import { Dropdown as UiDropdown } from '@revolist/ui/react';
import { useMemo, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { filterPrompts, PROMPT_CATEGORIES, PROMPT_COLUMNS, PROMPTS } from './prompt-library.shared';
import { PROMPT_EDITORS } from './prompt-editor';
import './prompt-library.css';

export default function PromptLibraryDemo({ isDark = false }: { isDark?: boolean }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const rows = useMemo(() => filterPrompts(PROMPTS, query, category), [query, category]);
  const columns = useMemo(() => PROMPT_COLUMNS, []);
  const editors = useMemo(() => PROMPT_EDITORS, []);

  return <section className={`prompt-demo${isDark ? ' is-dark' : ''}`}>
    <div className="prompt-toolbar">
      <label className="prompt-search"><span>Search</span><UiInput value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Role, prompt, or tag…" /></label>
      <label><span>Category</span><UiDropdown value={category} onChange={nextValue => setCategory(String(nextValue))}
          source={PROMPT_CATEGORIES.map(value => ({ value, label: value }))}
          config={{ nativeTabNavigation: true, topLayer: true, ariaLabel: 'Category' }}
        /></label>
      <span className="prompt-hint">Double-click a prompt to edit it</span>
    </div>
    <RevoGrid className="prompt-grid" theme={isDark ? 'darkCompact' : 'compact'} source={rows} columns={columns} editors={editors} filter={true} range={true} resize={true} rowHeaders={true} hideAttribution={true} canMoveColumns={true} rowSize={108} />
  </section>;
}
