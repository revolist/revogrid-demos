import { expect, it } from 'vitest';
import { readBackendConfig } from './config';

const remoteEnv = {
  AI_REMOTE: '1',
  AI_ALLOWED_ORIGINS: 'https://app.example, https://admin.example:8443',
  AI_ACCESS_TOKEN: 'test-only-private-token-'.repeat(2),
};

it('keeps local scripted mode available without remote credentials', () => {
  expect(readBackendConfig({})).toMatchObject({
    host: '127.0.0.1',
    live: false,
    origins: undefined,
    guardOptions: undefined,
  });
});

it('reads allowed application origins and every quota from the environment', () => {
  const config = readBackendConfig({
    ...remoteEnv,
    AI_HOST: '0.0.0.0',
    NODE_ENV: 'production',
    AI_USAGE_FILE: '/persistent/ai-usage.json',
    AI_REQUESTS_PER_MINUTE: '3',
    AI_REQUESTS_PER_USER_PER_DAY: '12',
    AI_REQUESTS_PER_DAY: '50',
    AI_MAX_CONCURRENT: '1',
    OPENAI_API_KEY: 'test-only-provider-key',
    AI_MODEL: 'configured-model',
    AI_MAX_OUTPUT_TOKENS: '512',
  });
  expect(config).toEqual({
    host: '0.0.0.0',
    port: 5189,
    gridOnly: true,
    live: true,
    model: 'configured-model',
    origins: ['https://app.example', 'https://admin.example:8443'],
    guardOptions: {
      token: remoteEnv.AI_ACCESS_TOKEN,
      usageFile: '/persistent/ai-usage.json',
      perMinute: 3,
      perUserPerDay: 12,
      perDay: 50,
      maxConcurrent: 1,
    },
    maxOutputTokens: 512,
    serverOptions: { requestTimeout: 30_000, headersTimeout: 10_000, maxHeadersCount: 50, maxConnections: 100 },
    httpLimits: { interpretTimeoutMs: 30_000, maxBodyBytes: 65_536, maxPromptChars: 4000 },
  });
});

it('enables grid-only mode by default and only permits explicit server-side opt-out', () => {
  expect(readBackendConfig({}).gridOnly).toBe(true);
  expect(readBackendConfig({ AI_GRID_ONLY: '1' }).gridOnly).toBe(true);
  expect(readBackendConfig({ AI_GRID_ONLY: '0' }).gridOnly).toBe(false);
  for (const value of ['', 'true', 'false', '2'])
    expect(() => readBackendConfig({ AI_GRID_ONLY: value })).toThrow('AI_GRID_ONLY');
});

it('reads every HTTP server and handler limit with validated defaults and overrides', () => {
  const config = readBackendConfig({
    PORT: '5200',
    AI_REQUEST_TIMEOUT_MS: '12000',
    AI_HEADERS_TIMEOUT_MS: '3000',
    AI_MAX_HEADERS_COUNT: '20',
    AI_MAX_CONNECTIONS: '10',
    AI_INTERPRET_TIMEOUT_MS: '5000',
    AI_MAX_BODY_BYTES: '256',
    AI_MAX_PROMPT_CHARS: '64',
  });
  expect(config.port).toBe(5200);
  expect(config.serverOptions).toEqual({ requestTimeout: 12000, headersTimeout: 3000, maxHeadersCount: 20, maxConnections: 10 });
  expect(config.httpLimits).toEqual({ interpretTimeoutMs: 5000, maxBodyBytes: 256, maxPromptChars: 64 });
  expect(readBackendConfig({}).serverOptions).toEqual({ requestTimeout: 30_000, headersTimeout: 10_000, maxHeadersCount: 50, maxConnections: 100 });
});

it.each([
  ['PORT', '65536'],
  ['AI_REQUEST_TIMEOUT_MS', '2147483648'],
  ['AI_HEADERS_TIMEOUT_MS', '2147483648'],
  ['AI_INTERPRET_TIMEOUT_MS', '2147483648'],
  ['AI_MAX_HEADERS_COUNT', '1000001'],
  ['AI_MAX_CONNECTIONS', '1000001'],
  ['AI_MAX_BODY_BYTES', '1000001'],
  ['AI_MAX_PROMPT_CHARS', '1000001'],
])('rejects invalid HTTP numeric settings for %s', (name, aboveMaximum) => {
  for (const value of ['', ' ', '0', '-1', '1.5', 'Infinity', 'invalid', aboveMaximum])
    expect(() => readBackendConfig({ [name]: value })).toThrow(name);
});

it('rejects a header deadline longer than the request deadline', () => {
  expect(() => readBackendConfig({ AI_REQUEST_TIMEOUT_MS: '5000' })).toThrow('AI_HEADERS_TIMEOUT_MS');
});

it('reports configuration keys without revealing secret values', () => {
  const secret = 'private-provider-value-not-for-errors';
  try {
    readBackendConfig({ OPENAI_API_KEY: secret, AI_ACCESS_TOKEN: 'private-token', AI_MAX_CONNECTIONS: 'broken' });
    expect.fail('Invalid environment must fail');
  } catch (error) {
    expect(String(error)).toContain('AI_MAX_CONNECTIONS');
    expect(String(error)).not.toContain(secret);
    expect(String(error)).not.toContain('private-token');
  }
  expect(() => readBackendConfig({ ...remoteEnv, AI_ACCESS_TOKEN: 'short' })).toThrow('AI_ACCESS_TOKEN');
  expect(() => readBackendConfig({ AI_HOST: ' ' })).toThrow('AI_HOST');
});

it('uses conservative default remote quotas', () => {
  expect(readBackendConfig(remoteEnv).guardOptions).toMatchObject({
    usageFile: '.data/ai-usage.json',
    perMinute: 5,
    perUserPerDay: 20,
    perDay: 200,
    maxConcurrent: 2,
  });
});

it.each([undefined, '', '*', 'http://app.example', 'https://app.example/path'])(
  'rejects invalid remote origins: %s',
  (AI_ALLOWED_ORIGINS) => {
    expect(() => readBackendConfig({ ...remoteEnv, AI_ALLOWED_ORIGINS })).toThrow(
      'AI_ALLOWED_ORIGINS',
    );
  },
);

it.each([
  'AI_REQUESTS_PER_MINUTE',
  'AI_REQUESTS_PER_USER_PER_DAY',
  'AI_REQUESTS_PER_DAY',
  'AI_MAX_CONCURRENT',
  'AI_MAX_OUTPUT_TOKENS',
])('rejects invalid numeric configuration for %s', (name) => {
  for (const value of ['', '0', '-1', '1.5', 'Infinity', 'invalid', '1000001'])
    expect(() =>
      readBackendConfig({
        ...remoteEnv,
        OPENAI_API_KEY: 'test-only-provider-key',
        AI_MODEL: 'configured-model',
        [name]: value,
      }),
    ).toThrow(name);
});

it('requires remote protection in production and rejects misspelled mode values', () => {
  for (const AI_REMOTE of [undefined, '', '0'])
    expect(() => readBackendConfig({ NODE_ENV: 'production', AI_REMOTE })).toThrow(
      'Production requires AI_REMOTE=1',
    );
  expect(() => readBackendConfig({ AI_REMOTE: 'true' })).toThrow('AI_REMOTE');
});

it('requires both provider settings before enabling live mode', () => {
  expect(() => readBackendConfig({ OPENAI_API_KEY: 'test-only' })).toThrow(
    'Set both OPENAI_API_KEY and AI_MODEL',
  );
  expect(() => readBackendConfig({ AI_MODEL: 'configured-model' })).toThrow(
    'Set both OPENAI_API_KEY and AI_MODEL',
  );
});
