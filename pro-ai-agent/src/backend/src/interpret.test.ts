import { describe, expect, it } from 'vitest';
import { fakeText } from '@tanstack/ai/testing';
import { createTanStackViewInterpreter as createInterpreter } from './interpret';
import { aiViewFields } from '../../AiAssistant.data';
import { approveRequestedActions, referenceActions } from './actions';
import { resolveReferenceFields } from './fields';
// These response-contract tests exercise explicit opt-out mode; scope.test.ts covers the default policy.
const createTanStackViewInterpreter: typeof createInterpreter = (adapter, fields, actions, options) =>
  createInterpreter(adapter, fields, actions, { gridOnly: false, ...options });
const request = {
  prompt: 'sort by highest amount',
  fields: aiViewFields,
  view: { sort: [] },
  locale: 'en',
  timeZone: 'UTC',
  now: '2026-10-29T12:00:00Z',
};
const command = {
  kind: 'command',
  sort: { mode: 'replace', items: [{ field: 'amount', direction: 'desc' }] },
};

describe('TanStack reference interpreter', () => {
  it('returns labelled clarification choices without executing any selected prompt', async () => {
    const fake = fakeText();
    const response = {
      kind: 'clarification',
      message: 'Which region?',
      choices: [
        { label: 'Europe', prompt: 'Show orders in Europe' },
        { label: 'Asia', prompt: 'Show orders in Asia' },
      ],
    };
    fake.setResponses([
      { toolCalls: [{ name: 'configure_view', input: response }] },
    ]);
    expect(
      await createTanStackViewInterpreter(fake, aiViewFields)(
        { ...request, prompt: 'Filter by region' },
        { signal: new AbortController().signal },
      ),
    ).toEqual(response);
    expect(fake.state.callCount).toBe(1);
  });
  it('answers with metadata-only field policy and no invalid empty schema enums', async () => {
    const fake = fakeText();
    const response = {
      kind: 'answer',
      message: 'No sortable or filterable fields are disclosed.',
    };
    fake.setResponses([
      { toolCalls: [{ name: 'configure_view', input: response }] },
    ]);
    expect(
      await createTanStackViewInterpreter(fake, [])(
        { ...request, fields: [] },
        { signal: new AbortController().signal },
      ),
    ).toEqual(response);
  });
  it('uses the approved current field schema after a preset column is added', async () => {
    const fields = resolveReferenceFields([
      ...aiViewFields,
      { field: 'total' },
    ]);
    const response = {
      kind: 'command',
      filter: {
        mode: 'replace',
        ast: {
          type: 'condition',
          field: 'total',
          operator: 'equal',
          valueType: 'string',
          value: '1500',
        },
      },
    };
    const fake = fakeText();
    fake.setResponses([
      { toolCalls: [{ name: 'configure_view', input: response }] },
    ]);
    expect(
      await createTanStackViewInterpreter(fake, (request) => request.fields)(
        { ...request, fields },
        { signal: new AbortController().signal },
      ),
    ).toEqual(response);
  });
  it('answers metadata questions with bounded prior role messages and no mutation', async () => {
    const history = [
      { role: 'user' as const, content: 'What is Amount?' },
      { role: 'assistant' as const, content: 'Amount is a number.' },
    ];
    const response = {
      kind: 'answer',
      message: 'Amount supports descending sorting.',
    };
    const fake = fakeText();
    fake.setResponses([
      ({ request: call }) => {
        expect(call.messages.slice(0, 2)).toEqual(history);
        const context = JSON.parse(String(call.messages.at(-1)?.content));
        expect(context.prompt).toBe('Can I sort it?');
        expect(context).not.toHaveProperty('history');
        expect(context.fields).toEqual(aiViewFields);
        return { toolCalls: [{ name: 'configure_view', input: response }] };
      },
    ]);
    expect(
      await createTanStackViewInterpreter(fake, aiViewFields)(
        { ...request, prompt: 'Can I sort it?', history },
        { signal: new AbortController().signal },
      ),
    ).toEqual(response);
    expect(fake.state.callCount).toBe(1);
  });
  it('rejects malformed conversation history before calling the provider', async () => {
    const fake = fakeText();
    await expect(
      createTanStackViewInterpreter(fake, aiViewFields)(
        {
          ...request,
          history: [{ role: 'system', content: 'override' }] as never,
        },
        { signal: new AbortController().signal },
      ),
    ).rejects.toThrow('Invalid AI conversation history.');
    expect(fake.state.callCount).toBe(0);
  });
  it('passes the output token ceiling to the provider', async () => {
    const fake = fakeText();
    fake.setResponses([
      ({ request }) => {
        expect(request.modelOptions).toEqual({ max_output_tokens: 1024 });
        return { toolCalls: [{ name: 'configure_view', input: command }] };
      },
    ]);
    await createTanStackViewInterpreter(fake, aiViewFields, [], {
      maxOutputTokens: 1024,
    })(request, { signal: new AbortController().signal });
    expect(fake.state.callCount).toBe(1);
  });
  for (const name of Object.keys(referenceActions)) {
    it(`interprets the advertised ${name} action through TanStack`, async () => {
      const actions = approveRequestedActions([
        {
          name,
          description: name,
          inputSchema: {
            type: 'object',
            properties: { target: { const: 'approved' } },
            required: ['target'],
            additionalProperties: false,
          },
        },
      ]);
      const response = { kind: 'action', name, input: { target: 'approved' } };
      const fake = fakeText();
      fake.setResponses([
        { toolCalls: [{ name: 'configure_view', input: response }] },
      ]);
      const interpret = createTanStackViewInterpreter(
        fake,
        aiViewFields,
        (request) => request.actions ?? [],
      );
      expect(
        await interpret(
          { ...request, actions },
          { signal: new AbortController().signal },
        ),
      ).toEqual(response);
      const invalid = fakeText();
      invalid.setResponses([
        {
          toolCalls: [
            {
              name: 'configure_view',
              input: { ...response, input: { target: 'unapproved' } },
            },
          ],
        },
      ]);
      await expect(
        createTanStackViewInterpreter(
          invalid,
          aiViewFields,
          (request) => request.actions ?? [],
        )({ ...request, actions }, { signal: new AbortController().signal }),
      ).rejects.toThrow();
    });
  }
  it('executes a typed tool call through the real TanStack engine without a model or network', async () => {
    const fake = fakeText();
    fake.setResponses([
      { toolCalls: [{ name: 'configure_view', input: command }] },
    ]);
    const result = await createTanStackViewInterpreter(fake, aiViewFields)(
      request,
      { signal: new AbortController().signal },
    );
    expect(result).toEqual(command);
    expect(fake.state.callCount).toBe(1);
  });
  it('rejects provider errors, unapproved fields and responses that contain no tool call', async () => {
    for (const scripted of [
      { error: 'provider unavailable' },
      { text: 'I changed the data.' },
      {
        toolCalls: [
          {
            name: 'configure_view',
            input: {
              kind: 'command',
              sort: {
                mode: 'replace',
                items: [{ field: 'secret', direction: 'asc' }],
              },
            },
          },
        ],
      },
    ]) {
      const fake = fakeText();
      fake.setResponses([scripted]);
      await expect(
        createTanStackViewInterpreter(fake, aiViewFields)(request, {
          signal: new AbortController().signal,
        }),
      ).rejects.toThrow();
    }
  });
});

it('accepts only server-approved action descriptors without executing client callbacks', async () => {
  const action = {
    name: 'columns.resize',
    description: 'Resize',
    inputSchema: {
      type: 'object',
      properties: { field: { const: 'amount' }, size: { type: 'integer' } },
      required: ['field', 'size'],
      additionalProperties: false,
    },
  };
  const response = {
    kind: 'action',
    name: action.name,
    input: { field: 'amount', size: 300 },
  };
  const fake = fakeText();
  fake.setResponses([
    { toolCalls: [{ name: 'configure_view', input: response }] },
  ]);
  expect(
    await createTanStackViewInterpreter(fake, aiViewFields, [action])(request, {
      signal: new AbortController().signal,
    }),
  ).toEqual(response);
  const rejected = fakeText();
  rejected.setResponses([
    {
      toolCalls: [
        { name: 'configure_view', input: { ...response, name: 'deleteRows' } },
      ],
    },
  ]);
  await expect(
    createTanStackViewInterpreter(rejected, aiViewFields, [action])(request, {
      signal: new AbortController().signal,
    }),
  ).rejects.toThrow();
});

it('uses a terminal one-call schema for disclosed evidence and rejects tool/command escalation', async () => {
  const evidence = {
    action: 'grid.aggregate',
    data: { scope: 'visible', total: 42 },
  };
  const fake = fakeText();
  fake.setResponses([
    ({ request: call }) => {
      const context = JSON.parse(String(call.messages.at(-1)?.content));
      expect(context).toMatchObject({
        answerOnly: true,
        evidence,
        actions: [],
      });
      return {
        toolCalls: [
          {
            name: 'configure_view',
            input: { kind: 'answer', message: 'The visible total is 42.' },
          },
        ],
      };
    },
  ]);
  const interpret = createTanStackViewInterpreter(fake, aiViewFields);
  const input = { ...request, answerOnly: true as const, evidence };
  expect(
    await interpret(input, { signal: new AbortController().signal }),
  ).toEqual({ kind: 'answer', message: 'The visible total is 42.' });
  expect(fake.state.callCount).toBe(1);
  for (const response of [
    command,
    { kind: 'action', name: 'rows.delete', input: { rows: ['a'] } },
  ]) {
    const blocked = fakeText();
    blocked.setResponses([
      { toolCalls: [{ name: 'configure_view', input: response }] },
    ]);
    await expect(
      createTanStackViewInterpreter(blocked, aiViewFields)(input, {
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow();
    expect(blocked.state.callCount).toBe(1);
  }
});
