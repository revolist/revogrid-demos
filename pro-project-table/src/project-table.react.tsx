import './project-tracker.scss';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import type { ColumnProp } from '@revolist/revogrid';
import { currentTheme } from '../../composables/useRandomData';
import {
  createProjectColumns,
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
  projectGridPreset,
  projectPlugins,
  openProjectStatusHeaderFilter,
  projectOwnerProfiles,
  resolveProjectSortValueFromConfig,
  projectSkillOptions,
  syncProjectCellEdit,
  tagTone,
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
  const { isDark } = currentTheme();
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
  const gridPreset = useMemo(() => projectGridPreset, []);
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

  const runBulkAction = (action: ProjectBulkAction) => {
    if (!selectedIndexes.size) return;
    setProjectRows((next) => applyProjectBulkAction(next, selectedIndexes, action, groupBy));
    resetSelection();
  };

  const changeSort = (value: ProjectSortValue) => {
    setSortBy(value);
    void applyProjectSort(gridRef.current, columns, value);
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
        changeSort(detail.value);
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
          theme={isDark() ? 'darkMaterial' : 'material'}
          columns={columns}
          source={projectRows}
          grouping={grouping}
          gridPreset={gridPreset}
          plugins={plugins}
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
                <button type="button" className="project-modal__close" aria-label="Close task dialog" onClick={() => setTaskModalOpen(false)}>×</button>
              </div>

              <label className="project-modal__field project-modal__field--wide">
                <span>Project</span>
                <input
                  required
                  placeholder="Describe the project"
                  value={taskDraft.task}
                  onChange={(event) => setTaskDraft((next) => ({ ...next, task: event.target.value }))}
                />
              </label>
              <label className="project-modal__field project-modal__field--wide">
                <span>AI summary</span>
                <input
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
                  <input
                    value={taskDraft.progress}
                    type="number"
                    min="0"
                    max="100"
                    onChange={(event) => setTaskDraft((next) => ({ ...next, progress: Number(event.target.value) }))}
                  />
                </label>
                <label className="project-modal__field">
                  <span>Start</span>
                  <input value={taskDraft.from} type="date" onChange={(event) => setTaskDraft((next) => ({ ...next, from: event.target.value }))} />
                </label>
                <label className="project-modal__field">
                  <span>End</span>
                  <input value={taskDraft.to} type="date" onChange={(event) => setTaskDraft((next) => ({ ...next, to: event.target.value }))} />
                </label>
                <label className="project-modal__field">
                  <span>Budget</span>
                  <input
                    value={taskDraft.budget}
                    type="number"
                    min="0"
                    step="1000"
                    onChange={(event) => setTaskDraft((next) => ({ ...next, budget: Number(event.target.value) }))}
                  />
                </label>
                <label className="project-modal__field">
                  <span>Rating</span>
                  <input
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
                <button type="button" onClick={() => setTaskModalOpen(false)}>Cancel</button>
                <button type="submit" className="project-grid-primary">Create project</button>
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
            <input
              type="checkbox"
              checked={value.includes(option)}
              onChange={(event) => toggle(option, event.target.checked)}
            />
            <span className={`project-modal-skill project-skill--${modalSkillTone(option)}`}>{option}</span>
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
        {renderDraftSelectPreview(kind, value)}
        <select className="project-modal-select__native" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </span>
    </label>
  );
}

function renderDraftSelectPreview(kind: 'plain' | 'owner' | 'block' | 'department' | 'section', value: string) {
  if (kind === 'owner') {
    const profile = projectOwnerProfiles.find((owner) => owner.value === value);
    const index = Math.max(0, projectOwnerProfiles.findIndex((owner) => owner.value === value));
    return (
      <span className="project-modal-select__preview">
        <span className="project-modal-owner">
          <span className={`avatar-cell avatar-cell--${index % 8} project-avatar`}>{value.slice(0, 1)}</span>
          <span className="project-modal-select__text">{profile?.label ?? value}</span>
        </span>
      </span>
    );
  }

  if (kind === 'block') {
    return (
      <span className="project-modal-select__preview">
        <span className={`project-modal-block project-filter-block--${modalBlockTone(value)}`}>{value}</span>
      </span>
    );
  }

  if (kind === 'department') {
    return (
      <span className="project-modal-select__preview">
        <span className={`project-modal-pill project-filter-department--${tagTone(value)}`}>{value}</span>
      </span>
    );
  }

  if (kind === 'section') {
    return (
      <span className="project-modal-select__preview">
        <span className="project-modal-section" style={{ '--project-modal-section-color': modalSectionColor(value) } as React.CSSProperties}>
          <span className="project-modal-section__dot" />
          <span className="project-modal-select__text">{value}</span>
        </span>
      </span>
    );
  }

  return <span className="project-modal-select__preview"><span className="project-modal-select__text">{value}</span></span>;
}

function modalBlockTone(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('high')) return 'red';
  if (normalized.includes('review') || normalized.includes('medium')) return 'orange';
  if (normalized.includes('ready') || normalized.includes('low')) return 'green';
  if (normalized.includes('new')) return 'blue';
  return 'violet';
}

function modalSectionColor(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes('review')) return '#ff8b00';
  if (normalized.includes('ready')) return '#00c875';
  if (normalized.includes('blocked')) return '#ff4d5e';
  return '#1f7aff';
}

function modalSkillTone(value: string) {
  return projectSkillOptions.find((skill) => skill.value === value)?.tone ?? tagTone(value);
}

export default Color;
