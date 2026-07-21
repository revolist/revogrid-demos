import type { ColumnProp } from '@revolist/revogrid';
import { departmentTone } from './renderers';

export function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function toggleProjectTag(tags: string[], tag: string) {
  const nextTags = new Set(tags);
  if (nextTags.has(tag)) {
    nextTags.delete(tag);
  } else {
    nextTags.add(tag);
  }
  return Array.from(nextTags);
}

export function toProjectHiddenColumns(detail: CustomEvent<ColumnProp[]> | ColumnProp[]) {
  return Array.isArray(detail) ? [...detail] : [...detail.detail];
}

export function tagTone(value: unknown) {
  return departmentTone(value);
}

export function slugifyProjectId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
