const darkMedia = () => window.matchMedia('(prefers-color-scheme: dark)');

function isDarkTheme() {
  const root = document.documentElement;
  const explicitTheme = root.dataset.theme?.toLowerCase();

  if (explicitTheme?.startsWith('dark') || root.classList.contains('dark')) {
    return true;
  }
  if (explicitTheme?.startsWith('light') || root.classList.contains('light')) {
    return false;
  }

  return darkMedia().matches;
}

export function currentTheme() {
  return {
    isDark: isDarkTheme,
  };
}

export function currentThemeVue() {
  return {
    // Vue templates and scripts can consume this ref-shaped value without making
    // the shared helper depend on a package-local Vue installation.
    isDark: { value: isDarkTheme() },
  };
}
