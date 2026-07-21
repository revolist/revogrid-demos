import type { PivotConfig } from '@revolist/revogrid-enterprise';
import {
  createFinancialPreset,
  resolveFinancialKpiPreset,
  type FinancialPresetId,
} from './financial.pivot';

export const FINANCIAL_PIVOT_GUIDANCE_TAG = 'financial-pivot-guidance';
export const FINANCIAL_PIVOT_GUIDANCE_DISMISS_EVENT = 'financial-pivot-guidance-dismiss';

export type FinancialPivotGuidanceElement = HTMLElement & {
  visible: boolean;
  config: PivotConfig;
};

const PRESET_GUIDANCE: Record<FinancialPresetId, string[]> = {
  sales: [
    'Change Sales to Average',
    'Move Product into Rows',
    'Filter by Discount Band',
  ],
  profitability: [
    'Compare Profit by Country',
    'Add Discount Band as a filter',
    'Expand a Segment',
  ],
  product: [
    'Move Country into Rows',
    'Compare Units Sold',
    'Filter by Month',
  ],
};

export function getFinancialPivotGuidanceActions(config: PivotConfig): string[] {
  return [...PRESET_GUIDANCE[resolveFinancialKpiPreset(config)]];
}

class FinancialPivotGuidance extends HTMLElement {
  private isVisible = true;
  private currentConfig = createFinancialPreset();

  get visible() {
    return this.isVisible;
  }

  set visible(value: boolean) {
    this.isVisible = value;
    this.render();
  }

  get config() {
    return this.currentConfig;
  }

  set config(value: PivotConfig) {
    this.currentConfig = value;
    this.render();
  }

  connectedCallback() {
    this.style.display = 'block';
    this.render();
  }

  disconnectedCallback() {
    this.replaceChildren();
  }

  private render() {
    this.hidden = !this.isVisible;
    if (!this.isVisible) {
      this.replaceChildren();
      return;
    }

    const guidance = document.createElement('aside');
    guidance.className = 'financial-pivot-guidance__panel';
    const text = document.createElement('div');
    const title = document.createElement('span');
    title.textContent = 'Try these actions:';
    const actions = getFinancialPivotGuidanceActions(this.currentConfig);
    text.append(title, ` ${actions.join(' · ')}`);

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'financial-pivot-guidance__dismiss';
    dismiss.setAttribute('aria-label', 'Dismiss guidance');
    dismiss.textContent = '×';
    dismiss.addEventListener('click', () => {
      this.visible = false;
      this.dispatchEvent(new CustomEvent(FINANCIAL_PIVOT_GUIDANCE_DISMISS_EVENT, {
        bubbles: true,
      }));
    });

    guidance.append(text, dismiss);
    this.replaceChildren(guidance);
  }
}

export function defineFinancialPivotGuidanceElement() {
  if (!customElements.get(FINANCIAL_PIVOT_GUIDANCE_TAG)) {
    customElements.define(FINANCIAL_PIVOT_GUIDANCE_TAG, FinancialPivotGuidance);
  }
}

export function createFinancialPivotGuidance(config = createFinancialPreset()) {
  defineFinancialPivotGuidanceElement();
  const guidance = document.createElement(
    FINANCIAL_PIVOT_GUIDANCE_TAG,
  ) as FinancialPivotGuidanceElement;
  guidance.config = config;
  return guidance;
}
