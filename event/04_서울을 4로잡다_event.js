// 상단 이벤트 캐러셀: 같은 카드를 세 번 배치하여 끊김 없이 반복한다.
const track = document.getElementById('eventCarouselTrack');
const viewport = document.querySelector('.event-carousel-viewport');
const prevButton = document.querySelector('.event-carousel-prev');
const nextButton = document.querySelector('.event-carousel-next');
const dotsBox = document.getElementById('eventCarouselDots');
let dots = [];

const duration = 800;   // 한 칸 이동하는 데 걸리는 시간(ms)
const interval = 3000;  // 다음 이동까지의 간격(ms)
const startIndex = 3;
let current = startIndex;
let moving = false;
let timer;
let frame;
let cards = [];

fetch('./04_서울을 4로잡다_event.json')
  .then(response => {
    if (!response.ok) throw new Error('이벤트 데이터를 불러오지 못했습니다.');
    return response.json();
  })
  .then(events => {
    const featured = events.filter(event => event.featured).slice(0, 3);
    if (featured.length !== 3) return;

    const slides = [...featured, ...featured, ...featured];
    track.innerHTML = slides.map(event => `
      <article class="event-carousel-card">
        <a href="${event.officialUrl}" target="_blank" rel="noopener noreferrer">
          <div class="event-carousel-art">
            <img class="event-carousel-backdrop" src="${event.image}" alt="" aria-hidden="true">
            <img class="event-carousel-poster" src="${event.image}" alt="${event.title} 포스터">
          </div>
          <div class="event-carousel-info">
            <h2>${event.title}</h2>
            <p>${event.startDate} ~ ${event.endDate} · ${event.location}</p>
          </div>
        </a>
      </article>
    `).join('');

    cards = Array.from(track.querySelectorAll('.event-carousel-card'));

    // 카드 개수(3개)만큼 아래 점을 만든다. 점을 누르면 해당 카드로 이동한다.
    dotsBox.innerHTML = featured.map((event, i) =>
      `<button type="button" class="event-carousel-dot" aria-label="${i + 1}번째 이벤트: ${event.title}"></button>`
    ).join('');
    dots = Array.from(dotsBox.querySelectorAll('.event-carousel-dot'));
    dots.forEach((dot, i) => dot.addEventListener('click', () => {
      const gap = (i - (current % 3) + 3) % 3;
      if (gap === 1) move(1);
      else if (gap === 2) move(-1);
      startAutoSlide();
    }));

    draw(current);
    startAutoSlide();
  })
  .catch(error => {
    console.error(error);
    track.textContent = '이벤트 정보를 불러오지 못했습니다.';
  });

function position(index) {
  const before = Math.floor(index);
  const after = Math.min(before + 1, cards.length - 1);
  const fraction = index - before;
  const centerBefore = cards[before].offsetLeft + cards[before].offsetWidth / 2;
  const centerAfter = cards[after].offsetLeft + cards[after].offsetWidth / 2;
  return viewport.clientWidth / 2 - (centerBefore + (centerAfter - centerBefore) * fraction);
}

function draw(index) {
  if (!cards.length) return;
  track.style.transform = `translate3d(${position(index)}px, 0, 0)`;

  cards.forEach((card, i) => {
    const emphasis = Math.max(0, 1 - Math.abs(i - index));
    card.style.transform = `scale(${0.9 + 0.1 * emphasis})`;
    card.style.opacity = 0.7 + 0.3 * emphasis;
  });

  // 가장 가까운 카드에 해당하는 점을 활성화한다.
  const active = Math.round(index) % 3;
  dots.forEach((dot, i) => dot.classList.toggle('is-active', i === active));
}

function move(direction) {
  if (moving || !cards.length) return;
  moving = true;

  const from = current;
  const to = from + direction;
  const started = performance.now();

  function step(now) {
    const progress = Math.min((now - started) / duration, 1);
    // 움직임이 중간에서 자연스럽게 빨라졌다가 마지막에 느려진다.
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    draw(from + direction * eased);

    if (progress < 1) {
      frame = requestAnimationFrame(step);
      return;
    }

    current = to;
    // 양쪽 복제 카드까지 이동한 뒤 동일한 가운데 묶음으로 복귀한다.
    if (current >= 6) current -= 3;
    if (current < 3) current += 3;
    draw(current);
    moving = false;
  }

  frame = requestAnimationFrame(step);
}

function startAutoSlide() {
  clearInterval(timer);
  timer = setInterval(() => move(1), interval);
}

prevButton.addEventListener('click', () => {
  move(-1);
  startAutoSlide();
});

nextButton.addEventListener('click', () => {
  move(1);
  startAutoSlide();
});

window.addEventListener('resize', () => {
  if (frame) cancelAnimationFrame(frame);
  moving = false;
  draw(current);
});

// 다른 탭을 보는 동안 불필요한 애니메이션은 실행하지 않는다.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(timer);
    if (frame) cancelAnimationFrame(frame);
    moving = false;
    draw(current);
  } else if (cards.length) {
    startAutoSlide();
  }
});
