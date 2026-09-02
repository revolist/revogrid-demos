import type { ColumnDataSchemaModel, HyperFunc, VNode } from '@revolist/revogrid';
import { getHRCompanyOption, type HRCompanyAvatar } from './sys-data/hr.data';

export function renderHrCompanyCell(
  h: HyperFunc<VNode>,
  { model, value }: ColumnDataSchemaModel,
): VNode {
  const label = String(value ?? '');
  const avatar = getHRCompanyOption(value)?.companyAvatar
    ?? (model.companyAvatar as HRCompanyAvatar | undefined);

  return h('span', { class: 'flex items-center' }, [
    h('span', {
      class: 'hr-avatar',
      style: { backgroundColor: avatar?.color ?? '#64748b' },
    }, avatar?.initials ?? label.slice(0, 2).toUpperCase()),
    h('span', null, label),
  ]);
}
