
/* SCENE:SEOUL - POP-UP */

document.addEventListener("DOMContentLoaded", function () {
    const cards = document.getElementById("cards");
    const filters = document.querySelector(".ss-filters");
    const search = document.getElementById("popup-catalog-search");
    const pager = document.getElementById("popup-pagination");
    const counter = document.getElementById("popup-result-count");

    const PAGE_SIZE = 6;

    let popups = [];
    let category = "all";
    let keyword = "";
    let page = 1;

    const kinds = {
        fashion: "패션",
        art: "아트",
        life: "라이프스타일",
        goods: "굿즈 · 마켓"
    };

    function text(tag, className, value) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        element.textContent = value || "";
        return element;
    }

    function dateLabel(item) {
        return item.startDate.replace(/-/g, ".") +
            " — " + item.endDate.replace(/-/g, ".");
    }

    function detailUrl(item) {
        const url = item.officialUrl || item.sourceUrl || "";

        if (!/^https?:\/\/\S+$/i.test(url)) {
            return "";
        }

        return url;
    }

    function setExternalLink(link, url) {
        if (url) {
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            return;
        }

        link.removeAttribute("href");
        link.removeAttribute("target");
        link.removeAttribute("rel");
        link.setAttribute("aria-disabled", "true");
    }

    function makeCard(item) {
        const article = text(
            "article",
            "ss-card pop-catalog-card ss-catalog-card"
        );

        const imageWrap = text("div", "ss-card-image");
        const image = document.createElement("img");

        image.src = item.image;
        image.alt = item.title + " 관련 이미지";
        image.loading = "lazy";

        imageWrap.appendChild(image);
        article.appendChild(imageWrap);

        const info = text(
            "div",
            "ss-card-info pop-card-info ss-catalog-card-info"
        );

        const top = text(
            "div",
            "pop-card-topline ss-card-topline"
        );

        top.appendChild(
            text(
                "span",
                "ss-card-category",
                "POP-UP · " +
                (kinds[item.subCategory] || item.subCategory)
            )
        );

        top.appendChild(
            text("span", "pop-region", item.district)
        );

        info.appendChild(top);

        const titleRow = text(
            "div",
            "pop-card-titleline ss-card-titleline"
        );

        const url = detailUrl(item);

        const titleLink = document.createElement("a");
        setExternalLink(titleLink, url);

        titleLink.appendChild(
            text("h3", "ss-card-title", item.title)
        );

        titleRow.appendChild(titleLink);

        const heart = text(
            "label",
            "ss-heart ss-heart-toggle"
        );

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.dataset.saveId = item.id;
        checkbox.checked =
            SceneSeoul.getSaved().includes(item.id);

        checkbox.setAttribute(
            "aria-label",
            item.title + " 관심 팝업 저장"
        );

        const mark = document.createElement("span");
        mark.setAttribute("aria-hidden", "true");

        heart.append(checkbox, mark);
        titleRow.appendChild(heart);
        info.appendChild(titleRow);

        info.appendChild(
            text(
                "p",
                "pop-card-description ss-card-description",
                item.description
            )
        );

        info.appendChild(
            text(
                "p",
                "ss-card-meta",
                item.location + " · " + dateLabel(item)
            )
        );

        const more = text(
            "a",
            "popup-detail-link",
            url ? "상세 정보 보기 ↗" : "상세 정보 준비 중"
        );

        setExternalLink(more, url);

        info.appendChild(more);
        article.appendChild(info);

        return article;
    }

    function showFeatured() {
        const selected = popups
            .filter(function (item) {
                return item.featured === true;
            })
            .sort(function (a, b) {
                return a.featuredOrder - b.featuredOrder;
            })[0] || popups[0];

        if (!selected) {
            return;
        }

        const image = document.getElementById(
            "popup-feature-img"
        );

        image.src = selected.image;
        image.alt = selected.title + " 관련 이미지";

        document.getElementById(
            "popup-feature-kicker"
        ).textContent =
            (kinds[selected.subCategory] || "POP-UP") +
            " · " + selected.district;

        document.getElementById(
            "popup-feature-title"
        ).textContent = selected.title;

        document.getElementById(
            "popup-feature-desc"
        ).textContent = selected.description;

        const facts = document.getElementById(
            "popup-feature-facts"
        );

        facts.replaceChildren(
            text("span", "", dateLabel(selected)),
            text("span", "", selected.location),
            text("span", "", "POP-UP")
        );

        const featuredLink = document.getElementById(
            "popup-feature-link"
        );

        const url = detailUrl(selected);

        setExternalLink(featuredLink, url);

        featuredLink.textContent = url
            ? "팝업 살펴보기 ↗"
            : "상세 정보 준비 중";

        document.getElementById(
            "popup-feature"
        ).removeAttribute("aria-busy");
    }

    function makePageButton(number) {
        const button = text(
            "button",
            "popup-page-button",
            String(number)
        );

        button.type = "button";
        button.dataset.page = String(number);

        button.setAttribute(
            "aria-label",
            number + "페이지"
        );

        if (number === page) {
            button.setAttribute("aria-current", "page");
        }

        return button;
    }

    function makeArrow(label, targetPage, disabled) {
        const button = text(
            "button",
            "popup-page-arrow",
            label
        );

        button.type = "button";
        button.dataset.page = String(targetPage);
        button.disabled = disabled;

        button.setAttribute(
            "aria-label",
            label === "‹" ? "이전 페이지" : "다음 페이지"
        );

        return button;
    }

    function render() {
        const matched = popups.filter(function (item) {
            const matchesCategory =
                category === "all" ||
                item.subCategory === category;

            const content = [
                item.title,
                item.brand,
                item.location,
                item.district,
                item.description,
                ...(item.tags || [])
            ].join(" ").toLowerCase();

            return matchesCategory &&
                content.includes(keyword);
        });

        const pages = Math.max(
            1,
            Math.ceil(matched.length / PAGE_SIZE)
        );

        page = Math.min(page, pages);

        const displayed = matched.slice(
            (page - 1) * PAGE_SIZE,
            page * PAGE_SIZE
        );

        cards.replaceChildren();

        displayed.forEach(function (item) {
            cards.appendChild(makeCard(item));
        });

        if (displayed.length === 0) {
            cards.appendChild(
                text(
                    "p",
                    "popup-empty",
                    "조건에 맞는 팝업이 없습니다."
                )
            );
        }

        counter.textContent =
            "검색 결과 " + matched.length +
            "개 · " + page + " / " + pages + " 페이지";

        pager.replaceChildren();

        if (pages < 2) {
            return;
        }

        pager.appendChild(
            makeArrow("‹", page - 1, page === 1)
        );

        for (let i = 1; i <= pages; i++) {
            pager.appendChild(makePageButton(i));
        }

        pager.appendChild(
            makeArrow("›", page + 1, page === pages)
        );
    }

    /* 카테고리 필터 */

    filters.addEventListener("click", function (event) {
        const button = event.target.closest(
            "button[data-filter]"
        );

        if (!button) {
            return;
        }

        category = button.dataset.filter;
        page = 1;

        filters.querySelectorAll(
            "button[data-filter]"
        ).forEach(function (item) {
            item.setAttribute(
                "aria-pressed",
                String(item === button)
            );
        });

        render();
    });

    /* 검색 */

    search.addEventListener("input", function () {
        keyword = search.value.trim().toLowerCase();
        page = 1;
        render();
    });

    /* 페이지 이동 */

    pager.addEventListener("click", function (event) {
        const button = event.target.closest(
            "button[data-page]"
        );

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

        SceneSeoul.toggleSaved(input.dataset.saveId);
    });

    function updateHearts() {
        const saved = SceneSeoul.getSaved();

        cards.querySelectorAll(
            "input[data-save-id]"
        ).forEach(function (input) {
            input.checked = saved.includes(
                input.dataset.saveId
            );
        });
    }

    window.addEventListener("scene:saved", updateHearts);

    window.addEventListener("pageshow", updateHearts);

    /* JSON 데이터 불러오기 */

    fetch("../data/04_서울을 4로잡다_popup.json")
        .then(function (response) {
            if (!response.ok) {
                throw new Error(
                    "JSON 요청 실패: " + response.status
                );
            }

            return response.json();
        })
        .then(function (data) {
            if (!Array.isArray(data)) {
                throw new Error(
                    "JSON 데이터가 배열 형식이 아닙니다."
                );
            }

            popups = data;

            showFeatured();
            render();
        })
        .catch(function (error) {
            console.error("팝업 데이터 오류:", error);

            cards.replaceChildren(
                text(
                    "p",
                    "popup-empty",
                    "팝업 정보를 불러오지 못했습니다. JSON 경로를 확인해 주세요."
                )
            );

            counter.textContent = "데이터 로딩 오류";
        });
});
