import type { GanttTaskSourceRow } from '@revolist/gantt';

export type ConstructionDepartment = 'projects' | 'fabrication' | 'installation' | 'procurement' | 'external';
export type ConstructionView = 'master' | 'project' | 'lookahead';
export type ConstructionScale = 'day-week' | 'week-month' | 'month-quarter';

export interface ProjectEntity {
  id: string;
  projectRef: string;
  legacyTaskId: string;
  name: string;
  startDate: string;
  endDate: string;
  percentDone: number;
  notes: string;
}

export type ConstructionTask = Omit<
  GanttTaskSourceRow,
  'id' | 'parentId' | 'type' | 'startDate' | 'endDate' | 'duration'
> & {
  id: string;
  parentId: string | null;
  type: 'task' | 'summary' | 'milestone';
  startDate: string;
  endDate: string;
  duration?: number | string;
  projectRef: string;
  legacyTaskId?: string;
  entityKind: 'task' | 'execution' | 'context' | 'supplemental';
  department: ConstructionDepartment;
  departmentLabel: string;
  workArea?: string;
  wbs?: string;
  resourceName?: string;
  originalStatus?: string;
  statusLabel?: string;
  legacyPushToMaster?: string;
  generated?: boolean;
  source: 'master' | 'lookahead';
  notes?: string;
};

export interface LookAheadPeriod { start: string; end: string; }
export interface LookAheadFilters { department: 'all' | 'fabrication' | 'installation'; workArea: string; }
export type ProjectDepartmentFilter = 'all' | 'fabrication' | 'installation';

export interface ConstructionModel {
  projects: ProjectEntity[];
  tasks: ConstructionTask[];
  dependencies: any[];
  resources: any[];
  assignments: any[];
  calendars: any[];
  diagnostics: { orphanLookAheadRows: string[]; residualTaskIds: string[] };
}
