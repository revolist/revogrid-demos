import { AfterViewInit, Component, ViewEncapsulation, Input, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  RevoGrid,
} from '@revolist/angular-datagrid';
import type { ColumnProp } from '@revolist/revogrid';
import {
  ExportExcelPlugin,
} from '@revolist/revogrid-pro';
import { currentEcommerceTheme } from './ecommerce.theme';
import {
  createEcommerceAnalyticsColumns,
  createEcommerceContextMenus,
  createEcommerceExcelExportConfig,
  clearEcommerceSelection,
  ecommerceColumnTypes,
  ecommerceFilterConfig,
  ecommercePlugins,
  formatEcommerceTotalSpend,
  getSelectedEcommerceIndexes,
  getVisibleEcommerceColumns,
  normalizeEcommerceRows,
} from './ecommerce.shared';
import {
  ECOMMERCE_FILTER_PRESETS,
  applyEcommerceFilterPreset,
  createEcommerceVisibleSourceSync,
  getEcommerceRowId,
  setEcommerceQuickFilter,
  type EcommerceFilterPresetId,
  type EcommerceVisibleSourceSync,
} from './ecommerce.filtering';

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
          <label class="ecommerce-filter" for="customerSearch">
            <span aria-hidden="true">⌕</span>
            <input
              id="customerSearch"
              type="search"
              aria-label="Search customers"
              placeholder="Search customers"
              [(ngModel)]="quickSearch"
              (ngModelChange)="applyQuickSearch($event)"
            />
          </label>
          <label class="ecommerce-preset">
            <span class="sr-only">Advanced filter example</span>
            <select aria-label="Advanced filter example" (change)="applyPreset($event)">
              <option value="">Advanced examples</option>
              @for (entry of filterPresets; track entry[0]) {
                <option [value]="entry[0]">{{ entry[1].label }}</option>
              }
            </select>
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
        [source]="sourceRows"
        [plugins]="plugins"
        [columnTypes]="columnTypes"
        [rowContextMenu]="rowContextMenu"
        [columnContextMenu]="columnContextMenu"
        [filter]="filterConfig"
        stretch="last"
        [resize]="true"
        [hideAttribution]="true"
        (rowselected)="handleRowSelected($event)"
      ></revo-grid>
      @if (visibleRows.length === 0) {
        <div class="ecommerce-empty" role="status" aria-live="polite">No customers match these filters.</div>
      }
    </div>
  `,
  styleUrls: ['./ecommerce.scss'],
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ECommerceGridComponent implements AfterViewInit, OnDestroy {
  @Input() set rows(value: any[]) {
    this.sourceRows = normalizeEcommerceRows(value || []);
    this.visibleRows = this.sourceRows;
    if (this.gridRef?.nativeElement) {
      this.gridRef.nativeElement.source = this.sourceRows;
      void this.syncVisibleSource?.();
    }
  }
  @Input() fields: string[] = [];

  @ViewChild('gridRef', { static: true, read: ElementRef }) gridRef!: ElementRef<HTMLRevoGridElement>;

  columnTypes = ecommerceColumnTypes;
  filterConfig = ecommerceFilterConfig;
  hiddenColumns: ColumnProp[] = [];
  allColumns = createEcommerceAnalyticsColumns();
  columns = getVisibleEcommerceColumns(this.allColumns, this.hiddenColumns);

  theme = currentEcommerceTheme().isDark() ? 'darkMaterial' : 'material';
  isDark = currentEcommerceTheme().isDark();
  quickSearch = '';
  selectedRowsCount = 0;
  selectedIndexes = new Set<number>();
  sourceRows: any[] = [];
  visibleRows: any[] = [];
  rowsCountLabel = '0';
  totalSpend = formatEcommerceTotalSpend([]);
  readonly filterPresets = Object.entries(ECOMMERCE_FILTER_PRESETS);
  private syncVisibleSource?: EcommerceVisibleSourceSync;

  plugins = ecommercePlugins;
  contextMenus = createEcommerceContextMenus({
    getRows: () => this.sourceRows,
    setRows: (rows) => {
      this.sourceRows = rows;
      this.visibleRows = rows;
      this.gridRef.nativeElement.source = rows;
      void this.syncVisibleSource?.();
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

  ngAfterViewInit() {
    this.syncVisibleSource = createEcommerceVisibleSourceSync(
      this.gridRef.nativeElement,
      (state) => {
        this.visibleRows = state.visibleRows;
        this.selectedRowsCount = state.visibleSelectedIds.size;
        this.updateRowsCountLabel();
        this.totalSpend = formatEcommerceTotalSpend(this.visibleRows);
      },
      () => new Set([...this.selectedIndexes].map(index =>
        getEcommerceRowId(this.sourceRows[index]))),
    );
    this.gridRef.nativeElement.addEventListener('afterfilterapply', this.syncVisibleSource);
    this.gridRef.nativeElement.addEventListener('aftertrimmed', this.syncVisibleSource);
    this.gridRef.nativeElement.addEventListener('aftersourceset', this.syncVisibleSource);
    void this.syncVisibleSource();
  }

  ngOnDestroy() {
    if (this.syncVisibleSource) {
      this.gridRef?.nativeElement.removeEventListener('afterfilterapply', this.syncVisibleSource);
      this.gridRef?.nativeElement.removeEventListener('aftertrimmed', this.syncVisibleSource);
      this.gridRef?.nativeElement.removeEventListener('aftersourceset', this.syncVisibleSource);
      this.syncVisibleSource.cancel();
    }
  }

  applyQuickSearch(text: string) {
    setEcommerceQuickFilter(this.gridRef.nativeElement, text);
  }

  async applyPreset(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    await applyEcommerceFilterPreset(
      this.gridRef.nativeElement,
      (value || undefined) as EcommerceFilterPresetId | undefined,
    );
    select.value = '';
  }

  refreshVisibleRows() {
    void this.syncVisibleSource?.();
    this.updateRowsCountLabel();
    this.totalSpend = formatEcommerceTotalSpend(this.visibleRows);
  }

  handleRowSelected(event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) {
    this.selectedIndexes = getSelectedEcommerceIndexes(event, this.sourceRows);
    this.selectedRowsCount = event.detail.count;
    this.updateRowsCountLabel();
  }

  resetSelection() {
    this.selectedIndexes = new Set();
    this.selectedRowsCount = 0;
    clearEcommerceSelection(this.gridRef?.nativeElement);
    this.updateRowsCountLabel();
  }

  updateRowsCountLabel() {
    const totalRowsCount = this.visibleRows.length;
    this.rowsCountLabel = this.selectedRowsCount === totalRowsCount
      ? String(totalRowsCount)
      : `${this.selectedRowsCount}/${totalRowsCount}`;
  }
}
