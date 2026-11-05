import { createHash, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { IncomingMessage } from 'node:http';

export interface RemoteOptions {
  token: string;
  usageFile: string;
  perMinute?: number;
  perUserPerDay?: number;
  perDay?: number;
  maxConcurrent?: number;
  now?: () => number;
}
export class RemoteLimitError extends Error {
  constructor(
    readonly status: 429 | 503,
    readonly retryAfter = 60,
  ) {
    super(
      status === 429
        ? 'AI request limit reached. Try again later.'
        : 'AI usage tracking is unavailable.',
    );
  }
}
interface Usage {
  day: string;
  total: number;
  users: Record<string, number>;
}

/** Single-process guard. Reserve durable quota before a call, never refund failed calls. */
export async function createRemoteGuard(options: RemoteOptions) {
  if (Buffer.byteLength(options.token) < 32)
    throw new Error('AI_ACCESS_TOKEN must contain at least 32 bytes.');
  const now = options.now ?? Date.now;
  const day = () => new Date(now()).toISOString().slice(0, 10);
  let usage: Usage = { day: day(), total: 0, users: {} };
  try {
    const stored = JSON.parse(await readFile(options.usageFile, 'utf8'));
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(stored.day) ||
      !Number.isSafeInteger(stored.total) ||
      stored.total < 0 ||
      !stored.users ||
      typeof stored.users !== 'object' ||
      Array.isArray(stored.users) ||
      Object.values(stored.users).some(
        (value) => !Number.isSafeInteger(value) || Number(value) < 0,
      )
    )
      throw new Error('Invalid AI usage file.');
    usage = stored;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const limits = {
    perMinute: options.perMinute ?? 5,
    perUserPerDay: options.perUserPerDay ?? 20,
    perDay: options.perDay ?? 200,
    maxConcurrent: options.maxConcurrent ?? 2,
  };
  if (
    Object.values(limits).some(
      (value) => !Number.isSafeInteger(value) || value < 1,
    )
  )
    throw new Error('AI usage limits must be positive integers.');
  let active = 0;
  let queue = Promise.resolve();
  let minute = -1;
  const recent = new Map<string, number>();
  const token = Buffer.from(`Bearer ${options.token}`);
  return {
    limits,
    authorized(req: IncomingMessage) {
      const value = Buffer.from(req.headers.authorization ?? '');
      return value.length === token.length && timingSafeEqual(value, token);
    },
    async acquire(req: IncomingMessage): Promise<() => void> {
      if (active >= limits.maxConcurrent) throw new RemoteLimitError(429, 1);
      active++;
      try {
        const operation = queue.then(async () => {
          // Only the authenticated host proxy may set this header. Never trust forwarded IPs.
          const user = req.headers['x-ai-user-id'];
          if (
            user !== undefined &&
            (typeof user !== 'string' || !user.trim() || user.length > 200)
          )
            throw new RemoteLimitError(503);
          const id = createHash('sha256')
            .update(user ?? req.socket.remoteAddress ?? 'unknown')
            .digest('hex');
          const currentMinute = Math.floor(now() / 60_000);
          if (minute !== currentMinute) {
            minute = currentMinute;
            recent.clear();
          }
          const currentDay = day();
          if (currentDay < usage.day) throw new RemoteLimitError(503);
          if (currentDay !== usage.day)
            usage = { day: currentDay, total: 0, users: {} };
          if ((recent.get(id) ?? 0) >= limits.perMinute)
            throw new RemoteLimitError(429);
          if (
            usage.total >= limits.perDay ||
            (usage.users[id] ?? 0) >= limits.perUserPerDay
          )
            throw new RemoteLimitError(
              429,
              Math.max(
                1,
                Math.ceil(
                  (Date.parse(`${currentDay}T00:00:00Z`) + 86_400_000 - now()) /
                    1000,
                ),
              ),
            );
          const next: Usage = {
            day: currentDay,
            total: usage.total + 1,
            users: { ...usage.users, [id]: (usage.users[id] ?? 0) + 1 },
          };
          try {
            await mkdir(dirname(options.usageFile), {
              recursive: true,
              mode: 0o700,
            });
            await writeFile(`${options.usageFile}.tmp`, JSON.stringify(next), {
              mode: 0o600,
            });
            await rename(`${options.usageFile}.tmp`, options.usageFile);
          } catch {
            throw new RemoteLimitError(503);
          }
          usage = next;
          recent.set(id, (recent.get(id) ?? 0) + 1);
        });
        queue = operation.catch(() => {});
        await operation;
      } catch (error) {
        active--;
        throw error;
      }
      let released = false;
      return () => {
        if (!released) {
          released = true;
          active--;
        }
      };
    },
  };
}
export type RemoteGuard = Awaited<ReturnType<typeof createRemoteGuard>>;

export function remoteOrigins(value: string | undefined): string[] {
  const origins =
    value
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  if (
    !origins.length ||
    origins.some((origin) => {
      try {
        const url = new URL(origin);
        return (
          url.protocol !== 'https:' ||
          url.origin !== origin ||
          url.username ||
          url.password
        );
      } catch {
        return true;
      }
    })
  )
    throw new Error(
      'AI_ALLOWED_ORIGINS must list exact HTTPS origins, separated by commas.',
    );
  return origins;
}
