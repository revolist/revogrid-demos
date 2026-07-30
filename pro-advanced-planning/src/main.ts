import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';
import '@revolist/revogrid-enterprise/dist/revogrid-enterprise.css';

const framework =
  import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] =
        await Promise.all([
          import('react'),
          import('react-dom/client'),
          import('./planning.react'),
        ]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        import('./planning.vue'),
      ]);
      createApp(Demo).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML =
        '<planning-views-grid></planning-views-grid>';
      const [{ bootstrapApplication }, { PlanningViewsGridComponent }] =
        await Promise.all([
          import('@angular/platform-browser'),
          import('./planning.angular'),
        ]);
      await bootstrapApplication(PlanningViewsGridComponent);
      break;
    }
    default: {
      const { load } = await import('./planning');
      load('#app');
    }
  }
}

void bootstrap();
