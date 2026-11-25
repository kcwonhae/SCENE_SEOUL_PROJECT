/* SCENE:SEOUL | 로그인 / 로그아웃 (전체 페이지 공통)

   [적용 방법]
   1) CSS : 04_서울을 4로잡다_login.css 를 각 페이지 <head>에 연결하거나,
            내용을 공통 파일(common.css) 맨 아래에 붙여 넣기
            <link href="../css/04_서울을 4로잡다_login.css" rel="stylesheet"/>
   2) JS  : 각 페이지 </body> 바로 위에 한 줄 추가
            <script src="../js/04_서울을 4로잡다_login.js"></script>
   → 로그인 창(모달) HTML은 이 스크립트가 직접 만들어 넣기 때문에 페이지마다 복사할 필요가 없습니다.

   [사용 기술] querySelector / getElementById, createElement, appendChild, innerHTML,
               addEventListener, 이벤트 객체(key, target, preventDefault),
               setTimeout, confirm, localStorage(setItem / getItem / removeItem)
*/

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
            <h2 id="ssLoginTitle">나의 서울을<br/>기록해 보세요.</h2>
            <p class="ss-login-desc">로그인하면 관심 문화를 마이캘린더에서 확인할 수 있습니다.</p>
            <p class="ss-login-notice">수업 과제용 로그인 시연입니다. 실제 회원 인증 기능은 제공하지 않습니다.</p>

            <form id="ssLoginForm">
                <label class="ss-login-label" for="ssLoginId">아이디(닉네임)</label>
                <input class="ss-login-input" id="ssLoginId" type="text"
                       placeholder="영문·숫자 2~24자" autocomplete="off"
                       required minlength="2" maxlength="24" pattern="[A-Za-z0-9]{2,24}"
                       title="영문과 숫자만 사용해 2~24자로 입력해 주세요."/>

                <label class="ss-login-remember">
                    <input id="ssLoginRemember" type="checkbox"/>
                    <span>아이디 저장</span>
                </label>

                <button class="ss-login-submit" type="submit">
                    <span>로그인</span>
                    <span aria-hidden="true">↗</span>
                </button>
            </form>
        </div>

        <div class="ss-login-done" role="status" aria-live="polite">
            <span class="ss-login-check" aria-hidden="true">✓</span>
            <h2 id="ssLoginDoneText"></h2>
            <p>잠시 후 창이 자동으로 닫힙니다.</p>
            <button class="ss-login-submit" id="ssLoginDoneBtn" type="button">
                <span>확인</span>
                <span aria-hidden="true">↗</span>
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
   03 / 로그인 · 로그아웃
   ================================================================ */
// 현재 로그인 상태에 맞게 헤더 버튼 문구 변경
function updateLoginUI() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const username = localStorage.getItem('username');

    if (isLoggedIn === 'true' && username) {
        loginBtn.innerText = username + '님 | LOGOUT';
    } else {
        loginBtn.innerText = 'LOGIN';
    }
}

function logout() {
    const answer = confirm('로그아웃 하시겠습니까?');
    if (!answer) return;

    localStorage.removeItem('username');
    localStorage.removeItem('isLoggedIn');
    alert('로그아웃 되었습니다.');
    updateLoginUI();
}

/* ================================================================
   04 / 이벤트 등록
   ================================================================ */
// 헤더 버튼: 로그인 상태면 로그아웃, 아니면 로그인 창 열기
loginBtn.addEventListener('click', () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        logout();
    } else {
        openLoginModal();
    }
});

// 로그인 제출 (빈 값·형식 오류는 브라우저가 먼저 안내 말풍선으로 막아 줌)
ssForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const nickname = ssIdInput.value.trim();

    localStorage.setItem('username', nickname);
    localStorage.setItem('isLoggedIn', 'true');

    // '아이디 저장' 체크 여부에 따라 다음 로그인 때 자동 입력
    if (ssRememberInput.checked) {
        localStorage.setItem('savedUsername', nickname);
    } else {
        localStorage.removeItem('savedUsername');
    }

    ssDoneText.innerText = nickname + '님, 로그인 되었습니다.';
    ssDialog.classList.add('is-done');
    updateLoginUI();

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

// 페이지가 열릴 때 저장된 로그인 상태를 반영 (페이지를 이동해도 유지됨)
updateLoginUI();
