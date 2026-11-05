import { expect, it } from 'vitest';
import { resolveReferenceFields } from './fields';
import { aiViewFields } from '../../AiAssistant.data';
import { queryOrders, validateView } from './service';

it('discloses Order and approved preset fields while preserving server-authored metadata', () => {
  expect(resolveReferenceFields(undefined)).toEqual(aiViewFields);
  expect(
    resolveReferenceFields(aiViewFields).some(
      (field) => field.field === 'total',
    ),
  ).toBe(false);
  const fields = resolveReferenceFields([
    { field: 'id' },
    { field: 'private' },
    {
      field: 'total',
      label: 'secret',
      valueType: 'number',
      description: 'private instructions',
      allowedValues: ['private data'],
    },
  ]);
  expect(fields).toHaveLength(2);
  expect(fields[0]).toMatchObject({
    field: 'id',
    label: 'Order',
    valueType: 'string',
  });
  expect(fields[1]).toMatchObject({
    field: 'total',
    label: 'Total',
    valueType: 'string',
  });
  expect(JSON.stringify(fields)).not.toContain('private');
  expect(() =>
    resolveReferenceFields([{ field: 'total' }, { field: 'total' }]),
  ).toThrow('Duplicate');
});
it('validates interpreter views against approved dynamic fields without expanding the remote fixture dataset', () => {
  const fields = resolveReferenceFields([{ field: 'total' }]);
  const view = {
    sort: [],
    filter: {
      type: 'condition',
      field: 'total',
      operator: 'equal',
      valueType: 'string',
      value: '1500',
    },
  };
  expect(validateView(view, fields)).toEqual(view);
  expect(() => queryOrders({ view })).toThrow('Unknown or unavailable field.');
});

it('preserves canonical descriptions and enum hints while rejecting browser replacements', () => {
  const fields = resolveReferenceFields([
    {
      field: 'region',
      description: 'private instructions',
      allowedValues: ['unapproved'],
    },
    { field: 'status', label: 'Order status', allowedValues: ['unapproved'] },
  ]);
  expect(fields[0]).toMatchObject({
    field: 'region',
    description: 'Order region.',
    allowedValues: ['Europe', 'Americas', 'Asia'],
  });
  expect(fields[1]).toMatchObject({
    field: 'status',
    label: 'Order status',
    description: 'Order fulfillment status.',
    allowedValues: ['Open', 'Shipped', 'Cancelled', 'Pending'],
  });
  expect(JSON.stringify(fields)).not.toContain('unapproved');
  expect(JSON.stringify(fields)).not.toContain('private');
});
