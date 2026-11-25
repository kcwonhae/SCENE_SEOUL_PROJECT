
/* SCENE:SEOUL - 네비게이션 날씨 */
/* 적용 방법은 https://github.com/kcwonhae/SCENE_SEOUL_PROJECT/pull/8 참고. */
const WEATHER_URL =
    "https://scene-seoul-weather.kw064753.workers.dev/api/weather";

document.addEventListener("DOMContentLoaded", function () {
    const weatherIcon = document.getElementById("header-weather");

    if (!weatherIcon) {
        console.error("날씨 아이콘을 찾을 수 없습니다.");
        return;
    }

    const icons = {
        sun: `
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4
                     M17.7 17.7l1.4 1.4M2 12h2M20 12h2
                     M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>
        `,

        "partly-cloudy": `
            <path d="M6 3v2M2.5 7l1.4 1.4M10 2v2"></path>
            <path d="M6.5 17.5h11a4 4 0 0 0 .1-8
                     6.2 6.2 0 0 0-11.4 2.1
                     A3 3 0 0 0 6.5 17.5Z"></path>
        `,

        cloud: `
            <path d="M6.5 18h11a4 4 0 0 0 .1-8
                     6.2 6.2 0 0 0-11.4 2.1
                     A3 3 0 0 0 6.5 18Z"></path>
        `,

        rain: `
            <path d="M6.5 15h11a4 4 0 0 0 .1-8
                     6.2 6.2 0 0 0-11.4 2.1
                     A3 3 0 0 0 6.5 15Z"></path>
            <path d="m8 18-1 3M13 18l-1 3M18 18l-1 3"></path>
        `,

        snow: `
            <path d="M6.5 14h11a4 4 0 0 0 .1-8
                     6.2 6.2 0 0 0-11.4 2.1
                     A3 3 0 0 0 6.5 14Z"></path>
            <path d="M8 17v5M5.5 19.5h5
                     M16 17v5M13.5 19.5h5"></path>
        `
    };

    async function updateWeather() {
        try {
            console.log("날씨 API 요청 시작");

            const response = await fetch(WEATHER_URL);

            if (!response.ok) {
                throw new Error("HTTP 오류: " + response.status);
            }

            const weather = await response.json();

            console.log("받아온 날씨:", weather);

            const svg = weatherIcon.querySelector("svg");
            const icon = icons[weather.condition];

            if (!svg || !icon) {
                throw new Error("날씨 아이콘 정보가 올바르지 않습니다.");
            }

            svg.innerHTML = icon;

            const message =
                weather.city + " " +
                weather.description + ", " +
                weather.temperature + "°C";

            weatherIcon.title = message;
            weatherIcon.setAttribute("aria-label", message);

            console.log("날씨 아이콘 변경 완료");

        } catch (error) {
            console.error("날씨 연동 오류:", error);

            weatherIcon.title = "날씨 정보를 불러올 수 없습니다.";
        }
    }

    updateWeather();

    // 10분마다 날씨 정보 갱신
    setInterval(updateWeather, 600000);
});
