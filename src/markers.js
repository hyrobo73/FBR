function escapeHtml(value = '') {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}

const CATEGORY_MARKERS = {
  한식: { symbol: '🍚', color: '#c96677ff' },
  중식: { symbol: '🥢', color: '#fa0404ff' },
  일식: { symbol: '🍣', color: '#56aed7ff' },
  양식: { symbol: '🍝', color: '#6047d1ff' },
  간식: { symbol: '🍰', color: '#74ec69ff' },
  분식: { symbol: '🍢', color: '#b3ec69ff' },
  아시아음식: { symbol: '🥘', color: '#3feb78ff' },
  치킨: { symbol: '🍗', color: '#c58d21' },
  패스트푸드: { symbol: '🍔', color: '#c84f36' },
  술집: { symbol: '🍺', color: '#ce9f40ff' },
  카페: { symbol: '☕', color: '#805c48' },
  샐러드: { symbol: '🥗', color: '#4d9a69' },
  퓨전요리: { symbol: '🍽️', color: '#507cc4' },
};

function createMarkerImage(category, cache) {
  const style = CATEGORY_MARKERS[category] || { symbol: '🍽️', color: '#4d7f91' };
  const cacheKey = `${style.symbol}-${style.color}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="50" viewBox="0 0 42 50"><path fill="${style.color}" d="M21 1C10 1 2 9.3 2 19.6c0 14.1 19 29.4 19 29.4s19-15.3 19-29.4C40 9.3 32 1 21 1Z"/><circle cx="21" cy="19.5" r="14" fill="#fff"/><text x="21" y="25" text-anchor="middle" font-size="17">${style.symbol}</text></svg>`;
  const image = new kakao.maps.MarkerImage(
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    new kakao.maps.Size(27, 35),
    { offset: new kakao.maps.Point(21, 50) },
  );
  cache.set(cacheKey, image);
  return image;
}

export function createMarkerManager(map, onSelect) {
  const markers = new Map();
  const markerImages = new Map();
  const infoWindow = new kakao.maps.InfoWindow({ zIndex: 10 });

  function clear() {
    markers.forEach(({ marker }) => marker.setMap(null));
    markers.clear();
    infoWindow.close();
  }

  function open(place) {
    const entry = markers.get(place.id);
    if (!entry) return;
    const rating = place.rating ? `<span class="info-rating">★ ${place.rating.toFixed(2)}</span>` : '';
    const reviewCount = Number.isFinite(Number(place.reviewCount)) ? Number(place.reviewCount).toLocaleString('ko-KR') : '-';
    const category = escapeHtml(place.category || '카테고리 미분류');
    const content = `<div class="map-info"><strong>${escapeHtml(place.name)}</strong>${rating}<div class="map-info-meta"><span>${category}</span><span>리뷰 ${reviewCount}개</span></div><p>${escapeHtml(place.address)}</p></div>`;
    infoWindow.setContent(content);
    infoWindow.open(map, entry.marker);
    const position = entry.marker.getPosition();
    map.setLevel(3, { anchor: position });
    map.panTo(position);
  }

  function render(places) {
    clear();
    places.forEach((place) => {
      const marker = new kakao.maps.Marker({
        map,
        position: new kakao.maps.LatLng(place.lat, place.lng),
        image: createMarkerImage(place.category, markerImages),
        title: place.name,
      });
      kakao.maps.event.addListener(marker, 'click', () => {
        open(place);
        onSelect?.(place);
      });
      markers.set(place.id, { marker, place });
    });
  }

  return { render, clear, open };
}
