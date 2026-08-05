import { Component, Input, NO_ERRORS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  AdvanceFilterPlugin,
  ColumnCollapsePlugin,
  FilterHeaderPlugin,
  RowOddPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import {
  createColumnCollapseColumns,
  createColumnCollapseRows,
  prefersDarkTheme,
  type ContactRow,
} from './column-collapse.shared';
import './column-collapse.scss';

@Component({
  selector: 'column-collapse-grid',
  standalone: true,
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <section class="column-collapse-showcase" aria-label="Column Collapse contact workspace">
      <div class="column-collapse-toolbar">
        <div>
          <strong>Contact workspace</strong>
          <span>Collapse a grouped header to keep only its sealed column visible.</span>
        </div>
        <div class="column-collapse-legend" aria-label="Column collapse legend">
          <span><i class="column-collapse-dot column-collapse-dot--sealed"></i>Sealed</span>
          <span><i class="column-collapse-dot column-collapse-dot--hidden"></i>Collapsible</span>
        </div>
      </div>
      <revo-grid
        class="column-collapse-grid"
        [theme]="theme"
        [columns]="columns"
        [source]="source"
        [plugins]="plugins"
        [rowHeaders]="true"
        [resize]="true"
        [hideAttribution]="true"
      ></revo-grid>
    </section>
  `,
})
export class ColumnCollapseGridComponent {
  private providedRows?: ContactRow[];

  @Input()
  set rows(value: ContactRow[] | undefined) {
    this.providedRows = value;
    this.source = value?.length ? value : createColumnCollapseRows();
  }

  get rows() {
    return this.providedRows;
  }

  readonly theme = prefersDarkTheme() ? 'darkMaterial' : 'material';
  readonly columns = createColumnCollapseColumns();
  readonly plugins = [ColumnCollapsePlugin, AdvanceFilterPlugin, FilterHeaderPlugin, RowSelectPlugin, RowOddPlugin];
  source = createColumnCollapseRows();
}
