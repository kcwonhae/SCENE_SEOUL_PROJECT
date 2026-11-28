// SCENE:SEOUL - 팝업 페이지
// 찜 저장과 하트 상태 맞추기는 common.js(SceneSeoul), 상단 캐러셀은 공통 carousel.js가 담당함

document.addEventListener("DOMContentLoaded", function () {
    const cards = document.getElementById("cards");
    const filters = document.querySelector(".ss-filters");
    const search = document.getElementById("popup-catalog-search");
    const sortSelect = document.getElementById("popup-sort");
    const pager = document.getElementById("popup-pagination");

    const DATA_URL = "../data/04_서울을 4로잡다_popup.json";
    const PAGE_SIZE = 8;

    let popups = [];
    let category = "all";
    let keyword = "";
    let sortType = "latest";
    let page = 1;


    // 오늘 날짜를 JSON과 같은 "YYYY-MM-DD" 형식으로 만듦
    // 수업 외: padStart()로 월·일을 두 자리로 맞춤
    function getTodayText() {
        const today = new Date();
        return today.getFullYear() + "-" +
            String(today.getMonth() + 1).padStart(2, "0") + "-" +
            String(today.getDate()).padStart(2, "0");
    }


    // 카드 만들기

    function makeElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    }

    // "2026.11.04 ~ 2026.12.25" 로 출력
    function formatPeriod(item) {
        const start = item.startDate.replace(/-/g, ".");
        const end = (item.endDate || "").replace(/-/g, ".");

        if (end === "" || end === start) {
            return start;
        }
        return start + " ~ " + end;
    }

    function makeCard(item) {
        const card = makeElement("article", "ss-card");

        // 포스터와 하트
        const imageWrap = makeElement("div", "ss-card-image");
        const image = document.createElement("img");
        image.src = item.image;
        image.alt = item.title + " 포스터";
        image.loading = "lazy";

        // 외부 이미지 주소가 막히면 깨진 이미지 대신 자리표시자를 보여 줌
        image.addEventListener("error", function () {
            // 수업 외: replaceWith()로 img 요소를 자리표시자 div로 바꿈
            image.replaceWith(makeElement("div", "pop-card-image-placeholder", "이미지 준비 중"));
        });

        // common.js의 updateHearts()가 data-save-id를 보고 체크 상태를 맞춰 줌
        const heart = makeElement("label", "ss-heart-toggle");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.saveId = item.id;    // 수업 외: data-save-id 속성으로 행사 id를 저장함
        checkbox.checked = SceneSeoul.isSaved(item.id);
        checkbox.setAttribute("aria-label", item.title + " 관심 팝업 저장");
        const heartIcon = document.createElement("span");
        heartIcon.setAttribute("aria-hidden", "true");
        heart.append(checkbox, heartIcon);

        imageWrap.append(image, heart);

        // 제목, 장소, 기간
        const info = makeElement("div", "ss-card-info");
        const place = item.location;
        info.append(
            makeElement("h3", "pop-card-title", item.title),
            makeElement("p", "pop-card-place", place),
            makeElement("p", "pop-card-period", formatPeriod(item))
        );

        card.append(imageWrap, info);

        // 카드 전체를 덮는 링크. 공식 링크가 없으면 출처 링크를 새 탭으로 엶
        const url = item.officialUrl || item.sourceUrl || "";
        if (url.startsWith("http")) {
            const link = makeElement("a", "pop-card-link");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";    // 수업 외: 새 탭으로 연 외부 페이지가 이 페이지에 접근하지 못하게 함
            link.setAttribute("aria-label", item.title + " 상세 정보 열기 (새 탭)");
            card.appendChild(link);
        }

        return card;
    }


    // 페이지 버튼 만들기

    function makePageButton(number) {
        const button = makeElement("button", "popup-page-button", String(number));
        button.type = "button";
        button.dataset.page = number;
        button.setAttribute("aria-label", number + "페이지");
        if (number === page) {
            button.setAttribute("aria-current", "page");
        }
        return button;
    }

    function makeArrow(symbol, label, targetPage, disabled) {
        const button = makeElement("button", "popup-page-arrow", symbol);
        button.type = "button";
        button.dataset.page = targetPage;
        button.disabled = disabled;
        button.setAttribute("aria-label", label);
        return button;
    }


    // 드롭다운 정렬 기준 적용
    // 날짜가 모두 YYYY-MM-DD 형식이라 문자열 비교만으로 날짜 순서가 맞음
    function applySort(list) {
        const today = getTodayText();

        if (sortType === "ongoing") {
            return list.filter(function (item) {
                return item.startDate <= today && (!item.endDate || today <= item.endDate);
            });
        }

        if (sortType === "closing") {
            // 수업 외: localeCompare()로 두 날짜 문자열의 순서를 비교함
            return list
                .filter(function (item) {
                    return item.endDate && item.endDate >= today;
                })
                .sort(function (a, b) {
                    return a.endDate.localeCompare(b.endDate);
                });
        }

        if (sortType === "upcoming") {
            return list
                .filter(function (item) {
                    return item.startDate > today;
                })
                .sort(function (a, b) {
                    return a.startDate.localeCompare(b.startDate);
                });
        }

        // 최신순: 불러올 때 정렬해 둔 기존 목록 순서를 그대로 사용
        return list;
    }


    // 목록 표시: 카테고리 필터 → 키워드 검색 → 정렬 → 페이지 나누기 순서로 처리

    function render() {
        const searched = popups.filter(function (item) {
            const matchesCategory = category === "all" || item.subCategory === category;
            const searchText = [item.title, item.brand, item.location, item.district, item.description]
                .concat(item.tags || [])
                .join(" ")
                .toLowerCase();    // 영문 검색어는 대소문자를 구분하지 않도록 소문자로 맞춤

            // 수업 외: includes()로 검색어가 문자열 안에 들어 있는지 확인함
            return matchesCategory && searchText.includes(keyword);
        });
        const matched = applySort(searched);

        const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
        page = Math.min(page, totalPages);

        const start = (page - 1) * PAGE_SIZE;
        const pageItems = matched.slice(start, start + PAGE_SIZE);    // 현재 페이지에서 보여줄 8개만 잘라서 가져옴

        cards.replaceChildren();    // 수업 외: 이전에 그린 카드를 한 번에 비움
        if (pageItems.length === 0) {
            cards.appendChild(makeElement("p", "popup-empty", "해당하는 팝업이 없습니다."));
        } else {
            pageItems.forEach(function (item) {
                cards.appendChild(makeCard(item));
            });
        }

        pager.replaceChildren();
        if (totalPages > 1) {
            pager.appendChild(makeArrow("‹", "이전 페이지", page - 1, page === 1));
            for (let number = 1; number <= totalPages; number++) {
                pager.appendChild(makePageButton(number));
            }
            pager.appendChild(makeArrow("›", "다음 페이지", page + 1, page === totalPages));
        }
    }

    function showError(message) {
        cards.replaceChildren(makeElement("p", "popup-empty", message));
        pager.replaceChildren();
    }


    // 이벤트 처리

    // 필터·검색어·정렬 기준을 바꾸면 첫 페이지부터 다시 보여 줌
    filters.addEventListener("click", function (event) {
        // 수업 외: closest()로 클릭한 요소에서 가장 가까운 필터 버튼을 찾음
        const button = event.target.closest(".ss-filter");
        if (!button) {
            return;
        }

        category = button.dataset.filter;
        page = 1;
        filters.querySelectorAll(".ss-filter").forEach(function (filter) {
            filter.setAttribute("aria-pressed", String(filter === button));
        });
        render();
    });

    search.addEventListener("input", function () {
        keyword = search.value.trim().toLowerCase();
        page = 1;
        render();
    });

    sortSelect.addEventListener("change", function () {
        sortType = sortSelect.value;
        page = 1;
        render();
    });

    pager.addEventListener("click", function (event) {
        const button = event.target.closest("button");
        if (!button || button.disabled) {
            return;
        }

        page = Number(button.dataset.page);
        render();
    });

    // 하트 저장: 카드가 다시 그려져도 동작하도록 목록 전체에 이벤트를 한 번만 등록
    cards.addEventListener("change", function (event) {
        const checkbox = event.target;
        if (!checkbox.matches("input[data-save-id]")) {    // 수업 외: 변경된 요소가 하트 체크박스인지 선택자로 확인함
            return;
        }

        // 저장과 취소, 로그인 전 안내는 common.js의 toggleSaved()가 처리
        // (로그인 전이면 안내 후 updateHearts()로 체크를 원래대로 되돌림)
        SceneSeoul.toggleSaved(checkbox.dataset.saveId);
    });


    // JSON 불러오기

    fetch(DATA_URL)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("JSON 요청 실패: " + response.status);
            }
            return response.json();
        })
        .then(function (data) {
            if (!Array.isArray(data)) {
                throw new Error("JSON 데이터 형식이 올바르지 않습니다.");
            }

            // 종료된 팝업을 먼저 빼고(filter) 남은 팝업을 시작일이 빠른 순서로 정렬함(sort)
            const todayText = getTodayText();

            popups = data
                .filter(function (item) {
                    return !item.endDate || item.endDate >= todayText;
                })
                .sort(function (a, b) {
                    return a.startDate.localeCompare(b.startDate);
                });

            render();
        })
        .catch(function (error) {
            console.error("팝업 JSON 불러오기 오류:", error);
            showError("팝업 정보를 불러오지 못했습니다. JSON 경로를 확인해 주세요.");
        });
});