const darkMedia = () => window.matchMedia('(prefers-color-scheme: dark)');

export function currentTheme() {
  return {
    isDark: () => darkMedia().matches,
  };
}

export function currentThemeVue() {
  return {
    // Vue templates and scripts can consume this ref-shaped value without making
    // the shared helper depend on a package-local Vue installation.
    isDark: { value: darkMedia().matches },
  };
}
