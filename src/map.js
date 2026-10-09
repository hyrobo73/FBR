export const YONGIN_CONFIG = {
  center: { lat: 37.2410864, lng: 127.1775537 },
  level: 9,
};

export function loadKakaoMaps(apiKey) {
  if (!apiKey) return Promise.reject(new Error('VITE_KAKAO_MAP_API_KEY가 설정되지 않았습니다.'));
  if (window.kakao?.maps) return new Promise((resolve) => window.kakao.maps.load(resolve));

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&libraries=services&autoload=false`;
    script.async = true;
    script.addEventListener('load', () => window.kakao.maps.load(resolve), { once: true });
    script.addEventListener('error', () => reject(new Error('Kakao Maps SDK를 불러오지 못했습니다.')), { once: true });
    document.head.appendChild(script);
  });
}

export function createMap(container) {
  return createConfiguredMap(container, YONGIN_CONFIG);
}

export function createConfiguredMap(container, config = YONGIN_CONFIG) {
  const map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(config.center.lat, config.center.lng),
    level: config.level,
  });
  return map;
}

export function fitMapToPlaces(map, places) {
  if (!places.length) return;
  const bounds = new kakao.maps.LatLngBounds();
  places.forEach(({ lat, lng }) => bounds.extend(new kakao.maps.LatLng(lat, lng)));
  // On touch tablets the responsive map container changes size as the page
  // settles. Relayout first so Kakao computes bounds from the actual viewport.
  requestAnimationFrame(() => {
    map.relayout();
    map.setBounds(bounds, 70, 70, 70, 70);
  });
}
