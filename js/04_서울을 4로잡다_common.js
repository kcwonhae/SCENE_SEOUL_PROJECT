// SCENE:SEOUL 공통 JS (팀 04 서울을 4로잡다)
// 모든 페이지가 같이 쓰는 함수 모음입니다. 각 HTML에서 페이지 JS보다 먼저 불러와야 합니다.
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
//   - 찜 하트: <input type="checkbox" data-save-id="콘텐츠id"> 로 만들면 updateHearts()가 상태를 맞춰 줍니다
//
// window.SceneSeoul 하나에 함수들을 붙이는 방식입니다. 다른 파일에서도 같은 객체에 함수를 더 붙일 수 있습니다.


// ---------- 기본 설정값 ----------

window.SceneSeoul = Object.assign(window.SceneSeoul || {}, {

  SAVED_PREFIX: 'sceneSeoulSavedEvents:',
  USER_KEY: 'sceneSeoulUser',
  GUEST_ID: 'guest'
});


// ---------- 로그인 상태 ----------
// 로그인 담당자가 getUser / login / logout 을 따로 만들었으면 그것을 씁니다.
// (아직 없을 때만 아래 기본 버전을 붙입니다)

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
  // 로그인 전(guest)에는 찜을 저장하지 않으므로 항상 빈 배열
  getSaved() {
    if (SceneSeoul.getUser() === '') {
      return [];
    }
    return JSON.parse(localStorage.getItem(SceneSeoul.getSavedKey())) || [];
  },

  isSaved(id) {
    return SceneSeoul.getSaved().includes(id);
  },

  // 찜이 아니면 넣고, 찜이면 뺀다. 바꾼 뒤에 찜 상태이면 true를 돌려준다
  toggleSaved(id) {
    // 로그인 전에는 찜할 수 없다. 안내만 하고 하트를 원래대로 돌린다
    if (SceneSeoul.getUser() === '') {
      alert('로그인 후에 찜할 수 있어요.');
      SceneSeoul.updateHearts();
      return false;
    }
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
    return nowSaved;
  },

  // 화면에 있는 하트(data-save-id 가 붙은 체크박스)를 찜 상태에 맞게 체크/해제
  updateHearts() {
    const saved = SceneSeoul.getSaved();
    document.querySelectorAll('input[data-save-id]').forEach(input => {
      input.checked = saved.includes(input.dataset.saveId);
    });
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
  }
});


// ---------- 이벤트: 찜 상태가 바뀔 수 있는 때 하트를 다시 맞춘다 ----------

// 페이지가 처음 열렸을 때
document.addEventListener('DOMContentLoaded', SceneSeoul.updateHearts);

// 뒤로가기로 돌아왔을 때 (저장된 화면이 그대로 보이는 경우가 있어서)
window.addEventListener('pageshow', SceneSeoul.updateHearts);

// 다른 탭에서 찜을 바꿨을 때
window.addEventListener('storage', SceneSeoul.updateHearts);

// 로그인 담당자가 로그인할 때 'scene:login' 이벤트를 보내면 사용자가 바뀐 것이니 하트를 다시 맞춘다
window.addEventListener('scene:login', SceneSeoul.updateHearts);

// 찜이 바뀌었다는 'scene:saved' 이벤트가 오면 하트를 다시 맞춘다 (공연·추천 페이지가 각자 쓰던 것을 여기로 모음)
window.addEventListener('scene:saved', SceneSeoul.updateHearts);
