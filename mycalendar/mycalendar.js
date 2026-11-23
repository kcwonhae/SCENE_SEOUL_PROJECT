// 마이캘린더: calendar-events.json을 불러와서 찜한 콘텐츠를 달력과 목록에 보여준다.
// 찜 목록과 메모는 브라우저 localStorage에 저장한다.

const SAVED_KEY = 'sceneSeoul:saved';
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
  document.querySelector('#dayCount').textContent = `저장한 콘텐츠 ${todayEvents.length}개`;
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
  if (list.length === 0) {
    savedGrid.append(makeElement('p', 'collection-empty', '저장한 콘텐츠가 없습니다. 다른 콘텐츠를 찜해보세요.'));
    return;
  }
  list.forEach(event => savedGrid.append(makeCard(event)));
}

function renderAll() {
  document.querySelector('#savedTotal').textContent = String(getSavedEvents().length);
  renderCalendar();
  renderDayPanel();
  renderSavedList();
}

// 찜하기 / 찜 취소
function toggleSaved(id) {
  if (savedIds.includes(id)) {
    savedIds = savedIds.filter(savedId => savedId !== id);
    showToast('찜 목록에서 제외했어요.');
  } else {
    savedIds.push(id);
    showToast('찜 목록에 저장했어요.');
  }
  saveStorage(SAVED_KEY, savedIds);
  renderAll();
  // 상세 창이 열려 있으면 버튼 글자(♥/♡)를 바꾸기 위해 다시 그린다.
  if (detailDialog.open) {
    fillDetail(events.find(event => event.id === id));
  }
}

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

async function init() {
  try {
    const response = await fetch('./calendar-events.json');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    events = await response.json();

    // 저장된 찜 목록이 없으면(처음 방문) JSON에서 "saved": true인 콘텐츠를 기본 찜으로 쓴다.
    const stored = loadStorage(SAVED_KEY, null);
    if (Array.isArray(stored)) {
      savedIds = stored.filter(id => events.some(event => event.id === id));
    } else {
      savedIds = events.filter(event => event.saved).map(event => event.id);
      saveStorage(SAVED_KEY, savedIds);
    }
    memos = loadStorage(MEMO_KEY, {});
    renderAll();
  } catch (error) {
    const message = '데이터를 불러오지 못했습니다. VS Code Live Server로 실행해 주세요.';
    dayContents.append(makeElement('p', 'empty-day', message));
    savedGrid.append(makeElement('p', 'collection-empty', message));
    renderCalendar();
    document.querySelector('#selectedDate').textContent = '데이터 로딩 오류';
    console.error(error);
  }
}

init();
