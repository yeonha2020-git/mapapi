import { searchPlaces, SearchError } from '../../../lib/geocoding.js';

export const runtime = 'nodejs';
export async function GET(request) {
  try {
    const results = await searchPlaces(new URL(request.url).searchParams.get('q'));
    return Response.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof SearchError ? error.status : 503;
    return Response.json({ error: error instanceof SearchError ? error.message : '검색 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.' }, {
      status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '2' } : {}) },
    });
  }
}
