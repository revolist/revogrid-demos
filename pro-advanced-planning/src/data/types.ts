import type { GanttTaskSourceRow } from '@revolist/gantt';

export type PlanningView = 'grid' | 'kanban' | 'gantt' | 'scheduler' | 'calendar';

export type PlanningTask = GanttTaskSourceRow & {
  id: string;
  name: string;
  color?: string;
  owner: string;
  ownerAvatar: string;
  owners: string[];
  ownerAvatars: string[];
  startDate: string;
  endDate: string;
  percentDone: number;
  order: number;
};

export const views: PlanningView[] = ['grid', 'kanban', 'gantt', 'scheduler', 'calendar'];
