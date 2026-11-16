export const name = 'session-id-header';

// Use Harness's existing session identity; never generate one per request.
export function apply(ctx, config = {}) {
  const providers = new Set(config.providers ?? ['*']);
  const allProviders = providers.has('*');
  const headerNames = config.headers ?? ['x-session-id'];

  ctx.on('llm-pi-ai/request-headers', (request, headers, next) => {
    if ((allProviders || providers.has(request.provider)) && request.sessionId !== undefined) {
      for (const header of headerNames) {
        headers.set(header, String(request.sessionId));
      }
    }
    return next();
  });
}
