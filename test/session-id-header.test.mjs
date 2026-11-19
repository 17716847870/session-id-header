import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../session-id-header.mjs';

function prepare(config) {
  let handler;
  apply({ on(event, callback) {
    assert.equal(event, 'llm-pi-ai/request-headers');
    handler = callback;
  } }, config);
  return (request, headers = new Headers()) => {
    let nextCalls = 0;
    const result = handler(request, headers, () => { nextCalls++; return headers; });
    assert.equal(nextCalls, 1);
    assert.equal(result, headers);
    return headers;
  };
}

test('omitted configuration covers existing and newly named providers', () => {
  const run = prepare();
  for (const provider of ['linksub', 'my-gateway', 'new-provider']) {
    for (const model of ['model-a', 'model-b']) {
      assert.equal(run({provider, model, sessionId:'session-a'}).get('x-session-id'), 'session-a');
    }
  }
});

test('bundle wildcard covers arbitrary providers and preserves session identity', () => {
  const run = prepare({providers:['*']});
  for (const sessionId of ['session-a', 'session-a', 'session-b']) {
    assert.equal(run({provider:'arbitrary-provider', sessionId}).get('x-session-id'), sessionId);
  }
});

test('explicit allowlist limits providers for existing configurations', () => {
  const run = prepare({providers:['linksub', 'my-gateway']});
  assert.equal(run({provider:'linksub',sessionId:'session-a'}).get('x-session-id'),'session-a');
  assert.equal(run({provider:'my-gateway',sessionId:'session-b'}).get('x-session-id'),'session-b');
  assert.equal(run({provider:'other',sessionId:'session-c'}).has('x-session-id'),false);
  assert.equal(prepare({providers:[]})({provider:'linksub',sessionId:'session-a'}).has('x-session-id'),false);
});

test('requests without session identity remain unchanged', () => {
  const headers = new Headers({'x-existing':'keep'});
  const run = prepare({providers:['*']});
  assert.deepEqual([...run({provider:'new-provider'},headers)], [['x-existing','keep']]);
});

test('configurable headers share identity and preserve unrelated headers', () => {
  const run = prepare({headers:['x-session-id','x-custom-session']});
  const result = run({provider:'new-provider',sessionId:'session-a'},new Headers({'x-existing':'keep','x-session-id':'old'}));
  assert.equal(result.get('x-session-id'),'session-a');
  assert.equal(result.get('x-custom-session'),'session-a');
  assert.equal(result.get('x-existing'),'keep');
});

test('GPT models send official Codex/OpenAI session headers without x-session-id', () => {
  const run = prepare();
  for (const model of ['gpt-4o', 'gpt-5.4', 'gpt-5.3-codex', 'openai/gpt-5', 'chatgpt-4o-latest', 'codex-mini-latest', 'o3-mini', 'o4-mini']) {
    const result = run({provider:'linksub', model, sessionId:'session-gpt'});
    assert.equal(result.get('session-id'), 'session-gpt');
    assert.equal(result.get('x-client-request-id'), 'session-gpt');
    assert.equal(result.has('x-session-id'), false);
    assert.equal(result.has('x-claude-code-session-id'), false);
  }
});

test('Claude models send official Claude Code session header without x-session-id', () => {
  const run = prepare();
  for (const model of ['claude-sonnet-4-5', 'claude-opus-4-6', 'anthropic/claude-3-5-sonnet', 'us.anthropic.claude-3-7-sonnet-20250219-v1:0', 'CLAUDE-HAIKU-4-5']) {
    const result = run({provider:'linksub', model, sessionId:'session-claude'});
    assert.equal(result.get('x-claude-code-session-id'), 'session-claude');
    assert.equal(result.has('x-session-id'), false);
    assert.equal(result.has('session-id'), false);
  }
});

test('non-GPT and non-Claude models keep default x-session-id header', () => {
  const run = prepare();
  for (const model of ['deepseek-chat', 'deepseek-reasoner', 'gemini-2.5-pro', 'qwen3-coder', 'glm-4.7', 'my-custom-model', undefined]) {
    const result = run({provider:'linksub', model, sessionId:'session-other'});
    assert.equal(result.get('x-session-id'), 'session-other');
    assert.equal(result.has('session-id'), false);
    assert.equal(result.has('x-client-request-id'), false);
    assert.equal(result.has('x-claude-code-session-id'), false);
  }
});

test('GPT and Claude header lists can be overridden via config', () => {
  const run = prepare({
    headers: ['x-session-id'],
    gptHeaders: ['session-id', 'session_id', 'x-client-request-id'],
    claudeHeaders: ['x-claude-code-session-id', 'x-session-id'],
  });
  const gptResult = run({provider:'linksub', model:'gpt-5', sessionId:'session-1'});
  assert.equal(gptResult.get('session-id'), 'session-1');
  assert.equal(gptResult.get('session_id'), 'session-1');
  assert.equal(gptResult.get('x-client-request-id'), 'session-1');

  const claudeResult = run({provider:'linksub', model:'claude-sonnet-4-5', sessionId:'session-2'});
  assert.equal(claudeResult.get('x-claude-code-session-id'), 'session-2');
  assert.equal(claudeResult.get('x-session-id'), 'session-2');
});
