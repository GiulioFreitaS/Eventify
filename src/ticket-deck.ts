export type DeckMove = {
  stack: HTMLElement;
  step?: number;
  index?: number;
  focus?: HTMLElement;
  pull?: number;
};

export function enableTicketDecks(root: HTMLElement, move: (intent: DeckMove) => void) {
  let drag: { face: HTMLElement; stack: HTMLElement; id: number; x: number; y: number } | null = null;
  let suppressLink = 0;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function clearDrag() {
    drag?.face.style.removeProperty('--deck-pull');
    drag = null;
  }

  root.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    if (performance.now() < suppressLink && target.closest('[data-ticket-swipe]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const control = target.closest<HTMLButtonElement>('button[data-ticket-step],button[data-ticket-index]');
    const stack = control?.closest<HTMLElement>('[data-ticket-stack]');
    if (!control || !stack) return;
    const { ticketIndex, ticketStep } = control.dataset;
    move(ticketIndex !== undefined
      ? { stack, index: Number(ticketIndex), focus: control }
      : { stack, step: Number(ticketStep), focus: control });
  }, { capture: true });

  root.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const key = event.key;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
    const target = event.target as HTMLElement;
    const stack = target.closest<HTMLElement>('[data-ticket-stack]');
    if (!stack?.querySelector('[data-ticket-swipe]')) return;
    event.preventDefault();
    move({ stack, step: key === 'ArrowLeft' ? -1 : 1, focus: target });
  });

  root.addEventListener('pointerdown', event => {
    const target = event.target as HTMLElement;
    if (target.closest('.ticket-deck-code')) return;
    const face = target.closest<HTMLElement>('[data-ticket-swipe]');
    const stack = face?.closest<HTMLElement>('[data-ticket-stack]');
    if (!face || !stack || event.button !== 0 || !event.isPrimary) return;
    suppressLink = 0;
    drag = { face, stack, id: event.pointerId, x: event.clientX, y: event.clientY };
  }, { passive: true });

  window.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId || reduceMotion.matches) return;
    const x = event.clientX - drag.x;
    const y = event.clientY - drag.y;
    const pull = Math.abs(x) > Math.max(7, Math.abs(y)) ? Math.max(-18, Math.min(18, x * .2)) : 0;
    drag.face.style.setProperty('--deck-pull', `${pull}px`);
  }, { passive: true });

  window.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const { face, stack, x, y } = drag;
    const pull = Number.parseFloat(face.style.getPropertyValue('--deck-pull')) || 0;
    clearDrag();
    const horizontal = event.clientX - x;
    const vertical = event.clientY - y;
    if (!stack.isConnected || Math.abs(horizontal) < 42 || Math.abs(horizontal) < 1.25 * Math.abs(vertical)) return;
    suppressLink = performance.now() + 300;
    move({ stack, step: horizontal > 0 ? -1 : 1, pull });
  }, { passive: true });

  window.addEventListener('pointercancel', event => {
    if (drag?.id === event.pointerId) clearDrag();
  }, { passive: true });
  window.addEventListener('blur', clearDrag);
  root.addEventListener('dragstart', event => {
    if ((event.target as HTMLElement).closest('[data-ticket-swipe]')) event.preventDefault();
  });
}
