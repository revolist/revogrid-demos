import assert from 'node:assert/strict';
import test from 'node:test';
import { getSpreadsheetLeafColumns } from './columns';
import { createSpreadsheetColumns } from './workbook';

function getDepartmentTemplate() {
  const departmentColumn = getSpreadsheetLeafColumns(createSpreadsheetColumns([]))
    .find(column => column.prop === 'department');

  assert.equal(typeof departmentColumn?.cellTemplate, 'function');
  return departmentColumn.cellTemplate!;
}

for (const value of ['', null, undefined]) {
  test(`department template renders no tag for ${String(value) || 'an empty string'}`, () => {
    let renderCalls = 0;
    const h = (...args: unknown[]) => {
      renderCalls += 1;
      return { args };
    };

    const rendered = getDepartmentTemplate()(h as never, { value } as never);

    assert.equal(rendered, '');
    assert.equal(renderCalls, 0);
  });
}

test('department template keeps the tag for non-empty values', () => {
  const h = (tag: string, props: { class: string }, value: string) => ({ tag, props, value });

  const rendered = getDepartmentTemplate()(h as never, { value: 'Sales' } as never) as unknown as {
    tag: string;
    props: { class: string };
    value: string;
  };

  assert.deepEqual(rendered, {
    tag: 'span',
    props: { class: 'spreadsheet-department-tag' },
    value: 'Sales',
  });
});
