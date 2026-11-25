// 추천 페이지: '결과 보기'를 누르면 고른 조건 7개를 JSON 데이터와 비교해서 점수가 높은 3건을 보여준다.
// 팀 04 서울을 4로잡다 / 신윤정(2411997)
// * 공통 JS(04_서울을 4로잡다_common.js)를 이 파일보다 먼저 불러와야 한다 (기간 글자에 사용)

const COND_KEY = 'ss-rec-conditions-v2';  // 마지막으로 고른 조건 (칩을 여러 개 고를 수 있어서 v2)

// 장르 코드 → 화면에 보여줄 이름
const GENRE_NAME = { ex: '전시', live: '공연', pop: '팝업', space: '공간' };

// 장르 → 상세 보기로 이동할 페이지 (JSON의 sourceUrl이 비어 있을 때 사용)
const GENRE_PAGE = {
  ex: '../exhibition/04_서울을 4로잡다_exhibition.html',
  live: '../performance/04_서울을 4로잡다_performance.html',
  pop: '../popup/04_서울을 4로잡다_popup.html',
  space: '../map/04_서울을 4로잡다_map.html'
};

// 결과 제목 / 안내 문장 (누구와 기준)
const WHO_TITLE = { solo: '혼자', couple: '연인과', friends: '친구와', family: '가족과' };
const WHO_DESC = {
  solo: '조용히 머물다 올 수 있는 곳 위주로 골랐어요.',
  couple: '다녀와서 이야기 나누기 좋은 곳 위주로 골랐어요.',
  friends: '여럿이 함께 즐길 수 있는 곳 위주로 골랐어요.',
  family: '아이도 어른도 편하게 즐길 수 있는 곳 위주로 골랐어요.'
};

// 예산 코드 → 가격 상한 (0이면 무료만)
const BUDGET_LIMIT = { free: 0, 30: 30000, 50: 50000 };

let allItems = [];

const chips = document.querySelectorAll('.chip input');
const sendBtn = document.getElementById('send-btn');
const resultBox = document.getElementById('result-box');

// 새로고침해도 칩이 그대로 있도록, 저장해 둔 조건을 먼저 칩에 되돌려 놓음 (JSON 불러오기와 상관없음)
restoreConditions();

// JSON 불러오기
fetch('../data/04_서울을 4로잡다_recommend.json')
  .then(response => response.json())
  .then(data => {
    allItems = data.recommendations;
  })
  .catch(error => {
    resultBox.innerHTML = '<p class="ss-empty">추천 데이터를 불러오지 못했어요. Live Server로 열었는지 확인해 주세요.</p>';
    console.log(error);
  });

// 지금 선택된 조건을 객체로 모으기 (예산만 하나, 나머지는 여러 개를 배열로)
function getConditions() {
  const conds = { who: [], weather: [], time: [], place: [], mood: [], genre: [], budget: 'free' };
  chips.forEach(input => {
    if (!input.checked) {
      return;
    }
    if (input.name === 'budget') {
      conds.budget = input.value;
    } else {
      conds[input.name].push(input.value);
    }
  });
  return conds;
}

// 저장해 둔 조건이 있으면 칩에 다시 체크
function restoreConditions() {
  const saved = JSON.parse(localStorage.getItem(COND_KEY));
  if (!saved) {
    return;
  }
  chips.forEach(input => {
    if (input.name === 'budget') {
      input.checked = (saved.budget === input.value);
    } else {
      input.checked = saved[input.name].includes(input.value);
    }
  });
}

// 고른 값(selected) 중 하나라도 항목의 값(values)에 있으면 true
// 아무것도 안 골랐거나 '상관없음(any)'이면 조건이 없는 것이라 항상 true
function isMatch(selected, values) {
  if (selected.length === 0 || selected.includes('any')) {
    return true;
  }
  return selected.some(value => values.includes(value));
}

// 항목 하나가 조건과 몇 개 맞는지 세기 (최대 7점)
function getScore(item, conds) {
  let score = 0;
  if (isMatch(conds.who, item.who)) score++;
  if (isMatch(conds.weather, item.weather)) score++;
  if (isMatch(conds.time, item.time)) score++;
  const placeValues = item.place === 'both' ? ['in', 'out'] : [item.place];
  if (isMatch(conds.place, placeValues)) score++;
  if (isMatch(conds.mood, item.mood)) score++;
  if (isMatch(conds.genre, [item.genre])) score++;
  if (conds.budget === 'any' || item.price <= BUDGET_LIMIT[conds.budget]) score++;
  return score;
}

// 예산 안에 드는 것만 남기고, 점수가 높은 순으로 3건 고르기
function pickTop3(conds) {
  const scored = [];
  for (let i = 0; i < allItems.length; i++) {
    // 예산보다 비싼 것은 처음부터 빼 둔다
    if (conds.budget !== 'any' && allItems[i].price > BUDGET_LIMIT[conds.budget]) {
      continue;
    }
    scored.push({ item: allItems[i], score: getScore(allItems[i], conds) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

function priceText(price) {
  if (price === 0) {
    return '무료';
  }
  return price.toLocaleString() + '원';
}

// 추천 카드 1장
function makeCard(row, number) {
  const item = row.item;
  const percent = Math.round(row.score / 7 * 100);
  const hasUrl = item.sourceUrl !== '';
  const link = hasUrl ? item.sourceUrl : GENRE_PAGE[item.genre];
  const target = hasUrl ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `
    <article class="pick">
      <span class="rank">${number}</span>
      <div class="poster"><img src="${item.image}" alt="${item.title} 포스터"></div>
      <div class="info">
        <h3><a href="${link}"${target}><span class="genre">${GENRE_NAME[item.genre]}</span>${item.title}</a></h3>
        <p class="period">${SceneSeoul.formatPeriod(item)}</p>
        <p class="meta">${item.location} · ${priceText(item.price)}</p>
        <p class="reason"><b>추천 이유</b>${item.reason}</p>
        <div class="match"><span>일치율 ${percent}%</span><span class="bar"><i data-percent="${percent}"></i></span></div>
      </div>
      <label class="pick-save">
        <input class="heart-check" type="checkbox" data-save-id="${item.id}" aria-label="${item.title} 관심 목록에 담기">
        <span aria-hidden="true"></span>
      </label>
    </article>`;
}

// 추천 결과 그리기
function showResult() {
  const conds = getConditions();
  const top3 = pickTop3(conds);

  let cards = top3.map((row, index) => makeCard(row, index + 1)).join('');

  // 누구와를 여러 개 골랐으면 '혼자·연인과'처럼 이어 붙임
  const whoText = conds.who.length === 0 ? '누구와든' : conds.who.map(w => WHO_TITLE[w]).join('·');
  const whoDesc = conds.who.length === 1 ? WHO_DESC[conds.who[0]] : '고른 조건에 가장 잘 맞는 곳 위주로 골랐어요.';

  resultBox.innerHTML = `
    <div class="result-head">
      <h2>${whoText} 가기 좋은 곳 3건</h2>
      <p>${whoDesc}</p>
    </div>
    <div class="picks">${cards}</div>`;

  fillBars();
  SceneSeoul.updateHearts();
  addHeartEvents();
}

// 일치율 막대: 처음엔 0이었다가 잠깐 뒤에 채워져서 transition으로 차오른다
function fillBars() {
  setTimeout(() => {
    document.querySelectorAll('.bar i').forEach(bar => {
      bar.style.width = bar.dataset.percent + '%';
    });
  }, 50);
}

// '결과 보기'를 누르면 잠깐 생각하는 척 한 뒤 결과가 바뀐다
sendBtn.addEventListener('click', () => {
  localStorage.setItem(COND_KEY, JSON.stringify(getConditions()));
  resultBox.innerHTML = '<p class="think">추천을 고르는 중이에요...</p>';
  location.href = '#result';
  setTimeout(showResult, 800);
});

// 시간대, 실내외에서 '상관없음'을 고르면 다른 칩이 풀리고, 다른 칩을 고르면 '상관없음'이 풀린다
chips.forEach(input => {
  input.addEventListener('change', () => {
    if (input.name === 'budget' || !input.checked) {
      return;
    }
    chips.forEach(other => {
      if (other.name !== input.name || other === input) {
        return;
      }
      if (input.value === 'any' || other.value === 'any') {
        other.checked = false;
      }
    });
  });
});

// 칩을 누를 때마다 조건을 저장 (결과 보기를 안 눌러도 새로고침 후에 유지됨)
// 위의 '상관없음' 처리보다 나중에 등록해서, 정리된 선택 상태가 저장됨
chips.forEach(input => {
  input.addEventListener('change', () => {
    localStorage.setItem(COND_KEY, JSON.stringify(getConditions()));
  });
});

// 로그인 전 저장 막기 포함
function addHeartEvents() {
  const hearts = resultBox.querySelectorAll('.heart-check');
  for (let i = 0; i < hearts.length; i++) {
    hearts[i].addEventListener('change', (event) => {
      if (!SceneSeoul.getUser()) {
        alert('로그인 후 저장할 수 있어요.');
        event.target.checked = false;
        return;
      }
      SceneSeoul.toggleSaved(event.target.getAttribute('data-save-id'));
    });
  }
}

window.addEventListener('scene:saved', SceneSeoul.updateHearts);
