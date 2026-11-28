// SCENE:SEOUL 공통 JS (팀 04 서울을 4로잡다)
// 모든 페이지가 같이 쓰는 함수 모음입니다. 각 HTML에서 페이지 JS보다 먼저 불러와야 합니다.
//
// 약속한 규칙
//   - JSON 공통 필드: id, category, title, startDate, endDate, location, image
//   - 링크: sourceUrl(출처)은 모든 JSON에 있고, officialUrl(공식 페이지)은 전시·이벤트·팝업에만 있다. officialUrl이 있으면 그것을 먼저 쓴다
//   - 그 밖의 필드는 페이지마다 다를 수 있으니 각 페이지 JSON을 확인한다.
//   - id: exhibition-001, performance-001, real-popup-001, event-001, recommand-001
//   - 날짜: YYYY-MM-DD (기간이 없는 상시 운영은 endDate를 빈 문자열 "" 로)
//   - 찜 저장 키: sceneSeoulSavedEvents:사용자ID (로그인 전에는 guest), 값은 콘텐츠 id 배열
//   - 로그인 상태 키: sceneSeoulUser (닉네임 문자열)
//   - 이미지 경로: ../images/파일명
//   - 찜 하트: <input type="checkbox" data-save-id="콘텐츠id"> 로 만들면 updateHearts()가 상태를 맞춰 줍니다
//
// window.SceneSeoul 하나에 함수들을 붙이는 방식입니다. 다른 파일에서도 같은 객체에 함수를 더 붙일 수 있습니다.


// ---------- 기본 설정값 ----------

window.SceneSeoul = window.SceneSeoul || {};

SceneSeoul.SAVED_PREFIX = 'sceneSeoulSavedEvents:';
SceneSeoul.USER_KEY = 'sceneSeoulUser';
SceneSeoul.GUEST_ID = 'guest';


// ---------- 로그인 상태 ----------
// 로그인 담당자가 getUser / login / logout 을 따로 만들었으면 그것을 씁니다.
// (아직 없을 때만 아래 기본 버전을 붙입니다)

if (SceneSeoul.getUser === undefined) {

  // 로그인한 닉네임 (로그인 전이면 빈 문자열)
  SceneSeoul.getUser = function () {
    return localStorage.getItem(SceneSeoul.USER_KEY) || '';
  };

  // 닉네임 저장. 비어 있으면 저장하지 않고 false를 돌려준다
  SceneSeoul.login = function (nickname) {
    // 수업 외: trim()은 글자 앞뒤의 빈칸을 지운다
    const name = nickname.trim();
    if (name === '') {
      return false;
    }
    localStorage.setItem(SceneSeoul.USER_KEY, name);
    return true;
  };

  SceneSeoul.logout = function () {
    localStorage.removeItem(SceneSeoul.USER_KEY);
  };
}


// ---------- 찜 ----------

// 저장 키에 붙일 사용자 ID (로그인 전에는 guest)
SceneSeoul.getUserId = function () {
  return SceneSeoul.getUser() || SceneSeoul.GUEST_ID;
};

SceneSeoul.getSavedKey = function () {
  return SceneSeoul.SAVED_PREFIX + SceneSeoul.getUserId();
};

// 찜한 콘텐츠 id 배열
// 로그인 전(guest)에는 찜을 저장하지 않으므로 항상 빈 배열
SceneSeoul.getSaved = function () {
  if (SceneSeoul.getUser() === '') {
    return [];
  }
  return JSON.parse(localStorage.getItem(SceneSeoul.getSavedKey())) || [];
};

// 배열(list) 안에 값(value)이 있으면 true
SceneSeoul.hasValue = function (list, value) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === value) {
      return true;
    }
  }
  return false;
};

SceneSeoul.isSaved = function (id) {
  return SceneSeoul.hasValue(SceneSeoul.getSaved(), id);
};

// 찜이 아니면 넣고, 찜이면 뺀다. 바꾼 뒤에 찜 상태이면 true를 돌려준다
SceneSeoul.toggleSaved = function (id) {
  // 로그인 전에는 찜할 수 없다. 안내만 하고 하트를 원래대로 돌린다
  if (SceneSeoul.getUser() === '') {
    alert('로그인 후에 찜할 수 있어요.');
    SceneSeoul.updateHearts();
    return false;
  }

  const saved = SceneSeoul.getSaved();
  let nowSaved;
  if (SceneSeoul.hasValue(saved, id)) {
    // 이미 찜한 것이면: id가 다른 것만 새 배열에 담아서 뺀다
    const rest = [];
    for (let i = 0; i < saved.length; i++) {
      if (saved[i] !== id) {
        rest.push(saved[i]);
      }
    }
    localStorage.setItem(SceneSeoul.getSavedKey(), JSON.stringify(rest));
    nowSaved = false;
  } else {
    saved.push(id);
    localStorage.setItem(SceneSeoul.getSavedKey(), JSON.stringify(saved));
    nowSaved = true;
  }
  SceneSeoul.updateHearts();
  return nowSaved;
};

// 화면에 있는 하트(data-save-id 가 붙은 체크박스)를 찜 상태에 맞게 체크/해제
SceneSeoul.updateHearts = function () {
  const saved = SceneSeoul.getSaved();
  const hearts = document.querySelectorAll('input[data-save-id]');
  for (let i = 0; i < hearts.length; i++) {
    const id = hearts[i].getAttribute('data-save-id');
    hearts[i].checked = SceneSeoul.hasValue(saved, id);
  }
};


// ---------- 화면에 보여줄 글자 ----------

// 기간 글자: 2026.10.01 ~ 12.20 / 2026.10.24 / 상시 운영
SceneSeoul.formatPeriod = function (item) {
  if (!item.startDate) {
    return '';
  }
  if (!item.endDate) {
    return '상시 운영';
  }
  // 수업 외: split('-')는 글자를 '-' 기준으로 잘라 배열로 만든다 ('2026-10-01' → ['2026','10','01'])
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
};


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
