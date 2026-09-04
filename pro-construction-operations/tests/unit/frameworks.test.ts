import { describe, expect, it } from 'vitest';
import angularSource from '../../src/angular.ts?raw';
import reactSource from '../../src/react.tsx?raw';
import vueSource from '../../src/App.vue?raw';

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
