import '@revolist/ui/styles.css';
import { ChangeDetectorRef, Component, ElementRef, inject, NO_ERRORS_SCHEMA, type AfterViewInit, type OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  ExportExcelPlugin,
  TREE_COLLAPSE_ALL_EVENT,
  TREE_EXPAND_ALL_EVENT,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createTreeColumns,
  createTreeConfig,
  createTreeFilterConfig,
  createTreeRows,
  TREE_COLUMN_TYPES,
  TREE_DATA_GRID_CONTEXT_MENU,
  TREE_DATA_GRID_FORMATTING,
  TREE_EXPORT_CONFIG,
  TREE_PLUGINS,
  TREE_ROW_ORDER_CONFIG,
  TREE_ROW_SELECT_CONFIG,
  TREE_STICKY_CELLS_CONFIG,
} from './tree.shared';
import { mountTreeToolbar } from './tree.toolbar';

@Component({
  selector: 'tree-data-grid',
  standalone: true,
  imports: [RevoGrid],
  schemas: [NO_ERRORS_SCHEMA],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./tree.scss'],
  template: `
    <section class="tree-showcase" aria-label="Tree Data organization explorer">
      <div #toolbar></div>
      <revo-grid
        #grid
        class="tree-grid"
        [theme]="theme"
        [plugins]="plugins"
        [columns]="columns"
        [source]="rows"
        [columnTypes]="columnTypes"
        [rowOrder]="rowOrder"
        [rowSelect]="rowSelect"
        [tree]="treeConfig"
        [stickyCells]="stickyCells"
        [range]="true"
        [readonly]="true"
        [resize]="true"
        [filter]="filterConfig"
        [dataGridFormatting]="dataGridFormatting"
        [dataGridContextMenu]="dataGridContextMenu"
        (tree-state-changed)="handleTreeState($event)"
        [stretch]="true"
        [hideAttribution]="true"
      ></revo-grid>
    </section>
  `,
})
export class TreeDataGridComponent implements AfterViewInit, OnDestroy {
  @ViewChild('grid', { read: ElementRef }) gridElement?: ElementRef<HTMLRevoGridElement>;

  @ViewChild('toolbar', { read: ElementRef, static: true }) toolbar!: ElementRef<HTMLElement>;
  private readonly changeDetector = inject(ChangeDetectorRef);
  private unmountToolbar?: () => void;

  theme: HTMLRevoGridElement['theme'] = currentTheme().isDark() ? 'darkMaterial' : 'material';
  private readonly disconnectTheme = observeCurrentTheme((isDark) => {
    this.theme = isDark ? 'darkMaterial' : 'material';
  });
  readonly rows = createTreeRows();
  readonly filterConfig = createTreeFilterConfig(this.rows);
  readonly dataGridFormatting = TREE_DATA_GRID_FORMATTING;
  readonly dataGridContextMenu = TREE_DATA_GRID_CONTEXT_MENU;
  columns = createTreeColumns(this.rows);
  readonly plugins = TREE_PLUGINS;
  readonly columnTypes = TREE_COLUMN_TYPES;
  readonly rowOrder = TREE_ROW_ORDER_CONFIG;
  readonly rowSelect = TREE_ROW_SELECT_CONFIG;
  readonly stickyCells = TREE_STICKY_CELLS_CONFIG;
  stickyParents = true;
  expandedRowIds: Set<string> | undefined;
  treeConfig = createTreeConfig(this.rows);

  ngAfterViewInit() {
    this.unmountToolbar = mountTreeToolbar(this.toolbar.nativeElement, {
      expandAll: () => this.expandAll(),
      collapseAll: () => this.collapseAll(),
      exportToExcel: () => this.exportToExcel(),
      setStickyParents: checked => this.setStickyParents(checked),
    });
  }

  ngOnDestroy() {
    this.unmountToolbar?.();
    this.disconnectTheme();
  }

  expandAll() {
    this.gridElement?.nativeElement.dispatchEvent(new CustomEvent(TREE_EXPAND_ALL_EVENT));
  }

  collapseAll() {
    this.gridElement?.nativeElement.dispatchEvent(new CustomEvent(TREE_COLLAPSE_ALL_EVENT));
  }

  setStickyParents(checked: boolean) {
    this.stickyParents = checked;
    this.treeConfig = createTreeConfig(this.rows, {
      expandedRowIds: this.expandedRowIds,
      stickyParents: this.stickyParents,
    });
    this.columns = createTreeColumns(this.rows, this.stickyParents);
    this.changeDetector.markForCheck();
  }

  handleTreeState(event: CustomEvent<{ expandedRowIds: Set<string> }>) {
    this.expandedRowIds = new Set(event.detail.expandedRowIds);
    this.treeConfig = createTreeConfig(this.rows, {
      expandedRowIds: this.expandedRowIds,
      stickyParents: this.stickyParents,
    });
  }

  async exportToExcel() {
    const grid = this.gridElement?.nativeElement;
    if (!grid) return;
    const gridPlugins = await grid.getPlugins();
    const exportPlugin = gridPlugins.find((plugin) => plugin instanceof ExportExcelPlugin) as ExportExcelPlugin | undefined;
    await exportPlugin?.export(TREE_EXPORT_CONFIG);
  }
}
