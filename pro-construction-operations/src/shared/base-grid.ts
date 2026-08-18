import { currentTheme } from '../../../composables/useRandomData';

export function createBaseGridBindings() {
  return {
    theme: currentTheme().isDark() ? 'darkCompact' : 'compact',
    hideAttribution: true,
    readonly: false,
    range: true,
    resize: true,
    rowSize: 32,
    autoSizeColumn: false,
    filter: {
      selection: {
        sourceRowTypes: ['rgRow'],
        sortDirection: 'none',
        syncCellTemplate: { departmentLabel: true, workArea: true, resourceName: true, statusLabel: true },
      },
    },
  };
}
