import '../../demo-host.css';
import '@revolist/gantt/styles.css';
import '@revolist/scheduler/styles.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([import('react'), import('react-dom/client'), import('./react')]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([import('vue'), import('./App.vue')]);
      createApp(Demo).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML = '<construction-operations-grid></construction-operations-grid>';
      const [{ bootstrapApplication }, { ConstructionFabricationGanttComponent }] = await Promise.all([import('@angular/platform-browser'), import('./angular')]);
      await bootstrapApplication(ConstructionFabricationGanttComponent);
      break;
    }
    default: {
      const { load } = await import('./vanilla');
      load('#app');
    }
  }
}

void bootstrap();
