import './style.css';
import yonginCsvUrl from '../맛집정보/favorite_restaurants_yongin.csv?url';
import yonginCoordinates from './data/favorite_restaurants_yongin.json';
import gwangjuCoordinates from './data/favorite_restaurants_gwangju.json';
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
  sidebar: document.querySelector('.sidebar'),
  mapShell: document.querySelector('.map-shell'),
  categoryTabs: [...document.querySelectorAll('#category-tabs button')],
  dialog: document.querySelector('#place-dialog'),
  dialogClose: document.querySelector('#dialog-close'),
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
  elements.mobileListButton.setAttribute('aria-expanded', String(isOpen));
  elements.mobileListClose.setAttribute('aria-expanded', String(isOpen));
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
    handlePlaceSelect(place);
    if (window.matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1366px)').matches) setMobileListOpen(false);
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
    const queryMatches = queryTokens.every((token) => !token || name.includes(token) || address.includes(token));
    return categoryMatches && queryMatches;
  });
  elements.resultLabel.textContent = state.query ? `${state.category} · “${state.query}”` : `${state.category} 맛집`;
  renderPlaces(places);
}

function updateDialog(place) {
  elements.dialog.classList.remove('showing-reviews');
  elements.reviewFrame.removeAttribute('src');
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
  elements.dialogHelp.textContent = place.url
    ? '카카오 평점과 방문자 리뷰는 카카오맵 상세 페이지에서 확인할 수 있어요.'
    : '카카오맵 장소 정보를 확인하고 있어요…';
  if (!elements.dialog.open) elements.dialog.showModal();
  if (place.url && place.phone) return;

  try {
    const details = await findPlaceDetails(place);
    if (requestId !== state.detailRequestId || state.selectedPlaceId !== place.id) return;
    Object.assign(place, details);
    updateDialog(place);
    elements.dialogHelp.textContent = '카카오 평점과 방문자 리뷰는 카카오맵 상세 페이지에서 확인할 수 있어요.';
  } catch {
    if (requestId !== state.detailRequestId) return;
    elements.dialogHelp.textContent = '장소 상세정보를 불러오지 못했어요. 카카오맵 검색 결과에서 확인해 주세요.';
  }
}

function handlePlaceSelect(place) {
  selectListItem(place);
  if (window.matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1366px)').matches) {
    openPlaceDialog(place);
    return;
  }
  openKakaoPlacePopup(place);
}

function getKakaoPlaceUrl(place) {
  if (place.kakaoId) return `https://place.map.kakao.com/${encodeURIComponent(place.kakaoId)}`;
  if (place.url?.includes('place.map.kakao.com')) return place.url.replace(/^http:/, 'https:');
  return '';
}

function showReviews(event) {
  event.preventDefault();
  const place = state.allPlaces.find((item) => item.id === state.selectedPlaceId);
  if (!place) return;
  const reviewUrl = getKakaoPlaceUrl(place) || elements.dialogLink.href;
  elements.reviewFrame.src = reviewUrl;
  elements.reviewExternal.href = reviewUrl;
  elements.dialog.classList.add('showing-reviews');
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

  elements.locationButton.addEventListener('click', async () => {
    elements.locationButton.disabled = true;
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
    }
  });

  elements.mobileListButton.addEventListener('click', () => setMobileListOpen(true));
  elements.mobileListClose.addEventListener('click', () => setMobileListOpen(false));
  elements.dialogClose.addEventListener('click', () => elements.dialog.close());
  elements.dialogLink.addEventListener('click', showReviews);
  elements.reviewBack.addEventListener('click', () => {
    elements.reviewFrame.removeAttribute('src');
    elements.dialog.classList.remove('showing-reviews');
  });
  elements.dialog.addEventListener('click', (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });
  elements.dialog.addEventListener('close', () => {
    state.selectedPlaceId = null;
    state.detailRequestId += 1;
  });
}

async function initialize() {
  try {
    await loadKakaoMaps(import.meta.env.VITE_KAKAO_MAP_API_KEY);
    state.map = createConfiguredMap(elements.map, appConfig.map);
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
