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
