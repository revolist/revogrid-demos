import '@revolist/ui/styles.css';
import { UiComponent } from '@revolist/ui/angular';
import { UiControlDirective } from '@revolist/ui/angular-control';
import { AfterViewInit, ChangeDetectorRef, Component, ViewEncapsulation, Input, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, inject } from '@angular/core';
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
  formatEcommerceCustomerCount,
  getEcommerceViewColumns,
  type EcommerceColumnView,
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
  resetEcommerceFilters,
  type EcommerceFilterPresetId,
  type EcommerceVisibleSourceSync,
} from './ecommerce.filtering';

@Component({
  selector: 'ecommerce-grid',
  standalone: true,
  imports: [UiComponent, UiControlDirective, RevoGrid],
  host: { class: 'ecommerce-grid-host' },
  template: `
  <div class="ecommerce-shell grow" [attr.data-view]="columnView">
    <header class="ecommerce-heading">
      <div><h1>Customer analytics</h1><p>Explore spending, loyalty, and purchase behavior.</p></div>
    </header>
    <div class="ecommerce-toolbar" aria-label="Customer controls">
      <rv-ui component="SearchInput" [props]="{rootClassName: 'ecommerce-search', value: quickSearch, 'aria-label': 'Search customers', placeholder: 'Search customers, cities, products…'}" (valueChange)="applyQuickSearch($any($event))" />
      <rv-ui component="Dropdown" [props]="{className: 'rv-select ecommerce-preset', source: segmentOptions, value: activePreset, config: segmentConfig}" (valueChange)="applyPreset($any($event))" />
      <rv-ui component="Dropdown" [props]="{className: 'rv-select ecommerce-view', source: viewOptions, value: columnView, config: viewConfig}" (valueChange)="setColumnView($any($event))" />
      <button rvControl type="button" class="ecommerce-export rv-btn-primary" (click)="exportToExcel()">Export</button>
    </div>
    <div class="ecommerce-table">
    <revo-grid
      class="ecommerce-grid skip-style cell-border"
      range
      [canMoveColumns]="true"
      [rowSize]="48"
      #gridRef
      [theme]="theme"
      [columns]="columns"
      [source]="sourceRows"
      [plugins]="plugins"
      [rowContextMenu]="rowContextMenu"
      [columnContextMenu]="columnContextMenu"
      stretch="last"
      [columnTypes]="columnTypes"
      [filter]="filterConfig"
      [hideColumns]="hiddenColumns"
      style="min-height: 0"
      resize
      hide-attribution
      (rowselected)="handleRowSelected($event)"
    />
    @if (empty) { <div class="ecommerce-empty" role="status" aria-live="polite">
      <strong>No customers found</strong><span>Try another search or choose a different segment.</span>

    </div> }
    </div>
  </div>
  `,
  styleUrls: ['./ecommerce.scss'],
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ECommerceGridComponent implements AfterViewInit, OnDestroy {
  private readonly changeDetector = inject(ChangeDetectorRef);
  @Input() set rows(value: any[]) {
    this.sourceRows = normalizeEcommerceRows(value || []);
    this.visibleRows = this.sourceRows;
    this.empty = this.sourceRows.length === 0;
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
  columnView: EcommerceColumnView = 'overview';
  activePreset = '';
  readonly segmentOptions = [{ value: '', label: 'Saved segments' }, ...Object.entries(ECOMMERCE_FILTER_PRESETS).map(([value, preset]) => ({ value, label: preset.label }))];
  readonly viewOptions = [{ value: 'overview', label: 'Customer overview' }, { value: 'all', label: 'All fields' }];
  readonly segmentConfig = { ariaLabel: 'Saved segments', nativeTabNavigation: true };
  readonly viewConfig = { ariaLabel: 'Column view', nativeTabNavigation: true };
  setColumnView(value: string | string[]) {
    this.columnView = (Array.isArray(value) ? value[0] : value) as EcommerceColumnView;
    this.updateColumns();
  }
  readonly formatEcommerceCustomerCount = formatEcommerceCustomerCount;
  allColumns = createEcommerceAnalyticsColumns();
  columns = getVisibleEcommerceColumns(getEcommerceViewColumns(this.allColumns, this.columnView), this.hiddenColumns);

  theme = currentEcommerceTheme().isDark() ? 'darkMaterial' : 'material';
  isDark = currentEcommerceTheme().isDark();
  quickSearch = '';
  selectedRowsCount = 0;
  selectedIndexes = new Set<number>();
  sourceRows: any[] = [];
  visibleRows: any[] = [];
  empty = true;
  rowsCountLabel = '0';
  readonly filterPresets = Object.entries(ECOMMERCE_FILTER_PRESETS);
  private syncVisibleSource?: EcommerceVisibleSourceSync;

  plugins = ecommercePlugins;
  contextMenus = createEcommerceContextMenus({
    getRows: () => this.sourceRows,
    setRows: (rows) => {
      this.sourceRows = rows;
      this.visibleRows = rows;
      this.empty = rows.length === 0;
      this.gridRef.nativeElement.source = rows;
      void this.syncVisibleSource?.();
    },
    getColumns: () => this.allColumns,
    setColumns: (nextColumns) => {
      this.allColumns = nextColumns;
      this.columns = getVisibleEcommerceColumns(getEcommerceViewColumns(this.allColumns, this.columnView), this.hiddenColumns);
    },
    getHiddenColumns: () => this.hiddenColumns,
    setHiddenColumns: (nextHiddenColumns) => {
      this.hiddenColumns = nextHiddenColumns;
      this.columns = getVisibleEcommerceColumns(getEcommerceViewColumns(this.allColumns, this.columnView), this.hiddenColumns);
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
        this.empty = state.empty;
        this.selectedRowsCount = state.visibleSelectedIds.size;
        this.updateRowsCountLabel();
        this.changeDetector.markForCheck();
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
    this.quickSearch = text;
    setEcommerceQuickFilter(this.gridRef.nativeElement, text);
  }

  async applyPreset(next: string | string[]) {
    const value = Array.isArray(next) ? next[0] : next;
    await applyEcommerceFilterPreset(
      this.gridRef.nativeElement,
      (value || undefined) as EcommerceFilterPresetId | undefined,
    );
    this.activePreset = value;
  }

  updateColumns() {
    this.columns = getVisibleEcommerceColumns(getEcommerceViewColumns(this.allColumns, this.columnView), this.hiddenColumns);
  }

  async resetFilters() {
    this.quickSearch = '';
    this.activePreset = '';
    await resetEcommerceFilters(this.gridRef.nativeElement);
    this.resetSelection();
    await this.syncVisibleSource?.();
  }

  refreshVisibleRows() {
    void this.syncVisibleSource?.();
    this.updateRowsCountLabel();
  }

  handleRowSelected(event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) {
    this.selectedIndexes = getSelectedEcommerceIndexes(event, this.sourceRows);
    this.selectedRowsCount = event.detail.count;
    void this.syncVisibleSource?.();
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
