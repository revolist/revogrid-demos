function ecommerceDarkTheme() {
  const root = document.documentElement;
  const explicitTheme = root.dataset.theme?.toLowerCase();
  if (explicitTheme?.startsWith('dark') || root.classList.contains('dark')) return true;
  if (explicitTheme?.startsWith('light') || root.classList.contains('light')) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function currentEcommerceTheme() {
  return { isDark: ecommerceDarkTheme };
}

export function currentEcommerceThemeVue() {
  return { isDark: { value: ecommerceDarkTheme() } };
}
