import assert from 'node:assert/strict';
import test from 'node:test';
import { scaleUpRawCompanies } from './scale-up-raw-fixtures.ts';
import { indexScore, scoreComponents, averageScore, percentChange, quarterDirections, aggregateQuarterDirections, quarterDirectionLabel, formatScaleRevenue } from './scale-up-financials.ts';
const million = 1_000_000;
const reading = company => {
  const { fy23, fy24, fy25 } = company.revenue;
  const current = indexScore(percentChange(fy25, fy24), fy25 ? company.ebitda.fy25 / fy25 * 100 : null, fy25 * million);
  const previous = indexScore(percentChange(fy24, fy23), fy24 && company.ebitda.fy24 != null ? company.ebitda.fy24 / fy24 * 100 : null, fy24 == null ? null : fy24 * million);
  return { current, previous };
};
test('reference scores use growth, margin and revenue scale rather than screening answers', () => {
  const company = scaleUpRawCompanies.find(row => row.name === 'Lichtlijn Photonics');
  assert.deepEqual(reading(company), { current: 42.6, previous: 67.3 });
  assert.deepEqual(reading({ ...company, checks: { founder: 'no', exports: 'no', raising: 'no', audited: 'no' } }), reading(company));
  assert.equal(indexScore(null, 10, million), null);
  assert.equal(indexScore(20, 10, 0), null);
  assert.equal(indexScore(200, 90, 200 * million), 100);
});
test('portfolio totals and prior comparisons use the underlying records', () => {
  const companies = scaleUpRawCompanies;
  const sum = fn => companies.reduce((value, company) => value + fn(company), 0);
  const revenue = sum(company => company.revenue.fy25);
  const ebitda = sum(company => company.ebitda.fy25);
  const previousRevenue = sum(company => company.revenue.fy24 ?? 0);
  const previousEbitda = sum(company => company.ebitda.fy24 ?? 0);
  const staff = sum(company => company.staff[8]);
  const previousStaff = sum(company => company.staff[4]);
  assert.equal(revenue.toFixed(1), '1715.0');
  assert.equal((ebitda / revenue * 100).toFixed(1), '1.1');
  assert.equal((ebitda / revenue * 100 - previousEbitda / previousRevenue * 100).toFixed(1), '3.0');
  assert.equal(staff, 8198);
  assert.equal(percentChange(staff, previousStaff).toFixed(1), '6.5');
  assert.equal(averageScore(companies.map(company => reading(company).current)), 55.7);
  assert.equal(averageScore(companies.map(company => reading(company).previous)), 42.6);
  assert.deepEqual(quarterDirections([100,101,103,101,101,null,110]), [0,1,-1,0,null,null]);
});

test('aggregate quarter changes exclude companies missing either quarter', () => {
  assert.equal(aggregateQuarterDirections([[100,110], [null,1000]])[0], 1);
  assert.equal(aggregateQuarterDirections([[100,100], [1000,null]])[0], 0);
  assert.equal(aggregateQuarterDirections([[null,100]])[0], null);
});

test('revenue labels follow the reference million and billion thresholds', () => {
  assert.equal(formatScaleRevenue(48_200_000), '€48.2M');
  assert.equal(formatScaleRevenue(118_900_000), '€119M');
  assert.equal(formatScaleRevenue(1_167_600_000), '€1.17B');
  assert.equal(formatScaleRevenue(-1_200_000), '-€1.2M');
});

test('score components reproduce the reference contribution breakdown', () => {
  const parts = scoreComponents(percentChange(48.2, 33.7), 8.6 / 48.2 * 100, 48_200_000);
  assert.deepEqual([parts.growth, parts.margin, parts.scale].map(n => n.toFixed(1)), ['37.9','25.2','13.8']);
});


test('headcount tooltip direction matches tile thresholds and comparable pairs', () => {
  assert.equal(quarterDirectionLabel(quarterDirections([100, 101])[0]), ', held');
  assert.equal(quarterDirectionLabel(quarterDirections([100, 99])[0]), ', held');
  assert.equal(quarterDirectionLabel(aggregateQuarterDirections([[100, 101]])[0]), ', held');
  assert.equal(quarterDirectionLabel(quarterDirections([100, 102])[0]), ', hired');
  assert.equal(quarterDirectionLabel(aggregateQuarterDirections([[100, 100], [null, 1000]])[0]), ', held');
  assert.equal(quarterDirectionLabel(quarterDirections([null, 100])[0]), '');
});
