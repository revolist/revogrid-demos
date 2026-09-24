import { mountImportDemo } from './import-demo';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing demo root');
mountImportDemo(app);
