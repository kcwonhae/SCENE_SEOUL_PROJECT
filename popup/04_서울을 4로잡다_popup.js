
/* SCENE:SEOUL - 팝업 페이지 */

document.addEventListener("DOMContentLoaded", function () {
    const cards = document.getElementById("cards");
    const filters = document.querySelector(".ss-filters");
    const search = document.getElementById("popup-catalog-search");
    const pager = document.getElementById("popup-pagination");

    const PAGE_SIZE = 8;
    const DATA_URL = "../data/04_서울을 4로잡다_popup.json";

    let popups = [];
    let category = "all";
    let keyword = "";
    let page = 1;

    function createElement(tag, className, content) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (content !== undefined && content !== null) {
            element.textContent = content;
        }

        return element;
    }

    function dateLabel(item) {
        const start = (item.startDate || "").replace(/-/g, ".");
        const end = (item.endDate || "").replace(/-/g, ".");

        if (!end) {
            return start || "일정 확인 필요";
        }

        return start === end ? start : start + " ~ " + end;
    }

    function detailUrl(item) {
        const url = item.officialUrl || item.sourceUrl || "";

        if (url.startsWith("https://") || url.startsWith("http://")) {
            return url;
        }

        return "";
    }

    function setExternalLink(link, url) {
        if (url) {
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.removeAttribute("aria-disabled");
        } else {
            link.removeAttribute("href");
            link.removeAttribute("target");
            link.removeAttribute("rel");
            link.setAttribute("aria-disabled", "true");
        }
    }

    /* 팝업 카드 */

    function makeCard(item) {
        const article = createElement(
            "article",
            "ss-card ss-catalog-card pop-catalog-card"
        );

        const imageWrap = createElement("div", "ss-card-image");
        const image = document.createElement("img");

        image.src = item.image || "";
        image.alt = item.title + " 포스터";
        image.loading = "lazy";
        imageWrap.appendChild(image);

        // 공통 찜 목록을 기준으로 하트 상태 표시
        const heart = createElement("label", "ss-heart-toggle");
        const checkbox = document.createElement("input");
        const heartIcon = document.createElement("span");

        checkbox.type = "checkbox";
        checkbox.dataset.saveId = item.id;
        checkbox.checked = SceneSeoul.getSaved().includes(item.id);
        checkbox.setAttribute(
            "aria-label",
            item.title + " 관심 팝업 저장"
        );

        heartIcon.setAttribute("aria-hidden", "true");
        heart.append(checkbox, heartIcon);

        imageWrap.appendChild(heart);
        article.appendChild(imageWrap);

        // 제목, 장소, 날짜
        const info = createElement(
            "div",
            "ss-card-info ss-catalog-card-info pop-card-info"
        );

        const title = createElement("h3", "pop-card-title", item.title);

        const location = (item.district ? item.district + " · " : "") +
            (item.location || "");

        const place = createElement("p", "pop-card-place", location);
        const period = createElement("p", "pop-card-period", dateLabel(item));

        info.append(title, place, period);
        article.appendChild(info);

        // 카드 클릭 시 상세 정보 페이지로 이동
        const url = detailUrl(item);

        if (url) {
            const link = createElement("a", "pop-card-link");

            setExternalLink(link, url);
            link.setAttribute(
                "aria-label",
                item.title + " 상세 정보 열기 (새 탭)"
            );

            article.appendChild(link);
        }

        return article;
    }

    /* 페이지 번호 버튼 */

    function makePageButton(number) {
        const button = createElement(
            "button",
            "popup-page-button",
            String(number)
        );

        button.type = "button";
        button.dataset.page = String(number);
        button.setAttribute("aria-label", number + "페이지");

        if (number === page) {
            button.setAttribute("aria-current", "page");
        }

        return button;
    }

    function makeArrow(label, targetPage, disabled) {
        const button = createElement("button", "popup-page-arrow", label);

        button.type = "button";
        button.dataset.page = String(targetPage);
        button.disabled = disabled;

        button.setAttribute(
            "aria-label",
            label === "‹" ? "이전 페이지" : "다음 페이지"
        );

        return button;
    }

    /* 검색 결과 및 카드 표시 */

    function render() {
        const matched = popups.filter(function (item) {
            const matchesCategory =
                category === "all" || item.subCategory === category;

            const content = [
                item.title,
                item.brand,
                item.location,
                item.district,
                item.description
            ].concat(item.tags || []).join(" ").toLowerCase();

            return matchesCategory && content.includes(keyword);
        });

        const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));

        page = Math.min(page, totalPages);

        const start = (page - 1) * PAGE_SIZE;
        const displayed = matched.slice(start, start + PAGE_SIZE);

        cards.replaceChildren();

        if (displayed.length === 0) {
            cards.appendChild(
                createElement(
                    "p",
                    "popup-empty",
                    "조건에 맞는 팝업이 없습니다."
                )
            );
        } else {
            displayed.forEach(function (item) {
                cards.appendChild(makeCard(item));
            });
        }

        // 페이지 번호 갱신
        pager.replaceChildren();

        if (totalPages > 1) {
            pager.appendChild(makeArrow("‹", page - 1, page === 1));

            for (let i = 1; i <= totalPages; i++) {
                pager.appendChild(makePageButton(i));
            }

            pager.appendChild(
                makeArrow("›", page + 1, page === totalPages)
            );
        }
    }

    /* 카테고리 필터 */

    filters.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-filter]");

        if (!button) {
            return;
        }

        category = button.dataset.filter;
        page = 1;

        filters.querySelectorAll("button[data-filter]").forEach(function (item) {
            item.setAttribute("aria-pressed", String(item === button));
        });

        render();
    });

    /* 팝업 검색 */

    search.addEventListener("input", function () {
        keyword = search.value.trim().toLowerCase();
        page = 1;
        render();
    });

    /* 페이지 이동 */

    pager.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-page]");

        if (!button || button.disabled) {
            return;
        }

        page = Number(button.dataset.page);
        render();
    });

    /* 관심 팝업 저장 */

    cards.addEventListener("change", function (event) {
        const input = event.target;

        if (!input.matches("input[data-save-id]")) {
            return;
        }

        // 로그인하지 않았다면 저장하지 않음
        if (!SceneSeoul.getUser()) {
            input.checked = false;
            alert("로그인 후 저장할 수 있어요.");
            return;
        }

        // 공통 함수에서 찜 추가 또는 취소
        const saved = SceneSeoul.toggleSaved(input.dataset.saveId);

        input.checked = saved;
    });

    /* 로그인 및 찜 상태 변경 */

    function updateHearts() {
        const saved = SceneSeoul.getSaved();

        cards.querySelectorAll("input[data-save-id]").forEach(function (input) {
            input.checked = saved.includes(input.dataset.saveId);
        });
    }

    window.addEventListener("scene:login", updateHearts);
    window.addEventListener("scene:saved", updateHearts);
    window.addEventListener("pageshow", updateHearts);

    // 다른 탭에서 찜이나 로그인 상태를 변경했을 때
    window.addEventListener("storage", function (event) {
        if (
            event.key === SceneSeoul.USER_KEY ||
            (event.key && event.key.startsWith(SceneSeoul.SAVED_PREFIX))
        ) {
            updateHearts();
        }
    });

    /* JSON 데이터 불러오기 */

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

            popups = data;

            try {
                render();
            } catch (error) {
                console.error("팝업 카드 표시 오류:", error);

                cards.replaceChildren(
                    createElement(
                        "p",
                        "popup-empty",
                        "팝업 카드를 표시하는 중 오류가 발생했습니다."
                    )
                );

                pager.replaceChildren();
            }
        })
        .catch(function (error) {
            console.error("팝업 JSON 불러오기 오류:", error);

            cards.replaceChildren(
                createElement(
                    "p",
                    "popup-empty",
                    "팝업 정보를 불러오지 못했습니다. JSON 경로를 확인해 주세요."
                )
            );

            pager.replaceChildren();
        });
});
