import { Component, Input, NO_ERRORS_SCHEMA, OnDestroy, ViewEncapsulation } from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import {
  CellColumnFocusVerifyPlugin,
  ColumnStretchPlugin,
  MasterRowPlugin,
  TreeDataPlugin,
} from '@revolist/revogrid-pro';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createMasterColumns,
  createMasterRowConfig,
  createMasterRows,
  createMasterTreeConfig,
  cloneMasterRows,
  preserveExpandedMastersOnSource,
  type MasterProjectRow,
} from './row-master.shared';

@Component({
  selector: 'row-master-grid',
  standalone: true,
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
  schemas: [NO_ERRORS_SCHEMA],
  styleUrls: ['./row-master.scss'],
  template: `
    <section class="row-master-showcase" aria-label="Row Master portfolio explorer">
      <div class="row-master-source-update">
        <button class="row-master-source-update__button" type="button" (click)="refreshSource()">
          Refresh source and preserve details
        </button>
      </div>
      <revo-grid
        class="row-master-grid"
        [theme]="theme"
        [source]="source"
        [columns]="columns"
        [plugins]="plugins"
        [masterRow]="masterRow"
        [tree]="tree"
        (beforerowmastercollapse)="preserveExpandedMastersOnSource($event)"
        [readonly]="true"
        [stretch]="'last'"
        [hideAttribution]="true"
      ></revo-grid>
    </section>
  `,
})
export class RowMasterGridComponent implements OnDestroy {
  @Input()
  set rows(value: MasterProjectRow[] | undefined) {
    this.source = value?.length ? value : createMasterRows();
    this.columns = createMasterColumns(this.source);
  }

  theme: HTMLRevoGridElement['theme'] = currentTheme().isDark() ? 'darkMaterial' : 'material';
  private readonly disconnectTheme = observeCurrentTheme((isDark) => {
    this.theme = isDark ? 'darkMaterial' : 'material';
  });
  readonly plugins = [TreeDataPlugin, MasterRowPlugin, CellColumnFocusVerifyPlugin, ColumnStretchPlugin];
  readonly masterRow = createMasterRowConfig();
  readonly tree = createMasterTreeConfig();
  source = createMasterRows();
  columns = createMasterColumns(this.source);

  readonly preserveExpandedMastersOnSource = preserveExpandedMastersOnSource;

  refreshSource() {
    this.source = cloneMasterRows(this.source);
    this.columns = createMasterColumns(this.source);
  }

  ngOnDestroy() {
    this.disconnectTheme();
  }
}
