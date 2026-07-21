import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('./project-table.react'),
      ]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        import('./project-table.vue'),
      ]);
      createApp(Demo).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML = '<color-grid></color-grid>';
      const [{ bootstrapApplication }, { ColorGridComponent }] = await Promise.all([
        import('@angular/platform-browser'),
        import('./project-table.angular'),
      ]);
      await bootstrapApplication(ColorGridComponent);
      break;
    }
    default: {
      const { load } = await import('./project-table');
      load('#app');
    }
  }
}

void bootstrap();
