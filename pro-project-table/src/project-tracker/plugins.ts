import {
  GridPresetPlugin,
  type GridPresetConfig,
} from '@revolist/revogrid-presets';

export const projectGridPreset: GridPresetConfig = {
  presets: ['common-column-types', 'project-pipeline'],
  conflictPolicy: 'silent',
};

export const projectPlugins = [
  GridPresetPlugin,
];
