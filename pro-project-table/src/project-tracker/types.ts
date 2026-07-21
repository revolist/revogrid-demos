import type { ColumnData, ColumnProp } from '@revolist/revogrid';

export type ProjectSection = 'New requests' | 'Under review' | 'Launch ready' | 'Blocked';
export type ProjectStatus = 'New' | 'In Review' | 'Ready' | 'Blocked';
export type ProjectPriority = 'High' | 'Medium' | 'Low';
export type ProjectRisk = 'High' | 'Medium' | 'Low';
export type ProjectGroupProp = '' | 'section' | 'status' | 'priority' | 'risk' | 'department' | 'owner';
export type ProjectSortValue =
  | ''
  | 'task:asc'
  | 'task:desc'
  | 'status:asc'
  | 'priority:asc'
  | 'risk:asc'
  | 'department:asc'
  | 'progress:desc'
  | 'budget:desc'
  | 'budget:asc'
  | 'rating:desc'
  | 'rating:asc';
export type ProjectBulkAction = 'delete' | 'markReady' | 'markBlocked' | 'moveLaunch';

export type ProjectRow = Record<string, any> & {
  id: string;
  task: string;
  owner: string;
  ownerName: string;
  summary: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  risk: ProjectRisk;
  department: string;
  timeline: { from: string; to: string; progress: number };
  timelineStart: string;
  timelineEnd: string;
  progress: number;
  budget: number;
  rating: number;
  skills: string[];
  section: ProjectSection;
  name: string;
  avatar: string;
  tags: string[];
  links: string[];
};

export type ProjectTaskDraft = {
  task: string;
  owner: string;
  summary: string;
  priority: ProjectPriority;
  risk: ProjectRisk;
  status: ProjectStatus;
  department: string;
  progress: number;
  from: string;
  to: string;
  budget: number;
  rating: number;
  skills: string[];
  section: ProjectSection;
};

export type ProjectSummary = {
  total: number;
  inProgress: number;
  complete: number;
  blocked: number;
  budget: number;
};

export type ProjectContextMenuController = {
  getRows: () => ProjectRow[];
  setRows: (rows: ProjectRow[]) => void;
  getColumns: () => ColumnData;
  setColumns: (columns: ColumnData) => void;
  getHiddenColumns: () => ColumnProp[];
  setHiddenColumns: (columns: ColumnProp[]) => void;
  getGrid: () => HTMLRevoGridElement | undefined | null;
  getSelectedIndexes?: () => Set<number>;
  getGroupBy?: () => ProjectGroupProp;
  clearSelection: () => void;
  setSortBy?: (value: ProjectSortValue) => void;
};
