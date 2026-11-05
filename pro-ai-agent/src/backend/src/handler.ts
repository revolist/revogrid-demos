import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  validateAiConversationHistory,
  validateAiActionEvidence,
  projectAiGridState,
  type AiGridState,
  type AiViewInterpreter,
  type AiViewRequest,
} from '@revolist/revogrid-pro';
import { resolveReferenceFields } from './fields';
import { queryOrders, validateView } from './service';
import { approveRequestedActions, referenceActions } from './actions';
import { RemoteLimitError, type RemoteGuard } from './remote';
import { DEFAULT_HTTP_LIMITS, type AiHttpLimits } from './config';

export function createAiReferenceHandler(
  interpret: AiViewInterpreter,
  origins = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5178',
    'http://localhost:5178',
    'http://127.0.0.1:4179',
  ],
  status: { mode: 'scripted' | 'live'; model?: string; gridOnly?: boolean } = { mode: 'scripted' },
  guard?: RemoteGuard,
  evidenceActions: readonly string[] = [],
  limits: Readonly<AiHttpLimits> = DEFAULT_HTTP_LIMITS,
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.headers.origin && !origins.includes(req.headers.origin)) {
      res.writeHead(403).end();
      return;
    }
    if (req.headers.origin)
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }
    if (guard && !guard.authorized(req)) {
      res
        .writeHead(401)
        .end(JSON.stringify({ error: 'Unauthorized AI request.' }));
      return;
    }
    if (
      req.method === 'GET' &&
      req.url?.split('?')[0] === '/api/ai-view/status'
    ) {
      res.end(
        JSON.stringify({
          ...status,
          actions: Object.keys(referenceActions),
          execution: 'browser',
          ...(guard ? { limits: guard.limits } : {}),
        }),
      );
      return;
    }
    if (req.method !== 'POST') {
      res.writeHead(405).end();
      return;
    }
    const abort = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) abort.abort();
    });
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(limits.interpretTimeoutMs)]);
    let release: (() => void) | undefined;
    try {
      const chunks: Buffer[] = [];
      let bodyBytes = 0;
      for await (const chunk of req) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bodyBytes += buffer.length;
        if (bodyBytes > limits.maxBodyBytes) {
          res.writeHead(413).end();
          return;
        }
        chunks.push(buffer);
      }
      // Decode once so a multibyte character split across network chunks stays intact.
      const input = JSON.parse(
        Buffer.concat(chunks, bodyBytes).toString('utf8'),
      );
      const path = req.url?.split('?')[0];
      if (path === '/api/ai-view/rows') {
        res.end(JSON.stringify(queryOrders(input)));
        return;
      }
      if (path !== '/api/ai-view/interpret') {
        res.writeHead(404).end();
        return;
      }
      if (
        typeof input.prompt !== 'string' ||
        !input.prompt.trim() ||
        input.prompt.length > limits.maxPromptChars
      )
        throw new Error('Invalid prompt.');
      if (input.answerOnly !== undefined && input.answerOnly !== true)
        throw new Error('Invalid answer-only request.');
      if ((input.evidence !== undefined) !== (input.answerOnly === true))
        throw new Error('Invalid answer-only request.');
      // The demo server owns its schema and does not accept browser-supplied rows or field policy.
      const fields = resolveReferenceFields(input.fields);
      const request: AiViewRequest = {
        prompt: input.prompt,
        fields,
        actions: approveRequestedActions(input.actions),
        ...(input.answerOnly
          ? {
              answerOnly: true as const,
              evidence: validateAiActionEvidence(
                input.evidence,
                evidenceActions,
                16384,
              ),
              actions: [],
            }
          : {}),
        ...(input.grid === undefined
          ? {}
          : {
              grid: projectAiGridState(input.grid as AiGridState, fields),
            }),
        ...(input.history === undefined
          ? {}
          : { history: validateAiConversationHistory(input.history) }),
        view: validateView(input.view, fields),
        locale: 'en',
        timeZone: 'UTC',
        now: new Date().toISOString(),
      };
      release = await guard?.acquire(req);
      const response = await interpret(request, { signal });
      if (!res.destroyed) res.end(JSON.stringify(response));
    } catch (error) {
      if (error instanceof RemoteLimitError) {
        res.setHeader('Retry-After', String(error.retryAfter));
        res
          .writeHead(error.status)
          .end(JSON.stringify({ error: error.message }));
        return;
      }
      if (!res.destroyed)
        res
          .writeHead(signal.aborted ? 408 : 422)
          .end(JSON.stringify({ error: 'Unable to complete this request.' }));
    } finally {
      release?.();
    }
  };
}
