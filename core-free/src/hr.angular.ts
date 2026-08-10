import { 
  Component, 
  Input, 
  ChangeDetectionStrategy,
  signal,
  computed,
  ViewEncapsulation,
  ElementRef,
  ViewChild,
} from '@angular/core';
import type { AfterViewInit } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RevoGrid, BasePlugin, type PluginProviders } from '@revolist/angular-datagrid';
import { getHRColumnsCount, getHRData, getHRVisibleColumnsCount, HR_OPTIONS } from './sys-data/hr.data';
import type { HRGenerationProgress } from './sys-data/hr.data.generator';
import { getBaseHRColumns, getExtraHRColumns, HR_COLOR_BY_AGE, withHRShortDate } from './sys-data/hr.columns';
import { createHRColorSelectColumnType, renderHrColorPill } from './hr-color-select';
import { getHRLoadingDigits, getHRProgressPercent } from './hr-loading';
import { getInitialHRTheme, HR_THEME_DEFINITIONS, HR_THEME_OPTIONS } from './hr-themes';
import {
  createHRPerformanceMonitor,
  createInitialHRPerformanceState,
  formatDuration,
  formatFrameRate,
  formatMemory,
  getHRMetricTooltipId,
  HR_PERFORMANCE_METRICS,
  type HRPerformanceMonitor,
} from './hr-performance';
import {
  applyHRWorkspaceToColumns,
  createHRWorkspaceController,
  getHRWorkspaceRowCount,
  HR_DEFAULT_ROW_COUNT,
  loadHRWorkspace,
  type HRWorkspaceController,
  type HRWorkspaceState,
} from './hr-workspace';
import './hr.css';

@Component({
  selector: 'hr-demo-grid',
  standalone: true,
  imports: [RevoGrid, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="hr-demo grow h-full flex flex-col">
      <div class="hr-toolbar">
        <span class="text-sm font-medium">Data Source</span>
        <select
          class="hr-select"
          [disabled]="loading()"
          (change)="onSizeChange($event)"
        >
          @for (opt of options; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>
        <span class="text-sm font-medium">Theme</span>
        <select class="hr-select" [value]="selectedTheme()" (change)="onThemeChange($event)">
          @for (opt of themeOptions; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>
        <button type="button" class="hr-button" (click)="saveView()">Save view</button>
        <button type="button" class="hr-button hr-button-secondary" (click)="resetView()">Reset view</button>
        <span class="hr-workspace-status">{{ workspaceStatus() }}</span>
        @if (loading()) {
            <div class="text-sm opacity-50 animate-pulse ml-2">{{ loadingLabel() }}</div>
        }
      </div>

      <div class="hr-grid-wrapper flex-1 min-h-0">
        <revo-grid
          #grid
          class="hr-scale-grid grow h-full w-full"
          style="height: 100%; width: 100%"
          [theme]="theme()"
          [themeDefinitions]="themeDefinitions"
          [source]="rows()"
          [columns]="columns()"
          [columnTypes]="columnTypes()"
          [plugins]="plugins"
          [filter]="workspaceState().filter ?? true"
          [sorting]="workspaceState().sorting"
          [range]="true"
          [resize]="true"
          [rowHeaders]="true"
          [hideAttribution]="true"
          [canMoveColumns]="true"
          [rowSize]="36"
        ></revo-grid>
        @if (loading()) {
          <div class="hr-loading-overlay" aria-live="polite">
            <div class="hr-loading-counter" [attr.aria-label]="progressPercent() + ' percent complete'">
              <div class="hr-loading-counter-line">
                @for (digit of loadingDigits(); track digit + '-' + $index + '-' + progressPercent(); let index = $index) {
                  <span class="hr-loading-counter-digit">{{ digit }}</span>
                }
                <span class="hr-loading-counter-symbol">%</span>
              </div>
            </div>
            <div class="hr-loading-label">{{ loadingLabel() }}</div>
          </div>
        }
      </div>

      <section class="hr-performance" aria-label="Browser performance metrics">
        <div class="hr-performance-heading">
          <strong>Performance</strong>
          <span>Measured live in this browser</span>
        </div>
        <div class="hr-performance-metric">
          <div class="hr-performance-label">
            <span>{{ metricDefinitions.preparation.label }}</span>
            <span class="hr-metric-help">
              <button type="button" class="hr-metric-help-trigger" [attr.aria-label]="'About ' + metricDefinitions.preparation.label" [attr.aria-describedby]="getHRMetricTooltipId('preparation')">?</button>
              <span class="hr-metric-tooltip" [id]="getHRMetricTooltipId('preparation')" role="tooltip">{{ metricDefinitions.preparation.description }}</span>
            </span>
          </div>
          <strong>{{ formatDuration(performanceState().preparationTime) }}</strong>
        </div>
        <div class="hr-performance-metric">
          <div class="hr-performance-label">
            <span>{{ metricDefinitions.grid.label }}</span>
            <span class="hr-metric-help">
              <button type="button" class="hr-metric-help-trigger" [attr.aria-label]="'About ' + metricDefinitions.grid.label" [attr.aria-describedby]="getHRMetricTooltipId('grid')">?</button>
              <span class="hr-metric-tooltip" [id]="getHRMetricTooltipId('grid')" role="tooltip">{{ metricDefinitions.grid.description }}</span>
            </span>
          </div>
          <strong>{{ formatDuration(performanceState().gridRenderTime) }}</strong>
        </div>
        <div class="hr-performance-metric">
          <div class="hr-performance-label">
            <span>{{ metricDefinitions.scroll.label }}</span>
            <span class="hr-metric-help">
              <button type="button" class="hr-metric-help-trigger" [attr.aria-label]="'About ' + metricDefinitions.scroll.label" [attr.aria-describedby]="getHRMetricTooltipId('scroll')">?</button>
              <span class="hr-metric-tooltip" [id]="getHRMetricTooltipId('scroll')" role="tooltip">{{ metricDefinitions.scroll.description }}</span>
            </span>
          </div>
          <strong>{{ formatFrameRate(performanceState().scrollFps) }}</strong>
        </div>
        <div class="hr-performance-metric">
          <div class="hr-performance-label">
            <span>{{ metricDefinitions.memory.label }}</span>
            <span class="hr-metric-help">
              <button type="button" class="hr-metric-help-trigger" [attr.aria-label]="'About ' + metricDefinitions.memory.label" [attr.aria-describedby]="getHRMetricTooltipId('memory')">?</button>
              <span class="hr-metric-tooltip" [id]="getHRMetricTooltipId('memory')" role="tooltip">{{ metricDefinitions.memory.description }}</span>
            </span>
          </div>
          <strong>{{ formatMemory(performanceState().memoryUsage?.usedJSHeapSize) }}</strong>
        </div>
        <div class="hr-performance-metric">
          <div class="hr-performance-label">
            <span>{{ metricDefinitions.dataset.label }}</span>
            <span class="hr-metric-help">
              <button type="button" class="hr-metric-help-trigger" [attr.aria-label]="'About ' + metricDefinitions.dataset.label" [attr.aria-describedby]="getHRMetricTooltipId('dataset')">?</button>
              <span class="hr-metric-tooltip" [id]="getHRMetricTooltipId('dataset')" role="tooltip">{{ metricDefinitions.dataset.description }}</span>
            </span>
          </div>
          <strong>{{ performanceState().rowCount.toLocaleString() }} × {{ performanceState().columnCount }}</strong>
        </div>
      </section>
    </div>
  `,
})
export class HRDemoGridComponent implements AfterViewInit, OnDestroy {
  @Input() isDark = false;
  @ViewChild('grid', { read: ElementRef }) private gridElement?: ElementRef<HTMLRevoGridElement>;

  readonly options = HR_OPTIONS;
  readonly themeOptions = HR_THEME_OPTIONS;
  readonly themeDefinitions = HR_THEME_DEFINITIONS;
  readonly loading = signal(false);
  readonly workspaceState = signal<HRWorkspaceState>(loadHRWorkspace());
  readonly workspaceStatus = signal(Object.keys(this.workspaceState()).length ? 'Saved locally' : 'View not saved');
  readonly loadingLabel = signal('Preparing rows…');
  readonly rows = signal<any[]>([]);
  readonly currentSize = signal(getHRWorkspaceRowCount(this.workspaceState(), HR_OPTIONS.map(option => option.value)));
  readonly selectedTheme = signal(HR_THEME_OPTIONS.some(option => option.value === this.workspaceState().theme)
    ? this.workspaceState().theme!
    : getInitialHRTheme());
  readonly progress = signal<HRGenerationProgress>({ loaded: 0, total: 100 });
  readonly columnTypes = signal<any>({});
  readonly performanceState = signal(createInitialHRPerformanceState());
  readonly metricDefinitions = HR_PERFORMANCE_METRICS;
  readonly getHRMetricTooltipId = getHRMetricTooltipId;
  readonly formatDuration = formatDuration;
  readonly formatFrameRate = formatFrameRate;
  readonly formatMemory = formatMemory;
  readonly plugins = [
    class HRPlugin extends BasePlugin {
      constructor(r: HTMLRevoGridElement, p: PluginProviders) {
        super(r, p);
        this.addEventListener('rowdragstart', (e) => {
          if (e.detail.model) {
            e.detail.text = e.detail.model['name'];
          }
        });
      }
    },
  ];

  readonly theme = computed(() => this.selectedTheme());
  readonly progressPercent = computed(() => getHRProgressPercent(this.progress()));
  readonly loadingDigits = computed(() => getHRLoadingDigits(this.progress()));
  private activeController?: AbortController;
  private performanceMonitor?: HRPerformanceMonitor;
  private workspaceController?: HRWorkspaceController;

  readonly columns = computed(() => {
    const rowsData = this.rows();
    const dropdownSource = Array.from(new Set(rowsData.map(r => r.company))).filter(Boolean) as string[];
    const baseCols = getBaseHRColumns(dropdownSource);

    // Apply Templates
    const nameCol = (baseCols[0] as any).children[1];
    nameCol.cellTemplate = (h: any, props: any) => h('span', { class: 'flex items-center' }, [
      h('span', { class: 'hr-avatar' }, [
        h('img', { src: props.model.avatar, alt: props.value, class: 'w-full h-full object-cover' })
      ]),
      props.value
    ]);

    const personalGroup = baseCols[1] as any;
    const ageCol = personalGroup.children[0];
    ageCol.cellTemplate = (h: any, props: any) => [
      h('i', {
        class: 'hr-circle',
        style: { borderColor: HR_COLOR_BY_AGE(props.value) }
      }),
      props.value
    ];

    const eyesCol = personalGroup.children[2];
    eyesCol.cellTemplate = (h: any, props: any) => renderHrColorPill(h, props.value);

    return applyHRWorkspaceToColumns(
      [...baseCols, ...getExtraHRColumns(getHRColumnsCount(this.currentSize()))],
      this.workspaceState(),
    );
  });

  async ngAfterViewInit() {
    if (!this.workspaceState().theme) {
      this.selectedTheme.set(getInitialHRTheme(this.isDark));
    }

    if (this.gridElement) {
      this.performanceMonitor = createHRPerformanceMonitor(
        this.gridElement.nativeElement,
        state => this.performanceState.set(state),
      );
      this.workspaceController = createHRWorkspaceController(
        this.gridElement.nativeElement,
        this.workspaceState(),
        () => this.workspaceStatus.set('Unsaved changes'),
      );
    }

    const [DateCol, NumeralCol, SelectCol] = await Promise.all([
      import('@revolist/revogrid-column-date'),
      import('@revolist/revogrid-column-numeral'),
      import('@revolist/revogrid-column-select')
    ]);

    this.columnTypes.set({
      date: withHRShortDate(new DateCol.default()),
      number: new NumeralCol.default(),
      select: new SelectCol.default(),
      colorSelect: createHRColorSelectColumnType(SelectCol.default)
    });

    this.loadData(this.currentSize());
  }

  async loadData(size: number) {
    this.activeController?.abort();
    const controller = new AbortController();
    this.activeController = controller;
    this.loading.set(true);
    this.loadingLabel.set(`Preparing ${size.toLocaleString()} rows…`);
    this.progress.set({ loaded: 0, total: size });
    const preparationStartedAt = performance.now();
    try {
      const data = await getHRData(size, {
        signal: controller.signal,
        onProgress: nextProgress => {
          this.progress.set(nextProgress);
        },
      });
      this.performanceMonitor?.setPreparationResult(
        performance.now() - preparationStartedAt,
        size,
        getHRVisibleColumnsCount(size),
      );
      this.loadingLabel.set('Rendering RevoGrid…');
      if (this.performanceMonitor) {
        await this.performanceMonitor.measureGridUpdate(() => this.rows.set(data));
      } else {
        this.rows.set(data);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
    } finally {
      if (this.activeController === controller) {
        this.loading.set(false);
        this.activeController = undefined;
      }
    }
  }

  onSizeChange(event: any) {
    const size = parseInt(event.target.value, 10);
    this.currentSize.set(size);
    this.workspaceStatus.set('Unsaved changes');
    this.loadData(size);
  }

  onThemeChange(event: Event) {
    this.selectedTheme.set((event.target as HTMLSelectElement).value);
    this.workspaceStatus.set('Unsaved changes');
  }

  async saveView() {
    if (!this.workspaceController) return;
    this.workspaceState.set(await this.workspaceController.save({
      rowCount: this.currentSize(),
      theme: this.selectedTheme(),
    }));
    this.workspaceStatus.set('Saved locally');
  }

  resetView() {
    this.workspaceController?.clear();
    this.workspaceState.set({});
    this.currentSize.set(HR_DEFAULT_ROW_COUNT);
    this.selectedTheme.set(getInitialHRTheme(this.isDark));
    this.workspaceStatus.set('View reset');
    if (this.gridElement) {
      this.gridElement.nativeElement.filter = { collection: {} };
      this.gridElement.nativeElement.sorting = undefined;
    }
    this.loadData(HR_DEFAULT_ROW_COUNT);
  }

  ngOnDestroy() {
    this.activeController?.abort();
    this.performanceMonitor?.destroy();
    this.workspaceController?.destroy();
  }
}
