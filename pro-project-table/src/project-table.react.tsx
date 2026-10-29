import '@revolist/ui/styles.css';
import { ButtonControl as UiButton, Input as UiInput, Select as UiSelect } from '@revolist/ui/react-control';
import './project-tracker.scss';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import type { ColumnProp } from '@revolist/revogrid';
import { currentTheme, observeCurrentTheme } from '../../composables/useRandomData';
import {
  createProjectColumns,
  createProjectColumnTypes,
  createProjectColumnAddPopupConfig,
  createProjectContextMenus,
  createProjectGrouping,
  createProjectRows,
  createProjectTaskDraft,
  createProjectTaskFromDraft,
  applyProjectBulkAction,
  applyProjectSort,
  clearProjectSelection,
  getProjectFilterOptions,
  getProjectHideableColumns,
  getSelectedProjectIndexes,
  projectFilterConfig,
  projectPlugins,
  projectRowOrder,
  projectRowSelect,
  openProjectStatusHeaderFilter,
  projectOwnerProfiles,
  resolveProjectSortValueFromConfig,
  syncProjectCellEdit,
  updateProjectCollapsedGroups,
  defineProjectTrackerToolbarElement,
  PROJECT_TRACKER_TOOLBAR_ACTION_EVENT,
  PROJECT_TRACKER_TOOLBAR_TAG,
  type ProjectBulkAction,
  type ProjectGroupProp,
  type ProjectRow,
  type ProjectSortValue,
  type ProjectTaskDraft,
  type ProjectTrackerToolbarActionEvent,
  type ProjectTrackerToolbarElement,
} from './project-tracker.shared';

defineProjectTrackerToolbarElement();

function Color() {
  const [isDark, setIsDark] = useState(() => currentTheme().isDark());
  const shellRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const toolbarRef = useRef<ProjectTrackerToolbarElement>(null);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>(() => createProjectRows());
  const [hiddenColumns, setHiddenColumns] = useState<ColumnProp[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(() => new Set());
  const [selectedRowsCount, setSelectedRowsCount] = useState(0);
  const [groupBy, setGroupBy] = useState<ProjectGroupProp>('section');
  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [sortBy, setSortBy] = useState<ProjectSortValue>('');
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<ProjectTaskDraft>(() => createProjectTaskDraft());

  const options = useMemo(() => getProjectFilterOptions(projectRows), [projectRows]);
  const [columns, setColumns] = useState(() => createProjectColumns());
  const columnTypes = useMemo(() => createProjectColumnTypes(), []);
  const plugins = useMemo(() => projectPlugins, []);
  const grouping = useMemo(() => createProjectGrouping(() => projectRows, groupBy, groupsExpanded, collapsedGroups), [projectRows, groupBy, groupsExpanded, collapsedGroups]);
  const RevoGridComponent = RevoGrid as any;

  useEffect(() => {
    if (!toolbarRef.current) {
      return;
    }
    toolbarRef.current.state = {
      totalRows: projectRows.length,
      selectedRowsCount,
      groupBy,
      groupsExpanded,
      sortBy,
      hiddenColumns,
      hideableColumns: getProjectHideableColumns(columns),
    };
  }, [columns, groupBy, groupsExpanded, hiddenColumns, projectRows.length, selectedRowsCount, sortBy]);

  const openTaskModal = () => {
    setTaskDraft(createProjectTaskDraft());
    setTaskModalOpen(true);
  };

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    setProjectRows((next) => [createProjectTaskFromDraft(taskDraft), ...next]);
    setTaskModalOpen(false);
  };

  const resetSelection = () => {
    clearProjectSelection(gridRef.current);
    setSelectedIndexes(new Set());
    setSelectedRowsCount(0);
  };

  const contextMenus = useMemo(() => createProjectContextMenus({
    getRows: () => projectRows,
    setRows: setProjectRows,
    getColumns: () => columns,
    setColumns: (nextColumns) => setColumns(nextColumns as ReturnType<typeof createProjectColumns>),
    getHiddenColumns: () => hiddenColumns,
    setHiddenColumns,
    getGrid: () => gridRef.current,
    getSelectedIndexes: () => selectedIndexes,
    getGroupBy: () => groupBy,
    clearSelection: resetSelection,
    setSortBy,
  }), [columns, groupBy, hiddenColumns, projectRows, selectedIndexes]);

  const columnAddPopup = useMemo(() => createProjectColumnAddPopupConfig({
    getRows: () => projectRows,
    setRows: setProjectRows,
    getColumns: () => columns,
    setColumns: (nextColumns) => setColumns(nextColumns as ReturnType<typeof createProjectColumns>),
    getHiddenColumns: () => hiddenColumns,
    setHiddenColumns,
    getGrid: () => gridRef.current,
    getSelectedIndexes: () => selectedIndexes,
    clearSelection: resetSelection,
    setSortBy,
  }), [columns, hiddenColumns, projectRows, selectedIndexes]);

  const additionalData = useMemo(() => ({
    columnAddPopup,
  }), [columnAddPopup]);

  useEffect(() => observeCurrentTheme(setIsDark), []);

  const runBulkAction = (action: ProjectBulkAction) => {
    if (!selectedIndexes.size) return;
    setProjectRows((next) => applyProjectBulkAction(next, selectedIndexes, action, groupBy));
    resetSelection();
  };

  const changeSort = (value: ProjectSortValue, additive = false) => {
    setSortBy(value);
    void applyProjectSort(gridRef.current, columns, value, additive);
  };

  const toggleHiddenColumn = (prop: ColumnProp, visible: boolean) => {
    setHiddenColumns((next) => visible
      ? next.filter((column) => column !== prop)
      : Array.from(new Set([...next, prop])));
  };

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const handleToolbarAction = (event: Event) => {
      const detail = (event as ProjectTrackerToolbarActionEvent).detail;
      if (detail.action === 'new') {
        openTaskModal();
        return;
      }
      if (detail.action === 'filter') {
        openProjectStatusHeaderFilter(gridRef.current);
        return;
      }
      if (detail.action === 'toggleGroups') {
        setGroupsExpanded((expanded) => !expanded);
        setCollapsedGroups(new Set());
        return;
      }
      if (detail.action === 'group') {
        setGroupBy(detail.value);
        if (detail.value) setGroupsExpanded(true);
        setCollapsedGroups(new Set());
        return;
      }
      if (detail.action === 'sort') {
        changeSort(detail.value, detail.additive);
        return;
      }
      if (detail.action === 'bulk') {
        runBulkAction(detail.value);
        return;
      }
      if (detail.action === 'hideColumn') {
        toggleHiddenColumn(detail.prop, detail.visible);
      }
    };
    toolbar.addEventListener(PROJECT_TRACKER_TOOLBAR_ACTION_EVENT, handleToolbarAction);
    return () => toolbar.removeEventListener(PROJECT_TRACKER_TOOLBAR_ACTION_EVENT, handleToolbarAction);
  }, [columns, selectedIndexes]);

  return (
    <div className="project-grid-host">
      <div className="project-grid-shell" ref={shellRef}>
        {React.createElement(PROJECT_TRACKER_TOOLBAR_TAG, { ref: toolbarRef })}

        <RevoGridComponent
          ref={gridRef}
          className="project-tracker-grid skip-style color-grid cell-border"
          theme={isDark ? 'darkMaterial' : 'material'}
          canMoveColumns={true}
          columns={columns}
          columnTypes={columnTypes}
          source={projectRows}
          grouping={grouping}
          plugins={plugins}
          rowOrder={projectRowOrder}
          rowSelect={projectRowSelect}
          stretch="last"
          filter={projectFilterConfig}
          hideColumns={hiddenColumns}
          rowContextMenu={contextMenus.rowContextMenu}
          columnContextMenu={contextMenus.columnContextMenu}
          columnAddPopup={columnAddPopup}
          additionalData={additionalData}
          rowSize={44}
          resize
          hideAttribution
          onToggleHideColumn={(event: CustomEvent<ColumnProp[]>) => setHiddenColumns([...event.detail])}
          onCelleditapply={(event: CustomEvent) => {
            setProjectRows((next) => syncProjectCellEdit(next, event.detail));
          }}
          onSortingconfigchanged={(event: CustomEvent<unknown>) => {
            setSortBy(resolveProjectSortValueFromConfig(event.detail));
          }}
          onRowselected={(event: CustomEvent<HTMLRevoGridElementEventMap['rowselected']>) => {
            setSelectedIndexes(getSelectedProjectIndexes(event));
            setSelectedRowsCount(event.detail.count);
          }}
          onGroupexpandclick={(event: CustomEvent<{ model?: Record<string, unknown> }>) => {
            queueMicrotask(() => {
              setCollapsedGroups((current) => {
                const next = new Set(updateProjectCollapsedGroups(event, current));
                setGroupsExpanded(next.size === 0);
                return next;
              });
            });
          }}
        />

        {isTaskModalOpen && (
          <div
            className="project-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setTaskModalOpen(false);
            }}
          >
            <form className="project-modal" onSubmit={addTask}>
              <div className="project-modal__header">
                <div>
                  <p>New project</p>
                  <h2>Pipeline details</h2>
                </div>
                <UiButton type="button" className="project-modal__close" aria-label="Close task dialog" onClick={() => setTaskModalOpen(false)}>×</UiButton>
              </div>

              <label className="project-modal__field project-modal__field--wide">
                <span>Project</span>
                <UiInput
                  required
                  placeholder="Describe the project"
                  value={taskDraft.task}
                  onChange={(event) => setTaskDraft((next) => ({ ...next, task: event.target.value }))}
                />
              </label>
              <label className="project-modal__field project-modal__field--wide">
                <span>AI summary</span>
                <UiInput
                  required
                  placeholder="Short project summary"
                  value={taskDraft.summary}
                  onChange={(event) => setTaskDraft((next) => ({ ...next, summary: event.target.value }))}
                />
              </label>

              <div className="project-modal__grid">
                <DraftSelect kind="owner" label="Owner" value={taskDraft.owner} options={options.owners} onChange={(owner) => setTaskDraft((next) => ({ ...next, owner }))} />
                <DraftChecks label="Skills" value={taskDraft.skills} options={options.skills} onChange={(skills) => setTaskDraft((next) => ({ ...next, skills }))} />
                <DraftSelect kind="block" label="Priority" value={taskDraft.priority} options={options.priorities} onChange={(priority) => setTaskDraft((next) => ({ ...next, priority }))} />
                <DraftSelect kind="block" label="Risk" value={taskDraft.risk} options={options.risks} onChange={(risk) => setTaskDraft((next) => ({ ...next, risk }))} />
                <DraftSelect kind="block" label="Status" value={taskDraft.status} options={options.statuses} onChange={(status) => setTaskDraft((next) => ({ ...next, status }))} />
                <DraftSelect kind="department" label="Department" value={taskDraft.department} options={options.departments} onChange={(department) => setTaskDraft((next) => ({ ...next, department }))} />
                <label className="project-modal__field">
                  <span>Progress</span>
                  <UiInput
                    value={taskDraft.progress}
                    type="number"
                    min="0"
                    max="100"
                    onChange={(event) => setTaskDraft((next) => ({ ...next, progress: Number(event.target.value) }))}
                  />
                </label>
                <label className="project-modal__field">
                  <span>Start</span>
                  <UiInput value={taskDraft.from} type="date" onChange={(event) => setTaskDraft((next) => ({ ...next, from: event.target.value }))} />
                </label>
                <label className="project-modal__field">
                  <span>End</span>
                  <UiInput value={taskDraft.to} type="date" onChange={(event) => setTaskDraft((next) => ({ ...next, to: event.target.value }))} />
                </label>
                <label className="project-modal__field">
                  <span>Budget</span>
                  <UiInput
                    value={taskDraft.budget}
                    type="number"
                    min="0"
                    step="1000"
                    onChange={(event) => setTaskDraft((next) => ({ ...next, budget: Number(event.target.value) }))}
                  />
                </label>
                <label className="project-modal__field">
                  <span>Rating</span>
                  <UiInput
                    value={taskDraft.rating}
                    type="number"
                    min="0"
                    max="5"
                    step="1"
                    onChange={(event) => setTaskDraft((next) => ({ ...next, rating: Number(event.target.value) }))}
                  />
                </label>
                <DraftSelect
                  label="Section"
                  kind="section"
                  value={taskDraft.section}
                  options={options.sections}
                  onChange={(section) => setTaskDraft((next) => ({ ...next, section }))}
                />
              </div>

              <div className="project-modal__footer">
                <UiButton type="button" onClick={() => setTaskModalOpen(false)}>Cancel</UiButton>
                <UiButton type="submit" className="project-grid-primary">Create project</UiButton>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function DraftChecks({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: string[];
  onChange(value: string[]): void;
}) {
  const toggle = (option: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...value, option]))
      : value.filter((item) => item !== option);
    onChange(next.length ? next : value);
  };

  return (
    <fieldset className="project-modal__field project-modal__field--wide project-modal__checks">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option}>
            <UiInput
              type="checkbox"
              checked={value.includes(option)}
              onChange={(event) => toggle(option, event.target.checked)}
            />
            <span >{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function DraftSelect({
  kind = 'plain',
  label,
  value,
  options,
  onChange,
}: {
  kind?: 'plain' | 'owner' | 'block' | 'department' | 'section';
  label: string;
  value: string;
  options: string[];
  onChange(value: string): void;
}) {
  return (
    <label className="project-modal__field project-modal__field--select">
      <span>{label}</span>
      <span className="project-modal-select">
        <UiSelect className="project-modal-select__native" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{kind === 'owner' ? projectOwnerProfiles.find(owner => owner.value === option)?.label ?? option : option}</option>)}
        </UiSelect>
      </span>
    </label>
  );
}


export default Color;
