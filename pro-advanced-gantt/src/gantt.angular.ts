// src/gantt.angular.ts
import {
  Component,
  NO_ERRORS_SCHEMA,
  ViewEncapsulation,
} from '@angular/core';
import { RevoGrid } from '@revolist/angular-datagrid';
import { GanttPlugin } from '@revolist/revogrid-enterprise';
import { ExportExcelPlugin, RowStatusPlugin } from '@revolist/revogrid-pro';
import type { GanttPluginConfig } from '@revolist/revogrid-enterprise';
import {
  STANDARD_CALENDAR,
  SHOWCASE_ASSIGNMENTS,
  SHOWCASE_BASELINES,
  SHOWCASE_COLUMNS_WITH_COMPLETION,
  SHOWCASE_DEFAULT_HIDDEN,
  SHOWCASE_DEPENDENCIES,
  SHOWCASE_GANTT_CONFIG,
  SHOWCASE_RESOURCES,
  SHOWCASE_TASKS,
  renderShowcaseTaskBarColor,
  renderShowcaseTaskBarContent,
} from './shared/gantt-project-data';
import { currentTheme } from '../../composables/useRandomData';

function createGanttConfig(showCriticalPath: boolean, showBaseline: boolean): GanttPluginConfig {
  return {
    ...SHOWCASE_GANTT_CONFIG,
    visuals: {
      ...SHOWCASE_GANTT_CONFIG.visuals,
      showCriticalPath,
      showBaseline,
      taskBarColorHook: renderShowcaseTaskBarColor,
      taskBarContentHook: renderShowcaseTaskBarContent,
    },
  } as GanttPluginConfig;
}

@Component({
  selector: 'gantt-showcase-grid',
  standalone: true,
  host: {
    class: 'gantt-showcase-angular-host',
  },
  // Allows Angular demos to bind RevoGrid plugin props that are not wrapper inputs.
  schemas: [NO_ERRORS_SCHEMA],
  imports: [RevoGrid],
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./gantt.scss'],
  template: `
    <div [class]="shellClass">
      <div class="gantt-showcase-controls">
        <label class="gantt-showcase-control">
          <input
            class="gantt-showcase-control__input"
            type="checkbox"
            [checked]="showCriticalPath"
            (change)="setCriticalPath($any($event.target).checked)"
          />
          <span class="gantt-showcase-control__label">Critical path</span>
        </label>
        <label class="gantt-showcase-control">
          <input
            class="gantt-showcase-control__input"
            type="checkbox"
            [checked]="showBaseline"
            (change)="setBaseline($any($event.target).checked)"
          />
          <span class="gantt-showcase-control__label">Baselines</span>
        </label>
      </div>
      <revo-grid
        class="gantt-showcase-grid skip-style cell-border"
        [theme]="theme"
        [hideAttribution]="true"
        [readonly]="false"
        [range]="true"
        [resize]="true"
        [rowSize]="42"
        [rowHeaders]="false"
        [autoSizeColumn]="false"
        [plugins]="plugins"
        [hideColumns]="hiddenColumns"
        [source]="source"
        [columns]="columns"
        [gantt]="ganttConfig"
        [ganttDependencies]="dependencies"
        [ganttCalendars]="calendars"
        [ganttResources]="resources"
        [ganttAssignments]="assignments"
        [ganttBaselines]="baselines"
      ></revo-grid>
    </div>
  `,
})
export class GanttShowcaseGridComponent {
  readonly isDark       = currentTheme().isDark();
  readonly theme        = this.isDark ? 'darkCompact' : 'compact';
  readonly shellClass   = `gantt-showcase-shell grow h-full ${this.isDark ? 'gantt-showcase-shell--dark' : 'gantt-showcase-shell--light'}`;
  readonly plugins      = [GanttPlugin, ExportExcelPlugin, RowStatusPlugin];
  showCriticalPath      = Boolean(SHOWCASE_GANTT_CONFIG.visuals.showCriticalPath);
  showBaseline          = false;
  ganttConfig           = createGanttConfig(this.showCriticalPath, this.showBaseline);
  readonly source       = [...SHOWCASE_TASKS];
  readonly dependencies = [...SHOWCASE_DEPENDENCIES];
  readonly calendars    = [{ ...STANDARD_CALENDAR }];
  readonly resources    = [...SHOWCASE_RESOURCES];
  readonly assignments  = [...SHOWCASE_ASSIGNMENTS];
  readonly baselines    = [...SHOWCASE_BASELINES];
  readonly columns      = [...SHOWCASE_COLUMNS_WITH_COMPLETION];
  readonly hiddenColumns = [...SHOWCASE_DEFAULT_HIDDEN];

  setCriticalPath(value: boolean): void {
    this.showCriticalPath = value;
    this.ganttConfig = createGanttConfig(this.showCriticalPath, this.showBaseline);
  }

  setBaseline(value: boolean): void {
    this.showBaseline = value;
    this.ganttConfig = createGanttConfig(this.showCriticalPath, this.showBaseline);
  }
}
