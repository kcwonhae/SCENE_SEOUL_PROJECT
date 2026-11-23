/* SCENE:SEOUL 로그인 및 관심 일정 관리 */

(function () {
    const SESSION_KEY = "sceneSeoulDemoUser";
    const SAVED_PREFIX = "sceneSeoulSavedEvents:";
    const GUEST_COOKIE = "sceneSeoulGuestSaved";

    function readIds(value) {
        try {
            const ids = JSON.parse(value || "[]");

            if (!Array.isArray(ids)) {
                return [];
            }

            return ids.filter(function (id) {
                return typeof id === "string";
            });
        } catch (error) {
            return [];
        }
    }

    function getUser() {
        return sessionStorage.getItem(SESSION_KEY) || "";
    }

    function readCookie() {
        const cookies = document.cookie.split("; ");

        const entry = cookies.find(function (cookie) {
            return cookie.startsWith(GUEST_COOKIE + "=");
        });

        if (!entry) {
            return [];
        }

        try {
            const value = entry.slice(GUEST_COOKIE.length + 1);
            return readIds(decodeURIComponent(value));
        } catch (error) {
            return [];
        }
    }

    function saveCookie(ids) {
        const value = encodeURIComponent(JSON.stringify(ids));

        document.cookie =
            GUEST_COOKIE + "=" + value +
            "; Path=/; Max-Age=2592000; SameSite=Lax";
    }

    function clearCookie() {
        document.cookie =
            GUEST_COOKIE + "=; Path=/; Max-Age=0; SameSite=Lax";
    }

    function getSaved() {
        const user = getUser();

        if (user) {
            return readIds(
                localStorage.getItem(SAVED_PREFIX + user)
            );
        }

        return readCookie();
    }

    function save(ids) {
        const uniqueIds = Array.from(new Set(ids));
        const user = getUser();

        if (user) {
            localStorage.setItem(
                SAVED_PREFIX + user,
                JSON.stringify(uniqueIds)
            );
        } else {
            saveCookie(uniqueIds);
        }

        window.dispatchEvent(new Event("scene:saved"));
    }

    function toggleSaved(id) {
        const ids = getSaved();
        const index = ids.indexOf(id);
        let isSaved;

        if (index === -1) {
            ids.push(id);
            isSaved = true;
        } else {
            ids.splice(index, 1);
            isSaved = false;
        }

        save(ids);

        return isSaved;
    }

    function login(username) {
        const name = username.trim();

        if (!/^[A-Za-z0-9_-]{2,24}$/.test(name)) {
            return false;
        }

        const guestIds = readCookie();
        const key = SAVED_PREFIX + name;

        const existingIds = readIds(
            localStorage.getItem(key)
        );

        const mergedIds = Array.from(
            new Set(existingIds.concat(guestIds))
        );

        localStorage.setItem(
            key,
            JSON.stringify(mergedIds)
        );

        sessionStorage.setItem(SESSION_KEY, name);
        clearCookie();

        updateHeader();

        window.dispatchEvent(new Event("scene:login"));
        window.dispatchEvent(new Event("scene:saved"));

        return true;
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);

        updateHeader();

        window.dispatchEvent(new Event("scene:login"));
        window.dispatchEvent(new Event("scene:saved"));
    }

    function updateHeader() {
        const user = getUser();
        const loginLink = document.querySelector(".header-login");
        const logoutButton = document.getElementById("demo-logout");
        const message = document.getElementById("login-message");

        if (loginLink) {
            loginLink.textContent = user ? user + " (DEMO)" : "LOGIN";
        }

        if (logoutButton) {
            logoutButton.hidden = !user;
        }

        if (message) {
            message.textContent = user
                ? user + " 계정으로 시연 중입니다."
                : "";
        }
    }

    function init() {
        const loginForm = document.getElementById("demo-login-form");
        const logoutButton = document.getElementById("demo-logout");
        const calendarLink = document.querySelector(".header-mypage");

        if (loginForm) {
            loginForm.addEventListener("submit", function (event) {
                event.preventDefault();

                const input = document.getElementById("demo-user");

                if (!input) {
                    return;
                }

                if (!login(input.value)) {
                    const message = document.getElementById("login-message");

                    if (message) {
                        message.textContent =
                            "아이디는 영문, 숫자, _, -를 사용해 2~24자로 입력해 주세요.";
                    }

                    return;
                }

                input.value = "";
                location.hash = "top";
            });
        }

        if (logoutButton) {
            logoutButton.addEventListener("click", function () {
                logout();
                location.hash = "top";
            });
        }

        if (calendarLink) {
            calendarLink.addEventListener("click", function (event) {
                if (getUser()) {
                    return;
                }

                event.preventDefault();

                location.hash = "login-required";

                const message = document.getElementById("login-message");

                if (message) {
                    message.textContent =
                        "마이캘린더는 로그인 후 이용할 수 있습니다.";
                }
            });
        }

        updateHeader();
    }

    window.SceneSeoul = {
        getUser: getUser,
        getSaved: getSaved,
        toggleSaved: toggleSaved,
        login: login,
        logout: logout
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
