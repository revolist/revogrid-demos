import type { ColumnRegular, ColumnProp } from '@revolist/revogrid';

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
        { name: 'ID', prop: 'id', size: 80, readonly: true },
        { name: 'Name', prop: 'name', size: 210 },
        { name: 'Company', prop: 'company', columnType: 'select', source: companies, size: 150 },
      ],
    },
    {
      name: 'Personal',
      children: [
        { name: 'Age', prop: 'age', size: 90 },
        { name: 'Department', prop: 'department', size: 140 },
        {
          name: 'Eye color',
          prop: 'eyeColor',
          columnType: 'colorSelect',
          source: ['#2563eb', '#16a34a', '#92400e', '#64748b'],
          size: 120,
        },
      ],
    },
    { name: 'Joined', prop: 'joined', columnType: 'date', size: 130 },
    { name: 'Salary', prop: 'salary', columnType: 'number', size: 130 },
  ] as ColumnProp[];
}

export function getExtraHRColumns(count: number): ColumnRegular[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Metric ${index + 1}`,
    prop: `metric${index + 1}`,
    size: 110,
  }));
}
