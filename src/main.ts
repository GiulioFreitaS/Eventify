import { explore } from './explore.ts';
import { categories, eventUrl, managedUrl, money, ownerTickets, priceLabel, profileFor, randomId, registrationsFor, ticketUrl } from './model.ts';
import type { Category, EventData, Registration } from './model.ts';
import { changePublication, checkIn, enter, enterDemo, exitProfile, formEvent, hydrate, observeUpdates, readState, registerProfile, reserve, saveEvent, toggleSave, updateProfile, validateEvent, ValidationError } from './repository.ts';
import { access, checkout, eventDetails, profilePage, saved, wallet } from './participant.ts';
import { dashboard, editor, eventPreview, manage, organizerEvents, organizerShell, participantStatus, participantTime, participants, participantsUrl } from './organizer.ts';
import { avatar, empty, esc, facts, icon, logo } from './ui.ts';
import type { Icon } from './ui.ts';
import { ticketImage } from './ticket-image.ts';
import { captureCards, movePage, openPanel, popFeedback, revealResults, revealStep, revealTicket, shuffleTickets, startMotion, stopPageMotion, syncHero } from './motion.ts';
import { startNavigation, syncNavigation } from './navigation.ts';
import { enableTicketDecks } from './ticket-deck.ts';
import type { DeckMove } from './ticket-deck.ts';

const app = document.querySelector<HTMLElement>('#app')!;
const announcer = document.querySelector<HTMLElement>('#announcer')!;
const dialog = document.querySelector<HTMLDialogElement>('#dialog')!;
const state = () => readState();
const exploreUrl = () => sessionStorage.getItem('eventify.explore') || '/';
let editorStage = 0;
let editorValues: EventData | undefined;
let notifyTimer = 0;
const deckChoices = new Map<string, string>();

function render() {
  const current = state();
  const profile = profileFor(current);
  const path = location.pathname;
  const isHome = path === '/';
  const params = new URLSearchParams(location.search);
  if (isHome) sessionStorage.setItem('eventify.explore', location.pathname + location.search);
  const nav = (label: string, href: string, selected: boolean) => `<a href="${esc(href)}"${selected ? ' aria-current="page"' : ''}>${label}</a>`;
  const onCheckout = path.endsWith('/inscricao');
  const organizing = path.startsWith('/organizador');
  const exploring = isHome || (path.startsWith('/eventos') && !onCheckout);
  const ticketsActive = path.startsWith('/ingressos') || onCheckout;
  const organize = nav('<span class="desktop-label">Para organizar</span><span class="mobile-only">Organizar</span>', '/organizador', organizing);
  const mobileTab = (label: string, href: string, symbol: Icon, active = false) =>
    nav(`${icon(symbol)}<span>${label}</span>`, href, active);
  const account = profile ? '/perfil' : '/entrar';
  const mobileMenu = `<nav class="mobile-tabs" aria-label="${organizing ? 'Navegação do organizador' : 'Navegação móvel'}">${organizing
    ? mobileTab('Visão geral', '/organizador', 'home', path === '/organizador')
      + mobileTab('Eventos', '/organizador/eventos', 'calendar', /^\/organizador\/(eventos|participantes)/.test(path))
      + mobileTab('Check-in', '/organizador/check-in', 'scan', path.startsWith('/organizador/check-in'))
    : mobileTab('Explorar', exploreUrl(), 'compass', exploring)
      + mobileTab('Ingressos', '/ingressos', 'ticket', ticketsActive)
      + mobileTab('Salvos', '/salvos', 'bookmark', path === '/salvos')
  }${mobileTab('Perfil', account, 'user', path === '/perfil')}</nav>`;
  const city = esc(new URL(exploreUrl(), location.origin).searchParams.get('local') || 'São Paulo');
  const header = `<header class="site-header${isHome ? ' home-header' : ''}"><div class="header-inner">
    ${logo()}<nav class="header-nav" aria-label="Principal">
      ${nav('Explorar', exploreUrl(), exploring)}
      ${nav('Minha agenda', '/ingressos', ticketsActive)}
      ${nav('Salvos', '/salvos', path === '/salvos')}
    </nav>
    <div class="header-actions">${organize}
      <button class="header-location" data-location aria-label="Filtrar por localização · ${city}" ${isHome ? 'aria-expanded="false" aria-controls="filtro-local"' : ''}>${icon('pin')} <span>${city}</span>${icon('chevron')}</button>
      ${profile ? `<a class="account-link" href="/perfil" aria-label="Meu perfil"${path === '/perfil' ? ' aria-current="page"' : ''}>${avatar(profile.name)}</a>` : nav('Entrar', '/entrar', false)}
    </div>
  </div></header>`;
  const route = path.split('/').filter(Boolean);
  const notFound = `<section class="container page-body">${empty('Página indisponível.', 'Confira o endereço ou volte à programação.', ['Explorar eventos', exploreUrl()])}</section>`;
  let content = notFound;
  let title = 'Página indisponível';
  const isAccess = path === '/entrar' || path === '/cadastro';
  if (path === '/') { content = explore(current, params); title = 'Explorar'; }
  if (route[0] === 'eventos' && route.length >= 2 && route.length <= 3) {
    const event = current.events.find(item => item.id === route[1] && item.status === 'published');
    if (event && route.length === 2) { content = eventDetails(current,event,exploreUrl()); title = event.title; }
    if (event && route[2] === 'inscricao') {
      const quantity = Number(params.get('quantidade') ?? '1');
      const order = history.state?.order || randomId();
      if (!history.state?.order) history.replaceState({ ...history.state, order }, '', location.href);
      content = checkout(current,event,quantity,order);
      title = 'Inscrição';
    }
  }
  if (route[0] === 'ingressos' && route.length <= 2) { content = wallet(current,route[1],params,deckChoices); title = 'Meus ingressos'; }
  if (path === '/salvos') { content = saved(current,params); title = 'Salvos'; }
  if (path === '/perfil') { content = profilePage(current,params.get('secao') || ''); title = 'Perfil'; }
  if (isAccess) { content = access(current,path === '/cadastro'); title = path === '/cadastro' ? 'Criar conta' : 'Entrar'; }
  if (route[0] === 'organizador') {
    let organizerContent = empty('Página indisponível.', 'Volte à área do organizador.', ['Visão geral', '/organizador']);
    title = 'Organizador';
    if (path === '/organizador' || path === '/organizador/eventos') organizerContent = dashboard(current,route.length === 2);
    if (path === '/organizador/participantes' || path === '/organizador/check-in') {
      const check = path.endsWith('/check-in');
      organizerContent = participants(current,params,check);
      title = check ? 'Check-in' : 'Participantes';
    }
    if (path === '/organizador/eventos/novo') { organizerContent = editor(undefined,editorStage,editorValues); title = 'Criar evento'; }
    if (route[1] === 'eventos' && route[2] !== 'novo') {
      const event = organizerEvents(current).find(item => item.id === route[2]);
      if (event && route.length === 3) organizerContent = manage(current,event,params.get('aba') || '');
      if (event && route.length === 4 && route[3] === 'editar') organizerContent = editor(event,editorStage,editorValues);
    }
    content = organizerShell(current,organizerContent,path);
  }
  app.innerHTML = `${isAccess ? '' : header}<main id="conteudo" tabindex="-1">${content}</main>${isAccess ? '' : `<footer class="site-footer container"><span>Eventify</span><span>Encontros que ficam.</span></footer>${mobileMenu}`}`;
  app.dataset.path = path;
  syncNavigation(app);
  syncHero(app);
  document.title = title + ' · Eventify';
}

function switchDeck({ stack, step, index, focus, pull }: DeckMove) {
  const eventId = stack.dataset.ticketStack!;
  const ids: string[] = JSON.parse(stack.dataset.ticketIds!);
  const current = Number(stack.dataset.ticketCurrent);
  const next = index ?? (current + (step ?? 0) + ids.length) % ids.length;
  if (!ids[next] || current === next) return;
  const previous = stack.querySelector<HTMLElement>('[data-ticket-swipe]');
  deckChoices.set(eventId, ids[next]);
  stopPageMotion();
  history.replaceState(null, '', ticketUrl(ids[next]) + '?ver=lista');
  render();
  const deck = [...app.querySelectorAll<HTMLElement>('[data-ticket-stack]')].find(item => item.dataset.ticketStack === eventId);
  const face = deck?.querySelector<HTMLElement>('[data-ticket-swipe]');
  if (focus) {
    const stepButton = focus.closest<HTMLButtonElement>('[data-ticket-step]');
    const selector = stepButton ? `[data-ticket-step="${stepButton.dataset.ticketStep}"]`
      : focus.matches('[data-ticket-index]') ? '[data-ticket-index][aria-current]'
      : focus.closest('a') ? '.ticket-deck-links a' : '[data-ticket-swipe]';
    deck?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }
  shuffleTickets(previous, face, (step ?? next - current) < 0, pull);
}

function focusPage() {
  window.scrollTo(0, 0);
  document.querySelector<HTMLElement>('#conteudo')?.focus({ preventScroll: true });
}

function go(href: string, scroll = true, source?: HTMLAnchorElement) {
  const previous = location.pathname;
  const next = new URL(href, location.href);
  const changed = href !== previous + location.search;
  const update = () => {
    if (changed) {
      history.pushState(null, '', href);
      editorStage = 0;
      editorValues = undefined;
    }
    render();
    if (scroll) focusPage();
  };
  if (scroll && previous !== next.pathname) {
    const cover = /^\/eventos\/[^/]+$/.test(next.pathname)
      ? source?.closest('[data-event-card]')?.querySelector<HTMLImageElement>('.event-media img')
      : undefined;
    return movePage(app, update, { cover: cover ?? undefined, back: next.pathname === '/' });
  }
  stopPageMotion();
  const cards = changed && previous === '/' && next.pathname === '/' ? captureCards(app) : null;
  update();
  if (cards) revealResults(app, cards);
}
function browse(form: HTMLFormElement, overrides: Record<string, string> = {}) {
  const fields = Object.fromEntries(new FormData(form));
  const data = { ...fields, ...overrides };
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) { if (String(value).trim()) query.set(key, String(value).trim()); }
  go(query.size ? '/?' + query : '/', false);
}
function notify(message: string) {
  announcer.textContent = message;
  announcer.classList.add('visible');
  openPanel(announcer);
  clearTimeout(notifyTimer);
  notifyTimer = window.setTimeout(() => announcer.classList.remove('visible'), 3700);
}

function showDialog(title: string, body: string) {
  dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><form method="dialog"><button aria-label="Fechar">${icon('close')}</button></form></div>${body}`;
  dialog.showModal();
  openPanel(dialog);
}

function showError(form: HTMLFormElement, error: unknown) {
  const slot = form.querySelector<HTMLElement>('[data-error]');
  const message = error instanceof ValidationError ? error.message : 'Não foi possível concluir a ação. Tente novamente.';
  if (!slot) { notify(message); return; }
  slot.textContent = message;
  slot.hidden = false;
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"','""') + '"';
}

app.addEventListener('click', async event => {
  const target = event.target as HTMLElement;
  const anchor = target.closest<HTMLAnchorElement>('a[href]');
  if (anchor && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0
    && anchor.origin === location.origin && !anchor.target && !anchor.hasAttribute('download')) {
    if (anchor.dataset.focus) {
      event.preventDefault();
      document.querySelector<HTMLElement>('#search-query')?.focus({ preventScroll: true });
      document.querySelector('#busca')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    } else if (anchor.hasAttribute('data-profile-focus')) {
      event.preventDefault();
      go('/perfil', false);
      document.querySelector<HTMLElement>('#profile [name="name"]')?.focus();
    } else if (anchor.hash && anchor.closest('.details-story .section-tabs')) {
      for (const tab of anchor.parentElement!.querySelectorAll('a')) tab.removeAttribute('aria-current');
      anchor.setAttribute('aria-current','location');
    } else if (!anchor.hash) {
      event.preventDefault();
      go(anchor.pathname + anchor.search, true, anchor);
    }
    return;
  }
  const button = target.closest<HTMLButtonElement>('button');
  if (!button) return;
  try {
    if (button.dataset.category !== undefined) {
      const category = button.dataset.category;
      browse(document.querySelector<HTMLFormElement>('#search')!, { categoria: category });
      [...document.querySelectorAll<HTMLButtonElement>('[data-category]')].find(item => item.dataset.category === category)?.focus();
    } else if (button.hasAttribute('data-clear-filters')) {
      go('/', false);
      document.querySelector<HTMLElement>('#search-query')?.focus();
    } else if (button.hasAttribute('data-location')) {
      if (location.pathname !== '/') {
        go(exploreUrl(), false);
        window.scrollTo(0, 0);
      }
      const panel = document.querySelector<HTMLElement>('#filtro-local');
      if (panel) {
        panel.hidden = !panel.hidden;
        document.querySelector('[data-location]')?.setAttribute('aria-expanded', String(!panel.hidden));
        if (!panel.hidden) {
          panel.querySelector('select')?.focus();
          openPanel(panel);
        }
      }
    } else if (button.dataset.save) {
      const id = button.dataset.save;
      button.disabled = true;
      try { notify(await toggleSave(id) ? 'Evento salvo.' : 'Evento removido dos salvos.'); }
      finally { button.disabled = false; }
      render();
      const next = [...document.querySelectorAll<HTMLButtonElement>('[data-save]')].find(item => item.dataset.save === id);
      (next || document.querySelector<HTMLElement>('#conteudo'))?.focus({ preventScroll: true });
      popFeedback(next?.querySelector('.icon'));
    } else if (button.hasAttribute('data-demo')) {
      await enterDemo();
      go('/perfil');
    } else if (button.hasAttribute('data-logout')) {
      await exitProfile();
      go('/entrar');
    } else if (button.hasAttribute('data-terms')) {
      showDialog('Termos da inscrição', '<p>Esta inscrição faz parte de uma demonstração da Eventify. O registro existe apenas neste navegador, não gera cobrança e não concede entrada em um evento real.</p><p>Use dados fictícios para testar os formulários.</p>');
    } else if (button.dataset.downloadTicket) {
      const current = state();
      const ticket = ownerTickets(current).find(item => item.id === button.dataset.downloadTicket);
      const event = current.events.find(item => item.id === ticket?.eventId);
      if (ticket && event) {
        button.disabled = true;
        try { download(`Eventify-${ticket.code}.png`,await ticketImage(ticket,event)); }
        finally { button.disabled = false; }
      }
    } else if (button.dataset.share) {
      const href = new URL(eventUrl(button.dataset.share),location.origin).href;
      try { await navigator.clipboard.writeText(href); notify('Link local copiado.'); }
      catch { showDialog('Link do evento', `<label class="field"><span>Endereço local</span><input value="${esc(href)}" readonly></label>`); }
    } else if (button.dataset.publish) {
      const publishing = button.dataset.status === 'published';
      showDialog(publishing ? 'Publicar evento?' : 'Despublicar evento?', `<p>${publishing
        ? 'O evento aparecerá em Explorar e poderá receber inscrições demonstrativas.'
        : 'O evento sairá de Explorar. Os ingressos emitidos e a lista de participantes continuarão disponíveis.'}</p>
        <form id="publication" data-event="${esc(button.dataset.publish)}" data-status="${publishing ? 'published' : 'draft'}">
          <p class="form-error" data-error role="alert" hidden></p><button class="btn" type="submit">${publishing ? 'Publicar evento' : 'Despublicar evento'}</button></form>`);
    } else if (button.dataset.participant) {
      const ticket = state().registrations.find(item => item.id === button.dataset.participant);
      if (ticket) showDialog(ticket.name, `${facts([['ticket',ticket.code],['user',ticket.email],['check',participantStatus(ticket)]])}<p>Horário da entrada: ${participantTime(ticket)}</p><a class="btn" href="${participantsUrl(ticket.eventId,true)}">Ir ao check-in</a>`);
    } else if (button.dataset.export) {
      const lines = [['Participante','E-mail','Ingresso','Status','Entrada'], ...registrationsFor(state(),button.dataset.export)
        .map(item => [item.name,item.email,item.code,participantStatus(item),participantTime(item)])];
      download('eventify-participantes.csv',new Blob(['\ufeff' + lines.map(row => row.map(csvCell).join(';')).join('\r\n')],{ type:'text/csv;charset=utf-8' }));
    }
  } catch (error) { notify(error instanceof ValidationError ? error.message : 'Não foi possível concluir a ação. Tente novamente.'); }
});

async function submit(event: SubmitEvent) {
  const form = event.target as HTMLFormElement;
  if (!form.id) return;
  event.preventDefault();
  const data = new FormData(form);
  const field = (name: string) => String(data.get(name) || '').trim();
  const sender = event.submitter as HTMLButtonElement | null;
  const status = form.querySelector<HTMLElement>('[data-error]');
  if (status) status.hidden = true;
  if (sender) sender.disabled = true;
  try {
    switch (form.id) {
      case 'search':
        browse(form);
        document.querySelector<HTMLElement>('#search-query')?.focus({ preventScroll: true });
        break;
      case 'reserve':
        await go(eventUrl(form.dataset.event!) + '/inscricao?quantidade=' + Number(field('quantity')));
        break;
      case 'checkout': {
        const id = await reserve({ eventId: form.dataset.event!, quantity: Number(form.dataset.quantity),
          expectedPrice: Number(form.dataset.price), orderId: form.dataset.order!,
          name: field('name'), email: field('email'), method: field('method') as Registration['method'], accepted: data.has('terms') });
        await movePage(app, () => {
          history.replaceState(null, '', ticketUrl(id) + '?confirmado=1');
          render();
          focusPage();
        }, { after: () => revealTicket(app) });
        break;
      }
      case 'login':
        await enter(field('email'));
        await go('/perfil');
        break;
      case 'signup':
        await registerProfile(field('name'),field('email'));
        await go('/perfil');
        break;
      case 'profile':
        await updateProfile(form.dataset.section === 'preferencias'
          ? { interests: data.getAll('interest').filter(value => categories.includes(value as Category)) as Category[] }
          : form.dataset.section === 'notificacoes' ? { reminders: data.has('reminders') }
          : { name: field('name'), email: field('email') });
        render();
        notify('Alterações salvas neste navegador.');
        document.querySelector<HTMLElement>('#profile button[type="submit"]')?.focus({ preventScroll: true });
        break;
      case 'editor': {
        const values = formEvent(data);
        const action = sender?.value || 'next';
        const id = form.dataset.id || undefined;
        const existing = organizerEvents(state()).find(item => item.id === id);
        const mustValidate = action === 'publish' || (action === 'save' && existing?.status === 'published');
        if (mustValidate || (action === 'next' && editorStage === 0)) validateEvent(values,1);
        if (mustValidate || (action === 'next' && editorStage === 1)) {
          if (field('ticketType') === 'paid' && !(values.price > 0)) throw new ValidationError('Informe um preço maior que zero para o ingresso pago.');
          validateEvent(values,2);
        }
        if (action === 'next' || action === 'back') {
          editorValues = values;
          editorStage = Math.min(2,Math.max(0,editorStage + (action === 'next' ? 1 : -1)));
          render();
          window.scrollTo(0,0);
          const section = document.querySelector<HTMLElement>('#editor section:not([hidden]) h2');
          section?.setAttribute('tabindex','-1');
          section?.focus({ preventScroll: true });
          revealStep(section?.parentElement, action === 'back');
          popFeedback(app.querySelector('.stepper .current > span'));
        } else {
          const published = action === 'publish' || existing?.status === 'published';
          const next = await saveEvent(id,values,published ? 'published' : 'draft');
          await go(published ? managedUrl(next) : '/organizador/eventos');
          notify(published ? 'Evento publicado com as alterações.' : 'Rascunho salvo.');
        }
        break;
      }
      case 'publication': {
        const publishing = form.dataset.status === 'published';
        await changePublication(form.dataset.event!,publishing ? 'published' : 'draft');
        dialog.close();
        render();
        document.querySelector<HTMLElement>('[data-publish]')?.focus({ preventScroll: true });
        notify(publishing ? 'Evento publicado.' : 'Evento despublicado.');
        break;
      }
      case 'people-search': {
        const query = new URLSearchParams({ evento: form.dataset.event! });
        if (field('q')) query.set('q',field('q'));
        if (form.dataset.filter) query.set('status',form.dataset.filter);
        go('/organizador/participantes?' + query,false);
        document.querySelector<HTMLElement>('#people-search input')?.focus({ preventScroll: true });
        break;
      }
      case 'checkin': {
        const previous = form.querySelector<HTMLElement>('[data-check-result]');
        if (previous) previous.hidden = true;
        const result = await checkIn(form.dataset.event!,field('code'));
        render();
        const box = document.querySelector<HTMLElement>('[data-check-result]')!;
        box.textContent = result.repeated ? `Entrada já registrada para ${result.ticket.name}. ${participantTime(result.ticket)}.` : `Entrada confirmada para ${result.ticket.name}.`;
        box.hidden = false;
        openPanel(box);
        document.querySelector<HTMLElement>('#checkin-code')?.focus({ preventScroll: true });
        break;
      }
    }
  } catch (error) { showError(form,error); }
  finally { if (sender) sender.disabled = false; }
}

app.addEventListener('submit', submit);
dialog.addEventListener('submit', submit);
dialog.addEventListener('click', event => {
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
  if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    dialog.close();
    go(link.pathname + link.search);
  }
});
app.addEventListener('input', event => {
  const control = event.target as HTMLInputElement;
  const form = control.form;
  if (form?.id === 'search' && control.name === 'data') {
    const placeholder = form.querySelector<HTMLElement>('.date-placeholder');
    if (placeholder) placeholder.hidden = Boolean(control.value);
  }
  if (form?.id !== 'editor') return;
  const formData = new FormData(form);
  const preview = document.querySelector<HTMLElement>('[data-event-preview]');
  if (preview) preview.innerHTML = eventPreview(formEvent(formData));
  const paid = form.querySelector<HTMLElement>('[data-paid]');
  if (paid) paid.hidden = formData.get('ticketType') !== 'paid';
});
app.addEventListener('change', event => {
  const control = event.target as HTMLInputElement | HTMLSelectElement;
  if (control.id === 'saved-sort') {
    go('/salvos?ordem=' + control.value,false);
    document.querySelector<HTMLElement>('#saved-sort')?.focus();
  }
  if (control.id === 'people-event') go(participantsUrl(control.value,control.dataset.mode === 'check'),false);
  if (control.name === 'method') {
    const info = document.querySelector<HTMLElement>('[data-method-info]');
    if (info) info.textContent = control.value === 'pix' ? 'Pix de teste · a confirmação é instantânea nesta demonstração.' : 'Cartão de teste ·•••• 4242';
  }
  if (control.name === 'quantity' && control.form?.id === 'reserve') {
    const event = state().events.find(item => item.id === control.form?.dataset.event);
    const total = document.querySelector<HTMLElement>('[data-reserve-total]');
    const label = document.querySelector<HTMLElement>('[data-quantity-label]');
    const quantity = Number(control.value);
    if (label) label.textContent = quantity === 1 ? 'ingresso' : 'ingressos';
    if (event && total) total.textContent = event.price ? money(event.price * quantity) : priceLabel(0);
  }
});
window.addEventListener('popstate', () => {
  editorStage = 0;
  editorValues = undefined;
  if (app.dataset.path !== location.pathname) {
    movePage(app, render, { back: true });
    return;
  }
  stopPageMotion();
  const cards = location.pathname === '/' ? captureCards(app) : null;
  render();
  if (cards) revealResults(app, cards);
});
app.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const panel = document.querySelector<HTMLElement>('#filtro-local:not([hidden])');
  if (!panel) return;
  panel.hidden = true;
  const trigger = document.querySelector<HTMLButtonElement>('[data-location]');
  trigger?.setAttribute('aria-expanded','false');
  trigger?.focus();
});
observeUpdates(() => { if (!app.querySelector('#editor,#checkout,#profile')) render(); });
try { await hydrate(); }
catch { notify('O navegador bloqueou o armazenamento local. As alterações podem ficar indisponíveis.'); }
render();
startMotion(app);
startNavigation();
enableTicketDecks(app, switchDeck);
if (window.isSecureContext && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Acesso offline indisponível.', error));
}
