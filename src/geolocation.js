export function getCurrentPosition(options = {}) {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => reject(new Error('위치 권한을 허용하면 현재 위치를 표시할 수 있어요.')),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000, ...options },
    );
  });
}

export function showCurrentPosition(map, position, previousMarker) {
  previousMarker?.setMap(null);
  const coords = new kakao.maps.LatLng(position.lat, position.lng);
  const marker = new kakao.maps.Marker({ map, position: coords, zIndex: 20 });
  map.setLevel(5);
  map.panTo(coords);
  return marker;
}
