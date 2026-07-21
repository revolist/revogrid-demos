import type { ProjectRow, ProjectSummary } from './types';
import { projectOwnerProfiles, projectSections, projectSkillOptions } from './options';
import { unique } from './utils';

export function getProjectFilterOptions(rows: ProjectRow[]) {
  return {
    owners: projectOwnerProfiles.map((owner) => owner.value),
    priorities: unique(rows.map((row) => row.priority)),
    statuses: unique(rows.map((row) => row.status)),
    risks: unique(rows.map((row) => row.risk)),
    departments: unique(rows.map((row) => row.department)),
    skills: projectSkillOptions.map((skill) => skill.value),
    sections: [...projectSections],
  };
}

export function getProjectSummary(rows: ProjectRow[]): ProjectSummary {
  return {
    total: rows.length,
    inProgress: rows.filter((row) => row.status === 'New' || row.status === 'In Review').length,
    complete: rows.filter((row) => row.status === 'Ready').length,
    blocked: rows.filter((row) => row.status === 'Blocked').length,
    budget: rows.reduce((sum, row) => sum + Number(row.budget || 0), 0),
  };
}

export function formatProjectBudget(value: number) {
  return `$${value.toLocaleString('en-US')}`;
}
