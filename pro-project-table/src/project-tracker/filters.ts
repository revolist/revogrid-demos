import type { ColumnFilterConfig } from '@revolist/revogrid';
import { projectOwnerProfiles } from './options';
import { departmentTone, renderProjectAvatar, renderProjectSkillBadge, tone } from './renderers';

function renderBlockFilterOption(h: any, label: string) {
  return h('span', { class: `project-filter-block project-filter-block--${tone(label)}` }, [
    h('span', { class: 'project-block__label' }, label),
  ]);
}

function renderDepartmentFilterOption(h: any, label: string) {
  return h('span', { class: `project-filter-department project-filter-department--${departmentTone(label)}` }, [
    h('span', { class: 'project-department__label' }, label),
  ]);
}

function renderSkillFilterOption(h: any, label: string) {
  return renderProjectSkillBadge(h, label, 'project-filter-skill');
}

function renderHeaderSelectionTemplate(
  h: any,
  options: {
    values: Array<{ value: string; label: string; count?: number }>;
    active: boolean;
    text: string;
    showCount?: boolean;
    kind: 'block' | 'department';
  },
) {
  if (!options.active || options.values.length === 0) {
    return h('span', { class: 'project-filter-header-empty' }, options.text);
  }

  const visibleValues = options.values.slice(0, 1);
  const hiddenCount = options.values.length - visibleValues.length;
  const itemClass = options.kind === 'department'
    ? 'project-filter-header-department'
    : 'project-filter-header-block';

  return h('span', { class: `project-filter-header-values project-filter-header-values--${options.kind}` }, [
    ...visibleValues.map((value) => {
      const label = value.label || value.value;
      const toneName = options.kind === 'department' ? departmentTone(label) : tone(label);
      const countText = options.showCount && value.count ? ` (${value.count})` : '';
      return h('span', {
        class: `${itemClass} ${itemClass}--${toneName}`,
        title: `${label}${countText}`,
      }, [
        h('span', { class: 'project-filter-header-label' }, `${label}${countText}`),
      ]);
    }),
    hiddenCount > 0
      ? h('span', { class: 'project-filter-header-count' }, `+${hiddenCount}`)
      : undefined,
  ]);
}

export function renderBlockFilterHeader(h: any, { values, active, text, showCount }: { values: Array<{ value: string; label: string; count?: number }>; active: boolean; text: string; showCount?: boolean }) {
  return renderHeaderSelectionTemplate(h, {
    values,
    active,
    text,
    showCount,
    kind: 'block',
  });
}

export function renderDepartmentFilterHeader(h: any, { values, active, text, showCount }: { values: Array<{ value: string; label: string; count?: number }>; active: boolean; text: string; showCount?: boolean }) {
  return renderHeaderSelectionTemplate(h, {
    values,
    active,
    text,
    showCount,
    kind: 'department',
  });
}

export function renderSkillFilterHeader(h: any, { values, active, text, showCount }: { values: Array<{ value: string; label: string; count?: number }>; active: boolean; text: string; showCount?: boolean }) {
  if (!active || values.length === 0) {
    return h('span', { class: 'project-filter-header-empty' }, text);
  }

  const visibleValues = values.slice(0, 2);
  const hiddenCount = values.length - visibleValues.length;
  return h('span', { class: 'project-filter-header-skills' }, [
    ...visibleValues.map((value) => {
      const label = value.label || value.value;
      const countText = showCount && value.count ? ` (${value.count})` : '';
      return renderProjectSkillBadge(h, `${label}${countText}`, 'project-filter-header-skill');
    }),
    hiddenCount > 0
      ? h('span', { class: 'project-filter-header-count' }, `+${hiddenCount}`)
      : undefined,
  ]);
}

export function resolveOwnerProfile(value: unknown, label: unknown) {
  const normalizedValue = String(value ?? '');
  const normalizedLabel = String(label ?? '');
  return projectOwnerProfiles.find((owner) =>
    owner.value === normalizedValue ||
    owner.label === normalizedValue ||
    owner.value === normalizedLabel ||
    owner.label === normalizedLabel
  );
}

export function renderOwnerFilterHeader(h: any, { values, active, text }: { values: Array<{ value: string; label: string }>; active: boolean; text: string }) {
  if (!active || values.length === 0) {
    return h('span', { class: 'project-owner-filter-header-text' }, text);
  }

  const visibleOwners = values.slice(0, 3);
  const hiddenCount = values.length - visibleOwners.length;
  return h('span', { class: 'project-owner-filter-header' }, [
    ...visibleOwners.map((value) => {
      const profile = resolveOwnerProfile(value.value, value.label);
      const index = profile ? projectOwnerProfiles.indexOf(profile) : 0;
      return renderProjectAvatar(h, {
        index,
        label: profile?.label ?? value.label,
        value: profile?.value ?? value.value,
      });
    }),
    hiddenCount > 0
      ? h('span', { class: 'project-owner-filter-header-count' }, `+${hiddenCount}`)
      : undefined,
  ]);
}

export const projectFilterConfig = {
  selection: {
    getItems: {
      owner: () => projectOwnerProfiles,
      custom_people: () => projectOwnerProfiles,
    },
    itemTemplate: {
      status: (h, { label }) => renderBlockFilterOption(h, label),
      priority: (h, { label }) => renderBlockFilterOption(h, label),
      risk: (h, { label }) => renderBlockFilterOption(h, label),
      department: (h, { label }) => renderDepartmentFilterOption(h, label),
      skills: (h, { label }) => renderSkillFilterOption(h, label),
      custom_dropdown: (h, { label }) => renderSkillFilterOption(h, label),
      owner: renderOwnerFilterOption,
      custom_people: renderOwnerFilterOption,
    },
  },
} as unknown as ColumnFilterConfig;

function renderOwnerFilterOption(h: any, { item, label, value }: { item: Record<string, any>; label: string; value: string }) {
        const profile = resolveOwnerProfile(value, item.label ?? label);
        const index = profile ? projectOwnerProfiles.indexOf(profile) : 0;
        const ownerLabel = profile?.label ?? item.label ?? label;
        return h('span', { class: 'project-owner-filter-option' }, [
          renderProjectAvatar(h, {
            index,
            label: ownerLabel,
            value: profile?.value ?? value,
          }),
          h('span', { class: 'project-owner-filter-name' }, ownerLabel),
        ]);
}
