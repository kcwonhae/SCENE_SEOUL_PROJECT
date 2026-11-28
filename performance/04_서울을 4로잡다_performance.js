/* =====================================================
   SCENE:SEOUL - 공연 페이지 JS
   하는 일
   1) JSON 파일에서 공연 데이터를 불러온다 (fetch)
   2) 장르 버튼·검색창으로 공연을 거르고, 정렬 기준으로 걸러 낸다 (이벤트리스너)
   3) 8개씩 나눠서 카드와 페이지 번호를 보여준다
   4) 하트는 공통 JS(SceneSeoul)로, 마지막 장르는 localStorage에 저장한다
   * 공통 JS(04_서울을 4로잡다_common.js)를 이 파일보다 먼저 불러와야 한다
   ===================================================== */

const PER_PAGE = 8;                  // 한 페이지에 보여줄 카드 수
const GENRE_KEY = 'ss-perf-genre';   // 마지막으로 고른 장르 저장 이름

let allItems = [];                   // JSON에서 불러온 공연 전체
let currentGenre = 'all';            // 지금 선택된 장르
let keyword = '';                    // 검색창에 적은 글자
let currentPage = 1;                 // 지금 보고 있는 페이지
let sortType = 'latest';             // 정렬 기준: latest / ongoing / closing / upcoming

const grid = document.querySelector('#card-grid');
const emptyMsg = document.querySelector('#empty-msg');
const pager = document.querySelector('#pager');
const searchInput = document.querySelector('#perf-search');
const filterLinks = document.querySelectorAll('.ss-filter');
const sortSelect = document.querySelector('#perf-sort');


/* ---------- 1. JSON 불러오기 ---------- */
fetch('../data/04_서울을 4로잡다_performance.json')
  .then(response => response.json())
  .then(data => {
    allItems = data;
    currentGenre = localStorage.getItem(GENRE_KEY) || 'all';
    showPage();
  })
  .catch(error => {
    console.error('공연 데이터를 불러오지 못했습니다.', error);
    emptyMsg.textContent = '공연 정보를 불러오지 못했습니다.';
    emptyMsg.hidden = false;
  });


/* ---------- 2. 오늘 날짜 구하기 ---------- */
// 사용자의 현재 날짜를 '2026-11-28' 모양으로 만든다 (JSON의 날짜와 글자 그대로 비교 가능)
function getToday() {
  const now = new Date();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  if (month < 10) {
    month = '0' + month;
  }
  if (day < 10) {
    day = '0' + day;
  }
  return now.getFullYear() + '-' + month + '-' + day;
}

// 종료일이 없으면 시작일을 종료일로 본다
function getEndDate(item) {
  if (item.endDate) {
    return item.endDate;
  }
  return item.startDate;
}


/* ---------- 3. 정렬 기준에 맞게 거르고 줄 세우기 ---------- */
// 최신순: 기존 목록 순서 그대로
// 진행 중: 시작일 ≤ 오늘 ≤ 종료일
// 마감 임박: 아직 안 끝난 것을 종료일이 가까운 순
// 오픈 예정: 오늘 이후에 시작하는 것을 시작일이 가까운 순
function sortItems(list) {
  if (sortType === 'latest') {
    return list;
  }

  const today = getToday();
  const result = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const start = item.startDate;
    const end = getEndDate(item);

    if (sortType === 'ongoing' && start <= today && today <= end) {
      result.push(item);
    } else if (sortType === 'closing' && end >= today) {
      result.push(item);
    } else if (sortType === 'upcoming' && start > today) {
      result.push(item);
    }
  }

  if (sortType === 'closing') {
    sortByDate(result, 'end');
  } else if (sortType === 'upcoming') {
    sortByDate(result, 'start');
  }
  return result;
}

// 정렬에 쓸 날짜: type이 'end'면 종료일, 아니면 시작일
function getSortDate(item, type) {
  if (type === 'end') {
    return getEndDate(item);
  }
  return item.startDate;
}

// 날짜가 이른 것이 앞에 오도록 정렬한다 (이웃한 두 개를 비교해 바꾸는 방식)
// '2026-11-28' 같은 날짜 글자는 그대로 크기 비교가 된다
function sortByDate(list, type) {
  for (let i = 0; i < list.length - 1; i++) {
    for (let j = 0; j < list.length - 1 - i; j++) {
      if (getSortDate(list[j], type) > getSortDate(list[j + 1], type)) {
        const temp = list[j];
        list[j] = list[j + 1];
        list[j + 1] = temp;
      }
    }
  }
  return list;
}


/* ---------- 4. 장르와 검색어에 맞는 공연만 고르기 ---------- */
function getFilteredItems() {
  const result = [];
  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const genreOk = currentGenre === 'all' || item.subCategory === currentGenre;
    // 수업 외: toLowerCase()는 영문을 소문자로 바꿔서 대소문자 구분 없이 검색하게 한다
    const text = (item.title + ' ' + item.location).toLowerCase();
    // 수업 외: includes()는 글자 안에 검색어가 들어 있는지(true/false) 확인한다
    const keywordOk = text.includes(keyword);
    if (genreOk && keywordOk) {
      result.push(item);
    }
  }
  return sortItems(result);   // 장르·검색 결과에 정렬 기준을 이어서 적용
}


/* ---------- 5. 카드 한 장의 HTML 만들기 ---------- */
// 공통 카드 모양: 포스터(오른쪽 아래 하트) + 제목 + 장소 + 기간
function makeCard(item) {
  let href = '#';
  let target = '';
  if (item.sourceUrl) {
    href = item.sourceUrl;
    // 수업 외: rel="noopener noreferrer"는 새 창으로 열 때 원래 페이지를 보호하는 링크 속성이다
    target = ' target="_blank" rel="noopener noreferrer"';
  }

  return `
    <article class="ss-card ss-catalog-card" data-genre="${item.subCategory}">
      <a class="ss-card-link-overlay" href="${href}"${target} aria-label="${item.title} 상세 보기"></a>
      <div class="ss-card-image">
        <img src="${item.image}" alt="${item.title} 포스터">
        <label class="ss-heart ss-heart-toggle"><input class="heart-check" type="checkbox" data-save-id="${item.id}" aria-label="${item.title} 관심 공연에 담기"><span aria-hidden="true"></span></label>
      </div>
      <div class="ss-card-info ss-catalog-card-info">
        <h3 class="ss-card-title">${item.title}</h3>
        <p class="ss-card-meta">${item.location}</p>
        <p class="ss-card-period">${SceneSeoul.formatPeriod(item)}</p>
      </div>
    </article>`;
}


/* ---------- 6. 화면 그리기 (카드·개수·페이지 번호) ---------- */
function showPage() {
  const items = getFilteredItems();
  const totalPages = Math.ceil(items.length / PER_PAGE);

  if (currentPage > totalPages) {
    currentPage = 1;
  }

  const start = (currentPage - 1) * PER_PAGE;
  const pageItems = [];
  for (let i = start; i < start + PER_PAGE && i < items.length; i++) {
    pageItems.push(items[i]);
  }

  grid.innerHTML = pageItems.map(item => makeCard(item)).join('');
  if (sortType === 'latest') {
    emptyMsg.textContent = '검색 결과가 없습니다.';
  } else {
    emptyMsg.textContent = '조건에 맞는 공연이 없습니다.';
  }
  // 수업 외: hidden은 HTML 요소를 숨기는 속성이다 (true면 숨김, false면 보임)
  emptyMsg.hidden = items.length !== 0;

  showPager(totalPages);
  markActiveFilter();
  SceneSeoul.updateHearts();   // 새로 그린 하트에 저장된 상태를 표시
  addHeartEvents();
}


/* ---------- 7. 페이지 번호 그리기 ---------- */
function showPager(totalPages) {
  pager.innerHTML = '';
  if (totalPages <= 1) {
    return;
  }

  pager.appendChild(makeArrow('‹', currentPage - 1, currentPage === 1));

  for (let p = 1; p <= totalPages; p++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'popup-page-button';
    button.textContent = p;
    button.setAttribute('aria-label', p + '페이지');
    if (p === currentPage) {
      button.setAttribute('aria-current', 'page');
    }
    button.addEventListener('click', () => {
      currentPage = p;
      showPage();
    });
    pager.appendChild(button);
  }

  pager.appendChild(makeArrow('›', currentPage + 1, currentPage === totalPages));
}

// 이전/다음 화살표 버튼 만들기
function makeArrow(label, targetPage, disabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'popup-page-arrow';
  button.textContent = label;
  button.disabled = disabled;
  if (label === '‹') {
    button.setAttribute('aria-label', '이전 페이지');
  } else {
    button.setAttribute('aria-label', '다음 페이지');
  }
  button.addEventListener('click', () => {
    currentPage = targetPage;
    showPage();
  });
  return button;
}


/* ---------- 8. 선택된 장르 버튼 표시 ---------- */
function markActiveFilter() {
  for (let i = 0; i < filterLinks.length; i++) {
    const genre = filterLinks[i].getAttribute('data-genre');
    // 수업 외: classList.add / remove는 요소의 class 이름을 넣고 빼는 기능이다
    if (genre === currentGenre) {
      filterLinks[i].classList.add('is-active');
    } else {
      filterLinks[i].classList.remove('is-active');
    }
  }
}


/* ---------- 9. 하트: 누르면 공통 JS가 localStorage에 저장 ---------- */
// 로그인 확인과 안내 문구도 공통 JS의 toggleSaved가 처리한다
function addHeartEvents() {
  const hearts = grid.querySelectorAll('.heart-check');
  for (let i = 0; i < hearts.length; i++) {
    hearts[i].addEventListener('change', (event) => {
      const id = event.target.getAttribute('data-save-id');
      SceneSeoul.toggleSaved(id);
    });
  }
}


/* ---------- 10. 장르 버튼 클릭 ---------- */
for (let i = 0; i < filterLinks.length; i++) {
  filterLinks[i].addEventListener('click', (event) => {
    event.preventDefault();
    currentGenre = event.currentTarget.getAttribute('data-genre');
    currentPage = 1;
    localStorage.setItem(GENRE_KEY, currentGenre);
    showPage();
  });
}


/* ---------- 11. 검색창 입력 ---------- */
searchInput.addEventListener('input', () => {
  // 수업 외: trim()은 앞뒤 빈칸을 지우고, toLowerCase()는 영문을 소문자로 바꾼다
  keyword = searchInput.value.trim().toLowerCase();
  currentPage = 1;
  showPage();
});


/* ---------- 12. 정렬 기준 바꾸기 ---------- */
// 기준을 바꾸면 1페이지부터 다시 보여준다
sortSelect.addEventListener('change', () => {
  sortType = sortSelect.value;
  currentPage = 1;
  showPage();
});
