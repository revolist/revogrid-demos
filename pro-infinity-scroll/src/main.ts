import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('./infinity-scroll.react'),
      ]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        import('./infinity-scroll.vue'),
      ]);
      createApp(Demo).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML = '<infinity-scroll-grid></infinity-scroll-grid>';
      const [{ bootstrapApplication }, { InfinityScrollGridComponent }] = await Promise.all([
        import('@angular/platform-browser'),
        import('./infinity-scroll.angular'),
      ]);
      await bootstrapApplication(InfinityScrollGridComponent);
      break;
    }
    default: {
      const { load } = await import('./infinity-scroll');
      load('#app');
    }
  }
}

void bootstrap();
