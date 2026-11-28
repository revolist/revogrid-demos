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

const controls = document.querySelector('.catalog-controls');
if (controls) {
  const search = controls.querySelector('#showcase-search');
  const filters = [...controls.querySelectorAll('[data-category-filter]')];
  const groups = [...document.querySelectorAll('.showcase-group')];
  const results = controls.querySelector('.filter-results');
  const empty = document.querySelector('.filter-empty');
  const normalize = value => value.trim().toLocaleLowerCase();
  let category = 'all';

  function updateResults() {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    let total = 0;
    for (const group of groups) {
      let count = 0;
      for (const card of group.querySelectorAll('.showcase-card')) {
        const text = normalize(card.dataset.search ?? '');
        const matches = (category === 'all' || category === group.dataset.category) && terms.every(term => text.includes(term));
        card.hidden = !matches;
        if (matches) count++;
      }
      group.hidden = count === 0;
      group.querySelector('.showcase-group-heading > span').textContent = `${count} ${count === 1 ? 'example' : 'examples'}`;
      total += count;
    }
    results.textContent = `${total} ${total === 1 ? 'example' : 'examples'}`;
    empty.hidden = total !== 0;
    for (const filter of filters) filter.setAttribute('aria-pressed', String(filter.dataset.categoryFilter === category));
  }

  search.addEventListener('input', updateResults);
  for (const filter of filters) filter.addEventListener('click', () => {
    category = filter.dataset.categoryFilter;
    updateResults();
  });
  empty.querySelector('.filter-reset').addEventListener('click', () => {
    search.value = '';
    category = 'all';
    updateResults();
    search.focus();
  });
  controls.hidden = false;
  updateResults();
}
