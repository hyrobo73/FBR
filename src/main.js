import './style.css';
import yonginCsvUrl from '../맛집정보/favorite_restaurants_yongin.csv?url';
import yonginCoordinates from './data/favorite_restaurants_yongin.json';
import gwangjuCoordinates from './data/favorite_restaurants_gwangju.json';
import sungnamCoordinates from './data/favorite_restaurants_sungnam.json';
import hanamCoordinates from './data/favorite_restaurants_hanam.json';
import suwonCoordinates from './data/favorite_restaurants_suwon.json';
import { createConfiguredMap, fitMapToPlaces, loadKakaoMaps, YONGIN_CONFIG } from './map.js';
import { findPlaceDetails, loadRestaurantCsv, locateRestaurants } from './places.js';
import { createMarkerManager } from './markers.js';
import { getCurrentPosition, showCurrentPosition } from './geolocation.js';

const cityKey = document.documentElement.dataset.city || 'yongin';
const appConfig = cityKey === 'gwangju'
  ? {
      cityName: '광주시',
      source: 'favorite_restaurants_gwangju.csv',
      coordinates: gwangjuCoordinates,
      map: { center: { lat: 37.4095, lng: 127.2550 }, level: 9 },
    }
  : cityKey === 'sungnam'
    ? {
        cityName: '성남시',
        source: 'favorite_restaurants_sungnam.json',
        coordinates: {
          ...sungnamCoordinates,
          restaurants: sungnamCoordinates.restaurants.map((place) => ({ ...place, city: 'sungnam' })),
        },
        map: { center: { lat: 37.4202, lng: 127.1265 }, level: 9 },
      }
    : cityKey === 'hanam'
      ? {
          cityName: '하남시',
          source: 'favorite_restaurants_hanam.json',
          coordinates: {
            ...hanamCoordinates,
            restaurants: hanamCoordinates.restaurants.map((place) => ({ ...place, city: 'hanam' })),
          },
          map: { center: { lat: 37.5393, lng: 127.2148 }, level: 8 },
        }
      : cityKey === 'suwon'
        ? {
            cityName: '수원시',
            source: 'favorite_restaurants_suwon.json',
            coordinates: {
              ...suwonCoordinates,
              restaurants: suwonCoordinates.restaurants.map((place) => ({ ...place, city: 'suwon' })),
            },
            map: { center: { lat: 37.2636, lng: 127.0286 }, level: 8 },
          }
    : {
        cityName: '용인시',
        source: 'favorite_restaurants_yongin.csv',
        coordinates: yonginCoordinates,
        map: YONGIN_CONFIG,
      };

const elements = {
  map: document.querySelector('#map'),
  list: document.querySelector('#restaurant-list'),
  status: document.querySelector('#status'),
  count: document.querySelector('#result-count'),
  resultLabel: document.querySelector('#result-label'),
  searchForm: document.querySelector('#search-form'),
  searchInput: document.querySelector('#search-input'),
  locationButton: document.querySelector('#location-button'),
  mobileListButton: document.querySelector('#mobile-list-button'),
  mobileListClose: document.querySelector('#mobile-list-close'),
  listDragHandle: document.querySelector('#list-drag-handle'),
  sidebar: document.querySelector('.sidebar'),
  mapShell: document.querySelector('.map-shell'),
  categoryTabs: [...document.querySelectorAll('#category-tabs button')],
  mapTypeButtons: [...document.querySelectorAll('#map-type-buttons button')],
  dialog: document.querySelector('#place-dialog'),
  dialogClose: document.querySelector('#dialog-close'),
  dialogListButton: document.querySelector('#dialog-list-button'),
  dialogCategory: document.querySelector('#dialog-category'),
  dialogName: document.querySelector('#dialog-name'),
  dialogRating: document.querySelector('#dialog-rating'),
  dialogAddress: document.querySelector('#dialog-address'),
  dialogPhone: document.querySelector('#dialog-phone'),
  dialogPhoneRow: document.querySelector('#dialog-phone-row'),
  dialogHelp: document.querySelector('#dialog-help'),
  dialogLink: document.querySelector('#dialog-kakao-link'),
  reviewFrame: document.querySelector('#review-frame'),
  reviewBack: document.querySelector('#review-back'),
  reviewExternal: document.querySelector('.review-external'),
  dialogDragHandle: document.querySelector('#dialog-drag-handle'),
};

const state = {
  allPlaces: [],
  visiblePlaces: [],
  category: '전체',
  query: '',
  map: null,
  markerManager: null,
  locationMarker: null,
  selectedPlaceId: null,
  detailRequestId: 0,
  popupRequestId: 0,
};

let mapLocationButton;
let mapZoomSlider;
let mapControlStack;
let dialogDrag = null;
let listDrag = null;

function isMobileLayout() {
  return window.matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1366px)').matches;
}

function closePlacePanel() {
  elements.dialog.hidden = true;
  elements.dialog.classList.remove('is-open', 'is-dragging', 'showing-reviews');
  elements.reviewFrame.removeAttribute('src');
  state.selectedPlaceId = null;
  state.detailRequestId += 1;
  dialogDrag = null;
  syncMapControlsWithPanels();
}

function syncMapControlsWithPanels() {
  const openPanel = elements.dialog.classList.contains('is-open')
    ? elements.dialog
    : elements.sidebar.classList.contains('is-open') ? elements.sidebar : null;
  if (!isMobileLayout() || !openPanel) {
    elements.mapShell.classList.remove('has-place-sheet');
    elements.mapShell.style.removeProperty('--sheet-offset');
    return;
  }
  elements.mapShell.classList.add('has-place-sheet');
  elements.mapShell.style.setProperty('--sheet-offset', `${openPanel.getBoundingClientRect().height}px`);
}

function escapeHtml(value = '') {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}

function setStatus(message = '', type = '') {
  elements.status.textContent = message;
  elements.status.className = `status${type ? ` status--${type}` : ''}`;
  elements.status.hidden = !message;
}

function setMobileListOpen(isOpen) {
  elements.sidebar.classList.toggle('is-open', isOpen);
  if (!isOpen) elements.sidebar.classList.remove('is-dragging');
  elements.mobileListButton.setAttribute('aria-expanded', String(isOpen));
  elements.mobileListClose.setAttribute('aria-expanded', String(isOpen));
  requestAnimationFrame(syncMapControlsWithPanels);
}

function selectListItem(place) {
  const item = elements.list.querySelector(`[data-id="${CSS.escape(place.id)}"]`);
  if (!item) return;
  elements.list.querySelector('.is-selected')?.classList.remove('is-selected');
  item.classList.add('is-selected');
  item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function createListItem(place, index) {
  const item = document.createElement('li');
  item.className = 'restaurant-card';
  item.dataset.id = place.id;
  const safeName = escapeHtml(place.name);
  const safeAddress = escapeHtml(place.address || '주소 정보 없음');
  const meta = escapeHtml([place.category, place.phone].filter(Boolean).join(' · '));
  item.innerHTML = `
    <button type="button" aria-label="${safeName} 상세정보 보기">
      <span class="rank">${String(index + 1).padStart(2, '0')}</span>
      <span class="card-content">
        <span class="card-top"><strong>${safeName}</strong><span class="rating"><span aria-hidden="true">★</span> ${place.rating.toFixed(2)}</span></span>
        <span class="address">${safeAddress}</span>
        <span class="category">${meta}</span>
      </span>
      <span class="arrow" aria-hidden="true">→</span>
    </button>`;
  item.querySelector('button').addEventListener('click', () => {
    state.markerManager.open(place);
    if (isMobileLayout()) {
      setMobileListOpen(false);
      openPlaceDialog(place);
      return;
    }
    handlePlaceSelect(place);
  });
  return item;
}

function renderPlaces(places, { fit = true } = {}) {
  state.visiblePlaces = places;
  elements.list.replaceChildren(...places.map(createListItem));
  elements.count.textContent = `${places.length}곳`;
  state.markerManager.render(places);
  if (fit) fitMapToPlaces(state.map, places);
  if (!places.length) setStatus('조건에 맞는 맛집을 찾지 못했어요.', 'empty');
  else setStatus();
}

function applyFilters() {
  const normalizeSearchText = (value = '') => value
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(/[\s\p{P}\p{S}]/gu, '');
  const queryTokens = state.query.trim().split(/\s+/).filter(Boolean).map(normalizeSearchText);
  const places = state.allPlaces.filter((place) => {
    const categoryMatches = state.category === '전체' || place.category === state.category;
    const name = normalizeSearchText(place.name);
    const address = normalizeSearchText(place.address);
    const kakaoCategory = normalizeSearchText(place.kakaoCategory);
    const lotAddress = normalizeSearchText(place.lotAddress);
    const queryMatches = queryTokens.every((token) => !token
      || name.includes(token)
      || address.includes(token)
      || kakaoCategory.includes(token)
      || lotAddress.includes(token));
    return categoryMatches && queryMatches;
  });
  elements.resultLabel.textContent = state.query ? `${state.category} · “${state.query}”` : `${state.category} 맛집`;
  renderPlaces(places);
}

function updateDialog(place, { preserveReviewView = false } = {}) {
  if (!preserveReviewView) {
    elements.dialog.classList.remove('showing-reviews');
    elements.reviewFrame.removeAttribute('src');
  }
  elements.dialog.dataset.category = place.category || '전체';
  elements.dialogCategory.textContent = place.category || '음식점';
  elements.dialogName.textContent = place.name;
  elements.dialogRating.textContent = place.rating?.toFixed(2) || '정보 없음';
  elements.dialogAddress.textContent = place.address || '주소 정보 없음';
  elements.dialogPhone.textContent = place.phone || '';
  elements.dialogPhoneRow.hidden = !place.phone;
  elements.dialogLink.href = place.url || `https://map.kakao.com/link/search/${encodeURIComponent(place.name)}`;
}

async function openPlaceDialog(place) {
  state.selectedPlaceId = place.id;
  const requestId = ++state.detailRequestId;
  updateDialog(place);
  elements.dialog.style.removeProperty('--sheet-height');
  elements.dialog.classList.remove('is-dragging');
  elements.dialogHelp.textContent = place.url
    ? '카카오 평점과 방문자 리뷰는 카카오맵 상세 페이지에서 확인할 수 있어요.'
    : '카카오맵 장소 정보를 확인하고 있어요…';
  elements.dialog.hidden = false;
  elements.dialog.classList.add('is-open');
  requestAnimationFrame(syncMapControlsWithPanels);
  if (place.url && place.phone) return;

  try {
    const details = await findPlaceDetails(place);
    if (requestId !== state.detailRequestId || state.selectedPlaceId !== place.id) return;
    Object.assign(place, details);
    updateDialog(place, { preserveReviewView: true });
    elements.dialogHelp.textContent = '카카오 평점과 방문자 리뷰는 카카오맵 상세 페이지에서 확인할 수 있어요.';
  } catch {
    if (requestId !== state.detailRequestId) return;
    elements.dialogHelp.textContent = '장소 상세정보를 불러오지 못했어요. 카카오맵 검색 결과에서 확인해 주세요.';
  }
}

function handlePlaceSelect(place) {
  selectListItem(place);
  if (isMobileLayout()) {
    openPlaceDialog(place);
    showReviewsForPlace(place);
    return;
  }
  openKakaoPlacePopup(place);
}

function getKakaoPlaceUrl(place) {
  if (place.kakaoId) return `https://place.map.kakao.com/${encodeURIComponent(place.kakaoId)}`;
  if (place.url?.includes('place.map.kakao.com')) return place.url.replace(/^http:/, 'https:');
  return '';
}

function showReviewsForPlace(place) {
  const reviewUrl = getKakaoPlaceUrl(place) || elements.dialogLink.href;
  elements.reviewFrame.src = reviewUrl;
  elements.reviewExternal.href = reviewUrl;
  elements.dialog.classList.add('showing-reviews');
  requestAnimationFrame(syncMapControlsWithPanels);
}

function showReviews(event) {
  event.preventDefault();
  const place = state.allPlaces.find((item) => item.id === state.selectedPlaceId);
  if (place) showReviewsForPlace(place);
}

async function openKakaoPlacePopup(place) {
  const requestId = ++state.popupRequestId;
  const popupName = 'kakao-place-details';
  const knownUrl = getKakaoPlaceUrl(place);
  const popup = window.open(knownUrl || 'about:blank', popupName, 'popup=yes,width=520,height=760,resizable=yes,scrollbars=yes');
  if (!popup) {
    setStatus('브라우저에서 팝업을 허용해 주세요.', 'notice');
    return;
  }

  if (knownUrl) {
    popup.focus();
    return;
  }

  popup.document.title = '카카오맵 장소 찾는 중';
  popup.document.body.textContent = `${place.name}의 카카오맵 장소 정보를 찾고 있습니다…`;
  popup.document.body.style.cssText = 'margin:0;display:grid;place-items:center;height:100vh;font:14px sans-serif;color:#625b55;background:#fffaf5';

  try {
    const details = await findPlaceDetails(place);
    if (requestId !== state.popupRequestId || popup.closed) return;
    Object.assign(place, details);
    const url = getKakaoPlaceUrl(place);
    if (!url) throw new Error('일치하는 카카오맵 장소가 없습니다.');
    popup.location.replace(url);
  } catch (error) {
    if (requestId !== state.popupRequestId || popup.closed) return;
    popup.document.title = '카카오맵 장소 검색 결과 없음';
    popup.document.body.textContent = `${place.name}: ${error.message}`;
    popup.document.body.style.cssText = 'margin:0;padding:32px;display:grid;place-items:center;min-height:100vh;box-sizing:border-box;text-align:center;font:14px/1.7 sans-serif;color:#625b55;background:#fffaf5';
    setStatus(`${place.name}: ${error.message}`, 'notice');
  }
}

async function loadRestaurants() {
  if (appConfig.coordinates.restaurants?.length) {
    state.allPlaces = appConfig.coordinates.restaurants;
    applyFilters();
    const unmatchedCount = appConfig.coordinates.unmatchedRestaurants?.length ?? appConfig.coordinates.unmatchedCount;
    if (unmatchedCount) {
      setStatus(`Kakao 장소와 매칭되지 않은 ${unmatchedCount}곳은 지도에서 제외했어요.`, 'notice');
    }
    return;
  }

  if (cityKey === 'gwangju') {
    throw new Error('광주시 음식점 좌표 데이터가 없습니다. npm run data:geocode:gwangju를 실행해 주세요.');
  }
  if (cityKey === 'sungnam') {
    throw new Error('성남시 음식점 좌표 데이터가 없습니다. favorite_restaurants_sungnam.json을 확인해 주세요.');
  }

  const restaurants = await loadRestaurantCsv(yonginCsvUrl);
  if (restaurants.length && restaurants.every((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))) {
    state.allPlaces = restaurants;
    applyFilters();
    return;
  }
  const cacheKey = 'yongin-utf8-csv-restaurant-coordinates-v3';
  let cached = [];
  try {
    cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
  } catch {
    localStorage.removeItem(cacheKey);
  }
  const cachedByAddress = new Map(cached.map((place) => [place.address, place]));
  const alreadyLocated = restaurants.flatMap((place) => {
    const saved = cachedByAddress.get(place.address);
    return saved ? [{ ...place, lat: saved.lat, lng: saved.lng, kakaoId: saved.kakaoId, phone: saved.phone, url: saved.url }] : [];
  });
  const unresolved = restaurants.filter((place) => !cachedByAddress.has(place.address));

  if (unresolved.length) {
    elements.count.textContent = `${alreadyLocated.length} / ${restaurants.length}`;
    setStatus(`좌표 JSON이 없어 ${unresolved.length}개 주소를 처음 한 번만 확인하고 있어요…`);
    const newlyLocated = await locateRestaurants(unresolved, (done) => {
      elements.count.textContent = `${alreadyLocated.length + done} / ${restaurants.length}`;
    });
    cached = [...alreadyLocated, ...newlyLocated].sort((a, b) => b.rating - a.rating);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch {
      // 저장 공간을 사용할 수 없어도 현재 화면 표시는 계속합니다.
    }
  } else {
    cached = alreadyLocated.sort((a, b) => b.rating - a.rating);
  }

  state.allPlaces = cached;
  applyFilters();
  if (cached.length < restaurants.length) setStatus(`주소를 확인할 수 없는 ${restaurants.length - cached.length}곳은 제외했어요.`, 'notice');
}

function bindEvents() {
  elements.categoryTabs.forEach((tab) => tab.addEventListener('click', () => {
    state.category = tab.dataset.category;
    elements.mapShell.dataset.theme = state.category;
    document.documentElement.dataset.theme = state.category;
    elements.categoryTabs.forEach((candidate) => {
      const active = candidate === tab;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
    applyFilters();
  }));

  elements.searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    state.query = elements.searchInput.value.trim();
    applyFilters();
  });
  elements.searchInput.addEventListener('search', () => {
    state.query = elements.searchInput.value.trim();
    applyFilters();
  });

  const locateCurrentPosition = async () => {
    elements.locationButton.disabled = true;
    if (mapLocationButton) mapLocationButton.disabled = true;
    setStatus('현재 위치를 확인하고 있어요…');
    try {
      const position = await getCurrentPosition();
      state.locationMarker = showCurrentPosition(state.map, position, state.locationMarker);
      const accuracyText = position.accuracy ? ` (정확도 약 ${Math.round(position.accuracy)}m)` : '';
      setStatus(`현재 위치로 이동했어요.${accuracyText}`, 'notice');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      elements.locationButton.disabled = false;
      if (mapLocationButton) mapLocationButton.disabled = false;
    }
  };
  elements.locationButton.addEventListener('click', locateCurrentPosition);
  mapLocationButton?.addEventListener('click', locateCurrentPosition);
  elements.mapShell.querySelector('[data-zoom-in]').addEventListener('click', () => state.map.setLevel(Math.max(1, state.map.getLevel() - 1)));
  elements.mapShell.querySelector('[data-zoom-out]').addEventListener('click', () => state.map.setLevel(Math.min(14, state.map.getLevel() + 1)));
  mapZoomSlider.addEventListener('input', () => state.map.setLevel(Number(mapZoomSlider.value)));
  kakao.maps.event.addListener(state.map, 'zoom_changed', () => {
    mapZoomSlider.value = String(state.map.getLevel());
  });

  elements.mobileListButton.addEventListener('click', () => setMobileListOpen(true));
  elements.mobileListClose.addEventListener('click', () => setMobileListOpen(false));
  const finishListDrag = (event) => {
    if (!listDrag || event.pointerId !== listDrag.pointerId) return;
    const heightRatio = elements.sidebar.getBoundingClientRect().height / window.innerHeight;
    const snapRatio = heightRatio < 0.43 ? 0.34 : heightRatio < 0.59 ? 0.52 : 0.66;
    elements.sidebar.style.setProperty('--list-sheet-height', `${snapRatio * 100}dvh`);
    elements.sidebar.classList.remove('is-dragging');
    syncMapControlsWithPanels();
    if (elements.listDragHandle.hasPointerCapture(event.pointerId)) {
      elements.listDragHandle.releasePointerCapture(event.pointerId);
    }
    listDrag = null;
  };
  elements.listDragHandle.addEventListener('pointerdown', (event) => {
    if (!isMobileLayout() || !elements.sidebar.classList.contains('is-open') || event.button !== 0) return;
    event.preventDefault();
    listDrag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: elements.sidebar.getBoundingClientRect().height,
    };
    elements.sidebar.classList.add('is-dragging');
    elements.listDragHandle.setPointerCapture(event.pointerId);
  });
  elements.listDragHandle.addEventListener('pointermove', (event) => {
    if (!listDrag || event.pointerId !== listDrag.pointerId) return;
    event.preventDefault();
    const minHeight = window.innerHeight * 0.3;
    const maxHeight = window.innerHeight * 0.66;
    const height = Math.max(minHeight, Math.min(maxHeight, listDrag.startHeight + listDrag.startY - event.clientY));
    elements.sidebar.style.setProperty('--list-sheet-height', `${height}px`);
    syncMapControlsWithPanels();
  });
  elements.listDragHandle.addEventListener('pointerup', finishListDrag);
  elements.listDragHandle.addEventListener('pointercancel', finishListDrag);
  elements.listDragHandle.addEventListener('keydown', (event) => {
    if (!isMobileLayout() || !elements.sidebar.classList.contains('is-open') || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const currentRatio = elements.sidebar.getBoundingClientRect().height / window.innerHeight;
    const nextRatio = event.key === 'ArrowUp'
      ? (currentRatio < 0.43 ? 0.52 : 0.66)
      : (currentRatio > 0.59 ? 0.52 : 0.34);
    elements.sidebar.style.setProperty('--list-sheet-height', `${nextRatio * 100}dvh`);
    syncMapControlsWithPanels();
  });
  elements.mapTypeButtons.forEach((button) => button.addEventListener('click', () => {
    const mapType = button.dataset.mapType === 'HYBRID' ? kakao.maps.MapTypeId.HYBRID : kakao.maps.MapTypeId.ROADMAP;
    state.map.setMapTypeId(mapType);
    elements.mapTypeButtons.forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('is-active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
  }));
  elements.dialogClose.addEventListener('click', closePlacePanel);
  elements.dialogListButton.addEventListener('click', () => {
    closePlacePanel();
    setMobileListOpen(true);
  });
  elements.dialogLink.addEventListener('click', showReviews);
  elements.reviewBack.addEventListener('click', () => {
    elements.reviewFrame.removeAttribute('src');
    elements.dialog.classList.remove('showing-reviews');
    requestAnimationFrame(syncMapControlsWithPanels);
  });
  elements.dialog.addEventListener('click', (event) => {
    if (!isMobileLayout() && event.target === elements.dialog) closePlacePanel();
  });
  const finishDialogDrag = (event) => {
    if (!dialogDrag || event.pointerId !== dialogDrag.pointerId) return;
    const currentHeight = elements.dialog.getBoundingClientRect().height;
    const viewportHeight = window.innerHeight;
    const heightRatio = currentHeight / viewportHeight;
    const snapRatio = heightRatio < 0.48 ? 0.34 : heightRatio < 0.8 ? 0.62 : 1;
    elements.dialog.style.setProperty('--sheet-height', `${snapRatio * 100}dvh`);
    elements.dialog.classList.remove('is-dragging');
    syncMapControlsWithPanels();
    if (elements.dialogDragHandle.hasPointerCapture(event.pointerId)) {
      elements.dialogDragHandle.releasePointerCapture(event.pointerId);
    }
    dialogDrag = null;
  };
  elements.dialogDragHandle.addEventListener('pointerdown', (event) => {
    if (!isMobileLayout() || !elements.dialog.classList.contains('is-open') || event.button !== 0) return;
    event.preventDefault();
    dialogDrag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: elements.dialog.getBoundingClientRect().height,
    };
    elements.dialog.classList.add('is-dragging');
    elements.dialogDragHandle.setPointerCapture(event.pointerId);
  });
  elements.dialogDragHandle.addEventListener('pointermove', (event) => {
    if (!dialogDrag || event.pointerId !== dialogDrag.pointerId) return;
    event.preventDefault();
    const minHeight = window.innerHeight * 0.3;
    const maxHeight = window.innerHeight;
    const height = Math.max(minHeight, Math.min(maxHeight, dialogDrag.startHeight + dialogDrag.startY - event.clientY));
    elements.dialog.style.setProperty('--sheet-height', `${height}px`);
    syncMapControlsWithPanels();
  });
  elements.dialogDragHandle.addEventListener('pointerup', finishDialogDrag);
  elements.dialogDragHandle.addEventListener('pointercancel', finishDialogDrag);
  elements.dialogDragHandle.addEventListener('keydown', (event) => {
    if (!isMobileLayout() || !elements.dialog.classList.contains('is-open') || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const currentRatio = elements.dialog.getBoundingClientRect().height / window.innerHeight;
    const nextRatio = event.key === 'ArrowUp'
      ? (currentRatio < 0.48 ? 0.62 : 1)
      : (currentRatio > 0.8 ? 0.62 : 0.34);
    elements.dialog.style.setProperty('--sheet-height', `${nextRatio * 100}dvh`);
    syncMapControlsWithPanels();
  });
}

async function initialize() {
  try {
    await loadKakaoMaps(import.meta.env.VITE_KAKAO_MAP_API_KEY);
    state.map = createConfiguredMap(elements.map, appConfig.map);
    mapControlStack = document.createElement('div');
    mapControlStack.className = 'map-control-stack';
    mapControlStack.innerHTML = '<div class="map-zoom-control" role="group" aria-label="지도 축척 조절"><button type="button" data-zoom-in aria-label="지도 확대">+</button><input type="range" min="1" max="14" step="1" aria-label="지도 축척" /><button type="button" data-zoom-out aria-label="지도 축소">−</button></div>';
    mapLocationButton = document.createElement('button');
    mapLocationButton.type = 'button';
    mapLocationButton.className = 'map-location-control';
    mapLocationButton.title = '현재 위치로 이동';
    mapLocationButton.setAttribute('aria-label', '현재 위치로 이동');
    mapLocationButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.5"></circle><circle cx="12" cy="12" r="2"></circle><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"></path></svg>';
    mapControlStack.append(mapLocationButton);
    elements.mapShell.append(mapControlStack);
    mapZoomSlider = mapControlStack.querySelector('input[type="range"]');
    mapZoomSlider.value = String(appConfig.map.level);
    state.markerManager = createMarkerManager(state.map, handlePlaceSelect);
    bindEvents();
    await loadRestaurants();
  } catch (error) {
    setStatus(error.message, 'error');
    elements.count.textContent = '설정 필요';
    elements.map.innerHTML = '<div class="map-error"><strong>지도를 표시할 수 없어요.</strong><p>.env 파일에 Kakao JavaScript 키를 설정해 주세요.</p></div>';
  }
}

initialize();
