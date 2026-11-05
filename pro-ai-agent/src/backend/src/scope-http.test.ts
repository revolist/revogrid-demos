import { createServer } from 'node:http';
import { expect, it } from 'vitest';
import { fakeText } from '@tanstack/ai/testing';
import { readBackendConfig } from './config';
import { createAiReferenceHandler } from './handler';
import { createTanStackViewInterpreter } from './interpret';
import { GRID_ONLY_MESSAGE } from './scope';

it('enforces the server-owned grid policy through HTTP despite browser opt-out attempts', async () => {
  const config = readBackendConfig({});
  const fake = fakeText();
  fake.setResponses([
    { toolCalls: [{ name: 'configure_view', input: { scope: 'off_topic' } }] },
    { toolCalls: [{ name: 'configure_view', input: {
      scope: 'grid', response: { kind: 'answer', message: 'Amount is a disclosed grid field.' },
    } }] },
  ]);
  const interpret = createTanStackViewInterpreter(fake, request => request.fields, [], { gridOnly: config.gridOnly });
  const server = createServer(createAiReferenceHandler(interpret));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/ai-view/interpret`;
    const submit = (prompt: string) => fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, view: { sort: [] }, gridOnly: false, AI_GRID_ONLY: '0' }),
    });
    const refused = await submit('Tell me a joke about a grid');
    expect(refused.status).toBe(200);
    expect(await refused.json()).toEqual({ kind: 'unsupported', message: GRID_ONLY_MESSAGE });
    const allowed = await submit('What is Amount?');
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ kind: 'answer', message: 'Amount is a disclosed grid field.' });
    expect(fake.state.callCount).toBe(2);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
