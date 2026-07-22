import {
  GridPresetPlugin,
  type GridPresetConfig,
} from '@revolist/revogrid-presets';
import type {
  RowOrderPluginConfig,
  RowSelectConfig,
} from '@revolist/revogrid-pro';

export const projectGridPreset: GridPresetConfig = {
  presets: ['common-column-types', 'project-pipeline'],
  conflictPolicy: 'silent',
};

export const projectPlugins = [
  GridPresetPlugin,
];

export const projectRowOrder: RowOrderPluginConfig = {
  prop: 'task',
  preview: 'compact',
};

export const projectRowSelect: RowSelectConfig = {
  rowOrder: true,
};
