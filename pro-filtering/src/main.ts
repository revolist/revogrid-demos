import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

const mode = new URLSearchParams(window.location.search).get('mode') === 'first-entry' ? 'first-entry' : 'explorer';

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('./filtering.react'),
      ]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo, { mode }));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        import('./filtering.vue'),
      ]);
      createApp(Demo, { mode }).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML = `<filtering-grid mode="${mode}"></filtering-grid>`;
      const [{ bootstrapApplication }, { FilteringGridComponent }] = await Promise.all([
        import('@angular/platform-browser'),
        import('./filtering.angular'),
      ]);
      const app = await bootstrapApplication(FilteringGridComponent);
      app.components[0].setInput('mode', mode);
      break;
    }
    default: {
      const { load } = await import('./filtering');
      load('#app', undefined, { mode });
    }
  }
}

void bootstrap();
