import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { featureSlugs, loadCatalog, root } from './catalog.mjs';

const output = join(root, 'dist');
const catalog = await loadCatalog();
const featuredSlugs = ['advanced-grids', 'category-forecast', 'ai-agent'];
const advancedGridExamples = [
  ['campaign-performance', 'Marketing Campaign Analytics'], ['product-kpis', 'Product Sales & Profitability'],
  ['service-visits', 'Field Service Visit Planner'], ['category-forecast', 'Retail Demand Forecast'],
  ['job-schedule', 'Venue Changeover Schedule'], ['supplier-quality', 'Supplier Quality Dashboard'],
  ['reliability-index', 'Service Reliability Dashboard'], ['scale-up-index', 'Company Growth Explorer'],
  ['sales-to-target', 'Store Sales vs. Targets'], ['brand-scorecard', 'Brand Portfolio Scorecard'],
  ['project-budget', 'Project Budget Tracker'], ['patient-cohorts', 'Patient Access Cohorts'],
];
const homeCatalog = [...catalog].sort((a, b) => {
  const rank = (slug) => { const index = featuredSlugs.indexOf(slug); return index < 0 ? featuredSlugs.length : index; };
  return rank(a.slug) - rank(b.slug);
});

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
    <link rel="stylesheet" href="/assets/gallery.css" />
  </head>
  <body>
    <div class="announcement"><a href="https://rv-grid.com/">Built with RevoGrid <span>· Explore the grid for ambitious applications</span> <b aria-hidden="true">↗</b></a></div>
    <header class="site-header shell">
      <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">R</span><span>RevoGrid <span class="brand-muted">Examples</span></span></a>
      <nav class="site-nav" aria-label="Main navigation"><a href="/#showcases">Showcases</a><a href="/advanced-grids/">Advanced grids</a><a href="https://rv-grid.com/guide/">Documentation ↗</a></nav>
      <a class="top-link" href="https://github.com/revolist/revogrid-demos">GitHub <span aria-hidden="true">↗</span></a>
    </header>
    <main>${content}</main>
    <footer class="site-footer"><div class="shell">Production-style examples for RevoGrid Core, Pro, and Pro Advanced.</div></footer>
  </body>
</html>`;
}

function frameworkBadges(frameworks = []) {
  return frameworks.map((framework) => `<span class="badge">${escapeHtml(framework === 'ts' ? 'TypeScript' : framework)}</span>`).join('');
}

function posterName(showcase) {
  return basename(showcase.media.poster);
}

function card(showcase) {
  return `<article class="showcase-card">
    <a href="/${showcase.slug}/">
      <div class="card-media"><img src="/${showcase.slug}/media/${escapeHtml(posterName(showcase))}" alt="${escapeHtml(showcase.title)} showcase" loading="lazy" /></div>
      <div class="card-body">
        <div class="card-meta"><span class="edition">${escapeHtml(showcase.edition)}</span><span class="card-arrow" aria-hidden="true">↗</span></div>
        <h3>${escapeHtml(showcase.title)}</h3>
        <p>${escapeHtml(showcase.summary)}</p>
        <span class="card-link">Explore showcase <span aria-hidden="true">→</span></span>
      </div>
    </a>
  </article>`;
}

function detail(showcase) {
  const recipes = showcase.recipes ?? (showcase.highlights ?? []).map((title, index) => ({
    id: `highlight-${index + 1}`,
    title,
    summary: `Explore ${title.toLowerCase()} in the production-style live showcase.`,
  }));
  const trial = showcase.trialUrl
    ? `<a class="button" href="${escapeHtml(showcase.trialUrl)}">Request trial</a>`
    : `<a class="button" href="${escapeHtml(showcase.productUrl)}">View RevoGrid ${showcase.edition === 'Core' ? 'Core' : 'Pro'}</a>`;
  const pricing = showcase.pricingUrl
    ? `<a class="button" href="${escapeHtml(showcase.pricingUrl)}">Get Pro Advanced</a>`
    : '';
  const screenshots = (showcase.media.screenshots ?? []).map((path, index) =>
    `<img src="./media/${escapeHtml(path.replace(/^assets\//, ''))}" alt="${escapeHtml(showcase.title)} workflow ${index + 1}" loading="lazy" />`,
  ).join('');
  const gallery = screenshots ? `<section class="content-section shell"><h2>Workflow gallery</h2><div class="screenshot-grid">${screenshots}</div></section>` : '';

  return page({
    title: `${showcase.title} · RevoGrid Examples`,
    description: showcase.summary,
    content: `<section class="detail-hero shell">
      <div class="detail-copy">
        <span class="edition">${escapeHtml(showcase.edition)}</span>
        <h1>${escapeHtml(showcase.title)}</h1>
        <p>${escapeHtml(showcase.summary)}</p>
        <div class="frameworks" aria-label="Framework examples">${frameworkBadges(showcase.frameworks)}</div>
        <div class="actions">
          <a class="button primary" href="./demo/">View live demo</a>
          ${trial}${pricing}
          <a class="button" href="${escapeHtml(showcase.repositoryUrl)}">View source</a>
        </div>
      </div>
      <div class="poster"><img src="./media/${escapeHtml(posterName(showcase))}" alt="${escapeHtml(showcase.title)} preview" /></div>
    </section>
    <section class="content-section shell">
      <div class="section-heading"><h2>What to explore</h2><p>Focused paths from first integration to production workflows.</p></div>
      <div class="recipe-grid">${recipes.map((recipe) => `<article class="recipe"><span class="eyebrow">${escapeHtml(recipe.id)}</span><h3>${escapeHtml(recipe.title)}</h3><p>${escapeHtml(recipe.summary)}</p></article>`).join('')}</div>
    </section>${gallery}`,
  });
}

await rm(output, { recursive: true, force: true });
await mkdir(join(output, 'assets'), { recursive: true });
await cp(join(root, 'gallery/gallery.css'), join(output, 'assets/gallery.css'));

for (const showcase of catalog) {
  const source = join(root, showcase.sourceDir);
  const route = join(output, showcase.slug);
  await mkdir(route, { recursive: true });
  await cp(join(source, showcase.demoOutput ?? 'dist'), join(route, 'demo'), { recursive: true });
  await cp(join(source, 'assets'), join(route, 'media'), { recursive: true });
  await writeFile(join(route, 'index.html'), detail(showcase));
}

const home = page({
  title: `RevoGrid Examples · ${catalog.length} production-style showcases`,
  description: 'Explore RevoGrid Core prompt, portfolio, and large-data workflows, plus Pro filtering, infinity scroll, context menus, Pivot, Gantt, Kanban, Scheduler, and planning examples in TypeScript, React, Vue, and Angular.',
  content: `<section class="hero shell">
    <span class="eyebrow hero-eyebrow"><span class="status-dot"></span> REAL-WORLD EXAMPLES, READY TO EXPLORE</span>
    <h1>See what you can build<br />with <span>RevoGrid.</span></h1>
    <p>From powerful data grids to complete planning applications. Explore ${catalog.length} interactive showcases built for the way you work.</p>
    <div class="hero-actions"><a class="button primary" href="#showcases">Explore showcases <span aria-hidden="true">↘</span></a><a class="button" href="https://github.com/revolist/revogrid-demos">View on GitHub <span aria-hidden="true">↗</span></a></div>
    <div class="hero-frameworks"><span>BUILT FOR YOUR STACK</span><b>TypeScript</b><b>React</b><b>Vue</b><b>Angular</b></div>
  </section>
  <section class="advanced-section shell" aria-labelledby="advanced-heading">
    <div class="advanced-heading"><div><span class="eyebrow">ADVANCED GRID EXAMPLES</span><h2 id="advanced-heading">A closer look at what's possible.</h2><p>Jump straight into a real-world grid.</p></div><a href="/advanced-grids/">About the workbench <span aria-hidden="true">→</span></a></div>
    <div class="advanced-grid">${advancedGridExamples.map(([id, title]) => `<a href="/advanced-grids/demo/#${escapeHtml(id)}"><span>${escapeHtml(title)}</span><span aria-hidden="true">↗</span></a>`).join('')}</div>
  </section>
  <section class="catalog-section shell" id="showcases">
    <div class="catalog-intro"><div><span class="eyebrow">THE SHOWCASE COLLECTION</span><h2>Explore what's possible.</h2><p>Discover practical examples, from your first grid to advanced workflows.</p></div><span class="catalog-count">${catalog.length} showcases <span aria-hidden="true">↗</span></span></div>
    <div class="showcase-grid">${homeCatalog.map(card).join('')}</div>
  </section>`,
});

await writeFile(join(output, 'index.html'), home);
await writeFile(join(output, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), showcases: catalog.map(({ slug, title, edition }) => ({ slug, title, edition, route: `/${slug}/`, demoRoute: `/${slug}/demo/` })) }, null, 2)}\n`);
await writeFile(join(output, 'CNAME'), 'example.rv-grid.com\n');
await writeFile(join(output, '.nojekyll'), '');

console.log(`Gallery assembled with ${catalog.length} showcases in ${output}`);
