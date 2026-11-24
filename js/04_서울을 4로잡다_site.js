/* SCENE:SEOUL - 관심 일정 관리 */

(function () {
    const STORAGE_PREFIX = "sceneSeoulSavedEvents:";
    const GUEST_KEY = STORAGE_PREFIX + "guest";

    // 로그인 담당자의 getUser() 사용
    function getUser() {
        if (window.SceneSeoul &&
            typeof window.SceneSeoul.getUser === "function") {
            return window.SceneSeoul.getUser() || "";
        }

        return sessionStorage.getItem("sceneSeoulDemoUser") || "";
    }

    function getStorageKey() {
        const user = getUser();
        return user ? STORAGE_PREFIX + user : GUEST_KEY;
    }

    function getSaved() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(getStorageKey()) || "[]"
            );

            return Array.isArray(saved)
                ? saved.filter(id => typeof id === "string")
                : [];
        } catch (error) {
            console.error("찜 목록을 불러오지 못했습니다.", error);
            return [];
        }
    }

    function save(ids) {
        const uniqueIds = [...new Set(ids)];

        localStorage.setItem(
            getStorageKey(),
            JSON.stringify(uniqueIds)
        );

        notifySaved();
    }

    function notifySaved() {
        window.dispatchEvent(
            new CustomEvent("scene:saved", {
                detail: { savedIds: getSaved() }
            })
        );
    }

    function toggleSaved(id) {
        const saved = getSaved();
        const isSaved = saved.includes(id);

        if (isSaved) {
            save(saved.filter(item => item !== id));
        } else {
            save([...saved, id]);
        }

        return !isSaved;
    }

    function removeSaved(id) {
        save(getSaved().filter(item => item !== id));
    }

    function updateHearts() {
        const saved = getSaved();

        document.querySelectorAll(
            'input[type="checkbox"][data-save-id]'
        ).forEach(function (input) {
            input.checked = saved.includes(input.dataset.saveId);
        });
    }

    window.addEventListener("scene:saved", updateHearts);

    window.addEventListener("pageshow", updateHearts);

    window.addEventListener("storage", function (event) {
        if (event.key === getStorageKey() || event.key === null) {
            notifySaved();
        }
    });

    window.addEventListener("scene:login", function () {
        notifySaved();
    });

    // 기존 로그인 공통 객체에 찜 기능만 추가
    window.SceneSeoul = Object.assign(
        window.SceneSeoul || {},
        {
            getSaved,
            toggleSaved,
            removeSaved,
            updateHearts
        }
    );

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", updateHearts);
    } else {
        updateHearts();
    }
}());
