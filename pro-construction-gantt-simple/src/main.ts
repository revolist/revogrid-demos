import '../../demo-host.css';
import '@revolist/gantt/styles.css';

const framework = import.meta.env.MODE === 'development' ? 'ts' : import.meta.env.MODE;

async function bootstrap() {
  switch (framework) {
    case 'react': {
      const { mount } = await import('./entry-react');
      mount('#app');
      break;
    }
    case 'vue': {
      const { mount } = await import('./entry-vue');
      mount('#app');
      break;
    }
    case 'angular': {
      const { mount } = await import('./entry-angular');
      await mount('#app');
      break;
    }
    default: {
      const { mount } = await import('./entry-ts');
      mount('#app');
    }
  }
}

void bootstrap();
