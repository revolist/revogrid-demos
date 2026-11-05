import { createServer } from 'node:http';
import { openaiText } from '@tanstack/ai-openai';
import { createAiReferenceHandler } from './handler';
import { createTanStackViewInterpreter } from './interpret';
import { createRemoteGuard } from './remote';
import { readBackendConfig } from './config';
import { scriptedAiViewInterpreter } from '../../AiAssistant.data';

const {
  host,
  port,
  live,
  model: configuredModel,
  origins,
  guardOptions,
  maxOutputTokens,
  gridOnly,
  serverOptions,
  httpLimits,
} = readBackendConfig(process.env);
const guard = guardOptions ? await createRemoteGuard(guardOptions) : undefined;
const interpret = live
  ? createTanStackViewInterpreter(
      openaiText(configuredModel as Parameters<typeof openaiText>[0], {
        maxRetries: 0,
      }),
      (request) => request.fields,
      (request) => request.actions ?? [],
      { maxOutputTokens, gridOnly },
    )
  : scriptedAiViewInterpreter;
const server = createServer(
  createAiReferenceHandler(
    interpret,
    origins,
    {
      mode: live ? 'live' : 'scripted',
      gridOnly,
      ...(live ? { model: configuredModel } : {}),
    },
    guard,
    ['grid.aggregate'],
    httpLimits,
  ),
);
server.requestTimeout = serverOptions.requestTimeout;
server.headersTimeout = serverOptions.headersTimeout;
server.maxHeadersCount = serverOptions.maxHeadersCount;
server.maxConnections = serverOptions.maxConnections;
server.listen(port, host, () => {
  console.log(
    `AI view reference server: http://${host}:${port} (${live ? 'live TanStack model' : 'scripted examples; no model calls'})`,
  );
  if (guard)
    console.log(
      'Remote mode: private host-proxy token required; persistent usage limits enabled.',
    );
  console.log(
    'Connected demo: http://127.0.0.1:5178/demo.html?demo=ai-view-assistant&framework=ts&embed=1',
  );
});
for (const event of ['SIGINT', 'SIGTERM'] as const)
  process.once(event, () => server.close());
