// 공통 캐러셀

const SHOW_COUNT = 3; // 보여줄 카드 수
const MOVE_MS = 800;  // 한 번 이동하는 시간
const WAIT_MS = 3000; // 이동 사이의 대기 시간

// 이동 속도 조절
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

  // 양끝에서 끊기지 않도록 같은 카드를 반복 배치
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

  // 가운데 카드를 강조
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

  // 다음 카드로 이동
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

  // 화면 크기 및 탭 전환 처리
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
