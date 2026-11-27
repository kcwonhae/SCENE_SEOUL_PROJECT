
/* ==========================================
   SCENE:SEOUL - HOME INTERACTION
   04_서울을 4로잡다_index.js
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    /* ======================================
       01. ELEMENTS
    ====================================== */

    const film = document.querySelector(".season-film");
    const sticky = document.querySelector(".season-film-sticky");

    const scenes = document.querySelectorAll(
        ".season-film .season-scene"
    );

    const copyWrap = document.querySelector(
        ".season-copy-wrap"
    );

    const skipButton = document.querySelector(
        ".season-skip"
    );

    const progressBar = document.querySelector(
        ".season-progress span"
    );

    const recommendation = document.querySelector(
        ".edition-next"
    );

    const playLink = document.querySelector(
        ".edition-next-play-link"
    );

    const revealItems = document.querySelectorAll(
        ".reveal"
    );

    const sceneCards = document.querySelectorAll(
        ".scenes .scene-card"
    );

    const heading = document.querySelector(
        ".scenes .section-heading"
    );

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    document.body.classList.add("js-ready");

    /* ======================================
       02. HELPERS
    ====================================== */

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function smoothstep(value) {
        const t = clamp(value, 0, 1);

        return t * t * (3 - 2 * t);
    }

    function fadeBetween(progress, start, end) {
        return smoothstep(
            (progress - start) / (end - start)
        );
    }

    /* ======================================
       03. FOUR SCENES — SMOOTH CROSSFADE
       화면 경계 없이 자연스럽게 겹쳐진다.
    ====================================== */
    function showScenes(progress) {
        if (scenes.length !== 4) return;

        const blend01 = fadeBetween(progress, 0.16, 0.275);
        const blend12 = fadeBetween(progress, 0.34, 0.455);
        const blend23 = fadeBetween(progress, 0.52, 0.635);

        const opacities = [
            1 - blend01,
            blend01 * (1 - blend12),
            blend12 * (1 - blend23),
            blend23
        ];

        scenes.forEach(function (scene, index) {
            scene.style.opacity = opacities[index].toFixed(4);
            const zoom = 1.060 - progress * 0.045;
            scene.style.transform = "scale(" + zoom.toFixed(4) + ")";
        });
    }

    /* ======================================
       04. EDIT — SCRUBBABLE ENTER / EXIT
       검정 → 하얀 종이(아래에서 위로 드러남)
       라벨 → 제목 두 줄 → 화살표 순차 등장
       FIND YOUR SCENE 진입 직전 SVG만 서서히 옅어짐
       역방향 스크롤 시 모든 효과가 되돌아간다.
    ====================================== */
    const editLabel = document.querySelector(".edition-next-index");
    const editLines = document.querySelectorAll(".edition-next-line");
    const skyline = document.querySelector(".edition-next-background");
    const introOverlay = document.querySelector(".season-film-overlay");

    function setRise(element, amount, distance) {
        if (!element) return;
        element.style.opacity = amount.toFixed(4);
        element.style.transform =
            "translate3d(0," + ((1 - amount) * distance).toFixed(2) + "px,0)";
    }

    function showRecommendation(progress) {
        if (!recommendation) return;

        /* 이벤트 사진이 먼저 천천히 어두워지고,
           그 자리에 순백 EDIT 지면이 opacity로 등장한다.
           아래→위 와이프, 프레임 축소, 갑작스러운 display 전환은 없음. */
        const imageOut = 1 - fadeBetween(progress, 0.755, 0.905);
        const paperIn = fadeBetween(progress, 0.790, 0.930);

        /* EDIT 타이포 등장 애니메이션은 그대로 유지.
           FIND YOUR SCENE으로 넘어갈 때 제목과 CTA는 사라지지 않음. */
        const labelIn = fadeBetween(progress, 0.825, 0.885);
        const line1In = fadeBetween(progress, 0.845, 0.915);
        const line2In = fadeBetween(progress, 0.865, 0.935);
        const ctaIn = fadeBetween(progress, 0.89, 0.95);

        const visual = document.querySelector(".season-visual");
        if (visual) visual.style.opacity = imageOut.toFixed(4);
        recommendation.classList.toggle("is-visible", paperIn > 0.001);
        recommendation.style.opacity = paperIn.toFixed(4);
        recommendation.style.clipPath = "none";

        setRise(editLabel, labelIn, 18);
        setRise(editLines[0], line1In, 22);
        setRise(editLines[1], line2In, 22);
        setRise(playLink, ctaIn, 18);

        /* 스카이라인만 점점 옅어짐: 등장 직후 뚜렷하게 보였다가
           EDIT 마지막 구간에서 0으로 감소. 역스크롤도 자연스럽게 복원. */
        if (skyline) {
            const skylineOut = 1 - fadeBetween(progress, 0.925, 1.0);
            skyline.style.opacity = (paperIn * 0.40 * skylineOut).toFixed(4);
        }

        const introVisible = 1 - fadeBetween(progress, 0.745, 0.855);
        setRise(copyWrap, introVisible, 10);
        if (introOverlay) introOverlay.style.opacity = introVisible.toFixed(4);

        if (skipButton) {
            skipButton.style.opacity = introVisible.toFixed(4);
            skipButton.style.pointerEvents = introVisible < 0.1 ? "none" : "auto";
            skipButton.tabIndex = introVisible < 0.1 ? -1 : 0;
        }

        if (progressBar) {
            progressBar.style.opacity = (1 - paperIn).toFixed(4);
        }

        const canClick = paperIn > 0.99 && ctaIn > 0.5;
        recommendation.style.pointerEvents = canClick ? "auto" : "none";
        recommendation.setAttribute("aria-hidden", String(!canClick));
        if (playLink) playLink.tabIndex = canClick ? 0 : -1;
    }

    /* ======================================
       05. SKIP BUTTON

       누르면 EDIT 화면으로 이동
    ====================================== */

    function initSkipButton() {
        if (!film || !sticky || !skipButton) return;

        /* 안내 문구 그대로 다음 장면으로 한 단계씩 이동한다.
           마지막 이벤트에서 누르면 EDIT로 이동한다. */
        const stops = [0.23, 0.41, 0.59, 0.92];

        skipButton.addEventListener("click", function () {
            const filmTop = film.getBoundingClientRect().top + window.scrollY;
            const scrollLength = Math.max(1, film.offsetHeight - sticky.offsetHeight);
            const progress = clamp((window.scrollY - filmTop) / scrollLength, 0, 1);
            const next = stops.find(function (point) {
                return point > progress + 0.008;
            });
            if (next === undefined) return;
            window.scrollTo({
                top: filmTop + scrollLength * next,
                behavior: reduceMotion ? "auto" : "smooth"
            });
        });
    }

    /* ======================================
       06. GENERAL SCROLL REVEAL
    ====================================== */

    function showOtherSections() {

        revealItems.forEach(function (item) {

            const rect = item.getBoundingClientRect();

            if (
                rect.top <
                window.innerHeight * 0.88
            ) {

                item.classList.add("visible");
            }
        });
    }

    /* ======================================
       07. FIND YOUR SCENE — EDITORIAL IMAGE REVEAL

       화면에 들어올 때 사진이 아래부터 열리고,
       위로 되돌리면 똑같은 경로로 닫힌다.
       카드 전체는 움직이지 않아 기존 비대칭 그리드 유지.
    ====================================== */

    function initSceneReveal() {
        if (reduceMotion) {
            if (heading) {
                heading.style.opacity = "1";
                heading.style.transform = "none";
            }
            sceneCards.forEach(function (card) {
                card.classList.add("scene-reveal");
                const img = card.querySelector(".scene-art img");
                const meta = card.querySelector(".scene-meta");
                if (img) {
                    img.style.clipPath = "none";
                    img.style.webkitClipPath = "none";
                }
                if (meta) {
                    meta.style.opacity = "1";
                    meta.style.transform = "none";
                }
            });
            return;
        }
        sceneCards.forEach(function (card) {
            card.classList.add("scene-reveal");
        });
    }

    function updateSceneReveal() {
        if (reduceMotion) return;

        const vh = window.innerHeight;

        function revealAmount(element, stagger) {
            const rect = element.getBoundingClientRect();
            /* 아래쪽에서 등장, 카드별 5vh의 순차 지연 */
            const start = vh * (0.98 - stagger);
            const end = vh * (0.61 - stagger);
            const entering = 1 - smoothstep(
                (rect.top - end) / (start - end)
            );
            /* 상단을 지나 화면 밖으로 나가면 서서히 가려짐 */
            const exiting = smoothstep(
                (rect.bottom + vh * 0.04) / (vh * 0.26)
            );
            return clamp(Math.min(entering, exiting), 0, 1);
        }

        if (heading) {
            const h = revealAmount(heading, 0);
            heading.style.opacity = h.toFixed(4);
            heading.style.transform =
                "translate3d(0," + ((1 - h) * 18).toFixed(2) + "px,0)";
        }

        sceneCards.forEach(function (card, index) {
            const image = card.querySelector(".scene-art img");
            const meta = card.querySelector(".scene-meta");
            const amount = revealAmount(card, Math.min(index, 3) * 0.045);
            /* 상단 100% 가림 -> 0% 가림 */
            const clip = "inset(" + ((1 - amount) * 100).toFixed(3) + "% 0 0 0)";
            if (image) {
                image.style.clipPath = clip;
                image.style.webkitClipPath = clip;
            }
            if (meta) {
                const textAmount = smoothstep((amount - 0.33) / 0.67);
                meta.style.opacity = textAmount.toFixed(4);
                meta.style.transform = "translate3d(0," +
                    ((1 - textAmount) * 12).toFixed(2) + "px,0)";
            }
        });
    }

    /* ======================================
       08. SCROLL PROGRESS CALCULATION
    ====================================== */

    function update() {

        if (
            film &&
            sticky &&
            scenes.length === 4
        ) {

            const filmTop =
                film.getBoundingClientRect().top +
                window.scrollY;

            const scrollLength =
                film.offsetHeight -
                sticky.offsetHeight;

            const scrolled =
                window.scrollY -
                filmTop;

            const progress = clamp(
                scrolled / Math.max(1, scrollLength),
                0,
                1
            );

            /* 이미지 */

            showScenes(progress);

            /* EDIT 화면 */

            showRecommendation(progress);

            /* Header always stays on its own light bar above the photographs. */


            /* 진행 바 */

            if (progressBar) {

                progressBar.style.width =
                    (progress * 100) + "%";
            }
        }

        showOtherSections();
        updateSceneReveal();
    }

    /* ======================================
       09. SCROLL PERFORMANCE
    ====================================== */

    let ticking = false;

    function requestUpdate() {

        if (ticking) {
            return;
        }

        ticking = true;

        window.requestAnimationFrame(
            function () {

                update();

                ticking = false;
            }
        );
    }

    /* ======================================
       10. INITIALIZE
    ====================================== */

    initSkipButton();

    initSceneReveal();

    window.addEventListener(
        "scroll",
        requestUpdate,
        { passive: true }
    );

    window.addEventListener(
        "resize",
        requestUpdate
    );

    window.addEventListener(
        "pageshow",
        requestUpdate
    );

    update();

});


/* ==========================================
   HOME / MY CALENDAR — UPCOMING EVENTS
   기존 SceneSeoul 로그인 및 찜 저장 API 그대로 재사용.
========================================== */
document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const area = document.querySelector(".agenda-section");
    const list = document.querySelector("#agendaList");
    if (!area || !list) return;

    const sources = [
        { category: "전시", path: "../data/04_서울을 4로잡다_exhibition.json", page: "../exhibition/04_서울을 4로잡다_exhibition.html" },
        { category: "공연", path: "../data/04_서울을 4로잡다_performance.json", page: "../performance/04_서울을 4로잡다_performance.html" },
        { category: "팝업", path: "../data/04_서울을 4로잡다_popup.json", page: "../popup/04_서울을 4로잡다_popup.html" },
        { category: "이벤트", path: "../data/04_서울을 4로잡다_event.json", page: "../event/04_서울을 4로잡다_event.html" }
    ];

    // 카테고리 페이지 원본 HTML의 실제 목록 앵커를 사용한다.
    // 전시 #ex-list / 공연 #perf-list-title / 팝업 #discover / 이벤트 #event-list
    const categoryAnchors = {
        "전시": "#ex-list",
        "공연": "#perf-list-title",
        "팝업": "#discover",
        "이벤트": "#event-list"
    };

    // 홈 히어로에서 실제 사용하는 네 장의 이미지 중 하나를 대체 이미지로 사용.
    // 같은 콘텐츠는 새로고침해도 동일한 대체 사진이 선택된다.
    const fallbackImages = [
        "../images/04_index_01.png",
        "../images/04_index_02.jpg",
        "../images/04_index_03.png",
        "../images/04_index_04.png"
    ];

    function fallbackImageFor(id) {
        const value = String(id);
        let hash = 0;
        for (const ch of value) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
        return fallbackImages[hash % fallbackImages.length];
    }

    const todayNumber = document.querySelector("#agendaToday");
    const monthLabel = document.querySelector("#agendaMonth");
    const weekdayLabel = document.querySelector("#agendaWeekday");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let displayed = [];
    let lastDateKey = "";

    function startOfToday() {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function localDateKey(date) {
        return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    }

    function renderToday() {
        const now = new Date();
        todayNumber.textContent = String(now.getDate()).padStart(2, "0");
        monthLabel.textContent = String(now.getMonth() + 1);
        weekdayLabel.textContent = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now).toUpperCase();
        lastDateKey = localDateKey(now);
    }

    // Date 생성자에 YYYY-MM-DD 문자열을 직접 넣으면 UTC로 해석될 수 있어
    // 로컬 자정으로 명시적으로 변환한다.
    function parseDate(raw) {
        if (!raw) return null;
        const value = String(raw).trim();
        const match = value.match(/^(\d{4})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);
        if (!match) return null;
        const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
        const date = new Date(y, m - 1, d);
        return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
    }

    function imageUrl(value) {
        const path = String(value || "").trim().replace(/\\/g, "/");
        if (!path) return "";
        if (/^(https?:|data:|blob:|\/)/i.test(path)) return path;
        if (path.startsWith("../")) return path;
        if (path.startsWith("./images/")) return "../" + path.slice(2);
        if (path.startsWith("images/")) return "../" + path;
        if (path.startsWith("./")) return path;
        if (path.includes("/")) return "../" + path;
        return "../images/" + path;
    }

    function safeEventUrl(value) {
        const raw = String(value || "").trim();
        if (!raw) return "";
        try {
            const url = new URL(raw, document.baseURI);
            return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
        } catch (_) {
            return "";
        }
    }

    async function loadSource(source) {
        const response = await fetch(source.path);
        if (!response.ok) throw new Error(source.path + ": " + response.status);
        const json = await response.json();
        const rows = Array.isArray(json) ? json : Object.values(json).find(Array.isArray);
        if (!Array.isArray(rows)) throw new Error(source.path + ": 콘텐츠 목록을 찾을 수 없습니다.");

        return rows.map(function (row) {
            if (!row || typeof row !== "object") return null;
            const begin = parseDate(row.startDate || row.date);
            const finish = parseDate(row.endDate || row.end_date || row.end) || begin;
            if (!begin || !finish || !row.id || !row.title) return null;
            return {
                id: row.id,
                title: String(row.title),
                category: source.category,
                page: source.page,
                // JSON에 실제로 제공된 행사 원본 링크 우선 사용
                url: safeEventUrl(row.officialUrl || row.sourceUrl || row.url || row.link),
                startDate: begin,
                endDate: finish < begin ? begin : finish,
                location: String(row.location || row.venue || ""),
                image: imageUrl(row.image)
            };
        }).filter(Boolean);
    }

    function getSavedIds() {
        if (!window.SceneSeoul || typeof SceneSeoul.getUser !== "function" || !SceneSeoul.getUser()) return [];
        try {
            return (SceneSeoul.getSaved() || []).map(String);
        } catch (error) {
            console.error("찜 목록을 읽을 수 없습니다:", error);
            return [];
        }
    }

    function element(tag, className, content) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (content !== undefined) el.textContent = content;
        return el;
    }

    const heartMarkup = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></svg>';

    function updateHearts() {
        const saved = new Set(getSavedIds());
        list.querySelectorAll(".agenda-heart").forEach(function (btn) {
            const active = saved.has(btn.dataset.id);
            btn.classList.toggle("is-saved", active);
            btn.setAttribute("aria-pressed", String(active));
            btn.setAttribute("aria-label", btn.dataset.title + (active ? " 찜 취소" : " 찜하기"));
            const shape = btn.querySelector("svg");
            if (shape) shape.setAttribute("fill", active ? "currentColor" : "none");
        });
    }

    function toggleHeart(id) {
        if (!window.SceneSeoul || typeof SceneSeoul.getUser !== "function" || !SceneSeoul.getUser()) {
            alert("로그인 후 저장할 수 있어요.");
            return;
        }
        if (typeof SceneSeoul.toggleSaved !== "function") {
            console.error("SceneSeoul.toggleSaved 함수를 찾을 수 없습니다. common.js를 확인해 주세요.");
            return;
        }
        SceneSeoul.toggleSaved(id);
        updateHearts();
    }

    function dateRange(event) {
        const a = event.startDate;
        const b = event.endDate;
        function compact(d) { return String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0"); }
        return compact(a) === compact(b) && a.getFullYear() === b.getFullYear()
            ? compact(a) : compact(a) + " ~ " + compact(b);
    }

    // 행사 카드: JSON의 공식/출처 URL로 이동, URL이 없는 경우만 기존 목록 사용.
    function makeItem(event) {
        const article = element("article", "agenda-item");
        const target = event.url || (event.page + (categoryAnchors[event.category] || ""));
        const thumb = element("a", "agenda-thumb-link");
        thumb.href = target;
        thumb.setAttribute("aria-label", event.title + (event.url ? " 상세 페이지로 이동" : " 전체 목록으로 이동"));
        if (event.url && new URL(target).origin !== window.location.origin) {
            thumb.target = "_blank";
            thumb.rel = "noopener noreferrer";
        }

        const img = element("img");
        const fallbackSrc = fallbackImageFor(event.id);
        img.src = event.image || fallbackSrc;
        img.alt = event.image ? event.title + " 포스터" : event.category + " 대표 이미지";
        img.loading = "lazy";
        img.decoding = "async";
        if (!event.image) img.dataset.fallback = "true";
        img.addEventListener("error", function () {
            if (img.dataset.fallback === "true") {
                img.style.visibility = "hidden";
                thumb.classList.add("is-image-unavailable");
                return;
            }
            img.dataset.fallback = "true";
            img.alt = event.category + " 대표 이미지";
            img.src = fallbackSrc;
        });
        thumb.append(img);

        const poster = element("div", "agenda-poster");

        const info = element("div", "agenda-info");
        const categoryNames = { "전시": "EXHIBITION", "공연": "PERFORMANCE", "팝업": "POP-UP", "이벤트": "EVENT" };
        const category = element("span", "agenda-item-category", categoryNames[event.category] || event.category);
        const title = element("a", "agenda-item-title", event.title);
        title.href = target;
        if (event.url && new URL(target).origin !== window.location.origin) {
            title.target = "_blank";
            title.rel = "noopener noreferrer";
        }
        const location = element("p", "agenda-item-location", event.location || "서울");
        const date = element("time", "agenda-item-date", dateRange(event));
        date.dateTime = localDateKey(event.startDate);

        const heart = element("button", "agenda-heart");
        heart.type = "button";
        heart.dataset.id = event.id;
        heart.dataset.title = event.title;
        heart.innerHTML = heartMarkup;
        heart.addEventListener("click", function () { toggleHeart(event.id); });

        const top = element("div", "agenda-info-top");
        top.append(category);
        info.append(top, title, location, date);
        poster.append(thumb, heart);
        article.append(poster, info);
        return article;
    }

    function renderList() {
        list.replaceChildren();
        if (!displayed.length) {
            list.append(element("p", "agenda-status", "현재 안내할 예정 행사가 없습니다."));
        } else {
            displayed.forEach(function (event) { list.append(makeItem(event)); });
        }
        list.setAttribute("aria-busy", "false");
        updateHearts();
        requestAnimationFrame(function () {
            updateCarouselButtons();
            requestScrollDrivenCarousel();
        });
    }

    // 랜덤 선택 없음: 현재 진행 중인 행사 + 앞으로 열릴 모든 행사를 날짜순으로 나열.
    // 진행 중인 행사는 오늘에서의 거리를 0으로 계산한다.
    function pickUpcoming(events) {
        const today = startOfToday();
        return events.filter(function (event) {
            return event.endDate >= today;
        }).sort(function (a, b) {
            const distanceA = Math.max(0, a.startDate - today);
            const distanceB = Math.max(0, b.startDate - today);
            return distanceA - distanceB
                || a.startDate - b.startDate
                || a.endDate - b.endDate
                || a.title.localeCompare(b.title, "ko");
        });
    }

    const viewport = document.querySelector("#agendaViewport");
    const prevButton = document.querySelector("#agendaPrev");
    const nextButton = document.querySelector("#agendaNext");

    // COMING UP 섹션 전체가 화면에 들어왔을 때만 스티키 고정:
    // 제목·날짜·내 일정 보기는 정지, 카드는 한 칸만 옆으로 이동한다.
    // 마지막에는 스티키가 자연스럽게 풀리고 다음 지도 섹션으로 넘어간다.
    const stickyAgenda = area.querySelector(".agenda-sticky");
    let userControlledCarousel = false;
    let carouselScrollTicking = false;
    let scrollBase = null;

    function carouselMetrics() {
        if (!viewport) return { max: 0, step: 0 };
        const card = list.querySelector(".agenda-item");
        const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
        return {
            max: Math.max(0, viewport.scrollWidth - viewport.clientWidth),
            step: card ? card.getBoundingClientRect().width + gap : 0
        };
    }

    function updateCarouselButtons() {
        if (!viewport || !prevButton || !nextButton) return;
        const canMove = carouselMetrics().max > 3;
        prevButton.disabled = !canMove;
        nextButton.disabled = !canMove;
    }

    function markManualControl() {
        userControlledCarousel = true;
        if (viewport) viewport.classList.remove("is-scroll-driven");
    }

    // 화살표 조작만 순환: 끝에서 다음 클릭 시 처음, 처음에서 이전 클릭 시 끝.
    function stepCarousel(direction) {
        if (!viewport) return;
        const { max, step } = carouselMetrics();
        if (!step || max <= 3) return;
        markManualControl();
        const current = viewport.scrollLeft;
        let target;
        if (direction > 0) {
            target = current >= max - step * 0.45 ? 0 : Math.min(max, current + step);
        } else {
            target = current <= step * 0.45 ? max : Math.max(0, current - step);
        }
        viewport.scrollTo({ left: target, behavior: reduceMotion ? "instant" : "smooth" });
    }

    if (prevButton) prevButton.addEventListener("click", function () { stepCarousel(-1); });
    if (nextButton) nextButton.addEventListener("click", function () { stepCarousel(1); });
    if (viewport) {
        viewport.addEventListener("scroll", updateCarouselButtons, { passive: true });
        viewport.addEventListener("pointerdown", markManualControl, { passive: true });
        viewport.addEventListener("touchstart", markManualControl, { passive: true });
        viewport.addEventListener("keydown", function (event) {
            if (event.target !== viewport) return;
            if (event.key === "ArrowRight") { event.preventDefault(); stepCarousel(1); }
            if (event.key === "ArrowLeft") { event.preventDefault(); stepCarousel(-1); }
        });
    }

    function updateScrollDrivenCarousel() {
        carouselScrollTicking = false;
        if (!area || !viewport || !stickyAgenda) return;

        const { max, step } = carouselMetrics();
        const enabled = !reduceMotion && max > 3 && step > 0 && displayed.length > 3;
        area.classList.toggle("has-carousel-motion", enabled);
        if (!enabled) {
            area.classList.remove("is-carousel-pinned");
            viewport.classList.remove("is-scroll-driven");
            return;
        }

        const rect = area.getBoundingClientRect();
        // 고정은 섹션의 상단이 헤더 하단에 도달한 순간부터 시작.
        const headerHeight = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue("--ss-header-height")) || 76;
        const scrollDistance = Math.max(1, area.offsetHeight - stickyAgenda.offsetHeight);
        const progress = Math.max(0, Math.min(1, (headerHeight - rect.top) / scrollDistance));
        const pinned = rect.top <= headerHeight + 1 && rect.bottom > headerHeight + stickyAgenda.offsetHeight + 1;
        // 고정 중에는 마우스를 올리지 않아도 기존 < > 버튼을 표시.
        area.classList.toggle("is-carousel-pinned", pinned);

        if (userControlledCarousel) {
            viewport.classList.remove("is-scroll-driven");
            return;
        }
        if (scrollBase === null) scrollBase = viewport.scrollLeft;
        const eased = progress * progress * (3 - 2 * progress);
        viewport.classList.add("is-scroll-driven");
        viewport.scrollLeft = Math.min(max, scrollBase + step * eased);
    }

    function requestScrollDrivenCarousel() {
        if (carouselScrollTicking) return;
        carouselScrollTicking = true;
        window.requestAnimationFrame(updateScrollDrivenCarousel);
    }

    async function init() {
        renderToday();
        const results = await Promise.allSettled(sources.map(loadSource));
        const loaded = results.flatMap(function (result) { return result.status === "fulfilled" ? result.value : []; });
        results.forEach(function (result, index) {
            if (result.status === "rejected") console.error("행사 JSON 불러오기 실패:", sources[index].path, result.reason);
        });
        const unique = new Map();
        loaded.forEach(function (event) { if (!unique.has(event.id)) unique.set(event.id, event); });
        displayed = pickUpcoming(Array.from(unique.values()));
        if (!loaded.length) {
            list.replaceChildren(element("p", "agenda-status", "일정 데이터를 불러오지 못했어요. Live Server와 data 폴더의 JSON 경로를 확인해 주세요."));
            list.setAttribute("aria-busy", "false");
            return;
        }
        renderList();
    }

    window.addEventListener("scene:login", updateHearts);
    window.addEventListener("scene:saved", updateHearts);
    window.addEventListener("pageshow", updateHearts);
    window.addEventListener("storage", updateHearts);
    window.addEventListener("scroll", requestScrollDrivenCarousel, { passive: true });
    window.addEventListener("resize", function () {
        scrollBase = userControlledCarousel ? scrollBase : null;
        requestScrollDrivenCarousel();
        updateCarouselButtons();
    });
    window.addEventListener("focus", function () {
        if (localDateKey(new Date()) !== lastDateKey) { renderToday(); init(); }
        else updateHearts();
    });
    init();
});


/* ==========================================
   HEADER — 서울 날씨 (Cloudflare Worker API)
========================================== */
const WEATHER_URL = 'https://scene-seoul-weather.kw064753.workers.dev/api/weather';

document.addEventListener('DOMContentLoaded', function () {
    const weatherIcon = document.getElementById('header-weather');
    if (!weatherIcon) return;

    const icons = {
        sun: `<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>`,
        'partly-cloudy': `<path d="M6 3v2M2.5 7l1.4 1.4M10 2v2"></path><path d="M6.5 17.5h11a4 4 0 0 0 .1-8 6.2 6.2 0 0 0-11.4 2.1A3 3 0 0 0 6.5 17.5Z"></path>`,
        cloud: `<path d="M6.5 18h11a4 4 0 0 0 .1-8 6.2 6.2 0 0 0-11.4 2.1A3 3 0 0 0 6.5 18Z"></path>`,
        rain: `<path d="M6.5 15h11a4 4 0 0 0 .1-8 6.2 6.2 0 0 0-11.4 2.1A3 3 0 0 0 6.5 15Z"></path><path d="m8 18-1 3M13 18l-1 3M18 18l-1 3"></path>`,
        snow: `<path d="M6.5 14h11a4 4 0 0 0 .1-8 6.2 6.2 0 0 0-11.4 2.1A3 3 0 0 0 6.5 14Z"></path><path d="M8 17v5M5.5 19.5h5M16 17v5M13.5 19.5h5"></path>`
    };

    async function updateWeather() {
        try {
            const response = await fetch(WEATHER_URL);
            if (!response.ok) throw new Error('HTTP 오류: ' + response.status);
            const weather = await response.json();
            const svg = weatherIcon.querySelector('svg');
            const icon = icons[weather.condition];
            if (!svg || !icon) throw new Error('날씨 아이콘 정보가 올바르지 않습니다.');
            svg.innerHTML = icon;
            const message = `${weather.city} ${weather.description}, ${weather.temperature}°C`;
            weatherIcon.title = message;
            weatherIcon.setAttribute('aria-label', message);
        } catch (error) {
            console.error('날씨 연동 오류:', error);
            weatherIcon.title = '날씨 정보를 불러올 수 없습니다.';
        }
    }
    updateWeather();
    setInterval(updateWeather, 600000);
});


/* LANGUAGE DROPDOWN — embedded from team language.js (no translation) */
// 언어 선택 창 표시 기능 (번역 기능 없음)
(() => {
    const trigger = document.querySelector('.ss-language[aria-expanded]');
    if (!trigger) return;

    const menu = trigger.querySelector('.ss-language-menu');
    if (!menu) return;

    function setOpen(open) {
        trigger.setAttribute('aria-expanded', String(open));
        trigger.classList.toggle('is-open', open);
        menu.hidden = !open;
    }
    trigger.addEventListener('click', event => {
        if (event.target.closest('.ss-language-menu')) return;
        setOpen(menu.hidden);
    });

    trigger.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            setOpen(false);
            trigger.focus();
        } else if (event.target === trigger && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            setOpen(menu.hidden);
        }
    });
    document.addEventListener('click', event => {
        if (!trigger.contains(event.target)) setOpen(false);
    });
})();

