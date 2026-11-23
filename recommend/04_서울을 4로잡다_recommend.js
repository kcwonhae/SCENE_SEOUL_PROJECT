// 추천 페이지: '결과 보기'를 누르면 고른 조건 7개를 JSON 데이터와 비교해서 점수가 높은 3건을 보여준다.
// 팀 04 서울을 4로잡다 / 신윤정(2411997)

const COND_KEY = 'ss-rec-conditions';  // 마지막으로 고른 조건

// 장르 코드 → 화면에 보여줄 이름
const GENRE_NAME = { ex: '전시', live: '공연', pop: '팝업', space: '공간' };

// 장르 → 상세 보기로 이동할 페이지 (JSON의 link가 비어 있을 때 사용)
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

// JSON 불러오기
fetch('04_서울을 4로잡다_recommend.json')
  .then(response => response.json())
  .then(data => {
    allItems = data.recommendations;
    restoreConditions();
  })
  .catch(error => {
    resultBox.innerHTML = '<p class="ss-empty">추천 데이터를 불러오지 못했어요. Live Server로 열었는지 확인해 주세요.</p>';
    console.log(error);
  });

// 지금 선택된 조건을 객체로 모으기
function getConditions() {
  const conds = {};
  chips.forEach(input => {
    if (input.checked) {
      conds[input.name] = input.value;
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
    if (saved[input.name] !== undefined) {
      input.checked = (saved[input.name] === input.value);
    }
  });
}

// 항목 하나가 조건과 몇 개 맞는지 세기 (최대 7점)
function getScore(item, conds) {
  let score = 0;
  if (item.who.includes(conds.who)) score++;
  if (item.weather.includes(conds.weather)) score++;
  if (conds.time === 'any' || item.time.includes(conds.time)) score++;
  if (conds.place === 'any' || item.place === 'both' || item.place === conds.place) score++;
  if (item.mood.includes(conds.mood)) score++;
  if (item.genre === conds.genre) score++;
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
  const link = item.link || GENRE_PAGE[item.genre];
  return `
    <article class="pick">
      <span class="rank">${number}</span>
      <div class="poster"><img src="${item.image}" alt="${item.title} 포스터"></div>
      <div class="info">
        <h3><a href="${link}"><span class="genre">${GENRE_NAME[item.genre]}</span>${item.title}</a></h3>
        <p class="period">${item.period}</p>
        <p class="meta">${item.venue} · ${priceText(item.price)}</p>
        <p class="reason"><b>추천 이유</b>${item.reason}</p>
        <div class="match"><span>일치율 ${percent}%</span><span class="bar"><i data-percent="${percent}"></i></span></div>
        <div class="actions"><a href="../map/04_서울을 4로잡다_map.html">지도에서 보기</a></div>
      </div>
    </article>`;
}

// 추천 결과 그리기
function showResult() {
  const conds = getConditions();
  const top3 = pickTop3(conds);

  let cards = top3.map((row, index) => makeCard(row, index + 1)).join('');

  resultBox.innerHTML = `
    <div class="result-head">
      <h2>${WHO_TITLE[conds.who]} 가기 좋은 곳 3건</h2>
      <p>${WHO_DESC[conds.who]}</p>
    </div>
    <div class="picks">${cards}</div>`;

  fillBars();
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
