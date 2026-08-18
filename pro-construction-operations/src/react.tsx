import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import { DEFAULT_LOOK_AHEAD, DEFAULT_LOOK_AHEAD_FILTERS } from './shared/data/projections';
import { applyConstructionTaskPatch, moveLookAheadPeriod } from './shared/data/updates';
import { applySchedulerTaskChanges } from './shared/scheduler/updates';
import { allowsConstructionTaskChange } from './shared/services/validation';
import {
  createConstructionGridBindings,
  type ConstructionGridOptions,
} from './shared/grid';
import {
  constructionProjectName,
  constructionSource,
  constructionWorkAreas,
  createConstructionWorkspaceState,
  DEPARTMENT_FILTERS,
  defaultExpandedRows,
  departmentFilterLabel,
  type ConstructionWorkspaceState,
} from './shared/state';
import { displayDate } from './shared/ui';
import type {
  ConstructionScale,
  ConstructionTask,
  ConstructionView,
  ProjectDepartmentFilter,
} from './shared/types';
import './assets/styles.scss';

function Button({ children, active = false, iconOnly = false, kind = 'default', title, onClick }: React.PropsWithChildren<{
  active?: boolean;
  iconOnly?: boolean;
  kind?: 'default' | 'quiet' | 'tab';
  title?: string;
  onClick: () => void;
}>) {
  return <button
    type="button"
    className={`construction-fabrication__button construction-fabrication__button--${kind}${iconOnly ? ' construction-fabrication__button--icon-only' : ''}`}
    aria-label={iconOnly ? title : undefined}
    aria-pressed={active}
    title={title}
    onClick={onClick}
  >{children}</button>;
}

export default function ConstructionFabricationGanttDemo() {
  const initial = useMemo(createConstructionWorkspaceState, []);
  const [view, setView] = useState<ConstructionView>(initial.view);
  const [selectedProject, setSelectedProject] = useState(initial.selectedProject);
  const [period, setPeriod] = useState(initial.period);
  const [filters, setFilters] = useState(initial.filters);
  const [projectDepartment, setProjectDepartment] = useState<ProjectDepartmentFilter>('all');
  const [scale, setScale] = useState<ConstructionScale>('day-week');
  const [tasks, setTasks] = useState<ConstructionTask[]>(initial.tasks);
  const [expandedRowIds, setExpandedRowIds] = useState(initial.expandedRowIds);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isDark, setIsDark] = useState(currentTheme().isDark());

  useEffect(() => observeCurrentTheme(setIsDark), []);

  const state = useMemo<ConstructionWorkspaceState>(() => ({
    view, selectedProject, period, filters, projectDepartment, scale,
    tasks, expandedRowIds, resourcesOpen,
  }), [view, selectedProject, period, filters, projectDepartment, scale, tasks, expandedRowIds, resourcesOpen]);
  const source = useMemo(() => constructionSource(state), [state]);
  const expansionFor = useCallback((nextView: ConstructionView, projectRef = selectedProject) => {
    const nextState = { ...state, view: nextView, selectedProject: projectRef, resourcesOpen: false };
    return defaultExpandedRows(nextView, projectRef, constructionSource(nextState));
  }, [state, selectedProject]);
  const openProject = useCallback((projectRef: string) => {
    setSelectedProject(projectRef);
    setExpandedRowIds(expansionFor('project', projectRef));
    setView('project');
    setResourcesOpen(false);
    setFiltersOpen(false);
  }, [expansionFor]);
  const projectName = constructionProjectName(selectedProject);
  const gridOptions = useMemo<ConstructionGridOptions>(() => ({
    ...state,
    projectName,
    sourceForView: () => source,
    openProject,
    setTasks,
    setExpandedRowIds,
  }), [state, projectName, source, openProject]);
  const bindings = useMemo(() => createConstructionGridBindings(gridOptions), [gridOptions]);
  const gridKey = `${view}:${resourcesOpen}:${selectedProject}`;
  const showSchedule = () => { setExpandedRowIds(expansionFor('project')); setView('project'); setResourcesOpen(false); setFiltersOpen(false); };
  const showLookAhead = () => { setExpandedRowIds(expansionFor('lookahead')); setView('lookahead'); setResourcesOpen(false); setFiltersOpen(false); };
  const showResources = () => { setView('project'); setResourcesOpen(true); setFiltersOpen(false); };
  const updateDepartment = (department: typeof DEPARTMENT_FILTERS[number]) => {
    if (view === 'lookahead') setFilters((current) => ({ ...current, department }));
    else setProjectDepartment(department);
  };
  const resetFilters = () => {
    if (view === 'lookahead') setFilters({ ...DEFAULT_LOOK_AHEAD_FILTERS });
    else setProjectDepartment('all');
  };
  const gridEvents = {
    'onTree-state-changed': (event: CustomEvent<{ expandedRowIds: Set<string> }>) => setExpandedRowIds(new Set(event.detail.expandedRowIds)),
    'onGantt-before-task-change': (event: CustomEvent) => setTasks((current) => {
      if (!allowsConstructionTaskChange(event.detail, current, view === 'master')) {
        event.preventDefault();
        return current;
      }
      return applyConstructionTaskPatch(current, event.detail);
    }),
    'onEvent-scheduler-event-changed': (event: CustomEvent) => setTasks((current) => applySchedulerTaskChanges(current, event.detail)),
  } as any;
  const { source: boundSource, ...gridProperties } = bindings;

  return <section
    className={`construction-fabrication construction-fabrication--${view}${isDark ? ' construction-fabrication--dark' : ''}`}
    aria-label="Construction and Fabrication Operations"
  >
    <nav className="construction-fabrication__nav" aria-label="Schedule location">
      <Button kind="quiet" active={view === 'master'} title="Open the company project portfolio" onClick={() => { setExpandedRowIds(new Set()); setView('master'); setResourcesOpen(false); }}>Company Master</Button>
      {view !== 'master' && <>
        <span className="construction-fabrication__crumb">›</span>
        <Button kind="quiet" active={view === 'project'} onClick={showSchedule}>{projectName}</Button>
      </>}
      {view === 'lookahead' && <>
        <span className="construction-fabrication__crumb">›</span>
        <span className="construction-fabrication__crumb-current">2-week Look-Ahead</span>
      </>}
    </nav>

    <div className="construction-fabrication__workspace">
      <main className="construction-fabrication__main">
        {view !== 'master' && <div className="construction-fabrication__command-deck">
          <div className="construction-fabrication__view-tabs" role="tablist">
            <Button kind="tab" active={view === 'project' && !resourcesOpen} onClick={showSchedule}>Schedule</Button>
            <Button kind="tab" active={view === 'lookahead'} onClick={showLookAhead}>Look-Ahead</Button>
            <Button kind="tab" active={resourcesOpen} onClick={showResources}>Resources</Button>
          </div>
          <div className="construction-fabrication__command-actions">
            {view === 'project' && !resourcesOpen ? <div className="construction-fabrication__control-group">
              <span className="construction-fabrication__toolbar-label">Timeline</span>
              <div className="construction-fabrication__control-set">
                {([['Days', 'day-week'], ['Weeks', 'week-month'], ['Months', 'month-quarter']] as const).map(([label, value]) => <Button key={value} active={scale === value} onClick={() => setScale(value)}>{label}</Button>)}
              </div>
            </div> : <>
              <div className="construction-fabrication__period-summary">
                <span className="construction-fabrication__period-kicker">{resourcesOpen ? 'Resource timeline' : 'Active window'}</span>
                <strong className="construction-fabrication__period">{displayDate(period.start)} – {displayDate(period.end)}</strong>
              </div>
              <div className="construction-fabrication__control-set">
                <Button iconOnly title="Previous 14 days" onClick={() => setPeriod((value) => moveLookAheadPeriod(value, -1))}>‹</Button>
                <Button iconOnly title="Reset to the featured window" onClick={() => setPeriod({ ...DEFAULT_LOOK_AHEAD })}>↺</Button>
                <Button iconOnly title="Next 14 days" onClick={() => setPeriod((value) => moveLookAheadPeriod(value, 1))}>›</Button>
              </div>
            </>}
            {!resourcesOpen && <>
              <Button kind="quiet" active={filtersOpen} title="Filter the current schedule" onClick={() => setFiltersOpen((open) => !open)}>Filter</Button>
              {filtersOpen && <div className="construction-fabrication__filter-popover construction-fabrication__filter-popover--bound" role="dialog" aria-label="Schedule filters">
                <div className="construction-fabrication__filter-header">
                  <strong className="construction-fabrication__filter-title">Filters</strong>
                  <Button kind="quiet" onClick={resetFilters}>Reset</Button>
                </div>
                <div className="construction-fabrication__filter-body">
                  <div className="construction-fabrication__control-group">
                    <span className="construction-fabrication__toolbar-label">Department</span>
                    <div className="construction-fabrication__control-set">
                      {DEPARTMENT_FILTERS.map((department) => <Button
                        key={department}
                        active={(view === 'lookahead' ? filters.department : projectDepartment) === department}
                        onClick={() => updateDepartment(department)}
                      >{departmentFilterLabel(department)}</Button>)}
                    </div>
                  </div>
                  {view === 'lookahead' && <label className="construction-fabrication__control-group">
                    <span className="construction-fabrication__toolbar-label">Work area</span>
                    <select className="construction-fabrication__select" value={filters.workArea} onChange={(event) => setFilters((current) => ({ ...current, workArea: event.target.value }))}>
                      <option value="all">All work areas</option>
                      {constructionWorkAreas(state).map((area) => <option key={area}>{area}</option>)}
                    </select>
                  </label>}
                </div>
              </div>}
            </>}
          </div>
        </div>}
        <RevoGrid
          key={gridKey}
          className="construction-fabrication__grid skip-style cell-border"
          {...gridProperties}
          source={boundSource}
          {...gridEvents}
        />
      </main>
    </div>
  </section>;
}
