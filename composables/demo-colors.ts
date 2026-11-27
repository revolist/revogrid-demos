import { commonColors } from '@revolist/ui/color-palette/common-palettes';

/** Shared series and semantic colors for the showcases. */
export const demoColors = {
  purple: commonColors.hex6647f0,
  purpleLight: commonColors.hexa78bfa,
  violet: commonColors.hex784bd1,
  fuchsia: '#b52ac5',
  indigo: '#3955a8',
  blue: '#0091ff',
  green: commonColors.green600,
  greenFill: `color-mix(in srgb, ${commonColors.green600} 22%, white)`,
  teal: '#00a58f',
  tealText: '#007f70',
  tealMuted: '#30af9d',
  orange: '#f08a36',
  pink: '#ed3d69',
  pinkText: '#bd214e',
  tealFill: '#c5eee7',
  orangeFill: '#ffe0c5',
  pinkFill: '#ffd1dd',
  white: '#ffffff',
  neutralText: '#737373',
  blueText: '#005ea8',
} as const;

/** Distinct department accents and their quiet surfaces. */
export const demoDepartmentColors = {
  footwear: { color: demoColors.purple, tint: '#eeeaff', surface: '#f9f7ff' },
  apparel: { color: demoColors.fuchsia, tint: '#fbe9fb', surface: '#fef8ff' },
  camp: { color: '#0077ca', tint: '#e4f3ff', surface: '#f6fbff' },
  packs: { color: '#c25b14', tint: '#fff0e3', surface: '#fffaf5' },
} as const;

export const demoTargetHeat = {
  farBehind: '#fda4af',
  behind: '#ffe4e6',
  close: '#f3f3f3',
  onTarget: '#d1fae5',
  ahead: '#6ee7b7',
} as const;

/** Expose the same chart colors to CSS-owned chart decorations and legends. */
export function applyDemoChartColors(element: HTMLElement) {
  element.style.setProperty('--demo-chart-primary', demoColors.purple);
  element.style.setProperty('--demo-chart-secondary', demoColors.purpleLight);
  for (const [name, value] of Object.entries(demoColors)) {
    element.style.setProperty(`--demo-color-${name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)}`, value);
  }
  element.style.setProperty('--rv-capacity-dots-filled', demoColors.teal);
  element.style.setProperty('--rv-metric-stack-positive', demoColors.tealText);
  element.style.setProperty('--rv-metric-stack-negative', demoColors.pinkText);
  element.style.setProperty('--rv-variance-bar-positive', demoColors.teal);
  element.style.setProperty('--rv-variance-bar-negative', demoColors.pink);
  element.style.setProperty('--rv-variance-bar-reference', demoColors.pink);
  element.style.setProperty('--rv-tile-positive-border', demoColors.teal);
  element.style.setProperty('--rv-tile-positive', demoColors.tealFill);
  element.style.setProperty('--rv-tile-negative-border', demoColors.pink);
  element.style.setProperty('--rv-tile-negative', demoColors.pinkFill);
}
