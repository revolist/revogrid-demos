import { avatarTemplate } from '@revolist/revogrid-pro';
import type { ColumnRegular } from '@revolist/revogrid';
import type { ProjectGroupProp, ProjectRow, ProjectSection } from './types';
import { projectOwnerProfiles } from './options';

function renderProjectAvatar(h: any, options: Parameters<typeof avatarTemplate>[1]) {
  return avatarTemplate((tag: string, props: Record<string, any> = {}, children?: any) => {
    const normalizedProps = {
      ...props,
      class: normalizeClassValue(props.class),
    };
    return h(tag, normalizedProps, normalizeVNodeChildren(children));
  }, options);
}

function normalizeClassValue(value: unknown) {
  if (!value || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeClassValue).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => !!enabled)
      .map(([className]) => className)
      .filter(Boolean)
      .join(' ');
  }
  return String(value);
}

function formatGroupLabel(groupProp: ProjectGroupProp, value: unknown) {
  if (groupProp === 'owner') {
    return projectOwnerProfiles.find((profile) => profile.value === value)?.label ?? String(value);
  }
  return String(value);
}

function createBlockColumn(
  name: string,
  prop: 'status' | 'priority' | 'risk',
  size: number,
  source: Array<{ value: string; label: string; tone: string }>,
  filterHeaderTemplate?: ColumnRegular['filterHeaderTemplate'],
): ColumnRegular {
  return {
    name,
    prop,
    size,
    filter: ['selection'],
    filterPlaceholder: 'All',
    filterHeaderTemplate,
    columnType: 'dropdown',
    sortable: true,
    dropdown: {
      source,
      renderSelectedValue: (h, selectedOptions, children) =>
        h('span', { class: `project-block project-block--${tone(selectedOptions[0]?.label)}` }, [
          h('span', { class: 'project-block__label' }, selectedOptions[0]?.label),
          ...normalizeVNodeChildren(children),
        ]),
      renderOption: (h, option) =>
        h('span', { class: `project-dropdown-option project-block project-block--${tone(option.label)}` }, [
          h('span', { class: 'project-block__label' }, option.label),
        ]),
    },
  };
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function normalizeVNodeChildren(children: any) {
  if (!children) return [];
  const values = Array.isArray(children) ? children.flat() : [children];
  return values.filter((child) => {
    if (!child) return false;
    if (typeof child !== 'object') return true;
    return Boolean(child.sel || child.text || child.elm || Object.keys(child).length);
  });
}

function tone(value: unknown) {
  const normalized = String(value).toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('high')) return 'red';
  if (normalized.includes('review') || normalized.includes('medium')) return 'orange';
  if (normalized.includes('ready') || normalized.includes('low')) return 'green';
  if (normalized.includes('new')) return 'blue';
  return 'violet';
}

function departmentTone(value: unknown) {
  const normalized = String(value).toLowerCase();
  if (normalized.includes('product')) return 'blue';
  if (normalized.includes('engineering')) return 'violet';
  if (normalized.includes('design')) return 'pink';
  if (normalized.includes('customer') || normalized.includes('support') || normalized.includes('data')) return 'cyan';
  if (normalized.includes('marketing')) return 'green';
  if (normalized.includes('security')) return 'red';
  if (normalized.includes('legal')) return 'gray';
  return 'yellow';
}

function getTaskProgress(model: ProjectRow) {
  return Math.max(0, Math.min(100, Number(model.progress ?? 0)));
}

function renderProjectRating(h: any, value: unknown) {
  const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return h('span', {
    class: 'project-rating',
    title: `${rating} of 5`,
    'aria-label': `${rating} of 5 rating`,
  }, Array.from({ length: 5 }, (_, index) =>
    h('span', { class: index < rating ? 'project-rating__star project-rating__star--active' : 'project-rating__star' }, '★'),
  ));
}

function renderProjectSkillBadge(h: any, label: unknown, className = '') {
  const value = String(label ?? '');
  return h('span', {
    class: `project-skill project-skill--${departmentTone(value)}${className ? ` ${className}` : ''}`,
    title: value,
  }, value);
}

const projectProgressThresholds = [
  { value: 0, className: 'low' },
  { value: 35, className: 'medium' },
  { value: 65, className: 'info' },
  { value: 85, className: 'high' },
];

function sectionTone(section: unknown) {
  const normalized = String(section).toLowerCase();
  if (normalized.includes('new')) return 'blue';
  if (normalized.includes('review')) return 'orange';
  if (normalized.includes('ready')) return 'green';
  if (normalized.includes('blocked')) return 'red';
  return 'blue';
}

function groupValueTone(groupProp: ProjectGroupProp, value: unknown) {
  if (groupProp === 'department') return departmentTone(value);
  if (groupProp === 'priority' || groupProp === 'risk' || groupProp === 'status') return tone(value);
  return sectionTone(value);
}

export { renderProjectAvatar, normalizeClassValue, normalizeVNodeChildren, formatGroupLabel, createBlockColumn, tone, departmentTone, getTaskProgress, renderProjectRating, renderProjectSkillBadge, projectProgressThresholds, sectionTone, groupValueTone };
