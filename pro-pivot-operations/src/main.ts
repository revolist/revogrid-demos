import { mountOperationsDemo } from './operations-demo';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing operations demo root');
mountOperationsDemo(app);
