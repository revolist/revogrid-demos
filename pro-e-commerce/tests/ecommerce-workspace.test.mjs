import assert from 'node:assert/strict';
import test from 'node:test';
import { getEcommerceViewColumns, formatEcommerceAverageSpend, formatEcommerceCustomerCount, resetEcommerceFilters, createEcommerceDerivedState } from '../src/ecommerce.filtering.ts';

test('overview preserves feature contracts and full data without mutating the original columns', () => {
  const summaryVNode = () => 'chart';
  const customer = { prop: 'Customer', name: 'Full customer name', summaryVNode, cellTemplate: () => 'avatar', filter: ['fuzzy'], excelExport: { width: 30 } };
  const columns = [{ name: 'Personal', children: [{ prop: '_checkbox', rowSelect: true }, customer, { prop: 'Gender', filter: ['selection'] }] }, { name: 'Spending', children: [{ prop: 'Total Spend', filter: ['histogramBrush'] }] }];
  const overview = getEcommerceViewColumns(columns, 'overview');
  assert.deepEqual(overview.map(column => column.prop), ['_checkbox', 'Customer', 'Total Spend']);
  assert.equal(overview[0].rowSelect, true);
  assert.equal(overview[1].cellTemplate, customer.cellTemplate);
  assert.equal(overview[1].excelExport, customer.excelExport);
  assert.deepEqual(overview[1].filter, ['fuzzy']);
  assert.ok(overview[1].size >= 220, 'customer names need a readable initial width');
  assert.equal(overview[1].summaryVNode, undefined);
  assert.equal(customer.summaryVNode, summaryVNode, 'All fields retains its summary charts');
  assert.equal(getEcommerceViewColumns(columns, 'all'), columns);
  assert.equal(customer.name, 'Full customer name');
});

test('customer metrics handle empty, zero and negative monetary values', () => {
  assert.equal(formatEcommerceCustomerCount(1000), '1,000');
  assert.equal(formatEcommerceAverageSpend([]), '$0');
  assert.equal(formatEcommerceAverageSpend([{ 'Total Spend': 0 }, { 'Total Spend': 100 }]), '$50');
  assert.equal(formatEcommerceAverageSpend([{ 'Total Spend': -45 }, { 'Total Spend': 45 }]), '$0');
});

test('Reset clears quick and structured/native filter owners without replacing customer data', async () => {
  let calls = 0;
  const source = [{ 'Customer ID': 'one' }];
  const grid = { source, quickFilter: { text: 'Fiona' }, getPlugins: async () => [{ clearFiltering: async () => { calls++; } }] };
  await resetEcommerceFilters(grid);
  assert.equal(grid.quickFilter, undefined);
  assert.equal(calls, 1);
  assert.equal(grid.source, source);
});


test('collapsed grouping headers keep the workspace populated without inventing customers', () => {
  const collapsedGroups = [{ '__rg-name': 'Gold', '__rg-expanded': false }, { '__rg-name': 'Silver', '__rg-expanded': false }];
  const state = createEcommerceDerivedState(collapsedGroups, new Set(['CUS-0001']));
  assert.equal(state.empty, false, 'visible grouping headers must remain accessible');
  assert.deepEqual(state.visibleRows, [], 'collapsed customer rows are not visible');
  assert.equal(state.visibleCount, 0);
  assert.equal(state.totalSpend, 0);
  assert.deepEqual([...state.visibleSelectedIds], []);
  assert.equal(createEcommerceDerivedState([]).empty, true, 'a truly filtered-out source is empty');
});
