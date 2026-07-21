import {
  FINANCIAL_PRESETS,
  type FinancialPresetId,
} from '../financial.pivot';

export const FINANCIAL_PIVOT_HEADER_TAG = 'financial-pivot-header';
export const FINANCIAL_PIVOT_PRESET_EVENT = 'financial-pivot-preset-select';
export const FINANCIAL_PIVOT_CONFIGURATOR_EVENT = 'financial-pivot-configurator-toggle';
export const FINANCIAL_PIVOT_EXPANDED_EVENT = 'financial-pivot-expanded-toggle';

export interface FinancialPivotHeaderState {
  activePreset: FinancialPresetId | null;
  configuratorVisible: boolean;
  expanded: boolean;
}

export type FinancialPivotHeaderElement = HTMLElement & {
  state: FinancialPivotHeaderState;
};

const DEFAULT_STATE: FinancialPivotHeaderState = {
  activePreset: 'sales',
  configuratorVisible: true,
  expanded: false,
};

class FinancialPivotHeader extends HTMLElement {
  private currentState = DEFAULT_STATE;

  get state() {
    return this.currentState;
  }

  set state(value: FinancialPivotHeaderState) {
    this.currentState = value;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.replaceChildren();
  }

  private render() {
    const state = this.currentState;
    const root = element('div', 'financial-pivot-header');
    const toolbar = element('div', 'financial-pivot-header__toolbar');
    const report = element('div', 'financial-pivot-header__report');
    const presetSwitch = element('div', 'rv-segmented-switch financial-pivot-header__preset-switch');
    presetSwitch.setAttribute('role', 'tablist');
    presetSwitch.setAttribute('aria-label', 'Financial report presets');

    for (const preset of FINANCIAL_PRESETS) {
      const active = state.activePreset === preset.id;
      const button = actionButton(preset.label, () => {
        if (!active) {
          this.emit(FINANCIAL_PIVOT_PRESET_EVENT, preset.id);
        }
      });
      button.className = `rv-segmented-switch-item${active ? ' on' : ''}`;
      button.dataset.value = preset.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(active));
      button.firstElementChild?.classList.add('rv-segmented-switch-label');
      presetSwitch.append(button);
    }

    report.append(presetSwitch);

    const actions = element('div', 'financial-pivot-header__actions');
    actions.append(
      actionButton(
        state.configuratorVisible ? 'Hide fields' : 'Configure',
        () => this.emit(FINANCIAL_PIVOT_CONFIGURATOR_EVENT),
        'configurator',
      ),
      actionButton(
        state.expanded ? 'Exit expanded workspace' : 'Expand workspace',
        () => this.emit(FINANCIAL_PIVOT_EXPANDED_EVENT),
        'expanded',
      ),
    );
    toolbar.append(report, actions);

    root.append(toolbar);
    this.replaceChildren(root);
  }

  private emit(name: string, detail?: FinancialPresetId) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }
}

export function defineFinancialPivotHeaderElement() {
  if (!customElements.get(FINANCIAL_PIVOT_HEADER_TAG)) {
    customElements.define(FINANCIAL_PIVOT_HEADER_TAG, FinancialPivotHeader);
  }
}

export function createFinancialPivotHeader(state: FinancialPivotHeaderState) {
  defineFinancialPivotHeaderElement();
  const header = document.createElement(FINANCIAL_PIVOT_HEADER_TAG) as FinancialPivotHeaderElement;
  header.state = state;
  return header;
}

function actionButton(label: string, onClick: () => void, action?: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'financial-pivot-header__button';
  if (action) {
    button.dataset.action = action;
  }
  button.append(element('span', '', label));
  button.addEventListener('click', onClick);
  return button;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}
