import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { featureSlugs, loadCatalog, root } from './catalog.mjs';

const output = join(root, 'dist');
const catalog = await loadCatalog();

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
    <header class="site-header shell">
      <a class="brand" href="/"><span class="brand-mark">R</span><span>RevoGrid Examples</span></a>
      <a class="top-link" href="https://github.com/revolist/revogrid-demos">Source on GitHub ↗</a>
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
        <span class="edition">${escapeHtml(showcase.edition)}</span>
        <h2>${escapeHtml(showcase.title)}</h2>
        <p>${escapeHtml(showcase.summary)}</p>
        <span class="card-link">Explore showcase →</span>
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
    : `<a class="button" href="${escapeHtml(showcase.productUrl)}">View RevoGrid Core</a>`;
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
  title: 'RevoGrid Examples · Fifteen production-style showcases',
  description: 'Explore RevoGrid Core, Pro filtering, infinity scroll, column collapse, master detail, audit history, and tree data, plus Pivot, Gantt, Kanban, Scheduler, and planning examples in TypeScript, React, Vue, and Angular.',
  content: `<section class="hero shell">
    <span class="eyebrow">RevoGrid in production</span>
    <h1>Fifteen complete ways to build beyond the data grid.</h1>
    <p>Run polished, framework-ready examples for filtering, remote loading, grouped columns, master detail, audit history, hierarchy, analytics, planning, scheduling, workflow, spreadsheets, and high-performance data experiences.</p>
    <div class="hero-actions"><a class="button primary" href="#showcases">Explore all showcases</a><a class="button" href="https://pro.rv-grid.com/guides/installation-npm-trial/">Request trial</a><a class="button" href="https://rv-grid.com/pricing/">Get Pro Advanced</a></div>
  </section>
  <section class="shell" id="showcases">
    <div class="section-heading"><h2>Showcase gallery</h2><p>Every feature includes a live TypeScript build and matching framework implementations.</p></div>
    <div class="showcase-grid">${catalog.map(card).join('')}</div>
  </section>`,
});

await writeFile(join(output, 'index.html'), home);
await writeFile(join(output, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), showcases: catalog.map(({ slug, title, edition }) => ({ slug, title, edition, route: `/${slug}/`, demoRoute: `/${slug}/demo/` })) }, null, 2)}\n`);
await writeFile(join(output, 'CNAME'), 'example.rv-grid.com\n');
await writeFile(join(output, '.nojekyll'), '');

console.log(`Gallery assembled with ${catalog.length} showcases in ${output}`);
