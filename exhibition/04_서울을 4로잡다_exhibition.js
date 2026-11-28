/* 전시 페이지
   - 데이터: 전시 JSON 1개 (위쪽 캐러셀과 아래 목록이 같은 파일을 사용)
   - 로그인 및 찜: common.js 의 SceneSeoul 함수 사용
   - 카드: category.css 의 공통 카드(.ss-card) 사용
   - 수업 외: 해당 줄에 표시해 둠 */

const exhibitionCards = document.getElementById('ex-cards');
const exhibitionPagination = document.getElementById('ex-pagination');
const exhibitionSearch = document.getElementById('ex-search');
const filterButtons = document.querySelectorAll('.ss-filters button[data-filter]');
const EXHIBITION_PAGE_SIZE = 8;          // 한 페이지에 보여줄 카드 수
let exhibitionItems = [];                // JSON에서 불러온 전시 전체
let selectedGenre = 'all';               // 지금 선택된 분류
let searchWord = '';                     // 검색창에 적은 글자
let currentPage = 1;                     // 지금 보고 있는 페이지


/* 01. JSON 불러오기 */
fetch('../data/04_서울을 4로잡다_exhibition.json')
    .then(response => response.json())
    .then(items => {
        exhibitionItems = items;            // 전시 JSON 은 전시 목록 배열
        sortExhibitions(exhibitionItems);   // 진행 중인 전시 먼저
        resetExhibitionFilter();            // 페이지에 들어올 때마다 '전체'부터 시작
    })
    .catch(error => {
        console.error('전시 데이터를 불러오지 못했습니다.', error);
        exhibitionCards.innerText = '전시 정보를 불러오지 못했습니다.';
    });


/* 02. 작은 도우미 함수 */

// text 안에 word 가 들어 있는지 확인
// replace 로 word 를 지워 봤을 때 글자가 달라지면 들어 있는 것
function hasText(text, word) {
    return text.replace(word, '') !== text;
}

// 오늘 날짜를 JSON 과 같은 "2026-11-27" 모양의 글자로 만들기
// 한 자리 월, 일은 앞에 0을 붙임
function getTodayText() {
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


/* 03. 진행 중인 전시 먼저 보이게 정렬 */
// 순서: 진행 중 (곧 끝나는 순) -> 개막 예정 (곧 시작하는 순)
// 날짜가 "2026-11-27" 모양이라 글자끼리 크기 비교만 해도 날짜 순서와 같음
function sortExhibitions(list) {
    const today = getTodayText();

    // 수업 외: sort 에 비교 함수 넣기 (음수면 a 를 앞으로, 양수면 b 를 앞으로)
    list.sort(function (a, b) {
        const aOpen = a.startDate <= today;   // 이미 시작했으면 진행 중
        const bOpen = b.startDate <= today;

        // 진행 중인 전시를 앞으로
        if (aOpen && !bOpen) {
            return -1;
        }
        if (!aOpen && bOpen) {
            return 1;
        }

        // 둘 다 진행 중이면 종료일이 빠른 순, 둘 다 예정이면 시작일이 빠른 순
        let aDate = a.startDate;
        let bDate = b.startDate;
        if (aOpen) {
            aDate = a.endDate;
            bDate = b.endDate;
        }
        if (aDate < bDate) {
            return -1;
        }
        if (aDate > bDate) {
            return 1;
        }
        return 0;
    });
}


/* 04. 분류와 검색어에 맞는 전시만 고르기 */
function getFilteredExhibitions() {
    const result = [];
    for (const item of exhibitionItems) {
        // 분류: '전체'이거나 같은 분류일 때
        const matchesGenre = selectedGenre === 'all' || item.subCategory === selectedGenre;
        // 검색: 검색어가 없거나, 제목 · 장소 · 구 이름에 검색어가 들어 있을 때
        const text = item.title + ' ' + item.location + ' ' + item.district;
        const matchesWord = searchWord === '' || hasText(text, searchWord);

        if (matchesGenre && matchesWord) {
            result.push(item);
        }
    }
    return result;
}


/* 05. 카드 한 장 만들기 (category.css 공통 카드) */
function renderExhibitionCard(item) {
    const article = document.createElement('article');
    article.className = 'ss-card ss-catalog-card';

    // 포스터
    const imageBox = document.createElement('div');
    imageBox.className = 'ss-card-image';
    const image = document.createElement('img');
    image.src = item.image;
    // 이미지 설명: JSON 에 imageAlt 가 있으면 그것을, 없으면 "제목 포스터"
    // 외부 이미지 주소가 막히거나 깨지면 브라우저가 이 alt 글자를 대신 보여줌
    if (item.imageAlt !== undefined) {
        image.alt = item.imageAlt;
    } else {
        image.alt = item.title + ' 포스터';
    }
    imageBox.appendChild(image);

    // 하트: 저장과 취소, 로그인 전 안내는 common.js 의 toggleSaved() 가 처리
    const heartLabel = document.createElement('label');
    heartLabel.className = 'ss-heart-toggle';
    const heartInput = document.createElement('input');
    heartInput.type = 'checkbox';
    heartInput.setAttribute('data-save-id', item.id);
    heartInput.setAttribute('aria-label', item.title + ' 찜하기');
    heartInput.checked = SceneSeoul.isSaved(item.id);
    heartInput.addEventListener('change', function () {
        SceneSeoul.toggleSaved(item.id);
    });
    const heartShape = document.createElement('span');
    heartShape.setAttribute('aria-hidden', 'true');
    heartLabel.appendChild(heartInput);
    heartLabel.appendChild(heartShape);
    imageBox.appendChild(heartLabel);

    // 글자 정보
    const info = document.createElement('div');
    info.className = 'ss-card-info';
    const title = document.createElement('h3');
    title.className = 'ss-card-title';
    title.innerText = item.title;
    const place = document.createElement('p');
    place.className = 'ss-card-meta';
    place.innerText = item.location;
    const period = document.createElement('p');
    period.className = 'ss-card-period';
    period.innerText = SceneSeoul.formatPeriod(item);
    info.appendChild(title);
    info.appendChild(place);
    info.appendChild(period);

    article.appendChild(imageBox);
    article.appendChild(info);

    // 카드 전체를 누르면 공식 안내 페이지로 (하트는 링크보다 위에 있어서 따로 눌림)
    if (item.officialUrl !== '') {
        const link = document.createElement('a');
        link.className = 'ss-card-link-overlay';
        link.href = item.officialUrl;
        link.target = '_blank';
        link.setAttribute('aria-label', item.title + ' 공식 안내 열기');
        article.appendChild(link);
    }
    return article;
}


/* 06. 화면 그리기 (카드, 페이지 번호) */
function renderExhibitionList() {
    const filtered = getFilteredExhibitions();
    const pages = Math.ceil(filtered.length / EXHIBITION_PAGE_SIZE);

    if (currentPage > pages) {
        currentPage = 1;
    }

    const from = (currentPage - 1) * EXHIBITION_PAGE_SIZE;
    const pageItems = filtered.slice(from, from + EXHIBITION_PAGE_SIZE);

    exhibitionCards.innerHTML = '';
    for (const item of pageItems) {
        exhibitionCards.appendChild(renderExhibitionCard(item));
    }

    if (filtered.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'popup-empty';
        empty.innerText = '해당하는 전시가 없습니다.';
        exhibitionCards.appendChild(empty);
    }

    renderExhibitionPager(pages);
    markActiveFilter();
}


/* 07. 페이지 번호 그리기 */
// 공통 category.css 의 페이지 번호 모양
// ‹ 1 2 3 › (지금 페이지는 aria-current="page", 끝에서는 화살표 disabled)
function renderExhibitionPager(pages) {
    exhibitionPagination.innerHTML = '';
    if (pages <= 1) return;

    exhibitionPagination.appendChild(makePageButton('‹', currentPage - 1, true, '이전 페이지', currentPage === 1));
    for (let n = 1; n <= pages; n++) {
        exhibitionPagination.appendChild(makePageButton(n, n, false, n + '페이지', false));
    }
    exhibitionPagination.appendChild(makePageButton('›', currentPage + 1, true, '다음 페이지', currentPage === pages));
}

// isArrow: true 면 ‹ › 화살표 버튼, false 면 숫자 버튼
function makePageButton(text, page, isArrow, label, disabled) {
    const button = document.createElement('button');
    button.type = 'button';
    if (isArrow) {
        button.className = 'popup-page-arrow';
    } else {
        button.className = 'popup-page-button';
    }
    button.innerText = text;
    button.setAttribute('aria-label', label);

    button.disabled = disabled;
    if (isArrow === false && page === currentPage) {
        button.setAttribute('aria-current', 'page');
    }

    button.addEventListener('click', function () {
        currentPage = page;
        renderExhibitionList();
    });
    return button;
}


/* 08. 선택된 분류 버튼 표시 */
function markActiveFilter() {
    for (const button of filterButtons) {
        if (button.getAttribute('data-filter') === selectedGenre) {
            button.setAttribute('aria-pressed', 'true');
        } else {
            button.setAttribute('aria-pressed', 'false');
        }
    }
}


/* 09. 이벤트 등록 */

// 분류 버튼 클릭
for (const button of filterButtons) {
    button.addEventListener('click', function () {
        selectedGenre = button.getAttribute('data-filter');
        currentPage = 1;
        renderExhibitionList();
    });
}

// 검색창 입력
// 수업 외: input 이벤트 (글자를 입력하거나 지울 때마다 발생)
exhibitionSearch.addEventListener('input', function () {
    searchWord = exhibitionSearch.value;
    currentPage = 1;
    renderExhibitionList();
});


/* 10. 분류, 검색 초기화 */
// 다른 페이지에 다녀오면 항상 '전체', 빈 검색창, 1페이지로 돌아가도록 설정
function resetExhibitionFilter() {
    selectedGenre = 'all';
    searchWord = '';
    currentPage = 1;
    exhibitionSearch.value = '';
    renderExhibitionList();
}

// 뒤로가기로 돌아오면 브라우저가 이전 화면을 그대로 꺼내 보여줄 때가 있음
// 그때는 JSON 을 다시 불러오지 않으므로 여기서 한 번 더 초기화
// 수업 외: pageshow 이벤트, event.persisted (저장해 둔 이전 화면을 꺼내 보여준 경우 true)
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        resetExhibitionFilter();
    }
});
