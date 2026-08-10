import assert from 'node:assert/strict'; import test from 'node:test'; import { readFile } from 'node:fs/promises'; import { transformWithEsbuild } from 'vite';
async function loadShared(){const source=await readFile(new URL('./project-portfolio.shared.ts',import.meta.url),'utf8');const{code}=await transformWithEsbuild(source,'project-portfolio.shared.ts',{loader:'ts',format:'esm'});return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)}
test('portfolio is locally bundled and grouped at two levels',async()=>{const{PROJECTS,createGrouping,TOTAL_BUDGET}=await loadShared();assert.ok(PROJECTS.length>=18);assert.deepEqual(createGrouping(true).props,['department','status']);assert.equal(createGrouping(false).expandedAll,false);assert.ok(TOTAL_BUDGET>1_000_000)});
test('all four framework entry points are present',async()=>{for(const file of ['project-portfolio.vue','project-portfolio.ts','project-portfolio.react.tsx','project-portfolio.angular.ts'])assert.ok((await readFile(new URL(file,import.meta.url),'utf8')).includes('portfolio-demo'))});
test('row headers stay hidden in every framework',async()=>{for(const file of ['project-portfolio.vue','project-portfolio.ts','project-portfolio.react.tsx','project-portfolio.angular.ts'])assert.doesNotMatch(await readFile(new URL(file,import.meta.url),'utf8'),/rowHeaders|row-headers/)});
test('all framework shells bind the host dark-mode state',async()=>{for(const file of ['project-portfolio.vue','project-portfolio.ts','project-portfolio.react.tsx','project-portfolio.angular.ts'])assert.match(await readFile(new URL(file,import.meta.url),'utf8'),/is-dark/);assert.match(await readFile(new URL('./project-portfolio.css',import.meta.url),'utf8'),/\.portfolio-demo\.is-dark/)});
test('the demo and grid can shrink inside the viewport workspace',async()=>{const css=await readFile(new URL('./project-portfolio.css',import.meta.url),'utf8');assert.match(css,/\.portfolio-demo\s*\{[^}]*min-height:\s*0/);assert.match(css,/\.portfolio-grid\s*\{[^}]*min-height:\s*0/)});
test('uses the same neutral workspace surfaces as Grid at Scale',async()=>{const css=await readFile(new URL('./project-portfolio.css',import.meta.url),'utf8');assert.doesNotMatch(css,/\.portfolio-demo\s*\{[^}]*gradient\(/);assert.match(css,/\.portfolio-demo\s*\{[^}]*background:\s*#fff/);assert.match(css,/\.portfolio-demo\.is-dark\s*\{[^}]*background:\s*#1a1a20/)});

test('uses an accessible outlined icon control in every framework',async()=>{
  for(const file of ['project-portfolio.vue','project-portfolio.ts','project-portfolio.react.tsx','project-portfolio.angular.ts']){
    const source=await readFile(new URL(file,import.meta.url),'utf8');
    assert.match(source,/portfolio-toggle/);
    assert.match(source,/fa-angles-(up|down)/);
    assert.match(source,/aria-label/);
  }
});

test('keeps only the action row padded and constrains cell visuals',async()=>{
  const css=await readFile(new URL('./project-portfolio.css',import.meta.url),'utf8');
  assert.match(css,/\.portfolio-demo\s*\{[^}]*padding:\s*0/);
  assert.match(css,/\.portfolio-toolbar\s*\{[^}]*padding:\s*[^;}]*22px/);
  assert.match(css,/\.portfolio-grid\s*\{[^}]*border-left:\s*0[^}]*border-right:\s*0/);
  assert.match(css,/\.portfolio-pill\s*\{[^}]*height:\s*24px[^}]*width:\s*max-content/);
  assert.match(css,/\.portfolio-progress\s*\{[^}]*height:\s*100%/);
});

test('uses white workspace and grid surfaces in light mode',async()=>{
  const css=await readFile(new URL('./project-portfolio.css',import.meta.url),'utf8');
  assert.match(css,/\.portfolio-demo\s*\{[^}]*background:\s*#fff/);
  assert.match(css,/\.portfolio-grid\s*\{[^}]*--revo-grid-background:\s*#fff/);
  assert.match(css,/\.portfolio-grid\s*\{[^}]*--revo-grid-header-bg:\s*#fff/);
  assert.match(css,/\.portfolio-grid\s*\{[^}]*--revo-grid-row-headers-bg:\s*#fff/);
});
