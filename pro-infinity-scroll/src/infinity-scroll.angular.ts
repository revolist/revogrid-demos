import { ChangeDetectorRef, Component, Input, NO_ERRORS_SCHEMA, OnDestroy, ViewEncapsulation } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import type { ColumnProp, FilterCollectionItem, MultiFilterItem } from '@revolist/revogrid';
import {
  AdvanceFilterPlugin,
  ColumnStretchPlugin,
  FIlTER_SELECTION,
  InfinityScrollPlugin,
  RowOddPlugin,
  RowSelectPlugin,
  type InfinityScrollConfig,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { exportInfinityScrollRows } from './infinity-scroll.export';
import {
  createInfinityScrollColumns,
  createInfinityScrollDataLoader,
  createInfinityScrollPinnedBottomRows,
  createInfinityScrollPinnedTopRows,
  createInfinityScrollRows,
  type InfinityScrollQuickFilter,
  type InfinityScrollUser,
} from './infinity-scroll.shared';
import './infinity-scroll.scss';

@Component({
  selector: 'infinity-scroll-grid',
  standalone: true,
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <section class="infinity-showcase" aria-label="Infinity Scroll remote directory">
      <div class="infinity-toolbar">
        <div class="infinity-toolbar__copy">
          <strong>Remote user directory</strong>
          <span class="infinity-status">{{ status }}</span>
        </div>
        <button class="infinity-button" type="button" [disabled]="exporting" (click)="exportAll()">
          {{ exporting ? 'Preparing export…' : 'Export all to Excel' }}
        </button>
      </div>
      <revo-grid
        class="infinity-grid"
        [theme]="theme"
        [columns]="columns"
        [source]="source"
        [pinnedTopSource]="pinnedTopSource"
        [pinnedBottomSource]="pinnedBottomSource"
        [plugins]="plugins"
        [infinityScroll]="infinityScroll"
        [stretch]="'last'"
        [rowHeaders]="true"
        [hideAttribution]="true"
      ></revo-grid>
    </section>
  `,
})
export class InfinityScrollGridComponent implements OnDestroy {
  @Input() rows?: InfinityScrollUser[];

  theme: HTMLRevoGridElement['theme'] = currentTheme().isDark() ? 'darkMaterial' : 'material';
  private readonly disconnectTheme = observeCurrentTheme((isDark) => {
    this.theme = isDark ? 'darkMaterial' : 'material';
    this.cdr.detectChanges();
  });
  readonly source: InfinityScrollUser[] = [];
  readonly columns = createInfinityScrollColumns();
  readonly plugins = [InfinityScrollPlugin, AdvanceFilterPlugin, RowOddPlugin, RowSelectPlugin, ColumnStretchPlugin];
  readonly pinnedTopSource = createInfinityScrollPinnedTopRows();
  readonly pinnedBottomSource = createInfinityScrollPinnedBottomRows();
  status = 'Initializing remote source…';
  exporting = false;
  private dataset = createInfinityScrollRows();
  private serverLoader = createInfinityScrollDataLoader({
    rows: this.dataset,
    selectionFilterType: FIlTER_SELECTION,
  });
  infinityScroll: Partial<InfinityScrollConfig> = this.createConfig();

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnDestroy() {
    this.disconnectTheme();
  }

  private createConfig(): Partial<InfinityScrollConfig> {
    return {
      chunkSize: 50,
      bufferSize: 150,
      preloadThreshold: 0.75,
      total: this.dataset.length,
      loadData: this.loadData.bind(this),
    };
  }

  async loadData(
    skip: number,
    limit: number,
    order?: Partial<Record<ColumnProp, 'asc' | 'desc'>>,
    singleFilters?: Record<ColumnProp, FilterCollectionItem>,
    multiFilters?: MultiFilterItem,
    quickFilter?: InfinityScrollQuickFilter,
  ) {
    this.status = `Fetching rows ${skip + 1}–${Math.min(skip + limit, this.dataset.length)}…`;
    this.cdr.detectChanges();
    const result = await this.serverLoader(skip, limit, order, singleFilters, multiFilters, quickFilter);
    this.status = `Loaded ${result.total.toLocaleString()} matching records`;
    this.cdr.detectChanges();
    return result;
  }

  async exportAll() {
    this.exporting = true;
    this.cdr.detectChanges();
    try {
      await exportInfinityScrollRows({
        columns: this.columns,
        total: this.dataset.length,
        loadData: this.serverLoader,
        theme: this.theme,
        setStatus: (message) => {
          this.status = message;
          this.cdr.detectChanges();
        },
      });
    } finally {
      this.exporting = false;
      this.cdr.detectChanges();
    }
  }
}
