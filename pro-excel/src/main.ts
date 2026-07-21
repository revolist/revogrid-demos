import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

async function bootstrap() {
switch (framework) {
  case 'react': {
    const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('./excel.react'),
    ]);
    createRoot(document.querySelector('#app')!).render(createElement(Demo, { isDark }));
    break;
  }
  case 'vue': {
    const [{ createApp }, { default: Demo }] = await Promise.all([
      import('vue'),
      import('./excel.vue'),
    ]);
    createApp(Demo, { isDark }).mount('#app');
    break;
  }
  case 'angular': {
    await import('zone.js');
    await import('@angular/compiler');
    document.querySelector('#app')!.innerHTML = '<spreadsheet-workbench-grid></spreadsheet-workbench-grid>';
    const [{ bootstrapApplication }, { SpreadsheetWorkbenchGridComponent }] = await Promise.all([
      import('@angular/platform-browser'),
      import('./excel.angular'),
    ]);
    await bootstrapApplication(SpreadsheetWorkbenchGridComponent);
    break;
  }
  default: {
    const { load } = await import('./excel');
    load('#app');
  }
}
}

void bootstrap();
