import {
  AdvanceFilterPlugin,
  ColumnAddPopupPlugin,
  ColumnHidePlugin,
  ColumnStretchPlugin,
  ContextMenuPlugin,
  DimensionAnimationPlugin,
  EventManagerPlugin,
  FilterHeaderPlugin,
  RowOrderPlugin,
  RowSelectPlugin,
  type RowOrderPluginConfig,
  type RowSelectConfig,
} from '@revolist/revogrid-pro';

export const projectPlugins = [
  EventManagerPlugin,
  RowOrderPlugin,
  RowSelectPlugin,
  ContextMenuPlugin,
  ColumnStretchPlugin,
  DimensionAnimationPlugin,
  AdvanceFilterPlugin,
  FilterHeaderPlugin,
  ColumnHidePlugin,
  ColumnAddPopupPlugin,
];

export const projectRowOrder: RowOrderPluginConfig = {
  prop: 'task',
  preview: 'compact',
};

export const projectRowSelect: RowSelectConfig = {
  rowOrder: true,
};
