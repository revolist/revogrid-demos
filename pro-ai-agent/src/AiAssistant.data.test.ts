// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import {
  aiDemoStages,
  createAiDemoInterpreter,
  resolveAiDemoEndpoint,
  aiViewFields,
  scriptedAiViewInterpreter,
} from './AiAssistant.data';
it('derives every suggestion from its executable example without duplicate prompts', async () => {
  const examples = aiDemoStages.flatMap((stage) => stage.examples);
  expect(new Set(examples.map((item) => item.prompt.toLowerCase())).size).toBe(
    examples.length,
  );
  for (const stage of aiDemoStages) {
    for (const item of stage.examples) {
      const actions =
        item.response.kind === 'action'
          ? [{ name: item.response.name, description: '', inputSchema: {} }]
          : [];
      const result = await scriptedAiViewInterpreter(
        { prompt: item.prompt, actions } as any,
        { signal: new AbortController().signal },
      );
      expect(result).toEqual(item.response);
      expect(result).not.toBe(item.response);
    }
  }
});

it('discloses the visible Order column as metadata', () => {
  expect(aiViewFields).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'id', label: 'Order' }),
    ]),
  );
});

it('uses the backend without URL flags and preserves explicit endpoints', async () => {
  expect(resolveAiDemoEndpoint()).toBe('/api/ai-view/interpret');
  expect(resolveAiDemoEndpoint('/custom')).toBe('/custom');
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json({ kind: 'answer', message: 'Connected' }),
  );
  const interpret = createAiDemoInterpreter(undefined, { fetch });
  await expect(
    interpret({ prompt: 'A free-form request' } as any, {
      signal: new AbortController().signal,
    }),
  ).resolves.toMatchObject({ message: 'Connected' });
  expect(fetch.mock.calls[0][0]).toBe('/api/ai-view/interpret');
});
it('keeps scripted suggestions working and explains unavailable free-form requests', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () => new Response(null, { status: 503 }),
  );
  const interpret = createAiDemoInterpreter(undefined, { fetch });
  const context = { signal: new AbortController().signal };
  const request = { prompt: 'Show orders above 1000', actions: [] } as any;
  await expect(interpret(request, context)).resolves.toEqual(
    await scriptedAiViewInterpreter(request, context),
  );
  await expect(
    interpret(
      { prompt: 'Find something arbitrary', actions: [] } as any,
      context,
    ),
  ).resolves.toMatchObject({
    kind: 'unsupported',
    message: expect.stringContaining('AI backend is unavailable'),
    suggestions: expect.arrayContaining(['Orders above 1K']),
  });
});
it('does not apply a local suggestion when its backend request was cancelled', async () => {
  const abort = new AbortController();
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    abort.abort();
    throw new DOMException('Stopped', 'AbortError');
  });
  await expect(
    createAiDemoInterpreter(undefined, { fetch })(
      { prompt: 'Show orders above 1000' } as any,
      { signal: abort.signal },
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
});


it('keeps a small set of useful business-labelled suggestions with executable aliases', async () => {
  expect(aiDemoStages.map(stage => stage.suggestions.length)).toEqual([10, 3, 3]);
  const actions = [...new Set(aiDemoStages.flatMap(stage => stage.examples)
    .flatMap(item => item.response.kind === 'action' ? [item.response.name] : []))]
    .map(name => ({ name, description: '', inputSchema: {} }));
  for (const prompt of aiDemoStages.flatMap(stage => stage.suggestions)) {
    expect(prompt).not.toMatch(/show|configurator|settings|pivot/i);
    const response = await scriptedAiViewInterpreter({ prompt, actions } as any, { signal: new AbortController().signal });
    expect(response).toHaveProperty('kind');
    expect(response).not.toMatchObject({ kind: 'unsupported' });
  }
  expect(aiDemoStages[0].suggestions).toContain('Orders above 1K');
  expect(aiDemoStages[0].suggestions).toContain('Totals by status');
});
