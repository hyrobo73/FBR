function escapeHtml(value = '') {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}

export function createMarkerManager(map, onSelect) {
  const markers = new Map();
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
