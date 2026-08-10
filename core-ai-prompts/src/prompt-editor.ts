import { TextEditor, type HyperFunc, type VNode } from '@revolist/revogrid';

export class PromptEditor extends TextEditor {
  render(h: HyperFunc<VNode>) {
    return h('textarea', {
      class: 'prompt-editor',
      value: this.editCell?.val ?? '',
      ref: (element: HTMLTextAreaElement | null) => { this.editInput = element; },
      onKeyDown: (event: KeyboardEvent) => this.onKeyDown(event),
    });
  }
}

export const PROMPT_EDITORS = { prompt: PromptEditor };
