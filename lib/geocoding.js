import { createHash } from 'node:crypto';

const memory = new Map();
let nextRequest = 0;
const TTL = 86400;

export class SearchError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function redis(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), cache: 'no-store', signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new SearchError('검색 서비스 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.', 503);
  const data = await response.json();
  if (data.error) throw new SearchError('검색 서비스 설정을 확인해 주세요.', 503);
  return data.result;
}

export async function searchPlaces(rawQuery) {
  const query = rawQuery?.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!query || query.length < 2 || query.length > 150) {
    throw new SearchError('장소명 또는 주소를 2~150자로 입력해 주세요.', 400);
  }
  const endpoint = process.env.NOMINATIM_SEARCH_URL || 'https://nominatim.openstreetmap.org/search';
  const key = `between:v1:${createHash('sha256').update(`${endpoint}|ko|${query.toLowerCase()}`).digest('hex')}`;
  const shared = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  // Fail closed on serverless/production: process memory cannot enforce an app-wide limit.
  if (!shared && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
    throw new SearchError('장소 검색 준비 중입니다. 운영자가 Redis 환경 변수를 설정해야 합니다.', 503);
  }
  const cached = shared ? await redis(['GET', key]) : memory.get(key);
  if (shared && cached) return JSON.parse(cached);
  if (!shared && cached && cached.expires > Date.now()) return cached.results;

  // Shared across ALL queries and instances. Keep the lease through the upstream
  // request plus 1.1 seconds, so slow requests cannot bunch up on the provider.
  const lockKey = 'between:nominatim:global-lock';
  const lease = crypto.randomUUID();
  const acquired = shared
    ? await redis(['SET', lockKey, lease, 'NX', 'PX', '30000'])
    : Date.now() >= nextRequest;
  if (!acquired) throw new SearchError('검색 요청이 많습니다. 잠시 후 검색 버튼을 다시 눌러 주세요.', 429);
  if (!shared) nextRequest = Date.now() + 30000;
  try {
    const url = new URL(endpoint);
    url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', 'accept-language': 'ko,en', addressdetails: '1' }).toString();
    const identity = process.env.NOMINATIM_USER_AGENT || `BetweenDistance/1.0 (${process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'local development'})`;
    const response = await fetch(url, {
      headers: { 'User-Agent': identity, Accept: 'application/json' },
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new SearchError('장소 검색 서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.', response.status === 429 ? 429 : 502);
    const data = await response.json();
    if (!Array.isArray(data)) throw new SearchError('검색 결과를 읽을 수 없습니다.', 502);
    const results = data.filter(p => p.display_name && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)) && Math.abs(Number(p.lat)) <= 90 && Math.abs(Number(p.lon)) <= 180)
      .map(p => ({ id: String(p.place_id), name: p.name || p.display_name.split(',')[0], address: p.display_name, lat: Number(p.lat), lon: Number(p.lon) }));
    if (shared) await redis(['SET', key, JSON.stringify(results), 'EX', String(TTL)]);
    else {
      if (memory.size >= 500) memory.delete(memory.keys().next().value);
      memory.set(key, { results, expires: Date.now() + TTL * 1000 });
    }
    return results;
  } finally {
    if (shared) {
      // Only shorten our own lease. Failure leaves the conservative 30s lease.
      await redis(['EVAL', "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('pexpire',KEYS[1],1100) else return 0 end", '1', lockKey, lease]).catch(() => {});
    } else nextRequest = Date.now() + 1100;
  }
}
