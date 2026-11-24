
/* SCENE:SEOUL 홈 스크롤 효과 */

document.addEventListener("DOMContentLoaded", function () {
    const film = document.querySelector(".season-film");
    const scenes = document.querySelectorAll(".season-scene");
    const editorial = document.querySelector(".season-editorial");
    const strip = document.querySelector(".season-bottom-strip");
    const progressBar = document.querySelector(".season-progress span");
    const recommendation = document.querySelector(".edition-next");
    const revealItems = document.querySelectorAll(".reveal");

    if (!film || scenes.length !== 4 || !recommendation) {
        return;
    }

    document.body.classList.add("js-ready");

    function limit(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function showScenes(progress) {
        // 전체 스크롤 구간을 네 장면으로 나눈다.
        const scenePosition = progress * 4.2;

        scenes.forEach(function (scene, index) {
            const distance = Math.abs(scenePosition - index);
            const opacity = limit(1 - distance, 0, 1);

            scene.style.opacity = opacity;
            scene.style.transform =
                "scale(" + (1.04 - progress * 0.03) + ")";
        });
    }

    function showRecommendation(progress) {
        const fade = limit(
            (progress - 0.82) / 0.13,
            0,
            1
        );

        recommendation.style.opacity = fade;

        recommendation.classList.toggle(
            "is-visible",
            fade > 0.02
        );

        const introOpacity = 1 - limit(
            (progress - 0.73) / 0.12,
            0,
            1
        );

        editorial.style.opacity = introOpacity;
        strip.style.opacity = introOpacity;

        editorial.style.pointerEvents =
            introOpacity < 0.1 ? "none" : "auto";
    }

    function showOtherSections() {
        const screenHeight = window.innerHeight;

        revealItems.forEach(function (item) {
            const itemTop = item.getBoundingClientRect().top;

            if (itemTop < screenHeight * 0.88) {
                item.classList.add("visible");
            }
        });
    }

    function update() {
        const filmTop =
            film.getBoundingClientRect().top + window.scrollY;

        const scrollLength =
            film.offsetHeight - window.innerHeight;

        const scrolled = window.scrollY - filmTop;

        const progress = limit(
            scrolled / Math.max(1, scrollLength),
            0,
            1
        );

        showScenes(progress);
        showRecommendation(progress);

        progressBar.style.width = (progress * 100) + "%";

        showOtherSections();
    }

    window.addEventListener("scroll", update, {
        passive: true
    });

    window.addEventListener("resize", update);
    window.addEventListener("pageshow", update);

    update();
});
