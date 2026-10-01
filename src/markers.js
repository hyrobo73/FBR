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
    const content = `<div class="map-info"><strong>${escapeHtml(place.name)}</strong>${rating}<p>${escapeHtml(place.address)}</p></div>`;
    infoWindow.setContent(content);
    infoWindow.open(map, entry.marker);
    map.panTo(entry.marker.getPosition());
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
