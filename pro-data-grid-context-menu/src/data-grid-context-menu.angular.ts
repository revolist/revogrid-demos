import { Component, Input, NO_ERRORS_SCHEMA, OnDestroy, ViewEncapsulation } from '@angular/core';
import { defineCustomElements } from '@revolist/revogrid/loader';
import {
  AdvanceFilterPlugin,
  AutoSizeColumnPlugin,
  ColumnCollapsePlugin,
  DataGridContextMenuPlugin,
  DialogPlugin,
  ExportExcelPlugin,
  HistoryPlugin,
  MultiRangeSelectionPlugin,
  RowSelectPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  DATA_GRID_CONTEXT_MENU_ROW_SIZE,
  createContextMenuColumns,
  createContextMenuRowHeaders,
  createDataGridFormattingPresets,
  createDataGridContextMenuConfig,
  createTeamRows,
  getDataGridContextMenuTheme,
  type TeamRow,
} from './data-grid-context-menu.shared';

defineCustomElements();

@Component({
  selector: 'data-grid-context-menu-grid',
  standalone: true,
  imports: [],
  schemas: [NO_ERRORS_SCHEMA],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./data-grid-context-menu.scss'],
  template: `
    <section class="data-grid-context-menu-showcase" aria-label="Data Grid Context Menu & Formatting workspace">
      <revo-grid
        class="data-grid-context-menu-grid"
        [theme]="theme"
        [source]="source"
        [columns]="columns"
        [rowSize]="rowSize"
        [plugins]="plugins"
        [dataGridFormatting]="dataGridFormatting"
        [dataGridContextMenu]="dataGridContextMenu"
        [rowHeaders]="rowHeaders"
        [range]="true"
        [resize]="true"
        [hideAttribution]="true"
      ></revo-grid>
    </section>
  `,
})
export class DataGridContextMenuGridComponent implements OnDestroy {
  private providedRows?: TeamRow[];

  @Input()
  set rows(value: TeamRow[] | undefined) {
    this.providedRows = value;
    this.source = value?.length ? value : createTeamRows();
  }

  get rows() {
    return this.providedRows;
  }

  theme: HTMLRevoGridElement['theme'] = getDataGridContextMenuTheme(currentTheme().isDark());
  private readonly disconnectTheme = observeCurrentTheme((isDark) => {
    this.theme = getDataGridContextMenuTheme(isDark);
  });
  readonly columns = createContextMenuColumns();
  readonly rowSize = DATA_GRID_CONTEXT_MENU_ROW_SIZE;
  readonly rowHeaders = createContextMenuRowHeaders();
  readonly plugins = [
    DataGridContextMenuPlugin,
    HistoryPlugin,
    DialogPlugin,
    AdvanceFilterPlugin,
    AutoSizeColumnPlugin,
    RowSelectPlugin,
    ColumnCollapsePlugin,
    MultiRangeSelectionPlugin,
    ExportExcelPlugin,
  ];
  readonly dataGridFormatting = createDataGridFormattingPresets();
  readonly dataGridContextMenu = createDataGridContextMenuConfig();
  source = createTeamRows();

  ngOnDestroy() {
    this.disconnectTheme();
  }
}
