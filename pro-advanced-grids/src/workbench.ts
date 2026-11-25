import { defineCustomElements } from '@revolist/revogrid/loader';
import { examples } from './screens';
import { make } from './workbench-ui';
import '../../composables/clickup-theme.css';

export function mountWorkbench(host: HTMLElement) {
  void defineCustomElements();
  const window = host.ownerDocument.defaultView!;
  const nav = make('nav', '', 'workbench-nav');
  nav.setAttribute('aria-label', 'Advanced RevoGrid examples');
  const contents = make('div', '', 'workbench-content');
  host.append(contents, nav);
  let cleanup: (() => void) | undefined;
  const links = examples.map((example) => {
    const link = make('a', example.title);
    link.href = `#${example.id}`;
    nav.append(link);
    return link;
  });
  function update() {
    const id = window.location.hash.slice(1);
    const selected =
      examples.find((example) => example.id === id) ?? examples[0];
    links.forEach((link, index) => {
      if (examples[index] === selected)
        link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    cleanup?.();
    cleanup = selected.mount(contents);
    window.document.title = `${selected.title} · RevoGrid Pro`;
  }
  window.addEventListener('hashchange', update);
  update();
  return () => {
    window.removeEventListener('hashchange', update);
    cleanup?.();
    nav.remove();
    contents.remove();
  };
}

export function load(parentSelector: string) {
  const host = document.querySelector<HTMLElement>(parentSelector);
  return host ? mountWorkbench(host) : undefined;
}
