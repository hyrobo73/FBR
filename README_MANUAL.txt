용인 한입 지도 프로젝트 구조 및 사용 설명서
=============================================

1. 프로젝트 개요
----------------

이 프로젝트는 Kakao Maps JavaScript API를 이용하여 용인시 맛집을 지도와 목록으로 보여 주는 Vite 기반 웹 애플리케이션입니다.

주요 기능

- 용인시 맛집 목록과 지도 마커 표시
- 전체, 한식, 중식, 일식, 양식 카테고리 필터
- 음식점명 또는 주소 검색
- 음식점 선택 시 해당 마커로 지도 이동 및 인포윈도우 표시
- 음식점 선택 시 카카오맵 상세 페이지를 별도 팝업으로 표시
- 다른 음식점을 선택해도 기존 팝업을 재사용하여 팝업을 하나만 유지
- 브라우저 위치 권한을 이용한 현재 위치 표시
- 모바일 화면에서 목록 패널 열기/닫기


2. 기술 구성
------------

- JavaScript ES Modules
- HTML5 / CSS3
- Vite 7
- Kakao Maps JavaScript SDK
- Kakao Local REST API(좌표 및 장소 정보 JSON 생성 시 사용)


3. 프로젝트 구조
----------------

kakao_map_restaurant/
|
+-- index.html
|   메인 애플리케이션의 HTML 진입점입니다. 사이드바, 검색창, 카테고리 탭,
|   지도 영역, 모바일 목록 버튼, 장소 상세 dialog 마크업을 포함합니다.
|
+-- src/
|   |
|   +-- main.js
|   |   애플리케이션의 중심 모듈입니다. 화면 요소와 상태를 관리하고,
|   |   초기화, 검색, 필터링, 목록 렌더링, 이벤트 연결, 팝업 처리를 담당합니다.
|   |
|   +-- map.js
|   |   Kakao Maps SDK 로드, 용인 중심 지도 생성, 줌 컨트롤 추가,
|   |   검색 결과 전체가 보이도록 지도 범위 조정을 담당합니다.
|   |
|   +-- markers.js
|   |   음식점 마커의 생성과 제거를 관리합니다. 하나의 Kakao InfoWindow를
|   |   재사용하며 선택한 음식점의 이름, 평점, 주소를 표시합니다.
|   |
|   +-- places.js
|   |   CSV 파싱, Kakao 장소 검색, 상세 장소 매칭, 주소 좌표 변환을 담당합니다.
|   |   CSV의 필수 열은 카테고리, 음식점명, 평점, 주소입니다.
|   |
|   +-- geolocation.js
|   |   브라우저 현재 위치 요청과 현재 위치 마커 표시를 담당합니다.
|   |
|   +-- style.css
|   |   전체 레이아웃, 목록, 지도 오버레이, 카테고리별 테마,
|   |   반응형 모바일 화면 등의 스타일을 정의합니다.
|   |
|   +-- data/
|       +-- yongin-restaurants.json
|           앱에서 우선 사용하는 가공 데이터입니다. 음식점 기본 정보에
|           위도, 경도, Kakao 장소 ID, 전화번호, 상세 URL이 포함됩니다.
|
+-- 맛집정보/
|   +-- 용인시맛집_utf8.csv
|       원본 맛집 데이터입니다. UTF-8 CSV 형식이며 다음 열을 사용합니다.
|       카테고리, 음식점명, 평점, 주소
|
+-- scripts/
|   +-- geocode-restaurants.mjs
|       CSV를 읽고 Kakao Local REST API로 장소 및 좌표를 조회한 뒤
|       src/data/yongin-restaurants.json을 생성하는 Node.js 스크립트입니다.
|
+-- .env.example
|   필요한 환경 변수의 예시 파일입니다. 실제 키는 .env에 저장합니다.
|
+-- package.json
|   프로젝트 정보, Vite 의존성, 개발/빌드/데이터 생성 명령을 정의합니다.
|
+-- package-lock.json
|   설치되는 npm 패키지 버전을 고정합니다.
|
+-- README.md
|   프로젝트의 간단한 시작 안내입니다.
|
+-- README_MANUAL.txt
|   프로젝트 구조와 운영 방법을 설명하는 현재 문서입니다.
|
+-- gwangju_food_map.html
|   경기도 광주시 음식점을 Kakao 키워드 검색으로 조회하는 독립형 HTML입니다.
|   메인 용인시 Vite 앱과는 별도로 동작합니다.
|
+-- yongin_geocoder.html
|   브라우저에서 용인시 주소를 좌표로 변환하고 결과 CSV를 내려받는
|   독립형 보조 도구입니다. 메인 앱 실행에 반드시 필요한 파일은 아닙니다.
|
+-- node_modules/
|   npm install로 설치되는 패키지 폴더입니다. Git에 포함하지 않습니다.
|
+-- dist/
    npm run build 실행 시 생성되는 배포 결과 폴더입니다. Git에 포함하지 않습니다.


4. 환경 설정
------------

필수 조건

- Node.js가 설치되어 있어야 합니다.
- Kakao Developers 애플리케이션이 필요합니다.
- Kakao Developers에서 Kakao Map 기능을 사용할 수 있도록 설정해야 합니다.

프로젝트 루트에 .env 파일을 만들고 아래 값을 설정합니다.

VITE_KAKAO_MAP_API_KEY=발급받은_JavaScript_키
KAKAO_REST_API_KEY=발급받은_REST_API_키

키의 용도

- VITE_KAKAO_MAP_API_KEY
  브라우저에서 지도, 마커, 장소 검색 및 주소 변환 기능을 사용할 때 필요합니다.
  Vite가 클라이언트 코드에 주입하므로 비밀 서버 키로 취급하면 안 됩니다.

- KAKAO_REST_API_KEY
  npm run data:geocode 실행 시 Node.js 스크립트에서만 사용합니다.
  이 키에는 VITE_ 접두사를 붙이지 않습니다.

주의 사항

- .env 파일은 .gitignore에 포함되어 있으므로 저장소에 커밋하지 않습니다.
- Kakao Developers의 Web 플랫폼에 실제 실행 도메인을 등록해야 합니다.
- 로컬 개발 기본 주소를 사용하는 경우 http://localhost:5173을 등록합니다.
- JavaScript 키와 REST API 키를 서로 바꾸어 입력하지 마세요.


5. 설치 및 실행
--------------

프로젝트 폴더에서 다음 명령을 실행합니다.

1) 패키지 설치

   npm install

2) 좌표 및 장소 정보 JSON 생성 또는 갱신

   npm run data:geocode

3) 개발 서버 실행

   npm run dev

4) 터미널에 표시된 주소로 접속

   기본 주소: http://localhost:5173


6. npm 명령
-----------

npm run dev
  Vite 개발 서버를 실행합니다. 소스 변경 사항이 브라우저에 즉시 반영됩니다.

npm run build
  운영 배포용 파일을 dist 폴더에 생성합니다.

npm run preview
  생성된 dist 결과를 로컬 서버에서 미리 확인합니다.
  먼저 npm run build를 실행해야 합니다.

npm run data:geocode
  맛집정보/용인시맛집_utf8.csv를 읽고 Kakao Local REST API를 호출하여
  src/data/yongin-restaurants.json을 새로 생성합니다.


7. 애플리케이션 동작 흐름
-------------------------

1) index.html이 src/main.js를 ES 모듈로 불러옵니다.

2) main.js가 VITE_KAKAO_MAP_API_KEY를 사용해 Kakao Maps SDK를 로드합니다.

3) map.js가 용인시 중심 좌표로 지도를 생성합니다.
   기본 중심: 위도 37.2410864, 경도 127.1775537
   기본 지도 레벨: 9

4) markers.js의 마커 관리자를 생성하고 화면 이벤트를 연결합니다.

5) src/data/yongin-restaurants.json의 source 값이
   "용인시맛집_utf8.csv"이고 restaurants 배열에 데이터가 있으면,
   해당 JSON을 즉시 사용합니다.

6) 유효한 JSON 데이터가 없으면 CSV를 읽어 브라우저에서 주소를 변환합니다.
   변환 결과는 localStorage의 다음 키에 저장됩니다.

   yongin-utf8-csv-restaurant-coordinates-v3

7) 목록과 마커를 렌더링하고 모든 음식점이 보이도록 지도 범위를 맞춥니다.

8) 검색어나 카테고리가 바뀌면 전체 데이터에서 조건에 맞는 음식점만 골라
   목록과 마커를 다시 렌더링합니다.


8. 음식점 선택과 팝업 처리
---------------------------

- 목록 또는 지도 마커를 선택하면 해당 목록 항목이 활성화됩니다.
- 지도에는 선택 음식점의 인포윈도우가 하나만 표시됩니다.
- Kakao 장소 ID가 있으면 https://place.map.kakao.com/{장소ID}를 엽니다.
- 장소 ID가 없으면 Kakao 장소 검색으로 상세 정보를 찾은 뒤 이동합니다.
- 팝업 창 이름은 kakao-place-details로 고정되어 있습니다.
- 따라서 다른 음식점을 연속해서 선택해도 새 창이 계속 생성되지 않고
  기존 팝업 창 하나의 내용만 새 음식점으로 변경됩니다.
- 상세 조회가 진행 중일 때 다른 음식점을 선택하면 이전 요청 결과는 무시되어
  최신 선택 내용이 오래된 결과로 덮어써지지 않습니다.
- 팝업이 열리지 않으면 브라우저의 팝업 차단 설정에서 사이트를 허용해야 합니다.


9. 맛집 데이터 형식
-------------------

CSV 필수 헤더

카테고리,음식점명,평점,주소

예시

한식,예시식당,4.85,경기 용인시 처인구 예시로 1

입력 규칙

- 파일 인코딩은 UTF-8을 사용합니다.
- 평점은 숫자로 변환 가능한 값이어야 합니다.
- 음식점명과 주소가 비어 있으면 해당 행은 제외됩니다.
- 주소 안에 쉼표가 있으면 표준 CSV 방식으로 필드를 큰따옴표로 감쌉니다.
- category 값은 화면 카테고리 탭의 data-category 값과 정확히 일치해야
  해당 카테고리 필터에서 표시됩니다.

생성 JSON의 주요 필드

- source: 원본 CSV 파일명
- generatedAt: JSON 생성 시각
- total: 원본에서 읽은 음식점 수
- restaurants: 가공된 음식점 배열

음식점 객체의 주요 필드

- id: 앱 내부 식별자
- name: 음식점명
- rating: 평점
- address: 주소
- category: 카테고리
- lat: 위도
- lng: 경도
- kakaoId: Kakao 장소 ID
- phone: 전화번호
- url: Kakao 장소 상세 URL


10. 맛집 데이터 갱신 방법
-------------------------

1) 맛집정보/용인시맛집_utf8.csv를 수정합니다.

2) .env에 올바른 KAKAO_REST_API_KEY가 있는지 확인합니다.

3) 다음 명령으로 JSON을 다시 생성합니다.

   npm run data:geocode

4) 콘솔에 표시되는 성공 건수와 실패 음식점 목록을 확인합니다.

5) 다음 명령으로 앱 빌드가 정상인지 확인합니다.

   npm run build

geocode 스크립트는 음식점명+주소, 음식점명+구, 음식점명 순서로 장소를
검색하며 결과가 없을 때 주소 검색으로 보완합니다. 결과는 평점 내림차순으로
정렬되어 JSON에 저장됩니다.


11. 유지보수 위치 안내
----------------------

- 기본 지도 중심/레벨 변경: src/map.js의 YONGIN_CONFIG
- 카테고리 탭 추가/변경: index.html의 #category-tabs
- 필터 조건 변경: src/main.js의 applyFilters()
- 목록 카드 모양/내용 변경: src/main.js의 createListItem()
- 팝업 동작 변경: src/main.js의 openKakaoPlacePopup()
- 마커 인포윈도우 변경: src/markers.js의 open()
- Kakao 장소 매칭 방식 변경: src/places.js의 findPlaceDetails()
- 현재 위치 처리 변경: src/geolocation.js
- 화면 디자인/반응형 변경: src/style.css
- 좌표 JSON 생성 규칙 변경: scripts/geocode-restaurants.mjs

카테고리를 추가할 때는 index.html의 버튼, CSV의 카테고리 값, 필요한 경우
src/style.css의 카테고리 테마를 함께 확인해야 합니다.


12. 문제 해결
-------------

지도가 표시되지 않는 경우

- .env의 VITE_KAKAO_MAP_API_KEY를 확인합니다.
- Kakao Developers에 현재 도메인이 등록되어 있는지 확인합니다.
- Kakao Map 사용 설정과 네트워크 연결을 확인합니다.
- .env 수정 후 개발 서버를 다시 시작합니다.

좌표 JSON 생성이 실패하는 경우

- KAKAO_REST_API_KEY가 JavaScript 키가 아닌 REST API 키인지 확인합니다.
- API 사용량 제한과 네트워크 연결을 확인합니다.
- 콘솔에 출력된 실패 음식점의 이름과 주소를 CSV에서 점검합니다.

일부 음식점이 보이지 않는 경우

- CSV 필수 값과 평점 형식을 확인합니다.
- npm run data:geocode 실행 결과에서 실패 목록을 확인합니다.
- src/data/yongin-restaurants.json에 해당 음식점이 있는지 확인합니다.
- 오래된 브라우저 캐시가 의심되면 localStorage의
  yongin-utf8-csv-restaurant-coordinates-v3 항목을 삭제한 뒤 다시 접속합니다.

팝업이 열리지 않는 경우

- 브라우저 주소창의 팝업 차단 알림에서 이 사이트의 팝업을 허용합니다.
- 목록이나 마커를 사용자가 직접 클릭했는지 확인합니다.

현재 위치가 표시되지 않는 경우

- 브라우저에서 위치 권한을 허용합니다.
- HTTPS 또는 localhost 환경에서 실행합니다.
- 위치 요청은 8초 후 시간 초과될 수 있습니다.


13. 배포 전 확인 목록
---------------------

- .env의 실제 키가 저장소나 배포 파일에 직접 포함되지 않았는지 확인
- 운영 도메인을 Kakao Developers Web 플랫폼에 등록
- 최신 CSV 기준으로 npm run data:geocode 실행
- npm run build 성공 확인
- dist 결과를 배포 서버에 업로드
- 데스크톱과 모바일에서 검색, 필터, 마커, 위치, 단일 팝업 동작 확인

