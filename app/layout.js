import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata = {
  title: '사이 · 두 장소 사이의 거리',
  description: '실제 장소를 검색하고 두 지점 사이의 직선거리를 확인하세요. OpenStreetMap 기반 거리 측정 앱.',
};

export default function RootLayout({ children }) {
  return <html lang="ko"><body>{children}</body></html>;
}
