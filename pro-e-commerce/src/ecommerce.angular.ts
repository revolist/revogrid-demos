import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation, Input, ViewChild, ElementRef, HostListener, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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
  getEcommerceColumnOptions,
  getSelectedEcommerceIndexes,
  getVisibleEcommerceColumns,
  normalizeEcommerceRows,
  toggleEcommerceColumn,
} from './ecommerce.shared';

@Component({
  selector: 'ecommerce-grid',
  standalone: true,
  imports: [RevoGrid, CommonModule, FormsModule],
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
          <button type="button" class="ecommerce-button" (click)="resetFilters()">
            Reset
          </button>
          <div #columnsWrapper class="ecommerce-columns" (keydown.escape)="isColumnsOpen = false">
            <button
              type="button"
              class="ecommerce-button ecommerce-button--columns"
              [attr.aria-expanded]="isColumnsOpen"
              (click)="isColumnsOpen = !isColumnsOpen"
            >
              Columns
              <span aria-hidden="true">⌄</span>
            </button>
            <div *ngIf="isColumnsOpen" class="ecommerce-columns-menu">
              <label *ngFor="let column of columnOptions">
                <input
                  type="checkbox"
                  [checked]="!hiddenColumns.includes(column.prop)"
                  (change)="toggleColumn(column.prop)"
                />
                <span>{{ column.label }}</span>
              </label>
            </div>
          </div>
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
        [filter]="false"
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
  @ViewChild('columnsWrapper', { static: true }) columnsWrapper!: ElementRef<HTMLElement>;

  columnTypes = ecommerceColumnTypes;
  hiddenColumns: ColumnProp[] = [];
  allColumns = createEcommerceAnalyticsColumns();
  columns = getVisibleEcommerceColumns(this.allColumns, this.hiddenColumns);
  columnOptions = getEcommerceColumnOptions(this.allColumns);

  theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
  isDark = currentTheme().isDark();
  filterExpression = '';
  isColumnsOpen = false;
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

  resetFilters() {
    this.filterExpression = '';
    this.refreshVisibleRows();
  }

  toggleColumn(prop: ColumnProp) {
    this.hiddenColumns = toggleEcommerceColumn(this.hiddenColumns, prop);
    this.columns = getVisibleEcommerceColumns(this.allColumns, this.hiddenColumns);
    (this.gridRef.nativeElement as any).hideColumns = this.hiddenColumns;
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

  @HostListener('document:mousedown', ['$event'])
  closeColumnsOnOutsideClick(event: MouseEvent) {
    if (
      this.isColumnsOpen &&
      this.columnsWrapper &&
      !this.columnsWrapper.nativeElement.contains(event.target as Node)
    ) {
      this.isColumnsOpen = false;
    }
  }
}
