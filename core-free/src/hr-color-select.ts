import type { HyperFunc, VNode } from '@revolist/revogrid';

export function renderHrColorPill(
  h: HyperFunc<VNode>,
  value: unknown,
  className = 'hr-bubble',
): VNode {
  const color = String(value ?? '');

  return h(
    'span',
    {
      class: className,
      style: { backgroundColor: color },
    },
    color,
  );
}
