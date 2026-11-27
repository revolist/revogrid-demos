import assert from 'node:assert/strict';
import test from 'node:test';
import { visitPage } from './visit-paging.ts';
test('sorts the full kitchen list before paging and breaks coverage ties by name', () => {
  const rows = [{label:'Delta',coverage:{rank:.5}}, {label:'Beta',coverage:{rank:.2}}, {label:'Alpha',coverage:{rank:.5}}, {label:'Charlie',coverage:{rank:1}}];
  assert.deepEqual(visitPage(rows,0,2).map(row => row.label), ['Beta','Alpha']);
  assert.deepEqual(visitPage(rows,2,2,{coverage:'desc'}).map(row => row.label), ['Delta','Beta']);
  assert.deepEqual(visitPage(rows,0,2,{label:'desc'}).map(row => row.label), ['Delta','Charlie']);
  assert.deepEqual(visitPage(rows,2,2,{label:'asc'}).map(row => row.label), ['Charlie','Delta']);
});
