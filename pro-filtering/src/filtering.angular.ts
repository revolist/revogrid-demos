import {
  AfterViewInit,
  Component,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import type { ColumnFilterConfig, MultiFilterItem } from '@revolist/revogrid';
import { RevoGrid } from '@revolist/angular-datagrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createOrderExplorerColumns,
  createOrderExplorerColumnTypes,
  createOrderExplorerFilter,
  createOrderExplorerInitialFilters,
  createOrderExplorerPreset,
  createOrderExplorerRows,
  getOrderExplorerVisibleCount,
  setOrderExplorerQuickFilter,
  ORDER_EXPLORER_QUICK_FILTER_EXAMPLE,
  orderExplorerPlugins,
  type OrderExplorerPreset,
} from './filtering.shared';

@Component({
  selector: 'filtering-grid',
  standalone: true,
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./filtering.scss'],
  template: `
    <section class="order-explorer" aria-label="Advanced Filtering: Order Explorer">
      <div class="order-explorer__toolbar">
        <div class="order-explorer__presets" aria-label="Filter presets">
          <p class="order-explorer__eyebrow">Presets</p>
          <button class="rv-btn" type="button" (click)="applyPreset('high-value-europe')">High-value Europe</button>
          <button class="rv-btn" type="button" (click)="applyPreset('recent-expedited')">Recent expedited</button>
          <button class="rv-btn" type="button" (click)="applyPreset('review-queue')">Review queue</button>
        </div>
        <div class="order-explorer__search">
          <input
            class="order-explorer__search-input"
            type="search"
            [value]="quickText"
            placeholder="Global search — try “Lisbon pending”"
            aria-label="Search all visible columns"
            (input)="onQuickInput($event)"
          />
          <button class="rv-btn" type="button" (click)="applyQuickFilter(quickFilterExample)">Try example</button>
        </div>
        <div class="order-explorer__summary">
          <span class="order-explorer__count" aria-live="polite">
            {{ visibleCount.toLocaleString() }} of {{ source.length.toLocaleString() }} orders
          </span>
          <button class="rv-btn-secondary" type="button" (click)="clearAll()">Clear All</button>
        </div>
      </div>
      <div class="order-explorer__grid">
        <revo-grid
          #gridRef
          class="h-full w-full"
          [theme]="theme"
          [columns]="columns"
          [plugins]="plugins"
          [columnTypes]="columnTypes"
          [filter]="filter"
          [stretch]="stretch"
          [hideAttribution]="true"
          [readonly]="true"
          [resize]="true"
          [source]="source"
        ></revo-grid>
      </div>
    </section>
  `,
})
export class FilteringGridComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gridRef') gridRef?: any;

  theme: HTMLRevoGridElement['theme'] = currentTheme().isDark() ? 'darkMaterial' : 'material';
  readonly source = createOrderExplorerRows();
  readonly columns = createOrderExplorerColumns();
  readonly plugins = orderExplorerPlugins;
  readonly columnTypes = createOrderExplorerColumnTypes();
  readonly stretch = 'all';
  filter: ColumnFilterConfig | undefined;
  visibleCount = this.source.length;
  quickText = '';
  readonly quickFilterExample = ORDER_EXPLORER_QUICK_FILTER_EXAMPLE;
  private destroyed = false;
  private readonly disconnectTheme = observeCurrentTheme((isDark) => {
    this.theme = isDark ? 'darkMaterial' : 'material';
  });

  private get grid(): HTMLRevoGridElement | undefined {
    return this.gridRef?.nativeElement ?? this.gridRef?.el ?? this.gridRef;
  }

  private readonly syncFilterState = async () => {
    this.visibleCount = await getOrderExplorerVisibleCount(this.grid, this.source.length);
  };

  async ngAfterViewInit() {
    const grid = this.grid;
    await grid?.componentOnReady?.();
    if (this.destroyed || !grid) return;
    const initialFilter = createOrderExplorerFilter(createOrderExplorerInitialFilters());
    this.filter = initialFilter;
    grid.filter = initialFilter;
    grid?.addEventListener('afterfilterapply', this.syncFilterState);
    void getOrderExplorerVisibleCount(grid, this.source.length).then(count => {
      this.visibleCount = count;
    });
  }

  ngOnDestroy() {
    this.disposeOrderExplorer();
  }

  private disposeOrderExplorer() {
    this.destroyed = true;
    this.disconnectTheme();
    this.grid?.removeEventListener('afterfilterapply', this.syncFilterState);
  }

  applyPreset(preset: OrderExplorerPreset) {
    this.applyFilterItems(createOrderExplorerPreset(preset));
  }

  clearAll() {
    this.applyFilterItems({});
    this.applyQuickFilter('');
  }

  onQuickInput(event: Event) {
    this.applyQuickFilter((event.target as HTMLInputElement).value);
  }

  applyQuickFilter(text: string) {
    this.quickText = text;
    if (this.grid) setOrderExplorerQuickFilter(this.grid, text);
  }

  // Presets and header filters use the same public `filter` property.
  private applyFilterItems(items: MultiFilterItem) {
    this.filter = createOrderExplorerFilter(items);
    if (this.grid) this.grid.filter = this.filter;
  }
}
