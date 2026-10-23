export function distanceKm(a, b) {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function formatDistance(km) {
  return km < 1
    ? { value: Math.round(km * 1000).toLocaleString('ko-KR'), unit: 'm' }
    : { value: km.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), unit: 'km' };
}

export function mapUrl(a, b) {
  const url = new URL('https://www.openstreetmap.org/directions');
  url.searchParams.set('engine', 'fossgis_osrm_car');
  url.searchParams.set('route', `${a.lat},${a.lon};${b.lat},${b.lon}`);
  return url.toString();
}
