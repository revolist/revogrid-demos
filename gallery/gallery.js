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
  void import('/assets/revo-ui.js').then(({ createFrameworkMount, uiComponents }) => {
    const searchHost = controls.querySelector('.catalog-search-control');
    const filterHost = controls.querySelector('.category-filters');
    const groups = [...document.querySelectorAll('.showcase-group')];
    const results = controls.querySelector('.filter-results');
    const empty = document.querySelector('.filter-empty');
    const normalize = value => value.trim().toLocaleLowerCase();
    const searchMount = createFrameworkMount(searchHost, () => {});
    const filterMount = createFrameworkMount(filterHost, () => {});
    const options = [
      { value: 'all', label: 'All examples' },
      ...groups.map(group => ({ value: group.dataset.category, label: group.getAttribute('aria-label') })),
    ];
    let category = 'all';
    let query = '';

    function renderSearch() {
      searchMount.render(uiComponents.SearchInput, {
        id: 'showcase-search',
        placeholder: 'Search examples...',
        autocomplete: 'off',
        value: query,
        onValueChange(value) {
          query = value;
          updateResults();
        },
      });
    }

    function renderCategories() {
      filterMount.render(uiComponents.SegmentedSwitch, {
        role: 'group',
        ariaLabel: 'Filter by category',
        value: category,
        options,
        onChange(value) {
          category = value;
          renderCategories();
          updateResults();
        },
      });
    }

    function updateResults() {
      const terms = normalize(query).split(/\s+/).filter(Boolean);
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
        total += count;
      }
      results.textContent = `${total} ${total === 1 ? 'example' : 'examples'}`;
      empty.hidden = total !== 0;
    }

    empty.querySelector('.filter-reset').addEventListener('click', () => {
      query = '';
      category = 'all';
      renderSearch();
      renderCategories();
      updateResults();
      searchHost.querySelector('input').focus();
    });
    renderSearch();
    renderCategories();
    controls.hidden = false;
    updateResults();
  }).catch(error => console.error('Could not load gallery controls', error));
}
