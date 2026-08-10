import type { ColumnRegular } from '@revolist/revogrid';
import promptRows from './prompts.json';

export type PromptCategory = 'Content' | 'Engineering' | 'Research' | 'Operations' | 'Learning';

export interface PromptRow {
  id: number;
  title: string;
  category: PromptCategory;
  prompt: string;
  tags: string;
}

export const PROMPTS = promptRows as PromptRow[];

export const PROMPT_CATEGORIES = ['All', 'Content', 'Engineering', 'Research', 'Operations', 'Learning'] as const;

export function filterPrompts(rows: PromptRow[], query: string, category: string): PromptRow[] {
  const needle = query.trim().toLocaleLowerCase();
  return rows.filter(row => {
    const categoryMatches = category === 'All' || row.category === category;
    const searchMatches = !needle || `${row.title} ${row.category} ${row.prompt} ${row.tags}`.toLocaleLowerCase().includes(needle);
    return categoryMatches && searchMatches;
  });
}

export const PROMPT_COLUMNS: ColumnRegular[] = [
  { name: 'Prompt role', prop: 'title', size: 220, sortable: true },
  { name: 'Category', prop: 'category', size: 140, sortable: true },
  { name: 'Prompt', prop: 'prompt', size: 590, editor: 'prompt' },
  { name: 'Tags', prop: 'tags', size: 170 },
];
