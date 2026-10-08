function parseCsvRows(source) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseRestaurantCsv(source, city = 'yongin') {
  const [headers, ...rows] = parseCsvRows(source.replace(/^\uFEFF/, ''));
  if (!headers) return [];
  const columns = new Map(headers.map((header, index) => [header.trim(), index]));
  const ratingColumn = columns.has('별점') ? '별점' : '평점';
  const addressColumn = columns.has('도로명주소') ? '도로명주소' : '주소';
  const required = ['카테고리', '음식점명', ratingColumn, addressColumn];
  if (required.some((header) => !columns.has(header))) {
    throw new Error(`CSV 필수 열이 없습니다: ${required.join(', ')}`);
  }

  return rows.flatMap((row, index) => {
    const name = row[columns.get('음식점명')]?.trim();
    const address = (row[columns.get(addressColumn)] || row[columns.get('지번주소')] || '').trim();
    const rating = Number(row[columns.get(ratingColumn)]);
    if (!name || !address || !Number.isFinite(rating)) return [];
    const categoryPath = row[columns.get('카테고리')]?.trim() || '기타';
    const category = categoryPath.split('>').map((part) => part.trim()).filter((part) => part && part !== '음식점')[0] || '기타';
    const place = {
      id: `csv-${city}-${index + 1}`,
      name,
      rating,
      address,
      category,
      city,
      source: 'csv',
    };
    const lat = columns.has('위도') && row[columns.get('위도')] ? Number(row[columns.get('위도')]) : undefined;
    const lng = columns.has('경도') && row[columns.get('경도')] ? Number(row[columns.get('경도')]) : undefined;
    if (Number.isFinite(lat) && Number.isFinite(lng)) Object.assign(place, { lat, lng });
    if (columns.has('리뷰수')) place.reviewCount = Number(row[columns.get('리뷰수')]) || 0;
    if (columns.has('전화번호')) place.phone = row[columns.get('전화번호')]?.trim() || '';
    if (columns.has('카카오맵URL')) place.url = row[columns.get('카카오맵URL')]?.trim() || '';
    return [place];
  });
}

export async function loadRestaurantCsv(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('음식점 CSV를 불러오지 못했습니다.');
  const bytes = await response.arrayBuffer();
  return parseRestaurantCsv(new TextDecoder('utf-8').decode(bytes));
}

export function searchPlaces(keyword, options = {}) {
  const service = new kakao.maps.services.Places();

  return new Promise((resolve, reject) => {
    service.keywordSearch(keyword, (data, status, pagination) => {
      if (status === kakao.maps.services.Status.OK) {
        resolve({
          places: data.map((place) => ({
            id: `kakao-${place.id}`,
            kakaoId: place.id,
            name: place.place_name,
            address: place.road_address_name || place.address_name,
            category: place.category_name?.split(' > ').at(-1) || '음식점',
            phone: place.phone,
            url: place.place_url,
            lat: Number(place.y),
            lng: Number(place.x),
            source: 'kakao',
          })),
          pagination,
        });
        return;
      }

      if (status === kakao.maps.services.Status.ZERO_RESULT) {
        resolve({ places: [], pagination: null });
        return;
      }

      reject(new Error('장소 검색 중 오류가 발생했습니다.'));
    }, options);
  });
}

export async function findPlaceDetails(place) {
  const normalize = (value) => value.replace(/\s+/g, '').toLocaleLowerCase('ko-KR');
  const name = normalize(place.name);
  const district = place.address.match(/(?:용인시\s+)?(처인구|기흥구|수지구)/)?.[1];
  const queries = [
    `${place.name} ${place.address}`,
    district ? `${place.name} ${district}` : '',
    place.name,
  ].filter((query, index, all) => query && all.indexOf(query) === index);

  for (const query of queries) {
    const { places } = await searchPlaces(query, { size: 5 });
    if (!places.length) continue;
    const matched = places.find((candidate) => {
      const candidateName = normalize(candidate.name);
      return candidateName === name || candidateName.includes(name) || name.includes(candidateName);
    }) || places[0];

    return {
      ...place,
      kakaoId: matched.kakaoId,
      phone: matched.phone || place.phone,
      url: matched.url || place.url,
    };
  }

  return place;
}

function geocodeAddress(geocoder, restaurant) {
  return new Promise((resolve) => {
    geocoder.addressSearch(restaurant.address, (result, status) => {
      if (status !== kakao.maps.services.Status.OK || !result[0]) {
        resolve(null);
        return;
      }
      resolve({ ...restaurant, lat: Number(result[0].y), lng: Number(result[0].x) });
    });
  });
}

export async function locateRestaurants(restaurants, onProgress, concurrency = 6) {
  const geocoder = new kakao.maps.services.Geocoder();
  const located = [];
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < restaurants.length) {
      const restaurant = restaurants[nextIndex++];
      const result = await geocodeAddress(geocoder, restaurant);
      if (result) located.push(result);
      completed += 1;
      onProgress?.(completed, restaurants.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, restaurants.length) }, worker));
  return located.sort((a, b) => b.rating - a.rating);
}
