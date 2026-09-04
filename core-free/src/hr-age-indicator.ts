import type { ColumnDataSchemaModel, HyperFunc, VNode } from '@revolist/revogrid';
import { HR_COLOR_BY_AGE } from './sys-data/hr.columns';

export function renderHrAgeCell(
  h: HyperFunc<VNode>,
  { value }: ColumnDataSchemaModel,
): VNode[] {
  const label = String(value ?? '');

  if (!label.trim()) {
    return [];
  }

  return [
    h('i', {
      class: 'hr-circle',
      style: { borderColor: HR_COLOR_BY_AGE(Number(value)) },
    }),
    label,
  ];
}
