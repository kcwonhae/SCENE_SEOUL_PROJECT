// 이벤트 카드 목록: 공통 카테고리 CSS와 공통 찜 저장 기능을 사용합니다.
const eventCards = document.getElementById('event-cards');
const eventPagination = document.getElementById('event-pagination');
const eventSearch = document.getElementById('event-search');
const eventFilters = document.querySelector('.ss-filters');
const EVENT_PAGE_SIZE = 8;
let eventItems = [];
let selectedCategory = 'all';
let searchWord = '';
let currentPage = 1;
let eventSort = 'latest';

const sortSelect = document.getElementById('event-sort');

// 날짜 정렬 및 기간별 보기
function dateValue(value) {
    const date = typeof value === 'string' ? value.slice(0, 10) : '';
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function todayValue() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function sortEventItems(items) {
    const today = todayValue();
    const start = item => dateValue(item.startDate || item.date);
    const end = item => dateValue(item.endDate);
    let result = [...items];

    if (eventSort === 'ongoing') {
        result = result.filter(item => start(item) && end(item) && start(item) <= today && end(item) >= today);
    } else if (eventSort === 'closing') {
        result = result.filter(item => end(item) && end(item) >= today);
        return result.sort((a, b) => end(a).localeCompare(end(b)) || start(a).localeCompare(start(b)));
    } else if (eventSort === 'upcoming') {
        result = result.filter(item => start(item) > today);
    }
    return result.sort((a, b) => (start(a) || '9999-12-31').localeCompare(start(b) || '9999-12-31'));
}

function renderEventCard(item) {
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
    period.textContent = SceneSeoul.formatPeriod(item);
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

function renderEventList() {
    const filtered = eventItems.filter(item => {
        const category = item.subCategory || item.subcategory || '';
        const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
        const text = [item.title, item.location, item.district, item.description].join(' ').toLowerCase();
        return matchesCategory && text.includes(searchWord);
    });
    const sorted = sortEventItems(filtered);
    const pages = Math.max(1, Math.ceil(sorted.length / EVENT_PAGE_SIZE));
    currentPage = Math.min(currentPage, pages);
    const from = (currentPage - 1) * EVENT_PAGE_SIZE;
    eventCards.innerHTML = '';
    sorted.slice(from, from + EVENT_PAGE_SIZE).forEach(item => {
        eventCards.appendChild(renderEventCard(item));
    });
    if (!sorted.length) {
        const empty = document.createElement('p');
        empty.className = 'popup-empty';
        empty.textContent = '해당하는 이벤트가 없습니다.';
        eventCards.append(empty);
    }
    eventPagination.innerHTML = '';
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
            renderEventList();
        });
        eventPagination.append(button);
    }
    addPageButton('‹', currentPage - 1, currentPage === 1, false, true);
    for (let n = 1; n <= pages; n++) addPageButton(String(n), n, false, n === currentPage);
    addPageButton('›', currentPage + 1, currentPage === pages, false, true);
}

eventFilters.querySelectorAll('button[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
        selectedCategory = button.getAttribute('data-filter');
        currentPage = 1;
        eventFilters.querySelectorAll('button[data-filter]').forEach(filter => {
            filter.setAttribute('aria-pressed', String(filter === button));
        });
        renderEventList();
    });
});

eventSearch.addEventListener('input', () => {
    searchWord = eventSearch.value.trim().toLowerCase();
    currentPage = 1;
    renderEventList();
});

sortSelect.addEventListener('change', () => {
    eventSort = sortSelect.value;
    currentPage = 1;
    renderEventList();
});

fetch('../data/04_서울을 4로잡다_event.json')
    .then(response => {
        if (!response.ok) throw new Error('이벤트 JSON 로딩 실패');
        return response.json();
    })
    .then(items => {
        eventItems = Array.isArray(items) ? items : (items.events || []);
        renderEventList();
    })
    .catch(error => {
        console.error(error);
        eventCards.textContent = '이벤트 정보를 불러오지 못했습니다.';
    });

window.addEventListener('storage', renderEventList);
window.addEventListener('scene:saved', renderEventList);
