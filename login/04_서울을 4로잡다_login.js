/* SCENE:SEOUL | 로그인 / 로그아웃 (전체 페이지 공통)

   [적용 방법]
   1) CSS : 04_서울을 4로잡다_login.css 를 각 페이지 <head>에 연결하거나,
            내용을 공통 파일(common.css) 맨 아래에 붙여 넣기
            <link href="../css/04_서울을 4로잡다_login.css" rel="stylesheet"/>
   2) JS  : 각 페이지 </body> 바로 위에 아래 순서대로 추가 (common.js 가 반드시 먼저!)
            <script src="../js/04_서울을 4로잡다_common.js"></script>
            <script src="../login/04_서울을 4로잡다_login.js"></script>
   → 로그인 창(모달) HTML은 이 스크립트가 직접 만들어 넣기 때문에 페이지마다 복사할 필요가 없습니다.

   [common.js 와 맞춘 규칙]
   - 로그인 상태는 common.js 의 SceneSeoul.getUser / login / logout 으로만 읽고 씁니다.
     (저장 키: sceneSeoulUser → 닉네임이 있으면 로그인 상태)
   - 로그인/로그아웃 직후 'scene:login' 이벤트를 보내서 찜 하트를 다시 맞춥니다.

   [사용 기술] querySelector / getElementById, createElement, appendChild, innerHTML,
               addEventListener, 이벤트 객체(key, target, preventDefault),
               setTimeout, confirm, alert, localStorage(setItem / getItem / removeItem)
*/

// common.js 를 먼저 불러오지 않았을 때 바로 알 수 있게 안내
if (!window.SceneSeoul || typeof SceneSeoul.getUser !== 'function') {
    console.error('common.js 를 login.js 보다 먼저 불러와 주세요.');
}

const loginBtn = document.querySelector('.header-login');

/* ================================================================
   01 / 로그인 창(모달) 만들기
   ================================================================ */
const ssOverlay = document.createElement('div');
ssOverlay.className = 'ss-login-overlay';
ssOverlay.setAttribute('aria-hidden', 'true');
ssOverlay.innerHTML = `
    <div class="ss-login-dialog" role="dialog" aria-modal="true" aria-labelledby="ssLoginTitle">
        <button class="ss-login-close" id="ssLoginClose" type="button" aria-label="로그인 창 닫기">×</button>

        <div class="ss-login-body">
            <span class="ss-login-eyebrow">SCENE:SEOUL / LOGIN</span>
            <h2 id="ssLoginTitle">SCENE:SEOUL에<br/>기록해 보세요.</h2>
            <p class="ss-login-desc">로그인 후 관심 문화를 마이캘린더에서 확인해보세요.</p>

            <form id="ssLoginForm">
                <label class="ss-login-label" for="ssLoginId">아이디(닉네임)</label>
                <input class="ss-login-input" id="ssLoginId" type="text"
                       placeholder="한글·영문·숫자 2~15자" autocomplete="off"
                       required minlength="2" maxlength="15" pattern="[A-Za-z0-9가-힣\\u4E00-\\u9FFF]{2,15}"
                       title="한글, 한자, 영문, 숫자만 사용해 2~15자로 입력해 주세요."/>

                <label class="ss-login-remember">
                    <input id="ssLoginRemember" type="checkbox"/>
                    <span>아이디 저장</span>
                </label>

                <button class="ss-login-submit" type="submit">
                    <span>로그인</span>
                </button>
            </form>
        </div>

        <div class="ss-login-done" role="status" aria-live="polite">
            <span class="ss-login-check" aria-hidden="true">✓</span>
            <h2 id="ssLoginDoneText"></h2>
            <p>잠시 후 창이 자동으로 닫힙니다.</p>
            <button class="ss-login-submit" id="ssLoginDoneBtn" type="button">
                <span>확인</span>
            </button>
        </div>
    </div>
`;
document.body.appendChild(ssOverlay);

const ssDialog = ssOverlay.querySelector('.ss-login-dialog');
const ssForm = document.getElementById('ssLoginForm');
const ssIdInput = document.getElementById('ssLoginId');
const ssRememberInput = document.getElementById('ssLoginRemember');
const ssDoneText = document.getElementById('ssLoginDoneText');
let ssCloseTimer = null;

/* ================================================================
   02 / 창 열기 · 닫기
   ================================================================ */
function openLoginModal() {
    // 저장해 둔 아이디가 있으면 자동으로 채워 줌
    const savedName = localStorage.getItem('savedUsername');
    ssIdInput.value = savedName || '';
    ssRememberInput.checked = savedName !== null;

    ssDialog.classList.remove('is-done');
    ssOverlay.classList.add('is-open');
    ssOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // 창이 열린 동안 뒤 화면 스크롤 방지

    setTimeout(() => ssIdInput.focus(), 60); // 바로 입력할 수 있게 포커스
}

function closeLoginModal() {
    clearTimeout(ssCloseTimer);
    ssOverlay.classList.remove('is-open');
    ssOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    loginBtn.focus();
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
    window.dispatchEvent(new Event('scene:login')); // 사용자가 guest 로 바뀌었으니 하트 다시 맞춤
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

    const nickname = ssIdInput.value.trim();

    // 닉네임 저장 (common.js). 빈 값이면 false 를 돌려주므로 여기서 중단
    if (!SceneSeoul.login(nickname)) return;

    // '아이디 저장' 체크 여부에 따라 다음 로그인 때 자동 입력
    if (ssRememberInput.checked) {
        localStorage.setItem('savedUsername', nickname);
    } else {
        localStorage.removeItem('savedUsername');
    }

    ssDoneText.innerText = nickname + '님, 로그인 되셨습니다.';
    ssDialog.classList.add('is-done');
    updateLoginUI();
    window.dispatchEvent(new Event('scene:login')); // 내 찜 목록으로 하트 다시 맞춤

    ssCloseTimer = setTimeout(closeLoginModal, 1500);
});

// 닫기 방법 3가지: × 버튼 / 바깥 어두운 영역 클릭 / ESC 키
document.getElementById('ssLoginClose').addEventListener('click', closeLoginModal);
document.getElementById('ssLoginDoneBtn').addEventListener('click', closeLoginModal);

ssOverlay.addEventListener('click', (event) => {
    if (event.target === ssOverlay) closeLoginModal();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ssOverlay.classList.contains('is-open')) {
        closeLoginModal();
    }
});

// 다른 탭에서 로그인/로그아웃했거나, 뒤로가기로 돌아왔을 때도 버튼 문구를 맞춤
window.addEventListener('storage', updateLoginUI);
window.addEventListener('pageshow', updateLoginUI);

// 페이지가 열릴 때 저장된 로그인 상태를 반영 (페이지를 이동해도 유지됨)
updateLoginUI();
