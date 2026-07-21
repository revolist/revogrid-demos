import type { ColumnDataSchemaModel, ColumnRegular, ColumnProp, HyperFunc, VNode } from '@revolist/revogrid';

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

export function formatHRShortDate(value: unknown): string {
  let date: Date | undefined;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    date = dateOnly
      ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
      : new Date(value);
  }

  return date && !Number.isNaN(date.getTime())
    ? SHORT_DATE_FORMATTER.format(date)
    : String(value ?? '');
}

interface HRDateColumnType {
  cellTemplate: (h: HyperFunc<VNode>, props: ColumnDataSchemaModel) => VNode | VNode[];
}

export function withHRShortDate<T extends HRDateColumnType>(columnType: T): T {
  const renderDateColumn = columnType.cellTemplate;
  columnType.cellTemplate = (h, props) => renderDateColumn(h, {
    ...props,
    value: formatHRShortDate(props.value),
  });
  return columnType;
}

export const HR_COLOR_BY_AGE = (age: number) => {
  if (age < 30) return '#22c55e';
  if (age < 50) return '#f59e0b';
  return '#ef4444';
};

export function getBaseHRColumns(companies: string[]): ColumnProp[] {
  return [
    {
      name: 'Employee',
      children: [
        { name: 'Name', prop: 'name', size: 210, sortable: true },
        { name: 'Company', prop: 'company', columnType: 'select', source: companies, size: 150, sortable: true },
      ],
    },
    {
      name: 'Personal',
      children: [
        { name: 'Age', prop: 'age', size: 90, sortable: true },
        { name: 'Department', prop: 'department', size: 140, sortable: true },
        {
          name: 'Eye color',
          prop: 'eyeColor',
          columnType: 'colorSelect',
          source: ['#2563eb', '#16a34a', '#92400e', '#64748b'],
          size: 120,
          sortable: true,
        },
      ],
    },
    { name: 'Joined', prop: 'joined', columnType: 'date', size: 130, sortable: true },
    { name: 'Salary', prop: 'salary', columnType: 'number', size: 130, sortable: true },
  ] as ColumnProp[];
}

export function getExtraHRColumns(count: number): ColumnRegular[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Metric ${index + 1}`,
    prop: `metric${index + 1}`,
    size: 110,
    sortable: true,
  }));
}
