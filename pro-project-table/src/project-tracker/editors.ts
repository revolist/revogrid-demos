import { TextEditor } from '@revolist/revogrid';

export class ProjectLeftTextEditor extends TextEditor {
  async componentDidRender(): Promise<void> {
    await super.componentDidRender();

    const input = this.editInput;
    if (!input) {
      return;
    }

    input.style.boxSizing = 'border-box';
    input.style.padding = '0 16px';
    input.style.textAlign = 'left';

    requestAnimationFrame(() => {
      input.scrollLeft = 0;
    });
  }
}
