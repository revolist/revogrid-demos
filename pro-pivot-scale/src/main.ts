import { mountScaleDemo } from './scale-demo';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing demo root');
mountScaleDemo(app);
