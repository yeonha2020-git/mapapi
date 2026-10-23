import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces } from '../lib/geocoding.js';

test('invalid input never calls the provider', async () => {
  for (const query of [null, '', ' ', 'a', 'x'.repeat(151)]) {
    await assert.rejects(searchPlaces(query), error => error.status === 400);
  }
});

test('shared rate limit, cache, output validation, and conservative lock release', async t => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  const values = new Map();
  let locked = false;
  let upstreamCount = 0;
  let released = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url) === 'https://redis.example') {
      const [command, key, value] = JSON.parse(options.body);
      let result = null;
      if (command === 'GET') result = values.get(key) || null;
      if (command === 'SET' && key.endsWith('global-lock')) {
        result = locked ? null : 'OK'; locked = true;
      } else if (command === 'SET') { values.set(key, value); result = 'OK'; }
      if (command === 'EVAL') { released = true; result = 1; }
      return Response.json({ result });
    }
    upstreamCount++;
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('q'), '서울역');
    assert.ok(options.headers['User-Agent'].includes('BetweenDistance'));
    return Response.json([
      { place_id: 1, name: '서울역', display_name: '서울역, 서울', lat: '37.55', lon: '126.97' },
      { place_id: 2, display_name: '잘못된 좌표', lat: 'NaN', lon: '0' },
    ]);
  });
  try {
    const results = await searchPlaces('  서울역  ');
    assert.equal(results.length, 1);
    assert.equal(results[0].lat, 37.55);
    assert.equal(released, true);
    assert.deepEqual(await searchPlaces('서울역'), results);
    assert.equal(upstreamCount, 1);
    await assert.rejects(searchPlaces('부산역'), error => error.status === 429);
  } finally {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
});

test('production fails closed without shared rate-limit storage', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try { await assert.rejects(searchPlaces('서울역'), error => error.status === 503); }
  finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
