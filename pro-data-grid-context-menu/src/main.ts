import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('./data-grid-context-menu.react'),
      ]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        import('./data-grid-context-menu.vue'),
      ]);
      createApp(Demo).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML = '<data-grid-context-menu-grid></data-grid-context-menu-grid>';
      const [{ bootstrapApplication }, { DataGridContextMenuGridComponent }] = await Promise.all([
        import('@angular/platform-browser'),
        import('./data-grid-context-menu.angular'),
      ]);
      await bootstrapApplication(DataGridContextMenuGridComponent);
      break;
    }
    default: {
      const { load } = await import('./data-grid-context-menu');
      load('#app');
    }
  }
}

void bootstrap();
