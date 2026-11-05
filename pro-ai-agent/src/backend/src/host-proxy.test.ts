import { expect, it, vi } from 'vitest';
import { createAiHostProxy } from './host-proxy';

const options = {
  backendUrl: 'https://ai.example',
  token: 'private-token-'.repeat(4),
  origin: 'https://app.example',
  getUserId: () => 'session-user',
};
const request = (origin = options.origin) =>
  new Request(`${options.origin}/api/ai-view/interpret`, {
    method: 'POST',
    headers: { Origin: origin, 'X-AI-User-ID': 'spoofed' },
    body: '{}',
  });
it('adds the private key and real session identity without forwarding browser identity', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(
      Response.json(
        { error: 'Limited' },
        { status: 429, headers: { 'Retry-After': '60' } },
      ),
    );
  const response = await createAiHostProxy({ ...options, fetch })(request());
  const headers = new Headers(fetch.mock.calls[0][1]!.headers);
  expect(headers.get('authorization')).toBe(`Bearer ${options.token}`);
  expect(headers.get('x-ai-user-id')).toBe('session-user');
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBe('60');
  expect(JSON.stringify(await response.json())).not.toContain(options.token);
});
it('rejects other origins and unsigned users before contacting the AI service', async () => {
  const fetch = vi.fn();
  expect(
    (
      await createAiHostProxy({ ...options, fetch })(
        request('https://evil.example'),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await createAiHostProxy({
        ...options,
        fetch,
        getUserId: () => undefined,
      })(request())
    ).status,
  ).toBe(401);
  expect(fetch).not.toHaveBeenCalled();
});
