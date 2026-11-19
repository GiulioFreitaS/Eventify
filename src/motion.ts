const preference = matchMedia('(prefers-reduced-motion: reduce)');
const easeOut = 'cubic-bezier(.22, 1, .36, 1)';
const animations = new Set<Animation>();
const page = document.documentElement;
const cardSelector = '.event-grid [data-event-card]';

let transition: ViewTransition | undefined;
let clearCovers: (() => void) | undefined;
let navigation = 0;
let observer: IntersectionObserver | undefined;
let hero: HTMLElement | null = null;
let heroDepth: HTMLElement | null = null;
let scrollFrame = 0;

function play(element: Element | null | undefined, frames: Keyframe[], duration: number, delay = 0, easing = easeOut) {
  if (!element || preference.matches || typeof element.animate !== 'function') return;
  const animation = element.animate(frames, { duration, delay, easing, fill: 'backwards' });
  animations.add(animation);
  const forget = () => animations.delete(animation);
  animation.finished.then(forget, forget);
  return animation;
}

function rise(element: Element | null | undefined, delay = 0, distance = 14, duration = 420) {
  play(element, [
    { opacity: 0, transform: `translate3d(0,${distance}px,0)` },
    { opacity: 1, transform: 'translate3d(0,0,0)' },
  ], duration, delay);
}

function visible(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < innerHeight && rect.width > 0;
}

function updateDepth() {
  scrollFrame = 0;
  if (!hero?.isConnected || !heroDepth || preference.matches) return;
  const rect = hero.getBoundingClientRect();
  const travel = Math.min(55, Math.max(0, -rect.top * .19));
  if (rect.bottom > 0) heroDepth.style.setProperty('--hero-drift', `${travel}px`);
}

function queueDepth() {
  if (!scrollFrame && hero && !preference.matches) scrollFrame = requestAnimationFrame(updateDepth);
}

export function syncHero(root: HTMLElement) {
  hero = root.querySelector('.hero');
  heroDepth = hero?.querySelector('.hero-image') ?? null;
  queueDepth();
}

function watchCards(root: HTMLElement, skipVisible = false) {
  observer?.disconnect();
  if (preference.matches || typeof IntersectionObserver !== 'function') return;
  observer = new IntersectionObserver((entries, current) => {
    let stagger = 0;
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting || !target.isConnected) continue;
      current.unobserve(target);
      rise(target, Math.min(stagger++ * 55, 165), 22, 530);
    }
  }, { threshold: .07 });
  for (const card of root.querySelectorAll(cardSelector)) {
    if (!skipVisible || !visible(card)) observer.observe(card);
  }
}

export function startMotion(root: HTMLElement) {
  window.addEventListener('scroll', queueDepth, { passive: true });
  window.addEventListener('resize', queueDepth, { passive: true });
  syncHero(root);
  watchCards(root);
  const startHero = hero;
  play(startHero?.querySelector('.hero-image img'), [
    { opacity: .65, transform: 'scale(1.065)' },
    { opacity: 1, transform: 'scale(1)' },
  ], 960);
  startHero?.querySelectorAll('.hero-copy > *, .hero-pick > *').forEach((element, index) => {
    rise(element, 100 + index * 49, 18, 610);
  });
  if (!startHero) routeEntrance(root);
}

export function captureCards(root: HTMLElement) {
  const positions = new Map<string, DOMRect>();
  if (!preference.matches) {
    for (const card of root.querySelectorAll<HTMLElement>(cardSelector)) {
      if (visible(card)) positions.set(card.dataset.eventCard!, card.getBoundingClientRect());
    }
  }
  return positions;
}

export function revealResults(root: HTMLElement, before: Map<string, DOMRect>) {
  if (preference.matches) return;
  const cards = [...root.querySelectorAll<HTMLElement>(cardSelector)].filter(visible);
  cards.forEach((card, index) => {
    const previous = before.get(card.dataset.eventCard!);
    if (!previous) {
      rise(card, Math.min(index * 45, 135), 18, 440);
      return;
    }
    const next = card.getBoundingClientRect();
    const x = previous.left - next.left;
    const y = previous.top - next.top;
    if (Math.abs(x) + Math.abs(y) > 3) {
      play(card, [{ transform: `translate3d(${x}px,${y}px,0)` }, { transform: 'translate3d(0,0,0)' }], 465);
    }
  });
  rise(root.querySelector('.filter-summary'), 0, 5, 270);
  if (!cards.length) rise(root.querySelector('.browse .empty'), 0, 9, 350);
  watchCards(root, true);
}

function routeEntrance(root: HTMLElement) {
  const heading = root.querySelector('.page-heading, .details-booking > h1, .access-card, .page-body .empty');
  rise(heading, 0, 12, 340);
}

export function stopPageMotion() {
  navigation++;
  clearCovers?.();
  clearCovers = undefined;
  transition?.skipTransition();
  transition = undefined;
  delete page.dataset.routeMotion;
}

function waitForCover(photo: HTMLImageElement) {
  if (photo.complete || typeof photo.decode !== 'function') return;
  return new Promise<void>(resolve => {
    const timeout = window.setTimeout(resolve, 120);
    const done = () => { clearTimeout(timeout); resolve(); };
    photo.decode().then(done, done);
  });
}

export function movePage(root: HTMLElement, update: () => void, options: {
  cover?: HTMLImageElement;
  back?: boolean;
  after?: () => void;
} = {}) {
  stopPageMotion();
  const step = navigation;
  const finish = () => {
    if (step !== navigation) return;
    watchCards(root, true);
    options.after?.();
  };
  if (preference.matches || typeof document.startViewTransition !== 'function') {
    update();
    routeEntrance(root);
    if (!preference.matches) watchCards(root);
    options.after?.();
    return;
  }

  const oldCover = options.cover;
  const shareCover = Boolean(oldCover?.naturalWidth && visible(oldCover));
  const named: HTMLImageElement[] = [];
  const mark = (photo: HTMLImageElement) => {
    photo.classList.add('motion-cover');
    named.push(photo);
  };
  const unmark = () => {
    for (const photo of named) photo.classList.remove('motion-cover');
  };
  clearCovers = unmark;
  if (shareCover && oldCover) mark(oldCover);
  page.dataset.routeMotion = shareCover ? 'cover' : options.back ? 'back' : 'forward';
  const active = document.startViewTransition(async () => {
    if (step !== navigation) return;
    update();
    if (shareCover && !preference.matches) {
      const photo = root.querySelector<HTMLImageElement>('.details-photo');
      if (photo) {
        mark(photo);
        await waitForCover(photo);
      }
    }
  });
  transition = active;
  void active.ready.catch(() => {}).finally(() => {
    if (clearCovers !== unmark) return;
    unmark();
    clearCovers = undefined;
  });
  const settle = () => {
    if (transition !== active) return;
    transition = undefined;
    delete page.dataset.routeMotion;
    finish();
  };
  active.finished.then(settle, settle);
  void active.updateCallbackDone.catch(console.error);
  return active.updateCallbackDone;
}

export function popFeedback(element: Element | null | undefined) {
  play(element, [
    { transform: 'scale(.78)' },
    { transform: 'scale(1.18)', offset: .55 },
    { transform: 'scale(1)' },
  ], 335);
}

export function openPanel(element: Element | null | undefined) {
  play(element, [
    { opacity: 0, transform: 'translateY(9px) scale(.98)' },
    { opacity: 1, transform: 'translateY(0) scale(1)' },
  ], 310);
}

export function revealStep(element: Element | null | undefined, back: boolean) {
  play(element, [
    { opacity: 0, transform: `translateX(${back ? -18 : 18}px)` },
    { opacity: 1, transform: 'translateX(0)' },
  ], 390);
}

export function shuffleTickets(previous: HTMLElement | null, incoming: HTMLElement | null | undefined, back: boolean, pull = 0) {
  if (!previous || !incoming || preference.matches || typeof incoming.animate !== 'function') return;
  const outgoing = previous.cloneNode(true) as HTMLElement;
  outgoing.classList.add('ticket-deck-outgoing');
  outgoing.removeAttribute('data-ticket-swipe');
  outgoing.removeAttribute('tabindex');
  outgoing.removeAttribute('style');
  outgoing.setAttribute('aria-hidden', 'true');
  outgoing.inert = true;
  incoming.after(outgoing);

  const side = back ? 1 : -1;
  const travel = Math.min(108, incoming.offsetWidth * .14);
  const duration = 540;
  const easing = 'cubic-bezier(.26,.61,.28,1)';
  play(incoming, [
    { transform: `translate3d(${-side * 20}px,17px,0) rotate(${-side * 1.8}deg) scale(.96)` },
    { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)', offset: .83 },
    { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)' },
  ], duration, 0, easing);
  const tuck = { transform: `translate3d(${side * travel * .72}px,-13px,0) rotate(${side * 3}deg) scale(.98)`, opacity: 1 };
  const animation = play(outgoing, [
    { zIndex: 3, transform: `translate3d(${pull}px,0,0) rotate(0deg) scale(1)`, opacity: 1 },
    { zIndex: 3, transform: `translate3d(${side * travel}px,-25px,0) rotate(${side * 4}deg) scale(1.012)`, opacity: 1, offset: .49 },
    { ...tuck, zIndex: 3, offset: .71 },
    { ...tuck, zIndex: 0, offset: .711 },
    { zIndex: 0, transform: 'translate3d(11px,12px,0) rotate(1.35deg) scale(.97)', opacity: 0 },
  ], duration, 0, easing);
  const remove = () => outgoing.remove();
  if (animation) animation.finished.then(remove, remove);
  else remove();
}

export function revealTicket(root: HTMLElement) {
  rise(root.querySelector('.wallet-list .notice.success'), 0, 8, 340);
  play(root.querySelector('.wallet-paper'), [
    { opacity: .2, transform: 'translateY(36px) scale(.97)' },
    { opacity: 1, transform: 'translateY(0) scale(1)' },
  ], 560, 65);
}

preference.addEventListener('change', () => {
  if (preference.matches) {
    transition?.skipTransition();
    observer?.disconnect();
    heroDepth?.style.removeProperty('--hero-drift');
    for (const animation of animations) animation.cancel();
  } else {
    queueDepth();
  }
});
