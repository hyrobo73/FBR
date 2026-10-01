export function getCurrentPosition({ targetAccuracy = 30, timeout = 10_000, onUpdate } = {}) {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'));
  }

  return new Promise((resolve, reject) => {
    let bestPosition = null;
    let watchId;

    const finish = (error) => {
      window.clearTimeout(timeoutId);
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      if (bestPosition) resolve(bestPosition);
      else reject(error ?? new Error('현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'));
    };

    const timeoutId = window.setTimeout(() => finish(), timeout);
    watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const accuracy = Number.isFinite(coords.accuracy) ? coords.accuracy : Infinity;
        const candidate = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy,
        };

        if (!bestPosition || candidate.accuracy < bestPosition.accuracy) {
          bestPosition = candidate;
          onUpdate?.(candidate);
        }
        if (candidate.accuracy <= targetAccuracy) finish();
      },
      (positionError) => {
        if (bestPosition) {
          finish();
          return;
        }

        const message = positionError.code === positionError.PERMISSION_DENIED
          ? '정확한 현재 위치를 사용하려면 브라우저의 위치 권한을 허용해 주세요.'
          : '현재 위치를 확인하지 못했어요. GPS를 켜고 다시 시도해 주세요.';
        finish(new Error(message));
      },
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    );
  });
}

export function showCurrentPosition(map, position, previousIndicator) {
  previousIndicator?.marker?.setMap(null);
  previousIndicator?.accuracyCircle?.setMap(null);

  const coords = new kakao.maps.LatLng(position.lat, position.lng);
  const markerElement = document.createElement('div');
  markerElement.className = 'current-location-marker';
  markerElement.title = `현재 위치 · 정확도 약 ${Math.round(position.accuracy)}m`;

  const accuracyCircle = new kakao.maps.Circle({
    map,
    center: coords,
    radius: Number.isFinite(position.accuracy) ? Math.max(position.accuracy, 8) : 30,
    strokeWeight: 1,
    strokeColor: '#2f80ed',
    strokeOpacity: 0.5,
    fillColor: '#2f80ed',
    fillOpacity: 0.12,
  });
  const marker = new kakao.maps.CustomOverlay({
    map,
    position: coords,
    content: markerElement,
    xAnchor: 0.5,
    yAnchor: 0.5,
    zIndex: 20,
  });

  map.setLevel(4);
  map.setCenter(coords);
  return { marker, accuracyCircle };
}
