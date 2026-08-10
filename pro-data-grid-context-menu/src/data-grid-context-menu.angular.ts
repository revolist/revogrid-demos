import { Component, Input, OnDestroy, ViewEncapsulation } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  AdvanceFilterPlugin,
  AutoSizeColumnPlugin,
  ColumnCollapsePlugin,
  DataGridContextMenuPlugin,
  DialogPlugin,
  ExportExcelPlugin,
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
  createTeamGrouping,
  createTeamRows,
  getDataGridContextMenuTheme,
  type TeamRow,
} from './data-grid-context-menu.shared';

@Component({
  selector: 'data-grid-context-menu-grid',
  standalone: true,
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./data-grid-context-menu.scss'],
  template: `
    <section class="data-grid-context-menu-showcase" aria-label="Data Grid Context Menu & Formatting workspace">
      <revo-grid
        class="data-grid-context-menu-grid"
        [theme]="theme"
        [source]="source"
        [columns]="columns"
        [grouping]="grouping"
        [rowSize]="rowSize"
        [plugins]="plugins"
        [additionalData]="additionalData"
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
  readonly grouping = createTeamGrouping();
  readonly rowSize = DATA_GRID_CONTEXT_MENU_ROW_SIZE;
  readonly rowHeaders = createContextMenuRowHeaders();
  readonly plugins = [
    DataGridContextMenuPlugin,
    DialogPlugin,
    AdvanceFilterPlugin,
    AutoSizeColumnPlugin,
    RowSelectPlugin,
    ColumnCollapsePlugin,
    MultiRangeSelectionPlugin,
    ExportExcelPlugin,
  ];
  readonly additionalData = {
    dataGridContextMenu: createDataGridContextMenuConfig(),
    dataGridFormatting: createDataGridFormattingPresets(),
  };
  source = createTeamRows();

  ngOnDestroy() {
    this.disconnectTheme();
  }
}
