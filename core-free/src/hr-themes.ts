import { modernThemeDefinitions } from '@revolist/revogrid';

const BUILT_IN_THEME_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'material', label: 'Material' },
  { value: 'compact', label: 'Compact' },
  { value: 'darkMaterial', label: 'Dark Material' },
  { value: 'darkCompact', label: 'Dark Compact' },
] as const;

function formatThemeLabel(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, character => character.toUpperCase());
}

export const HR_THEME_DEFINITIONS = modernThemeDefinitions;

export const HR_THEME_OPTIONS = [
  ...BUILT_IN_THEME_OPTIONS,
  ...HR_THEME_DEFINITIONS.map(definition => ({
    value: definition.name,
    label: formatThemeLabel(definition.name),
  })),
];

export function getInitialHRTheme(isDark = false) {
  return isDark ? 'darkCompact' : 'compact';
}
