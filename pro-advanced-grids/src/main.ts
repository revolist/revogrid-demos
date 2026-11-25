async function bootstrap() {
  const host = document.querySelector<HTMLElement>('#app')!;
  switch (import.meta.env.MODE) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] =
        await Promise.all([
          import('react'),
          import('react-dom/client'),
          import('./workbench.react'),
        ]);
      createRoot(host).render(createElement(Demo));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([
        import('vue'),
        import('./workbench.vue'),
      ]);
      createApp(Demo).mount(host);
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      host.append(document.createElement('advanced-grids-demo'));
      const [{ bootstrapApplication }, { AdvancedGridsComponent }] =
        await Promise.all([
          import('@angular/platform-browser'),
          import('./workbench.angular'),
        ]);
      await bootstrapApplication(AdvancedGridsComponent);
      break;
    }
    default: {
      const { load } = await import('./workbench');
      load('#app');
    }
  }
}

void bootstrap();
