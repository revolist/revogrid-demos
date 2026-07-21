import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  Input,
  NO_ERRORS_SCHEMA,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevoGrid, type DataType } from '@revolist/angular-datagrid';
import { filterPivotSource, type PivotConfig } from '@revolist/revogrid-enterprise';
import { currentTheme } from '../../composables/useRandomData';
import {
  FINANCIAL_COLUMNS,
  FINANCIAL_COLUMN_TYPES,
  FINANCIAL_MULTI_ROW_HEADER,
  FINANCIAL_SHOWCASE_PLUGINS,
  applyFinancialPivotOptions,
  createFinancialPreset,
  getFinancialKpis,
  resolveFinancialRows,
  type FinancialPresetId,
} from './financial.pivot';
import {
  defineFinancialPivotHeaderElement,
  type FinancialPivotHeaderState,
} from './financial-pivot-header';
import { defineFinancialPivotGuidanceElement } from './financial-pivot-guidance';

defineFinancialPivotHeaderElement();
defineFinancialPivotGuidanceElement();

const isSmallScreen = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

@Component({
  selector: 'pivot-showcase-grid',
  standalone: true,
  imports: [RevoGrid, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./financial-pivot-header.scss'],
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <div
      class="financial-pivot-showcase grow flex flex-col gap-2 h-full p-2 box-border"
      [style.position]="expanded() ? 'fixed' : null"
      [style.inset]="expanded() ? '8px' : null"
      [style.z-index]="expanded() ? 1000 : null"
      [style.background]="expanded() ? 'var(--financial-pivot-expanded-background)' : null"
    >
      <financial-pivot-header
        [state]="headerState"
        (financial-pivot-preset-select)="selectPreset($any($event).detail)"
        (financial-pivot-configurator-toggle)="configuratorVisible.set(!configuratorVisible())"
        (financial-pivot-expanded-toggle)="expanded.set(!expanded())"
        (financial-pivot-reset)="resetDemo()"
      ></financial-pivot-header>

      <financial-pivot-guidance
        [visible]="guidanceVisible()"
        [config]="pivotSignal()"
        (financial-pivot-guidance-dismiss)="guidanceVisible.set(false)"
      ></financial-pivot-guidance>

      <div class="grow min-h-0 overflow-auto">
        <div
          class="pivot-grid-container h-full overflow-hidden"
          [style.min-width]="configuratorVisible() ? '920px' : '680px'"
        >
          <revo-grid
            #gridElement
            class="overflow-hidden skip-style h-full min-h-0 cell-border"
            [hideAttribution]="true"
            [range]="true"
            [resize]="true"
            [filter]="true"
            [multiRowHeader]="multiRowHeader"
            [colSize]="180"
            [source]="rows"
            [columns]="FINANCIAL_COLUMNS"
            [pivot]="pivot()"
            [theme]="theme"
            [plugins]="plugins"
            [columnTypes]="columnTypes"
            [readonly]="true"
            (pivot-config-update)="configUpdate($event)"
          ></revo-grid>
        </div>
      </div>
    </div>
  `,
})
export class PivotShowcaseGridComponent {
  @Input() rows: DataType[] = resolveFinancialRows();
  @ViewChild('gridElement', { read: ElementRef })
  gridElement?: ElementRef<HTMLRevoGridElement & { pivot?: PivotConfig }>;

  readonly FINANCIAL_COLUMNS = FINANCIAL_COLUMNS;
  readonly columnTypes = FINANCIAL_COLUMN_TYPES;
  readonly multiRowHeader = FINANCIAL_MULTI_ROW_HEADER;
  readonly plugins = FINANCIAL_SHOWCASE_PLUGINS;
  readonly theme = currentTheme().isDark() ? 'darkCompact' : 'compact';

  readonly pivotSignal = signal<PivotConfig>(createFinancialPreset());
  readonly activePreset = signal<FinancialPresetId>('sales');
  readonly configuratorVisible = signal(!isSmallScreen());
  readonly guidanceVisible = signal(true);
  readonly expanded = signal(false);

  get headerState(): FinancialPivotHeaderState {
    return {
      activePreset: this.activePreset(),
      configuratorVisible: this.configuratorVisible(),
      expanded: this.expanded(),
      kpis: getFinancialKpis(
        this.filteredRows(),
        this.activePreset(),
      ),
    };
  }

  readonly filteredRows = computed(() => filterPivotSource(
    this.rows as ReturnType<typeof resolveFinancialRows>,
    this.pivotSignal(),
  ));

  readonly pivot = computed(() => applyFinancialPivotOptions(
    this.pivotSignal(),
    this.rows,
    this.configuratorVisible(),
  ));

  configUpdate(event: CustomEvent<PivotConfig>) {
    this.pivotSignal.set(event.detail || createFinancialPreset());
  }

  selectPreset(id: FinancialPresetId) {
    this.replacePivot(createFinancialPreset(id), id);
  }

  resetDemo() {
    this.replacePivot(createFinancialPreset(), 'sales');
    this.configuratorVisible.set(!isSmallScreen());
    this.guidanceVisible.set(true);
    this.expanded.set(false);
  }

  private replacePivot(config: PivotConfig, preset: FinancialPresetId) {
    if (this.gridElement) this.gridElement.nativeElement.pivot = undefined;
    window.setTimeout(() => {
      this.pivotSignal.set(config);
      this.activePreset.set(preset);
    });
  }
}
