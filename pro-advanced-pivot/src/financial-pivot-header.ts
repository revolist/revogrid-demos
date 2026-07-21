import {
  FINANCIAL_PRESETS,
  type FinancialKpi,
  type FinancialPresetId,
} from './financial.pivot';

export const FINANCIAL_PIVOT_HEADER_TAG = 'financial-pivot-header';
export const FINANCIAL_PIVOT_PRESET_EVENT = 'financial-pivot-preset-select';
export const FINANCIAL_PIVOT_CONFIGURATOR_EVENT = 'financial-pivot-configurator-toggle';
export const FINANCIAL_PIVOT_EXPANDED_EVENT = 'financial-pivot-expanded-toggle';
export const FINANCIAL_PIVOT_RESET_EVENT = 'financial-pivot-reset';

export interface FinancialPivotHeaderState {
  activePreset: FinancialPresetId | null;
  configuratorVisible: boolean;
  expanded: boolean;
  kpis: FinancialKpi[];
}

export type FinancialPivotHeaderElement = HTMLElement & {
  state: FinancialPivotHeaderState;
};

const DEFAULT_STATE: FinancialPivotHeaderState = {
  activePreset: 'sales',
  configuratorVisible: true,
  expanded: false,
  kpis: [],
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
      actionButton('Reset demo', () => this.emit(FINANCIAL_PIVOT_RESET_EVENT), 'reset'),
    );
    toolbar.append(report, actions);

    const kpis = element('section', 'financial-pivot-header__kpis');
    kpis.setAttribute('aria-label', 'Portfolio snapshot');
    kpis.append(...state.kpis.map(renderKpi));
    root.append(toolbar, kpis);
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

function renderKpi(kpi: FinancialKpi) {
  const article = element('article', 'financial-pivot-header__kpi');
  const icon = element(
    'span',
    `financial-pivot-header__icon financial-pivot-header__icon--${kpi.tone}`,
  );
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = kpi.icon;
  const content = element('div', 'financial-pivot-header__kpi-content');
  const label = element('div', 'financial-pivot-header__kpi-label', kpi.label);
  label.append(element('span', 'financial-pivot-header__kpi-detail', ` · ${kpi.detail}`));
  content.append(
    label,
    element('div', 'financial-pivot-header__kpi-value', kpi.value),
  );
  article.append(icon, content);
  return article;
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
