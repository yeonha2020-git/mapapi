'use client';

import { useRef, useState } from 'react';
import Map from './components/Map';
import { distanceKm, formatDistance, mapUrl } from '../lib/distance';

function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5" /></>,
    swap: <><path d="M8 3v16m-4-4 4 4 4-4M16 21V5m-4 4 4-4 4 4" /></>,
    external: <><path d="M14 3h7v7m0-7L10 14M10 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function PlaceSearch({ kind, label, value, onChange, selected, onSelect, busy, disabled, onSearch, results, error, searched }) {
  return <section className={`place-section ${selected ? 'is-selected' : ''}`}>
    <div className="field-label"><label htmlFor={kind}><span className={`point ${kind}`}>{kind === 'start' ? 'A' : 'B'}</span>{label}</label>{selected && <span className="selected-badge"><Icon name="check" size={12} />선택 완료</span>}</div>
    <form className="search-row" onSubmit={e => { e.preventDefault(); onSearch(); }}>
      <input id={kind} value={value} onChange={e => onChange(e.target.value)} placeholder={kind === 'start' ? '출발할 장소나 주소 검색' : '도착할 장소나 주소 검색'} autoComplete="off" maxLength={150} aria-describedby={`${kind}-feedback`} />
      <button type="submit" className="search-button" disabled={disabled || value.trim().length < 2} aria-label={`${label} 검색`}><Icon name="search" /></button>
    </form>
    <div id={`${kind}-feedback`} aria-live="polite" aria-busy={busy}>
      {busy && <p className="field-note">장소를 찾고 있어요…</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
      {!busy && selected && <p className="selected-address">{selected.address}</p>}
      {!busy && !selected && results.length > 0 && <ul className="results" aria-label={`${label} 검색 결과`}>{results.map(place => <li key={place.id}><button onClick={() => onSelect(place)}><span className="result-name">{place.name}<Icon name="arrow" size={16} /></span><span className="result-address">{place.address}</span></button></li>)}</ul>}
      {!busy && searched && !error && !selected && results.length === 0 && <p className="field-note">검색 결과가 없어요. 지역명이나 도로명 주소를 함께 입력해 보세요.</p>}
    </div>
  </section>;
}

const empty = () => ({ value: '', selected: null, results: [], error: '', busy: false, searched: false });

export default function Home() {
  const [places, setPlaces] = useState({ start: empty(), end: empty() });
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const requests = useRef({ start: 0, end: 0 });
  const inFlight = useRef(false);
  const patch = (kind, changes) => setPlaces(old => ({ ...old, [kind]: { ...old[kind], ...changes } }));

  function edit(kind, value) {
    requests.current[kind]++;
    patch(kind, { value, selected: null, results: [], error: '', busy: false, searched: false });
    setResult(null);
  }

  async function search(kind) {
    if (inFlight.current) return;
    const value = places[kind].value.trim();
    if (value.length < 2) return;
    const requestId = ++requests.current[kind];
    inFlight.current = true;
    setSearching(true);
    patch(kind, { busy: true, selected: null, error: '', results: [], searched: true });
    setResult(null);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`, { signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (requests.current[kind] !== requestId) return;
      if (!response.ok) throw new Error(data.error || '검색하지 못했어요. 다시 시도해 주세요.');
      patch(kind, { results: data.results });
    } catch (error) {
      if (requests.current[kind] === requestId) patch(kind, { error: error.name === 'TimeoutError' ? '검색 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.' : error.message });
    } finally {
      if (requests.current[kind] === requestId) patch(kind, { busy: false });
      inFlight.current = false;
      setSearching(false);
    }
  }

  function select(kind, place) {
    patch(kind, { selected: place, value: place.name, results: [], error: '' });
    setResult(null);
  }

  function swap() {
    requests.current.start++;
    requests.current.end++;
    setPlaces({ start: places.end, end: places.start });
    setResult(null);
  }

  const valid = places.start.selected && places.end.selected;
  const formatted = result && formatDistance(result.km);

  return <>
    <header className="site-header"><a className="brand" href="/" aria-label="사이 홈"><span className="brand-mark"><i /><i /></span>사이<span className="brand-sub">SAI</span></a><span className="header-caption">장소와 장소, 그 사이를 잇다.</span><a className="header-link" href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap <Icon name="external" size={14} /></a></header>
    <main>
      <div className="intro"><div><p className="eyebrow"><span /> A LITTLE CLOSER</p><h1>두 장소 사이,<br className="mobile-break" /> 얼마나 될까요?</h1><p className="intro-description">출발지와 도착지를 찾고, 두 지점 사이의 거리를 확인하세요.</p></div><div className="intro-badge"><Icon name="map" size={19} /> 세상의 모든 장소 사이</div></div>
      <div className="workspace">
        <aside className="panel">
          <div className="panel-heading"><div><span className="step">01 — FIND YOUR PLACES</span><h2>어디로 떠나시나요?</h2></div><span className="small-route">A ··· B</span></div>
          <div className="fields">
            <PlaceSearch kind="start" label="출발지" {...places.start} onChange={value => edit('start', value)} onSelect={place => select('start', place)} onSearch={() => search('start')} disabled={searching} />
            <div className="swap-row"><span /><button className="swap-button" onClick={swap} disabled={searching} aria-label="출발지와 도착지 바꾸기"><Icon name="swap" size={16} /></button></div>
            <PlaceSearch kind="end" label="도착지" {...places.end} onChange={value => edit('end', value)} onSelect={place => select('end', place)} onSearch={() => search('end')} disabled={searching} />
          </div>
          <p className="search-tip">장소명을 입력하고 검색 버튼 또는 Enter를 눌러 주세요.<br />검색 결과에서 원하는 장소를 선택할 수 있어요.</p>
          <button className="calculate" disabled={!valid || searching} onClick={() => setResult({ start: places.start.selected, end: places.end.selected, km: distanceKm(places.start.selected, places.end.selected) })}>거리 측정하기<Icon name="arrow" /></button>
          <div className={`distance-card ${result ? 'has-result' : ''}`} aria-live="polite">
            <span className="distance-label">총거리 <span>직선거리</span></span>
            <div className="distance-value">{formatted ? formatted.value : '—'}<span>{formatted ? formatted.unit : 'km'}</span></div>
            {result ? <><p className="distance-caption">{result.start.name} <span>→</span> {result.end.name}</p><a className="view-map" href={mapUrl(result.start, result.end)} target="_blank" rel="noopener noreferrer">지도에서 보기<Icon name="external" size={16} /></a><p className="external-note">OpenStreetMap에서 열립니다. 길찾기 거리는 달라질 수 있어요.</p></> : <p className="distance-caption">두 장소를 선택하면 거리를 측정할 수 있어요.</p>}
          </div>
        </aside>
        <Map start={places.start.selected} end={places.end.selected} />
      </div>
      <div className="info-strip"><span className="info-symbol">i</span><p><strong>거리를 이해하는 작은 안내</strong> 표시되는 거리는 지구의 곡률을 반영한 두 좌표 사이의 직선거리예요. 실제 도보·자동차 이동 거리와 다릅니다.</p><span className="info-end">MEASURE THE POSSIBILITIES</span></div>
    </main>
    <footer><span>가까운 곳부터, 새로운 곳까지. <strong>사이</strong></span><span>장소 데이터 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · 검색 Nominatim</span></footer>
  </>;
}
