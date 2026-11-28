const themeButton = document.querySelector('.theme-toggle');
const systemTheme = window.matchMedia('(prefers-color-scheme: light)');

function currentTheme() {
  return document.documentElement.dataset.theme || (systemTheme.matches ? 'light' : 'dark');
}

function updateThemeButton() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  themeButton.setAttribute('aria-label', `Switch to ${next} theme`);
  themeButton.title = `Switch to ${next} theme`;
}

themeButton.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('revo-gallery-theme', next); } catch {}
  updateThemeButton();
});
systemTheme.addEventListener('change', updateThemeButton);
updateThemeButton();
