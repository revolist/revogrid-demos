// src/components/gantt/GanttShowcase.tsx
import './gantt-showcase.scss';
import React, { useMemo, useRef, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { GanttPlugin } from '@revolist/revogrid-enterprise';
import { ExportExcelPlugin, RowStatusPlugin } from '@revolist/revogrid-pro';
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
import type { GanttPluginConfig } from '@revolist/revogrid-enterprise';
import { currentTheme } from '../../composables/useRandomData';

const plugins = [GanttPlugin, ExportExcelPlugin, RowStatusPlugin];
const source      = [...SHOWCASE_TASKS];
const dependencies = [...SHOWCASE_DEPENDENCIES];
const calendars    = [{ ...STANDARD_CALENDAR }];
const resources    = [...SHOWCASE_RESOURCES];
const assignments  = [...SHOWCASE_ASSIGNMENTS];
const baselines    = [...SHOWCASE_BASELINES];
const columns      = [...SHOWCASE_COLUMNS_WITH_COMPLETION];
const hiddenColumns = [...SHOWCASE_DEFAULT_HIDDEN];

function GanttShowcase() {
  const { isDark } = currentTheme();
  const darkTheme = isDark();
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const [showCriticalPath, setShowCriticalPath] = useState(Boolean(SHOWCASE_GANTT_CONFIG.visuals.showCriticalPath));
  const [showBaseline, setShowBaseline] = useState(false);
  const ganttConfig: GanttPluginConfig = useMemo(() => ({
    ...SHOWCASE_GANTT_CONFIG,
    visuals: {
      ...SHOWCASE_GANTT_CONFIG.visuals,
      showCriticalPath,
      showBaseline,
      taskBarColorHook: renderShowcaseTaskBarColor,
      taskBarContentHook: renderShowcaseTaskBarContent,
    },
  } as GanttPluginConfig), [showCriticalPath, showBaseline]);

  return (
    <div className={`gantt-showcase-shell grow h-full ${darkTheme ? 'gantt-showcase-shell--dark' : 'gantt-showcase-shell--light'}`}>
      <div className="gantt-showcase-controls">
        <label className="gantt-showcase-control">
          <input
            className="gantt-showcase-control__input"
            type="checkbox"
            checked={showCriticalPath}
            onChange={(event) => setShowCriticalPath(event.currentTarget.checked)}
          />
          <span className="gantt-showcase-control__label">Critical path</span>
        </label>
        <label className="gantt-showcase-control">
          <input
            className="gantt-showcase-control__input"
            type="checkbox"
            checked={showBaseline}
            onChange={(event) => setShowBaseline(event.currentTarget.checked)}
          />
          <span className="gantt-showcase-control__label">Baselines</span>
        </label>
      </div>
      <RevoGrid
        ref={gridRef}
        className="gantt-showcase-grid"
        theme={darkTheme ? 'darkCompact' : 'compact'}
        hideAttribution
        readonly={false}
        range
        resize
        rowSize={42}
        rowHeaders={false}
        autoSizeColumn={false}
        plugins={plugins}
        hideColumns={hiddenColumns}
        source={source}
        columns={columns}
        gantt={ganttConfig}
        ganttDependencies={dependencies}
        ganttCalendars={calendars}
        ganttResources={resources}
        ganttAssignments={assignments}
        ganttBaselines={baselines}
      />
    </div>
  );
}

export default GanttShowcase;
