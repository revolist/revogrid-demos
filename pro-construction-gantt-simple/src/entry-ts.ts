import { load } from '../../pro-advanced-gantt/src/use-cases/simple-construction/simple-construction';

export function mount(parentSelector: string) {
  load(parentSelector);
}
