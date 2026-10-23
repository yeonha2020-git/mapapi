import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, formatDistance, mapUrl } from '../lib/distance.js';

test('great-circle distance: same point, known one-degree arc, symmetry, antipodes', () => {
  const a = { lat: 0, lon: 0 };
  const b = { lat: 0, lon: 1 };
  assert.equal(distanceKm(a, a), 0);
  assert.ok(Math.abs(distanceKm(a, b) - 111.195) < 0.001);
  assert.equal(distanceKm(a, b), distanceKm(b, a));
  assert.ok(Math.abs(distanceKm(a, { lat: 0, lon: 180 }) - 20015.114) < 0.001);
});

test('Seoul to Busan sanity check and units for short distances', () => {
  const km = distanceKm({ lat: 37.5665, lon: 126.978 }, { lat: 35.1796, lon: 129.0756 });
  assert.ok(km > 320 && km < 330);
  assert.deepEqual(formatDistance(0.125), { value: '125', unit: 'm' });
  assert.deepEqual(formatDistance(1.234), { value: '1.23', unit: 'km' });
});

test('map link preserves both selected coordinates in order', () => {
  const url = new URL(mapUrl({ lat: 37.5, lon: 127 }, { lat: 35, lon: 129 }));
  assert.equal(url.origin, 'https://www.openstreetmap.org');
  assert.equal(url.searchParams.get('route'), '37.5,127;35,129');
});
