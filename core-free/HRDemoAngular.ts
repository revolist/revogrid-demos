import { 
  Component, 
  Input, 
  ChangeDetectionStrategy,
  signal,
  computed,
  ViewEncapsulation
} from '@angular/core';
import type { OnInit } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RevoGrid, BasePlugin, type PluginProviders } from '@revolist/angular-datagrid';
import { getHRColumnsCount, getHRData, HR_OPTIONS } from '../sys-data/hr.data';
import type { HRGenerationProgress } from '../sys-data/hr.data.generator';
import { getBaseHRColumns, getExtraHRColumns, HR_COLOR_BY_AGE } from '../sys-data/hr.columns';
import { createHRColorSelectColumnType, renderHrColorPill } from './hr-color-select';
import { getHRLoadingDigits, getHRProgressPercent } from './hr-loading';
import './hr-demo.css';

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
        @if (loading()) {
            <div class="text-sm opacity-50 animate-pulse ml-2">Loading data...</div>
        }
      </div>

      <div class="hr-grid-wrapper flex-1 min-h-0">
        <revo-grid
          class="hr-scale-grid grow h-full w-full"
          style="height: 100%; width: 100%"
          [theme]="theme()"
          [source]="rows()"
          [columns]="columns()"
          [columnTypes]="columnTypes()"
          [plugins]="plugins"
          [filter]="true"
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
          </div>
        }
      </div>
    </div>
  `,
})
export class HRDemoGridComponent implements OnInit, OnDestroy {
  @Input() isDark = false;

  readonly options = HR_OPTIONS;
  readonly loading = signal(false);
  readonly rows = signal<any[]>([]);
  readonly currentSize = signal(100);
  readonly progress = signal<HRGenerationProgress>({ loaded: 0, total: 100 });
  readonly columnTypes = signal<any>({});
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

  readonly theme = computed(() => this.isDark ? 'darkMaterial' : 'compact');
  readonly progressPercent = computed(() => getHRProgressPercent(this.progress()));
  readonly loadingDigits = computed(() => getHRLoadingDigits(this.progress()));
  private activeController?: AbortController;

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

    return [...baseCols, ...getExtraHRColumns(getHRColumnsCount(this.currentSize()))];
  });

  async ngOnInit() {
    const [DateCol, NumeralCol, SelectCol] = await Promise.all([
      import('@revolist/revogrid-column-date'),
      import('@revolist/revogrid-column-numeral'),
      import('@revolist/revogrid-column-select')
    ]);

    this.columnTypes.set({
      date: new DateCol.default(),
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
    this.progress.set({ loaded: 0, total: size });
    try {
      const data = await getHRData(size, getHRColumnsCount(size), {
        signal: controller.signal,
        onProgress: nextProgress => {
          this.progress.set(nextProgress);
        },
      });
      this.rows.set(data);
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
    this.loadData(size);
  }

  ngOnDestroy() {
    this.activeController?.abort();
  }
}
