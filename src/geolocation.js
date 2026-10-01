export function getCurrentPosition() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
        }),
      (positionError) => {
        const message = positionError.code === 1
          ? '정확한 현재 위치를 사용하려면 브라우저의 위치 권한을 허용해 주세요.'
          : '현재 위치를 확인하지 못했어요. GPS를 켜고 다시 시도해 주세요.';
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

export function showCurrentPosition(map, position, previousIndicator) {
  previousIndicator?.marker?.setMap(null);

  const coords = new kakao.maps.LatLng(position.lat, position.lng);
  const marker = new kakao.maps.Marker({
    map,
    position: coords,
    zIndex: 20,
  });

  map.setLevel(4);
  map.setCenter(coords);
  return { marker };
}
