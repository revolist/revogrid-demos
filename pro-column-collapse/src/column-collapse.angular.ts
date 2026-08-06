import { Component, Input, NO_ERRORS_SCHEMA, OnDestroy, ViewEncapsulation } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  AdvanceFilterPlugin,
  ColumnCollapsePlugin,
  ColumnMoveAdvancedPlugin,
  FilterHeaderPlugin,
  RowOddPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createColumnCollapseColumns,
  createColumnCollapseRows,
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
export class ColumnCollapseGridComponent implements OnDestroy {
  private providedRows?: ContactRow[];

  @Input()
  set rows(value: ContactRow[] | undefined) {
    this.providedRows = value;
    this.source = value?.length ? value : createColumnCollapseRows();
  }

  get rows() {
    return this.providedRows;
  }

  theme: HTMLRevoGridElement['theme'] = currentTheme().isDark() ? 'darkMaterial' : 'material';
  private readonly disconnectTheme = observeCurrentTheme((isDark) => {
    this.theme = isDark ? 'darkMaterial' : 'material';
  });
  readonly columns = createColumnCollapseColumns();
  readonly plugins = [
    ColumnMoveAdvancedPlugin,
    ColumnCollapsePlugin,
    AdvanceFilterPlugin,
    FilterHeaderPlugin,
    RowSelectPlugin,
    RowOddPlugin,
  ];
  source = createColumnCollapseRows();

  ngOnDestroy() {
    this.disconnectTheme();
  }
}
