export interface AiHostProxyOptions {
  backendUrl: string;
  token: string;
  origin: string;
  /** Resolve the user from your authenticated server session, never a browser-supplied ID. */
  getUserId(request: Request): string | undefined | Promise<string | undefined>;
  fetch?: typeof globalThis.fetch;
}

/** Mount on your app server at /api/ai-view/interpret. No secret reaches the browser. */
export function createAiHostProxy(options: AiHostProxyOptions) {
  if (options.token.length < 32)
    throw new Error('A private AI access token is required.');
  const backend = new URL(options.backendUrl);
  if (
    backend.protocol !== 'https:' &&
    !(
      backend.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(backend.hostname)
    )
  )
    throw new Error('The AI backend must use HTTPS or loopback HTTP.');
  if (new URL(options.origin).origin !== options.origin)
    throw new Error('Configure one exact app origin.');
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    if (!['/api/ai-view/interpret', '/api/ai-view/status'].includes(path))
      return new Response(null, { status: 404 });
    if (
      !(
        (path.endsWith('/interpret') && request.method === 'POST') ||
        (path.endsWith('/status') && request.method === 'GET')
      )
    )
      return new Response(null, { status: 405 });
    const origin = request.headers.get('origin');
    if (origin && origin !== options.origin)
      return new Response(null, { status: 403 });
    const userId = await options.getUserId(request);
    if (!userId || userId.length > 200)
      return new Response(null, { status: 401 });
    try {
      const response = await (options.fetch ?? globalThis.fetch)(
        new URL(path, options.backendUrl),
        {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            Origin: options.origin,
            Authorization: `Bearer ${options.token}`,
            'X-AI-User-ID': userId,
          },
          ...(request.method === 'POST'
            ? { body: request.body, duplex: 'half' }
            : {}),
          signal: request.signal,
        } as RequestInit,
      );
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      if (response.headers.has('retry-after'))
        headers.set('Retry-After', response.headers.get('retry-after')!);
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return Response.json(
        { error: 'AI service is unavailable.' },
        { status: 502 },
      );
    }
  };
}
