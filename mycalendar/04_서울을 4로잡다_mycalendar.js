(() => {
'use strict';

// 마이캘린더: 공통 데이터 폴더의 콘텐츠에서 찜한 항목을 달력과 목록에 보여준다.
// 찜 목록은 공통 로그인 상태에 따라 표시하고, 메모는 localStorage에 저장한다.

const MEMO_KEY = 'sceneSeoul:memos';

const calendarGrid = document.querySelector('#calendarGrid');
const savedGrid = document.querySelector('#savedGrid');
const dayContents = document.querySelector('#dayContents');
const detailDialog = document.querySelector('#detailDialog');
const dialogContent = document.querySelector('#dialogContent');

let events = [];          // JSON에서 불러온 전체 콘텐츠
let savedIds = [];        // 찜한 콘텐츠의 id 목록
let memos = {};           // { 콘텐츠 id: 메모 내용 }
let currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedDate = new Date();
let currentFilter = '전체';

/* ---------- 저장소 ---------- */

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    showToast('브라우저 저장소를 사용할 수 없습니다.');
  }
}

/* ---------- 작은 도우미 함수 ---------- */

// 날짜를 'YYYY-MM-DD' 문자열로 바꾼다.
function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 'YYYY-MM-DD' 문자열을 Date로 바꾼다.
function parseDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// 'YYYY-MM-DD' → 'YYYY.MM.DD'
function formatDate(key) {
  return key.replaceAll('-', '.');
}

// 태그 하나를 만들어 클래스와 글자를 넣어 돌려준다.
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function makeImage(event) {
  const image = document.createElement('img');
  image.src = event.image;
  image.alt = `${event.title} 포스터`;
  return image;
}

function getSavedEvents() {
  return events.filter(event => savedIds.includes(event.id));
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2000);
}

/* ---------- 달력 ---------- */

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  document.querySelector('#monthTitle').textContent = `${year}년 ${month + 1}월`;
  calendarGrid.replaceChildren();

  const firstDay = new Date(year, month, 1).getDay();        // 1일의 요일 (일요일 = 0)
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // 이번 달 날짜 수
  const cellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const savedEvents = getSavedEvents();
  const todayKey = dateKey(new Date());
  const selectedKey = dateKey(selectedDate);

  for (let i = 0; i < cellCount; i++) {
    const date = new Date(year, month, i - firstDay + 1);
    const key = dateKey(date);
    const todayEvents = savedEvents.filter(event => event.date === key);

    const button = makeElement('button', 'calendar-day');
    button.type = 'button';
    button.setAttribute('aria-label', `${formatDate(key)}, 저장한 콘텐츠 ${todayEvents.length}개`);
    if (date.getMonth() !== month) button.classList.add('is-outside');
    if (key === selectedKey) button.classList.add('is-selected');
    if (key === todayKey) button.classList.add('is-today');

    // 찜한 콘텐츠가 있으면 첫 번째 포스터를 칸에 보여준다.
    if (todayEvents.length > 0) {
      button.classList.add('has-poster');
      const poster = makeImage(todayEvents[0]);
      poster.alt = '';
      poster.className = 'day-poster-image';
      button.append(poster);
      if (todayEvents.length > 1) {
        button.append(makeElement('span', 'poster-count', String(todayEvents.length)));
      }
    }
    button.append(makeElement('span', 'day-number', String(date.getDate())));

    button.addEventListener('click', () => {
      selectedDate = date;
      currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      renderCalendar();
      renderDayPanel();
    });
    calendarGrid.append(button);
  }
}

// 선택한 날짜의 콘텐츠를 오른쪽 패널에 보여준다.
function renderDayPanel() {
  const key = dateKey(selectedDate);
  const todayEvents = getSavedEvents().filter(event => event.date === key);
  document.querySelector('#selectedDate').textContent = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;
  dayContents.replaceChildren();

  if (todayEvents.length === 0) {
    dayContents.append(makeElement('p', 'empty-day', '이 날짜에 저장된 콘텐츠가 없어요.'));
    return;
  }

  todayEvents.forEach(event => {
    const item = makeElement('button', 'daily-item');
    item.type = 'button';
    const info = makeElement('span', 'daily-item-info');
    info.append(
      makeElement('span', 'category-label', event.category),
      makeElement('span', 'daily-item-title', event.title),
      makeElement('span', 'daily-item-date', event.location)
    );
    item.append(makeImage(event), info);
    item.addEventListener('click', () => openDetail(event));
    dayContents.append(item);
  });
}

/* ---------- 찜한 콘텐츠 목록 ---------- */

function makeCard(event) {
  const isSaved = savedIds.includes(event.id);
  const card = makeElement('article', 'poster-card');

  const imageButton = makeElement('button', 'poster-image');
  imageButton.type = 'button';
  imageButton.setAttribute('aria-label', `${event.title} 상세보기`);
  const image = makeImage(event);
  image.loading = 'lazy';
  imageButton.append(image);
  imageButton.addEventListener('click', () => openDetail(event));

  const heart = makeElement('button', 'bookmark-button', isSaved ? '♥' : '♡');
  heart.type = 'button';
  heart.setAttribute('aria-label', `${event.title} ${isSaved ? '찜 취소' : '찜하기'}`);
  heart.addEventListener('click', () => toggleSaved(event.id));

  const imageWrap = makeElement('div', 'poster-image-wrap');
  imageWrap.append(imageButton, heart);

  const meta = makeElement('div', 'poster-meta');
  meta.append(makeElement('span', '', event.category), makeElement('span', '', formatDate(event.date)));

  const name = makeElement('button', 'poster-name', event.title);
  name.type = 'button';
  name.addEventListener('click', () => openDetail(event));

  card.append(imageWrap, meta, name, makeElement('p', 'poster-location', event.location));
  return card;
}

function renderSavedList() {
  const list = getSavedEvents().filter(event => currentFilter === '전체' || event.category === currentFilter);
  savedGrid.replaceChildren();
  savedGrid.scrollLeft = 0;
  if (list.length === 0) {
    const emptyText = SceneSeoul.getUser()
      ? '저장한 콘텐츠가 없습니다. 다른 콘텐츠를 찜해보세요.'
      : '로그인하면 찜한 콘텐츠를 볼 수 있어요.';
    savedGrid.append(makeElement('p', 'collection-empty', emptyText));
    updateSlideBar();
    return;
  }
  list.forEach(event => savedGrid.append(makeCard(event)));
  updateSlideBar();
}

function renderAll() {
  document.querySelector('#savedTotal').textContent = String(getSavedEvents().length);
  renderCalendar();
  renderDayPanel();
  renderSavedList();
}

// 찜하기 / 찜 취소
function toggleSaved(id) {
  if (!SceneSeoul.getUser()) {
    showToast('로그인 후 찜할 수 있어요.');
    return;
  }

  const wasSaved = savedIds.includes(id);
  SceneSeoul.toggleSaved(id);
  savedIds = SceneSeoul.getSaved();
  renderAll();
  showToast(wasSaved ? '찜 목록에서 제외했어요.' : '찜 목록에 저장했어요.');
  if (detailDialog.open) {
    const item = events.find(event => event.id === id);
    if (item) fillDetail(item);
  }
}

/* ---------- 찜 목록 슬라이드 ---------- */

const slideRange = document.querySelector('#slideRange');

function updateSlideBar() {
  const maxScroll = savedGrid.scrollWidth - savedGrid.clientWidth;
  slideRange.disabled = maxScroll <= 0;
  slideRange.value = maxScroll > 0 ? Math.round(savedGrid.scrollLeft / maxScroll * 100) : 0;
}

slideRange.addEventListener('input', () => {
  const maxScroll = savedGrid.scrollWidth - savedGrid.clientWidth;
  savedGrid.scrollLeft = maxScroll * Number(slideRange.value) / 100;
});

savedGrid.addEventListener('scroll', updateSlideBar);
window.addEventListener('resize', updateSlideBar);

/* ---------- 상세 창 ---------- */

function openDetail(event) {
  fillDetail(event);
  detailDialog.showModal();
}

function fillDetail(event) {
  const isSaved = savedIds.includes(event.id);
  const title = makeElement('h2', '', event.title);
  title.id = 'dialogTitle';

  const saveButton = makeElement('button', 'primary-button', isSaved ? '♥ 찜 취소' : '♡ 찜하기');
  saveButton.type = 'button';
  saveButton.addEventListener('click', () => toggleSaved(event.id));

  const dateButton = makeElement('button', 'secondary-button', '달력에서 보기');
  dateButton.type = 'button';
  dateButton.addEventListener('click', () => goToDate(event.date));

  const actions = makeElement('div', 'detail-actions');
  actions.append(saveButton, dateButton);

  const memoArea = makeElement('div', 'memo-area');
  showMemo(memoArea, event.id, false);

  const info = document.createElement('div');
  info.append(
    makeElement('span', 'category-label', event.category),
    title,
    makeElement('p', 'detail-meta', `${formatDate(event.date)} · ${event.location}`),
    makeElement('p', 'detail-description', event.description),
    actions,
    memoArea
  );

  const layout = makeElement('div', 'detail-layout');
  layout.append(makeImage(event), info);
  dialogContent.replaceChildren(layout);
}

// 메모 영역: 저장된 메모가 있으면 글만 보여주고, 없거나 수정 중이면 입력창을 보여준다.
function showMemo(area, id, isEditing) {
  area.replaceChildren();

  if (memos[id] && !isEditing) {
    const editButton = makeElement('button', 'secondary-button memo-edit-button', '메모 수정');
    editButton.type = 'button';
    editButton.addEventListener('click', () => showMemo(area, id, true));
    area.append(makeElement('p', 'memo-readonly', memos[id]), editButton);
    return;
  }

  const label = makeElement('label', 'memo-label', '메모');
  label.htmlFor = 'memoInput';
  const textarea = makeElement('textarea', 'memo-input');
  textarea.id = 'memoInput';
  textarea.maxLength = 300;
  textarea.placeholder = '메모를 입력하세요.';
  textarea.value = memos[id] || '';

  const saveButton = makeElement('button', 'primary-button memo-save', '메모 저장');
  saveButton.type = 'button';
  saveButton.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (text) memos[id] = text;
    else delete memos[id];
    saveStorage(MEMO_KEY, memos);
    showMemo(area, id, false);
    showToast('메모를 저장했어요.');
  });

  area.append(label, textarea, saveButton);
  if (isEditing) textarea.focus();
}

// 상세 창의 '달력에서 보기' 버튼
function goToDate(key) {
  selectedDate = parseDate(key);
  currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  detailDialog.close();
  renderCalendar();
  renderDayPanel();
  document.querySelector('.schedule-section').scrollIntoView({ behavior: 'smooth' });
}

/* ---------- 버튼 이벤트 ---------- */

function changeMonth(offset) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
  selectedDate = new Date(currentMonth);
  renderCalendar();
  renderDayPanel();
}

document.querySelector('#prevMonth').addEventListener('click', () => changeMonth(-1));
document.querySelector('#nextMonth').addEventListener('click', () => changeMonth(1));

const filterButtons = document.querySelectorAll('[data-filter]');
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach(item => {
      const isActive = item === button;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', String(isActive));
    });
    renderSavedList();
  });
});

document.querySelector('#closeDialog').addEventListener('click', () => detailDialog.close());
// 창 바깥(어두운 배경)을 누르면 닫는다.
detailDialog.addEventListener('click', event => {
  if (event.target === detailDialog) detailDialog.close();
});

/* ---------- 시작 ---------- */

const CONTENT_SOURCES = [
  { category: '전시', path: '../data/04_서울을 4로잡다_exhibition.json' },
  { category: '공연', path: '../data/04_서울을 4로잡다_performance.json' },
  { category: '팝업', path: '../data/04_서울을 4로잡다_popup.json' },
  { category: '이벤트', path: '../data/04_서울을 4로잡다_event.json' },
  { category: '', path: '../data/04_서울을 4로잡다_recommend.json' }
];

const CATEGORY_LABEL = { exhibition: '전시', performance: '공연', popup: '팝업', event: '이벤트' };

function normalizeItem(item, category) {
  return {
    ...item,
    category: category || CATEGORY_LABEL[item.category] || item.category || '',
    date: item.startDate || item.date || '',
    location: item.location || item.venue || '',
    image: item.image || '',
    description: item.description || ''
  };
}

async function loadCategory(source) {
  const response = await fetch(source.path);
  if (!response.ok) throw new Error(`${source.path}: ${response.status}`);
  const data = await response.json();
  // 팀별 데이터가 배열 또는 { performances: [...] } 형태여도 처리한다.
  const list = Array.isArray(data) ? data : Object.values(data).find(Array.isArray);
  if (!Array.isArray(list)) throw new Error(`${source.path}: 콘텐츠 배열이 없습니다.`);
  return list.map(item => normalizeItem(item, source.category));
}

async function init() {
  const results = await Promise.allSettled(CONTENT_SOURCES.map(loadCategory));
  events = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('콘텐츠 불러오기 실패:', CONTENT_SOURCES[index].path, result.reason);
    }
  });

  savedIds = SceneSeoul.getUser() ? SceneSeoul.getSaved() : [];
  memos = loadStorage(MEMO_KEY, {});
  renderAll();

  if (events.length === 0) {
    dayContents.replaceChildren(makeElement('p', 'empty-day', '콘텐츠 데이터를 불러오지 못했습니다. Live Server와 JSON 경로를 확인해 주세요.'));
  }
}

function refreshSaved() {
  savedIds = SceneSeoul.getUser() ? SceneSeoul.getSaved() : [];
  renderAll();
}

window.addEventListener('scene:login', refreshSaved);
window.addEventListener('scene:saved', refreshSaved);
window.addEventListener('pageshow', refreshSaved);
window.addEventListener('storage', event => {
  if (event.key === SceneSeoul.USER_KEY || event.key === SceneSeoul.getSavedKey()) refreshSaved();
});

// 로그인하지 않은 상태로 들어오면 안내한다.
window.addEventListener('load', () => {
  if (!SceneSeoul.getUser()) alert('마이캘린더를 이용하려면 로그인해 주세요.');
});

// 월 제목과 날짜는 JSON 응답과 무관하게 먼저 표시한다.
refreshSaved();
init();

})();
