const exhibitionCards = document.getElementById('ex-cards');
const exhibitionPagination = document.getElementById('ex-pagination');
const exhibitionSearch = document.getElementById('ex-search');
const exhibitionFilters = document.querySelector('.ss-filters');
const EXHIBITION_PAGE_SIZE = 8;          // 한 페이지에 보여줄 카드 수
const EXHIBITION_GENRE_KEY = 'ss-ex-genre';   // 마지막으로 고른 분류 저장 이름
let exhibitionItems = [];                // JSON에서 불러온 전시 전체
let selectedGenre = 'all';               // 지금 선택된 분류
let searchWord = '';                     // 검색창에 적은 글자
let currentPage = 1;                     // 지금 보고 있는 페이지


/* ---------- 1. JSON 불러오기 ---------- */
fetch('../data/04_서울을 4로잡다_exhibition.json')
  .then(response => response.json())
  .then(items => {
    // JSON이 배열이면 그대로, { "exhibitions": [ ... ] } 모양이면 그 안의 배열을 꺼낸다
    exhibitionItems = items.length ? items : (items.exhibitions || []);
    selectedGenre = localStorage.getItem(EXHIBITION_GENRE_KEY) || 'all';
    renderExhibitionList();
  })
  .catch(error => {
    console.error('전시 데이터를 불러오지 못했습니다.', error);
    exhibitionCards.textContent = '전시 정보를 불러오지 못했습니다.';
  });


/* ---------- 2. 분류와 검색어에 맞는 전시만 고르기 ---------- */
function getFilteredExhibitions() {
  const result = [];
  for (let i = 0; i < exhibitionItems.length; i++) {
    const item = exhibitionItems[i];
    const genre = item.subCategory || '';
    const matchesGenre = selectedGenre === 'all' || genre === selectedGenre;
    const text = (item.title + ' ' + item.location + ' ' + item.district + ' ' + item.description).toLowerCase();
    if (matchesGenre && text.includes(searchWord)) {
      result.push(item);
    }
  }
  return result;
}


/* ---------- 3. 카드 한 장 만들기 ---------- */
// 공통 카드 모양: 포스터(오른쪽 아래 하트) + 제목 + 장소 + 기간
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
  image.setAttribute('loading', 'lazy');
  imageBox.appendChild(image);

  const heartLabel = document.createElement('label');
  heartLabel.className = 'ss-heart-toggle';
  const heartInput = document.createElement('input');
  heartInput.type = 'checkbox';
  heartInput.className = 'heart-check';
  heartInput.setAttribute('data-save-id', item.id);
  heartInput.setAttribute('aria-label', item.title + ' 찜하기');
  const heartShape = document.createElement('span');
  heartShape.setAttribute('aria-hidden', 'true');
  heartLabel.appendChild(heartInput);
  heartLabel.appendChild(heartShape);
  imageBox.appendChild(heartLabel);

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
  info.appendChild(title);
  info.appendChild(place);
  info.appendChild(period);

  article.appendChild(imageBox);
  article.appendChild(info);

  const url = item.officialUrl || item.sourceUrl;
  if (url) {
    const link = document.createElement('a');
    link.className = 'ss-card-link-overlay';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', item.title + ' 공식 안내 열기');
    article.appendChild(link);
  }
  return article;
}


/* ---------- 4. 화면 그리기 (카드·페이지 번호) ---------- */
function renderExhibitionList() {
  const filtered = getFilteredExhibitions();
  const pages = Math.ceil(filtered.length / EXHIBITION_PAGE_SIZE);

  if (currentPage > pages) {
    currentPage = 1;
  }

  const from = (currentPage - 1) * EXHIBITION_PAGE_SIZE;
  const pageItems = filtered.slice(from, from + EXHIBITION_PAGE_SIZE);

  exhibitionCards.innerHTML = '';
  for (let i = 0; i < pageItems.length; i++) {
    exhibitionCards.appendChild(renderExhibitionCard(pageItems[i]));
  }

  if (filtered.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'popup-empty';
    empty.textContent = '해당하는 전시가 없습니다.';
    exhibitionCards.appendChild(empty);
  }

  renderExhibitionPager(pages);
  markActiveFilter();
  SceneSeoul.updateHearts();   // 새로 그린 하트에 저장된 상태를 표시
  addHeartEvents();
}


/* ---------- 5. 페이지 번호 그리기 ---------- */
// 공통 category.css 의 페이지 번호 모양: .popup-js-pager / .popup-page-button / .popup-page-arrow
// ‹ 1 2 3 › (지금 페이지는 aria-current="page", 끝에서는 화살표 disabled)
function renderExhibitionPager(pages) {
  exhibitionPagination.innerHTML = '';
  if (pages <= 1) return;

  exhibitionPagination.appendChild(makePageButton('‹', currentPage - 1, true, '이전 페이지', currentPage === 1));
  for (let n = 1; n <= pages; n++) {
    exhibitionPagination.appendChild(makePageButton(String(n), n, false, n + '페이지', false));
  }
  exhibitionPagination.appendChild(makePageButton('›', currentPage + 1, true, '다음 페이지', currentPage === pages));
}

function makePageButton(text, page, arrow, label, disabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = arrow ? 'popup-page-arrow' : 'popup-page-button';
  button.textContent = text;
  button.setAttribute('aria-label', label);

  button.disabled = disabled;
  if (!arrow && page === currentPage) {
    button.setAttribute('aria-current', 'page');
  }

  button.addEventListener('click', () => {
    currentPage = page;
    renderExhibitionList();
  });
  return button;
}


/* ---------- 6. 선택된 분류 버튼 표시 ---------- */
function markActiveFilter() {
  const buttons = exhibitionFilters.querySelectorAll('button[data-filter]');
  for (let i = 0; i < buttons.length; i++) {
    const genre = buttons[i].getAttribute('data-filter');
    buttons[i].setAttribute('aria-pressed', String(genre === selectedGenre));
  }
}


/* ---------- 7. 하트: 로그인했을 때만 공통 JS가 localStorage에 저장 ---------- */
function addHeartEvents() {
  const hearts = exhibitionCards.querySelectorAll('.heart-check');
  for (let i = 0; i < hearts.length; i++) {
    hearts[i].addEventListener('change', event => {
      if (!SceneSeoul.getUser()) {
        alert('로그인 후 저장할 수 있어요.');
        event.target.checked = false;
        return;
      }
      const id = event.target.getAttribute('data-save-id');
      SceneSeoul.toggleSaved(id);
    });
  }
}


/* ---------- 8. 분류 버튼 클릭 ---------- */
const filterButtons = exhibitionFilters.querySelectorAll('button[data-filter]');
for (let i = 0; i < filterButtons.length; i++) {
  filterButtons[i].addEventListener('click', event => {
    selectedGenre = event.currentTarget.getAttribute('data-filter');
    currentPage = 1;
    localStorage.setItem(EXHIBITION_GENRE_KEY, selectedGenre);
    renderExhibitionList();
  });
}


/* ---------- 9. 검색창 입력 ---------- */
exhibitionSearch.addEventListener('input', () => {
  searchWord = exhibitionSearch.value.trim().toLowerCase();
  currentPage = 1;
  renderExhibitionList();
});

window.addEventListener('scene:saved', SceneSeoul.updateHearts);
