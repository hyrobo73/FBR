경기도 맛집지도 프로젝트 구조 및 사용 설명서
==========================================

1. 프로젝트 소개
----------------

용인시와 경기도 광주시 음식점 데이터를 지도와 목록으로 보여주는 다중 페이지 웹 앱입니다.
Vite와 순수 JavaScript로 구성되어 있으며 지도 표시, 장소 검색 및 현재 위치 기능은
Kakao Maps JavaScript API를 사용합니다.

주요 기능
- 홈 화면에서 용인시 또는 광주시 지도 선택
- 식당명·주소 검색 및 전체/한식/중식/일식/양식 카테고리 필터
- 지도 마커와 식당 목록을 함께 표시하고 선택한 장소의 정보 확인
- 카카오맵 상세 페이지 연결
- 브라우저 위치 권한을 허용한 경우 현재 위치로 지도 이동
- 좁은 화면에서 식당 목록 패널 열기 및 닫기


2. 프로젝트 구조
----------------

index.html
  지역 선택 홈 화면입니다.

resto_yongin.html / resto_gwangju.html
  각 지역 지도 화면의 HTML 진입점입니다. 도시 식별자와 접근성 문구,
  화면 요소를 정의하며 공통 로직은 src/main.js에서 실행합니다.

src/
  main.js
    현재 페이지의 도시 설정, 데이터 로드, 검색·필터·목록·상세 대화상자를 관리합니다.
  map.js
    Kakao Maps SDK 로드, 지도 초기화, 표시 영역 조정 및 지도 설정을 담당합니다.
  markers.js
    지도 마커와 정보 창의 생성 및 선택 처리를 담당합니다.
  places.js
    CSV 파싱, Kakao 장소 검색 및 브라우저 주소 좌표 변환 기능을 제공합니다.
  geolocation.js
    브라우저 현재 위치 요청과 지도상의 위치 표시를 담당합니다.
  style.css / landing.css
    지도 화면과 홈 화면의 스타일 및 반응형 레이아웃입니다.
  data/favorite_restaurants_yongin.json
    용인시의 좌표가 포함된 음식점 데이터입니다.
  data/favorite_restaurants_gwangju.json
    광주시의 매칭된 음식점 좌표와 미매칭 항목을 담은 데이터입니다.

맛집정보/
  favorite_restaurants_yongin.csv, favorite_restaurants_gwangju.csv
    저장소에 현재 포함된 원본 데이터 파일입니다.

scripts/
  geocode-restaurants.mjs
    용인 CSV를 Kakao Local API로 조회해 좌표 JSON을 생성합니다.
  geocode-gwangju-restaurants.mjs
    광주 CSV의 Kakao 장소를 매칭하고 좌표 JSON을 생성합니다.

.env.example
  Kakao 키 설정 예시입니다. 실제 키는 .env에 설정합니다.
package.json / package-lock.json
  npm 명령과 의존성 버전을 관리합니다.
vite.config.js
  Vite 설정과 빌드할 세 HTML 진입점을 지정합니다.
dist/
  빌드 명령으로 생성되는 배포용 파일 디렉터리입니다.


3. 준비 및 실행
---------------

필요한 항목
- Node.js와 npm
- Kakao Developers 애플리케이션의 JavaScript 키와 REST API 키
- Kakao Developers Web 플랫폼에 등록한 개발 및 배포 도메인

프로젝트 루트에서 .env.example을 복사해 .env를 만들고 키를 입력합니다.

VITE_KAKAO_MAP_API_KEY=발급받은_JavaScript_키
KAKAO_REST_API_KEY=발급받은_REST_API_키

JavaScript 키는 지도 화면에서 사용하며, Vite 클라이언트 코드에 포함됩니다.
Kakao Developers에서 해당 키에 허용 도메인을 설정하세요.
REST API 키는 좌표 데이터 생성 스크립트에서 사용합니다.

설치 및 개발 서버 실행:

  npm install
  npm run dev

터미널에 표시된 주소(기본값 http://localhost:5173)를 브라우저에서 엽니다.
홈 화면에서 지역을 선택합니다. 직접 열려면 /resto_yongin.html 또는 /resto_gwangju.html을
사용합니다. .env를 변경한 뒤에는 개발 서버를 다시 시작하세요.


4. 화면 사용법
-------------

- 홈 화면의 용인시 또는 광주시 카드를 선택해 지도를 엽니다.
- 검색창에 식당명 또는 주소를 입력하고 검색 버튼을 누릅니다.
- 지도 위 카테고리 버튼으로 전체, 한식, 중식, 일식, 양식을 필터링합니다.
- 식당 목록 항목이나 지도 마커를 선택하면 지도 위치와 선택 표시가 갱신됩니다.
- 상세 대화상자에서 주소와 제공되는 연락처를 확인하고 카카오맵 링크를 엽니다.
- 내 위치 버튼을 누르고 브라우저 위치 권한을 허용하면 현재 위치로 이동합니다.
- 모바일 화면에서는 목록 보기 버튼으로 목록 패널을 열고 닫습니다.


5. 데이터 형식 및 갱신
----------------------

두 좌표 생성 스크립트 모두 UTF-8 CSV의 다음 열을 사용합니다.

  카테고리,음식점명,평점,주소

각 행에는 카테고리(한식·중식·일식·양식), 이름, 숫자 평점, 주소를 입력합니다.
주소나 필드에 쉼표가 있으면 CSV 규칙에 따라 큰따옴표로 감쌉니다.

좌표 JSON 갱신 명령:

  npm run data:geocode
  npm run data:geocode:gwangju

첫 명령은 Kakao 키워드 및 주소 검색을 이용해 용인 JSON을 새로 씁니다.
두 번째 명령은 광주 장소 후보를 이름과 주소로 비교하고 결과를
src/data/favorite_restaurants_gwangju.json에 기록합니다. 성공·미매칭 건수는 터미널에
출력됩니다. API 호출량과 실행 시간은 데이터 건수 및 Kakao API 제한에 따라 달라집니다.

주의: 앱과 좌표 생성 스크립트는 각각 favorite_restaurants_yongin.csv와
favorite_restaurants_gwangju.csv를 사용합니다.

앱은 내장 좌표 JSON에 음식점 목록이 있으면 JSON 데이터를 우선 사용합니다. 용인은
JSON을 사용할 수 없으면 CSV를 읽고 브라우저에서
주소를 변환해 localStorage에 캐시합니다. 광주는 유효한 좌표 JSON이 없으면 안내 오류를
표시하므로 좌표 JSON이 필요합니다. 좌표를 새로 만들면 변경 내용을 반영하도록 페이지를
새로고침하세요.


6. npm 명령
----------

npm run dev
  Vite 개발 서버를 실행합니다.

npm run build
  배포 파일을 dist/에 생성합니다. 홈, 용인, 광주 페이지가 모두 포함됩니다.

npm run preview
  먼저 생성한 dist/ 결과를 로컬에서 확인합니다.

npm run data:geocode
  용인 CSV를 조회해 src/data/favorite_restaurants_yongin.json을 생성합니다.

npm run data:geocode:gwangju
  광주 CSV를 매칭해 src/data/favorite_restaurants_gwangju.json을 생성합니다.


7. 유지보수 위치
---------------

- 홈 화면 문구와 지역 링크: index.html
- 지역별 초기 지도 중심과 확대 단계: src/main.js의 appConfig 및 src/map.js
- 검색 및 카테고리 필터: src/main.js
- 식당 목록과 상세 대화상자: 지역 HTML 파일 및 src/main.js
- 마커와 정보 창: src/markers.js
- Kakao SDK 로드 및 지도: src/map.js
- CSV 파싱과 장소 검색: src/places.js
- 현재 위치 처리: src/geolocation.js
- 색상, 레이아웃 및 모바일 스타일: src/style.css, src/landing.css
- 지역·식당 데이터: 맛집정보의 CSV와 src/data의 JSON
- 좌표 생성 및 Kakao 장소 매칭: scripts의 geocode 스크립트


8. 문제 해결
------------

지도가 표시되지 않음
- .env의 VITE_KAKAO_MAP_API_KEY가 JavaScript 키인지 확인합니다.
- Kakao Developers의 Web 플랫폼에 현재 접속 주소를 등록했는지 확인합니다.
- 개발 서버를 재시작하고 브라우저 콘솔의 Kakao 오류를 확인합니다.

좌표 JSON 생성 실패
- .env의 KAKAO_REST_API_KEY가 REST API 키인지 확인합니다.
- CSV 파일명과 열 이름이 스크립트가 요구하는 경로 및 형식과 일치하는지 확인합니다.
- 네트워크 연결, API 사용 제한, 터미널에 표시된 오류를 확인합니다.

음식점이 표시되지 않음
- 생성된 JSON의 restaurants 항목과 source 값을 확인합니다.
- 광주 데이터는 unmatchedRestaurants 항목에 미매칭 사유가 있는지 확인합니다.
- CSV의 카테고리가 화면의 카테고리 값과 같은지, 평점이 숫자인지 확인합니다.

내 위치를 사용할 수 없음
- 브라우저에서 위치 권한을 허용합니다. 위치 기능은 보안 컨텍스트(HTTPS 또는
  localhost)에서 사용하고, 기기의 위치 서비스가 켜져 있는지 확인합니다.

카카오맵 상세 링크가 열리지 않음
- 브라우저의 팝업 차단 설정에서 현재 사이트의 새 창 열기를 허용합니다.


9. 배포
------

1. 올바른 .env 키와 Kakao Web 플랫폼 도메인을 준비합니다.
2. 입력 CSV 파일명 및 데이터가 최신인지 확인합니다.
3. 해당 좌표 JSON 생성 명령을 실행하고 결과를 확인합니다.
4. npm run build로 dist/를 생성합니다.
5. dist/ 내용을 정적 웹 호스팅에 배포합니다.
6. 배포 도메인이 Kakao Developers에 등록되어 있는지 확인하고 데스크톱과 모바일에서
   지역 선택, 검색, 필터, 마커, 상세 링크 및 위치 기능을 점검합니다.

참고: VITE_KAKAO_MAP_API_KEY는 빌드된 브라우저 코드에서 사용됩니다. 비밀 값처럼
취급하지 말고 Kakao Developers의 허용 도메인 설정과 키 관리 정책을 적용하세요.
