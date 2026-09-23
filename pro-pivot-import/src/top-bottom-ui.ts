import type { TopBottomSelection } from './top-bottom';

/** Adds a dedicated, keyboard-accessible member-ranking workflow to the Pivot setup. */
export function installTopBottomControls(app: HTMLElement): { read: () => TopBottomSelection | null } {
  const controls = app.querySelector<HTMLElement>('.pivot-options');
  if (!controls) throw new Error('Missing Pivot setup controls.');
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'rank-options';
  fieldset.innerHTML = `<legend>Top / Bottom N</legend>
    <label>Show members <select data-rank-direction><option value="all">All members</option><option value="top">Top N</option><option value="bottom">Bottom N</option></select></label>
    <label>Number of members <input data-rank-count type="number" min="1" step="1" value="5" disabled></label>
    <label class="rank-other"><input data-rank-other type="checkbox" checked disabled> Group remaining members as Other</label>
    <p>Members are ranked by the sum of the selected measure across all columns. Ties keep source order. With Other, the grand total still includes every imported row.</p>`;
  controls.querySelector<HTMLButtonElement>('#create')?.before(fieldset);
  const direction = fieldset.querySelector<HTMLSelectElement>('[data-rank-direction]')!;
  const count = fieldset.querySelector<HTMLInputElement>('[data-rank-count]')!;
  const other = fieldset.querySelector<HTMLInputElement>('[data-rank-other]')!;
  direction.addEventListener('change', () => {
    const ranked = direction.value !== 'all';
    count.disabled = !ranked;
    other.disabled = !ranked;
  });
  return {
    read: () => {
      if (direction.value === 'all') return null;
      return { direction: direction.value as 'top' | 'bottom', count: Number(count.value), includeOther: other.checked };
    },
  };
}
