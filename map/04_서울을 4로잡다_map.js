/* =====================================================
   SCENE:SEOUL | 서울 지도 페이지
   - 전시 · 공연 · 이벤트: 서울 열린데이터광장 "서울시 문화행사 정보" Open API(culturalEventInfo)
   - 팝업: 서울시 데이터에 팝업 분류가 없어서 우리 팀 팝업 JSON 에서 불러온다
   - 로그인 / 찜: common.js 의 SceneSeoul 함수 사용 (로그인 화면은 login.js 담당)
   - 카드: category.css 의 공통 카드(.ss-card) 사용
   - 데이터 출처: 서울특별시 (공공누리 제1유형 · 출처표시)

   HTML 에서 불러오는 순서
     leaflet.js → common.js → login.js → map.js

   ※ 수업 외 = 강의안(9~13주차)에 없던 문법/기능. 해당 줄에 표시해 둠
   ===================================================== */


/* ---------- 01. 설정 ---------- */

const API = {
    // 서울 열린데이터광장(data.seoul.go.kr)에서 발급받은 일반 인증키를 넣는다.
    // 비어 있으면 아래 SAMPLE_URL 의 샘플 데이터를 사용한다.
    // (GitHub 같은 공개 저장소에 올릴 때는 키를 지우고 올리기)
    key: "7a6f6761786e69633634534b78674f",
    service: "culturalEventInfo",
    pageSize: 1000          // 한 번에 가져올 수 있는 최대 개수
};

const SAMPLE_URL = "04_서울을 4로잡다_map_data.json";              // API 를 못 쓸 때 쓰는 샘플
const POPUP_URL = "../data/04_서울을 4로잡다_popup.json";          // 팝업은 팀 JSON (common.js 와 같은 경로)
const FIRST_SHOW = 30;      // 처음에 보여줄 카드 수
const MORE_SHOW = 30;       // 더 보기를 누를 때마다 추가되는 수

const TYPE_LABEL = {
    exhibition: "EXHIBITION",
    performance: "PERFORMANCE",
    popup: "POP-UP",
    event: "EVENT"
};

// 지도 마커 색 (카테고리별)
const TYPE_COLOR = {
    exhibition: "#4666B0",
    performance: "#D9534F",
    popup: "#E0A800",
    event: "#3E8E6B"
};

// 서울 25개 구 중심 좌표 [위도, 경도]
const GU_CENTER = {
    "강남구": [37.5172, 127.0473], "강동구": [37.5301, 127.1238], "강북구": [37.6396, 127.0257],
    "강서구": [37.5509, 126.8495], "관악구": [37.4784, 126.9516], "광진구": [37.5385, 127.0823],
    "구로구": [37.4954, 126.8874], "금천구": [37.4519, 126.9020], "노원구": [37.6542, 127.0568],
    "도봉구": [37.6688, 127.0471], "동대문구": [37.5744, 127.0396], "동작구": [37.5124, 126.9393],
    "마포구": [37.5663, 126.9019], "서대문구": [37.5791, 126.9368], "서초구": [37.4837, 127.0324],
    "성동구": [37.5634, 127.0369], "성북구": [37.5894, 127.0167], "송파구": [37.5145, 127.1059],
    "양천구": [37.5169, 126.8664], "영등포구": [37.5264, 126.8962], "용산구": [37.5324, 126.9906],
    "은평구": [37.6027, 126.9291], "종로구": [37.5735, 126.9790], "중구": [37.5641, 126.9979],
    "중랑구": [37.6063, 127.0926]
};
const SEOUL_CENTER = [37.5665, 126.9780];


/* ---------- 02. 상태 변수 ---------- */

let allItems = [];              // 불러온 전체 콘텐츠 (API + 팝업 JSON)
let seen = {};                  // 중복 확인용 { id: true }
let currentDistrict = "";       // 선택한 구 ("" 이면 서울 전체)
let currentType = "all";        // 선택한 카테고리
let keyword = "";               // 검색어
let showCount = FIRST_SHOW;     // 지금 화면에 보여주는 카드 수
let loading = true;             // 데이터를 불러오는 중인지
let popupError = "";            // 팝업 JSON 을 못 불러왔을 때 보여줄 안내
let map;                        // Leaflet 지도
let markerLayer;                // 마커를 모아두는 레이어


/* ---------- 03. 요소 가져오기 ---------- */

const chipBox = document.getElementById("district-chips");
const resultTitle = document.getElementById("result-title");
const resultCount = document.getElementById("result-count");
const eventsBox = document.getElementById("events");
const statusNote = document.getElementById("status-note");
const moreBtn = document.getElementById("more-btn");
const searchInput = document.getElementById("search-input");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const filterRadios = document.querySelectorAll("input[name='district-filter']");


/* ---------- 04. 작은 도우미 함수 ---------- */

// text 안에 word 가 들어 있는지 확인
// replace 로 word 를 지워 봤을 때 글자가 달라지면 들어 있는 것
function hasText(text, word) {
    return text.replace(word, "") !== text;
}

// 오늘 날짜 (시간은 0시로)
function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// "2026-11-10 00:00:00.0" 또는 "2026-11-10" → "2026-11-10"
function toDateText(text) {
    return String(text || "").slice(0, 10);
}

// "2026-11-10" → Date
function toDate(dateText) {
    const y = parseInt(dateText.slice(0, 4));
    const m = parseInt(dateText.slice(5, 7));
    const d = parseInt(dateText.slice(8, 10));
    return new Date(y, m - 1, d);
}

// 주소 글자에서 구 이름 찾기 ("서울 성동구 성수이로 77" → "성동구")
function findGu(text) {
    for (const gu in GU_CENTER) {                // 10주차 for...in 객체 반복
        if (hasText(text || "", gu)) {
            return gu;
        }
    }
    return "";
}


/* ---------- 05. 데이터 정리 ---------- */

// 서울시 분류(CODENAME)로 전시 / 공연 / 이벤트를 정한다
// (팝업은 서울시 데이터에 분류가 없어서 팝업 JSON 에서 따로 불러온다)
function getType(code) {
    if (hasText(code, "전시")) return "exhibition";

    const stage = ["연극", "콘서트", "클래식", "뮤지컬", "오페라", "무용", "국악", "독주", "독창"];
    for (let i = 0; i < stage.length; i++) {
        if (hasText(code, stage[i])) return "performance";
    }
    return "event";
}

// 위도/경도 값이 서로 바뀌어 들어오는 경우가 있어서 값의 범위로 구분한다
function getLatLng(a, b) {
    a = parseFloat(a);
    b = parseFloat(b);
    if (a > 33 && a < 39 && b > 124 && b < 132) return [a, b];
    if (b > 33 && b < 39 && a > 124 && a < 132) return [b, a];
    return null;
}

// 사이트가 https 일 때 http 이미지는 브라우저가 막으므로 주소를 맞춘다
function fixImage(img) {
    img = img || "";
    if (location.protocol === "https:" && img.slice(0, 7) === "http://") {
        img = img.replace("http://", "https://");
    }
    return img;
}

// 서울시 API 한 줄 → 카드 데이터
// 날짜는 common.js 약속대로 "YYYY-MM-DD" 글자로 맞춰 두고, 기간 글자는 SceneSeoul.formatPeriod 로 만든다
function fromApi(row) {
    const point = getLatLng(row.LOT, row.LAT);
    const startDate = toDateText(row.STRTDATE);
    let endDate = toDateText(row.END_DATE);

    // 종료일이 시작일보다 빠른 잘못된 데이터가 있어서 시작일로 맞춘다
    if (endDate < startDate) endDate = startDate;

    // 상시 전시를 "2099-12-31" 로 넣거나 "2626" 처럼 연도를 잘못 적은 데이터가 있어서
    // 시작일보다 5년 넘게 뒤에 끝나면 "상시 운영" 으로 본다 (endDate 가 "" 이면 formatPeriod 가 "상시 운영")
    if (parseInt(endDate.slice(0, 4)) - parseInt(startDate.slice(0, 4)) > 5) endDate = "";

    return {
        id: (row.TITLE || "") + "|" + row.STRTDATE + "|" + (row.PLACE || ""),
        type: getType(row.CODENAME || ""),
        gu: (row.GUNAME || "").replace(" ", ""),
        title: row.TITLE || "",
        place: row.PLACE || "",
        startDate: startDate,
        endDate: endDate,
        img: fixImage(row.MAIN_IMG),
        url: row.ORG_LINK || row.HMPG_ADDR || "",
        lat: point ? point[0] : null,
        lng: point ? point[1] : null
    };
}

// 팝업 JSON 한 개 → 카드 데이터
// 좌표(lat, lng)가 있으면 그 위치에, 없으면 주소에 있는 구의 중심에 마커를 찍는다
function fromPopup(data) {
    let gu = "";
    if (GU_CENTER[data.district]) {
        gu = data.district;
    } else {
        gu = findGu(data.location);
    }

    let point = getLatLng(data.lat, data.lng);
    if (!point && gu) point = GU_CENTER[gu];

    return {
        id: data.id,
        type: "popup",
        gu: gu,
        title: data.title || "",
        place: data.location || "",
        startDate: data.startDate || "",
        endDate: data.endDate || "",
        img: data.image || "",
        url: data.officialUrl || data.sourceUrl || "",
        lat: point ? point[0] : null,
        lng: point ? point[1] : null
    };
}

// 이미 끝난 행사와 중복 데이터를 걸러서 allItems 에 더한다
function addItems(list) {
    const today = getToday();

    for (const item of list) {
        if (item.startDate.length < 10) continue;          // 날짜가 없는 데이터
        item.start = toDate(item.startDate);
        // 종료일이 빈 문자열이면 상시 운영 → 아주 먼 날짜로 두고 정렬할 때 맨 뒤로
        item.end = item.endDate ? toDate(item.endDate) : new Date(9999, 11, 31);

        if (item.end < today) continue;                     // 끝난 행사
        if (seen[item.id]) continue;                        // 중복
        seen[item.id] = true;
        allItems.push(item);
    }
}

// 진행 중인 것(곧 끝나는 순) → 예정인 것(곧 시작하는 순)
function sortItems(list) {
    const today = getToday();
    return list.sort(function (a, b) {
        const aOn = a.start <= today;
        const bOn = b.start <= today;
        if (aOn !== bOn) return aOn ? -1 : 1;
        return aOn ? a.end - b.end : a.start - b.start;
    });
}


/* ---------- 06. 데이터 불러오기 (13주차 fetch / JSON) ---------- */

// 팝업 JSON 불러오기. 다 읽으면 next() 실행
function loadPopups(next) {
    fetch(POPUP_URL)
        .then(response => response.json())
        .then(data => {
            // JSON 이 배열이면 그대로, { "키": [ ... ] } 모양이면 그 안의 배열을 꺼낸다
            let list = data;
            if (!data.length) {
                for (const key in data) {
                    list = data[key];
                }
            }
            addItems(list.map(fromPopup));
            next();
        })
        .catch(error => {
            console.error("팝업 JSON 을 불러오지 못했어요.", POPUP_URL, error);
            if (location.protocol === "file:") {
                popupError = "팝업 정보를 불러오지 못했어요. HTML 파일을 직접 열면(file://) JSON 을 읽을 수 없으니 Live Server 로 열어 주세요.";
            } else {
                popupError = "팝업 정보를 불러오지 못했어요. 파일 경로를 확인해 주세요: " + POPUP_URL;
            }
            next();
        });
}

// 서울시 Open API 를 1000건씩 차례로 불러온다. 주소 형식: /인증키/json/서비스명/시작번호/끝번호/
// 전체가 2만 건 가까이 돼서, 첫 묶음을 받자마자 화면에 보여주고 나머지는 받는 대로 쌓는다.
function loadSeoulApi(start, total) {
    const end = Math.min(start + API.pageSize - 1, total);

    // 사이트가 https 일 때 http 요청을 하면 브라우저가 막으므로 프로토콜을 맞춘다
    const protocol = location.protocol === "https:" ? "https" : "http";
    const url = `${protocol}://openapi.seoul.go.kr:8088/${API.key}/json/${API.service}/${start}/${end}/`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const body = data[API.service];

            // 인증키 오류 등은 culturalEventInfo 없이 RESULT 만 내려온다
            if (!body || body.RESULT.CODE !== "INFO-000") {
                console.error("서울시 API 오류:", body ? body.RESULT.MESSAGE : data.RESULT);
                apiFailed();
                return;
            }

            total = body.list_total_count;
            addItems(body.row.map(fromApi));
            statusNote.innerText = `행사 정보를 불러오는 중이에요... (${Math.min(end, total)} / ${total})`;

            if (start === 1) {
                render();               // 첫 묶음은 바로 보여주기
                drawMarkers();
            } else {
                // 나머지 묶음은 개수만 바꾸고 카드는 다 받은 뒤에 다시 그린다
                // (받는 도중에 카드를 다시 그리면 보고 있던 가로 스크롤 위치가 맨 앞으로 돌아가서)
                resultCount.innerText = `총 ${getFiltered(true).length}개`;
            }

            if (end < total) {
                loadSeoulApi(end + 1, total);    // 다음 1000건
            } else {
                finishLoading(false);
            }
        })
        .catch(error => {
            console.error("서울시 API 호출 실패:", error);
            apiFailed();
        });
}

// API 를 하나도 못 받았으면 샘플로 대체, 일부라도 받았으면 받은 것까지만 보여준다
function apiFailed() {
    const fromSeoul = allItems.filter(item => item.type !== "popup");
    if (fromSeoul.length === 0) {
        loadSample();
    } else {
        finishLoading(false);
    }
}

// 키가 없거나 API 가 막혔을 때 쓰는 샘플 (API 와 같은 구조의 JSON 파일)
function loadSample() {
    fetch(SAMPLE_URL)
        .then(response => response.json())
        .then(data => {
            addItems(data[API.service].row.map(fromApi));
            finishLoading(true);
        })
        .catch(error => {
            console.error("샘플 데이터를 불러오지 못했어요.", error);
            finishLoading(false);
        });
}

function finishLoading(isSample) {
    loading = false;
    let note = isSample
        ? "지금은 샘플 데이터를 보여주고 있어요. 실제 행사 정보는 API 인증키를 넣으면 연결돼요."
        : "";
    if (popupError) note = note ? note + " / " + popupError : popupError;
    statusNote.innerText = note;
    render();
    drawMarkers();
}


/* ---------- 07. 로그인 / 찜 (common.js 사용) ---------- */

// 로그인 정보는 sceneSeoulUser, 찜 목록은 sceneSeoulSavedEvents:닉네임 (common.js 가 관리)
// 로그인 창은 login.js 가 담당하므로 지도 페이지에서는 로그인 코드를 따로 두지 않는다

// 찜 상태는 로그인했을 때만 인정한다
// (common.js 는 로그인 전이면 "guest" 목록을 읽는데, 예전에 로그인 없이 저장된 기록이 남아 있으면
//  로그아웃 상태에서도 하트가 켜져 보이기 때문)
function isSaved(id) {
    return SceneSeoul.getUser() !== "" && SceneSeoul.isSaved(id);
}

function toggleSave(item, checkbox) {
    if (!SceneSeoul.getUser()) {
        alert("로그인 후 저장할 수 있어요.");
        checkbox.checked = false;       // 체크된 하트를 다시 빈 하트로
        return;
    }
    // common.js 가 닉네임별 찜 목록에 저장하고 "scene:saved" 이벤트를 보낸다
    SceneSeoul.toggleSaved(item.id);
}

// 로그아웃 상태면 화면의 하트를 모두 끈다
// (common.js 의 updateHearts() 가 guest 목록으로 하트를 켠 뒤에 실행되도록 이벤트 마지막에 부른다)
function clearGuestHearts() {
    if (SceneSeoul.getUser()) return;
    for (const input of eventsBox.querySelectorAll("input[data-save-id]")) {
        input.checked = false;
    }
}

// 로그인 / 로그아웃 / 찜 변경 / 다른 탭에서 변경되었을 때
// 하트 모양은 common.js 의 updateHearts() 가 맞춰 주므로,
// 카드를 다시 그려야 하는 건 "저장한 것" 을 보고 있을 때뿐이다
function refreshSavedCards() {
    if (currentType === "saved") {
        render();
        drawMarkers();
    }
    clearGuestHearts();
}


/* ---------- 08. 목록 걸러내기 ---------- */

function getFiltered(withDistrict) {
    return allItems.filter(function (item) {
        if (withDistrict && currentDistrict && item.gu !== currentDistrict) return false;

        if (currentType === "saved") {
            if (!isSaved(item.id)) return false;
        } else if (currentType !== "all" && item.type !== currentType) {
            return false;
        }

        if (keyword && !hasText(item.title, keyword)) return false;
        return true;
    });
}


/* ---------- 09. 카드 만들기 (category.css 공통 카드) ---------- */

// 공통 카드 구조
//   <article class="ss-card">
//     <div class="ss-card-image"> 포스터 + 오른쪽 아래 하트(.ss-heart-toggle) </div>
//     <div class="ss-card-info"> 카테고리 / 제목 / 장소 / 기간 </div>
//     <a class="pop-card-link"> 카드 전체 링크 </a>
//   </article>
function makeCard(item) {
    const card = document.createElement("article");
    card.className = "ss-card";

    // 포스터 + 하트
    const imageBox = document.createElement("div");
    imageBox.className = "ss-card-image";

    const img = document.createElement("img");
    img.setAttribute("loading", "lazy");                // 화면에 가까워질 때 불러오기
    img.alt = item.title + " 포스터";
    if (item.img) {
        img.src = item.img;
    } else {
        img.style.visibility = "hidden";                // 포스터가 없으면 회색 배경만
    }
    img.addEventListener("error", function () {
        img.style.visibility = "hidden";                // 이미지가 깨지면 회색 배경만
    });

    // 공통 하트: data-save-id 가 있으면 common.js 의 updateHearts() 가 체크 상태를 맞춰준다
    const heart = document.createElement("label");
    heart.className = "ss-heart-toggle";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.setAttribute("data-save-id", item.id);
    check.setAttribute("aria-label", item.title + " 저장");
    check.checked = isSaved(item.id);
    check.addEventListener("change", function () {
        toggleSave(item, check);
    });

    const mark = document.createElement("span");
    mark.setAttribute("aria-hidden", "true");

    heart.appendChild(check);
    heart.appendChild(mark);
    imageBox.appendChild(img);
    imageBox.appendChild(heart);

    // 글자 정보
    const info = document.createElement("div");
    info.className = "ss-card-info";

    const top = document.createElement("div");
    top.className = "ss-card-topline";
    const type = document.createElement("span");
    type.className = "ss-card-category";
    type.innerText = TYPE_LABEL[item.type];
    top.appendChild(type);

    // 제목에 < > 가 들어간 경우가 있어서 innerHTML 대신 innerText 로 넣는다
    const title = document.createElement("h4");
    title.className = "ss-card-title";
    title.innerText = item.title;

    // 장소 앞에 구 이름을 붙인다 (주소에 이미 구 이름이 있으면 그대로)
    const place = document.createElement("p");
    place.className = "pop-card-place";
    if (item.gu && !hasText(item.place, item.gu)) {
        place.innerText = item.gu + " · " + item.place;
    } else {
        place.innerText = item.place;
    }

    const period = document.createElement("p");
    period.className = "pop-card-period";
    period.innerText = SceneSeoul.formatPeriod(item);

    info.appendChild(top);
    info.appendChild(title);
    info.appendChild(place);
    info.appendChild(period);

    card.appendChild(imageBox);
    card.appendChild(info);

    // 카드 전체를 누르면 원문 페이지로 (하트는 링크보다 위에 있어서 따로 눌린다)
    if (item.url) {
        const link = document.createElement("a");
        link.className = "pop-card-link";
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.setAttribute("aria-label", item.title + " 자세히 보기");
        card.appendChild(link);
    }
    return card;
}

function render() {
    const list = sortItems(getFiltered(true));

    resultTitle.innerText = currentDistrict || "서울 전체";
    resultCount.innerText = (loading && list.length === 0) ? "" : `총 ${list.length}개`;

    eventsBox.innerHTML = "";
    if (list.length === 0) {
        const empty = document.createElement("p");
        empty.className = "events-empty";
        if (loading) {
            empty.innerText = "행사 정보를 불러오는 중이에요...";
        } else if (currentType === "saved") {
            empty.innerText = SceneSeoul.getUser()
                ? "저장한 콘텐츠가 없어요. 마음에 드는 카드의 하트를 눌러보세요."
                : "로그인하면 하트로 저장한 콘텐츠를 모아볼 수 있어요.";
        } else {
            empty.innerText = "조건에 맞는 콘텐츠가 없어요.";
        }
        eventsBox.appendChild(empty);
        moreBtn.hidden = true;
        return;
    }

    const shown = list.slice(0, showCount);
    for (const item of shown) {
        eventsBox.appendChild(makeCard(item));
    }
    moreBtn.hidden = list.length <= showCount;
}


/* ---------- 10. 지도 ---------- */

// ※ 수업 외: Leaflet 라이브러리 (L.map, L.tileLayer, L.circleMarker)
function initMap() {
    map = L.map("leaflet-map", { preferCanvas: true }).setView(SEOUL_CENTER, 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
}

// 마커를 눌렀을 때 뜨는 말풍선 내용 (요소로 만들어 넣으면 제목에 태그가 있어도 실행되지 않는다)
function makeMarkerPopup(item) {
    const box = document.createElement("div");

    const label = document.createElement("span");
    label.className = "popup-type";
    label.innerText = TYPE_LABEL[item.type];

    const name = document.createElement("strong");
    name.innerText = item.title;

    const date = document.createElement("div");
    date.innerText = SceneSeoul.formatPeriod(item);

    box.appendChild(label);
    box.appendChild(name);
    box.appendChild(date);

    if (item.url) {
        const link = document.createElement("a");
        link.className = "popup-link";
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.innerText = "자세히 보기 ↗";
        box.appendChild(link);
    }
    return box;
}

// 카테고리/검색어에 맞는 항목을 마커로 찍는다 (구 선택과는 상관없이 서울 전체)
function drawMarkers() {
    markerLayer.clearLayers();
    for (const item of getFiltered(false)) {
        if (item.lat === null) continue;        // 좌표가 없는 행사는 목록에만 나온다

        const marker = L.circleMarker([item.lat, item.lng], {
            radius: 7,
            color: "#FFFFFF",
            weight: 2,
            fillColor: TYPE_COLOR[item.type],
            fillOpacity: 0.95
        });

        // 말풍선 내용은 마커를 눌렀을 때 만든다 (마커가 수천 개라 미리 만들면 느려서)
        marker.bindPopup(function () {
            return makeMarkerPopup(item);
        });

        marker.on("click", function () {
            if (item.gu && item.gu !== currentDistrict) {
                selectDistrict(item.gu, true);
            }
        });
        marker.addTo(markerLayer);
    }
}


/* ---------- 11. 구 선택 ---------- */

function makeChip(text, gu) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerText = text;
    btn.setAttribute("data-name", gu);
    btn.addEventListener("click", function () {
        selectDistrict(gu);
    });
    chipBox.appendChild(btn);
}

function makeChips() {
    makeChip("서울 전체", "");
    for (const gu in GU_CENTER) {                // 10주차 for...in 객체 반복
        makeChip(gu, gu);
    }
}

function selectDistrict(gu, fromMarker) {
    currentDistrict = gu;
    showCount = FIRST_SHOW;

    for (const btn of chipBox.querySelectorAll("button")) {
        btn.className = btn.getAttribute("data-name") === gu ? "is-selected" : "";
    }
    render();
    eventsBox.scrollLeft = 0;

    if (!fromMarker) {                           // 마커를 눌렀을 땐 말풍선이 열려 있으니 지도를 움직이지 않는다
        if (gu) {
            map.flyTo(GU_CENTER[gu], 13);
        } else {
            map.flyTo(SEOUL_CENTER, 11);
        }
    }
}


/* ---------- 12. 이벤트 ---------- */

for (const radio of filterRadios) {
    radio.addEventListener("change", function () {
        currentType = radio.id.replace("filter-", "");      // "filter-popup" → "popup"
        showCount = FIRST_SHOW;
        render();
        eventsBox.scrollLeft = 0;
        drawMarkers();
    });
}

// 검색은 타이핑이 멈춘 뒤에 한 번만 실행 (마커가 많아서 글자마다 다시 그리면 느림)
// ※ 수업 외: clearTimeout (setTimeout 으로 예약해 둔 것을 취소)
let searchTimer;
searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
        keyword = searchInput.value;
        showCount = FIRST_SHOW;
        render();
        eventsBox.scrollLeft = 0;
        drawMarkers();
    }, 250);
});

moreBtn.addEventListener("click", function () {
    showCount += MORE_SHOW;
    render();
});

// 카드 좌우 이동 (부드럽게 움직이는 건 CSS scroll-behavior: smooth)
prevBtn.addEventListener("click", function () {
    eventsBox.scrollLeft -= 480;
});
nextBtn.addEventListener("click", function () {
    eventsBox.scrollLeft += 480;
});

// common.js 가 보내는 이벤트 (안내문 4·5번)
window.addEventListener("scene:login", refreshSavedCards);   // 로그인 / 로그아웃
window.addEventListener("scene:saved", refreshSavedCards);   // 찜 / 찜 취소
window.addEventListener("storage", refreshSavedCards);       // 다른 탭에서 바꿨을 때
window.addEventListener("pageshow", clearGuestHearts);       // 뒤로가기로 돌아왔을 때


/* ---------- 13. 시작 ---------- */

function start() {
    initMap();
    makeChips();
    selectDistrict("", true);

    // 팝업 JSON 을 먼저 읽고, 그다음 서울시 API (키가 없으면 샘플)
    loadPopups(function () {
        render();
        drawMarkers();

        if (API.key) {
            statusNote.innerText = "행사 정보를 불러오는 중이에요...";
            loadSeoulApi(1, API.pageSize);       // 전체 개수는 첫 응답을 받은 뒤에 알 수 있다
        } else {
            loadSample();
        }
    });

    // 주소 뒤에 #성동구 처럼 붙어 있으면 그 구를 바로 선택
    // ※ 수업 외: location.hash, decodeURIComponent (한글 주소 되돌리기)
    const name = decodeURIComponent(location.hash.replace("#", ""));
    if (GU_CENTER[name]) selectDistrict(name);
}

start();
