import questionIcon from '@fortawesome/fontawesome-free/svgs/solid/question.svg?raw';
import '@revolist/ui/styles.css';
import { UiComponent } from '@revolist/ui/angular';
import { UiControlDirective } from '@revolist/ui/angular-control';
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
import { RevoGrid } from '@revolist/angular-datagrid';
import { getHRColumnsCount, getHRData, getHRVisibleColumnsCount, HR_COMPANY_OPTIONS, HR_OPTIONS } from './sys-data/hr.data';
import { getBaseHRColumns, getExtraHRColumns, withHRShortDate } from './sys-data/hr.columns';
import { renderHrColorPill } from './hr-color-select';
import { renderHrCompanyCell } from './hr-company-avatar';
import { renderHrAgeCell } from './hr-age-indicator';
import { getInitialHRTheme, HR_THEME_DEFINITIONS, HR_THEME_OPTIONS } from './hr-themes';
import {
  createHRPerformanceMonitor,
  createInitialHRPerformanceState,
  formatDuration,
  formatFrameRate,
  formatMemory,
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
  imports: [UiComponent, UiControlDirective, RevoGrid, FormsModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="hr-demo grow h-full flex flex-col">
      <div class="hr-toolbar">
        <div class="hr-field hr-field--source">
          <span>Data Source</span>
          <rv-ui component="Dropdown"
            [props]="{ className: 'rv-select', source: options, value: currentSize(), disabled: loading(), config: { nativeTabNavigation: true, topLayer: true, ariaLabel: 'Data Source' } }"
            (valueChange)="onSizeChange($event)" />
        </div>
        <div class="hr-field">
          <span>Theme</span>
          <rv-ui component="Dropdown"
            [props]="{ className: 'rv-select', source: themeOptions, value: selectedTheme(), config: { nativeTabNavigation: true, topLayer: true, ariaLabel: 'Theme' } }"
            (valueChange)="onThemeChange($event)" />
        </div>
        <button rvControl type="button" (click)="saveView()">Save view</button>
        <button rvControl type="button" (click)="resetView()">Reset view</button>
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
            <rv-ui component="IconButton"
              [props]="{ label: 'About ' + metricDefinitions.preparation.label, title: metricDefinitions.preparation.description, icon: questionIcon }" />
          </div>
          <strong>{{ formatDuration(performanceState().preparationTime) }}</strong>
        </div>
        <div class="hr-performance-metric">
          <div class="hr-performance-label">
            <span>{{ metricDefinitions.grid.label }}</span>
            <rv-ui component="IconButton"
              [props]="{ label: 'About ' + metricDefinitions.grid.label, title: metricDefinitions.grid.description, icon: questionIcon }" />
          </div>
          <strong>{{ formatDuration(performanceState().gridRenderTime) }}</strong>
        </div>
        <div class="hr-performance-metric">
          <div class="hr-performance-label">
            <span>{{ metricDefinitions.scroll.label }}</span>
            <rv-ui component="IconButton"
              [props]="{ label: 'About ' + metricDefinitions.scroll.label, title: metricDefinitions.scroll.description, icon: questionIcon }" />
          </div>
          <strong>{{ formatFrameRate(performanceState().scrollFps) }}</strong>
        </div>
        <div class="hr-performance-metric">
          <div class="hr-performance-label">
            <span>{{ metricDefinitions.memory.label }}</span>
            <rv-ui component="IconButton"
              [props]="{ label: 'About ' + metricDefinitions.memory.label, title: metricDefinitions.memory.description, icon: questionIcon }" />
          </div>
          <strong>{{ formatMemory(performanceState().memoryUsage?.usedJSHeapSize) }}</strong>
        </div>
        <div class="hr-performance-metric">
          <div class="hr-performance-label">
            <span>{{ metricDefinitions.dataset.label }}</span>
            <rv-ui component="IconButton"
              [props]="{ label: 'About ' + metricDefinitions.dataset.label, title: metricDefinitions.dataset.description, icon: questionIcon }" />
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
  readonly columnTypes = signal<any>({});
  readonly performanceState = signal(createInitialHRPerformanceState());
  readonly metricDefinitions = HR_PERFORMANCE_METRICS;
  readonly questionIcon = questionIcon;
  readonly formatDuration = formatDuration;
  readonly formatFrameRate = formatFrameRate;
  readonly formatMemory = formatMemory;
  readonly theme = computed(() => this.selectedTheme());
  private activeController?: AbortController;
  private performanceMonitor?: HRPerformanceMonitor;
  private workspaceController?: HRWorkspaceController;

  readonly columns = computed(() => {
    const baseCols = getBaseHRColumns(HR_COMPANY_OPTIONS);

    // Apply Templates
    const companyCol = (baseCols[0] as any).children[1];
    companyCol.cellTemplate = renderHrCompanyCell;

    const personalGroup = baseCols[1] as any;
    const ageCol = personalGroup.children[0];
    ageCol.cellTemplate = renderHrAgeCell;

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
      colorSelect: new SelectCol.default()
    });

    this.loadData(this.currentSize());
  }

  async loadData(size: number) {
    this.activeController?.abort();
    const controller = new AbortController();
    this.activeController = controller;
    this.loading.set(true);
    const preparationStartedAt = performance.now();
    try {
      const data = await getHRData(size, { signal: controller.signal });
      this.performanceMonitor?.setPreparationResult(
        performance.now() - preparationStartedAt,
        size,
        getHRVisibleColumnsCount(size),
      );
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

  onSizeChange(value: unknown) {
    const size = Number(value);
    this.currentSize.set(size);
    this.workspaceStatus.set('Unsaved changes');
    this.loadData(size);
  }

  onThemeChange(value: unknown) {
    this.selectedTheme.set(String(value));
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
    this.workspaceState.set({ filter: { collection: {} } });
    this.currentSize.set(HR_DEFAULT_ROW_COUNT);
    this.selectedTheme.set(getInitialHRTheme(this.isDark));
    this.workspaceStatus.set('View reset');
    this.loadData(HR_DEFAULT_ROW_COUNT);
  }

  ngOnDestroy() {
    this.activeController?.abort();
    this.performanceMonitor?.destroy();
    this.workspaceController?.destroy();
  }
}
