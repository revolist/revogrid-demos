import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandStyleFixtures } from './brand-style-fixtures.ts';
import { profitAxisMaximum, styleProfit } from './brand-style-model.ts';

test('fictional styles produce the displayed profit and portfolio loss count', () => {
  const all = Object.values(brandStyleFixtures).flatMap(brand => brand.styles);
  assert.equal(all.length, 44);
  assert.equal(all.filter(style => styleProfit(style) < 0).length, 4);
  const best = all.reduce((a, b) => styleProfit(a) > styleProfit(b) ? a : b);
  assert.equal(best.name, 'Solstice Thermal Layer');
  assert.equal(Math.round(styleProfit(best)), 223057);
  assert.equal(profitAxisMaximum(all), 300000);
  assert.equal(profitAxisMaximum([]), 1);
});

test('style categories describe the products shown in the brand breakdown', () => {
  const expected = new Map([
    ['Trail Jacket', 'Jackets'], ['Everyday Shell', 'Jackets'],
    ['Trek Boot', 'Footwear'], ['Climbing Shoe', 'Footwear'],
    ['Camp Fleece', 'Base Layers'], ['Thermal Layer', 'Base Layers'],
    ['Travel Pack', 'Packs'], ['Camp Blanket', 'Camp'],
  ]);
  for (const style of Object.values(brandStyleFixtures).flatMap(brand => brand.styles)) {
    const category = [...expected].find(([suffix]) => style.name.endsWith(suffix))?.[1];
    assert.ok(category, `Unclassified style: ${style.name}`);
    assert.equal(style.category, category, style.name);
  }
});
