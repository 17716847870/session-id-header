export const name = 'session-id-header';

const DEFAULT_HEADERS = ['x-session-id'];
const DEFAULT_GPT_HEADERS = ['session-id', 'x-client-request-id'];
const DEFAULT_CLAUDE_HEADERS = ['x-claude-code-session-id'];

const GPT_MODEL_PATTERN = /(?:^|[^a-z0-9])(?:gpt|chatgpt|codex)|(?:^|\/)o[134](?:$|[-_.])/i;
const CLAUDE_MODEL_PATTERN = /(?:^|[^a-z0-9])claude/i;

function resolveHeaderNames(model, { defaultHeaders, gptHeaders, claudeHeaders }) {
  if (typeof model === 'string') {
    if (CLAUDE_MODEL_PATTERN.test(model)) {
      return claudeHeaders;
    }
    if (GPT_MODEL_PATTERN.test(model)) {
      return gptHeaders;
    }
  }
  return defaultHeaders;
}

// Use Harness's existing session identity; never generate one per request.
export function apply(ctx, config = {}) {
  const providers = new Set(config.providers ?? ['*']);
  const allProviders = providers.has('*');
  const headerConfig = {
    defaultHeaders: config.headers ?? DEFAULT_HEADERS,
    gptHeaders: config.gptHeaders ?? DEFAULT_GPT_HEADERS,
    claudeHeaders: config.claudeHeaders ?? DEFAULT_CLAUDE_HEADERS,
  };

  ctx.on('llm-pi-ai/request-headers', (request, headers, next) => {
    if ((allProviders || providers.has(request.provider)) && request.sessionId !== undefined) {
      const sessionId = String(request.sessionId);
      for (const header of resolveHeaderNames(request.model, headerConfig)) {
        headers.set(header, sessionId);
      }
    }
    return next();
  });
}
