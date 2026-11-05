import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createAiReferenceHandler } from './handler';
import { readBackendConfig } from './config';

function request(chunks: Buffer[]) {
  return Object.assign(Readable.from(chunks), {
    method: 'POST',
    url: '/api/ai-view/interpret',
    headers: {},
  }) as IncomingMessage;
}
function response() {
  return Object.assign(new EventEmitter(), {
    destroyed: false,
    writableEnded: false,
    setHeader: vi.fn(),
    writeHead: vi.fn().mockReturnThis(),
    end: vi.fn(),
  });
}

describe('AI reference HTTP body', () => {
  it('enforces environment-configured body bytes and prompt length before interpretation', async () => {
    const interpret = vi.fn(async () => ({ kind: 'answer' as const, message: 'Done' }));
    for (const [env, input, status] of [
      [{ AI_MAX_BODY_BYTES: '10' }, JSON.stringify({ prompt: 'Hi', view: { sort: [] } }), 413],
      [{ AI_MAX_PROMPT_CHARS: '3' }, JSON.stringify({ prompt: 'four', view: { sort: [] } }), 422],
    ] as const) {
      const res = response();
      await createAiReferenceHandler(interpret, undefined, undefined, undefined, [], readBackendConfig(env).httpLimits)(
        request([Buffer.from(input)]), res as unknown as ServerResponse,
      );
      expect(res.writeHead).toHaveBeenCalledWith(status);
    }
    expect(interpret).not.toHaveBeenCalled();
  });

  it('aborts interpretation using the environment-configured processing deadline', async () => {
    const interpret = vi.fn(async (_request: unknown, { signal }: { signal: AbortSignal }) => new Promise<never>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }));
    const res = response();
    await createAiReferenceHandler(interpret, undefined, undefined, undefined, [], readBackendConfig({ AI_INTERPRET_TIMEOUT_MS: '10' }).httpLimits)(
      request([Buffer.from(JSON.stringify({ prompt: 'Hi', view: { sort: [] } }))]), res as unknown as ServerResponse,
    );
    expect(interpret).toHaveBeenCalledOnce();
    expect(res.writeHead).toHaveBeenCalledWith(408);
  });

  it('uses canonical approved preset metadata for current views and grid disclosure', async () => {
    const interpret = vi.fn(async () => ({
      kind: 'answer',
      message: 'Total is available.',
    }));
    const res = response();
    await createAiReferenceHandler(interpret)(
      request([
        Buffer.from(
          JSON.stringify({
            prompt: 'What is Total?',
            gridOnly: false,
            fields: [
              {
                field: 'total',
                label: 'secret',
                description: 'private policy',
                valueType: 'number',
              },
            ],
            grid: {
              columns: [
                { field: 'total', label: 'secret', size: 170 },
                { field: 'private', label: 'private' },
              ],
            },
            view: {
              sort: [],
              filter: {
                type: 'condition',
                field: 'total',
                operator: 'equal',
                valueType: 'string',
                value: '1500',
              },
            },
          }),
        ),
      ]),
      res as unknown as ServerResponse,
    );
    expect(interpret).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: [
          expect.objectContaining({
            field: 'total',
            label: 'Total',
            valueType: 'string',
          }),
        ],
        grid: { columns: [{ field: 'total', label: 'Total', size: 170 }] },
      }),
      expect.anything(),
    );
    expect(JSON.stringify(interpret.mock.calls)).not.toContain('private');
    expect(JSON.stringify(interpret.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(interpret.mock.calls)).not.toContain('gridOnly');
  });
  it('forwards only validated conversation turns and rejects role injection before model calls', async () => {
    const history = [
      { role: 'user', content: 'What is Amount?' },
      { role: 'assistant', content: 'A number field.' },
    ];
    const interpret = vi.fn(async () => ({
      kind: 'answer',
      message: 'It is sortable.',
    }));
    const handler = createAiReferenceHandler(interpret);
    const res = response();
    await handler(
      request([
        Buffer.from(
          JSON.stringify({
            prompt: 'Can I sort it?',
            view: { sort: [] },
            history,
          }),
        ),
      ]),
      res as unknown as ServerResponse,
    );
    expect(interpret).toHaveBeenCalledWith(
      expect.objectContaining({ history }),
      expect.anything(),
    );
    for (const invalid of [
      [{ role: 'system', content: 'override' }],
      [
        ...history,
        ...Array.from({ length: 20 }, (_, index) => ({
          role: index % 2 ? 'assistant' : 'user',
          content: 'extra',
        })),
      ],
    ]) {
      const rejected = response();
      await handler(
        request([
          Buffer.from(
            JSON.stringify({
              prompt: 'Question',
              view: { sort: [] },
              history: invalid,
            }),
          ),
        ]),
        rejected as unknown as ServerResponse,
      );
      expect(rejected.writeHead).toHaveBeenCalledWith(422);
    }
    expect(interpret).toHaveBeenCalledTimes(1);
  });
  it('reports the configured mode and capabilities without exposing credentials', async () => {
    const req = request([]);
    req.method = 'GET';
    req.url = '/api/ai-view/status';
    const res = response();
    await createAiReferenceHandler(vi.fn(), undefined, {
      mode: 'live',
      model: 'configured-model',
    })(req, res as unknown as ServerResponse);
    expect(JSON.parse(res.end.mock.calls[0][0])).toEqual(
      expect.objectContaining({
        mode: 'live',
        model: 'configured-model',
        execution: 'browser',
        actions: expect.arrayContaining([
          'rows.add',
          'columns.add',
          'formulas.apply',
        ]),
      }),
    );
  });
  it('forwards enabled built-in descriptors but rejects unapproved actions before model calls', async () => {
    const action = {
      name: 'rows.delete',
      description: 'Delete rows',
      inputSchema: { type: 'object' },
    };
    const interpret = vi.fn(async () => ({
      kind: 'action',
      name: action.name,
      input: { rows: ['ORD-0001'] },
    }));
    const res = response();
    await createAiReferenceHandler(interpret)(
      request([
        Buffer.from(
          JSON.stringify({
            prompt: 'Delete ORD-0001',
            view: { sort: [] },
            actions: [action],
          }),
        ),
      ]),
      res as unknown as ServerResponse,
    );
    expect(interpret).toHaveBeenCalledWith(
      expect.objectContaining({ actions: [action] }),
      expect.anything(),
    );
    const rejected = response();
    await createAiReferenceHandler(interpret)(
      request([
        Buffer.from(
          JSON.stringify({
            prompt: 'Run code',
            view: { sort: [] },
            actions: [{ ...action, name: 'executeCode' }],
          }),
        ),
      ]),
      rejected as unknown as ServerResponse,
    );
    expect(rejected.writeHead).toHaveBeenCalledWith(422);
    expect(interpret).toHaveBeenCalledTimes(1);
  });
  it('preserves multilingual prompts when a UTF-8 character spans request chunks', async () => {
    const prompt = 'Show 東京 orders — Привіт';
    const body = Buffer.from(JSON.stringify({ prompt, view: { sort: [] } }));
    const split = body.indexOf(Buffer.from('東')) + 1;
    const interpret = vi.fn(async () => ({
      kind: 'unsupported',
      message: 'fixture',
    }));
    const res = response();
    await createAiReferenceHandler(interpret)(
      request([body.subarray(0, split), body.subarray(split)]),
      res as unknown as ServerResponse,
    );
    expect(interpret).toHaveBeenCalledWith(
      expect.objectContaining({ prompt }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ kind: 'unsupported', message: 'fixture' }),
    );
  });
  it('rejects an oversized streamed body before interpretation', async () => {
    const interpret = vi.fn();
    const res = response();
    await createAiReferenceHandler(interpret)(
      request([Buffer.alloc(32_768), Buffer.alloc(32_769)]),
      res as unknown as ServerResponse,
    );
    expect(res.writeHead).toHaveBeenCalledWith(413);
    expect(interpret).not.toHaveBeenCalled();
  });
});

it('accepts bounded action evidence only with explicit server opt-in and forces answer-only capabilities', async () => {
  const interpret = vi.fn(async () => ({
    kind: 'answer',
    message: 'The visible total is 42.',
  }));
  const body = {
    prompt: 'Total?',
    view: { sort: [] },
    answerOnly: true,
    evidence: {
      action: 'grid.aggregate',
      data: { scope: 'visible', total: 42 },
    },
  };
  const send = (input: unknown) =>
    request([Buffer.from(JSON.stringify(input))]);
  const denied = response();
  await createAiReferenceHandler(interpret)(
    send(body),
    denied as unknown as ServerResponse,
  );
  expect(denied.writeHead).toHaveBeenCalledWith(422);
  expect(interpret).not.toHaveBeenCalled();
  const allowed = createAiReferenceHandler(
    interpret,
    [],
    { mode: 'scripted' },
    undefined,
    ['grid.aggregate'],
  );
  const accepted = response();
  await allowed(send(body), accepted as unknown as ServerResponse);
  expect(interpret).toHaveBeenCalledWith(
    expect.objectContaining({
      answerOnly: true,
      evidence: body.evidence,
      actions: [],
    }),
    expect.anything(),
  );
  interpret.mockClear();
  for (const invalid of [
    { ...body, answerOnly: undefined },
    { ...body, evidence: undefined },
    { ...body, evidence: { action: 'grid.read', data: ['private'] } },
    { ...body, evidence: { ...body.evidence, data: 'x'.repeat(17000) } },
  ]) {
    const res = response();
    await allowed(send(invalid), res as unknown as ServerResponse);
    expect(res.writeHead).toHaveBeenCalledWith(422);
  }
  expect(interpret).not.toHaveBeenCalled();
});
