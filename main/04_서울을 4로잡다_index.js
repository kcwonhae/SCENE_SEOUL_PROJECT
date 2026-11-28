// SCENE:SEOUL - 메인(index) 페이지
// 로그인·찜 저장은 common.js(SceneSeoul), 언어 메뉴와 날씨는 공통 language.js, weather.js를 사용함

// HERO, EDIT
const film = document.querySelector(".season-film");
const filmSticky = document.querySelector(".season-film-sticky");
const heroVisual = document.querySelector(".season-visual");
const heroScenes = document.querySelectorAll(".season-scene");
const heroOverlay = document.querySelector(".season-film-overlay");
const heroCopy = document.querySelector(".season-copy-wrap");
const skipButton = document.querySelector(".season-skip");
const progressBar = document.querySelector(".season-progress span");
const edition = document.querySelector(".edition-next");
const editionContent = document.querySelector(".edition-next-content");
const editionLines = document.querySelectorAll(".edition-next-line");
const editionLink = document.querySelector(".edition-next-play-link");
const skyline = document.querySelector(".edition-next-background");

// FIND YOUR SCENE
const sceneHeading = document.querySelector(".scenes .section-heading");
const sceneCards = document.querySelectorAll(".scene-card");

// NOW IN SEOUL
const header = document.querySelector(".ss-header");
const agenda = document.querySelector(".agenda-section");
const agendaSticky = document.querySelector(".agenda-sticky");
const agendaList = document.getElementById("agendaList");
const agendaViewport = document.getElementById("agendaViewport");
const prevButton = document.getElementById("agendaPrev");
const nextButton = document.getElementById("agendaNext");
const monthText = document.getElementById("agendaMonth");
const dayText = document.getElementById("agendaToday");
const weekdayText = document.getElementById("agendaWeekday");

// SEOUL ON THE MAP
const atlas = document.querySelector(".atlas-section");
const atlasOverlay = document.querySelector(".atlas-overlay");

// 수업 외: matchMedia로 운영체제의 '동작 줄이기' 설정을 확인해 켠 사용자는 애니메이션 없이 보여 줌
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const sources = [
    { category: "전시", path: "../data/04_서울을 4로잡다_exhibition.json", page: "../exhibition/04_서울을 4로잡다_exhibition.html#ex-list" },
    { category: "공연", path: "../data/04_서울을 4로잡다_performance.json", page: "../performance/04_서울을 4로잡다_performance.html#perf-list-title" },
    { category: "팝업", path: "../data/04_서울을 4로잡다_popup.json", page: "../popup/04_서울을 4로잡다_popup.html#discover" },
    { category: "이벤트", path: "../data/04_서울을 4로잡다_event.json", page: "../event/04_서울을 4로잡다_event.html#event-list" }
];

const categoryLabels = { "전시": "EXHIBITION", "공연": "PERFORMANCE", "팝업": "POP-UP", "이벤트": "EVENT" };

// NOW IN SEOUL 카드는 카테고리마다 2장씩, 모두 8장
const NOW_CARD_COUNT = 8;
const CARDS_PER_CATEGORY = 2;

// 이미지를 불러오지 못했을 때 쓰는 HERO 이미지 네 장
const fallbackImages = [
    "../images/04_index_01.png",
    "../images/04_index_02.jpg",
    "../images/04_index_03.png",
    "../images/04_index_04.png"
];

const heartSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></svg>';

let nowEvents = [];
let todayKey = "";
let userMovedCarousel = false;
let mapPointer = null;    // 지도 위에 있는 마우스의 마지막 화면 좌표
let ticking = false;


// 스크롤 계산에 쓰는 값

function limit(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// 0~1 값을 처음과 끝이 부드러운 곡선으로 바꿈 (smoothstep)
function ease(value) {
    const t = limit(value, 0, 1);
    return t * t * (3 - 2 * t);
}

// progress가 start에서 end로 가는 동안 0에서 1로 바뀌는 값
function between(progress, start, end) {
    return ease((progress - start) / (end - start));
}

// 아래에서 distance(px)만큼 올라오며 나타나는 효과
function rise(element, amount, distance) {
    element.style.opacity = amount.toFixed(4);
    element.style.transform = "translate3d(0," + ((1 - amount) * distance).toFixed(2) + "px,0)";
}

// HERO 전체 스크롤 길이 중 현재 위치를 0~1로 계산
// 수업 외: getBoundingClientRect()로 요소의 화면 기준 위치를 구해 스크롤 진행률을 계산함
function getFilmProgress() {
    const filmTop = film.getBoundingClientRect().top + window.scrollY;
    const scrollLength = Math.max(1, film.offsetHeight - filmSticky.offsetHeight);
    return {
        top: filmTop,
        length: scrollLength,
        progress: limit((window.scrollY - filmTop) / scrollLength, 0, 1)
    };
}


// HERO: 네 장면 크로스페이드

function updateHeroScenes(progress) {
    const blend01 = between(progress, 0.16, 0.275);
    const blend12 = between(progress, 0.34, 0.455);
    const blend23 = between(progress, 0.52, 0.635);
    const opacities = [
        1 - blend01,
        blend01 * (1 - blend12),
        blend12 * (1 - blend23),
        blend23
    ];
    // 스크롤할수록 1.06배에서 조금씩 축소됨
    const zoom = "scale(" + (1.06 - progress * 0.045).toFixed(4) + ")";

    heroScenes.forEach(function (scene, index) {
        scene.style.opacity = opacities[index].toFixed(4);
        scene.style.transform = zoom;
    });

    progressBar.style.width = (progress * 100) + "%";
}


// EDIT: HERO 마지막 구간(약 75% 이후)에서 사진이 사라지고 흰 화면과 글자가 차례로 등장

function updateEdition(progress) {
    const imageOut = 1 - between(progress, 0.755, 0.905);
    const paperIn = between(progress, 0.79, 0.93);
    const line1In = between(progress, 0.845, 0.915);
    const line2In = between(progress, 0.865, 0.935);
    const linkIn = between(progress, 0.89, 0.95);
    const introVisible = 1 - between(progress, 0.745, 0.855);
    const skylineOut = 1 - between(progress, 0.925, 1);

    heroVisual.style.opacity = imageOut.toFixed(4);
    heroOverlay.style.opacity = introVisible.toFixed(4);
    rise(heroCopy, introVisible, 10);

    skipButton.style.opacity = introVisible.toFixed(4);
    // 수업 외: 조건 ? 참일 때 값 : 거짓일 때 값 (삼항연산자, 이후에도 같은 방식으로 사용)
    skipButton.style.pointerEvents = introVisible < 0.1 ? "none" : "auto";
    skipButton.tabIndex = introVisible < 0.1 ? -1 : 0;
    progressBar.style.opacity = (1 - paperIn).toFixed(4);

    edition.classList.toggle("is-visible", paperIn > 0.001);
    edition.style.opacity = paperIn.toFixed(4);
    rise(editionLines[0], line1In, 22);
    rise(editionLines[1], line2In, 22);
    rise(editionLink, linkIn, 18);

    // 스카이라인은 최대 0.4까지 보였다가 EDIT 끝부분에서 다시 옅어짐
    skyline.style.opacity = (paperIn * 0.4 * skylineOut).toFixed(4);

    // 흰 화면이 다 나타나기 전에는 추천 링크를 누를 수 없게 함
    const canClick = paperIn > 0.99 && linkIn > 0.5;
    edition.style.pointerEvents = canClick ? "auto" : "none";
    edition.setAttribute("aria-hidden", String(!canClick));
    editionLink.tabIndex = canClick ? 0 : -1;
}


// FIND YOUR SCENE: 사진이 아래에서 위로 열리고, 반대로 스크롤하면 다시 닫힘
// 진행률을 스크롤 위치로만 계산해서 위로 올리면 등장 효과도 반대로 적용됨

// 요소가 화면 아래(98%)에서 61% 지점까지 올라오는 동안 0 → 1,
// 화면 위로 빠져나가면 다시 1 → 0이 되는 값
function revealAmount(element, delay) {
    const vh = window.innerHeight;
    const rect = element.getBoundingClientRect();
    const start = vh * (0.98 - delay);
    const end = vh * (0.61 - delay);
    const entering = 1 - ease((rect.top - end) / (start - end));
    const exiting = ease((rect.bottom + vh * 0.04) / (vh * 0.26));
    return Math.min(entering, exiting);
}

function updateSceneReveal() {
    const headingAmount = revealAmount(sceneHeading, 0);
    sceneHeading.style.opacity = headingAmount.toFixed(4);
    sceneHeading.style.transform = "translate3d(0," + ((1 - headingAmount) * 18).toFixed(2) + "px,0)";

    sceneCards.forEach(function (card, index) {
        const image = card.querySelector(".scene-art img");
        const meta = card.querySelector(".scene-meta");
        // 카드마다 화면 높이의 4.5%씩 늦게 시작
        const amount = revealAmount(card, index * 0.045);
        const textAmount = ease((amount - 0.33) / 0.67);

        // 수업 외: clip-path inset()으로 이미지 위쪽을 가리는 비율을 줄여 아래부터 드러나게 함
        image.style.clipPath = "inset(" + ((1 - amount) * 100).toFixed(3) + "% 0 0 0)";
        rise(meta, textAmount, 12);
    });
}


// NOW IN SEOUL: 날짜

// 수업 외: padStart(2, "0")로 한 자리 월·일 앞에 0을 붙여 "2026-01-05" 형식으로 맞춤
function dateKey(date) {
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}

// 오늘 날짜를 월/일 형식으로 표시하고 요일은 영어 대문자로 표시함
function renderToday() {
    const now = new Date();
    monthText.textContent = String(now.getMonth() + 1);
    dayText.textContent = String(now.getDate()).padStart(2, "0");
    weekdayText.textContent = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    todayKey = dateKey(now);
}

// "2026-11-28"을 new Date()에 그대로 넣으면 UTC 기준이 되므로 연, 월, 일을 나눠 한국 시간 자정으로 만듦
function parseDate(text) {
    const parts = text.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// 카드 기간은 POP-UP 카드와 같은 "2026.07.19 ~ 2026.12.14" 형식으로 표시
function formatDate(date) {
    return date.getFullYear() + "." +
        String(date.getMonth() + 1).padStart(2, "0") + "." +
        String(date.getDate()).padStart(2, "0");
}

function formatRange(item) {
    const start = formatDate(item.startDate);
    const end = formatDate(item.endDate);
    return start === end ? start : start + " ~ " + end;
}


// NOW IN SEOUL: JSON 불러오기와 카드 고르기

function loadSource(source) {
    return fetch(source.path)
        .then(function (response) {
            if (!response.ok) {
                throw new Error(source.path + ": " + response.status);
            }
            return response.json();
        })
        .then(function (rows) {
            if (!Array.isArray(rows)) {
                throw new Error(source.path + ": JSON 형식이 배열이 아닙니다.");
            }
            return rows.map(function (row) {
                const url = row.officialUrl || row.sourceUrl || "";
                return {
                    id: row.id,
                    title: row.title,
                    category: source.category,
                    page: source.page,
                    url: url.startsWith("http") ? url : "",
                    startDate: parseDate(row.startDate),
                    endDate: parseDate(row.endDate || row.startDate),
                    location: row.location || "",
                    image: row.image || ""
                };
            });
        });
}

// 종료일이 가까운 순, 같으면 제목 가나다순
function compareEndDate(a, b) {
    return a.endDate - b.endDate || a.title.localeCompare(b.title, "ko");    // 수업 외: 날짜가 같으면 제목을 가나다순으로 비교
}

// 오늘 진행 중인 행사만 남기고, 카테고리마다 종료일이 가까운 2개씩 골라 8장을 만듦
// 한 카테고리만 보이지 않도록 나눠서 고름 (종료일 순으로만 고르면 하루짜리 공연이 대부분을 차지함)
function pickNowEvents(events) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ongoing = events
        .filter(function (item) {
            return item.startDate <= today && item.endDate >= today;
        })
        .sort(compareEndDate);

    let picked = [];
    sources.forEach(function (source) {
        const sameCategory = ongoing.filter(function (item) {
            return item.category === source.category;
        });
        picked = picked.concat(sameCategory.slice(0, CARDS_PER_CATEGORY));
    });

    // 진행 중 행사가 2개보다 적은 카테고리가 있으면 남은 행사 중 종료일이 가까운 순으로 채움
    if (picked.length < NOW_CARD_COUNT) {
        const rest = ongoing.filter(function (item) {
            return !picked.includes(item);
        });
        picked = picked.concat(rest.slice(0, NOW_CARD_COUNT - picked.length));
    }

    return picked.sort(compareEndDate);
}


// NOW IN SEOUL: 카드 만들기

// 같은 행사는 새로고침해도 같은 대체 이미지가 나오도록 id 글자로 번호를 정함
function fallbackImageFor(id) {
    let hash = 0;
    for (const char of id) {
        // 수업 외: >>> 0은 계산 결과를 0 이상의 정수로 바꿔 배열 번호로 쓸 수 있게 함
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    return fallbackImages[hash % fallbackImages.length];
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

// 공식 링크가 있으면 새 탭으로, 없으면 해당 카테고리 목록으로 이동
function setCardLink(link, item) {
    if (item.url) {
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";    // 수업 외: 새 탭으로 연 외부 페이지가 이 페이지에 접근하지 못하게 함
    } else {
        link.href = item.page;
    }
}

function makeAgendaCard(item) {
    const card = makeElement("article", "agenda-item");
    const poster = makeElement("div", "agenda-poster");
    const thumb = makeElement("a", "agenda-thumb-link");
    const image = document.createElement("img");
    const fallbackSrc = fallbackImageFor(item.id);

    setCardLink(thumb, item);
    thumb.setAttribute("aria-label", item.title + (item.url ? " 상세 페이지로 이동" : " 전체 목록으로 이동"));

    let usingFallback = item.image === "";

    image.src = item.image || fallbackSrc;
    image.alt = item.image ? item.title + " 포스터" : item.category + " 대표 이미지";
    image.loading = "lazy";
    image.decoding = "async";

    // 원래 이미지가 안 나오면 대체 이미지로 한 번 바꾸고, 그것도 실패하면 회색 배경만 남김
    image.addEventListener("error", function () {
        if (usingFallback) {
            image.style.visibility = "hidden";
            thumb.classList.add("is-image-unavailable");
            return;
        }
        usingFallback = true;
        image.alt = item.category + " 대표 이미지";
        image.src = fallbackSrc;
    });
    thumb.appendChild(image);

    const heart = makeElement("button", "agenda-heart");
    heart.type = "button";
    // 수업 외: dataset은 data-* 속성으로, 클릭한 하트가 어떤 행사인지 id를 저장해 둠
    heart.dataset.id = item.id;
    heart.dataset.title = item.title;
    heart.innerHTML = heartSvg;

    poster.append(thumb, heart);

    const info = makeElement("div", "agenda-info");
    const infoTop = makeElement("div", "agenda-info-top");
    const title = makeElement("a", "agenda-item-title", item.title);
    const location = makeElement("p", "agenda-item-location", item.location || "서울");
    const date = makeElement("time", "agenda-item-date", formatRange(item));

    infoTop.appendChild(makeElement("span", "agenda-item-category", categoryLabels[item.category]));
    setCardLink(title, item);
    date.dateTime = dateKey(item.startDate);
    info.append(infoTop, title, location, date);

    card.append(poster, info);
    return card;
}

function renderAgenda() {
    agendaList.replaceChildren();    // 수업 외: 기존 카드와 안내 문구를 한 번에 비움

    if (nowEvents.length === 0) {
        agendaList.appendChild(makeElement("p", "agenda-status", "현재 진행 중인 행사가 없습니다."));
    } else {
        nowEvents.forEach(function (item) {
            agendaList.appendChild(makeAgendaCard(item));
        });
    }

    agendaList.setAttribute("aria-busy", "false");
    updateAgendaHearts();

    // 카드가 화면에 그려진 뒤에 카드 너비를 측정해야 하므로 다음 프레임에서 계산
    requestAnimationFrame(function () {
        updateCarouselButtons();
        requestUpdate();
    });
}


// NOW IN SEOUL: 찜하기

// 하트 버튼 모양을 저장된 찜 목록(로그인 사용자 기준)에 맞춤
function updateAgendaHearts() {
    const saved = SceneSeoul.getSaved();

    agendaList.querySelectorAll(".agenda-heart").forEach(function (button) {
        const active = saved.includes(button.dataset.id);
        button.classList.toggle("is-saved", active);
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", button.dataset.title + (active ? " 찜 취소" : " 찜하기"));
        button.querySelector("svg").setAttribute("fill", active ? "currentColor" : "none");
    });
}

// 카드가 JSON으로 다시 만들어져도 동작하도록 목록에 이벤트를 한 번만 등록함
agendaList.addEventListener("click", function (event) {
    // 수업 외: closest()로 클릭한 요소(svg 등)에서 가장 가까운 하트 버튼을 찾음
    const button = event.target.closest(".agenda-heart");
    if (!button) {
        return;
    }
    // toggleSaved()도 로그인을 확인하지만 안내 문구가 달라서 페이지 문구를 먼저 보여 줌
    if (SceneSeoul.getUser() === "") {
        alert("로그인 후에 찜할 수 있어요.");
        return;
    }
    SceneSeoul.toggleSaved(button.dataset.id);
    updateAgendaHearts();
});


// NOW IN SEOUL: 카드 캐러셀

// max: 가로로 스크롤할 수 있는 최대 거리, step: 카드 한 장 + 간격 너비
function getCarouselSize() {
    const card = agendaList.querySelector(".agenda-item");
    const gap = parseFloat(getComputedStyle(agendaList).columnGap) || 0;    // 수업 외: CSS에 적용된 카드 간격(px)을 읽어 옴
    return {
        max: Math.max(0, agendaViewport.scrollWidth - agendaViewport.clientWidth),
        step: card ? card.getBoundingClientRect().width + gap : 0
    };
}

function updateCarouselButtons() {
    const canMove = getCarouselSize().max > 3;
    prevButton.disabled = !canMove;
    nextButton.disabled = !canMove;
}

// 화살표나 마우스로 직접 움직인 뒤에는 페이지 스크롤이 카드 위치를 다시 바꾸지 않도록 함
function stopScrollDrivenCarousel() {
    userMovedCarousel = true;
    agendaViewport.classList.remove("is-scroll-driven");
}

// 화살표: 한 칸씩 이동하고, 끝에서 다음을 누르면 처음으로, 처음에서 이전을 누르면 끝으로 순환
function moveCarousel(direction) {
    const size = getCarouselSize();
    if (!size.step || size.max <= 3) {
        return;
    }
    stopScrollDrivenCarousel();

    const current = agendaViewport.scrollLeft;
    let target;
    if (direction > 0) {
        target = current >= size.max - size.step * 0.45 ? 0 : Math.min(size.max, current + size.step);
    } else {
        target = current <= size.step * 0.45 ? size.max : Math.max(0, current - size.step);
    }
    agendaViewport.scrollTo({ left: target, behavior: reduceMotion ? "instant" : "smooth" });    // 수업 외: 가로 스크롤 위치를 부드럽게 이동
}

// 섹션이 헤더 아래에 고정된 동안 페이지 스크롤 진행률만큼 첫 카드에서 마지막 카드까지 이동
function updateAgendaCarousel() {
    const size = getCarouselSize();
    const enabled = !reduceMotion && size.max > 3 && size.step > 0 && nowEvents.length > 3;

    agenda.classList.toggle("has-carousel-motion", enabled);
    // 노트북처럼 화면 높이가 낮을 때 카드 크기를 줄이는 클래스
    agenda.classList.toggle("is-short-screen", window.innerHeight <= 740);

    if (!enabled) {
        agenda.classList.remove("is-carousel-pinned");
        agendaViewport.classList.remove("is-scroll-driven");
        return;
    }

    const headerHeight = header.offsetHeight;
    const rect = agenda.getBoundingClientRect();
    const stickyHeight = agendaSticky.offsetHeight;
    const scrollDistance = Math.max(1, agenda.offsetHeight - stickyHeight);
    const progress = limit((headerHeight - rect.top) / scrollDistance, 0, 1);
    const pinned = rect.top <= headerHeight + 1 && rect.bottom > headerHeight + stickyHeight + 1;

    // 고정된 동안에는 마우스를 올리지 않아도 화살표를 보여 줌
    agenda.classList.toggle("is-carousel-pinned", pinned);

    // 화살표로 이동한 경우에는 선택한 카드 위치를 유지함
    if (userMovedCarousel) {
        return;
    }
    agendaViewport.classList.add("is-scroll-driven");
    agendaViewport.scrollLeft = size.max * ease(progress);
}

prevButton.addEventListener("click", function () {
    moveCarousel(-1);
});

nextButton.addEventListener("click", function () {
    moveCarousel(1);
});

agendaViewport.addEventListener("pointerdown", stopScrollDrivenCarousel);

agendaViewport.addEventListener("keydown", function (event) {
    if (event.target !== agendaViewport) {
        return;
    }
    if (event.key === "ArrowRight") {
        event.preventDefault();
        moveCarousel(1);
    } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveCarousel(-1);
    }
});


// 아래로 스크롤 버튼: 다음 장면 위치로 한 단계씩 이동하고 마지막에는 EDIT로 이동

skipButton.addEventListener("click", function () {
    const stops = [0.23, 0.41, 0.59, 0.92];
    const hero = getFilmProgress();
    const next = stops.find(function (point) {
        return point > hero.progress + 0.008;
    });

    if (next !== undefined) {
        window.scrollTo({
            top: hero.top + hero.length * next,
            behavior: reduceMotion ? "auto" : "smooth"
        });
    }
});


// SEOUL ON THE MAP: 마우스 위치에 따라 반사광과 지도 이미지를 움직임

// 지도 영역 안에서 마우스의 상대 위치(0~1)를 계산해 CSS 변수로 전달
// 화면 전체 좌표(clientX, clientY)에서 섹션의 시작 위치를 빼야 지도 안의 위치가 됨
function updateMapPointer() {
    if (!mapPointer) {
        return;
    }
    const rect = atlas.getBoundingClientRect();
    const x = limit((mapPointer.x - rect.left) / rect.width, 0, 1);
    const y = limit((mapPointer.y - rect.top) / rect.height, 0, 1);

    // 수업 외: style.setProperty()로 CSS 변수 값을 바꿔 반사광 중심을 마우스 위치로 옮김
    atlas.style.setProperty("--glow-x", (x * 100).toFixed(2) + "%");
    atlas.style.setProperty("--glow-y", (y * 100).toFixed(2) + "%");

    // 지도는 마우스 반대 방향으로 가로 최대 12px, 세로 최대 10px만 움직여 깊이감을 줌
    // 1.04배 확대로 생기는 여유(1366×657 기준 세로 약 11px)보다 작게 잡아 가장자리가 드러나지 않게 함
    if (!reduceMotion) {
        atlas.style.setProperty("--map-shift-x", ((0.5 - x) * 24).toFixed(2) + "px");
        atlas.style.setProperty("--map-shift-y", ((0.5 - y) * 20).toFixed(2) + "px");
        atlas.style.setProperty("--map-scale", "1.04");
    }
}

// 수업 외: pointermove는 마우스가 요소 위에서 움직일 때마다 발생함
atlas.addEventListener("pointermove", function (event) {
    mapPointer = { x: event.clientX, y: event.clientY };
    atlas.classList.add("is-map-active");
    updateMapPointer();
});

// 마우스가 나가면 광택은 사라지고 지도는 0.65초 동안 원래 위치로 돌아감
atlas.addEventListener("pointerleave", function () {
    mapPointer = null;
    atlas.classList.remove("is-map-active");
    atlas.style.setProperty("--map-shift-x", "0px");
    atlas.style.setProperty("--map-shift-y", "0px");
    atlas.style.setProperty("--map-scale", "1");
});


// EDIT 화살표에 마우스를 올리면 제목 두 줄의 색을 서로 바꿈

function setEditionLinkActive(event) {
    editionContent.classList.toggle("is-link-active", event.type === "mouseenter" || event.type === "focus");
}

editionLink.addEventListener("mouseenter", setEditionLinkActive);
editionLink.addEventListener("mouseleave", setEditionLinkActive);
editionLink.addEventListener("focus", setEditionLinkActive);
editionLink.addEventListener("blur", setEditionLinkActive);


// 스크롤 인터랙션: 스크롤 이벤트가 여러 번 와도 화면 갱신은 한 프레임에 한 번만 함

function update() {
    ticking = false;

    const progress = getFilmProgress().progress;
    updateHeroScenes(progress);
    updateEdition(progress);

    if (!reduceMotion) {
        updateSceneReveal();
        rise(atlasOverlay, revealAmount(atlasOverlay, 0), 18);
    }
    updateAgendaCarousel();

    // 마우스를 지도 위에 둔 채 스크롤하면 섹션 위치가 바뀌므로 광택 위치를 다시 계산
    updateMapPointer();
}

function requestUpdate() {
    if (!ticking) {
        ticking = true;
        // 수업 외: requestAnimationFrame은 다음 화면을 그리기 직전에 update를 실행해 중복 계산을 막음
        requestAnimationFrame(update);
    }
}

window.addEventListener("scroll", requestUpdate, { passive: true });    // 수업 외: 스크롤을 막지 않는 리스너라고 알려 스크롤 끊김을 줄임

// 창 크기가 바뀌면 카드 너비와 이동 거리가 달라지므로 다시 계산
window.addEventListener("resize", function () {
    updateCarouselButtons();
    requestUpdate();
});

// 홈은 하트 버튼을 사용해서 로그인이나 저장 상태가 바뀌면 따로 갱신함
// (공통 updateHearts()는 체크박스 하트만 처리함)
// 수업 외: pageshow는 뒤로가기로 돌아왔을 때, storage는 다른 탭에서 저장했을 때 발생함
window.addEventListener("pageshow", function () {
    updateAgendaHearts();
    requestUpdate();
});
window.addEventListener("scene:login", updateAgendaHearts);
window.addEventListener("scene:saved", updateAgendaHearts);
window.addEventListener("storage", updateAgendaHearts);

// 창을 켜 둔 채 날짜가 바뀌었다면 날짜와 카드 목록을 새로 만듦
window.addEventListener("focus", function () {
    if (dateKey(new Date()) !== todayKey) {
        loadAgenda();
    } else {
        updateAgendaHearts();
    }
});


// 초기화

// 수업 외: Promise.allSettled로 JSON 하나를 불러오지 못해도 나머지 행사 목록은 표시함
function loadAgenda() {
    renderToday();

    Promise.allSettled(sources.map(loadSource)).then(function (results) {
        let loaded = [];

        results.forEach(function (result, index) {
            if (result.status === "fulfilled") {
                loaded = loaded.concat(result.value);
            } else {
                console.error("행사 JSON 불러오기 실패:", sources[index].path, result.reason);
            }
        });

        if (loaded.length === 0) {
            agendaList.replaceChildren(makeElement("p", "agenda-status", "일정 데이터를 불러오지 못했어요. Live Server와 data 폴더의 JSON 경로를 확인해 주세요."));
            agendaList.setAttribute("aria-busy", "false");
            return;
        }

        nowEvents = pickNowEvents(loaded);
        renderAgenda();
    });
}

if (!reduceMotion) {
    // JS가 실행될 때만 FIND YOUR SCENE을 숨긴 상태에서 시작 (JS가 없으면 그대로 보임)
    document.body.classList.add("js-ready");
}

loadAgenda();
update();
