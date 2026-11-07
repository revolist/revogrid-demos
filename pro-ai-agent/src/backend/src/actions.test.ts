import { expect, it } from 'vitest';
import { approveRequestedActions, referenceActions } from './actions';
import { resolveAiDemoEndpoint } from '../../AiAssistant.data';

it('connects the demo by default while preserving explicit endpoint configuration', () => {
  expect(resolveAiDemoEndpoint()).toBe('/api/ai-view/interpret');
  expect(resolveAiDemoEndpoint('/custom')).toBe('/custom');
});

const descriptor = {
  name: 'rows.delete',
  description: 'Delete selected rows after approval.',
  inputSchema: {
    type: 'object',
    properties: { rows: { type: 'array', items: { type: 'string' } } },
    required: ['rows'],
    additionalProperties: false,
  },
};
it('accepts every built-in capability and keeps only descriptor metadata', () => {
  expect(approveRequestedActions(undefined)).toEqual([]);
  const actions = Object.keys(referenceActions).map((name) => ({
    ...descriptor,
    name,
  }));
  expect(approveRequestedActions(actions)).toEqual(actions);
});
it('rejects unknown, duplicate, executable and malformed capabilities', () => {
  for (const actions of [
    {},
    [{ ...descriptor, name: 'executeCode' }],
    [descriptor, descriptor],
    [{ ...descriptor, execute: 'callback' }],
    [{ ...descriptor, inputSchema: [] }],
    [{ ...descriptor, inputSchema: { type: 'string' } }],
    [{ ...descriptor, description: 'x'.repeat(4001) }],
  ])
    expect(() => approveRequestedActions(actions)).toThrow(
      'Invalid action capabilities.',
    );
});
