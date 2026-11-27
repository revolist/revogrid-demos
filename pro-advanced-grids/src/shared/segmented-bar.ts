import { renderSegmentedBar, type SegmentedBarOptions } from '@revolist/revogrid-pro';

/** Adapt the Pro renderer for the demo's native DOM containers. */
export function createSegmentedBarElement(document: Document, options: SegmentedBarOptions): HTMLElement {
  const create = (tag: string, props: Record<string, unknown>, children: HTMLElement[] = []) => {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(props)) {
      if (name === 'style' && value && typeof value === 'object') Object.assign(element.style, value);
      else if (value != null) element.setAttribute(name, String(value));
    }
    element.append(...children);
    return element;
  };
  return renderSegmentedBar(create, options) as HTMLElement;
}
