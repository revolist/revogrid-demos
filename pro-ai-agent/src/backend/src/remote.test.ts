import { afterEach, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage } from 'node:http';
import { createRemoteGuard, remoteOrigins } from './remote';

const token = 'test-token-not-a-secret-'.repeat(2);
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function file() {
  const directory = await mkdtemp(join(tmpdir(), 'ai-usage-'));
  directories.push(directory);
  return join(directory, 'usage.json');
}
const request = (user = 'alice') =>
  ({
    headers: { authorization: `Bearer ${token}`, 'x-ai-user-id': user },
    socket: { remoteAddress: '127.0.0.1' },
  }) as unknown as IncomingMessage;

it('requires exact HTTPS origins and a private key', async () => {
  expect(
    remoteOrigins('https://app.example,https://other.example'),
  ).toHaveLength(2);
  for (const value of [
    undefined,
    '*',
    'http://app.example',
    'https://app.example/path',
  ])
    expect(() => remoteOrigins(value)).toThrow();
  const guard = await createRemoteGuard({ token, usageFile: await file() });
  expect(guard.authorized(request())).toBe(true);
  expect(guard.authorized({ headers: {} } as IncomingMessage)).toBe(false);
  expect(
    guard.authorized({
      headers: { authorization: 'Bearer wrong' },
    } as IncomingMessage),
  ).toBe(false);
  await expect(
    createRemoteGuard({ token: 'short', usageFile: await file() }),
  ).rejects.toThrow();
});

it('enforces minute, user-day and total-day limits and preserves daily quotas after restart', async () => {
  let now = Date.parse('2026-10-29T12:00:00Z');
  const options = {
    token,
    usageFile: await file(),
    perMinute: 1,
    perUserPerDay: 2,
    perDay: 3,
    now: () => now,
  };
  const guard = await createRemoteGuard(options);
  (await guard.acquire(request()))();
  await expect(guard.acquire(request())).rejects.toMatchObject({ status: 429 });
  now += 60_000;
  (await guard.acquire(request()))();
  now += 60_000;
  await expect(guard.acquire(request())).rejects.toMatchObject({ status: 429 });
  (await guard.acquire(request('bob')))();
  await expect(guard.acquire(request('carol'))).rejects.toMatchObject({
    status: 429,
  });
  const restarted = await createRemoteGuard(options);
  await expect(restarted.acquire(request('carol'))).rejects.toMatchObject({
    status: 429,
  });
  now += 86_400_000;
  (await restarted.acquire(request()))();
  expect(JSON.parse(await readFile(options.usageFile, 'utf8')).total).toBe(1);
});

it('bounds concurrency and serializes durable quota reservations', async () => {
  const usageFile = await file();
  const guard = await createRemoteGuard({ token, usageFile, maxConcurrent: 1 });
  const release = await guard.acquire(request());
  await expect(guard.acquire(request('bob'))).rejects.toMatchObject({
    status: 429,
  });
  release();
  release();
  (await guard.acquire(request('bob')))();
  const limited = await createRemoteGuard({
    token,
    usageFile,
    perDay: 3,
    maxConcurrent: 10,
  });
  const results = await Promise.allSettled(
    ['c', 'd', 'e'].map((user) => limited.acquire(request(user))),
  );
  expect(
    results.filter((result) => result.status === 'fulfilled'),
  ).toHaveLength(1);
  for (const result of results)
    if (result.status === 'fulfilled') result.value();
  expect(JSON.parse(await readFile(usageFile, 'utf8')).total).toBe(3);
});

it('blocks calls if persistent quota storage is invalid or unavailable', async () => {
  const usageFile = await file();
  await writeFile(usageFile, 'invalid');
  await expect(createRemoteGuard({ token, usageFile })).rejects.toThrow();
  await rm(usageFile);
  const blocked = join(usageFile, 'usage.json');
  const guard = await createRemoteGuard({ token, usageFile: blocked });
  await writeFile(usageFile, 'not a directory');
  await expect(guard.acquire(request())).rejects.toMatchObject({ status: 503 });
  await expect(guard.acquire(request())).rejects.toMatchObject({ status: 503 });
});

it('does not accept forwarded IP headers as user identity', async () => {
  const guard = await createRemoteGuard({
    token,
    usageFile: await file(),
    perMinute: 1,
  });
  const first = request();
  delete first.headers['x-ai-user-id'];
  first.headers['x-forwarded-for'] = '1.1.1.1';
  (await guard.acquire(first))();
  first.headers['x-forwarded-for'] = '2.2.2.2';
  await expect(guard.acquire(first)).rejects.toMatchObject({ status: 429 });
});
