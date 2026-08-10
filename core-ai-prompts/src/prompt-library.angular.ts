import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation, computed, signal } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import { filterPrompts, PROMPT_CATEGORIES, PROMPT_COLUMNS, PROMPTS } from './prompt-library.shared';
import { PROMPT_EDITORS } from './prompt-editor';
import './prompt-library.css';

@Component({
  selector: 'prompt-library-demo',
  standalone: true,
  imports: [RevoGrid],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <section class="prompt-demo" [class.is-dark]="isDark">
      <div class="prompt-toolbar">
        <label class="prompt-search"><span>Search</span><input [value]="query()" (input)="setQuery($event)" type="search" placeholder="Role, prompt, or tag…" /></label>
        <label><span>Category</span><select [value]="category()" (change)="setCategory($event)">@for (item of categories; track item) { <option>{{ item }}</option> }</select></label>
        <span class="prompt-hint">Double-click a prompt to edit it</span>
      </div>
      <revo-grid class="prompt-grid" [theme]="isDark ? 'darkCompact' : 'compact'" [source]="rows()" [columns]="columns" [editors]="editors" [filter]="true" [range]="true" [resize]="true" [rowHeaders]="true" [hideAttribution]="true" [canMoveColumns]="true" [rowSize]="108"></revo-grid>
    </section>
  `,
})
export class PromptLibraryDemoComponent {
  @Input() isDark = false;
  readonly query = signal('');
  readonly category = signal('All');
  readonly categories = PROMPT_CATEGORIES;
  readonly columns = PROMPT_COLUMNS;
  readonly editors = PROMPT_EDITORS;
  readonly rows = computed(() => filterPrompts(PROMPTS, this.query(), this.category()));
  setQuery(event: Event) { this.query.set((event.target as HTMLInputElement).value); }
  setCategory(event: Event) { this.category.set((event.target as HTMLSelectElement).value); }
}
