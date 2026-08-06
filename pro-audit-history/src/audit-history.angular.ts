import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NO_ERRORS_SCHEMA,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  AuditHistoryPlugin,
  CellFlashPlugin,
  EventManagerPlugin,
  defineAuditHistoryPanel,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createAuditColumns,
  createAuditHistoryConfig,
  createCellFlashConfig,
  createInvoiceRows,
  createPanelOptions,
  type InvoiceRow,
} from './audit-history.shared';
import './audit-history.scss';

@Component({
  selector: 'audit-history-grid',
  standalone: true,
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <section class="audit-showcase" aria-label="Invoice audit history workspace">
      <div class="audit-workspace">
        <revo-grid
          #grid
          class="audit-grid"
          [theme]="theme"
          [source]="source"
          [columns]="columns"
          [plugins]="plugins"
          [auditHistory]="auditHistory"
          [cellFlash]="cellFlash"
          [range]="true"
          [stretch]="'last'"
          [hideAttribution]="true"
        ></revo-grid>
        <aside #panel class="audit-panel-host"></aside>
      </div>
    </section>
  `,
})
export class AuditHistoryGridComponent implements AfterViewInit, OnDestroy {
  @ViewChild('grid', { read: ElementRef }) private gridElement!: ElementRef<HTMLRevoGridElement>;
  @ViewChild('panel', { read: ElementRef }) private panelElement!: ElementRef<HTMLElement>;
  private panelHandle?: ReturnType<typeof defineAuditHistoryPanel>;

  @Input()
  set rows(value: InvoiceRow[] | undefined) {
    this.source = value?.length ? value : createInvoiceRows();
  }

  theme: HTMLRevoGridElement['theme'] = currentTheme().isDark() ? 'darkMaterial' : 'material';
  private readonly disconnectTheme = observeCurrentTheme((isDark) => {
    this.theme = isDark ? 'darkMaterial' : 'material';
  });
  readonly columns = createAuditColumns();
  readonly plugins = [EventManagerPlugin, AuditHistoryPlugin, CellFlashPlugin];
  readonly auditHistory = createAuditHistoryConfig();
  readonly cellFlash = createCellFlashConfig();
  source = createInvoiceRows();

  ngAfterViewInit() {
    this.panelHandle = defineAuditHistoryPanel(
      this.panelElement.nativeElement,
      this.gridElement.nativeElement,
      createPanelOptions(),
    );
  }

  ngOnDestroy() {
    this.disconnectTheme();
    this.panelHandle?.destroy();
  }
}
