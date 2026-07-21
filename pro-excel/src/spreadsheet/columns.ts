/** Shared column-tree and cell-class utilities. */
import type {
  CellProps,
  ColumnData,
  ColumnRegular,
} from '@revolist/revogrid';

export function appendSpreadsheetCellClass(props: CellProps, className: string): CellProps {
  const classNames = className.split(/\s+/).filter(Boolean);
  if (!classNames.length) {
    return props;
  }
  const currentClass = props.class;
  if (!currentClass) {
    return { ...props, class: classNames.join(' ') };
  }

  if (typeof currentClass === 'string') {
    return { ...props, class: `${currentClass} ${classNames.join(' ')}` };
  }

  return {
    ...props,
    class: classNames.reduce<Record<string, boolean>>((classes, name) => {
      classes[name] = true;
      return classes;
    }, { ...currentClass }),
  };
}

/** Flattens grouped column definitions in visual order. */
export function getSpreadsheetLeafColumns(columns: ColumnData): ColumnRegular[] {
  const leaves: ColumnRegular[] = [];
  columns.forEach((column) => {
    if ('children' in column && Array.isArray(column.children)) {
      leaves.push(...getSpreadsheetLeafColumns(column.children));
    } else {
      leaves.push(column as ColumnRegular);
    }
  });
  return leaves;
}
