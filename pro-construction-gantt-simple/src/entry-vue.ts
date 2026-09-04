import { createApp } from 'vue';
import Demo from '../../pro-advanced-gantt/src/use-cases/simple-construction/simple-construction.vue';

export function mount(parentSelector: string) {
  createApp(Demo).mount(parentSelector);
}
