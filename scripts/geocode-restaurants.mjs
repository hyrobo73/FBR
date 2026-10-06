import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const inputPath = resolve(root, '맛집정보', '용인시맛집.csv');
const outputPath = resolve(root, 'src', 'data', 'yongin-restaurants.json');
const envPath = resolve(root, '.env');
const addressEndpoint = 'https://dapi.kakao.com/v2/local/search/address.json';
const keywordEndpoint = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const CONCURRENCY = 5;

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
  const [headers, ...rows] = parseCsvRows(source);
  const columns = new Map(headers.map((header, index) => [header.trim(), index]));
  const required = ['카테고리', '음식점명', '평점', '주소'];
  if (required.some((header) => !columns.has(header))) throw new Error(`CSV 필수 열이 없습니다: ${required.join(', ')}`);

  return rows.flatMap((row, index) => {
    const name = row[columns.get('음식점명')]?.trim();
    const address = row[columns.get('주소')]?.trim();
    const rating = Number(row[columns.get('평점')]);
    if (!name || !address || !Number.isFinite(rating)) return [];
    return [{
      id: `csv-yongin-${index + 1}`,
      name,
      rating,
      address,
      category: row[columns.get('카테고리')]?.trim() || '기타',
      city: 'yongin',
      source: 'csv',
    }];
  });
}

async function kakaoRequest(endpoint, query, restApiKey) {
  const url = new URL(endpoint);
  url.searchParams.set('query', query);
  url.searchParams.set('size', '1');

  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${restApiKey}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Kakao API ${response.status}: ${body}`);
  }
  return response.json();
}

async function locateRestaurant(restaurant, restApiKey) {
  const district = restaurant.address.match(/(?:용인시\s+)?(처인구|기흥구|수지구)/)?.[1];
  const queries = [
    `${restaurant.name} ${restaurant.address}`,
    district ? `${restaurant.name} ${district}` : '',
    restaurant.name,
  ].filter((query, index, all) => query && all.indexOf(query) === index);
  let document;

  for (const query of queries) {
    const result = await kakaoRequest(keywordEndpoint, query, restApiKey);
    document = result.documents[0];
    if (document) break;
  }

  // 세 번의 장소 검색 결과가 모두 없으면 주소 좌표 검색으로 보완합니다.
  if (!document) {
    const result = await kakaoRequest(addressEndpoint, restaurant.address, restApiKey);
    document = result.documents[0];
  }

  if (!document) return null;
  return {
    ...restaurant,
    lat: Number(document.y),
    lng: Number(document.x),
    kakaoId: document.id || undefined,
    phone: document.phone || undefined,
    url: document.place_url || undefined,
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
    throw new Error('.env에 KAKAO_REST_API_KEY를 설정해 주세요. JavaScript 키가 아닌 REST API 키가 필요합니다.');
  }

  const restaurants = parseRestaurants(await readFile(inputPath, 'utf8'));
  const located = new Array(restaurants.length);
  const failed = [];
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < restaurants.length) {
      const index = nextIndex++;
      const restaurant = restaurants[index];
      try {
        located[index] = await locateRestaurant(restaurant, restApiKey);
        if (!located[index]) failed.push(restaurant);
      } catch (error) {
        failed.push(restaurant);
        console.error(`\n[실패] ${restaurant.name}: ${error.message}`);
      }
      completed += 1;
      process.stdout.write(`\r좌표 확인 중: ${completed}/${restaurants.length}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, restaurants.length) }, worker));
  const results = located.filter(Boolean).sort((a, b) => b.rating - a.rating);

  await writeFile(outputPath, `${JSON.stringify({
    source: '용인시맛집.csv',
    generatedAt: new Date().toISOString(),
    total: restaurants.length,
    restaurants: results,
  }, null, 2)}\n`, 'utf8');

  console.log(`\n완료: ${results.length}/${restaurants.length}곳의 좌표를 ${outputPath}에 저장했습니다.`);
  if (failed.length) {
    console.log(`좌표를 찾지 못한 ${failed.length}곳: ${failed.map(({ name }) => name).join(', ')}`);
  }
}

main().catch((error) => {
  console.error(`좌표 생성 실패: ${error.message}`);
  process.exitCode = 1;
});
