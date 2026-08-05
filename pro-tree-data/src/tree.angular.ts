import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  ExportExcelPlugin,
  TREE_COLLAPSE_ALL_EVENT,
  TREE_EXPAND_ALL_EVENT,
} from '@revolist/revogrid-pro';
import {
  createTreeColumns,
  createTreeConfig,
  createTreeRows,
  prefersDarkTheme,
  TREE_COLUMN_TYPES,
  TREE_EXPORT_CONFIG,
  TREE_PLUGINS,
  TREE_ROW_ORDER_CONFIG,
  TREE_ROW_SELECT_CONFIG,
} from './tree.shared';
import './tree.scss';

@Component({
  selector: 'tree-data-grid',
  standalone: true,
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
  template: `
    <section class="tree-showcase" aria-label="Tree Data organization explorer">
      <div class="tree-toolbar">
        <div class="tree-toolbar__intro">
          <span class="tree-eyebrow">Organization explorer</span>
          <strong>Interactive hierarchy</strong>
        </div>
        <div class="tree-toolbar__actions">
          <button class="tree-button" type="button" (click)="expandAll()">Expand all</button>
          <button class="tree-button" type="button" (click)="collapseAll()">Collapse all</button>
          <button class="tree-button" type="button" [disabled]="exporting" (click)="exportToExcel()">
            {{ exporting ? 'Exporting…' : 'Export to Excel' }}
          </button>
          <label class="tree-sticky">
            <input type="checkbox" [checked]="stickyParents" (change)="setStickyParents($event)" />
            Sticky parents
          </label>
        </div>
      </div>
      <revo-grid
        #grid
        class="tree-grid"
        [theme]="theme"
        [columns]="columns"
        [source]="rows"
        [plugins]="plugins"
        [columnTypes]="columnTypes"
        [rowOrder]="rowOrder"
        [rowSelect]="rowSelect"
        [tree]="treeConfig"
        [range]="true"
        [resize]="true"
        [filter]="true"
        [stretch]="true"
        [hideAttribution]="true"
      ></revo-grid>
    </section>
  `,
})
export class TreeDataGridComponent {
  @ViewChild('grid', { read: ElementRef }) gridElement?: ElementRef<HTMLRevoGridElement>;

  readonly theme = prefersDarkTheme() ? 'darkMaterial' : 'material';
  readonly rows = createTreeRows();
  readonly columns = createTreeColumns();
  readonly plugins = TREE_PLUGINS;
  readonly columnTypes = TREE_COLUMN_TYPES;
  readonly rowOrder = TREE_ROW_ORDER_CONFIG;
  readonly rowSelect = TREE_ROW_SELECT_CONFIG;
  stickyParents = true;
  exporting = false;
  treeConfig = createTreeConfig(this.rows);

  expandAll() {
    this.gridElement?.nativeElement.dispatchEvent(new CustomEvent(TREE_EXPAND_ALL_EVENT));
  }

  collapseAll() {
    this.gridElement?.nativeElement.dispatchEvent(new CustomEvent(TREE_COLLAPSE_ALL_EVENT));
  }

  setStickyParents(event: Event) {
    this.stickyParents = (event.target as HTMLInputElement).checked;
    this.treeConfig = createTreeConfig(this.rows, this.stickyParents);
  }

  async exportToExcel() {
    const grid = this.gridElement?.nativeElement;
    if (!grid) return;
    this.exporting = true;
    try {
      const gridPlugins = await grid.getPlugins();
      const exportPlugin = gridPlugins.find((plugin) => plugin instanceof ExportExcelPlugin) as ExportExcelPlugin | undefined;
      await exportPlugin?.export(TREE_EXPORT_CONFIG);
    } finally {
      this.exporting = false;
    }
  }
}
