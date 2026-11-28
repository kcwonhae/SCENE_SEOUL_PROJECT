// 추천 페이지: '결과 보기'를 누르면 고른 조건 7개를 JSON 데이터와 비교해서 점수가 높은 3건을 보여준다.
// 팀 04 서울을 4로잡다 / 신윤정(2411997)
// * 공통 JS(04_서울을 4로잡다_common.js)를 이 파일보다 먼저 불러와야 한다 (기간 글자에 사용)

// 카테고리 → 화면에 보여줄 이름
const CATEGORY_NAME = { exhibition: '전시', performance: '공연', popup: '팝업', event: '이벤트' };

// 카테고리 → 상세 보기로 이동할 페이지 (JSON의 sourceUrl이 비어 있을 때 사용)
const CATEGORY_PAGE = {
  exhibition: '../exhibition/04_서울을 4로잡다_exhibition.html',
  performance: '../performance/04_서울을 4로잡다_performance.html',
  popup: '../popup/04_서울을 4로잡다_popup.html',
  event: '../event/04_서울을 4로잡다_event.html'
};

// 결과 제목에 쓸 말 (누구와 기준)
const WHO_TITLE = { solo: '혼자', couple: '연인과', friends: '친구와', family: '가족과' };

// 예산 코드 → 가격 상한 (0이면 무료만)
const BUDGET_LIMIT = { free: 0, 30: 30000, 50: 50000 };

let allItems = [];
let shownIds = [];        // 지금 화면에 보이는 3건의 id (하트 누를 때 사용)

const chips = document.querySelectorAll('.chip input');
const sendBtn = document.getElementById('send-btn');
const resultBox = document.getElementById('result-box');

// 배열(list) 안에 값(value)이 있으면 true
function hasValue(list, value) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === value) {
      return true;
    }
  }
  return false;
}

// 새로고침하면 칩을 모두 선택 안 된 상태로 되돌린다
// (브라우저가 새로고침 때 체크 상태를 기억해 주는 경우도 있어서, 다 불러온 뒤에 한 번 더 맞춘다)
function resetChips() {
  for (let i = 0; i < chips.length; i++) {
    chips[i].checked = false;
  }
}
resetChips();
window.addEventListener('load', resetChips);

// JSON 불러오기
fetch('../data/04_서울을 4로잡다_recommend.json')
  .then(response => response.json())
  .then(data => {
    allItems = data.recommendations;
  })
  .catch(error => {
    resultBox.innerHTML = '<p class="ss-empty">추천 데이터를 불러오지 못했어요.</p>';
    console.log(error);
  });

// 지금 선택된 조건을 객체로 모으기 (예산만 하나, 나머지는 여러 개를 배열로)
// 예산을 안 골랐으면 'any'(제한 없음)로 본다
function getConditions() {
  const conds = { who: [], weather: [], time: [], place: [], mood: [], category: [], budget: 'any' };
  for (let i = 0; i < chips.length; i++) {
    const input = chips[i];
    if (input.checked) {
      if (input.name === 'budget') {
        conds.budget = input.value;
      } else {
        conds[input.name].push(input.value);
      }
    }
  }
  return conds;
}

// 고른 값(selected) 중 하나라도 항목의 값(values)에 있으면 true
// 아무것도 안 골랐거나 '상관없음(any)'이면 조건이 없는 것이라 항상 true
function isMatch(selected, values) {
  if (selected.length === 0 || hasValue(selected, 'any')) {
    return true;
  }
  for (let i = 0; i < selected.length; i++) {
    if (hasValue(values, selected[i])) {
      return true;
    }
  }
  return false;
}

// 항목 하나가 조건과 몇 개 맞는지 세기 (최대 7점)
function getScore(item, conds) {
  let score = 0;
  if (isMatch(conds.who, item.who)) score++;
  if (isMatch(conds.weather, item.weather)) score++;
  if (isMatch(conds.time, item.time)) score++;

  let placeValues = [item.place];
  if (item.place === 'both') {
    placeValues = ['in', 'out'];
  }
  if (isMatch(conds.place, placeValues)) score++;

  if (isMatch(conds.mood, item.mood)) score++;
  if (isMatch(conds.category, [item.category])) score++;
  if (conds.budget === 'any' || item.price <= BUDGET_LIMIT[conds.budget]) score++;
  return score;
}

// 예산 안에 드는 것만 남기고, 점수가 높은 순으로 3건 고르기
function pickTop3(conds) {
  // 1) 예산 안에 드는 항목만 점수를 매겨 모은다
  const scored = [];
  for (let i = 0; i < allItems.length; i++) {
    if (conds.budget === 'any' || allItems[i].price <= BUDGET_LIMIT[conds.budget]) {
      scored.push({ item: allItems[i], score: getScore(allItems[i], conds) });
    }
  }

  // 2) 점수가 가장 높은 것을 하나씩 3번 뽑는다 (점수가 같으면 앞에 있는 것 먼저)
  const used = [];
  for (let i = 0; i < scored.length; i++) {
    used.push(false);
  }
  const top3 = [];
  for (let round = 0; round < 3; round++) {
    let best = -1;
    for (let i = 0; i < scored.length; i++) {
      if (used[i] === false && (best === -1 || scored[i].score > scored[best].score)) {
        best = i;
      }
    }
    if (best !== -1) {
      used[best] = true;
      top3.push(scored[best]);
    }
  }
  return top3;
}

// 추천 카드 1장
function makeCard(row, number) {
  const item = row.item;
  let link = CATEGORY_PAGE[item.category];
  let target = '';
  if (item.sourceUrl !== '') {
    link = item.sourceUrl;
    // 수업 외: rel="noopener noreferrer"는 새 창으로 열 때 원래 페이지를 보호하는 링크 속성
    target = ' target="_blank" rel="noopener noreferrer"';
  }
  return `
        <article class="pick">
      <span class="rank">${number}</span>
      <div class="poster ss-card-image"><img src="${item.image}" alt="${item.title} 포스터"></div>
      <div class="info">
        <h3><a href="${link}"${target}><span class="genre">${CATEGORY_NAME[item.category]}</span>${item.title}</a></h3>
        <p class="period">${SceneSeoul.formatPeriod(item)}</p>
        <p class="meta">${item.location}</p>
      </div>
      <label class="ss-heart-toggle"><input class="heart-check" type="checkbox" data-save-id="${item.id}" aria-label="${item.title} 관심 목록에 담기"><span aria-hidden="true"></span></label>
    </article>`;
}

// 칩을 하나라도 골랐으면 true
function hasChecked() {
  for (let i = 0; i < chips.length; i++) {
    if (chips[i].checked) {
      return true;
    }
  }
  return false;
}

// 추천 결과 그리기
function showResult() {
  const conds = getConditions();
  const top3 = pickTop3(conds);

  // 카드를 하나씩 만들어 이어 붙이고, id는 따로 기억해 둔다
  let cards = '';
  shownIds = [];
  for (let i = 0; i < top3.length; i++) {
    shownIds.push(top3[i].item.id);
    cards += makeCard(top3[i], i + 1);
  }

  // 누구와를 여러 개 골랐으면 '혼자·연인과'처럼 이어 붙임
  let whoText = '누구와든';
  if (conds.who.length > 0) {
    whoText = '';
    for (let i = 0; i < conds.who.length; i++) {
      if (i > 0) {
        whoText += '·';
      }
      whoText += WHO_TITLE[conds.who[i]];
    }
  }

  resultBox.innerHTML = `
    <div class="result-head">
      <h2>${whoText} 가기 좋은 곳 3건</h2>
    </div>
    <div class="picks">${cards}</div>`;

  SceneSeoul.updateHearts();
  addHeartEvents();
}

// '결과 보기'를 누르면 잠깐 생각하는 척 한 뒤 결과가 바뀐다
sendBtn.addEventListener('click', () => {
  // 아무 칩도 안 골랐으면 결과 대신 안내 문구를 보여준다
  if (hasChecked() === false) {
    shownIds = [];
    resultBox.innerHTML = '<p class="think">조건을 하나 이상 선택해 주세요.</p>';
    return;
  }
  resultBox.innerHTML = '<p class="think">추천을 고르는 중이에요...</p>';
  // 수업 외: location.href에 '#id'를 넣으면 그 id 위치로 화면이 이동한다
  location.href = '#result';
  setTimeout(showResult, 800);
});

// 시간대, 실내외에서 '상관없음'을 고르면 다른 칩이 풀리고, 다른 칩을 고르면 '상관없음'이 풀린다
function addAnyEvent(input) {
  input.addEventListener('change', () => {
    if (input.name === 'budget' || !input.checked) {
      return;
    }
    for (let i = 0; i < chips.length; i++) {
      const other = chips[i];
      if (other.name === input.name && other !== input) {
        if (input.value === 'any' || other.value === 'any') {
          other.checked = false;
        }
      }
    }
  });
}

for (let i = 0; i < chips.length; i++) {
  addAnyEvent(chips[i]);
}

// 하트: 누르면 찜을 바꾼다 (로그인 확인과 안내 문구는 공통 JS의 toggleSaved가 처리한다)
function addHeartEvent(heart, id) {
  heart.addEventListener('change', () => {
    SceneSeoul.toggleSaved(id);
  });
}

function addHeartEvents() {
  const hearts = resultBox.querySelectorAll('.heart-check');
  for (let i = 0; i < hearts.length; i++) {
    addHeartEvent(hearts[i], shownIds[i]);
  }
}
