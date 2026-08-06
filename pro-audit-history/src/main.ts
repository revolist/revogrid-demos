import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('./audit-history.react'),
      ]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        import('./audit-history.vue'),
      ]);
      createApp(Demo).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML = '<audit-history-grid></audit-history-grid>';
      const [{ bootstrapApplication }, { AuditHistoryGridComponent }] = await Promise.all([
        import('@angular/platform-browser'),
        import('./audit-history.angular'),
      ]);
      await bootstrapApplication(AuditHistoryGridComponent);
      break;
    }
    default: {
      const { load } = await import('./audit-history');
      load('#app');
    }
  }
}

void bootstrap();
