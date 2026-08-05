import {
  AfterViewInit,
  Component,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import type { MultiFilterItem } from '@revolist/revogrid';
import type { AdvancedFilterBadgesController } from '@revolist/revogrid-pro';
import { RevoGrid } from '@revolist/angular-datagrid';
import { currentTheme } from '../../composables/useRandomData';
import {
  createOrderExplorerColumns,
  createOrderExplorerColumnTypes,
  createOrderExplorerFilter,
  createOrderExplorerInitialFilters,
  createOrderExplorerPreset,
  createOrderExplorerRows,
  getOrderExplorerVisibleCount,
  mountOrderExplorerFilterBadges,
  mountOrderExplorerQuickBadge,
  setOrderExplorerQuickFilter,
  ORDER_EXPLORER_QUICK_FILTER_EXAMPLE,
  orderExplorerPlugins,
  type OrderExplorerQuickBadgeController,
  type OrderExplorerPreset,
} from './filtering.shared';
import './filtering.scss';

@Component({
  selector: 'filtering-grid',
  standalone: true,
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
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
          <a class="rv-btn" href="?recipe=remote">Remote recipe</a>
        </div>
      </div>
      <div class="order-explorer__active-filters">
        <div #quickBadgeRef class="order-explorer__quick-chip" role="list"></div>
        <div #badgesRef></div>
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
  @ViewChild('badgesRef') badgesRef?: any;
  @ViewChild('quickBadgeRef') quickBadgeRef?: any;

  readonly theme = currentTheme().isDark() ? 'darkMaterial' : 'material';
  readonly source = createOrderExplorerRows();
  readonly columns = createOrderExplorerColumns();
  readonly plugins = orderExplorerPlugins;
  readonly columnTypes = createOrderExplorerColumnTypes();
  readonly stretch = 'all';
  filter = createOrderExplorerFilter(createOrderExplorerInitialFilters());
  visibleCount = this.source.length;
  quickText = '';
  readonly quickFilterExample = ORDER_EXPLORER_QUICK_FILTER_EXAMPLE;
  private badges?: AdvancedFilterBadgesController;
  private quickBadge?: OrderExplorerQuickBadgeController;
  private destroyed = false;

  private get grid(): HTMLRevoGridElement | undefined {
    return this.gridRef?.nativeElement ?? this.gridRef?.el ?? this.gridRef;
  }

  private readonly syncFilterState = async () => {
    this.visibleCount = await getOrderExplorerVisibleCount(this.grid, this.source.length);
  };

  ngAfterViewInit() {
    const grid = this.grid;
    const badgesRoot = this.badgesRef?.nativeElement ?? this.badgesRef;
    const quickBadgeRoot = this.quickBadgeRef?.nativeElement ?? this.quickBadgeRef;
    grid?.addEventListener('afterfilterapply', this.syncFilterState);
    if (grid && badgesRoot) {
      void mountOrderExplorerFilterBadges(grid, badgesRoot).then(badges => {
        if (this.destroyed) badges.destroy();
        else this.badges = badges;
      });
    }
    if (quickBadgeRoot) {
      this.quickBadge = mountOrderExplorerQuickBadge(quickBadgeRoot, () => this.applyQuickFilter(''));
    }
    void getOrderExplorerVisibleCount(grid, this.source.length).then(count => {
      this.visibleCount = count;
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.badges?.destroy();
    this.quickBadge?.destroy();
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
    this.quickBadge?.refresh(text);
  }

  private applyFilterItems(items: MultiFilterItem) {
    this.filter = createOrderExplorerFilter(items);
    if (this.grid) this.grid.filter = this.filter;
  }
}
