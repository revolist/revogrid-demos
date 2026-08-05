import { Component, Input, NO_ERRORS_SCHEMA, ViewEncapsulation } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  CellColumnFocusVerifyPlugin,
  ColumnStretchPlugin,
  MasterRowPlugin,
  TreeDataPlugin,
} from '@revolist/revogrid-pro';
import {
  createMasterColumns,
  createMasterRowConfig,
  createMasterRows,
  createMasterTreeConfig,
  prefersDarkTheme,
  type MasterProjectRow,
} from './row-master.shared';
import './row-master.scss';

@Component({
  selector: 'row-master-grid',
  standalone: true,
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
  schemas: [NO_ERRORS_SCHEMA],
  template: `
    <section class="row-master-showcase" aria-label="Row Master portfolio explorer">
      <div class="row-master-toolbar">
        <div>
          <strong>Portfolio explorer</strong>
          <span>Expand a leaf initiative to open its virtualized master-detail workspace.</span>
        </div>
        <div class="row-master-toolbar__badge">Tree + master detail</div>
      </div>
      <revo-grid
        class="row-master-grid"
        [theme]="theme"
        [source]="source"
        [columns]="columns"
        [plugins]="plugins"
        [masterRow]="masterRow"
        [tree]="tree"
        [stretch]="'last'"
        [hideAttribution]="true"
      ></revo-grid>
    </section>
  `,
})
export class RowMasterGridComponent {
  @Input()
  set rows(value: MasterProjectRow[] | undefined) {
    this.source = value?.length ? value : createMasterRows();
    this.columns = createMasterColumns(this.source);
  }

  readonly theme = prefersDarkTheme() ? 'darkMaterial' : 'material';
  readonly plugins = [TreeDataPlugin, MasterRowPlugin, CellColumnFocusVerifyPlugin, ColumnStretchPlugin];
  readonly masterRow = createMasterRowConfig();
  readonly tree = createMasterTreeConfig();
  source = createMasterRows();
  columns = createMasterColumns(this.source);
}
