const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
menuButton?.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  menuButton.setAttribute('aria-label', expanded ? '메뉴 열기' : '메뉴 닫기');
  nav?.classList.toggle('open', !expanded);
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', '메뉴 열기');
  nav.classList.remove('open');
}));

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (finePointer && !reduceMotion.matches) {
  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="cursor-ring"></span><span class="cursor-core"></span><span class="cursor-label"></span>';
  document.body.append(cursor);
  document.body.classList.add('cursor-ready');

  let ringX = -100;
  let ringY = -100;
  let pointerX = -100;
  let pointerY = -100;
  let cursorFrame = 0;
  const setCursorPosition = (x, y) => {
    pointerX = x;
    pointerY = y;
    cursor.style.setProperty('--x', `${x}px`);
    cursor.style.setProperty('--y', `${y}px`);
    if (!cursorFrame) cursorFrame = requestAnimationFrame(moveRing);
  };
  function moveRing() {
    ringX += (pointerX - ringX) * .22;
    ringY += (pointerY - ringY) * .22;
    cursor.style.setProperty('--ring-x', `${ringX}px`);
    cursor.style.setProperty('--ring-y', `${ringY}px`);
    if (Math.abs(pointerX - ringX) + Math.abs(pointerY - ringY) > .5) {
      cursorFrame = requestAnimationFrame(moveRing);
    } else {
      cursorFrame = 0;
    }
  }
  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    setCursorPosition(event.clientX, event.clientY);
    cursor.classList.add('is-visible');
    const target = event.target instanceof Element ? event.target : null;
    const project = target?.closest('.exhibit-open');
    const control = target?.closest('a,button');
    cursor.classList.toggle('is-active', Boolean(control));
    const label = cursor.querySelector('.cursor-label');
    if (label) label.textContent = project ? 'VIEW' : control ? 'OPEN' : '';
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
  document.addEventListener('pointerdown', () => cursor.classList.add('is-pressed'));
  document.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'));
}
const exhibits = [...document.querySelectorAll('[data-exhibit]')];
const covers = [...document.querySelectorAll('[data-cover]')];
let scrollFrame = 0;

const projectFilters = [...document.querySelectorAll('.project-filter')];
const exhibitTrack = document.querySelector('.exhibit-track');

let galleryStateIndex = -1;
let galleryStateCount = -1;
const galleryViewport = document.querySelector('.exhibit-viewport');
const galleryProgress = document.querySelector('.gallery-progress');

function updateGalleryState() {
  if (!exhibitTrack) return;
  const visible = exhibits.filter((item) => !item.hidden);
  const current = visible.length
    ? Math.min(visible.length - 1, Math.round(exhibitTrack.scrollLeft / Math.max(1, exhibitTrack.clientWidth)))
    : 0;
  document.querySelectorAll('[data-exhibit-direction]').forEach((button) => {
    const direction = Number(button.dataset.exhibitDirection);
    button.disabled = direction < 0 ? current <= 0 : current >= visible.length - 1;
  });
  if (current === galleryStateIndex && visible.length === galleryStateCount) return;
  galleryStateIndex = current;
  galleryStateCount = visible.length;
  exhibits.forEach((item) => item.classList.toggle('is-current', visible[current] === item));
  if (galleryProgress) {
    galleryProgress.replaceChildren(...visible.map((_, index) => {
      const segment = document.createElement('span');
      segment.className = index === current ? 'is-current' : '';
      return segment;
    }));
  }
  if (galleryViewport && visible[current]) {
    galleryViewport.style.backgroundColor = getComputedStyle(visible[current]).getPropertyValue('--room-bg').trim();
  }
}

document.querySelectorAll('[data-exhibit-direction]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!exhibitTrack) return;
    const direction = Number(button.dataset.exhibitDirection);
    exhibitTrack.scrollBy({ left: direction * exhibitTrack.clientWidth, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });
});
exhibitTrack?.addEventListener('scroll', updateGalleryState, { passive: true });
exhibitTrack?.addEventListener('scrollend', updateGalleryState);
window.addEventListener('resize', updateGalleryState, { passive: true });
updateGalleryState();
if (projectFilters.length) {
  const status = document.querySelector('.filter-status');
  const categoryNames = { all: '전체', product: '제품', web: '웹', graphic: '그래픽', character: '캐릭터' };
  projectFilters.forEach((button) => {
    const category = button.dataset.filter;
    const count = category === 'all'
      ? exhibits.length
      : exhibits.filter((item) => item.dataset.category === category).length;
    const countNode = button.querySelector('span');
    if (countNode) countNode.textContent = String(count).padStart(2, '0');
    button.addEventListener('click', () => {
      const selected = button.dataset.filter;
      let visible = 0;
      exhibits.forEach((item) => {
        const show = selected === 'all' || item.dataset.category === selected;
        item.hidden = !show;
        if (show) {
          item.classList.remove('filter-enter');
          void item.offsetWidth;
          item.classList.add('filter-enter');
          item.addEventListener('animationend', () => item.classList.remove('filter-enter'), { once: true });
        }
        if (show) visible += 1;
      });
      if (exhibitTrack) exhibitTrack.scrollTo({ left: 0, behavior: 'auto' });
      galleryStateIndex = -1;
      updateGalleryState();
      projectFilters.forEach((filter) => {
        const active = filter === button;
        filter.classList.toggle('is-active', active);
        filter.setAttribute('aria-pressed', String(active));
      });
      if (status) status.textContent = `${categoryNames[selected] ?? '선택한'} 작업 ${visible}개`;
    });
  });
}

const contactDialog = document.querySelector('.contact-dialog');
if (contactDialog) {
  const closeContact = () => contactDialog.close();
  document.querySelectorAll('[data-open-contact]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelector('.nav')?.classList.remove('open');
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
    contactDialog.showModal();
  }));
  contactDialog.querySelector('.contact-dialog-close')?.addEventListener('click', closeContact);
  contactDialog.addEventListener('click', (event) => {
    if (event.target === contactDialog) closeContact();
  });
  contactDialog.querySelector('.contact-compose')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const subject = form.elements.namedItem('subject').value.trim();
    const body = form.elements.namedItem('body').value.trim();
    const composeUrl = `mailto:medare2008@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = composeUrl;
  });
}

function updateExhibits() {
  scrollFrame = 0;
  exhibits.forEach((exhibit) => {
    const stage = exhibit.querySelector('.exhibit-stage');
    const artwork = exhibit.querySelector('.exhibit-art-wrap');
    if (!stage || !artwork) return;

    const bounds = stage.getBoundingClientRect();
    const distance = Math.abs((bounds.top + bounds.height / 2) - window.innerHeight / 2);
    const progress = reduceMotion.matches ? 1 : Math.min(1, Math.max(0, 1 - distance / (window.innerHeight * .85)));
    artwork.style.setProperty('--art-scale', `${.97 + progress * .03}`);
  });
  covers.forEach((cover) => {
    const runway = cover.querySelector('.home-cover-runway');
    const stage = cover.querySelector('.home-cover-stage');
    const art = cover.querySelector('.home-cover-art');
    if (!runway || !stage || !art) return;
    const runwayRect = runway.getBoundingClientRect();
    const stickyTop = document.querySelector('.header')?.offsetHeight ?? 0;
    const travel = Math.max(1, runway.offsetHeight - stage.offsetHeight);
    const progress = reduceMotion.matches ? 1 : Math.min(1, Math.max(0, (stickyTop - runwayRect.top) / travel));
    art.style.setProperty('--cover-scale', `${.97 + progress * .03}`);
    art.style.setProperty('--object-scale', `${1 + progress * .12}`);
    stage.style.setProperty('--cover-progress', progress.toFixed(3));
  });
}

function requestExhibitUpdate() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateExhibits);
}

if (exhibits.length || covers.length) {
  window.addEventListener('scroll', requestExhibitUpdate, { passive: true });
  window.addEventListener('resize', requestExhibitUpdate, { passive: true });
  reduceMotion.addEventListener?.('change', requestExhibitUpdate);
  updateExhibits();
}

const projectDetails = {
  lamp: { category: '제품 디자인 · 조명 콘셉트', title: '틈, 작은 책상 위의 조명', lead: '작은 책상에서 필요한 곳을 비추는 조명을 가정해 본 제품 콘셉트입니다.', background: '가정한 상황: 늦은 시간에도 책상에서 작업하는 사람에게는 주변을 덜 방해하는 빛이 필요합니다.', problem: '좁은 책상에서 시야를 가리지 않으면서 필요한 곳만 비출 수 있을까?', development: '갓의 각도와 크기, 빛의 범위를 스케치와 형태 모형으로 비교하는 방향을 설정했습니다.', outcome: '제안 방향: 책상 위 공간을 적게 차지하면서 빛의 범위를 조절할 수 있는 조명입니다.' },
  moa: { category: '웹 디자인 · 지역 서비스 콘셉트', title: '모아, 동네를 잇는 지도', lead: '동네의 작은 장소를 발견하도록 돕는 서비스 화면 콘셉트입니다.', background: '가정한 상황: 동네의 작은 가게 정보가 흩어져 있어 새로운 장소를 발견하기 어렵습니다.', problem: '정보를 쉽게 찾게 하면서도 우연한 발견의 즐거움을 남길 수 있을까?', development: '장소를 주제별로 묶고 지도와 짧은 이야기로 연결하는 화면 흐름을 제안합니다.', outcome: '제안 방향: 익숙한 동네를 다른 시선으로 둘러보게 하는 지역 지도 서비스입니다.' },
  collect: { category: '그래픽 디자인 · 포스터 콘셉트', title: '매일의 수집', lead: '평범한 하루의 장면을 주제로 설정한 포스터 시리즈 콘셉트입니다.', background: '출발점: 반복되는 일상에도 사람마다 기억에 남는 순간이 있다는 생각입니다.', problem: '작은 순간의 감각을 짧은 시간 안에 전달하려면 어떤 시각 언어가 적절할까?', development: '타이포그래피와 색, 이미지 요소를 조합해 여섯 장의 포스터로 발전시키는 방향을 설정했습니다.', outcome: '제안 방향: 하루의 장면을 기록하고 다시 바라보게 하는 그래픽 포스터 시리즈입니다.' },
  cloud: { category: '캐릭터 디자인 · 이야기 콘셉트', title: '구름 우체국', lead: '편지를 전하는 구름 배달부의 캐릭터와 이야기 콘셉트입니다.', background: '출발점: 말로 전하기 어려운 마음도 안전하게 닿을 수 있으면 좋겠다는 생각입니다.', problem: '낯선 감정을 부담 없이 건넬 수 있는 캐릭터와 이야기는 어떤 모습일까?', development: '구름의 형태와 표정, 편지 소품을 활용해 성격과 이야기를 발전시키는 방향을 설정했습니다.', outcome: '제안 방향: 비가 그친 뒤 편지를 전하는 구름 배달부의 이야기입니다.' },
};

const detailDialog = document.querySelector('.project-detail');
if (detailDialog) {
  const restorePageScroll = () => { document.body.style.overflow = ''; };
  document.querySelectorAll('.exhibit-open').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    const detail = projectDetails[link.dataset.project];
    if (!detail) return;
    detailDialog.querySelector('#detail-title').textContent = detail.title;
    const sourceArtwork = link.querySelector('.art');
    const detailArtwork = detailDialog.querySelector('.detail-art');
    if (sourceArtwork && detailArtwork) {
      detailArtwork.replaceChildren(sourceArtwork.cloneNode(true));
      detailDialog.classList.remove('is-opening');
      void detailArtwork.offsetWidth;
    }
    Object.entries(detail).forEach(([key, value]) => {
      const field = detailDialog.querySelector(`[data-detail="${key}"]`);
      if (field) field.textContent = value;
    });
    detailDialog.showModal();
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => detailDialog.classList.add('is-opening'));
  }));
  const closeDetail = () => detailDialog.close();
  detailDialog.querySelector('.detail-close')?.addEventListener('click', closeDetail);
  detailDialog.querySelector('.detail-done')?.addEventListener('click', closeDetail);
  detailDialog.addEventListener('close', restorePageScroll);
  detailDialog.addEventListener('click', (event) => {
    if (event.target === detailDialog) closeDetail();
  });
}





