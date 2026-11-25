import { button, field, input, select, type Workbench } from './workbench-ui';

/** Shared appearance controls backed by public grid properties and column state. */
export function createGridAppearance(
  bench: Workbench,
  options: { prefix: string; columnLines: boolean; refresh: () => void; exportAction?: () => void },
) {
  let density = 'Compact';
  let columnLines = options.columnLines;
  let rowStripes = false;
  let resizable = true;
  let movable = false;
  bench.grid.resize = resizable;
  bench.grid.classList.toggle(`${options.prefix}-column-lines`, columnLines);
  return () => {
    const densityControl = select('Density', ['Compact', 'Comfortable'], density);
    const toggle = (label: string, checked: boolean) => {
      const control = input(label, '', 'checkbox');
      control.checked = checked;
      return control;
    };
    const lines = toggle('Column lines', columnLines);
    const stripes = toggle('Row stripes', rowStripes);
    const resize = toggle('Resizable columns', resizable);
    const move = toggle('Movable columns', movable);
    const reset = button('Reset columns', () => { bench.resetColumns(); options.refresh(); });
    const controls = [field('Density', densityControl), field('Column lines', lines), field('Row stripes', stripes), field('Resizable columns', resize), field('Movable columns', move), reset];
    if (options.exportAction) controls.push(button('Export XLSX', options.exportAction));
    bench.form('Appearance', controls, () => {
      density = densityControl.value;
      columnLines = lines.checked;
      rowStripes = stripes.checked;
      resizable = resize.checked;
      movable = move.checked;
      bench.grid.rowSize = density === 'Compact' ? 51 : 64;
      bench.grid.resize = resizable;
      bench.setColumnMovement(movable);
      bench.grid.classList.toggle(`${options.prefix}-column-lines`, columnLines);
      bench.grid.classList.toggle(`${options.prefix}-row-stripes`, rowStripes);
    }, undefined, 'Apply');
  };
}
