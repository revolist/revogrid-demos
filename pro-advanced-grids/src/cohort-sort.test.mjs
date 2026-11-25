import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { compareCohorts } from './cohort-sort.ts';

test('cohort sorting compares counts and outcome rates, including no answers', () => {
  const rows = [
    { label:'B', answers:100, verified:80, booked:0, arrived:0, started:0, hold:0 },
    { label:'A', answers:200, verified:100, booked:0, arrived:0, started:0, hold:0 },
    { label:'C', answers:0, verified:0, booked:0, arrived:0, started:0, hold:0 },
  ];
  assert.deepEqual([...rows].sort((a,b)=>compareCohorts(a,b,'verified',1)).map(r=>r.label), ['C','A','B']);
  assert.deepEqual([...rows].sort((a,b)=>compareCohorts(a,b,'answers',-1)).map(r=>r.label), ['A','B','C']);
  assert.deepEqual([...rows].sort((a,b)=>compareCohorts(a,b,'label',1)).map(r=>r.label), ['A','B','C']);
});
