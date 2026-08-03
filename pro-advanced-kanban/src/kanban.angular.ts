import { Component, Input, NO_ERRORS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import { KanbanPlugin } from '@revolist/revogrid-enterprise';
import { currentTheme } from '../../composables/useRandomData';
import { createKanbanShowcaseConfig, KANBAN_SHOWCASE_COLUMNS, resolveKanbanRows, type KanbanShowcaseCard } from './kanban.shared';

@Component({
  selector: 'kanban-showcase-grid',
  standalone: true,
  imports: [RevoGrid],
  schemas: [NO_ERRORS_SCHEMA],
  styleUrls: ['./kanban.scss'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="kanban-showcase">
      <revo-grid
        class="kanban-showcase__grid"
        [hideAttribution]="true"
        [resize]="true"
        [source]="gridRows"
        [columns]="columns"
        [plugins]="plugins"
        [columnTypes]="columnTypes"
        [additionalData]="additionalData"
        [kanban]="kanban"
        [theme]="theme"
      ></revo-grid>
    </div>
  `,
})
export class KanbanShowcaseGridComponent {
  @Input() rows?: KanbanShowcaseCard[];

  readonly columns = KANBAN_SHOWCASE_COLUMNS;
  readonly plugins = [KanbanPlugin];
  readonly columnTypes = {};
  readonly additionalData = {};
  readonly theme = currentTheme().isDark() ? 'darkCompact' : 'compact';
  readonly kanban = createKanbanShowcaseConfig();

  get gridRows() { return resolveKanbanRows(this.rows); }
}
