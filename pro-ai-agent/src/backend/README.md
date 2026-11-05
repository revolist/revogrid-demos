# AI backend example

Part of the [AI assistant examples](../../README.md).

This optional development backend interprets requests with TanStack AI. The grid owns execution, validation, history and Apply/Cancel approval. Provider dependencies and credentials stay on the server.

## Quick start

Use the Node and pnpm versions declared in the root `package.json`. From the repository root, install the full workspace (including development dependencies: this source example runs with `tsx`) and build the public UI and Pro package first:

```sh
pnpm install --frozen-lockfile
pnpm --filter @revolist/ui build:public
pnpm build:pro
```

Then start the backend:

```sh
cp examples/revogrid-demos/pro-ai-agent/src/backend/.env.example examples/revogrid-demos/pro-ai-agent/src/backend/.env.local
pnpm --filter @revolist/ai-backend-example dev
```

Leave the environment values empty for scripted testing without model calls. For real AI, set both `OPENAI_API_KEY` and `AI_MODEL` in that `.env.local` file, then restart the backend. A partially configured environment produces a startup error instead of silently falling back. The file is gitignored.

Run the demo host in another terminal if it is not already running:

```sh
pnpm --filter @revolist/revogrid-demos dev
```

Open [the demo](http://127.0.0.1:5178/demo.html?demo=ai-view-assistant&framework=ts&embed=1). All framework variants try the backend when a request is submitted; no URL flag is needed. If it is unavailable, scripted suggestions continue to work and free-form requests show an unavailable message. Vite forwards `/api/ai-view` to the backend on port 5189, so no endpoint/CORS configuration is needed for this local setup. Explicit component `endpoint` props still take precedence.

Check the configuration at [backend status](http://127.0.0.1:5189/api/ai-view/status): `mode` is `scripted` or `live`, alongside the configured model and supported action names. This reports configuration; it does not make a provider call or verify credentials.

## Restrict questions to the connected grid

`AI_GRID_ONLY=1` is the default. Live requests must classify their scope in the
same structured tool call that returns the result. A grid-scoped result is
validated against the approved fields/actions as usual. An off-topic decision
returns a fixed `unsupported` message asking the user to ask about the grid;
unrelated content is not forwarded. Missing or malformed scope results fail the
request. The browser cannot disable this policy through its request body.

The policy permits questions about the current grid, its data/metadata, available
controls and registered product actions, including contextual grid follow-ups.
It tells the model to reject general chat, unrelated advice/coding/writing,
role-change instructions, and mixed requests with off-topic parts. Mentioning
“grid” or a column name alone does not make a request relevant. History and data
evidence cannot override the policy. The same policy covers answer-only follow-ups.

Scope detection is model-based and can misclassify requests; it is not an absolute
security guarantee or a replacement for authorization and action validation.
Tests use deterministic model responses to verify enforcement, not live-model
classification accuracy. In live mode, rejected requests still consume the normal
request quota and one model call; this policy adds no classifier call. Scripted mode
accepts only its exact grid fixtures and rejects unrecognized requests.

Set `AI_GRID_ONLY=0` on the server to disable the additional scope gate; existing
field/action validation remains in place. Restart/recreate the service after
changing the env. Authenticated status includes `gridOnly` for verification.

## Actions and ownership

The browser already derives fields and enabled actions from the grid configuration. It sends only serializable action descriptors, never execution callbacks. The backend accepts the registered built-in action names, rejects unknown/duplicate/malformed capabilities, and constrains the model to the advertised input schemas. The browser revalidates the result and executes it through existing grid APIs. Mutations still require approval.

This covers inspection/read/find/focus/selection, column layout, grouping, cell updates, row add/duplicate/delete, column add/remove/change, and configured formula/import/export/chart/pivot/backend recipes. Recipes are advertised only when the host actually configures them. The current demo supplies formula, import and CSV export recipes; it does not pretend to provide charts, Pivot or arbitrary backend execution.

The server supplies canonical metadata for approved base fields and column presets (including Total only when advertised), projects allowed grid state, and excludes browser row samples. Browser descriptions, types and arbitrary new fields never replace server policy. Capability descriptors describe the client integration; they do not authorize server-side data access. Production applications supply their own authenticated policy and approved integrations. Responses can be a view command, one typed action, a plain answer or clarification. There is no autonomous multi-action loop. An explicit, bounded answer-only follow-up can summarize an approved read result (see below). Opt-in conversation keeps bounded prior prompts and summaries, without raw row results.

## Questions, context and analytical actions

The shared assistant accepts answer-only responses without applying a view or adding a step. Its built-in layout context contains only disclosed column metadata and grouping. Field hints are explicit and bounded (2,000-character descriptions; at most 100 declared scalar values per field), never inferred by scanning rows.

```ts
const aiAssistant = {
  interpret: createAiViewHttpInterpreter('/api/ai-view/interpret'),
  gridActions: { readRows: true }, // also opts into bounded visible-local aggregates
  conversation: { maxMessages: 8, maxBytes: 8192 },
  exclude: ['privateNotes'],
  overrides: {
    region: { description: 'Sales territory', allowedValues: ['Europe', 'Asia'] },
  },
};
```

`grid.aggregate` computes sum/count/average/min/max using the existing aggregation owner. Its scope is the currently expanded visible local view, never an entire remote dataset. It reads only declared measure/group fields, bounds row/group/result size, and returns no raw records. Use an explicit host-owned backend action for whole-dataset remote analysis.

### Turn an aggregate result into an answer

The grid first computes an authorized result. Opt into one extra interpretation request to answer the original question from that evidence:

```ts
answerFromAction: {
  select(action, result) {
    return action.name === 'grid.aggregate' ? result.data : undefined;
  },
  maxBytes: 8192,
},
```

Nothing is disclosed automatically: the callback must return the projected JSON to send. Returning `undefined` skips the follow-up. Evidence is bounded to 8 KiB by default, 16 KiB maximum; oversized/non-JSON evidence is rejected. Only immediate actions participate, never pending or approved prepared writes. The second request sets `answerOnly: true`, `evidence: { action, data }` and `actions: []`. The server accepts only terminal answer/clarification/unsupported feedback on this request, preventing further actions.

`createAiReferenceHandler` rejects evidence by default; its fifth argument is the server-owned evidence-action allowlist. `server.ts` allows only `grid.aggregate`. A production host should additionally validate the selected evidence against its own application policy. Stop and stale-state checks remain active; if summarization fails the grid keeps the original result. Evidence is discarded after the turn; opt-in conversation can retain the visible answer, which may itself contain business data. This makes **two HTTP/model calls and two quota reservations**, with no automatic retries or action loop.

For native Pivot grouping, aggregation and cross-tabs, import `createPivotAiActions` from `@revolist/pivot` and pass its returned actions to the assistant. Supply the same explicit field disclosure policy as your application. It uses native Pivot configuration/analytical-query APIs and approval; do not also register a same-name recipe. Native Pivot filtering/sorting remains with your configured Pivot/data owner rather than a flat-grid executor.

```ts
const actions = createPivotAiActions(pivotPlugin, {
  fields: ['region', 'year', 'amount'],
  readRows: true, // opt in to bounded aggregate reads
});
// Add actions to your AiAssistantConfig alongside the existing host-owned interpreter/executor.
```

Native Gantt and Scheduler integrations are also opt-in: import `createGanttAiActions` from `@revolist/gantt` or `createSchedulerAiActions` from `@revolist/scheduler` and register their returned actions. Declare allowed read/update fields and permissions; updates use native APIs with previews. The reference service can interpret their registered schemas, but does not create a Gantt or Scheduler owner or obtain business data itself.

Native Kanban is available through `createKanbanAiActions` from `@revolist/kanban`. Register its returned `kanban.readCards`, `kanban.selectCards`, `kanban.updateCard` and `kanban.moveCards` actions with explicit read/update fields and optional permission/destination restrictions. Bounded reads follow filter-visible loaded cards, including collapsed columns and lanes; selection uses the native owner; previewed writes require a local board without configured persistence. Moves reuse native transitions, WIP limits, ranking and history, and require an explicit swimlane on swimlane boards. No card creation/deletion, filtering or highlighting is added.

For a native-board assistant, use an action-only configuration (`fields: []` and a custom executor whose `apply` rejects view commands). Do not run the default flat-grid filter/sort executor against the board projection; native Kanban owns it. The portal guide includes a typechecked configuration example.

The server recognizes these adapter names, but its sample canonical field policy remains an orders policy. A real board integration must supply its own approved server metadata and authorization; descriptor recognition is not a business-data permission check. The same shared assistant UI handles previews and results.

For the complete consumer setup, field derivation, prepared custom actions, local prompt recall and deterministic controller test, see the [AI View Assistant guide](https://pro.rv-grid.com/guides/ai-view-assistant/).

## Small remote deployment

For a combined container deployment, use the root `compose.demos-ai.yml` and
`.env.demos-ai.example`. See [demos Docker deployment](../../../../../../apps/demos/runtime/README.md#deploy-demos-with-the-ai-backend)
for the private backend, public demo proxy, runtime limits and persistent usage
volume. `AI_HOST` defaults to `127.0.0.1`; the Docker target sets `0.0.0.0` only
inside its private container network.

Run one instance on your server, behind your existing HTTPS application/proxy. No Redis or database is needed. The Node service continues binding to loopback; do not publish its plain HTTP port. Install/build the normal workspace dependencies first, including the TypeScript runtime used by this source example.

1. Copy `.env.remote.example` to `.env.local` on the server.
2. Set your exact HTTPS `AI_ALLOWED_ORIGINS`, provider key/model and a random `AI_ACCESS_TOKEN` of at least 32 bytes. Keep both secrets on the server.
3. Set `AI_USAGE_FILE` to persistent storage, then run `NODE_ENV=production pnpm --filter @revolist/ai-backend-example start`.
4. Mount the included `createAiHostProxy` handler on your application's `/api/ai-view/interpret` route, using your existing authenticated session:

```ts
import { createAiHostProxy } from './host-proxy'; // copy this small server-only helper

const aiProxy = createAiHostProxy({
  backendUrl: 'http://127.0.0.1:5189', // use HTTPS if it runs on another host
  token: process.env.AI_ACCESS_TOKEN!,
  origin: 'https://your-app.example',
  getUserId: async (request) => {
    const session = await yourExistingServerSession(request);
    return session?.user.id;
  },
});
// Your app's route returns: await aiProxy(request).
```

The browser uses `createAiViewHttpInterpreter('/api/ai-view/interpret')`. It never receives the access token. The proxy discards any browser-supplied user ID and sends the real session identity. Requests without a session are rejected; Origin checks are an additional browser boundary, not authentication.

Conservative defaults, configurable in `.env.local`:

Set `AI_REMOTE=1` to enforce the allowed application origins, service token and
request quotas below. Local mode (`AI_REMOTE=0`, the default) uses the built-in
loopback demo origins and does not enforce quotas. Production refuses to start
without remote mode. `AI_ALLOWED_ORIGINS` is a comma-separated list of exact HTTPS
origins, for example `https://app.example,https://admin.example:8443`; wildcards,
paths and trailing slashes are rejected. This is the allowed application Origin,
not the backend's bind address (which remains `127.0.0.1`).

```dotenv
AI_REMOTE=1
AI_ALLOWED_ORIGINS=https://your-app.example
AI_ACCESS_TOKEN=<server-only token of at least 32 bytes>
AI_USAGE_FILE=.data/ai-usage.json
AI_REQUESTS_PER_MINUTE=5
AI_REQUESTS_PER_USER_PER_DAY=20
AI_REQUESTS_PER_DAY=200
AI_MAX_CONCURRENT=2
AI_MAX_OUTPUT_TOKENS=1024
```

Restart after changing environment settings. A central Zod schema supplies defaults
and validates startup configuration. Unset numeric settings use their defaults;
explicit empty, zero, fractional, negative or nonnumeric values are rejected,
including settings whose feature is currently disabled. Errors identify env keys
without printing secret values. Quotas/counts/body/prompt limits are capped at
1,000,000, millisecond timeouts at 2,147,483,647, and `PORT` at 65,535.

| Limit | Default |
| --- | --- |
| Per user per minute | 5 requests |
| Per user per UTC day | 20 requests |
| Across all users per UTC day | 200 requests |
| Concurrent model calls | 2 |
| Generated output | 1,024 tokens per model call |
| Request body / prompt | 64 KiB / 4,000 characters |
| HTTP request receive timeout (`AI_REQUEST_TIMEOUT_MS`) | 30,000 ms |
| HTTP headers receive timeout (`AI_HEADERS_TIMEOUT_MS`) | 10,000 ms |
| Headers per request (`AI_MAX_HEADERS_COUNT`) | 50 |
| Open connections (`AI_MAX_CONNECTIONS`) | 100 |
| Handler deadline (`AI_INTERPRET_TIMEOUT_MS`) | 30,000 ms |

`AI_HEADERS_TIMEOUT_MS` must not exceed `AI_REQUEST_TIMEOUT_MS`. The receive
timeouts configure Node's HTTP server; the handler deadline separately bounds
the assistant request, including model processing. `AI_MAX_BODY_BYTES=65536`
and `AI_MAX_PROMPT_CHARS=4000` configure the body/prompt limits above.
`AI_HOST=127.0.0.1` and `PORT=5189` are validated in the same schema. Docker sets
the host to `0.0.0.0` on its private network and keeps its internal port at 5189.
If increasing the handler deadline, keep your client/proxy timeouts above it;
the demos runtime exposes `AI_PROXY_TIMEOUT_MS` (default 35,000 ms).

Daily quota is reserved atomically on disk before contacting the model, survives restarts, and counts failures too. Storage failure blocks requests. The SDK and tool engine do not retry model calls or repair invalid tool calls. Limits return HTTP 429 with `Retry-After`; an unavailable quota store returns 503. When a trusted proxy does not supply a session ID, requests share the socket IP's quota; forwarded IP headers cannot bypass it.

This intentionally supports **one process and one persistent usage file**. Do not run replicas against this file or use ephemeral storage. Limits bound request counts and generated tokens, not an exact currency amount; the configured model and input size also affect cost. Status is private in remote mode and reports the configured limits. Scaling and production business-data endpoints are outside this small reference service.

## Endpoints

- `GET /api/ai-view/status`: configured mode/model, supported action names and execution owner.
- `POST /api/ai-view/interpret`: `{ prompt, view: { filter?, sort }, fields?, actions?, grid?, history?, answerOnly?, evidence? }` → validated command, action, answer, clarification or unsupported result.
- `POST /api/ai-view/rows`: `{ view, offset?, limit? }` → `{ rows, total, offset, limit }` from 5,000 fixture orders, filtered before paging. This remains a separate remote-data example; the connected demo above keeps local execution.

`createTanStackViewInterpreter` accepts any TanStack text adapter and either a static fields/actions or request-based resolvers. No provider secret belongs in frontend configuration.

## Verification

```sh
pnpm --filter @revolist/ai-backend-example lint
pnpm --filter @revolist/ai-backend-example test
```

The reference suite uses the real TanStack tool engine with `fakeText()` for all built-in action names, checks unavailable/invalid capabilities, and includes localhost HTTP tests. Browser coverage passes the real grid registry through HTTP and exercises layout, approved data edits, schema changes and formulas. These tests make no live model calls.

The handler restricts origins/body size and aborts work on disconnect/timeout. Remote mode adds the private proxy token and persistent request quotas described above; the host application still owns session authentication, business-data authorization and deployment policy. This example does not deploy or publish anything.
