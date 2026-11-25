async function bootstrap() {
  const host = document.querySelector<HTMLElement>('#app')!;
  switch (import.meta.env.MODE) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] =
        await Promise.all([
          import('react'),
          import('react-dom/client'),
          import('./forecast.react'),
        ]);
      createRoot(host).render(createElement(Demo));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        import('./forecast.vue'),
      ]);
      createApp(Demo).mount(host);
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      host.append(document.createElement('category-forecast-demo'));
      const [{ bootstrapApplication }, { CategoryForecastComponent }] =
        await Promise.all([
          import('@angular/platform-browser'),
          import('./forecast.angular'),
        ]);
      await bootstrapApplication(CategoryForecastComponent);
      break;
    }
    default: {
      const { load } = await import('./forecast');
      load('#app');
    }
  }
}

void bootstrap();
