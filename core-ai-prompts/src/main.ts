import '../../demo-host.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const [{ createElement }, { createRoot }, { default: Demo }] = await Promise.all([
        import('react'), import('react-dom/client'), import('./prompt-library.react'),
      ]);
      createRoot(document.querySelector('#app')!).render(createElement(Demo, { isDark }));
      break;
    }
    case 'vue': {
      const [{ createApp }, { default: Demo }] = await Promise.all([import('vue'), import('./prompt-library.vue')]);
      createApp(Demo, { isDark }).mount('#app');
      break;
    }
    case 'angular': {
      await import('zone.js');
      await import('@angular/compiler');
      document.querySelector('#app')!.innerHTML = '<prompt-library-demo></prompt-library-demo>';
      const [{ bootstrapApplication }, { PromptLibraryDemoComponent }] = await Promise.all([
        import('@angular/platform-browser'), import('./prompt-library.angular'),
      ]);
      await bootstrapApplication(PromptLibraryDemoComponent);
      break;
    }
    default: {
      const { load } = await import('./prompt-library');
      await load('#app', { isDark });
    }
  }
}

void bootstrap();
