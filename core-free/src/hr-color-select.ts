import type { ColumnRegular, HyperFunc, VNode } from '@revolist/revogrid';

type SelectColumnTypeConstructor = new () => {
  beforeSetup?: (column: ColumnRegular) => void;
};

type SelectChangeEvent = CustomEvent<{
  val: string | { value: unknown };
  originalEvent?: Event & { code?: string };
}>;

type RevoDropdownElement = HTMLElement & {
  value?: unknown;
  doOpen?: () => Promise<void> | void;
};

function getSelectValue(item: unknown, valueKey?: string): string {
  if (item && typeof item === 'object' && valueKey) {
    return String((item as Record<string, unknown>)[valueKey] ?? '');
  }

  return String(item ?? '');
}

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

class HRColorSelectEditor {
  private opened = false;
  private element?: RevoDropdownElement | null;
  editCell?: { model?: Record<string, unknown>; prop?: string };

  constructor(
    private readonly data: { column?: ColumnRegular & { valueKey?: string } },
    private readonly saveCallback: (value: unknown, preventFocus?: boolean) => void,
  ) {}

  componentDidRender() {
    if (!this.opened && this.element) {
      this.opened = true;
      void this.element.doOpen?.();
    }
  }

  getValue() {
    return this.element?.value;
  }

  render(h: HyperFunc<VNode>): VNode {
    const prop = this.editCell?.prop;
    const value = prop ? this.editCell?.model?.[prop] ?? '' : '';
    const column = this.data.column;

    return h('revo-dropdown', {
      ...column,
      class: 'hr-color-dropdown-editor',
      style: { '--hr-selected-color': String(value) },
      ref: (element: RevoDropdownElement) => {
        this.element = element;
      },
      dataId: column?.valueKey,
      dataLabel: column?.labelKey,
      autocomplete: false,
      autoFocus: true,
      maxHeight: '300',
      value,
      template: (dropdownH: HyperFunc<VNode>, item: unknown) =>
        renderHrColorPill(
          dropdownH,
          getSelectValue(item, column?.valueKey),
          'hr-bubble hr-color-select-pill',
        ),
      onChanged: ({ detail }: SelectChangeEvent) => {
        const preventFocus = detail.originalEvent?.code === 'Tab';
        const nextValue = typeof detail.val === 'object' ? detail.val.value : detail.val;
        this.saveCallback(nextValue, preventFocus);
      },
    });
  }
}

export function createHRColorSelectColumnType(SelectColumnType: SelectColumnTypeConstructor) {
  const baseColumnType = new SelectColumnType();

  return {
    beforeSetup: baseColumnType.beforeSetup,
    editor: HRColorSelectEditor,
    cellTemplate: (h: HyperFunc<VNode>, { model, prop }: { model: Record<string, unknown>; prop: string }) =>
      [renderHrColorPill(h, model[prop])],
  };
}
