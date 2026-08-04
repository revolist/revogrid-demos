import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const execFileAsync = promisify(execFile);
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const HOST = '127.0.0.1';
const PORT = 4317;
const VIEWPORT = { width: 1440, height: 900 };
let activeProject = null;

const demos = [
  {
    id: 'core-free',
    title: 'Core HR Grid',
    subtitle: 'Fast, typed data exploration at any scale',
    story: storyCore,
  },
  {
    id: 'pro-excel',
    title: 'Pro Excel Workbench',
    subtitle: 'Formulas, live collaboration, and spreadsheet workflows',
    story: storyExcel,
  },
  {
    id: 'pro-advanced-pivot',
    title: 'Advanced Financial Pivot',
    subtitle: 'Interactive multidimensional financial analysis',
    story: storyPivot,
  },
  {
    id: 'pro-advanced-kanban',
    title: 'Enterprise Kanban',
    subtitle: 'Workflow columns, swimlanes, WIP limits, and card movement',
    story: storyKanban,
  },
  {
    id: 'pro-advanced-scheduler',
    title: 'Advanced Scheduler',
    subtitle: 'Calendar, resource, and table planning in one workspace',
    story: storyScheduler,
  },
  {
    id: 'pro-advanced-gantt',
    title: 'Advanced Gantt',
    subtitle: 'Dependencies, baselines, resources, and critical path',
    story: storyGantt,
  },
  {
    id: 'pro-advanced-planning',
    title: 'Unified Planning Suite',
    subtitle: 'One task model across Grid, Kanban, Gantt, and Scheduler',
    story: storyPlanning,
  },
  {
    id: 'pro-e-commerce',
    title: 'E-commerce Analytics',
    subtitle: 'Rich customer insights with expressive filtering',
    story: storyEcommerce,
  },
  {
    id: 'pro-project-table',
    title: 'Project Portfolio',
    subtitle: 'Group, prioritize, filter, and manage delivery work',
    story: storyProject,
  },
];

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function projectFromUrl(url, fallbackProject) {
  const pathname = new URL(url, `http://${HOST}:${PORT}`).pathname;
  const [, project, ...segments] = pathname.split('/');
  const knownProject = demos.find((demo) => demo.id === project);
  if (!knownProject && fallbackProject) {
    return { project: fallbackProject, segments: pathname.split('/').filter(Boolean) };
  }
  if (!knownProject) return null;
  return { project, segments };
}

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const refererRoute = request.headers.referer
        ? projectFromUrl(request.headers.referer)
        : null;
      const route = projectFromUrl(
        request.url ?? '/',
        refererRoute?.project ?? activeProject,
      );
      if (!route) {
        response.writeHead(404).end('Unknown demo');
        return;
      }

      const distRoot = join(ROOT, route.project, 'dist');
      const relativePath = route.segments.join('/') || 'index.html';
      let filePath = normalize(join(distRoot, relativePath));
      if (!filePath.startsWith(distRoot)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      try {
        if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html');
      } catch {
        filePath = join(distRoot, 'index.html');
      }

      const body = await readFile(filePath);
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
      });
      response.end(body);
    } catch (error) {
      response.writeHead(500).end(String(error));
    }
  });

  return new Promise((resolveServer, rejectServer) => {
    server.once('error', rejectServer);
    server.listen(PORT, HOST, () => resolveServer(server));
  });
}

async function installPresentation(page, demo) {
  await page.addStyleTag({
    content: `
      #rv-media-brand, #rv-media-caption, #rv-media-cursor { pointer-events: none !important; }
      #rv-media-brand {
        position: fixed; top: 24px; left: 50%; z-index: 2147483645;
        transform: translate(-50%, -14px); opacity: 0;
        display: flex; align-items: center; gap: 13px; padding: 12px 17px 12px 12px;
        color: #111827; background: rgba(255,255,255,.94); border: 1px solid rgba(15,23,42,.1);
        border-radius: 16px; box-shadow: 0 18px 50px rgba(15,23,42,.18);
        font: 600 14px/1.15 Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
        backdrop-filter: blur(14px); transition: opacity .42s ease, transform .42s ease;
      }
      #rv-media-brand.is-visible { opacity: 1; transform: translate(-50%, 0); }
      #rv-media-brand-mark {
        width: 34px; height: 34px; border-radius: 10px;
        display: grid; place-items: center; color: white; font-size: 17px; font-weight: 800;
        background: linear-gradient(145deg, #2563eb, #7c3aed); box-shadow: 0 7px 18px rgba(79,70,229,.3);
      }
      #rv-media-brand-copy { display: grid; gap: 3px; }
      #rv-media-brand-title { letter-spacing: -.01em; }
      #rv-media-brand-subtitle { color: #64748b; font-size: 11px; font-weight: 500; }
      #rv-media-caption {
        position: fixed; left: 50%; bottom: 28px; z-index: 2147483645;
        transform: translate(-50%, 12px); opacity: 0; max-width: min(720px, calc(100vw - 48px));
        padding: 11px 18px; color: white; background: rgba(15,23,42,.88);
        border: 1px solid rgba(255,255,255,.14); border-radius: 999px;
        box-shadow: 0 14px 40px rgba(15,23,42,.24); backdrop-filter: blur(12px);
        font: 600 14px/1.35 Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
        text-align: center; transition: opacity .32s ease, transform .32s ease;
      }
      #rv-media-caption.is-visible { opacity: 1; transform: translate(-50%, 0); }
      #rv-media-cursor {
        position: fixed; top: 0; left: 0; z-index: 2147483647; width: 18px; height: 18px;
        transform: translate(-50%, -50%); border: 2px solid white; border-radius: 50%;
        background: rgba(37,99,235,.82); box-shadow: 0 0 0 5px rgba(37,99,235,.2), 0 3px 12px rgba(15,23,42,.28);
        transition: width .12s ease, height .12s ease, background .12s ease;
      }
      #rv-media-cursor.is-clicking { width: 13px; height: 13px; background: rgba(124,58,237,.95); }
    `,
  });

  await page.evaluate(({ title, subtitle }) => {
    const brand = document.createElement('div');
    brand.id = 'rv-media-brand';
    brand.innerHTML = `
      <span id="rv-media-brand-mark">R</span>
      <span id="rv-media-brand-copy">
        <span id="rv-media-brand-title"></span>
        <span id="rv-media-brand-subtitle"></span>
      </span>`;
    brand.querySelector('#rv-media-brand-title').textContent = title;
    brand.querySelector('#rv-media-brand-subtitle').textContent = subtitle;
    const caption = document.createElement('div');
    caption.id = 'rv-media-caption';
    const cursor = document.createElement('div');
    cursor.id = 'rv-media-cursor';
    cursor.style.left = '720px';
    cursor.style.top = '450px';
    document.body.append(brand, caption, cursor);
    requestAnimationFrame(() => brand.classList.add('is-visible'));
  }, { title: demo.title, subtitle: demo.subtitle });
}

async function caption(page, message, duration = 1250) {
  await page.evaluate((text) => {
    const element = document.querySelector('#rv-media-caption');
    element.textContent = text;
    element.classList.add('is-visible');
  }, message);
  await page.waitForTimeout(duration);
}

async function hideCaption(page, duration = 250) {
  await page.evaluate(() => {
    document.querySelector('#rv-media-caption')?.classList.remove('is-visible');
  });
  await page.waitForTimeout(duration);
}

async function moveCursor(page, x, y, duration = 420) {
  const start = await page.evaluate(() => {
    const cursor = document.querySelector('#rv-media-cursor');
    return {
      x: Number.parseFloat(cursor?.style.left || '720'),
      y: Number.parseFloat(cursor?.style.top || '450'),
    };
  });
  const steps = Math.max(10, Math.round(duration / 22));
  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    const eased = 1 - Math.pow(1 - progress, 3);
    const nextX = start.x + (x - start.x) * eased;
    const nextY = start.y + (y - start.y) * eased;
    await page.mouse.move(nextX, nextY);
    await page.evaluate(({ left, top }) => {
      const cursor = document.querySelector('#rv-media-cursor');
      cursor.style.left = `${left}px`;
      cursor.style.top = `${top}px`;
    }, { left: nextX, top: nextY });
    await page.waitForTimeout(duration / steps);
  }
}

async function pointAt(page, locator) {
  const target = locator.first();
  await target.waitFor({ state: 'visible', timeout: 5000 });
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error('Visible target has no bounding box');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveCursor(page, x, y);
  return { target, x, y };
}

async function click(page, locator, settle = 850) {
  const { target } = await pointAt(page, locator);
  await page.evaluate(() => document.querySelector('#rv-media-cursor')?.classList.add('is-clicking'));
  await target.click();
  await page.waitForTimeout(120);
  await page.evaluate(() => document.querySelector('#rv-media-cursor')?.classList.remove('is-clicking'));
  await page.waitForTimeout(settle);
}

async function drag(page, source, target, settle = 1000) {
  const from = await pointAt(page, source);
  const toBox = await target.first().boundingBox();
  if (!toBox) throw new Error('Drag target has no bounding box');
  const to = { x: toBox.x + toBox.width / 2, y: toBox.y + Math.min(70, toBox.height / 2) };
  await page.mouse.down();
  await page.evaluate(() => document.querySelector('#rv-media-cursor')?.classList.add('is-clicking'));
  await moveCursor(page, to.x, to.y, 850);
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.evaluate(() => document.querySelector('#rv-media-cursor')?.classList.remove('is-clicking'));
  await page.waitForTimeout(settle);
}

async function storyCore(page) {
  await caption(page, 'Generate and explore large typed datasets on demand');
  const select = page.locator('#size-select');
  await pointAt(page, select);
  await select.selectOption('10000');
  await page.waitForTimeout(1900);
  await caption(page, 'Sort rich employee data instantly');
  await click(page, page.getByText('Salary', { exact: true }), 700);
  await caption(page, 'Navigate, select, and edit without leaving the grid');
  await click(page, page.getByText('Avery Chen', { exact: true }).first(), 900);
}

async function storyExcel(page) {
  await caption(page, 'Formula-driven cells stay connected to live workbook data');
  await click(page, page.getByText(/218,000/).first(), 900);
  await pointAt(page, page.getByLabel('Formula bar'));
  await page.waitForTimeout(900);
  await caption(page, 'Collapse complex column groups to focus the workbook');
  await click(page, page.getByLabel('Collapse Actuals'), 750);
  await click(page, page.getByLabel('Expand Actuals'), 750);
  await caption(page, 'Apply formatting while history and collaborators remain visible');
  await click(page, page.getByRole('button', { name: 'Format cell' }), 1000);
}

async function storyPivot(page) {
  await caption(page, 'Switch complete financial models with one preset');
  await click(page, page.getByRole('tab', { name: 'Profitability', exact: true }), 1000);
  await caption(page, 'Drill into generated year and dimension hierarchies');
  const expand2024 = page.getByLabel('Expand 2024');
  if (await expand2024.count()) await click(page, expand2024, 900);
  await caption(page, 'Expand the analytical workspace for presentation-ready reporting');
  await click(page, page.getByRole('button', { name: 'Expand workspace' }), 1100);
}

async function storyKanban(page) {
  await caption(page, 'Cards are projected into workflow columns and team swimlanes');
  const source = page.locator('article[aria-label^="Customer interview synthesis"]');
  const target = page.locator('[aria-label="In progress, Product team"]').first();
  if (await source.count() && await target.count()) {
    await caption(page, 'Move work across stages with synchronized ordering');
    await drag(page, source, target, 1200);
  }
  await caption(page, 'Collapse lanes to keep a busy board focused');
  const lane = page.getByLabel('Collapse swimlane: Platform team');
  if (await lane.count()) {
    await click(page, lane, 800);
    const expandLane = page.getByLabel('Expand swimlane: Platform team');
    if (await expandLane.count()) await click(page, expandLane, 700);
  }
}

async function storyScheduler(page) {
  await caption(page, 'Plan shifts in a polished calendar workspace');
  await click(page, page.getByRole('tab', { name: 'Resource', exact: true }), 1150);
  await caption(page, 'Move from calendar time to resource capacity instantly');
  await click(page, page.getByRole('tab', { name: 'Table', exact: true }), 1050);
  await caption(page, 'Use the synchronized table for operational detail');
  await click(page, page.getByRole('tab', { name: 'Calendar', exact: true }), 900);
  await click(page, page.getByRole('button', { name: 'Month', exact: true }), 1050);
}

async function storyGantt(page) {
  await caption(page, 'See hierarchy, ownership, dependencies, and schedule together');
  await click(page, page.getByText('Baselines', { exact: true }), 1000);
  await caption(page, 'Compare the active schedule with its approved baseline');
  const resize = page.getByLabel('Resize gantt panel');
  if (await resize.count()) {
    const box = await resize.boundingBox();
    if (box) {
      await pointAt(page, resize);
      await page.mouse.down();
      await moveCursor(page, box.x + 105, box.y + box.height / 2, 700);
      await page.mouse.up();
      await page.waitForTimeout(900);
    }
  }
  await caption(page, 'Resize the task table and timeline around the planning task');
  await click(page, page.getByText('Critical path', { exact: true }), 800);
}

async function storyPlanning(page) {
  await caption(page, 'One task model powers every planning surface');
  for (const [view, message] of [
    ['kanban', 'Visualize workflow'],
    ['gantt', 'Coordinate dependencies'],
    ['scheduler', 'Plan on a resource timeline'],
    ['calendar', 'Review work by date'],
    ['grid', 'Return to precise data editing'],
  ]) {
    await caption(page, message, 650);
    await click(page, page.getByRole('tab', { name: view, exact: true }), 850);
  }
}

async function storyEcommerce(page) {
  await caption(page, 'Scan customer value, membership, ratings, and spend at a glance');
  const filter = page.locator('#filterExpression');
  await pointAt(page, filter);
  await filter.fill('Gender eq "Female" and City eq "Chicago"');
  await page.waitForTimeout(1200);
  await caption(page, 'Expression filtering updates rows and totals together');
  await filter.fill('');
  await page.waitForTimeout(900);
  const firstCheckbox = page.locator('input[type="checkbox"]').first();
  if (await firstCheckbox.count()) await click(page, firstCheckbox, 800);
  await caption(page, 'Selection and rich header filters support focused analysis');
}

async function storyProject(page) {
  await caption(page, 'Group a colorful project portfolio around the question at hand');
  await click(page, page.locator('summary').filter({ hasText: 'Group' }), 350);
  await click(page, page.locator('button[data-menu-value="status"]'), 1100);
  await caption(page, 'Portfolio metrics and group summaries update immediately');
  const toggle = page.getByLabel('Collapse all groups');
  if (await toggle.count()) await click(page, toggle, 900);
  await caption(page, 'Collapse the portfolio for a concise executive overview');
  const expand = page.getByLabel('Expand all groups');
  if (await expand.count()) await click(page, expand, 750);
  await click(page, page.locator('summary').filter({ hasText: 'Sort' }), 350);
  await click(page, page.locator('button[data-menu-value="budget:desc"]'), 1000);
}

async function encodeMedia(rawVideo, demo) {
  const assetDir = join(ROOT, demo.id, 'assets');
  const mp4 = join(assetDir, `${demo.id}-walkthrough.mp4`);
  const gif = join(assetDir, `${demo.id}-walkthrough.gif`);
  const poster = join(assetDir, `${demo.id}-walkthrough-poster.png`);
  await mkdir(assetDir, { recursive: true });

  await execFileAsync('ffmpeg', [
    '-y', '-i', rawVideo,
    '-vf', 'fps=30,scale=1440:900:flags=lanczos,format=yuv420p',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-movflags', '+faststart', mp4,
  ]);
  await execFileAsync('ffmpeg', [
    '-y', '-i', mp4,
    '-filter_complex',
    'fps=8,scale=900:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=144:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
    '-loop', '0', gif,
  ]);
  await execFileAsync('ffmpeg', [
    '-y', '-ss', '1.2', '-i', mp4, '-frames:v', '1',
    '-vf', 'scale=1440:900:flags=lanczos', poster,
  ]);
}

async function inspectDemo(page, demo) {
  activeProject = demo.id;
  await page.goto(`http://${HOST}:${PORT}/${demo.id}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `/tmp/revogrid-demo-${demo.id}.png` });
  console.log(`${demo.id}: /tmp/revogrid-demo-${demo.id}.png`);
}

async function recordDemo(browser, demo, temporaryRoot) {
  activeProject = demo.id;
  const videoDir = join(temporaryRoot, demo.id);
  await mkdir(videoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    recordVideo: { dir: videoDir, size: VIEWPORT },
  });
  const page = await context.newPage();
  const video = page.video();
  page.on('console', (message) => {
    if (message.type() === 'error') console.warn(`[${demo.id}] ${message.text()}`);
  });

  await page.goto(`http://${HOST}:${PORT}/${demo.id}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await installPresentation(page, demo);
  await page.waitForTimeout(1600);
  await hideCaption(page, 100);
  await demo.story(page);
  await caption(page, 'Built with RevoGrid', 1100);
  await hideCaption(page, 350);
  await page.evaluate(() => document.querySelector('#rv-media-brand')?.classList.remove('is-visible'));
  await page.waitForTimeout(500);

  await context.close();
  const rawPath = await video.path();
  const stableRawPath = join(temporaryRoot, `${demo.id}.webm`);
  await rename(rawPath, stableRawPath);
  await encodeMedia(stableRawPath, demo);
  console.log(`${demo.id}: recorded`);
}

async function main() {
  const inspect = process.argv.includes('--inspect');
  const selectedArg = process.argv.find((argument) => argument.startsWith('--demo='));
  const selectedId = selectedArg?.slice('--demo='.length);
  const fromArg = process.argv.find((argument) => argument.startsWith('--from='));
  const fromId = fromArg?.slice('--from='.length);
  const fromIndex = fromId ? demos.findIndex((demo) => demo.id === fromId) : -1;
  const selectedDemos = selectedId
    ? demos.filter((demo) => demo.id === selectedId)
    : fromId
      ? demos.slice(fromIndex)
      : demos;
  if (fromId && fromIndex < 0) throw new Error(`Unknown demo: ${fromId}`);
  if (!selectedDemos.length) throw new Error(`Unknown demo: ${selectedId}`);

  for (const demo of selectedDemos) {
    await access(join(ROOT, demo.id, 'dist', 'index.html'));
  }

  const temporaryRoot = await import('node:fs/promises').then(({ mkdtemp }) =>
    mkdtemp(join(tmpdir(), 'revogrid-demo-media-')),
  );
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });

  try {
    if (inspect) {
      const page = await browser.newPage({ viewport: VIEWPORT });
      for (const demo of selectedDemos) await inspectDemo(page, demo);
      await page.close();
    } else {
      for (const demo of selectedDemos) await recordDemo(browser, demo, temporaryRoot);
    }
  } finally {
    await browser.close();
    server.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

await main();
