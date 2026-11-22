/* SCENE:SEOUL 홈 스크롤 */

const section = document.getElementById("video-section");
const wrapper = document.getElementById("fixed-wrapper");
const video = document.getElementById("video");
const videoFrame = document.querySelector(".video-frame");

const textOne = document.getElementById("text-one");
const textTwo = document.getElementById("text-two");

const exploreIntro = document.querySelector(".explore-intro");
const introTitle = exploreIntro.querySelector("h2");
const introDescription = exploreIntro.querySelector("p");
const introButton = exploreIntro.querySelector(".explore-button");

const exploreCategories = document.querySelector(".explore-categories");
const exploreItems = document.querySelectorAll(".explore-item");
const carouselView = document.querySelector(".carousel-view");
const carouselContainer = document.querySelector(".carousel-container");

const calendarSection = document.getElementById("calendar-section");
const calendarVisual = document.querySelector(".calendar-visual");
const calendarGrid = document.querySelector(".calendar-grid");
const calendarPhotos = document.querySelectorAll(".calendar-photo");
const calendarContent = document.querySelector(".calendar-content");
const calendarSceneCard = document.querySelector(".calendar-scene-card");

const mapSection = document.getElementById("map-section");
const mapSticky = document.querySelector(".map-sticky");
const mapStageOne = document.querySelector(".map-stage-one");
const mapStageTwo = document.querySelector(".map-stage-two");
const mapLeftText = document.querySelector(".map-hero-left");
const mapRightText = document.querySelector(".map-hero-right");
const mapImageWrap = document.getElementById("map-image-wrap");
const mapContent = document.querySelector(".map-content");

const HEADER_HEIGHT = 76;
const dayCards = calendarGrid.querySelectorAll(".day-card");

// 20~21일 이벤트 사진에서 각 날짜까지의 거리. 스크롤마다 다시 계산하지 않음.
const dayDistances = [];
for (let i = 0; i < dayCards.length; i++) {
    const col = (i % 7) + 1;
    const row = Math.floor(i / 7) + 1;
    const dx = (col - 6.5) / 7;
    const dy = (row - 3) / 4;
    dayDistances.push(Math.sqrt(dx * dx + dy * dy));
}

const bridgeImage = document.getElementById("calendar-bridge");
let lastCategory = -1;
let isAutoPlaying = false;

video.pause();
exploreIntro.style.transform = "translateX(-50%)";
bridgeImage.style.borderRadius = "18px";
calendarPhotos[3].style.transform = "none";

// 11일 카드는 달력 배치가 흔들리지 않도록 복제 레이어로 확대
const sceneTransition = document.createElement("div");
sceneTransition.className = "scene-transition-card";

sceneTransition.innerHTML = `
    <img class="scene-transition-map" src="../images/04_index.map.png" alt="">
    <span class="scene-transition-date">11</span>
    <span class="scene-transition-label">MY SCENE</span>
`;

document.body.appendChild(sceneTransition);

const transitionMap = sceneTransition.querySelector(".scene-transition-map");
const transitionDate = sceneTransition.querySelector(".scene-transition-date");
const transitionLabel = sceneTransition.querySelector(".scene-transition-label");

function clamp(value) {
    return Math.max(0, Math.min(1, value));
}

// 스크롤을 되돌려도 같은 위치에 같은 상태가 나오도록 구간별로 진행률을 계산함.
function range(progress, start, end) {
    if (start === end) {
        return progress >= end ? 1 : 0;
    }

    const value = clamp((progress - start) / (end - start));
    return value * value * (3 - 2 * value);
}

function between(start, end, progress) {
    return start + (end - start) * progress;
}

function getProgress(element, stickyHeight) {
    const distance = element.offsetHeight - stickyHeight;

    if (distance <= 0) {
        return 0;
    }

    const position = -element.getBoundingClientRect().top;
    return clamp(position / distance);
}

function getCalendarChange() {
    const top = calendarSection.getBoundingClientRect().top;
    const height = window.innerHeight;
    const distance = height - HEADER_HEIGHT;

    return distance > 0 ? clamp((height - top) / distance) : 0;
}

function getMapChange(top) {
    const height = window.innerHeight;
    const visibleHeight = height - HEADER_HEIGHT;

    const start = height + visibleHeight * 0.75;
    const distance = start - HEADER_HEIGHT;

    return distance > 0 ? clamp((start - top) / distance) : 0;
}

function updateText(element, time, start, end) {
    const fadeTime = 0.7;
    let opacity = 0;

    if (time >= start && time < start + fadeTime) {
        opacity = (time - start) / fadeTime;
    } else if (time >= start + fadeTime && time < end - fadeTime) {
        opacity = 1;
    } else if (time >= end - fadeTime && time <= end) {
        opacity = (end - time) / fadeTime;
    }

    opacity = range(opacity, 0, 1);

    element.style.opacity = opacity;
    element.style.transform =
        `translate(-50%, calc(-50% + ${(1 - opacity) * 35}px))`;
}

// 초반에는 currentTime으로 영상을 넘기고, 소개 구간에서는 반복 재생.
// 참고: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime
function updateVideo(progress, calendarChange) {
    const sceneFade = 1 - range(calendarChange, 0.03, 0.18);

    if (Number.isFinite(video.duration) && video.duration > 0) {
        const time = clamp(progress / 0.40) * video.duration;
        const shouldPlay = progress >= 0.53 && progress < 0.83;

        if (shouldPlay) {
            if (!isAutoPlaying) {
                isAutoPlaying = true;
                video.currentTime = 0;
                video.loop = true;
                video.play().catch(function(error) {
                    // 자동재생이 제한된 브라우저에서는 다음 스크롤 동작을 유지함.
                    console.debug("영상 자동재생 제한:", error.name);
                });
            }
        } else {
            if (!video.paused) {
                video.pause();
            }

            if (isAutoPlaying) {
                isAutoPlaying = false;
                video.loop = false;
            }

            if (progress < 0.53) {
                const targetTime = Math.min(
                    time,
                    Math.max(0, video.duration - 0.05)
                );

                if (Math.abs(video.currentTime - targetTime) > 0.05) {
                    video.currentTime = targetTime;
                }
            }
        }

        updateText(textOne, time, 3.2, 7.0);
        updateText(textTwo, time, 7.2, 11.2);
    }

    const videoHide = range(progress, 0.81, 0.87);

    video.style.opacity = (1 - videoHide) * sceneFade;
    video.style.visibility =
        progress >= 0.87 || sceneFade < 0.02 ? "hidden" : "visible";
}

function updateIntro(progress, calendarChange) {
    const shrink = range(progress, 0.40, 0.55);
    const move = range(progress, 0.70, 0.82);

    videoFrame.style.left = `${shrink * 8 + move * 46}%`;
    videoFrame.style.top = `${shrink * 49 - move * 32}%`;
    videoFrame.style.width = `${100 - shrink * 16 - move * 44}%`;
    videoFrame.style.height = `${100 - shrink * 54 + move * 23}%`;
    videoFrame.style.borderRadius = `${shrink * 18}px`;

    videoFrame.style.opacity =
        1 - range(calendarChange, 0.03, 0.18);

    const titleShow = range(progress, 0.43, 0.54);
    const descriptionShow = range(progress, 0.55, 0.62);
    const introHide = range(progress, 0.65, 0.72);
    
    introTitle.style.opacity = titleShow;
    introTitle.style.transform =
        `translateY(${(1 - titleShow) * 30}px)`;

    introDescription.style.opacity = descriptionShow;
    introButton.style.opacity = descriptionShow;

    introDescription.style.transform =
        `translateY(${(1 - descriptionShow) * 25}px)`;
    introButton.style.transform =
        `translateY(${(1 - descriptionShow) * 25}px)`;

    exploreIntro.style.opacity = 1 - introHide;

    exploreIntro.style.pointerEvents =
        descriptionShow > 0.9 && introHide < 0.1 ? "auto" : "none";
}

function updateCategories(progress, calendarChange) {
    const show = range(progress, 0.77, 0.85);
    const textHide = range(calendarChange, 0.01, 0.22);
    const sceneFade = 1 - range(calendarChange, 0.02, 0.18);

    exploreCategories.style.opacity =
        show * (1 - textHide) * sceneFade;

    exploreCategories.style.transform =
        `translateY(${(1 - show) * 40}px)`;

    exploreCategories.style.pointerEvents =
        show > 0.95 && textHide < 0.1 ? "auto" : "none";

    const duration = (1 - 0.85) / exploreItems.length;
    let index = Math.floor((progress - 0.85) / duration);

    index = Math.max(0, Math.min(index, exploreItems.length - 1));

    if (index !== lastCategory) {
        for (let i = 0; i < exploreItems.length; i++) {
            exploreItems[i].classList.toggle("active", i === index);
        }

        carouselContainer.style.transform =
            `translateX(-${index * 100}%)`;

        lastCategory = index;
    }

    const carouselShow = range(progress, 0.83, 0.87);
    const carouselFade = 1 - range(calendarChange, 0.01, 0.12);

    carouselView.style.opacity = carouselShow * carouselFade;
}

// 이벤트 사진의 중심과 크기를 캘린더 사진 위치에 맞춰 이동
function updateCalendarBridge(change, wrapperRect, targetRect) {
    if (change <= 0 || change >= 1) {
        bridgeImage.style.display = "none";
        bridgeImage.style.opacity = 1;
        return;
    }

    const sourceLeft = wrapperRect.left + wrapper.offsetWidth * 0.54;
    const sourceTop = HEADER_HEIGHT + wrapper.offsetHeight * 0.17;
    const sourceWidth = wrapper.offsetWidth * 0.40;
    const sourceHeight = wrapper.offsetHeight * 0.69;

    const sourceCenterX = sourceLeft + sourceWidth / 2;
    const sourceCenterY = sourceTop + sourceHeight / 2;

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    const align = range(change, 0, 0.16);
    const shrink = range(change, 0.12, 0.82);

    const centerX = between(sourceCenterX, targetCenterX, align);
    const centerY = between(sourceCenterY, targetCenterY, align);

    const width = between(sourceWidth, targetRect.width, shrink);
    const height = between(sourceHeight, targetRect.height, shrink);

    bridgeImage.style.display = "block";
    bridgeImage.style.left = `${centerX - width / 2}px`;
    bridgeImage.style.top = `${centerY - height / 2}px`;
    bridgeImage.style.width = `${width}px`;
    bridgeImage.style.height = `${height}px`;

    bridgeImage.style.opacity = 1 - range(change, 0.88, 1);
}

function updateCalendar(change, mapChange, wrapperRect, targetRect) {
    const backdropShow = range(change, 0.03, 0.28);
    const surroundingsHide = range(mapChange, 0.03, 0.38);
    const layerShow = range(mapChange, 0, 0.035);

    calendarVisual.style.setProperty("--backdrop-opacity", backdropShow);

    updateCalendarBridge(change, wrapperRect, targetRect);

    for (let i = 0; i < dayCards.length; i++) {
        const card = dayCards[i];

        const start = 0.16 + dayDistances[i] * 0.18;
        const end = 0.73 + dayDistances[i] * 0.16;
        const show = range(change, start, end);

        if (card === calendarSceneCard) {
            card.style.opacity = show * (1 - layerShow);
        } else {
            card.style.opacity = show * (1 - surroundingsHide);
        }

        card.style.transform = `translateY(${(1 - show) * 10}px)`;
    }

    for (let i = 0; i < calendarPhotos.length; i++) {
        const photo = calendarPhotos[i];

        if (i === 3) {
            const eventShow = range(change, 0.88, 1);

            photo.style.opacity = eventShow * (1 - surroundingsHide);
            continue;
        }

        const start = 0.43 + i * 0.06;
        const end = 0.78 + i * 0.06;
        const show = range(change, start, end);

        photo.style.opacity = show * (1 - surroundingsHide);
        photo.style.transform =
            `translateY(${(1 - show) * 26}px)`;
    }

    const contentShow = range(change, 0.70, 0.96);
    const contentOpacity = contentShow * (1 - surroundingsHide);

    calendarContent.style.opacity = contentOpacity;
    calendarContent.style.transform =
        `translateY(${(1 - contentShow) * 35}px)`;

    calendarContent.style.pointerEvents =
        contentOpacity > 0.9 ? "auto" : "none";
}

// 캘린더가 스크롤로 위로 밀려도 11일 카드의 원래 상대 위치는 유지됨.
// 참고: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
function getSceneCardRect(cardRect, visualRect) {
    return {
        left: cardRect.left - visualRect.left,
        top: HEADER_HEIGHT + cardRect.top - visualRect.top,
        width: cardRect.width,
        height: cardRect.height
    };
}

function resetMapSticky() {
    mapSticky.style.position = "";
    mapSticky.style.top = "";
    mapSticky.style.left = "";
    mapSticky.style.width = "";
    mapSticky.style.zIndex = "";
    mapSticky.style.backgroundColor = "";
}

// 11일 카드를 직접 fixed로 옮기면 Grid 배치가 바뀌므로 연결 레이어를 사용함.
function updateMap(change, mapTop, start) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const visibleHeight = screenHeight - HEADER_HEIGHT;

    const active = change > 0;
    const preview = active && mapTop > HEADER_HEIGHT;

    if (!active) {
        sceneTransition.style.display = "none";
        sceneTransition.style.opacity = 1;

        mapStageOne.style.opacity = 0;
        mapStageTwo.style.opacity = 0;
        mapStageTwo.style.pointerEvents = "none";
        mapContent.style.opacity = 0;
        mapContent.style.pointerEvents = "none";

        resetMapSticky();
        return;
    }

    if (preview) {
        mapSticky.style.position = "fixed";
        mapSticky.style.top = `${HEADER_HEIGHT}px`;
        mapSticky.style.left = "0";
        mapSticky.style.width = "100%";
        mapSticky.style.zIndex = "45";
        mapSticky.style.backgroundColor = "transparent";
    } else {
        resetMapSticky();
    }

    const startCenterX = start.left + start.width / 2;
    const startCenterY = start.top + start.height / 2;

    const screenCenterX = screenWidth / 2;
    const screenCenterY = HEADER_HEIGHT + visibleHeight / 2;

    const grow = range(change, 0.08, 0.43);
    const move = range(change, 0.12, 0.46);

    const tallWidth = Math.min(220, screenWidth * 0.18);
    const tallHeight = Math.min(620, visibleHeight * 0.82);

    let cardWidth = between(start.width, tallWidth, grow);
    let cardHeight = between(start.height, tallHeight, grow);

    let centerX = between(startCenterX, screenCenterX, move);
    let centerY = between(startCenterY, screenCenterY, move);

    let radius = between(18, 42, grow);

    const imageShow = range(change, 0.40, 0.57);

    transitionMap.style.opacity = imageShow;
    transitionDate.style.opacity = 1 - imageShow;
    transitionLabel.style.opacity = 1 - imageShow;
    transitionDate.style.fontSize = `${between(18, 28, grow)}px`;

    const mapExpand = range(change, 0.61, 0.90);

    cardWidth = between(cardWidth, screenWidth, mapExpand);
    cardHeight = between(cardHeight, visibleHeight, mapExpand);

    centerX = between(centerX, screenCenterX, mapExpand);
    centerY = between(centerY, screenCenterY, mapExpand);

    radius = between(radius, 0, mapExpand);

    sceneTransition.style.display = "block";
    sceneTransition.style.left = `${centerX - cardWidth / 2}px`;
    sceneTransition.style.top = `${centerY - cardHeight / 2}px`;
    sceneTransition.style.width = `${cardWidth}px`;
    sceneTransition.style.height = `${cardHeight}px`;
    sceneTransition.style.borderRadius = `${radius}px`;

    const layerShow = range(change, 0, 0.035);

    const textShow = range(change, 0.20, 0.40);
    const textPush = range(change, 0.38, 0.73);
    const textHide = range(change, 0.65, 0.80);

    mapStageOne.style.opacity = 1 - textHide;

    mapLeftText.style.opacity = textShow * (1 - textHide);
    mapRightText.style.opacity = textShow * (1 - textHide);

    mapLeftText.style.transform =
        `translateY(-50%) translateX(${-textPush * 160}px)`;

    mapRightText.style.transform =
        `translateY(-50%) translateX(${textPush * 160}px)`;

    mapImageWrap.style.width = `${screenWidth}px`;
    mapImageWrap.style.height = `${visibleHeight}px`;
    mapImageWrap.style.borderRadius = "0px";

    const handoff = range(change, 0.90, 0.97);

    mapStageTwo.style.opacity = handoff;
    sceneTransition.style.opacity = layerShow * (1 - handoff);

    const contentShow = range(change, 0.88, 1);

    mapContent.style.opacity = contentShow;
    mapContent.style.transform =
        `translateY(${(1 - contentShow) * 35}px)`;

    const clickable = contentShow > 0.9 ? "auto" : "none";
    mapContent.style.pointerEvents = clickable;
    mapStageTwo.style.pointerEvents = clickable;
}

function handleScroll() {
    const progress = getProgress(section, wrapper.offsetHeight);
    const calendarChange = getCalendarChange();
    const mapTop = mapSection.getBoundingClientRect().top;
    const mapChange = getMapChange(mapTop);

    // 위치를 읽기 전에 preview 배치를 확정하고, 이후 스타일 변경을 한 번에 처리함.
    const preview = calendarChange > 0 && calendarChange < 1;
    calendarVisual.classList.toggle("calendar-preview", preview);

    let wrapperRect = null;
    let targetRect = null;
    if (preview) {
        wrapperRect = wrapper.getBoundingClientRect();
        targetRect = calendarPhotos[3].getBoundingClientRect();
    }

    let sceneRect = null;
    if (mapChange > 0) {
        const cardRect = calendarSceneCard.getBoundingClientRect();
        const visualRect = calendarVisual.getBoundingClientRect();
        sceneRect = getSceneCardRect(cardRect, visualRect);
    }

    updateVideo(progress, calendarChange);
    updateIntro(progress, calendarChange);
    updateCategories(progress, calendarChange);
    updateCalendar(calendarChange, mapChange, wrapperRect, targetRect);
    updateMap(mapChange, mapTop, sceneRect);
}

let scrollFrame = null;

// 스크롤 이벤트가 연속 발생해도 다음 화면 갱신은 한 번만 예약
function requestScrollUpdate() {
    if (scrollFrame !== null) {
        return;
    }

    scrollFrame = requestAnimationFrame(function() {
        scrollFrame = null;
        handleScroll();
    });
}

video.addEventListener("loadedmetadata", requestScrollUpdate);
window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate);

handleScroll();
