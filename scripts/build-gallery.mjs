import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { featureSlugs, loadCatalog, root } from './catalog.mjs';

const output = join(root, 'dist');
const uiBrowserBundle = createRequire(import.meta.url).resolve('@revolist/ui/browser');
const catalog = await loadCatalog();
const themeIcon = (await readFile(join(root, 'gallery/icons/circle-half-stroke.svg'), 'utf8'))
  .replace('<svg ', '<svg class="theme-icon" aria-hidden="true" focusable="false" ');
const displayTitles = {
  'core': 'Employee Data Grid',
  'core-project-portfolio': 'Grouped Project Portfolio',
  'excel': 'Spreadsheet Workbench',
  'pivot': 'Pivot Table & Charts',
  'gantt': 'Project Gantt Chart',
  'kanban': 'Kanban Workflow Board',
  'scheduler': 'Resource Scheduler',
  'ai-agent': 'Grid AI Assistant',
  'category-forecast': 'Retail Forecast Workbench',
};
const showcaseGroups = [
  { title: 'Analytics & business', description: 'Explore data, uncover insights, and work with real-world business records.', slugs: ['pivot', 'advanced:campaign-performance', 'advanced:product-kpis', 'advanced:category-forecast', 'advanced:supplier-quality', 'advanced:reliability-index', 'advanced:scale-up-index', 'advanced:sales-to-target', 'advanced:brand-scorecard', 'advanced:patient-cohorts', 'category-forecast', 'ai-agent', 'ecommerce'] },
  { title: 'Planning & workflows', description: 'Plan projects, schedule people, and keep work moving.', slugs: ['advanced:service-visits', 'advanced:job-schedule', 'advanced:project-budget', 'gantt', 'kanban', 'scheduler', 'project-table', 'planning', 'construction-operations', 'construction-gantt-simple'] },
  { title: 'Grid features', description: 'See editing, filtering, hierarchies, and other grid capabilities in action.', slugs: ['core', 'core-project-portfolio', 'excel', 'filtering', 'infinity-scroll', 'column-collapse', 'data-grid-context-menu', 'row-master', 'audit-history', 'tree-data'] },
];
const showcaseTitle = (showcase) => displayTitles[showcase.slug] ?? showcase.title;
const advancedGridExamples = [
  ['campaign-performance', 'Marketing Campaign Analytics'], ['product-kpis', 'Product Sales & Profitability'],
  ['service-visits', 'Field Service Visit Planner'], ['category-forecast', 'Retail Demand Forecast'],
  ['job-schedule', 'Venue Changeover Schedule'], ['supplier-quality', 'Supplier Quality Dashboard'],
  ['reliability-index', 'Service Reliability Dashboard'], ['scale-up-index', 'Company Growth Explorer'],
  ['sales-to-target', 'Store Sales vs. Targets'], ['brand-scorecard', 'Brand Portfolio Scorecard'],
  ['project-budget', 'Project Budget Tracker'], ['patient-cohorts', 'Patient Access Cohorts'],
];
const scenarioShowcases = advancedGridExamples.map(([id, title]) => ({
  slug: `advanced:${id}`,
  title,
  summary: 'Interactive grid example',
  edition: 'Pro',
  frameworks: ['ts', 'react', 'vue', 'angular'],
  href: `/examples/${id}/`,
  preview: `/assets/previews/${id}.jpg`,
}));
const galleryCatalog = [...catalog.filter(showcase => showcase.slug !== 'advanced-grids'), ...scenarioShowcases];
const showcasesBySlug = new Map(galleryCatalog.map(showcase => [showcase.slug, showcase]));
const assignedSlugs = new Set(showcaseGroups.flatMap(group => group.slugs));
const additionalShowcases = galleryCatalog.filter(showcase => !assignedSlugs.has(showcase.slug));
if (additionalShowcases.length) showcaseGroups.push({ title: 'More examples', description: 'Explore more ways to work with your data.', slugs: additionalShowcases.map(showcase => showcase.slug) });



function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function page({ title, description, content }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="color-scheme" content="light dark" />
    <title>${escapeHtml(title)}</title>
    <script>try { const theme = localStorage.getItem('revo-gallery-theme'); if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme; } catch {}</script>
    <link rel="stylesheet" href="/assets/gallery.css" />
    <script src="/assets/gallery.js" defer></script>
  </head>
  <body>
    <div class="announcement"><a href="https://rv-grid.com/">Built with RevoGrid <span>· Explore the grid for ambitious applications</span> <b aria-hidden="true">↗</b></a></div>
    <header class="header-bar"><div class="site-header shell">
      <a class="brand" href="/"><img class="brand-mark" src="https://rv-grid.com/logo.svg?skipsvgo" alt="" width="26" height="26" /><span>RevoGrid <span class="brand-muted">Examples</span></span></a>
      <nav class="site-nav" aria-label="Main navigation"><a href="/#showcases">Showcases</a><a href="https://rv-grid.com/guide/">Documentation ↗</a></nav>
      <div class="header-actions"><button class="theme-toggle" type="button" aria-label="Toggle color theme" title="Toggle color theme">${themeIcon}</button><a class="top-link" href="https://github.com/revolist/revogrid-demos">GitHub <span aria-hidden="true">↗</span></a></div>
    </div></header>
    <main>${content}</main>
    <footer class="site-footer"><div class="shell">Production-style examples for RevoGrid Core, Pro, and Pro Advanced.</div></footer>
  </body>
</html>`;
}

function posterName(showcase) {
  return basename(showcase.media.poster);
}

function card(showcase) {
  const searchText = [showcaseTitle(showcase), showcase.summary, showcase.edition, ...(showcase.frameworks ?? []).map(framework => framework === 'ts' ? 'TypeScript' : framework), ...(showcase.highlights ?? [])].join(' ');
  return `<article class="showcase-card" data-search="${escapeHtml(searchText)}">
    <a href="${escapeHtml(showcase.href ?? `/${showcase.slug}/demo/`)}">
      <div class="card-body">
        <div class="card-meta"><h4>${escapeHtml(showcaseTitle(showcase))}</h4><span class="edition">${escapeHtml(showcase.edition)}</span></div>
        <p>${escapeHtml(showcase.summary)}</p>
      </div>
      <div class="card-media"><div class="preview-frame"><img src="${escapeHtml(showcase.preview ?? `/${showcase.slug}/media/${posterName(showcase)}`)}" alt="" loading="lazy" /></div></div>
    </a>
  </article>`;
}

export const home = page({
  title: `RevoGrid Examples · ${galleryCatalog.length} production-style showcases`,
  description: 'Explore RevoGrid Core prompt, portfolio, and large-data workflows, plus Pro filtering, infinity scroll, context menus, Pivot, Gantt, Kanban, Scheduler, and planning examples in TypeScript, React, Vue, and Angular.',
  content: `<section class="hero shell">
    <span class="eyebrow hero-eyebrow"><span class="status-dot"></span> REAL-WORLD EXAMPLES, READY TO EXPLORE</span>
    <h1>See what you can build<br />with <span>RevoGrid.</span></h1>
    <p>From powerful data grids to complete planning applications. Explore ${galleryCatalog.length} interactive showcases built for the way you work.</p>
    <div class="hero-actions"><a class="button primary" href="#showcases">Explore showcases <span aria-hidden="true">↘</span></a><a class="button" href="https://pro.rv-grid.com/guides/installation-npm-trial/">Get Pro Free Trial <span aria-hidden="true">↗</span></a></div>
    <div class="hero-frameworks" aria-label="Supported frameworks">${['TypeScript', 'React', 'Vue', 'Angular'].map((name) => `<img src="/assets/frameworks/${name.toLowerCase()}.svg" alt="${name}" title="${name}" width="25" height="25" />`).join('')}</div>
  </section>
  <section class="catalog-section shell" id="showcases">
    <div class="catalog-intro"><div><span class="eyebrow">THE SHOWCASE COLLECTION</span><h2>Explore what's possible.</h2><p>Discover practical examples, from your first grid to advanced workflows.</p></div></div>
    <div class="catalog-controls" hidden>
      <div class="catalog-search"><label class="visually-hidden" for="showcase-search">Search examples</label><div class="catalog-search-control"></div></div>
      <div class="category-filters"></div>
      <p class="filter-results visually-hidden" role="status" aria-live="polite"></p>
    </div>
    <div class="filter-empty" hidden><p>No examples match your search.</p><button type="button" class="filter-reset">Clear filters</button></div>
    ${showcaseGroups.map((group, index) => {
      const items = group.slugs.map(slug => showcasesBySlug.get(slug)).filter(Boolean);
      return items.length ? `<section class="showcase-group" data-category="${index}" aria-label="${escapeHtml(group.title)}"><div class="showcase-group-heading"><div><h3>${escapeHtml(group.title)}</h3><p>${escapeHtml(group.description)}</p></div></div><div class="showcase-grid">${items.map(card).join('')}</div></section>` : '';
    }).join('')}
  </section>`,
});

export { catalog, scenarioShowcases };

function legacyRedirect(showcase) {
  const target = `/${showcase.slug}/demo/`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${escapeHtml(target)}"><script>location.replace(${JSON.stringify(target)} + location.search + location.hash)</script><title>Opening demo</title></head><body><a href="${escapeHtml(target)}">Open demo</a></body></html>`;
}

export function standaloneExampleHtml(html) {
  return html.replaceAll('./assets/', '/advanced-grids/demo/assets/');
}

export async function buildGallery() {
  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, 'assets'), { recursive: true });
  await cp(join(root, 'gallery/gallery.css'), join(output, 'assets/gallery.css'));
  await cp(join(root, 'gallery/gallery.js'), join(output, 'assets/gallery.js'));
  await cp(uiBrowserBundle, join(output, 'assets/revo-ui.js'));
  await cp(join(root, 'gallery/frameworks'), join(output, 'assets/frameworks'), { recursive: true });
  await cp(join(root, 'gallery/previews'), join(output, 'assets/previews'), { recursive: true });

  for (const showcase of catalog) {
    const source = join(root, showcase.sourceDir);
    const route = join(output, showcase.slug);
    await mkdir(route, { recursive: true });
    await cp(join(source, showcase.demoOutput ?? 'dist'), join(route, 'demo'), { recursive: true });
    await cp(join(source, 'assets'), join(route, 'media'), { recursive: true });
    await writeFile(join(route, 'index.html'), legacyRedirect(showcase));
  }


  const exampleHtml = standaloneExampleHtml(await readFile(join(root, 'pro-advanced-grids', 'dist', 'index.html'), 'utf8'));
  for (const scenario of scenarioShowcases) {
    const route = join(output, 'examples', scenario.slug.slice('advanced:'.length));
    await mkdir(route, { recursive: true });
    await writeFile(join(route, 'index.html'), exampleHtml);
  }

  await writeFile(join(output, 'index.html'), home);
  await writeFile(join(output, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), showcases: catalog.map(({ slug, title, edition }) => ({ slug, title, edition, route: `/${slug}/demo/`, demoRoute: `/${slug}/demo/`, legacyRoute: `/${slug}/` })) }, null, 2)}\n`);
  await writeFile(join(output, 'CNAME'), 'example.rv-grid.com\n');
  await writeFile(join(output, '.nojekyll'), '');

  console.log(`Gallery assembled with ${catalog.length} showcases in ${output}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildGallery();
