import { createApp } from 'vue';
import Demo from './OperationsPivot.vue';
import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';
import '@revolist/pivot/dist/pivot.css';

/** Mounts the same operations workspace in standalone and embedded examples. */
export function mountOperationsDemo(host: HTMLElement): () => void {
  const app = createApp(Demo);
  app.mount(host);
  return () => app.unmount();
}
