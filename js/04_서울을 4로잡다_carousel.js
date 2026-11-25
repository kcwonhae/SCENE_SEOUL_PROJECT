// 공통 캐러셀
// 사용법: <div class="ss-carousel" data-src="JSON 경로"></div>
// JSON에서 featured가 true인 항목을 카드로 만들어 왼쪽으로 한 칸씩 무한 반복한다.

const SHOW_COUNT = 3; // 보여줄 카드 수
const MOVE_MS = 800;  // 한 번 이동하는 시간
const WAIT_MS = 3000; // 이동 사이의 대기 시간

// 처음과 끝은 느리게, 중간은 빠르게
const ease = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const cardHtml = item => {
  const url = item.officialUrl || item.sourceUrl;
  const open = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">` : '<div class="ss-carousel-content">';
  const close = url ? '</a>' : '</div>';

  return `
  <article class="ss-carousel-card">
    ${open}
      <div class="ss-carousel-art">
        <img class="ss-carousel-backdrop" src="${item.image}" alt="">
        <img class="ss-carousel-poster" src="${item.image}" alt="${item.imageAlt || item.title + ' 포스터'}">
      </div>
      <div class="ss-carousel-info">
        <h2>${item.title}</h2>
        <p>${item.startDate} ~ ${item.endDate} · ${item.location}</p>
      </div>
    ${close}
  </article>`;
};

async function initCarousel(root) {
  let items;
  try {
    const response = await fetch(root.dataset.src);
    if (!response.ok) throw new Error(response.status);
    items = (await response.json()).filter(item => item.featured).slice(0, SHOW_COUNT);
  } catch (error) {
    console.error(error);
    root.textContent = '정보를 불러오지 못했습니다.';
    return;
  }
  if (!items.length) return;

  // 끊김 없이 반복하도록 같은 카드를 세 번 이어 붙이고, 가운데 묶음에서 시작한다.
  const total = items.length;
  const slides = [...items, ...items, ...items];

  root.innerHTML = `
    <div class="ss-carousel-main">
      <button type="button" class="ss-carousel-btn" data-dir="-1" aria-label="이전">&lt;</button>
      <div class="ss-carousel-viewport">
        <div class="ss-carousel-track">${slides.map(cardHtml).join('')}</div>
      </div>
      <button type="button" class="ss-carousel-btn" data-dir="1" aria-label="다음">&gt;</button>
    </div>
    <div class="ss-carousel-dots">
      ${items.map((item, i) => `<button type="button" class="ss-carousel-dot" aria-label="${i + 1}번째: ${item.title}"></button>`).join('')}
    </div>`;

  const viewport = root.querySelector('.ss-carousel-viewport');
  const track = root.querySelector('.ss-carousel-track');
  const cards = [...track.children];
  const dots = [...root.querySelectorAll('.ss-carousel-dot')];

  let current = total;
  let busy = false;
  let frame;
  let timer;

  // index번째 카드가 화면 가운데 오도록 놓고, 가운데에 가까운 카드를 크고 선명하게 보여준다.
  function draw(index) {
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    const firstCenter = cards[0].offsetLeft + cards[0].offsetWidth / 2;
    track.style.transform = `translate3d(${viewport.clientWidth / 2 - firstCenter - index * step}px, 0, 0)`;

    cards.forEach((card, i) => {
      const focus = Math.max(0, 1 - Math.abs(i - index));
      card.style.transform = `scale(${0.9 + 0.1 * focus})`;
      card.style.opacity = 0.7 + 0.3 * focus;
    });

    const active = Math.round(index) % total;
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === active));
  }

  // steps칸 이동한 뒤, 같은 카드가 있는 가운데 묶음으로 돌아온다.
  function move(steps) {
    if (busy || !steps) return;
    busy = true;

    const from = current;
    const startedAt = performance.now();

    function tick(now) {
      const progress = Math.min((now - startedAt) / MOVE_MS, 1);
      draw(from + steps * ease(progress));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      current = total + ((from + steps) % total);
      draw(current);
      busy = false;
    }
    frame = requestAnimationFrame(tick);
  }

  function play() {
    clearInterval(timer);
    timer = setInterval(() => move(1), WAIT_MS);
  }

  root.querySelectorAll('.ss-carousel-btn').forEach(button => {
    button.addEventListener('click', () => {
      move(Number(button.dataset.dir));
      play();
    });
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      let steps = i - (current % total);
      if (Math.abs(steps) > total / 2) steps -= Math.sign(steps) * total;
      move(steps);
      play();
    });
  });

  // 크기가 바뀌거나 다른 탭을 보는 동안에는 이동을 멈추고 제자리에 맞춘다.
  function settle() {
    cancelAnimationFrame(frame);
    busy = false;
    draw(current);
  }

  window.addEventListener('resize', settle);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(timer);
      settle();
    } else {
      play();
    }
  });

  draw(current);
  play();
}

document.querySelectorAll('.ss-carousel').forEach(initCarousel);
