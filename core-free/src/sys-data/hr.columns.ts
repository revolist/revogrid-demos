import type { ColumnDataSchemaModel, ColumnGrouping, ColumnRegular, EditorBase, HyperFunc, VNode } from '@revolist/revogrid';
import { getHRMonthColumns, type HRCompanyOption } from './hr.data';

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

const HR_DATE_ADAPTER = {
  format: formatHRShortDate,
  parse(value: string, createDate: (year: string, month: string, day: string) => Date | undefined) {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
    if (!match) return;
    const [, month, day, year] = match;
    const date = createDate(year, month, day);
    // Reject overflow dates such as February 30 instead of silently changing months.
    if (date?.getFullYear() === Number(year)
      && date.getMonth() + 1 === Number(month)
      && date.getDate() === Number(day)) return date;
  },
};

interface HRDateColumnType {
  editor: new (...args: any[]) => EditorBase;
  cellTemplate: (h: HyperFunc<VNode>, props: ColumnDataSchemaModel) => VNode | VNode[];
}

export function withHRShortDate<T extends HRDateColumnType>(columnType: T): T {
  const StockDateEditor = columnType.editor;
  columnType.editor = class HRDateEditor extends StockDateEditor {
    render(h: HyperFunc<VNode>) {
      return super.render((tag: any, props?: any, children?: any) => {
        if (tag === 'duet-date-picker') {
          const stockRef = props.ref;
          props = {
            ...props,
            ref: (picker: (HTMLElement & { localization: Record<string, unknown> }) | null) => {
              stockRef?.(picker);
              if (picker) picker.localization = { ...picker.localization, placeholder: 'M/D/YYYY' };
            },
          };
        }
        return h(tag, props, children);
      });
    }

    componentDidRender() {
      const editorHost = this.element?.closest('revogr-edit') as HTMLElement | null;
      const floatingEditor = this.element?.querySelector(':scope > .revo-float') as HTMLElement | null;

      super.componentDidRender?.();

      if (!editorHost || !floatingEditor) return;
      const { left, top, width, height } = editorHost.getBoundingClientRect();
      floatingEditor.style.transform = `translate(${left}px, ${top}px)`;
      floatingEditor.style.width = `${width}px`;
      floatingEditor.style.height = `${height}px`;
    }
  };

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

export function getBaseHRColumns(companies: HRCompanyOption[]): (ColumnGrouping | ColumnRegular)[] {
  return [
    {
      name: 'Employee',
      children: [
        { name: 'Name', prop: 'name', size: 210, sortable: true },
        {
          name: 'Company',
          prop: 'company',
          columnType: 'select',
          source: companies,
          labelKey: 'label',
          valueKey: 'value',
          syncCellTemplate: true,
          size: 150,
          sortable: true,
        },
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
          syncCellTemplate: true,
          size: 120,
          sortable: true,
        },
      ],
    },
    { name: 'Joined', prop: 'joined', columnType: 'date', dateAdapter: HR_DATE_ADAPTER, size: 130, sortable: true },
    { name: 'Salary', prop: 'salary', columnType: 'number', size: 130, sortable: true },
  ];
}

export function getExtraHRColumns(count: number): ColumnGrouping[] {
  const months = getHRMonthColumns(count);
  return months.length
    ? [{
      name: 'Monthly hours',
      children: months.map(month => ({
        name: month.label,
        prop: month.prop,
        columnType: 'number',
        size: 100,
        sortable: true,
      })),
    }]
    : [];
}
