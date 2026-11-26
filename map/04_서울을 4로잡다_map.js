/* =====================================================
   SCENE:SEOUL | 서울 지도 페이지
   - 데이터: 팀 JSON 4개 (전시 · 공연 · 팝업 · 이벤트)
             common.js 의 SceneSeoul.loadAllItems() 로 불러온다 (추천 JSON 은 다른 페이지 항목과 겹쳐서 뺀다)
   - 지도 위치: 장소 이름 → 좌표 표(VENUES)로 정확한 위치에 마커를 찍고,
                표에 없는 장소는 구 중심 근처에 찍는다
   - 로그인 / 찜: common.js 의 SceneSeoul 함수 사용 (로그인 화면은 login.js 담당)
   - 카드: category.css 의 공통 카드(.ss-card) 사용

   HTML 에서 불러오는 순서
     leaflet.js → common.js → login.js → map.js

   ※ 수업 외 = 강의안(9~13주차)에 없던 문법/기능. 해당 줄에 표시해 둠
   ===================================================== */


/* ---------- 01. 설정 ---------- */


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

// 장소 이름(일부) → [구, 위도, 경도]
// JSON 의 location 글자 안에 이 이름이 들어 있으면 그 좌표에 마커를 찍는다 (위에서부터 먼저 맞는 것)
const VENUES = [
    // 전시
    ["국립현대미술관 덕수궁", "중구", 37.5659, 126.9749],
    ["국립현대미술관 서울", "종로구", 37.5788, 126.9802],
    ["서울시립미술관 서소문", "중구", 37.5640, 126.9737],
    ["북서울미술관", "노원구", 37.6407, 127.0665],
    ["사진미술관", "도봉구", 37.6536, 127.0472],
    ["예술의전당", "서초구", 37.4786, 127.0117],
    ["롯데뮤지엄", "송파구", 37.5126, 127.1025],
    ["퐁피두센터 한화", "영등포구", 37.5198, 126.9403],
    ["아트조선스페이스", "중구", 37.5683, 126.9764],
    ["세화미술관", "종로구", 37.5703, 126.9726],
    ["해치마당", "종로구", 37.5730, 126.9768],
    ["세종문화회관", "종로구", 37.5726, 126.9760],
    ["세종대극장", "종로구", 37.5726, 126.9760],
    ["광화문광장", "종로구", 37.5720, 126.9769],
    ["국립고궁박물관", "종로구", 37.5765, 126.9752],
    ["국립민속박물관", "종로구", 37.5813, 126.9792],
    ["서울공예박물관", "종로구", 37.5764, 126.9840],
    ["고희동미술관", "종로구", 37.5826, 126.9890],
    ["오간수교", "중구", 37.5705, 127.0087],
    ["국립중앙박물관", "용산구", 37.5240, 126.9804],
    ["리움미술관", "용산구", 37.5384, 126.9990],
    ["성북구립미술관", "성북구", 37.5915, 126.9946],
    ["서소문성지", "중구", 37.5613, 126.9690],
    ["스페이스K", "강서구", 37.5610, 126.8320],
    ["아트선재센터", "종로구", 37.5797, 126.9814],
    ["국제갤러리", "종로구", 37.5802, 126.9808],
    ["대림미술관", "종로구", 37.5765, 126.9733],
    ["일민미술관", "종로구", 37.5701, 126.9780],
    ["미술아카이브", "종로구", 37.6118, 126.9741],
    ["서울시청", "중구", 37.5663, 126.9779],
    ["피크닉", "중구", 37.5559, 126.9787],
    ["김영섭사진화랑", "중구", 37.5612, 126.9922],
    ["그라운드시소 용산", "용산구", 37.5296, 126.9645],
    ["서울기록원", "은평구", 37.6110, 126.9338],
    ["서서울미술관", "금천구", 37.4573, 126.8951],
    // 공연
    ["롯데콘서트홀", "송파구", 37.5130, 127.1020],
    ["대학로극장 쿼드", "종로구", 37.5822, 127.0030],
    ["예술공간 혜화", "종로구", 37.5826, 127.0019],
    ["창경궁로 303", "종로구", 37.5830, 127.0010],
    ["소월아트홀", "성동구", 37.5634, 127.0369],
    ["용산아트홀", "용산구", 37.5323, 126.9905],
    ["꿈의숲아트센터", "강북구", 37.6205, 127.0405],
    ["어린이대공원", "광진구", 37.5480, 127.0750],
    ["금호아트홀연세", "서대문구", 37.5650, 126.9385],
    ["국립국악원", "서초구", 37.4775, 127.0090],
    ["남산국악당", "중구", 37.5580, 126.9940],
    ["구로아트밸리", "구로구", 37.4950, 126.8864],
    ["중랑구청", "중랑구", 37.6063, 127.0926],
    // 이벤트
    ["서울광장", "중구", 37.5658, 126.9780],
    ["레드로드", "마포구", 37.5548, 126.9225],
    ["발산역", "강서구", 37.5585, 126.8375],
    ["뚝섬한강공원", "광진구", 37.5292, 127.0670],
    ["눈스퀘어", "중구", 37.5636, 126.9826],
    ["서울상상나라", "광진구", 37.5490, 127.0790],
    ["서울식물원", "강서구", 37.5694, 126.8350],
    ["보신각", "종로구", 37.5700, 126.9835],
    ["DDP", "중구", 37.5665, 127.0092],
    // 팝업 (주소)
    ["성수이로7가길", "성동구", 37.5440, 127.0555],
    ["서울숲2길", "성동구", 37.5450, 127.0420],
    ["아차산로5길", "성동구", 37.5444, 127.0552],
    ["연무장길", "성동구", 37.5435, 127.0560],
    ["성수일로4길", "성동구", 37.5437, 127.0550],
    ["더현대 서울", "영등포구", 37.5259, 126.9284],
    ["IFC몰", "영등포구", 37.5251, 126.9255],
    ["아이파크몰", "용산구", 37.5296, 126.9645],
    ["하이브", "용산구", 37.5245, 126.9645],
    ["롯데월드몰", "송파구", 37.5126, 127.1025],
    ["AK플라자 홍대", "마포구", 37.5576, 126.9245],
    ["와우산로37길", "마포구", 37.5535, 126.9230]
];


/* ---------- 02. 상태 변수 ---------- */

let allItems = [];              // 불러온 전체 콘텐츠 (전시 · 공연 · 팝업 · 이벤트 JSON)
let currentDistrict = "";       // 선택한 구 ("" 이면 서울 전체)
let currentType = "all";        // 선택한 카테고리
let keyword = "";               // 검색어
let loading = true;             // 데이터를 불러오는 중인지
let map;                        // Leaflet 지도
let markerLayer;                // 마커를 모아두는 레이어


/* ---------- 03. 요소 가져오기 ---------- */

const districtSelect = document.getElementById("district-select");
const resultTitle = document.getElementById("result-title");
const resultCount = document.getElementById("result-count");
const eventsBox = document.getElementById("events");
const statusNote = document.getElementById("status-note");
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

// 장소 이름으로 좌표 표(VENUES)에서 찾기 (없으면 null)
function findVenue(text) {
    for (const venue of VENUES) {
        if (hasText(text || "", venue[0])) {
            return venue;
        }
    }
    return null;
}

// 좌표를 모르는 콘텐츠는 구 중심에 찍는데, 한 점에 겹치면 하나만 보이므로
// 같은 구 안에서 순서대로 바둑판처럼 조금씩 옮겨 찍는다 (한 줄에 5개, 간격 약 150m)
const guCount = {};

function spreadPoint(gu) {
    const n = guCount[gu] || 0;
    guCount[gu] = n + 1;

    const row = Math.floor(n / 5);
    const col = n % 5;
    const gap = 0.0015;
    return [GU_CENTER[gu][0] - row * gap, GU_CENTER[gu][1] + (col - 2) * gap];
}

// JSON 한 개 → 지도에서 쓰는 데이터
// (common.js 약속: id, category, title, startDate, endDate, location, image, description, sourceUrl)
function toItem(data) {
    const venue = findVenue(data.location);

    // 구 이름: district 가 "중구" 처럼 구 이름이면 그대로, 아니면 장소 표 → 주소 순서로 찾는다
    let gu = "";
    if (GU_CENTER[data.district]) {
        gu = data.district;
    } else if (venue) {
        gu = venue[1];
    } else {
        gu = findGu(data.location);
    }

    // 위치: JSON 의 lat/lng → 장소 표 → 구 중심 근처 순서
    let point = null;
    if (data.lat && data.lng) {
        point = [parseFloat(data.lat), parseFloat(data.lng)];
    } else if (venue) {
        point = [venue[2], venue[3]];
    } else if (gu) {
        point = spreadPoint(gu);
    }

    return {
        id: data.id,
        type: data.category,
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

// 추천 항목 · 지도에서 쓰지 않는 분류 · 날짜가 없는 데이터 · 이미 끝난 콘텐츠를 거른다
function cleanUp(list) {
    const today = getToday();
    const result = [];

    for (const item of list) {
        if (!item.id || item.id.slice(0, 10) === "recommend-") continue;
        if (!TYPE_LABEL[item.type] || item.startDate.length < 10) continue;
        item.start = toDate(item.startDate);
        // 종료일이 빈 문자열이면 상시 운영 → 아주 먼 날짜로 두고 정렬할 때 맨 뒤로
        item.end = item.endDate ? toDate(item.endDate) : new Date(9999, 11, 31);

        if (item.end < today) continue;         // 끝난 콘텐츠
        result.push(item);
    }
    return result;
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
            empty.innerText = "콘텐츠를 불러오는 중이에요...";
        } else if (currentType === "saved") {
            empty.innerText = SceneSeoul.getUser()
                ? "저장한 콘텐츠가 없어요. 마음에 드는 카드의 하트를 눌러보세요."
                : "로그인하면 하트로 저장한 콘텐츠를 모아볼 수 있어요.";
        } else {
            empty.innerText = "조건에 맞는 콘텐츠가 없어요.";
        }
        eventsBox.appendChild(empty);
        return;
    }

    // JSON 데이터는 100개 정도라 전부 한 줄에 그리고, 좌우 스크롤로 본다
    for (const item of list) {
        eventsBox.appendChild(makeCard(item));
    }
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

    // 장소 (카드와 같이 주소에 구 이름이 없으면 앞에 붙인다)
    const place = document.createElement("div");
    place.className = "popup-place";
    if (item.gu && !hasText(item.place, item.gu)) {
        place.innerText = item.gu + " · " + item.place;
    } else {
        place.innerText = item.place;
    }

    const date = document.createElement("div");
    date.innerText = SceneSeoul.formatPeriod(item);

    box.appendChild(label);
    box.appendChild(name);
    if (item.place || item.gu) box.appendChild(place);
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
        if (item.lat === null) continue;        // 위치를 모르는 콘텐츠는 목록에만 나온다

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

// 드롭다운에 옵션 하나 추가 (value 가 "" 이면 서울 전체)
function makeOption(text, gu) {
    const option = document.createElement("option");
    option.value = gu;
    option.innerText = text;
    districtSelect.appendChild(option);
}

function makeOptions() {
    makeOption("서울 전체", "");
    for (const gu in GU_CENTER) {                // 10주차 for...in 객체 반복
        makeOption(gu, gu);
    }
}

function selectDistrict(gu, fromMarker) {
    currentDistrict = gu;

    districtSelect.value = gu;                   // 마커로 고른 경우에도 드롭다운 표시를 맞춘다
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

// 드롭다운에서 구를 고르면 그 구로 이동
districtSelect.addEventListener("change", function () {
    selectDistrict(districtSelect.value);
});

for (const radio of filterRadios) {
    radio.addEventListener("change", function () {
        currentType = radio.id.replace("filter-", "");      // "filter-popup" → "popup"
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
        render();
        eventsBox.scrollLeft = 0;
        drawMarkers();
    }, 250);
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
    makeOptions();
    selectDistrict("", true);

    // common.js 가 팀 JSON 들을 차례로 읽어서 하나의 배열로 넘겨준다
    SceneSeoul.loadAllItems(function (list) {
        allItems = cleanUp(list.map(toItem));
        loading = false;

        if (allItems.length === 0 && location.protocol === "file:") {
            statusNote.innerText = "HTML 파일을 직접 열면(file://) JSON 을 읽을 수 없어요. Live Server 로 열어 주세요.";
        }

        render();
        drawMarkers();

        // 주소 뒤에 #성동구 처럼 붙어 있으면 그 구를 바로 선택
        // ※ 수업 외: location.hash, decodeURIComponent (한글 주소 되돌리기)
        const name = decodeURIComponent(location.hash.replace("#", ""));
        if (GU_CENTER[name]) selectDistrict(name);
    });
}

start();
