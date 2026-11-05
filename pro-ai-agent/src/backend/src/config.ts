import { z } from 'zod';
import { remoteOrigins, type RemoteOptions } from './remote';

export interface AiHttpLimits {
  interpretTimeoutMs: number;
  maxBodyBytes: number;
  maxPromptChars: number;
}

export const DEFAULT_HTTP_LIMITS: Readonly<AiHttpLimits> = {
  interpretTimeoutMs: 30_000,
  maxBodyBytes: 65_536,
  maxPromptChars: 4000,
};

const positiveInteger = (fallback: number, maximum = 1_000_000) =>
  z.coerce.number().int().min(1).max(maximum).default(fallback);
const timeout = (fallback: number) => positiveInteger(fallback, 2_147_483_647);

/** One schema for defaults and startup validation; never print raw env values. */
const backendEnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  AI_HOST: z.string().trim().min(1).default('127.0.0.1'),
  PORT: positiveInteger(5189, 65_535),
  OPENAI_API_KEY: z.string().trim().default(''),
  AI_MODEL: z.string().trim().default(''),
  AI_GRID_ONLY: z.enum(['0', '1']).default('1'),
  AI_REMOTE: z.preprocess(
    value => value === '' ? undefined : value,
    z.enum(['0', '1']).default('0'),
  ),
  AI_ALLOWED_ORIGINS: z.string().optional(),
  AI_ACCESS_TOKEN: z.string().default(''),
  AI_USAGE_FILE: z.string().trim().min(1).default('.data/ai-usage.json'),
  AI_REQUESTS_PER_MINUTE: positiveInteger(5),
  AI_REQUESTS_PER_USER_PER_DAY: positiveInteger(20),
  AI_REQUESTS_PER_DAY: positiveInteger(200),
  AI_MAX_CONCURRENT: positiveInteger(2),
  AI_MAX_OUTPUT_TOKENS: positiveInteger(1024),
  AI_REQUEST_TIMEOUT_MS: timeout(30_000),
  AI_HEADERS_TIMEOUT_MS: timeout(10_000),
  AI_MAX_HEADERS_COUNT: positiveInteger(50),
  AI_MAX_CONNECTIONS: positiveInteger(100),
  AI_INTERPRET_TIMEOUT_MS: timeout(DEFAULT_HTTP_LIMITS.interpretTimeoutMs),
  AI_MAX_BODY_BYTES: positiveInteger(DEFAULT_HTTP_LIMITS.maxBodyBytes),
  AI_MAX_PROMPT_CHARS: positiveInteger(DEFAULT_HTTP_LIMITS.maxPromptChars),
}).superRefine((env, context) => {
  const issue = (path: string, message: string) =>
    context.addIssue({ code: 'custom', path: [path], message });
  if (!!env.OPENAI_API_KEY !== !!env.AI_MODEL)
    issue('AI_MODEL', 'Set both OPENAI_API_KEY and AI_MODEL for live AI, or leave both empty for scripted mode.');
  if (env.NODE_ENV === 'production' && env.AI_REMOTE !== '1')
    issue('AI_REMOTE', 'Production requires AI_REMOTE=1 with an access token, allowed origins and usage limits.');
  if (env.AI_REMOTE === '1' && Buffer.byteLength(env.AI_ACCESS_TOKEN) < 32)
    issue('AI_ACCESS_TOKEN', 'Must contain at least 32 bytes in remote mode.');
  if (env.AI_HEADERS_TIMEOUT_MS > env.AI_REQUEST_TIMEOUT_MS)
    issue('AI_HEADERS_TIMEOUT_MS', 'Must not exceed AI_REQUEST_TIMEOUT_MS.');
});

export function readBackendConfig(input: NodeJS.ProcessEnv) {
  const parsed = backendEnvSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid AI backend environment:\n${errors}`);
  }
  const env = parsed.data;
  const remote = env.AI_REMOTE === '1';
  const origins = remote ? remoteOrigins(env.AI_ALLOWED_ORIGINS) : undefined;
  const guardOptions: RemoteOptions | undefined = remote
    ? {
        token: env.AI_ACCESS_TOKEN,
        usageFile: env.AI_USAGE_FILE,
        perMinute: env.AI_REQUESTS_PER_MINUTE,
        perUserPerDay: env.AI_REQUESTS_PER_USER_PER_DAY,
        perDay: env.AI_REQUESTS_PER_DAY,
        maxConcurrent: env.AI_MAX_CONCURRENT,
      }
    : undefined;
  return {
    host: env.AI_HOST,
    port: env.PORT,
    gridOnly: env.AI_GRID_ONLY === '1',
    live: !!env.OPENAI_API_KEY && !!env.AI_MODEL,
    model: env.AI_MODEL || undefined,
    origins,
    guardOptions,
    maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
    serverOptions: {
      requestTimeout: env.AI_REQUEST_TIMEOUT_MS,
      headersTimeout: env.AI_HEADERS_TIMEOUT_MS,
      maxHeadersCount: env.AI_MAX_HEADERS_COUNT,
      maxConnections: env.AI_MAX_CONNECTIONS,
    },
    httpLimits: {
      interpretTimeoutMs: env.AI_INTERPRET_TIMEOUT_MS,
      maxBodyBytes: env.AI_MAX_BODY_BYTES,
      maxPromptChars: env.AI_MAX_PROMPT_CHARS,
    } satisfies AiHttpLimits,
  };
}
