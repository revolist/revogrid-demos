import { defineCustomElements } from '@revolist/revogrid/loader';
import { examples } from './screens';
import { make } from './shared/workbench-ui';
import '../../composables/clickup-theme.css';

export function mountWorkbench(host: HTMLElement) {
  void defineCustomElements();
  const hadGalleryClass = host.classList.contains('advanced-grid-gallery');
  host.classList.add('advanced-grid-gallery');
  const window = host.ownerDocument.defaultView!;
  const contents = make('div', '', 'workbench-content');
  host.append(contents);
  let cleanup: (() => void) | undefined;
  function update() {
    const standaloneId = window.location.pathname.match(/^\/examples\/([^/]+)\/?$/)?.[1];
    const id = standaloneId ?? window.location.hash.slice(1);
    const selected =
      examples.find((example) => example.id === id) ?? examples[0];
    cleanup?.();
    cleanup = selected.mount(contents);
    contents.dataset.exampleId = selected.id;
    window.document.title = `${selected.title} · RevoGrid Pro`;
  }
  window.addEventListener('hashchange', update);
  update();
  return () => {
    window.removeEventListener('hashchange', update);
    cleanup?.();
    contents.remove();
    if (!hadGalleryClass) host.classList.remove('advanced-grid-gallery');
  };
}

export function load(parentSelector: string) {
  const host = document.querySelector<HTMLElement>(parentSelector);
  return host ? mountWorkbench(host) : undefined;
}
