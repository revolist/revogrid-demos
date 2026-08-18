import { describe, expect, it } from 'vitest';
import angularSource from './angular.ts?raw';
import reactSource from './react.tsx?raw';
import vueSource from './App.vue?raw';

describe('construction framework entries', () => {
  it.each([
    ['React', reactSource, '@revolist/react-datagrid', '<RevoGrid'],
    ['Vue', vueSource, '@revolist/vue3-datagrid', '<RevoGrid'],
    ['Angular', angularSource, '@revolist/angular-datagrid', '<revo-grid'],
  ])('renders RevoGrid through the %s wrapper', (_framework, source, packageName, usage) => {
    expect(source).toContain(packageName);
    expect(source).toContain(usage);
    expect(source).not.toContain('mountConstructionFabricationWorkspace');
    expect(source).not.toContain('initializeConstructionGantt');
  });
});
