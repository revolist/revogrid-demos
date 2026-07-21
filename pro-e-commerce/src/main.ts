import '../../demo-host.css';
import '@revolist/revogrid-pro/dist/revogrid-pro.css';
import { ECOMMERCE_DATA } from './sys-data/ecommerce.data';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('./ecommerce.react'),
      ]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo, { rows: ECOMMERCE_DATA }));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        import('./ecommerce.vue'),
      ]);
      createApp(Demo, { rows: ECOMMERCE_DATA }).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML = '<ecommerce-grid></ecommerce-grid>';
      const [{ bootstrapApplication }, { ECommerceGridComponent }] = await Promise.all([
        import('@angular/platform-browser'),
        import('./ecommerce.angular'),
      ]);
      const app = await bootstrapApplication(ECommerceGridComponent);
      app.components[0]?.setInput('rows', ECOMMERCE_DATA);
      break;
    }
    default: {
      const { load } = await import('./ecommerce');
      load('#app', ECOMMERCE_DATA);
    }
  }
}

void bootstrap();
