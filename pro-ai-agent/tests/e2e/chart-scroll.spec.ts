import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compile } from 'sass-embedded';

const require = createRequire(import.meta.url);
const pivotCss = readFileSync(require.resolve('@revolist/pivot/styles.css'), 'utf8');
const dialogCss = compile(new URL('../../../../../../packages/ui/src/_dialog.scss', import.meta.url).pathname).css;
const demoCss = compile(new URL('../../src/ai-assistant.scss', import.meta.url).pathname).css;

test('wheel over embedded charts chains to dashboard and page at the boundaries', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.setContent(`
    <style>${pivotCss}\n${dialogCss}\n${demoCss}
      body { margin: 0; }
      .ai-view-demo__chart { width: 340px; height: 300px; }
      .rv-pivot-chart-embedded { height: 308px; flex: none; }
      .rv-dialog__body { height: 280px; }
      .plot { height: 280px; }
    </style>
    <div class="ai-view-demo__chart">
      ${[1, 2, 3].map(i => `<div class="rv-pivot-chart-embedded"><div class="rv-pivot-chart-dialog__body rv-dialog__body"><div class="plot">Chart ${i}</div></div></div>`).join('')}
    </div>
    <div style="height: 1800px"></div>
  `);
  const dashboard = page.locator('.ai-view-demo__chart');
  await page.mouse.move(170, 150);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => dashboard.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await dashboard.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.mouse.move(170, 150);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await dashboard.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.mouse.move(170, 150);
  await page.mouse.wheel(0, -200);
  await expect.poll(() => dashboard.evaluate(el => el.scrollTop < el.scrollHeight - el.clientHeight)).toBe(true);
});

test('shared embedded bodies chain at both edges while modal surfaces contain scrolling', async ({ page }) => {
  await page.setContent(`
    <style>${dialogCss}
      body { margin: 0; }
      .widget { width: 340px; height: 200px; }
      .content { height: 600px; }
    </style>
    <div class="widget rv-dialog__body"><div class="content">Embedded widget</div></div>
    <div style="height: 1800px"></div>
  `);
  const widget = page.locator('.widget');
  await page.mouse.move(100, 100);
  await page.mouse.wheel(0, 150);
  await expect.poll(() => widget.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await widget.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.mouse.wheel(0, 100);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await widget.evaluate(el => { el.scrollTop = 0; });
  await page.evaluate(() => window.scrollTo(0, 80));
  await page.mouse.move(100, 60);
  await page.mouse.wheel(0, -60);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(80);

  await page.setContent(`
    <style>${dialogCss}
      body { margin: 0; }
      .rv-dialog__surface { width: 340px; height: 200px; }
      .content { height: 600px; }
    </style>
    <div class="rv-dialog__surface"><div class="rv-dialog__body"><div class="content">Modal content</div></div></div>
    <div style="height: 1800px"></div>
  `);
  await page.evaluate(() => window.scrollTo(0, 0));
  const surface = page.locator('.rv-dialog__surface');
  await expect(surface).toHaveCSS('overscroll-behavior-y', 'contain');
  await page.locator('.rv-dialog__body').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.mouse.move(100, 100);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
