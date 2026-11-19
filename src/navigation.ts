type NavigationMode = 'top' | 'hidden' | 'island';

let bar: HTMLElement | null = null;
let mode: NavigationMode = 'top';
let previousY = Math.max(0, scrollY);
let turnY = previousY;
let direction = 0;
let frame = 0;

function apply(next: NavigationMode) {
  mode = next;
  if (bar) bar.dataset.navbar = mode;
}

function followScroll() {
  frame = 0;
  const y = Math.max(0, scrollY);
  const step = Math.sign(y - previousY);
  if (step && step !== direction) {
    direction = step;
    turnY = previousY;
  }
  previousY = y;
  if (y <= 72) apply('top');
  else if (y > 105 && direction > 0 && y - turnY >= 12) apply('hidden');
  else if (direction < 0 && turnY - y >= 8) apply('island');
}

export function syncNavigation(root: HTMLElement) {
  bar = root.querySelector('.site-header');
  if (scrollY <= 72) {
    previousY = turnY = Math.max(0, scrollY);
    direction = 0;
    apply('top');
  } else if (bar) {
    bar.dataset.navbar = mode;
  }
}

export function startNavigation() {
  window.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(followScroll);
  }, { passive: true });
}
