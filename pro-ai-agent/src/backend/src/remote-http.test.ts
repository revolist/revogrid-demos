import { expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRemoteGuard } from './remote';
import { createAiReferenceHandler } from './handler';
import { createAiHostProxy } from './host-proxy';
import { readBackendConfig } from './config';

it('requires host authentication and blocks over-quota calls before the interpreter, including after provider failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ai-remote-http-'));
  const token = 'test-only-private-token-'.repeat(2);
  const origin = 'https://app.example';
  const config = readBackendConfig({
    AI_REMOTE: '1',
    AI_ALLOWED_ORIGINS: origin,
    AI_ACCESS_TOKEN: token,
    AI_USAGE_FILE: join(directory, 'usage.json'),
    AI_REQUESTS_PER_DAY: '1',
  });
  const guard = await createRemoteGuard(config.guardOptions!);
  const interpret = vi.fn(async () => {
    throw new Error('Provider failed');
  });
  const server = createServer(
    createAiReferenceHandler(interpret, config.origins, { mode: 'live' }, guard),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const backendUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const body = JSON.stringify({ prompt: 'Sort amounts', view: { sort: [] } });
    expect(
      (
        await fetch(`${backendUrl}/api/ai-view/interpret`, {
          method: 'POST',
          headers: { Origin: origin },
          body,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await fetch(`${backendUrl}/api/ai-view/interpret`, {
          method: 'POST',
          headers: {
            Origin: 'https://evil.example',
            Authorization: `Bearer ${token}`,
          },
          body,
        })
      ).status,
    ).toBe(403);
    expect(interpret).not.toHaveBeenCalled();
    const proxy = createAiHostProxy({
      backendUrl,
      token,
      origin,
      getUserId: () => 'authenticated-user',
    });
    const request = () =>
      new Request(`${origin}/api/ai-view/interpret`, {
        method: 'POST',
        headers: { Origin: origin, 'X-AI-User-ID': 'spoofed-user' },
        body,
      });
    expect((await proxy(request())).status).toBe(422);
    const limited = await proxy(request());
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
    expect(interpret).toHaveBeenCalledTimes(1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
