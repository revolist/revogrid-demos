import {
  Component,
  Directive,
  ElementRef,
  inject,
  Input,
  ViewChild,
  type OnInit,
  type AfterViewInit,
  type OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import type { ViewSwitcherConfig, AiAssistantConfig } from '@revolist/revogrid-pro';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  attachAiAssistantResize,
  createAiDemoViewSwitcher,
  mountAiDemoViewControls,
  aiDemoCharts,
  aiDemoColumnTypes,
  aiDemoFilter,
  aiViewColumns,
  aiViewPlugins,
  aiDemoFormulaNames,
  createAiViewRows,
  createAiAssistantDemoConfig,
} from './AiAssistant.shared';
/** Bind the plugin-defined element property until it exists in the generated Core wrapper. */
@Directive({ selector: 'revo-grid[aiAssistant]', standalone: true })
export class AiAssistantConfigDirective {
  private readonly grid = inject<ElementRef<HTMLRevoGridElement>>(ElementRef);
  @Input() set formulaNames(value: typeof aiDemoFormulaNames) {
    this.grid.nativeElement.formulaNames = value;
  }
  @Input() set viewSwitcher(value: ViewSwitcherConfig | undefined) { this.grid.nativeElement.viewSwitcher = value; }
  @Input() set pivotCharts(value: typeof aiDemoCharts) { this.grid.nativeElement.pivotCharts = value; }
  @Input({ required: true }) set aiAssistant(value: AiAssistantConfig) {
    this.grid.nativeElement.aiAssistant = value;
  }
}
@Component({
  selector: 'ai-view-assistant-grid',
  standalone: true,
  imports: [RevoGrid, AiAssistantConfigDirective],
  styleUrls: ['./ai-assistant.scss'],
  encapsulation: ViewEncapsulation.None,
  template: `<div #container class="ai-view-demo">
    <div class="ai-view-demo__grid">
      <div class="ai-view-demo__toolbar" role="toolbar" aria-label="Grid controls">
        <div #controlsHost></div>
        <div #viewControls></div>
      </div>
      <div #chartSurface class="ai-view-demo__chart" hidden></div>
      <div #gridSurface class="ai-view-demo__surface">
      <revo-grid
        (aftergridinit)="onGridReady($event)"
        [source]="source"
        [columns]="columns"
        [plugins]="plugins"
        [columnTypes]="columnTypes"
        stretch="all"
        [aiAssistant]="config"
        [viewSwitcher]="views"
        [pivotCharts]="charts"
        [formulaNames]="formulaNames"
        [filter]="rowsEndpoint ? true : filter"
        [theme]="isDark ? 'darkCompact' : 'compact'"
        [hideAttribution]="true"
      ></revo-grid>
      </div>
    </div>
    <div #resizeHandle class="rv-resize-handle ai-view-demo__resize"></div>
    <aside
      #assistantHost
      class="ai-view-demo__assistant"
      aria-label="AI assistant"
    ></aside>
  </div>`,
})
export class AiAssistantGridComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('container', { static: true })
  private container!: ElementRef<HTMLElement>;
  @ViewChild('resizeHandle', { static: true })
  private resizeHandle!: ElementRef<HTMLElement>;
  private disposeResize?: () => void;
  ngAfterViewInit() {
    this.disposeResize = attachAiAssistantResize(
      this.container.nativeElement,
      this.resizeHandle.nativeElement,
    );
  }
  ngOnDestroy() {
    this.disposeResize?.();
  }
  @ViewChild('assistantHost', { static: true })
  private assistantHost!: ElementRef<HTMLElement>;
  @ViewChild('controlsHost', { static: true })
  private controlsHost!: ElementRef<HTMLElement>;
  ngOnInit() {
    this.views = createAiDemoViewSwitcher(this.gridSurface.nativeElement, this.chartSurface.nativeElement);
    this.configure();
  }
  @Input() isDark = false;
  @ViewChild('gridSurface', { static: true }) private gridSurface!: ElementRef<HTMLElement>;
  @ViewChild('chartSurface', { static: true }) private chartSurface!: ElementRef<HTMLElement>;
  @ViewChild('viewControls', { static: true }) private viewControls!: ElementRef<HTMLElement>;
  views?: ViewSwitcherConfig;
  readonly charts = aiDemoCharts;
  private grid?: HTMLRevoGridElement;
  onGridReady(event: Event) {
    this.grid = event.target as HTMLRevoGridElement;
    if (!this.remoteEndpoint) void mountAiDemoViewControls(this.grid, this.viewControls.nativeElement);
  }
  private modelEndpoint?: string;
  private remoteEndpoint?: string;
  @Input() set endpoint(value: string | undefined) {
    this.modelEndpoint = value;
    this.configure();
  }
  @Input() set rowsEndpoint(value: string | undefined) {
    this.remoteEndpoint = value;
    this.source = value ? [] : createAiViewRows();
    this.configure();
  }
  private configure() {
    this.columns = this.remoteEndpoint
      ? aiViewColumns.map((column) => ({
          ...column,
          filter: false,
          sortable: false,
        }))
      : aiViewColumns;
    this.config = createAiAssistantDemoConfig(
      this.modelEndpoint,
      this.remoteEndpoint
        ? {
            rowsEndpoint: this.remoteEndpoint,
            onRows: (rows) => {
              this.source = rows;
            },
          }
        : undefined,
      () => this.grid,
      this.assistantHost?.nativeElement,
      this.controlsHost?.nativeElement,
    );
  }
  source = createAiViewRows();
  columns = aiViewColumns;
  readonly plugins = aiViewPlugins;
  readonly columnTypes = aiDemoColumnTypes;
  readonly filter = aiDemoFilter;
  readonly formulaNames = aiDemoFormulaNames;
  config = createAiAssistantDemoConfig(undefined, undefined, () => this.grid);
}
