const regions = {
  south: ['수원시', '용인시', '화성시', '평택시', '오산시', '안성시'],
  north: ['고양시', '파주시', '의정부시', '양주시', '포천시', '동두천시', '연천군'],
  east: ['성남시', '광주시', '이천시', '여주시', '하남시', '남양주시', '구리시', '양평군', '가평군'],
  west: ['부천시', '안산시', '안양시', '시흥시', '김포시', '광명시', '군포시', '의왕시', '과천시'],
};

const cityRegions = new Map(
  Object.entries(regions).flatMap(([region, cities]) => cities.map((city) => [city, region])),
);
const cards = [...document.querySelectorAll('.city-card')].map((element) => ({
  element,
  name: element.querySelector('.card-main h2').textContent.trim(),
}));
const search = document.querySelector('#city-search-input');
const filters = [...document.querySelectorAll('.city-filter')];
const count = document.querySelector('#city-result-count');
const empty = document.querySelector('#city-empty');
let selectedRegion = 'all';

function updateCities() {
  const query = search.value.trim().replace(/\s+/g, '').toLocaleLowerCase('ko-KR');
  let visible = 0;

  for (const card of cards) {
    const matchesRegion = selectedRegion === 'all' || cityRegions.get(card.name) === selectedRegion;
    const matchesSearch = card.name.toLocaleLowerCase('ko-KR').includes(query);
    card.element.hidden = !(matchesRegion && matchesSearch);
    if (!card.element.hidden) visible += 1;
  }

  count.textContent = query || selectedRegion !== 'all'
    ? `${visible}개 시군 표시`
    : `전체 ${cards.length}개 시군`;
  empty.hidden = visible !== 0;
}

search.addEventListener('input', updateCities);
for (const filter of filters) {
  filter.addEventListener('click', () => {
    selectedRegion = filter.dataset.region;
    for (const button of filters) {
      const active = button === filter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    updateCities();
  });
}
