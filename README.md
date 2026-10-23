# 사이 · 거리 측정 웹앱

Nominatim으로 실제 장소를 검색하고 선택한 두 좌표 사이의 **직선거리**를 측정하는 한국어 웹앱입니다. Next.js App Router, React, Leaflet으로 만들었으며 Vercel에서 실행할 수 있습니다.

## 기능

- 출발지·도착지의 장소명 또는 주소 검색: 검색 버튼 / Enter로 실행
- 검색된 실제 장소 목록에서 선택하고 상세 주소 확인
- 출발지와 도착지 바꾸기
- 지구 평균 반지름 6,371.0088km를 사용한 Haversine 거리 계산
- 1km 미만은 m, 그 이상은 km로 표시
- 지도에서 두 지점 및 점선 연결 표시
- 총거리 아래 **지도에서 보기**: 선택한 두 좌표를 포함한 OpenStreetMap 길찾기를 새 탭에서 열기
- 반응형 화면, 키보드 사용, 오류·빈 결과·로딩 안내

**이 앱의 총거리는 직선거리입니다.** 지도 링크의 자동차 길찾기 거리는 별도로 계산되므로 다릅니다. Nominatim은 좌표 검색 API이며 도보·차량 경로를 계산하지 않습니다. OSM에 등록되지 않은 장소는 조회되지 않을 수 있습니다.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```sh
npm install
npm run dev
```

http://localhost:3000 에서 확인합니다. Windows PowerShell에서 실행 정책으로 npm이 차단되면 `npm.cmd install`, `npm.cmd run dev`를 사용하세요.

개발 모드는 Redis 없이 메모리 캐시와 단일 프로세스 요청 제한으로 동작합니다. 실제 Nominatim을 사용하며 가짜 검색 결과를 반환하지 않습니다. 필요한 경우 `.env.example`을 `.env.local`로 복사해 설정합니다. `.env.local`은 Git에 올리지 마세요.

## GitHub → Vercel 배포

1. 이 폴더의 코드를 새 GitHub 저장소에 올립니다. `node_modules`, `.next`, `.env.local`은 제외됩니다.
2. Vercel에서 **Add New → Project → Import Git Repository**로 해당 저장소를 선택합니다.
3. Framework Preset은 **Next.js**입니다. Root Directory는 프로젝트 루트이며 Build / Output 설정은 기본값을 사용합니다.
4. Upstash Redis 데이터베이스를 만들고, 아래 서버 환경 변수를 Vercel 프로젝트에 추가합니다. Vercel Marketplace의 Upstash 연결을 이용하거나 Upstash 콘솔의 REST URL과 REST Token을 복사할 수 있습니다. HTTP REST를 지원하는 Redis가 필요하며 일반 `redis://` 주소는 사용할 수 없습니다.

   | 환경 변수 | 값 |
   | --- | --- |
   | `UPSTASH_REDIS_REST_URL` | Upstash HTTPS REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | Upstash REST Token (쓰기 권한 필요) |
   | `NOMINATIM_USER_AGENT` | `BetweenDistance/1.0 (https://실제도메인.vercel.app; contact: 운영자이메일)` |

5. **Deploy**를 누릅니다. 환경 변수를 배포 후 변경했다면 **Redeploy**합니다. Preview에서 검색을 사용하려면 해당 환경에도 Redis 변수를 설정합니다.
6. 출발지 검색 → 결과 선택 → 잠시 후 도착지 검색 → 결과 선택 → **거리 측정하기** → **지도에서 보기** 순서로 확인합니다.

별도 API 키는 필요 없지만, 운영 환경에서는 모든 인스턴스가 같은 Redis를 사용해야 합니다. Redis 미설정 또는 장애 시 검색은 안전하게 중단되고 안내 메시지가 표시됩니다. 화면과 지도는 표시되지만 장소를 검색할 수 없으므로 배포 전에 반드시 설정하세요. 저장소 생성과 실제 Vercel 배포는 사용자가 진행합니다.

## Nominatim 이용 정책 (배포 전 필독)

공식 정책: https://operations.osmfoundation.org/policies/nominatim/

- 공용 API는 **앱 전체 합산 초당 최대 1회**만 허용합니다. 이 앱은 검색 요청을 서버로 보내고 Redis의 원자적 공유 잠금으로 모든 인스턴스의 외부 요청을 직렬화합니다. 요청이 끝난 후에도 1.1초 동안 다음 요청을 제한합니다. 혼잡 시 429 안내를 표시하며 자동 재시도하지 않습니다.
- 키 입력 자동완성은 구현하지 않습니다. 사용자가 검색 버튼 또는 Enter로 요청한 경우에만 조회합니다.
- 동일한 검색어는 Redis에서 24시간 캐시합니다. 검색어 자체 대신 SHA-256 해시를 캐시 키에 사용합니다. 결과가 없는 검색도 캐시합니다.
- 서버 요청의 User-Agent로 앱을 식별하며, 화면과 지도에 OpenStreetMap 저작자 표시를 제공합니다.
- 서비스 변경이 필요하면 서버 환경 변수 `NOMINATIM_SEARCH_URL`로 Nominatim 호환 `/search` 엔드포인트를 교체하고 재배포할 수 있습니다. 이 구현은 자동으로 `q`, `format`, `limit`, `accept-language`, `addressdetails`를 추가합니다.
- 소규모의 사용자 직접 검색을 전제로 합니다. 사용량 증가 시 자체 Nominatim 또는 적합한 외부 제공자로 전환하세요. 운영자는 공용 서버 정책 준수에 책임이 있습니다.
- 입력한 장소 검색어는 서버, 검색 제공자에 전송되고 검색 결과는 Redis에 저장됩니다. 민감한 개인정보를 검색어로 입력하지 마세요. 결과 데이터는 ODbL이 적용됩니다.

지도 타일은 브라우저에서 OpenStreetMap을 요청합니다. 대량 다운로드·오프라인 미리 가져오기는 하지 않습니다. [지도 타일 이용 정책](https://operations.osmfoundation.org/policies/tiles/)도 확인하세요. `NEXT_PUBLIC_TILE_URL` 및 `NEXT_PUBLIC_TILE_ATTRIBUTION`으로 제공자를 바꿀 수 있습니다. `NEXT_PUBLIC_` 변수는 빌드 시 반영됩니다. 글꼴은 Google Fonts를 사용하며 연결이 안 되면 시스템 글꼴로 표시됩니다.

## 검증

```sh
npm test
npm run build
```

테스트는 실제 공용 API에 요청하지 않으며 거리 공식, 단위, 지도 링크, 입력 검증, 공유 캐시·요청 제한 및 운영 환경의 안전한 중단을 검증합니다.
