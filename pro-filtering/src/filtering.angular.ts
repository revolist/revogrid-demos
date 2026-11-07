import '@revolist/ui/styles.css';
import { UiComponent } from '@revolist/ui/angular';
import { UiControlDirective } from '@revolist/ui/angular-control';
import {
  type AfterViewInit,
  ChangeDetectorRef,
  Component,
  NO_ERRORS_SCHEMA,
  type OnDestroy,
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
  orderExplorerFilterBadgeOptions,
  orderExplorerPlugins,
  type OrderExplorerPreset,
} from './filtering.shared';

@Component({
  selector: 'filtering-grid',
  standalone: true,
  imports: [UiComponent, UiControlDirective, RevoGrid],
  schemas: [NO_ERRORS_SCHEMA],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./filtering.scss'],
  template: `
    <section class="order-explorer" aria-label="Advanced Filtering: Order Explorer">
      <div class="order-explorer__toolbar">
        <div class="order-explorer__presets" aria-label="Filter presets">

          <button rvControl class="rv-btn" type="button" (click)="applyPreset('high-value-europe')">High-value Europe</button>
          <button rvControl class="rv-btn" type="button" (click)="applyPreset('recent-expedited')">Recent expedited</button>
          <button rvControl class="rv-btn" type="button" (click)="applyPreset('review-queue')">Review queue</button>
        </div>
        <div class="order-explorer__search">
          <rv-ui component="SearchInput"
            [props]="{ rootClassName: 'order-explorer__search-field', value: quickText, placeholder: 'Global search — try “Lisbon pending”', 'aria-label': 'Search all visible columns' }"
            (valueChange)="applyQuickFilter($any($event))" />
          <button rvControl class="rv-btn" type="button" (click)="applyQuickFilter(quickFilterExample)">Try example</button>
        </div>
        <div class="order-explorer__summary">
          <span class="order-explorer__count" aria-live="polite">
            {{ visibleCount.toLocaleString() }} of {{ source.length.toLocaleString() }} orders
          </span>
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
          [filterBadges]="filterBadges"
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
  columns = createOrderExplorerColumns();
  readonly plugins = orderExplorerPlugins;
  readonly columnTypes = createOrderExplorerColumnTypes();
  readonly stretch = 'all';
  filter: ColumnFilterConfig = createOrderExplorerFilter(createOrderExplorerInitialFilters());
  readonly filterBadges = orderExplorerFilterBadgeOptions;
  visibleCount = this.source.length;
  quickText = '';
  readonly quickFilterExample = ORDER_EXPLORER_QUICK_FILTER_EXAMPLE;
  private disposed = false;
  private readonly disconnectTheme = observeCurrentTheme((isDark) => {
    this.theme = isDark ? 'darkMaterial' : 'material';
  });

  private get grid(): HTMLRevoGridElement | undefined {
    return this.gridRef?.nativeElement ?? this.gridRef?.el ?? this.gridRef;
  }

  private readonly syncFilterState = async () => {
    const count = await getOrderExplorerVisibleCount(this.grid, this.source.length);
    if (this.disposed) return;
    this.visibleCount = count;
    // Grid events can resolve outside Angular's change-detection notification.
    this.cdr.markForCheck();
  };

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    const grid = this.grid;
    if (!grid) return;
    grid.addEventListener('afterfilterapply', this.syncFilterState);
    void this.syncFilterState();
  }

  ngOnDestroy() {
    this.disposeOrderExplorer();
  }

  private disposeOrderExplorer() {
    this.disposed = true;
    this.disconnectTheme();
    this.grid?.removeEventListener('afterfilterapply', this.syncFilterState);
  }

  applyPreset(preset: OrderExplorerPreset) {
    this.applyFilterItems(createOrderExplorerPreset(preset));
  }


  applyQuickFilter(text: string) {
    this.quickText = text;
    if (this.grid) setOrderExplorerQuickFilter(this.grid, text);
  }

  // Presets and header filters use the same public `filter` property.
  private applyFilterItems(items: MultiFilterItem) {
    this.filter = createOrderExplorerFilter(items);
    this.columns = createOrderExplorerColumns();
  }
}
