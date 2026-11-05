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
import type { AiAssistantConfig } from '@revolist/revogrid-pro';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  attachAiAssistantResize,
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
      <div
        #controlsHost
        class="ai-view-demo__toolbar"
        role="toolbar"
        aria-label="Grid controls"
      ></div>
      <revo-grid
        (aftergridinit)="onGridReady($event)"
        [source]="source"
        [columns]="columns"
        [plugins]="plugins"
        [aiAssistant]="config"
        [formulaNames]="formulaNames"
        [filter]="true"
        [theme]="isDark ? 'darkCompact' : 'compact'"
        [hideAttribution]="true"
      ></revo-grid>
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
    this.configure();
  }
  @Input() isDark = false;
  private grid?: HTMLRevoGridElement;
  onGridReady(event: Event) {
    this.grid = event.target as HTMLRevoGridElement;
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
  readonly formulaNames = aiDemoFormulaNames;
  config = createAiAssistantDemoConfig(undefined, undefined, () => this.grid);
}
