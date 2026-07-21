import '../../demo-host.css';
import { load } from './HRDemo';

void load('#app', {
  isDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
});
