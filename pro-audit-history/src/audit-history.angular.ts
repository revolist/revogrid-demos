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
import {
  createAuditColumns,
  createAuditHistoryConfig,
  createCellFlashConfig,
  createInvoiceRows,
  createPanelOptions,
  prefersDarkTheme,
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
      <header class="audit-hero">
        <div>
          <span class="audit-eyebrow"><i></i> Live control log</span>
          <h1>Invoice review ledger</h1>
          <p>Edit any business field. Every change is attributed, reviewable, exportable, and reversible.</p>
        </div>
        <div class="audit-metrics" aria-label="Workspace metrics">
          <span><strong>8</strong> open invoices</span>
          <span><strong>4</strong> recorded actions</span>
          <span><strong>100%</strong> attributable</span>
        </div>
      </header>
      <div class="audit-hint"><span>Try it</span> Double-click a Customer, Status, Owner, Date, Amount, or Risk cell, then inspect the new record.</div>
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

  readonly theme = prefersDarkTheme() ? 'darkMaterial' : 'material';
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
    this.panelHandle?.destroy();
  }
}
