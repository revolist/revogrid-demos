import type { ProjectPriority, ProjectRisk, ProjectRow, ProjectSection, ProjectStatus, ProjectTaskDraft } from './types';
import { projectOwnerProfiles } from './options';

const projectRows: ProjectRow[] = [
  row('Mobile checkout launch', 'JM', 'Launch checkout v1 for iOS and Android buyers', 'New', 'High', 'Medium', 'Product', ['React', 'TypeScript', 'Node'], '2026-05-20', '2026-06-10', 20, 75000, 4, 'New requests'),
  row('Enterprise SSO rollout', 'RK', 'Roll out SAML SSO for enterprise customers', 'New', 'Medium', 'Low', 'Engineering', ['Angular', 'Security', 'TypeScript'], '2026-05-21', '2026-07-15', 15, 120000, 5, 'New requests'),
  row('Q3 onboarding revamp', 'EH', 'Improve activation flow, docs, and guided setup', 'New', 'Medium', 'Low', 'Customer Success', ['Vue', 'Design'], '2026-05-22', '2026-06-30', 10, 60000, 3, 'New requests'),
  row('Design system token audit', 'SP', 'Audit and normalize design tokens across apps', 'New', 'Low', 'Low', 'Design', ['Design', 'TypeScript'], '2026-05-26', '2026-06-20', 5, 40000, 4, 'New requests'),
  row('AI support triage beta', 'AT', 'Pilot AI triage for L1 support tickets', 'New', 'High', 'Medium', 'Support', ['React', 'Node', 'Data'], '2026-05-27', '2026-07-01', 15, 90000, 4, 'New requests'),
  row('Pricing engine optimization', 'NR', 'Optimize quote and discount calculation performance', 'In Review', 'High', 'Medium', 'Engineering', ['Node', 'TypeScript'], '2026-04-28', '2026-06-06', 60, 110000, 5, 'Under review'),
  row('Marketing site replatform', 'LV', 'Move site to new CMS and edge stack', 'In Review', 'High', 'Medium', 'Marketing', ['Vue', 'Design'], '2026-04-15', '2026-06-05', 45, 150000, 4, 'Under review'),
  row('Data warehouse migration', 'YL', 'Migrate analytics to the new warehouse model', 'In Review', 'Medium', 'Low', 'Data', ['Data', 'Node'], '2026-04-21', '2026-05-30', 35, 90000, 3, 'Under review'),
  row('Security posture review', 'CW', 'Quarterly security and compliance review', 'Blocked', 'Low', 'High', 'Security', ['Security', 'Angular'], '2026-05-26', '2026-06-12', 0, 60000, 2, 'Under review'),
  row('New analytics dashboard', 'PG', 'Customer insights dashboard v2 for exec teams', 'Ready', 'Medium', 'Low', 'Data', ['React', 'Data'], '2026-05-01', '2026-05-19', 90, 85000, 5, 'Launch ready'),
  row('Email automation upgrade', 'JM', 'Migrate nurture journeys to the new automation platform', 'Ready', 'Medium', 'Low', 'Marketing', ['Vue', 'Node'], '2026-04-30', '2026-05-20', 80, 70000, 4, 'Launch ready'),
  row('iOS app performance boost', 'RK', 'Improve startup time, scrolling, and stability', 'Ready', 'High', 'Medium', 'Engineering', ['TypeScript', 'Node'], '2026-04-25', '2026-05-16', 95, 110000, 5, 'Launch ready'),
  row('Customer feedback portal', 'EH', 'Public feedback portal for roadmap voting', 'Ready', 'Low', 'Low', 'Product', ['React', 'Design'], '2026-04-28', '2026-05-15', 85, 60000, 4, 'Launch ready'),
  row('Partner portal v2', 'LV', 'Enhancements to partner onboarding and reporting', 'Ready', 'Medium', 'Low', 'Product', ['Vue', 'TypeScript'], '2026-05-05', '2026-05-23', 75, 140000, 4, 'Launch ready'),
  row('3rd party API integration', 'SP', 'Waiting on vendor API access and contract approval', 'Blocked', 'High', 'High', 'Engineering', ['Node', 'Security'], '2026-05-10', '2026-06-30', 0, 100000, 1, 'Blocked'),
  row('Global compliance rollout', 'AT', 'Blocked by legal review for regional requirements', 'Blocked', 'Medium', 'High', 'Legal', ['Angular', 'Security'], '2026-05-12', '2026-07-10', 0, 60000, 2, 'Blocked'),
];

export function createProjectRows(addedRows: ProjectRow[] = []): ProjectRow[] {
  return [...addedRows, ...projectRows];
}

export function createProjectTaskDraft(): ProjectTaskDraft {
  return {
    task: 'Customer expansion playbook',
    owner: 'JM',
    summary: 'Coordinate launch assets and rollout dependencies',
    priority: 'High',
    risk: 'Medium',
    status: 'New',
    department: 'Product',
    progress: 25,
    from: '2026-06-01',
    to: '2026-06-28',
    budget: 85000,
    rating: 4,
    skills: ['React', 'TypeScript'],
    section: 'New requests',
  };
}

export function createProjectTaskFromDraft(draft: ProjectTaskDraft): ProjectRow {
  return row(
    draft.task,
    draft.owner,
    draft.summary,
    draft.status,
    draft.priority,
    draft.risk,
    draft.department,
    draft.skills,
    draft.from,
    draft.to,
    Number(draft.progress),
    Number(draft.budget),
    Number(draft.rating),
    draft.section,
  );
}

function row(
  task: string,
  owner: string,
  summary: string,
  status: ProjectStatus,
  priority: ProjectPriority,
  risk: ProjectRisk,
  department: string,
  skills: string[],
  from: string,
  to: string,
  progress: number,
  budget: number,
  rating: number,
  section: ProjectSection,
): ProjectRow {
  return {
    id: slugifyProjectId(task),
    task,
    owner,
    ownerName: projectOwnerProfiles.find((profile) => profile.value === owner)?.label ?? owner,
    summary,
    status,
    priority,
    risk,
    department,
    timeline: { from, to, progress },
    timelineStart: from,
    timelineEnd: to,
    progress,
    budget,
    rating: Math.max(0, Math.min(5, Number(rating) || 0)),
    skills,
    section,
    name: owner,
    avatar: '',
    tags: [department],
    links: [],
  };
}

function slugifyProjectId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function withTimelineProgress(timeline: ProjectRow['timeline'], progress: number): ProjectRow['timeline'] {
  return { ...timeline, progress };
}
