import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';
import '@revolist/revogrid-enterprise/dist/revogrid-enterprise.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

async function bootstrap() {
switch (framework) {
  case 'react': {
    const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('./scheduler.react'),
    ]);
    createRoot(document.querySelector('#app')!).render(createElement(Demo));
    break;
  }
  case 'vue': {
    const [{ createApp }, { default: Demo }] = await Promise.all([
      import('vue'),
      import('./scheduler.vue'),
    ]);
    createApp(Demo).mount('#app');
    break;
  }
  case 'angular': {
    await import('zone.js');
    await import('@angular/compiler');
    document.querySelector('#app')!.innerHTML = '<event-scheduler-shift-week-grid></event-scheduler-shift-week-grid>';
    const [{ bootstrapApplication }, { EventSchedulerShiftWeekGridComponent }] = await Promise.all([
      import('@angular/platform-browser'),
      import('./scheduler.angular'),
    ]);
    await bootstrapApplication(EventSchedulerShiftWeekGridComponent);
    break;
  }
  default: {
    const { load } = await import('./scheduler');
    load('#app');
  }
}
}

void bootstrap();
