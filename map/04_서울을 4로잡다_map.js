/* 서울 지도 페이지
   - 데이터: 팀 JSON 4개 (전시, 공연, 팝업, 이벤트)와 장소 좌표 JSON(venues) 1개
   - 지도 위치: 장소 이름 -> 좌표 표(venues.json)로 정확한 위치에 마커를 찍도록 함.
   - 로그인 및 찜: common.js 의 SceneSeoul 함수 사용
   - 카드: category.css 의 공통 카드(.ss-card) 사용
   - 수업 외: 해당 줄에 표시해 둠 */

/* 01. 설정 */

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

// 서울 25개 행정구 좌표 [위도, 경도]
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

// 장소 좌표 표 (JSON)
// JSON 의 location 글자 안에 name 이 들어 있으면 그 좌표에 마커를 찍음.
const VENUE_FILE = "../data/04_서울을 4로잡다_venues.json";

/* 02. 상태 변수 */

let allItems = [];          // 불러온 전체 콘텐츠 (전시 · 공연 · 팝업 · 이벤트 JSON)
let currentDistrict = "";   // 선택한 구 ("" 이면 서울 전체)
let currentType = "all";    // 선택한 카테고리
let keyword = "";           // 검색어
let loading = true;         // 데이터를 불러오는 중인지
let map = null;             // Leaflet 지도 (지도를 불러오지 못하면 null)
let markerLayer = null;     // 마커를 모아두는 레이어
let venues = [];            // 장소 좌표 표 (venues.json 에서 불러옴)

/* 03. 요소 가져오기 */

const districtSelect = document.getElementById("district-select");
const resultTitle = document.getElementById("result-title");
const resultCount = document.getElementById("result-count");
const cardBox = document.getElementById("map-cards");
const searchInput = document.getElementById("search-input");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const filterButtons = document.querySelectorAll(".ss-filters button[data-filter]");

/* 04. 작은 도우미 함수 */

// text 안에 word 가 들어 있는지 확인
// replace 로 word 를 지워 봤을 때 글자가 달라지면 들어 있는 것
function hasText(text, word) {
    return text.replace(word, "") !== text;
}

// 오늘 날짜 (시간은 0시로)
// set 사용
function getToday() {
    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);
    return today;
}

// "2026-11-10" -> Date
// 수업 외: new Date(연, 월, 일) (사용 이유: set 으로 하면 월이 넘어가는 문제 발생), 글자에 slice 사용 (사용 이유: 연, 월, 일만 잘라 내기 위함)
function toDate(dateText) {
    const y = parseInt(dateText.slice(0, 4));
    const m = parseInt(dateText.slice(5, 7));
    const d = parseInt(dateText.slice(8, 10));
    return new Date(y, m - 1, d);
}

// 장소 앞에 구 이름 붙이기 (주소에 이미 구 이름이 있으면 그대로) — 카드, 말풍선, 검색에서 같이 쓰기
function getPlaceText(item) {
    if (item.gu !== "" && !hasText(item.place, item.gu)) {
        return item.gu + " · " + item.place;
    }
    return item.place;
}

/* 05. 데이터 정리 */

// 장소 이름으로 좌표 표(venues)에서 찾기 (없으면 null)
function findVenue(text) {
    for (const venue of venues) {
        if (hasText(text || "", venue.name)) {
            return venue;
        }
    }
    return null;
}

// 지도에서 쓰는 데이터
function toItem(data) {
    const venue = findVenue(data.location);

    // 구 이름과 위치는 장소 표(venues.json)에서 가져오기 (표에 없으면 목록에만 나옴.)
    let gu = "";
    let lat = null;
    let lng = null;
    if (venue !== null) {
        gu = venue.district;
        lat = venue.lat;
        lng = venue.lng;
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
        lat: lat,
        lng: lng
    };
}

// 정렬에 쓸 날짜를 만들고, 이미 끝난 콘텐츠는 뺀다
function cleanUp(list) {
    const today = getToday();
    const result = [];

    for (const item of list) {
        item.start = toDate(item.startDate);

        // 종료일이 빈 문자열이면 상시 운영 → 아주 먼 날짜로 두고 정렬할 때 맨 뒤로
        if (item.endDate !== "") {
            item.end = toDate(item.endDate);
        } else {
            item.end = toDate("9999-12-31");
        }

        if (item.end >= today) {        // 오늘 이후에 끝나는 것만 담는다
            result.push(item);
        }
    }
    return result;
}

// 진행 중인 것(곧 끝나는 순) -> 예정인 것(곧 시작하는 순)
function sortItems(list) {
    const today = getToday();
    // 수업 외: sort 에 비교 함수 넣기 (음수면 a 를 앞으로, 양수면 b 를 앞으로)
    return list.sort(function (a, b) {
        const aOn = a.start <= today;
        const bOn = b.start <= today;

        if (aOn && !bOn) return -1;    // 진행 중인 것을 앞으로
        if (!aOn && bOn) return 1;
        if (aOn) return a.end - b.end;  // 둘 다 진행 중이면 곧 끝나는 순
        return a.start - b.start;       // 둘 다 예정이면 곧 시작하는 순
    });
}

/* 06. 로그인 및 찜 (common.js 사용) */
// 하트 모양도 common.js 의 updateHearts() 가 맞춰 줌.
// 이건 "저장한 것"을 보고 있을 때 목록을 다시 그리는 일만 함.
function refreshSavedCards() {
    if (currentType === "saved") {
        updateList();
    }
}

/* 07. 목록 걸러내기 */

// withDistrict: true 면 고른 구까지 거름(카드 목록), false 면 서울 전체(지도 마커)
function getFiltered(withDistrict) {
    return allItems.filter(function (item) {
        if (withDistrict && currentDistrict !== "" && item.gu !== currentDistrict) return false;

        if (currentType === "saved") {
            if (!SceneSeoul.isSaved(item.id)) return false;
        } else if (currentType !== "all" && item.type !== currentType) {
            return false;
        }

        // 검색어가 카드에 보이는 글자(제목 + 구 이름 + 장소)에 들어 있는 것만
        if (keyword !== "" && !hasText(item.title + " " + getPlaceText(item), keyword)) return false;
        return true;
    });
}

/* 08. 포스터 카드 (category.css 공통 카드) */

// 공통 카드 구조 (클래스는 모두 팀 공통 category.css 에 정의된 것을 그대로 사용)
// pop-card-* 도 category.css 의 공통 카드 클래스다 (팝업 페이지 전용 아님)
// 장소는 글자가 길면 … 으로 줄여 주는 .pop-card-place 를 쓰기
function makeCard(item) {
    const card = document.createElement("article");
    card.className = "ss-card";

    // 포스터 + 하트
    const imageBox = document.createElement("div");
    imageBox.className = "ss-card-image";

    // 포스터가 없거나 깨지면 브라우저가 이미지 제목을 보여주기
    const img = document.createElement("img");
    img.alt = item.title + " 포스터";
    if (item.img !== "") {
        img.src = item.img;
    }

    // 공통 하트: data-save-id 가 있으면 common.js 의 updateHearts() 가 체크 상태를 맞춰줌.
    const heart = document.createElement("label");
    heart.className = "ss-heart-toggle";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.setAttribute("data-save-id", item.id);
    check.setAttribute("aria-label", item.title + " 저장");
    check.checked = SceneSeoul.isSaved(item.id);

    // 저장과 취소는 common.js 가 처리
    check.addEventListener("change", function () {
        SceneSeoul.toggleSaved(item.id);
        refreshSavedCards();   // "저장한 것"을 보고 있으면 바로 다시 그림
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
    const title = document.createElement("h3");
    title.className = "ss-card-title";
    title.innerText = item.title;

    const place = document.createElement("p");
    place.className = "pop-card-place";
    place.innerText = getPlaceText(item);

    const period = document.createElement("p");
    period.className = "pop-card-period";
    period.innerText = SceneSeoul.formatPeriod(item);

    info.appendChild(top);
    info.appendChild(title);
    info.appendChild(place);
    info.appendChild(period);

    card.appendChild(imageBox);
    card.appendChild(info);

    // 카드 전체를 누르면 원문 페이지로 (하트는 링크보다 위에 있어서 따로 눌림)
    if (item.url !== "") {
        const link = document.createElement("a");
        link.className = "pop-card-link";
        link.href = item.url;
        link.target = "_blank";
        link.setAttribute("aria-label", item.title + " 자세히 보기");
        card.appendChild(link);
    }
    return card;
}

function render() {
    const list = sortItems(getFiltered(true));

    if (currentDistrict !== "") {
        resultTitle.innerText = currentDistrict;
    } else {
        resultTitle.innerText = "서울 전체";
    }
    if (loading && list.length === 0) {
        resultCount.innerText = "";
    } else {
        resultCount.innerText = `총 ${list.length}개`;
    }

    cardBox.innerHTML = "";
    if (list.length === 0) {
        const empty = document.createElement("p");
        empty.className = "map-cards-empty";
        if (loading) {
            empty.innerText = "콘텐츠를 불러오는 중이에요...";
        } else if (currentType === "saved" && SceneSeoul.getUser() !== "") {
            empty.innerText = "저장한 콘텐츠가 없어요. 마음에 드는 카드의 하트를 눌러보세요.";
        } else if (currentType === "saved") {
            empty.innerText = "로그인하면 하트로 저장한 콘텐츠를 모아볼 수 있어요.";
        } else {
            empty.innerText = "조건에 맞는 콘텐츠가 없어요.";
        }
        cardBox.appendChild(empty);
        return;
    }

    // 카드는 한 줄에 모두 그리고, 좌우 스크롤로 보기
    for (const item of list) {
        cardBox.appendChild(makeCard(item));
    }
}

// 카테고리, 검색어, 찜이 바뀌었을 때: 목록과 지도 마커를 함께 다시 그리기
function updateList() {
    render();
    cardBox.scrollLeft = 0;  // 수업 외: scrollLeft
    drawMarkers();
}


/* 09. 지도 */

// 수업 외: Leaflet 라이브러리 (L.map, L.tileLayer, L.circleMarker, bindPopup, flyTo)
function initMap() {
    map = L.map("leaflet-map").setView(SEOUL_CENTER, 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
}

// 마커를 눌렀을 때 뜨는 말풍선 내용 (요소로 만들어 넣으면 제목에 태그가 있어도 실행되지 않음.)
function makeMarkerPopup(item) {
    const box = document.createElement("div");

    const label = document.createElement("span");
    label.className = "marker-type";
    label.innerText = TYPE_LABEL[item.type];

    const name = document.createElement("strong");
    name.innerText = item.title;

    const place = document.createElement("div");
    place.className = "marker-place";
    place.innerText = getPlaceText(item);

    const date = document.createElement("div");
    date.innerText = SceneSeoul.formatPeriod(item);

    box.appendChild(label);
    box.appendChild(name);
    box.appendChild(place);
    box.appendChild(date);

    if (item.url !== "") {
        const link = document.createElement("a");
        link.className = "marker-link";
        link.href = item.url;
        link.target = "_blank";
        link.innerText = "자세히 보기 ↗";
        box.appendChild(link);
    }
    return box;
}

// 콘텐츠 하나를 마커로 찍기
function addMarker(item) {
    const marker = L.circleMarker([item.lat, item.lng], {
        radius: 7,
        color: "#FFFFFF",
        weight: 2,
        fillColor: TYPE_COLOR[item.type],
        fillOpacity: 0.95
    });

    // 말풍선 내용은 마커를 눌렀을 때 만들기.
    marker.bindPopup(function () {
        return makeMarkerPopup(item);
    });

    // 마커를 누르면 그 구의 목록으로 바꾸기 (마커가 있는 콘텐츠는 항상 구 이름이 있음.)
    marker.on("click", function () {
        if (item.gu !== currentDistrict) {
            selectDistrict(item.gu, true);
        }
    });
    marker.addTo(markerLayer);
}

// 카테고리, 검색어에 맞는 항목을 마커로 찍기 (구 선택과는 상관없이 서울 전체)
function drawMarkers() {
    if (markerLayer === null) return;   // 지도를 불러오지 못했으면 목록만 보여줌

    markerLayer.clearLayers();
    for (const item of getFiltered(false)) {
        if (item.lat !== null) {  // 위치를 모르는 콘텐츠는 목록에만 나옴.
            addMarker(item);
        }
    }
}


/* 10. 구 선택 */

// 드롭다운에 옵션 하나 추가 (value 가 "" 이면 서울 전체)
function makeOption(text, gu) {
    const option = document.createElement("option");
    option.value = gu;
    option.innerText = text;
    districtSelect.appendChild(option);
}

function makeOptions() {
    makeOption("서울 전체", "");
    for (const gu in GU_CENTER) {
        makeOption(gu, gu);
    }
}

function selectDistrict(gu, fromMarker) {
    currentDistrict = gu;

    districtSelect.value = gu;  // 마커로 고른 경우에도 드롭다운 표시 맞추기
    render();
    cardBox.scrollLeft = 0;  // 수업 외: scrollLeft

    // 마커를 눌렀을 땐 말풍선이 열려 있으니 지도를 움직이지 않기
    if (fromMarker !== true && map !== null) {
        if (gu !== "") {
            map.flyTo(GU_CENTER[gu], 13);
        } else {
            map.flyTo(SEOUL_CENTER, 11);
        }
    }
}


/* 11. 이벤트 등록 */

// 드롭다운에서 구를 고르면 그 구로 이동
districtSelect.addEventListener("change", function () {
    selectDistrict(districtSelect.value);
});

// 선택된 카테고리 버튼
function markActiveFilter() {
    for (const button of filterButtons) {
        if (button.getAttribute("data-filter") === currentType) {
            button.setAttribute("aria-pressed", "true");
        } else {
            button.setAttribute("aria-pressed", "false");
        }
    }
}

// 카테고리 필터
for (const button of filterButtons) {
    button.addEventListener("click", function () {
        currentType = button.getAttribute("data-filter");
        markActiveFilter();
        updateList();
    });
}

// 검색
// 수업 외: input 이벤트 (글자를 입력하거나 지울 때마다 발생)
searchInput.addEventListener("input", function () {
    keyword = searchInput.value;
    updateList();
});

// 카드 좌우 이동
prevBtn.addEventListener("click", function () {
    cardBox.scrollLeft -= 480;    // 수업 외: scrollLeft
});
nextBtn.addEventListener("click", function () {
    cardBox.scrollLeft += 480;    // 수업 외: scrollLeft
});

// 로그인 및 로그아웃했을 때 "저장한 것" 목록을 맞추기
// 수업 외: 직접 만든 이벤트
window.addEventListener("scene:login", refreshSavedCards);


/* 12. 데이터 불러오기 */

// 장소 좌표 표를 먼저 읽기 (실패해도 목록은 보여줄 수 있으므로 그대로 진행)
function loadVenues(done) {
    fetch(VENUE_FILE)
        .then(response => response.json())
        .then(list => {
            venues = list;
        })
        .catch(error => {
            console.error("장소 좌표를 불러오지 못했어요:", error);
        })
        .then(() => {
            done();
        });
}

// 지도에 쓰는 팀 JSON 4개
const DATA_FILES = [
    "../data/04_서울을 4로잡다_exhibition.json",
    "../data/04_서울을 4로잡다_performance.json",
    "../data/04_서울을 4로잡다_popup.json",
    "../data/04_서울을 4로잡다_event.json"
];

// 파일 하나가 실패해도 나머지는 그대로 보여주기
function loadAllItems(done) {
    let all = [];
    let left = DATA_FILES.length;   // 아직 다 읽지 못한 파일 수

    for (const file of DATA_FILES) {
        fetch(file)
            .then(response => response.json())
            .then(list => {
                all = all.concat(list);
            })
            .catch(error => {
                console.error("데이터를 불러오지 못했어요:", file, error);
            })
            .then(() => {
                left--;
                if (left === 0) done(all);   // 4개 모두 끝나면 한 번만 실행
            });
    }
}


/* 13. 시작 */

function start() {
    // 지도 라이브러리를 불러오지 못해도(인터넷 연결 끊김 등) 아래 목록은 보이도록
    if (typeof L !== "undefined") {
        initMap();
    }
    makeOptions();
    selectDistrict("", true);

    // 장소 좌표 → 팀 JSON 4개 순서로 읽은 뒤 목록과 마커를 그리기
    loadVenues(function () {
        loadAllItems(function (list) {
            allItems = cleanUp(list.map(toItem));
            loading = false;

            render();
            drawMarkers();
        });
    });
}

start();
