import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('./column-collapse.react'),
      ]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        import('./column-collapse.vue'),
      ]);
      createApp(Demo).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML = '<column-collapse-grid></column-collapse-grid>';
      const [{ bootstrapApplication }, { ColumnCollapseGridComponent }] = await Promise.all([
        import('@angular/platform-browser'),
        import('./column-collapse.angular'),
      ]);
      await bootstrapApplication(ColumnCollapseGridComponent);
      break;
    }
    default: {
      const { load } = await import('./column-collapse');
      load('#app');
    }
  }
}

void bootstrap();
