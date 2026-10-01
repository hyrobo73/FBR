import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const inputPath = resolve(root, '맛집정보', '광주시_맛집.csv');
const outputPath = resolve(root, 'src', 'data', 'gwangju-restaurants.json');
const envPath = resolve(root, '.env');
const keywordEndpoint = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const addressEndpoint = 'https://dapi.kakao.com/v2/local/search/address.json';
const CONCURRENCY = 4;

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
        return [key, value];
      }),
  );
}

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
      } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else field += character;
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseRestaurants(source) {
  const [headers, ...rows] = parseCsvRows(source.replace(/^\uFEFF/, ''));
  if (!headers) throw new Error('CSV가 비어 있습니다.');
  const columns = new Map(headers.map((header, index) => [header.trim(), index]));
  const required = ['카테고리', '음식점명', '평점', '주소'];
  if (required.some((header) => !columns.has(header))) {
    throw new Error(`CSV 필수 열이 없습니다: ${required.join(', ')}`);
  }

  return rows.flatMap((row, index) => {
    const name = row[columns.get('음식점명')]?.trim();
    const address = row[columns.get('주소')]?.trim();
    const rating = Number(row[columns.get('평점')]);
    if (!name || !address || !Number.isFinite(rating)) return [];
    return [{
      id: `csv-gwangju-${index + 1}`,
      name,
      rating,
      address,
      category: row[columns.get('카테고리')]?.trim() || '기타',
      city: 'gwangju',
      source: 'csv',
    }];
  });
}

function normalizeName(value) {
  return String(value || '')
    .toLocaleLowerCase('ko-KR')
    .replace(/(경기)?광주점|광주본점/g, '')
    .replace(/본점|직영점/g, '')
    .replace(/[^0-9a-z가-힣]/g, '');
}

function bigrams(value) {
  if (value.length < 2) return new Set([value]);
  return new Set(Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2)));
}

function nameSimilarity(left, right) {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length) + 0.15;
  const aPairs = bigrams(a);
  const bPairs = bigrams(b);
  const intersection = [...aPairs].filter((pair) => bPairs.has(pair)).length;
  return (2 * intersection) / (aPairs.size + bPairs.size);
}

function addressScore(expected, candidate) {
  const ignored = /^(경기|경기도|광주시|\d+층|\d+호)$/;
  const tokens = String(expected)
    .replace(/[,-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !ignored.test(token));
  return tokens.filter((token) => candidate.includes(token)).length;
}

async function kakaoKeywordSearch(query, restApiKey, attempt = 1) {
  const url = new URL(keywordEndpoint);
  url.searchParams.set('query', query);
  url.searchParams.set('size', '15');

  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${restApiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 3) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    return kakaoKeywordSearch(query, restApiKey, attempt + 1);
  }
  if (!response.ok) throw new Error(`Kakao API ${response.status}`);
  return response.json();
}

async function kakaoAddressSearch(query, restApiKey, attempt = 1) {
  const url = new URL(addressEndpoint);
  url.searchParams.set('query', query);

  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${restApiKey}` },
    signal: AbortSignal.timeout(15_000),
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 3) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    return kakaoAddressSearch(query, restApiKey, attempt + 1);
  }
  if (!response.ok) throw new Error(`Kakao 주소 API ${response.status}`);
  return response.json();
}

function getRoadAddressQuery(address) {
  const tokens = String(address).trim().split(/\s+/);
  const roadIndex = tokens.findIndex((token) => /(?:로|길)$/.test(token));
  if (roadIndex < 0 || !/^\d+(?:-\d+)?$/.test(tokens[roadIndex + 1] || '')) return address;
  return tokens.slice(0, roadIndex + 2).join(' ');
}

async function geocodeRestaurantAddress(restaurant, restApiKey) {
  const queries = [getRoadAddressQuery(restaurant.address), restaurant.address]
    .filter((query, index, all) => query && all.indexOf(query) === index);

  for (const query of queries) {
    const result = await kakaoAddressSearch(query, restApiKey);
    const document = result.documents.find((candidate) => {
      const matchedAddress = candidate.road_address?.address_name || candidate.address?.address_name || '';
      return /^(경기|경기도)\s+광주시(?:\s|$)/.test(matchedAddress);
    });
    if (!document) continue;
    return {
      lat: Number(document.y),
      lng: Number(document.x),
      coordinateStatus: 'address_geocoded',
      geocodedAddress: document.road_address?.address_name || document.address?.address_name,
    };
  }

  return null;
}

function selectCandidate(restaurant, documents) {
  const candidates = documents
    .filter((place) => /^(경기|경기도)\s+광주시(?:\s|$)/.test(place.road_address_name || place.address_name || ''))
    .map((place) => {
      const similarity = nameSimilarity(restaurant.name, place.place_name);
      const candidateAddress = place.road_address_name || place.address_name || '';
      return {
        place,
        similarity,
        score: similarity * 100 + addressScore(restaurant.address, candidateAddress) * 4,
      };
    })
    .filter(({ similarity }) => similarity >= 0.55)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.place || null;
}

async function matchRestaurant(restaurant, restApiKey) {
  const district = restaurant.address.match(/광주시\s+([^\s]+)/)?.[1];
  const queries = [
    `${restaurant.name} ${restaurant.address}`,
    `${restaurant.name} 경기 광주시${district ? ` ${district}` : ''}`,
    `${restaurant.name} 광주시`,
  ].filter((query, index, all) => all.indexOf(query) === index);
  let hadResults = false;

  for (const query of queries) {
    const result = await kakaoKeywordSearch(query, restApiKey);
    if (result.documents.length) hadResults = true;
    const matched = selectCandidate(restaurant, result.documents);
    if (!matched) continue;

    return {
      matched: {
        ...restaurant,
        matchStatus: 'matched',
        lat: Number(matched.y),
        lng: Number(matched.x),
        kakaoId: matched.id,
        kakaoName: matched.place_name,
        kakaoCategory: matched.category_name,
        phone: matched.phone || undefined,
        url: matched.place_url || undefined,
        matchedAddress: matched.road_address_name || matched.address_name,
      },
    };
  }

  const coordinates = await geocodeRestaurantAddress(restaurant, restApiKey);
  return {
    unmatched: {
      ...restaurant,
      matchStatus: 'unmatched',
      ...(coordinates || { coordinateStatus: 'not_found' }),
      reason: hadResults ? '광주시 내에서 음식점명이 일치하는 Kakao 장소를 찾지 못함' : 'Kakao 장소 검색 결과 없음',
    },
  };
}

async function main() {
  let env = {};
  try {
    env = parseEnv(await readFile(envPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY || env.KAKAO_REST_API_KEY;
  if (!restApiKey || restApiKey === 'your_rest_api_key_here') {
    throw new Error('.env에 KAKAO_REST_API_KEY를 설정해 주세요.');
  }

  const restaurants = parseRestaurants(await readFile(inputPath, 'utf8'));
  const results = new Array(restaurants.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < restaurants.length) {
      const index = nextIndex++;
      const restaurant = restaurants[index];
      try {
        results[index] = await matchRestaurant(restaurant, restApiKey);
      } catch (error) {
        results[index] = {
          unmatched: {
            ...restaurant,
            matchStatus: 'unmatched',
            reason: `조회 오류: ${error.message}`,
          },
        };
      }
      completed += 1;
      process.stdout.write(`\rKakao 장소 매칭 중: ${completed}/${restaurants.length}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, restaurants.length) }, worker));
  const matched = results.flatMap((result) => result.matched ? [result.matched] : []);
  const unmatched = results.flatMap((result) => result.unmatched ? [result.unmatched] : []);

  await writeFile(outputPath, `${JSON.stringify({
    source: '광주시_맛집.csv',
    generatedAt: new Date().toISOString(),
    total: restaurants.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    restaurants: matched,
    unmatchedRestaurants: unmatched,
  }, null, 2)}\n`, 'utf8');

  console.log(`\n완료: 매칭 ${matched.length}곳 / 미매칭 ${unmatched.length}곳`);
  if (unmatched.length) console.log(`미매칭: ${unmatched.map(({ name }) => name).join(', ')}`);
  console.log(`저장: ${outputPath}`);
}

main().catch((error) => {
  console.error(`광주시 Kakao 장소 매칭 실패: ${error.message}`);
  process.exitCode = 1;
});
