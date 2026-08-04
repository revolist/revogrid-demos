import NumberColumnType from '@revolist/revogrid-column-numeral';
import {
  TextEditor,
  type CellTemplate,
  type ColumnDataSchemaModel,
  type ColumnRegular,
  type ColumnType,
  type ColumnTypes,
  type HyperFunc,
  type VNode,
} from '@revolist/revogrid';
import { ColumnDropdown } from '@revolist/revogrid-pro';

const calendarIcon = `<svg aria-hidden="true" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" fill-rule="evenodd" transform="translate(2 2)">
    <path d="m2.5.5h12c1.1045695 0 2 .8954305 2 2v12c0 1.1045695-.8954305 2-2 2h-12c-1.1045695 0-2-.8954305-2-2v-12c0-1.1045695.8954305-2 2-2z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="m.5 4.5h16" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
    <g fill="currentColor">
      <circle cx="8.5" cy="8.5" r="1"></circle><circle cx="4.5" cy="8.5" r="1"></circle><circle cx="12.5" cy="8.5" r="1"></circle>
      <circle cx="8.5" cy="12.5" r="1"></circle><circle cx="4.5" cy="12.5" r="1"></circle><circle cx="12.5" cy="12.5" r="1"></circle>
    </g>
  </g>
</svg>`;

function formatDateValue(value: ColumnDataSchemaModel['value']) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  return value == null ? '' : String(value);
}

class ProjectDateEditor extends TextEditor {
  render(h: HyperFunc<VNode>): VNode | VNode[] {
    return h('input', {
      type: 'date',
      enterKeyHint: 'enter',
      value: formatDateValue(this.editCell?.val),
      ref: (element: HTMLInputElement | null) => {
        this.editInput = element;
      },
      onKeyDown: (event: KeyboardEvent) => this.onKeyDown(event),
    });
  }
}

const projectDateRenderer: CellTemplate = (h, { value }) => [
  h('div', { class: { 'cell-value-wrapper': true } }, formatDateValue(value)),
  h('button', {
    class: { calendar: true },
    innerHTML: calendarIcon,
    onClick: (event: MouseEvent) => {
      if (typeof window === 'undefined' || !(event.target instanceof EventTarget)) return;
      event.target.dispatchEvent(new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        view: window,
      }));
    },
  }),
];

class ProjectDateColumnType implements ColumnType {
  readonly editor = ProjectDateEditor;
  readonly cellTemplate = projectDateRenderer;
}

type SelectColumn = ColumnRegular & {
  source?: unknown[];
  valueKey?: string;
  labelKey?: string;
  template?: (h: Parameters<CellTemplate>[0], item: unknown) => unknown;
};

function getOptionValue(option: unknown, key?: string) {
  return key && option && typeof option === 'object' && key in option
    ? (option as Record<string, unknown>)[key]
    : option;
}

function getOptionLabel(option: unknown, key?: string) {
  return key && option && typeof option === 'object' && key in option
    ? (option as Record<string, unknown>)[key]
    : option;
}

const projectSelectRenderer: CellTemplate = (h, props) => {
  const column = props.column as SelectColumn;
  const option = column.source?.find((item) => getOptionValue(item, column.valueKey) === props.value) ?? props.value;
  if (typeof column.template === 'function') return column.template(h, option) as VNode;
  const label = getOptionLabel(option, column.labelKey);
  return label == null ? '' : String(label);
};

class ProjectSelectColumnType implements ColumnType {
  readonly editor = TextEditor;
  readonly cellTemplate = projectSelectRenderer;
}

export function createProjectColumnTypes(): ColumnTypes {
  return {
    date: new ProjectDateColumnType(),
    integer: new NumberColumnType(),
    currency: new NumberColumnType('$0,0.[00]'),
    select: new ProjectSelectColumnType(),
    dropdown: ColumnDropdown,
  };
}
