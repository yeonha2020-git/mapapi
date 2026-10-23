'use client';

import { useEffect, useRef, useState } from 'react';

export default function Map({ start, end }) {
  const container = useRef(null);
  const instance = useRef(null);
  const layers = useRef(null);
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then(({ default: L }) => {
      if (cancelled) return;
      const map = L.map(container.current, { zoomControl: false, scrollWheelZoom: false }).setView([37.55, 126.98], 12);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer(process.env.NEXT_PUBLIC_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: process.env.NEXT_PUBLIC_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).on('tileerror', () => setTileError(true)).addTo(map);
      instance.current = { map, L };
      layers.current = L.layerGroup().addTo(map);
      setReady(true);
    });
    return () => { cancelled = true; instance.current?.map.remove(); instance.current = null; };
  }, []);

  useEffect(() => {
    if (!ready || !instance.current) return;
    const { map, L } = instance.current;
    layers.current.clearLayers();
    for (const [point, label, type] of [[start, 'A', 'start'], [end, 'B', 'end']]) {
      if (!point) continue;
      const icon = L.divIcon({ className: 'point-icon', html: `<span class="map-pin ${type}">${label}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] });
      const tooltip = document.createElement('span');
      tooltip.textContent = point.name;
      L.marker([point.lat, point.lon], { icon, title: point.name }).bindTooltip(tooltip).addTo(layers.current);
    }
    if (start && end) {
      L.polyline([[start.lat, start.lon], [end.lat, end.lon]], { color: '#22644e', weight: 3, dashArray: '7 9' }).addTo(layers.current);
      map.fitBounds([[start.lat, start.lon], [end.lat, end.lon]], { padding: [65, 65], maxZoom: 15 });
    } else if (start || end) {
      const point = start || end;
      map.setView([point.lat, point.lon], 14);
    } else map.setView([37.55, 126.98], 12);
  }, [start, end, ready]);

  return <div className="map-wrap">
    <div ref={container} className="map" aria-label="출발지와 도착지를 표시하는 지도" />
    {!ready && <div className="map-loading">지도를 불러오고 있어요…</div>}
    <div className="map-label"><span className="live-dot" />{start && end ? '두 지점을 직선으로 연결했어요' : '어디에서 어디까지 갈까요?'}</div>
    {tileError && <div className="tile-error" role="status">지도 배경을 불러오지 못했어요. 장소 검색과 거리 계산은 계속 사용할 수 있습니다.</div>}
    <div className="map-key"><span className="dash" /> 직선거리 기준</div>
  </div>;
}
