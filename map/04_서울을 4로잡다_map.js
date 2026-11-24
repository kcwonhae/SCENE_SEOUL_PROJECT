/* =====================================================
   SCENE:SEOUL | 서울 지도 페이지
   - 서울 열린데이터광장 "서울시 문화행사 정보" Open API(culturalEventInfo)를 fetch로 불러와
     지도 마커와 카드 목록에 표시
   - 로그인(닉네임) 후 하트로 저장 (localStorage)
   - 데이터 출처: 서울특별시 (공공누리 제1유형 · 출처표시)

   ※ 수업 외 = 강의안(9~12주차)에 없던 문법/기능. 해당 줄에 표시해 둠
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

const CACHE_KEY = "sceneEvents_v1";     // 불러온 행사를 하루 동안 브라우저에 저장해 두는 이름

const SAMPLE_URL = "04_서울을 4로잡다_map_data.json";
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

let allItems = [];              // 불러온 전체 콘텐츠
let currentDistrict = "";       // 선택한 구 ("" 이면 서울 전체)
let currentType = "all";        // 선택한 카테고리
let keyword = "";               // 검색어
let showCount = FIRST_SHOW;     // 지금 화면에 보여주는 카드 수
let loginUser = "";             // 로그인한 이름
let loading = true;             // 데이터를 불러오는 중인지
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
const loginLink = document.getElementById("login-link");


/* ---------- 04. 날짜 ---------- */

// "2026-11-10 00:00:00.0" 같은 문자열 → Date
function parseDate(text) {
    const num = String(text).replace(/[^0-9]/g, "");    // ※ 수업 외: 정규표현식 (숫자만 남기기)
    const y = parseInt(num.substring(0, 4));
    const m = parseInt(num.substring(4, 6));
    const d = parseInt(num.substring(6, 8));
    return new Date(y, m - 1, d);
}

// Date → "2026.11.10"
function formatDate(date) {
    const m = String(date.getMonth() + 1).padStart(2, "0");    // ※ 수업 외: padStart
    const d = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "." + m + "." + d;
}

// 오늘 날짜 문자열 "2026-11-24" (캐시가 오늘 것인지 확인할 때 사용)
function todayText() {
    const t = getToday();
    return t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate();
}

function getToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}


/* ---------- 05. 데이터 불러오기 (fetch / JSON) ---------- */

// 서울시 Open API 한 번 호출. 주소 형식: /인증키/json/서비스명/시작번호/끝번호/
// ※ 수업 외: fetch, async/await (13주차 AJAX 내용)
async function fetchPage(start, end) {
    // 사이트가 https 일 때 http 요청을 하면 브라우저가 막으므로 프로토콜을 맞춘다
    const protocol = location.protocol === "https:" ? "https" : "http";
    const url = protocol + "://openapi.seoul.go.kr:8088/" + API.key + "/json/" +
                API.service + "/" + start + "/" + end + "/";

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("서버 응답 오류 " + response.status);
    }
    const json = await response.json();         // JSON 문자열 → 객체
    const body = json[API.service];
    if (!body) {
        // 인증키 오류 등은 최상위 RESULT 로 내려온다
        throw new Error(json.RESULT ? json.RESULT.MESSAGE : "응답 형식을 알 수 없어요.");
    }
    if (body.RESULT.CODE !== "INFO-000") {
        throw new Error(body.RESULT.MESSAGE);
    }
    return body;
}

// 전체 데이터는 2만 건 가까이 돼서 1000건씩 차례로 받는다.
// 첫 묶음을 받자마자 화면에 보여주고, 나머지는 받는 대로 allItems 에 쌓는다.
async function loadSeoulApi() {
    const seen = {};                // 중복 확인용
    let total = API.pageSize;       // 첫 요청 뒤에 진짜 전체 개수로 바뀜

    for (let start = 1; start <= total; start += API.pageSize) {
        const end = Math.min(start + API.pageSize - 1, total);
        const body = await fetchPage(start, end);
        total = body.list_total_count;

        allItems = allItems.concat(cleanUp(body.row, seen));

        if (start === 1) {          // 첫 묶음은 바로 보여주기
            render();
            drawMarkers();
        }
        statusNote.innerText = "행사 정보를 불러오는 중이에요... (" +
            Math.min(end, total).toLocaleString() + " / " + total.toLocaleString() + ")";
    }
}

// 키가 없거나 API가 막혔을 때 쓰는 샘플 (같은 구조의 JSON 파일)
async function loadSample() {
    const response = await fetch(SAMPLE_URL);
    if (!response.ok) {
        throw new Error("샘플 데이터를 불러오지 못했어요.");
    }
    const json = await response.json();
    return json[API.service].row;
}

// 한 번 받은 행사는 하루 동안 브라우저에 저장해 두고 다시 쓴다 (매번 2만 건을 받지 않으려고)
// 날짜는 숫자(밀리초)로 바꿔 저장했다가 불러올 때 Date 로 되돌린다
function saveCache() {
    const items = allItems.map(function (item) {
        const copy = Object.assign({}, item);   // ※ 수업 외: Object.assign (객체 복사)
        copy.start = item.start.getTime();
        copy.end = item.end.getTime();
        return copy;
    });
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ day: todayText(), items: items }));
    } catch (error) {
        console.warn("캐시 저장 실패(용량 초과 등):", error);
    }
}

function loadCache() {
    try {
        const text = localStorage.getItem(CACHE_KEY);
        if (!text) return null;
        const data = JSON.parse(text);
        if (data.day !== todayText()) return null;      // 어제 것이면 버린다
        return data.items.map(function (item) {
            item.start = new Date(item.start);
            item.end = new Date(item.end);
            return item;
        });
    } catch (error) {
        return null;
    }
}


/* ---------- 06. 데이터 정리 ---------- */

// 서울시 분류(CODENAME)와 제목으로 우리 사이트의 4개 카테고리를 정한다
// 서울시 데이터에는 팝업 분류가 따로 없어서 제목에 "팝업"이 들어간 것을 팝업으로 본다
function getType(row) {
    const code = row.CODENAME || "";
    const title = row.TITLE || "";

    if (/팝업|pop-?up/i.test(title)) return "popup";
    if (code.indexOf("전시") !== -1) return "exhibition";

    const stage = ["연극", "콘서트", "클래식", "뮤지컬", "오페라", "무용", "국악", "독주", "독창"];
    for (const word of stage) {
        if (code.indexOf(word) !== -1) return "performance";
    }
    return "event";
}

// 위도/경도 값이 서로 바뀌어 들어오는 경우가 있어서 값의 범위로 구분한다
function getLatLng(row) {
    const a = parseFloat(row.LOT);
    const b = parseFloat(row.LAT);
    if (a > 33 && a < 39 && b > 124 && b < 132) return [a, b];
    if (b > 33 && b < 39 && a > 124 && a < 132) return [b, a];
    return null;
}

function toItem(row) {
    const point = getLatLng(row);

    // 종료일이 시작일보다 빠른 잘못된 데이터가 있어서 시작일로 맞춘다
    const start = parseDate(row.STRTDATE);
    let end = parseDate(row.END_DATE);
    if (end < start) end = start;

    let img = row.MAIN_IMG || "";
    if (location.protocol === "https:" && img.indexOf("http://") === 0) {
        img = img.replace("http://", "https://");
    }
    return {
        id: (row.TITLE || "") + "|" + row.STRTDATE + "|" + (row.PLACE || ""),
        type: getType(row),
        category: row.CODENAME || "",
        gu: (row.GUNAME || "").trim(),
        title: (row.TITLE || "").trim(),
        place: row.PLACE || "",
        start: start,
        end: end,
        img: img,
        url: row.ORG_LINK || row.HMPG_ADDR || "",
        lat: point ? point[0] : null,
        lng: point ? point[1] : null
    };
}

// 이미 끝난 행사와 중복 데이터를 걸러낸다
function cleanUp(rows, seen) {
    const today = getToday();
    const list = [];
    for (const row of rows) {
        const item = toItem(row);
        if (isNaN(item.end.getTime()) || item.end < today) continue;     // 끝난 행사
        if (seen[item.id]) continue;                                      // 중복
        seen[item.id] = true;
        list.push(item);
    }
    return list;
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


/* ---------- 07. 로그인 / 저장 ---------- */

// 서버가 없어서 이름 입력을 로그인으로 대신하고, 저장한 목록은 브라우저(localStorage)에 둔다
// ※ 수업 외: localStorage (13주차 웹스토리지)
function getSavedIds() {
    if (!loginUser) return [];
    const text = localStorage.getItem("sceneSaved_" + loginUser);
    return text ? JSON.parse(text) : [];
}

function isSaved(id) {
    return getSavedIds().indexOf(id) !== -1;
}

function toggleSave(item, button) {
    if (!loginUser) {
        alert("로그인 후 저장할 수 있어요.");
        return;
    }
    let ids = getSavedIds();
    if (ids.indexOf(item.id) !== -1) {
        ids = ids.filter(function (id) {
            return id !== item.id;
        });
    } else {
        ids.push(item.id);
    }
    localStorage.setItem("sceneSaved_" + loginUser, JSON.stringify(ids));

    if (currentType === "saved") {
        render();                   // 저장한 것만 보는 중이면 목록에서 바로 빠지게
    } else {
        button.classList.toggle("is-saved", ids.indexOf(item.id) !== -1);
        button.setAttribute("aria-label", button.classList.contains("is-saved") ? "저장 취소" : "저장");
    }
}

function updateLoginLink() {
    loginLink.innerText = loginUser ? "LOGOUT · " + loginUser : "LOGIN";
}

function handleLogin(event) {
    event.preventDefault();
    if (loginUser) {
        if (confirm(loginUser + "님, 로그아웃할까요?")) {
            loginUser = "";
            localStorage.removeItem("sceneUser");
        }
    } else {
        const name = prompt("이름(닉네임)을 입력해 로그인하세요.", "");
        if (name && name.trim() !== "") {
            loginUser = name.trim();
            localStorage.setItem("sceneUser", loginUser);
        }
    }
    updateLoginLink();
    render();
}


/* ---------- 08. 목록 걸러내기 ---------- */

function getFiltered(withDistrict) {
    const saved = getSavedIds();
    return allItems.filter(function (item) {
        if (withDistrict && currentDistrict && item.gu !== currentDistrict) return false;
        if (currentType === "saved") {
            if (saved.indexOf(item.id) === -1) return false;
        } else if (currentType !== "all" && item.type !== currentType) {
            return false;
        }
        if (keyword && item.title.toLowerCase().indexOf(keyword) === -1) return false;
        return true;
    });
}


/* ---------- 09. 카드 만들기 ---------- */

const HEART = "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.4 4.8 6.6 4.8c2 0 3.5 1.1 5.4 3.2 1.9-2.1 3.4-3.2 5.4-3.2 3.2 0 5.1 3.2 3.9 6.5-1.8 4.6-9.3 9.2-9.3 9.2z'/></svg>";

function makeCard(item) {
    const card = document.createElement("article");
    card.className = "event event-" + item.type;

    const img = document.createElement("img");
    img.className = "event-poster";
    img.alt = item.img ? item.title + " 포스터" : "";
    img.loading = "lazy";               // 화면에 가까워질 때 불러오기
    if (item.img) img.src = item.img;
    img.onerror = function () {
        img.removeAttribute("src");     // 이미지가 깨지면 회색 배경만 보이게
        img.alt = "";                   // 깨진 이미지 글자가 보이지 않도록
    };

    const content = document.createElement("div");
    content.className = "event-content";

    // 카테고리 + 하트
    const top = document.createElement("div");
    top.className = "event-top";

    const type = document.createElement("span");
    type.className = "event-type";
    type.innerText = TYPE_LABEL[item.type];

    const save = document.createElement("button");
    save.type = "button";
    save.className = "event-save";
    save.innerHTML = HEART;
    const saved = isSaved(item.id);
    save.classList.toggle("is-saved", saved);
    save.setAttribute("aria-label", saved ? "저장 취소" : "저장");
    save.addEventListener("click", function () {
        toggleSave(item, save);
    });

    top.appendChild(type);
    top.appendChild(save);

    const title = document.createElement("a");
    title.className = "event-title";
    title.innerText = item.title;
    if (item.url) {
        title.href = item.url;
        title.target = "_blank";
        title.rel = "noopener";
    }

    const place = document.createElement("span");
    place.className = "event-place";
    place.innerText = (item.gu ? item.gu + " · " : "") + item.place;

    const period = document.createElement("span");
    period.className = "event-period";
    period.innerText = formatDate(item.start) + " — " + formatDate(item.end);

    content.appendChild(top);
    content.appendChild(title);
    content.appendChild(place);
    content.appendChild(period);

    card.appendChild(img);
    card.appendChild(content);
    return card;
}

function render() {
    const list = sortItems(getFiltered(true));

    resultTitle.innerText = currentDistrict || "서울 전체";
    resultCount.innerText = (loading && list.length === 0) ? "" : "총 " + list.length.toLocaleString() + "개";

    eventsBox.innerHTML = "";
    if (list.length === 0) {
        const empty = document.createElement("p");
        empty.className = "events-empty";
        if (loading) {
            empty.innerText = "행사 정보를 불러오는 중이에요...";
        } else if (currentType === "saved") {
            empty.innerText = loginUser
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

        // 팝업 내용은 마커를 눌렀을 때 만든다 (마커가 수천 개라 미리 만들면 느려서)
        // 요소로 만들어 넣으면 제목에 태그가 있어도 실행되지 않는다
        marker.bindPopup(function () {
            const box = document.createElement("div");
            const label = document.createElement("span");
            label.className = "popup-type";
            label.innerText = TYPE_LABEL[item.type];
            const name = document.createElement("strong");
            name.innerText = item.title;
            const date = document.createElement("div");
            date.innerText = formatDate(item.start) + " — " + formatDate(item.end);
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

function makeChips() {
    const all = document.createElement("button");
    all.type = "button";
    all.innerText = "서울 전체";
    all.setAttribute("data-name", "");
    all.addEventListener("click", function () {
        selectDistrict("");
    });
    chipBox.appendChild(all);

    for (const gu in GU_CENTER) {                // ※ for...in 은 10주차 객체 반복
        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerText = gu;
        btn.setAttribute("data-name", gu);
        btn.addEventListener("click", function () {
            selectDistrict(gu);
        });
        chipBox.appendChild(btn);
    }
}

function selectDistrict(gu, fromMarker) {
    currentDistrict = gu;
    showCount = FIRST_SHOW;

    chipBox.querySelectorAll("button").forEach(function (btn) {
        btn.classList.toggle("is-selected", btn.getAttribute("data-name") === gu);
    });
    render();
    eventsBox.scrollLeft = 0;

    if (!fromMarker) {                           // 마커를 눌렀을 땐 팝업이 열려 있으니 지도를 움직이지 않는다
        if (gu) {
            map.flyTo(GU_CENTER[gu], 13);
        } else {
            map.flyTo(SEOUL_CENTER, 11);
        }
    }
}


/* ---------- 12. 이벤트 ---------- */

loginLink.addEventListener("click", handleLogin);

filterRadios.forEach(function (radio) {
    radio.addEventListener("change", function () {
        currentType = radio.id.replace("filter-", "");      // "filter-popup" → "popup"
        showCount = FIRST_SHOW;
        render();
        drawMarkers();
    });
});

// 검색은 타이핑이 멈춘 뒤에 한 번만 실행 ※ 수업 외: setTimeout 으로 지연시키기
let searchTimer;
searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
        keyword = searchInput.value.trim().toLowerCase();
        showCount = FIRST_SHOW;
        render();
        drawMarkers();
    }, 250);
});

moreBtn.addEventListener("click", function () {
    showCount += MORE_SHOW;
    render();
});

prevBtn.addEventListener("click", function () {
    eventsBox.scrollBy({ left: -480, behavior: "smooth" });
});
nextBtn.addEventListener("click", function () {
    eventsBox.scrollBy({ left: 480, behavior: "smooth" });
});


/* ---------- 13. 시작 ---------- */

async function start() {
    loginUser = localStorage.getItem("sceneUser") || "";
    updateLoginLink();
    initMap();
    makeChips();
    selectDistrict("", true);

    let isSample = false;

    if (!API.key) {
        // 인증키가 없으면 샘플 데이터
        allItems = cleanUp(await loadSample(), {});
        isSample = true;
    } else {
        const cached = loadCache();
        if (cached) {
            allItems = cached;                  // 오늘 이미 받아 둔 게 있으면 그대로 사용
        } else {
            statusNote.innerText = "행사 정보를 불러오는 중이에요...";
            try {
                await loadSeoulApi();
                saveCache();
            } catch (error) {
                console.warn("서울시 API 호출 실패:", error);
                if (allItems.length === 0) {    // 하나도 못 받았으면 샘플로 대체
                    allItems = cleanUp(await loadSample(), {});
                    isSample = true;
                }
            }
        }
    }

    loading = false;

    if (isSample) {
        statusNote.innerText = "지금은 샘플 데이터를 보여주고 있어요. 실제 행사 정보는 API 인증키를 넣으면 연결돼요.";
    } else {
        statusNote.innerText = "";
    }

    render();
    drawMarkers();

    // 주소 뒤에 #성동구 처럼 붙어 있으면 그 구를 바로 선택
    const name = decodeURIComponent(location.hash.replace("#", ""));
    if (GU_CENTER[name]) selectDistrict(name);
}

start().catch(function (error) {
    console.error(error);
    statusNote.innerText = "콘텐츠를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
});
