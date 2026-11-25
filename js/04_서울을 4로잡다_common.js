// SCENE:SEOUL 공통 JS (팀 04 서울을 4로잡다)
// 모든 페이지가 같이 쓰는 함수 모음입니다. 각 HTML에서 페이지 JS보다 먼저 불러와야함
//   <script src="../js/04_서울을 4로잡다_common.js"></script>
//   <script src="04_서울을 4로잡다_공연.js"></script>
//
// 약속한 규칙
//   - JSON 공통 필드: id, category, title, startDate, endDate, location, image, description, sourceUrl
//   - id: exhibition-001, performance-001, popup-001, event-001
//   - 날짜: YYYY-MM-DD (기간이 없는 상시 운영은 endDate를 빈 문자열 "" 로)
//   - 찜 저장 키: sceneSeoulSavedEvents:사용자ID (로그인 전에는 guest), 값은 콘텐츠 id 배열
//   - 로그인 상태 키: sceneSeoulUser (닉네임 문자열)
//   - 이미지 경로: ../images/파일명
//   - 찜 하트: <input type="checkbox" data-save-id="콘텐츠id"> 로 만들면 updateHearts()가 상태를 맞추기

// ---------- 기본 설정값 ----------

window.SceneSeoul = Object.assign(window.SceneSeoul || {}, {

  SAVED_PREFIX: 'sceneSeoulSavedEvents:',
  USER_KEY: 'sceneSeoulUser',
  GUEST_ID: 'guest',

  // 4개 JSON 파일 위치 (모든 페이지 폴더가 같은 위치에 있어서 ../ 로 시작하기)
  DATA_FILES: [
    '../exhibition/04_서울을 4로잡다_exhibition.json',
    '../performance/04_서울을 4로잡다_performance.json',
    '../popup/04_서울을 4로잡다_popup.json',
    '../data/04_서울을 4로잡다_event.json'
  ],

  // category 값 → 화면에 보여줄 이름
  CATEGORY_NAME: {
    exhibition: '전시',
    performance: '공연',
    popup: '팝업',
    event: '이벤트'
  },

  // category 값 → 그 종류의 목록 페이지
  CATEGORY_PAGE: {
    exhibition: '../exhibition/04_서울을 4로잡다_exhibition.html',
    performance: '../performance/04_서울을 4로잡다_performance.html',
    popup: '../popup/04_서울을 4로잡다_popup.html',
    event: '../event/04_서울을 4로잡다_event.html'
  }
});


// ---------- 로그인 상태 ----------
// 로그인 담당자가 getUser / login / logout 을 따로 만들었으면 그것을 씁니다.
// (아직 없을 때만 아래 기본 버전 사용. 수정 예정)

if (typeof window.SceneSeoul.getUser !== 'function') {
  Object.assign(window.SceneSeoul, {

    // 로그인한 닉네임 (로그인 전이면 빈 문자열)
    getUser() {
      return localStorage.getItem(SceneSeoul.USER_KEY) || '';
    },

    // 닉네임 저장. 비어 있으면 저장하지 않고 false를 돌려준다
    login(nickname) {
      const name = nickname.trim();
      if (name === '') {
        return false;
      }
      localStorage.setItem(SceneSeoul.USER_KEY, name);
      return true;
    },

    logout() {
      localStorage.removeItem(SceneSeoul.USER_KEY);
    }
  });
}


// ---------- 찜 ----------

Object.assign(window.SceneSeoul, {

  // 저장 키에 붙일 사용자 ID (로그인 전에는 guest)
  getUserId() {
    return SceneSeoul.getUser() || SceneSeoul.GUEST_ID;
  },

  getSavedKey() {
    return SceneSeoul.SAVED_PREFIX + SceneSeoul.getUserId();
  },

  // 찜한 콘텐츠 id 배열
  getSaved() {
    return JSON.parse(localStorage.getItem(SceneSeoul.getSavedKey())) || [];
  },

  isSaved(id) {
    return SceneSeoul.getSaved().includes(id);
  },

  // 찜이 아니면 넣고, 찜이면 뺀다. 바꾼 뒤에 찜 상태이면 true를 돌려준다
  toggleSaved(id) {
    let saved = SceneSeoul.getSaved();
    let nowSaved;
    if (saved.includes(id)) {
      saved = saved.filter(savedId => savedId !== id);
      nowSaved = false;
    } else {
      saved.push(id);
      nowSaved = true;
    }
    localStorage.setItem(SceneSeoul.getSavedKey(), JSON.stringify(saved));
    SceneSeoul.updateHearts();
    window.dispatchEvent(new Event('scene:saved'));   // 찜이 바뀌었다고 알림 (팝업 JS가 듣고 있음)
    return nowSaved;
  },

  // 찜에서 빼기 (마이페이지의 삭제 버튼 등에서 사용)
  removeSaved(id) {
    const saved = SceneSeoul.getSaved().filter(savedId => savedId !== id);
    localStorage.setItem(SceneSeoul.getSavedKey(), JSON.stringify(saved));
    SceneSeoul.updateHearts();
  },

  // 화면에 있는 하트(data-save-id 가 붙은 체크박스)를 찜 상태에 맞게 체크/해제
  updateHearts() {
    const saved = SceneSeoul.getSaved();
    document.querySelectorAll('input[data-save-id]').forEach(input => {
      input.checked = saved.includes(input.dataset.saveId);
    });
  }
});


// ---------- 데이터 불러오기 ----------

Object.assign(window.SceneSeoul, {

  // 4개 JSON을 하나씩 순서대로 읽어서 하나의 배열로 합친 뒤 callback(배열)로 넘기기
  // 아직 만들어지지 않은 JSON이 있으면 건너뛰고 나머지만 합침
  loadAllItems(callback) {
    const files = SceneSeoul.DATA_FILES;
    const result = [];

    function loadNext(index) {
      if (index === files.length) {
        callback(result);
        return;
      }
      fetch(files[index])
        .then(response => response.json())
        .then(data => {
          // JSON이 배열이면 그대로, { "키": [ ... ] } 모양이면 그 안의 배열을 꺼냄
          let list = data;
          if (!Array.isArray(data)) {
            list = Object.values(data)[0];
          }
          list.forEach(item => result.push(item));
          loadNext(index + 1);
        })
        .catch(error => {
          console.log(files[index] + ' 을(를) 불러오지 못해서 건너뜁니다.', error);
          loadNext(index + 1);
        });
    }

    loadNext(0);
  },

  // 합친 배열에서 id로 하나 찾기 (없으면 undefined)
  findById(items, id) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        return items[i];
      }
    }
    return undefined;
  }
});


// ---------- 화면에 보여줄 글자 ----------

Object.assign(window.SceneSeoul, {

  // 기간 글자: 2026.10.01 ~ 12.20 / 2026.10.24 / 상시 운영
  formatPeriod(item) {
    if (!item.startDate) {
      return '';
    }
    if (!item.endDate) {
      return '상시 운영';
    }
    const start = item.startDate.split('-');
    const end = item.endDate.split('-');
    const startText = start[0] + '.' + start[1] + '.' + start[2];
    if (item.startDate === item.endDate) {
      return startText;
    }
    if (start[0] === end[0]) {
      return startText + ' ~ ' + end[1] + '.' + end[2];
    }
    return startText + ' ~ ' + end[0] + '.' + end[1] + '.' + end[2];
  },

  categoryName(category) {
    return SceneSeoul.CATEGORY_NAME[category] || '';
  }
});


// ---------- 이벤트: 찜 상태가 바뀔 수 있는 때 하트를 다시 맞춤 ----------

// 페이지가 처음 열렸을 때
document.addEventListener('DOMContentLoaded', SceneSeoul.updateHearts);

// 뒤로가기로 돌아왔을 때 (저장된 화면이 그대로 보이는 경우가 있어서)
window.addEventListener('pageshow', SceneSeoul.updateHearts);

// 다른 탭에서 찜을 바꿨을 때
window.addEventListener('storage', SceneSeoul.updateHearts);

// 로그인 담당자가 로그인할 때 'scene:login' 이벤트를 보내면 사용자가 바뀐 것이니 하트를 다시 맞춘다
window.addEventListener('scene:login', SceneSeoul.updateHearts);
