import { Component, ViewEncapsulation, Input, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  RevoGrid,
} from '@revolist/angular-datagrid';
import type { ColumnProp } from '@revolist/revogrid';
import {
  ExportExcelPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme } from '../../composables/useRandomData';
import {
  createEcommerceAnalyticsColumns,
  createEcommerceContextMenus,
  createEcommerceExcelExportConfig,
  clearEcommerceSelection,
  ecommerceColumnTypes,
  ecommercePlugins,
  filterEcommerceRows,
  formatEcommerceTotalSpend,
  getSelectedEcommerceIndexes,
  getVisibleEcommerceColumns,
  normalizeEcommerceRows,
} from './ecommerce.shared';

@Component({
  selector: 'ecommerce-grid',
  standalone: true,
  imports: [RevoGrid, FormsModule],
  host: { class: 'ecommerce-grid-host' },
  template: `
    <div class="ecommerce-shell grow">
        <div class="ecommerce-toolbar">
          <div class="ecommerce-toolbar__main">
          <span class="ecommerce-chip">
            <span>Rows</span>
            <strong>{{ rowsCountLabel }}</strong>
          </span>
          <label class="ecommerce-filter">
            <span aria-hidden="true">⌕</span>
          <textarea
            id="filterExpression"
            rows="1"
            placeholder='Gender eq "Female" and City eq "Chicago"'
            [(ngModel)]="filterExpression"
            (ngModelChange)="refreshVisibleRows()"
          ></textarea>
          </label>
        </div>
        <div class="ecommerce-toolbar__aside">
          <span class="ecommerce-chip">
            <span>Spend</span>
            <strong>{{ totalSpend }}</strong>
          </span>
          <button type="button" class="ecommerce-button ecommerce-button--export" (click)="exportToExcel()">
            Export
          </button>
        </div>
      </div>
      <revo-grid
        #gridRef
        class="ecommerce-grid skip-style cell-border"
        [range]="true"
        [theme]="theme"
        [columns]="columns"
        [source]="visibleRows"
        [plugins]="plugins"
        [columnTypes]="columnTypes"
        [rowContextMenu]="rowContextMenu"
        [columnContextMenu]="columnContextMenu"
        [filter]="true"
        stretch="last"
        [resize]="true"
        [hideAttribution]="true"
        (rowselected)="handleRowSelected($event)"
      ></revo-grid>
    </div>
  `,
  styleUrls: ['./ecommerce.scss'],
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ECommerceGridComponent {
  @Input() set rows(value: any[]) {
    this.sourceRows = normalizeEcommerceRows(value || []);
    this.refreshVisibleRows();
  }
  @Input() fields: string[] = [];

  @ViewChild('gridRef', { static: true }) gridRef!: ElementRef<HTMLRevoGridElement>;

  columnTypes = ecommerceColumnTypes;
  hiddenColumns: ColumnProp[] = [];
  allColumns = createEcommerceAnalyticsColumns();
  columns = getVisibleEcommerceColumns(this.allColumns, this.hiddenColumns);

  theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
  isDark = currentTheme().isDark();
  filterExpression = '';
  selectedRowsCount = 0;
  selectedIndexes = new Set<number>();
  allRowsCount = 0;
  sourceRows: any[] = [];
  visibleRows: any[] = [];
  rowsCountLabel = '0';
  totalSpend = formatEcommerceTotalSpend([]);

  plugins = ecommercePlugins;
  contextMenus = createEcommerceContextMenus({
    getRows: () => this.sourceRows,
    setRows: (rows) => {
      this.sourceRows = rows;
      this.allRowsCount = rows.length;
      this.refreshVisibleRows();
    },
    getColumns: () => this.allColumns,
    setColumns: (nextColumns) => {
      this.allColumns = nextColumns;
      this.columns = getVisibleEcommerceColumns(this.allColumns, this.hiddenColumns);
    },
    getHiddenColumns: () => this.hiddenColumns,
    setHiddenColumns: (nextHiddenColumns) => {
      this.hiddenColumns = nextHiddenColumns;
      this.columns = getVisibleEcommerceColumns(this.allColumns, this.hiddenColumns);
      (this.gridRef.nativeElement as any).hideColumns = this.hiddenColumns;
    },
    getGrid: () => this.gridRef?.nativeElement,
    getSelectedIndexes: () => this.selectedIndexes,
    clearSelection: () => this.resetSelection(),
    exportExcel: () => this.exportToExcel(),
  });
  rowContextMenu = this.contextMenus.rowContextMenu;
  columnContextMenu = this.contextMenus.columnContextMenu;

  async exportToExcel() {
    const plugins = await this.gridRef.nativeElement.getPlugins();
    const exportPlugin = plugins.find(
      (plugin) => plugin instanceof ExportExcelPlugin
    ) as ExportExcelPlugin;
    exportPlugin?.export(createEcommerceExcelExportConfig());
  }

  refreshVisibleRows() {
    this.visibleRows = filterEcommerceRows(this.sourceRows, this.filterExpression);
    this.updateRowsCountLabel();
    this.totalSpend = formatEcommerceTotalSpend(this.visibleRows);
  }

  handleRowSelected(event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) {
    this.selectedIndexes = getSelectedEcommerceIndexes(event, this.sourceRows);
    this.selectedRowsCount = event.detail.count;
    this.allRowsCount = event.detail.allRowsCount || this.sourceRows.length;
    this.updateRowsCountLabel();
  }

  resetSelection() {
    this.selectedIndexes = new Set();
    this.selectedRowsCount = 0;
    clearEcommerceSelection(this.gridRef?.nativeElement);
    this.updateRowsCountLabel();
  }

  updateRowsCountLabel() {
    const totalRowsCount = this.allRowsCount || this.sourceRows.length;
    this.rowsCountLabel = this.selectedRowsCount === totalRowsCount
      ? String(totalRowsCount)
      : `${this.selectedRowsCount}/${totalRowsCount}`;
  }
}
