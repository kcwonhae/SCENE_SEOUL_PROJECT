// 전시 카드 목록: 공통 카테고리 CSS와 공통 찜 저장 기능을 사용합니다.
const exhibitionCards = document.getElementById('ex-cards');
const exhibitionPagination = document.getElementById('ex-pagination');
const exhibitionSearch = document.getElementById('ex-search');
const exhibitionFilters = document.querySelector('.ss-filters');
const EXHIBITION_PAGE_SIZE = 8;
let exhibitionItems = [];
let selectedGenre = 'all';
let searchWord = '';
let currentPage = 1;

function exhibitionPeriod(item) {
  return SceneSeoul.formatPeriod(item);
}

function renderExhibitionCard(item) {
  const article = document.createElement('article');
  article.className = 'ss-card ss-catalog-card';

  const imageBox = document.createElement('div');
  imageBox.className = 'ss-card-image';
  const image = document.createElement('img');
  image.src = item.image;
  image.alt = item.imageAlt || `${item.title} 포스터`;
  image.loading = 'lazy';
  imageBox.append(image);

  const heartLabel = document.createElement('label');
  heartLabel.className = 'ss-heart-toggle';
  const heartInput = document.createElement('input');
  heartInput.type = 'checkbox';
  heartInput.dataset.saveId = item.id;
  heartInput.setAttribute('aria-label', item.title + ' 찜하기');
  heartInput.checked = SceneSeoul.isSaved(item.id);
  heartInput.addEventListener('change', () => SceneSeoul.toggleSaved(item.id));
  const heartShape = document.createElement('span');
  heartShape.setAttribute('aria-hidden', 'true');
  heartLabel.append(heartInput, heartShape);
  imageBox.append(heartLabel);

  const info = document.createElement('div');
  info.className = 'ss-card-info';
  const title = document.createElement('h3');
  title.className = 'ss-card-title';
  title.textContent = item.title;
  const place = document.createElement('p');
  place.className = 'ss-card-meta';
  place.textContent = item.location;
  const period = document.createElement('p');
  period.className = 'ss-card-period';
  period.textContent = exhibitionPeriod(item);
  info.append(title, place, period);
  article.append(imageBox, info);

  const url = item.officialUrl || item.sourceUrl;
  if (url) {
    const link = document.createElement('a');
    link.className = 'ss-card-link-overlay';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', item.title + ' 공식 안내 열기');
    article.append(link);
  }
  return article;
}

function renderExhibitionList() {
  const filtered = exhibitionItems.filter(item => {
    const genre = item.subCategory || item.subcategory || '';
    const matchesGenre = selectedGenre === 'all' || genre === selectedGenre;
    const text = [item.title, item.location, item.district, item.description].join(' ').toLowerCase();
    return matchesGenre && text.includes(searchWord);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / EXHIBITION_PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  const from = (currentPage - 1) * EXHIBITION_PAGE_SIZE;
  exhibitionCards.replaceChildren(...filtered.slice(from, from + EXHIBITION_PAGE_SIZE).map(renderExhibitionCard));
  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'popup-empty';
    empty.textContent = '해당하는 전시가 없습니다.';
    exhibitionCards.append(empty);
  }
  exhibitionPagination.replaceChildren();
  if (pages <= 1) return;
  function addPageButton(text, page, disabled, current, arrow = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = arrow ? 'popup-page-arrow' : 'popup-page-button';
    button.textContent = text;
    button.disabled = disabled;
    if (current) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', () => {
      currentPage = page;
      renderExhibitionList();
    });
    exhibitionPagination.append(button);
  }
  addPageButton('‹', currentPage - 1, currentPage === 1, false, true);
  for (let n = 1; n <= pages; n++) addPageButton(String(n), n, false, n === currentPage);
  addPageButton('›', currentPage + 1, currentPage === pages, false, true);
}

exhibitionFilters.addEventListener('click', event => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  selectedGenre = button.dataset.filter;
  currentPage = 1;
  exhibitionFilters.querySelectorAll('button[data-filter]').forEach(filter => {
    filter.setAttribute('aria-pressed', String(filter === button));
  });
  renderExhibitionList();
});

exhibitionSearch.addEventListener('input', () => {
  searchWord = exhibitionSearch.value.trim().toLowerCase();
  currentPage = 1;
  renderExhibitionList();
});

fetch('../data/04_서울을 4로잡다_exhibition.json')
  .then(response => {
    if (!response.ok) throw new Error('전시 JSON 로딩 실패');
    return response.json();
  })
  .then(items => {
    exhibitionItems = Array.isArray(items) ? items : (items.exhibitions || []);
    renderExhibitionList();
  })
  .catch(error => {
    console.error(error);
    exhibitionCards.textContent = '전시 정보를 불러오지 못했습니다.';
  });

window.addEventListener('storage', renderExhibitionList);
window.addEventListener('scene:saved', renderExhibitionList);
