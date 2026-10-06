# 용인 한입 지도

Kakao Maps JavaScript API로 용인시 맛집을 카테고리별로 지도와 목록에 표시하는 Vite 프로젝트입니다.

## 시작하기

1. `.env.example`을 `.env`로 복사합니다.
2. Kakao Developers에서 발급한 **JavaScript 키**와 **REST API 키**를 입력합니다.

```env
VITE_KAKAO_MAP_API_KEY=발급받은_JavaScript_키
KAKAO_REST_API_KEY=발급받은_REST_API_키
```

3. Kakao Developers의 플랫폼 설정에서 실행할 도메인을 Web 플랫폼에 등록합니다. 로컬 개발 기본 주소는 `http://localhost:5173`입니다.
4. 아래 명령으로 실행합니다.

```bash
npm install
npm run data:geocode
npm run dev
```

## 데이터 동작

- 용인시: UTF-8 형식의 `맛집정보/용인시맛집.csv`에서 카테고리·음식점명·평점·주소를 읽습니다. 주소 안의 쉼표와 CSV 인용부호도 처리합니다.
- `npm run data:geocode`를 한 번 실행하면 CSV를 기준으로 좌표와 Kakao 장소 ID가 포함된 `src/data/yongin-restaurants.json`을 생성합니다. 앱은 이 JSON을 즉시 읽으므로 실행할 때 주소 API를 다시 호출하지 않습니다.
- 좌표 JSON을 아직 만들지 않은 경우에는 브라우저에서 주소를 변환하고 `localStorage`에 캐시합니다. 첫 방문은 느릴 수 있으므로 배포 전 좌표 JSON 생성을 권장합니다.
- 지도 위의 전체·한식·중식·일식·양식 탭으로 파일의 카테고리를 필터링합니다.
- 맛집 목록을 클릭하면 해당 음식점의 `place.map.kakao.com` 상세 페이지를 별도 팝업 창으로 엽니다.

데이터 파일에는 `[한식]`처럼 대괄호로 카테고리를 구분할 수 있습니다.
