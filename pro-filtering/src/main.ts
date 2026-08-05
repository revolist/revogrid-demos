import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;
const remoteRecipe = new URLSearchParams(window.location.search).get('recipe') === 'remote';

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        remoteRecipe ? import('./remote.react') : import('./filtering.react'),
      ]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        remoteRecipe ? import('./remote.vue') : import('./filtering.vue'),
      ]);
      createApp(Demo).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML = remoteRecipe
        ? '<remote-filtering-grid></remote-filtering-grid>'
        : '<filtering-grid></filtering-grid>';
      const [{ bootstrapApplication }, demoModule] = await Promise.all([
        import('@angular/platform-browser'),
        remoteRecipe ? import('./remote.angular') : import('./filtering.angular'),
      ]);
      await bootstrapApplication(
        remoteRecipe
          ? demoModule.RemoteFilteringGridComponent
          : demoModule.FilteringGridComponent,
      );
      break;
    }
    default: {
      const { load } = remoteRecipe ? await import('./remote') : await import('./filtering');
      load('#app');
    }
  }
}

void bootstrap();
