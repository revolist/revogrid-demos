const darkMedia = () => window.matchMedia('(prefers-color-scheme: dark)');

function isDarkTheme(media = darkMedia()) {
  const root = document.documentElement;
  const explicitTheme = root.dataset.theme?.toLowerCase();

  if (explicitTheme?.startsWith('dark') || root.classList.contains('dark')) {
    return true;
  }
  if (explicitTheme?.startsWith('light') || root.classList.contains('light')) {
    return false;
  }

  return media.matches;
}

export function observeCurrentTheme(onChange: (isDark: boolean) => void) {
  const media = darkMedia();
  const emitTheme = () => onChange(isDarkTheme(media));
  const observer = new MutationObserver(emitTheme);

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', emitTheme);
  } else {
    media.addListener?.(emitTheme);
  }
  emitTheme();

  return () => {
    observer.disconnect();
    if (typeof media.removeEventListener === 'function') {
      media.removeEventListener('change', emitTheme);
    } else {
      media.removeListener?.(emitTheme);
    }
  };
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
