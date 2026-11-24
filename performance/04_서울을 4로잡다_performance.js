/* =====================================================
   SCENE:SEOUL - 공연 페이지 JS
   ===================================================== */

const PER_PAGE = 6;                  // 한 페이지에 보여줄 카드 수
const GENRE_NAME = {                 // 장르별 카드 위쪽에 보여줄 글자
  classic: 'PERFORMANCE · CLASSIC · DANCE',
  concert: 'PERFORMANCE · CONCERT',
  musical: 'PERFORMANCE · MUSICAL',
  play: 'PERFORMANCE · PLAY'
};
const GENRE_KEY = 'ss-perf-genre';   // 마지막으로 고른 장르 저장 이름

let allItems = [];                   // JSON에서 불러온 공연 전체
let currentGenre = 'all';            // 지금 선택된 장르
let keyword = '';                    // 검색창에 적은 글자
let currentPage = 1;                 // 지금 보고 있는 페이지

const grid = document.querySelector('#card-grid');
const emptyMsg = document.querySelector('#empty-msg');
const countBox = document.querySelector('#result-count');
const hotLabel = document.querySelector('.hot-label');
const pager = document.querySelector('#pager');
const searchInput = document.querySelector('#perf-search');
const filterLinks = document.querySelectorAll('.ss-filter');


/* ---------- 1. JSON 불러오기 ---------- */
fetch('../data/04_서울을 4로잡다_performance.json')
  .then(response => response.json())
  .then(data => {
    allItems = data.performances;
    currentGenre = localStorage.getItem(GENRE_KEY) || 'all';
    showPage();
  })
  .catch(error => {
    console.error('공연 데이터를 불러오지 못했습니다.', error);
    emptyMsg.textContent = '공연 정보를 불러오지 못했습니다.';
    emptyMsg.hidden = false;
  });


/* ---------- 2. 장르와 검색어에 맞는 공연만 고르기 ---------- */
function getFilteredItems() {
  const result = [];
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const genreOk = currentGenre === 'all' || item.genre === currentGenre;
    const text = (item.title + ' ' + item.location).toLowerCase();
    const keywordOk = text.includes(keyword);
    if (genreOk && keywordOk) {
      result.push(item);
    }
  }
  return result;
}


/* ---------- 3. 카드 한 장의 HTML 만들기 ---------- */
function makeCard(item) {
  const href = item.sourceUrl ? item.sourceUrl : '#';
  const target = item.sourceUrl ? ' target="_blank" rel="noopener noreferrer"' : '';

  return `
    <article class="ss-card ss-catalog-card" data-genre="${item.genre}">
      <a class="ss-card-image" href="${href}"${target} aria-label="${item.title} 상세 보기"><img src="${item.image}" alt=""></a>
      <div class="ss-catalog-card-info">
        <div class="ss-card-topline">
          <span class="ss-card-category">${GENRE_NAME[item.genre]}</span>
          <span class="ss-card-region">${item.district}</span>
        </div>
        <div class="ss-card-titleline">
          <h3 class="ss-card-title"><a href="${href}"${target}>${item.title}</a></h3>
          <label class="ss-heart ss-heart-toggle"><input class="heart-check" type="checkbox" data-save-id="${item.id}" aria-label="${item.title} 관심 공연에 담기"><span aria-hidden="true"></span></label>
        </div>
        <p class="ss-card-description">${item.description}</p>
        <p class="ss-card-meta">${item.location} · ${SceneSeoul.formatPeriod(item)}</p>
        <details class="ss-card-details">
          <summary>VIEW PERFORMANCE DETAILS <span aria-hidden="true">↗</span></summary>
        </details>
      </div>
    </article>`;
}


/* ---------- 4. 화면 그리기 (카드·개수·페이지 번호) ---------- */
function showPage() {
  const items = getFilteredItems();
  const totalPages = Math.ceil(items.length / PER_PAGE);

  if (currentPage > totalPages) {
    currentPage = 1;
  }

  const start = (currentPage - 1) * PER_PAGE;
  const pageItems = items.slice(start, start + PER_PAGE);

  grid.innerHTML = pageItems.map(item => makeCard(item)).join('');
  emptyMsg.textContent = '검색 결과가 없습니다.';
  emptyMsg.hidden = items.length !== 0;
  countBox.textContent = items.length;
  hotLabel.textContent = currentGenre === 'all' ? 'ALL · ' : '';

  showPager(totalPages);
  markActiveFilter();
  SceneSeoul.updateHearts();   // 새로 그린 하트에 저장된 상태를 표시
  addHeartEvents();
}


/* ---------- 5. 페이지 번호 그리기 ---------- */
function showPager(totalPages) {
  if (totalPages <= 1) {
    pager.innerHTML = '';
    return;
  }

  let html = '';

  if (currentPage > 1) {
    html += `<label class="ss-page-arrow" for="pg${currentPage - 1}" aria-label="이전 페이지">‹</label>`;
  } else {
    html += '<span class="ss-page-arrow is-disabled" aria-hidden="true">‹</span>';
  }

  html += '<div class="ss-page-numbers">';
  for (let p = 1; p <= totalPages; p++) {
    const checked = p === currentPage ? ' checked' : '';
    html += `<input class="ss-page-radio pg-radio" type="radio" name="pg" id="pg${p}" value="${p}"${checked}><label for="pg${p}">${p}</label>`;
  }
  html += '</div>';

  if (currentPage < totalPages) {
    html += `<label class="ss-page-arrow" for="pg${currentPage + 1}" aria-label="다음 페이지">›</label>`;
  } else {
    html += '<span class="ss-page-arrow is-disabled" aria-hidden="true">›</span>';
  }

  pager.innerHTML = html;

  // 번호가 바뀌면(라디오 버튼 change) 그 페이지를 보여준다
  const radios = pager.querySelectorAll('.pg-radio');
  for (let i = 0; i < radios.length; i++) {
    radios[i].addEventListener('change', (event) => {
      currentPage = Number(event.target.value);
      showPage();
    });
  }
}


/* ---------- 6. 선택된 장르 버튼 표시 ---------- */
function markActiveFilter() {
  for (let i = 0; i < filterLinks.length; i++) {
    const genre = filterLinks[i].getAttribute('data-genre');
    if (genre === currentGenre) {
      filterLinks[i].classList.add('is-active');
    } else {
      filterLinks[i].classList.remove('is-active');
    }
  }
}


/* ---------- 7. 하트: 누르면 공통 JS가 localStorage에 저장 ---------- */
function addHeartEvents() {
  const hearts = grid.querySelectorAll('.heart-check');
  for (let i = 0; i < hearts.length; i++) {
    hearts[i].addEventListener('change', (event) => {
      const id = event.target.getAttribute('data-save-id');
      SceneSeoul.toggleSaved(id);
    });
  }
}


/* ---------- 8. 장르 버튼 클릭 ---------- */
for (let i = 0; i < filterLinks.length; i++) {
  filterLinks[i].addEventListener('click', (event) => {
    event.preventDefault();
    currentGenre = event.currentTarget.getAttribute('data-genre');
    currentPage = 1;
    localStorage.setItem(GENRE_KEY, currentGenre);
    showPage();
  });
}


/* ---------- 9. 검색창 입력 ---------- */
searchInput.addEventListener('input', () => {
  keyword = searchInput.value.trim().toLowerCase();
  currentPage = 1;
  showPage();
});
