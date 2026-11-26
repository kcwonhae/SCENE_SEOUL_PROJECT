/* SCENE:SEOUL | 로그인 / 로그아웃 (전체 페이지 공통) */
// common.js 를 먼저 불러오지 않았을 때 바로 알 수 있게 안내 //
if (!window.SceneSeoul || typeof SceneSeoul.getUser !== 'function') {
    console.error('common.js 를 login.js 보다 먼저 불러와 주세요.');
}

const loginBtn = document.querySelector('.header-login');

/* ================================================================
   01 / 로그인 창(모달) 만들기
   ================================================================ */
const ssOverlay = document.createElement('div');
ssOverlay.className = 'ss-login-overlay';
ssOverlay.innerHTML = `
    <div class="ss-login-dialog">
        <button class="ss-login-close" id="ssLoginClose" type="button">×</button>

        <div class="ss-login-body">
            <h2>SCENE:SEOUL에 로그인</h2>
            <p class="ss-login-desc">로그인 후 관심 문화를 마이캘린더에서 확인해보세요.</p>

            <form id="ssLoginForm">
                <label class="ss-login-label" for="ssLoginId">아이디(닉네임)</label>
                <input class="ss-login-input" id="ssLoginId" type="text"
                       placeholder="영문·숫자 2~15자" autocomplete="off"
                       required pattern="[A-Za-z0-9]{2,15}"
                       title="영문, 숫자만 사용해 2~15자로 입력해 주세요."/>

                <label class="ss-login-remember">
                    <input id="ssLoginRemember" type="checkbox"/>
                    <span>아이디 저장</span>
                </label>

                <button class="ss-login-submit" type="submit">
                    <span>로그인</span>
                </button>
            </form>
        </div>
    </div>
`;
document.body.appendChild(ssOverlay);

const ssForm = document.getElementById('ssLoginForm');
const ssIdInput = document.getElementById('ssLoginId');
const ssRememberInput = document.getElementById('ssLoginRemember');

/* ================================================================
   02 / 창 열기 · 닫기
   ================================================================ */
function openLoginModal() {
    // 저장해 둔 아이디가 있으면 자동으로 채워 줌
    const savedName = localStorage.getItem('savedUsername');
    ssIdInput.value = savedName || '';
    ssRememberInput.checked = savedName !== null;

    ssOverlay.className = 'ss-login-overlay is-open';   // is-open 이 붙으면 CSS 에서 창이 보임
    document.body.style.overflow = 'hidden'; // 창이 열린 동안 뒤 화면 스크롤 방지
}

function closeLoginModal() {
    ssOverlay.className = 'ss-login-overlay';           // is-open 을 떼면 다시 숨김
    document.body.style.overflow = '';
}

// 로그인 성공 후: 창을 천천히 흐리게 한 뒤(0.5초) 닫기
// is-closing 이 붙으면 CSS 의 transition 으로 opacity 가 1 → 0 으로 바뀌고,
// 다 흐려진 뒤에 setTimeout 으로 closeLoginModal() 을 실행해서 완전히 숨긴다
function fadeOutLoginModal() {
    ssOverlay.className = 'ss-login-overlay is-closing';
    setTimeout(closeLoginModal, 500);
}

// 창이 열려 있는지 확인
function isLoginModalOpen() {
    return ssOverlay.className === 'ss-login-overlay is-open';
}

/* ================================================================
   03 / 로그인 · 로그아웃  (저장은 common.js 의 SceneSeoul 이 담당)
   ================================================================ */
// 현재 로그인 상태에 맞게 헤더 버튼 문구 변경 (로그인 후에는 'LOGOUT'만 표시)
function updateLoginUI() {
    loginBtn.innerText = SceneSeoul.getUser() ? 'LOGOUT' : 'LOGIN';
}

function logout() {
    // 로그아웃 후에는 닉네임이 지워지므로, 먼저 변수에 담아 둠
    const username = SceneSeoul.getUser();

    const answer = confirm(username + '님 로그아웃 하시겠습니까?'); // 취소 / 확인 버튼
    if (!answer) return;

    SceneSeoul.logout();
    alert(username + '님 로그아웃 되셨습니다.');
    updateLoginUI();
    window.dispatchEvent(new Event('scene:login')); // 사용자가 guest 로 바뀌었으니 하트 다시 맞춤 (※ 수업 외: common.js 와 약속한 직접 만든 이벤트)
}

/* ================================================================
   04 / 이벤트 등록
   ================================================================ */
// 헤더 버튼: 로그인 상태면 로그아웃, 아니면 로그인 창 열기
loginBtn.addEventListener('click', () => {
    if (SceneSeoul.getUser()) {
        logout();
    } else {
        openLoginModal();
    }
});

// 로그인 제출 (빈 값·형식 오류는 브라우저가 먼저 안내 말풍선으로 막아 줌)
ssForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const nickname = ssIdInput.value;

    // 닉네임 저장 (common.js). 빈 값이면 false 를 돌려주므로 여기서 중단
    if (!SceneSeoul.login(nickname)) return;

    // '아이디 저장' 체크 여부에 따라 다음 로그인 때 자동 입력
    if (ssRememberInput.checked) {
        localStorage.setItem('savedUsername', nickname);
    } else {
        localStorage.removeItem('savedUsername');
    }

    updateLoginUI();
    window.dispatchEvent(new Event('scene:login')); // 내 찜 목록으로 하트 다시 맞춤 (※ 수업 외: common.js 와 약속한 직접 만든 이벤트)

    fadeOutLoginModal();                            // 천천히 흐려지면서 닫기
});

// 닫기 방법 3가지: × 버튼 / 바깥 어두운 영역 클릭 / ESC 키
document.getElementById('ssLoginClose').addEventListener('click', closeLoginModal);

ssOverlay.addEventListener('click', (event) => {
    if (event.target === ssOverlay) closeLoginModal();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isLoginModalOpen()) {
        closeLoginModal();
    }
});

// 다른 탭에서 로그인/로그아웃했거나, 뒤로가기로 돌아왔을 때도 버튼 문구를 맞춤
// ※ 수업 외: storage(다른 탭에서 저장소 변경) / pageshow(뒤로가기로 돌아옴) 이벤트
window.addEventListener('storage', updateLoginUI);
window.addEventListener('pageshow', updateLoginUI);

// 페이지가 열릴 때 저장된 로그인 상태를 반영 (페이지를 이동해도 유지됨)
updateLoginUI();
