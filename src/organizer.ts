import { availability, categories, covers, emptyEvent, eventDate, eventUrl, locationLabel, managedUrl, normalize, priceLabel, profileFor, registrationsFor } from './model.ts';
import type { Event, EventData, Registration, State } from './model.ts';
import { arrowLink, avatar, dateFlag, empty, errorSlot, esc, facts, icon, input, options, panelTitle, picture, stepper } from './ui.ts';
import type { Icon } from './ui.ts';

export const organizerEvents = (state: State) => state.events.filter(event => event.managed);
export const participantsUrl = (id: string, check = false) => `/organizador/${check ? 'check-in' : 'participantes'}?evento=${encodeURIComponent(id)}`;

export function organizerShell(state: State, content: string, pathname: string) {
  const links: [string, string, Icon][] = [['Visão geral','/organizador','home'], ['Eventos','/organizador/eventos','calendar'],
    ['Participantes','/organizador/participantes','users'], ['Check-in','/organizador/check-in','scan'], ['Perfil','/perfil','user']];
  const user = profileFor(state);
  return `<div class="org-layout">
    <aside class="org-sidebar"><p class="eyebrow">Área do organizador</p>
      <nav aria-label="Área do organizador">${links.map(([label, href, symbol]) => `<a href="${href}" ${(href === '/organizador' ? pathname === href : pathname.startsWith(href)) ? 'aria-current="page"' : ''}>${icon(symbol)}${label}</a>`).join('')}</nav>
      <div class="org-switch"><a href="/">Modo participante ${icon('external')}</a>${user ? `<a href="/perfil">${avatar(user.name)}${esc(user.name)}</a>` : '<a href="/entrar">Entrar</a>'}</div>
    </aside>
    <div class="org-content">${content}</div>
  </div>`;
}

const badge = (event: Event) => `<span class="status-pill ${event.status === 'published' ? 'good' : ''}">${event.status === 'published' ? 'Publicado' : 'Rascunho'}</span>`;
const num = (value: number) => String(value).padStart(2, '0');
const stats = (items: [string, number | string][]) => `<dl class="stats">${items.map(([label, n]) => `<div><dt>${esc(label)}</dt><dd>${typeof n === 'number' ? num(n) : esc(n)}</dd></div>`).join('')}</dl>`;
const create = `<a class="btn" href="/organizador/eventos/novo">Criar evento ${icon('plus')}</a>`;
const manageLink = (event: Event) => event.status === 'draft'
  ? arrowLink('Continuar edição', managedUrl(event.id) + '/editar')
  : arrowLink('Gerenciar', managedUrl(event.id));

function organizerCard(state: State, event: Event) {
  return `<article class="ticket-row org-card"><div class="ticket-row-photo"><img src="${picture(event, true)}" alt="" width="420" height="250">${dateFlag(event.date)}</div>
    <div class="ticket-row-content"><div class="org-card-title"><h3>${esc(event.title)}</h3>${badge(event)}</div>${facts([
      ['calendar', eventDate(event)], ['pin', locationLabel(event)], ['ticket', `${registrationsFor(state,event.id).length} inscritos de ${event.capacity} vagas`],
    ])}${manageLink(event)}</div></article>`;
}

export function dashboard(state: State, list: boolean) {
  const events = organizerEvents(state);
  const published = events.filter(event => event.status === 'published').sort((a,b) => a.date.localeCompare(b.date));
  const drafts = events.filter(event => event.status === 'draft');
  const records = state.registrations.filter(ticket => events.some(event => event.id === ticket.eventId));
  return `<div class="org-heading row-heading">${panelTitle(list ? 'Seus eventos' : 'Faça acontecer.', list ? '' : 'Seus encontros, em movimento.')}${create}</div>
    ${stats([['Eventos publicados', published.length], ['Inscritos', records.length], ['Check-ins', records.filter(item => item.checkedInAt).length], ['Rascunhos', drafts.length]])}
    ${list ? `<div class="org-card-list wide">${[...published, ...drafts].map(event => organizerCard(state, event)).join('') || empty('Nenhum evento criado.', 'Crie um evento para começar.')}</div>`
    : `<div class="dashboard-grid">
      <section><div class="row-heading"><h2>Na sua agenda</h2>${arrowLink('Ver todos', '/organizador/eventos')}</div>
        <div class="org-card-list">${published.map(event => organizerCard(state, event)).join('') || empty('Sua agenda está vazia.', 'Publique um evento para vê-lo aqui.')}</div>
      </section>
      <aside>
        ${drafts.map(event => `<div class="draft-card"><p class="eyebrow accent">Em rascunho</p><img src="${picture(event)}" alt="" width="355" height="126"><h3>${esc(event.title)}</h3>
          ${facts([['calendar', eventDate(event)], ['pin', locationLabel(event)], ['ticket', `${priceLabel(event.price)} · ${event.capacity} vagas`]])}${manageLink(event)}</div>`).join('')}
        <div class="checkin-cta">${icon('scan')}<div><h3>Tudo pronto para receber?</h3>${arrowLink('Abrir check-in', '/organizador/check-in', 'btn light')}</div></div>
      </aside>
    </div>`}
    <p class="local-note">Ambiente demonstrativo. Eventos, inscrições e check-ins ficam neste navegador.</p>`;
}

export function manage(state: State, event: Event, tab: string) {
  const records = registrationsFor(state,event.id);
  const capacity = event.capacity;
  const checked = records.filter(item => item.checkedInAt).length;
  const percentage = capacity ? Math.min(100, Math.round(records.length * 100 / capacity)) : 0;
  const ticketsTab = tab === 'ingressos';
  return `<nav class="breadcrumbs" aria-label="Localização da página"><a href="/organizador/eventos">Eventos</a><span>/</span><span>${esc(event.title)}</span></nav>
    <header class="org-heading row-heading"><div><div class="title-badge"><h1>${esc(event.title)}</h1>${badge(event)}</div><p class="inline-fact">${icon('calendar')} ${eventDate(event)} · ${esc(event.neighborhood)}</p></div>
      <div class="row-actions">${event.status === 'published' ? `<a class="btn outline" href="${eventUrl(event.id)}">${icon('external')} Ver página</a>` : ''}
      <a class="btn" href="${managedUrl(event.id)}/editar">${icon('edit')} Editar evento</a></div></header>
    <nav class="tabs section-tabs" aria-label="Gerenciar evento">
      <a href="${managedUrl(event.id)}" ${ticketsTab ? '' : 'aria-current="page"'}>Visão geral</a><a href="${participantsUrl(event.id)}">Participantes</a>
      <a href="${managedUrl(event.id)}?aba=ingressos" ${ticketsTab ? 'aria-current="page"' : ''}>Ingressos</a>
    </nav>
    ${stats([['Inscritos', records.length], ['Check-ins', checked], ['Vagas disponíveis', availability(state,event)], ['Capacidade total', `${capacity} vagas`]])}
    <div class="capacity"><span>${records.length} de ${capacity} vagas reservadas</span><progress aria-label="Ocupação do evento" max="${Math.max(capacity,1)}" value="${records.length}"></progress><b>${percentage}%</b></div>
    ${ticketsTab ? `<div class="story-section"><h2>Ingressos do evento</h2>${facts([['ticket', priceLabel(event.price)], ['users', `Capacidade de ${capacity} pessoas`]])}${arrowLink('Editar condições de inscrição', managedUrl(event.id) + '/editar')}</div>`
    : `<div class="manage-grid"><section><img class="manage-image" src="${picture(event)}" alt="" width="685" height="255">
      ${facts([['users',event.organizer], ['pin',locationLabel(event)], ['ticket',priceLabel(event.price)]])}
      <div class="story-section"><h2>Programação</h2>${event.schedule ? `<ul class="manage-schedule">${event.schedule.split('\n').filter(Boolean).map(line => `<li>${esc(line.replace('|','–'))}</li>`).join('')}</ul>` : '<p>Programação a confirmar.</p>'}</div>
    </section><aside>
      <section><h3>Receba seu público.</h3><p>Faça o check-in das pessoas inscritas no evento.</p><a class="btn block" href="${participantsUrl(event.id,true)}">${icon('scan')} Abrir check-in</a></section>
      <section><h3>Lista de participantes.</h3><p>${records.length} inscritos</p>${arrowLink('Gerenciar participantes', participantsUrl(event.id))}</section>
      ${event.status === 'published' ? `<section><h3>Divulgue o encontro.</h3><p>Convide mais pessoas para ${esc(event.title)}.</p><button class="btn outline block" data-share="${esc(event.id)}">${icon('link')} Copiar link local</button></section>` : ''}
      <section><button class="text-link" data-publish="${esc(event.id)}" data-status="${event.status === 'published' ? 'draft' : 'published'}">${event.status === 'published' ? 'Despublicar evento' : 'Publicar evento'}</button></section>
    </aside></div>`}`;
}

export function eventPreview(data: EventData) {
  return `<p class="eyebrow">Prévia do evento</p><div class="ticket-paper editor-ticket">
    <div class="wallet-image"><img src="${picture(data)}" alt="" width="450" height="286">${dateFlag(data.date)}</div>
    <div><h2>${esc(data.title || 'Nome do evento')}</h2><p>${esc([data.category,data.format].filter(Boolean).join(' · '))}</p>
    ${facts([['calendar',eventDate(data)], ['pin',locationLabel(data) || 'Local a definir'], ['ticket', `${priceLabel(data.price || 0)} · ${data.capacity || 0} vagas`]])}</div></div>`;
}

export function editor(event: Event | undefined, stage: number, values: EventData = event || emptyEvent) {
  const hidden = (index: number) => stage === index ? '' : 'hidden';
  return `<div class="row-heading org-heading">${panelTitle(event ? 'Editar evento' : 'Criar evento')}<div class="row-actions">${event ? badge(event) : '<span class="status-pill">Rascunho</span>'}
    <button type="submit" class="btn outline" form="editor" name="action" value="save">Salvar e sair</button></div></div>
    ${stepper(['Essência','Detalhes','Publicar'],stage)}
    <div class="editor-grid"><form id="editor" data-id="${esc(event?.id)}" data-stage="${stage}" novalidate>
      <section ${hidden(0)}><h2>Todo encontro começa com uma ideia.</h2><p>Dê forma ao que você quer criar.</p><hr>
        ${input('Nome do evento','title',values.title,'maxlength="100"')}
        <div class="field-row"><label class="field"><span>Categoria</span><select name="category">${options(categories,values.category)}</select></label>
        ${input('Formato','format',values.format,'maxlength="60"')}</div>
        <label class="field"><span>Sobre o evento</span><textarea name="description" rows="4" maxlength="2000">${esc(values.description)}</textarea></label>
        ${input('Organização','organizer',values.organizer,'maxlength="100"')}
        <label class="field"><span>Foto de capa</span><select name="cover">${Object.entries(covers).map(([key, detail]) => `<option value="${key}" ${values.cover === key ? 'selected' : ''}>${detail[1]}</option>`).join('')}</select></label>
      </section>
      <section ${hidden(1)}><h2>Hora e lugar.</h2><p>Defina quando e onde seu evento vai acontecer.</p><hr>
        <div class="field-row dates-row">${input('Data do evento','date',values.date,'type="date" min="1900-01-01" max="2100-12-31"')}${input('Início','time',values.time,'type="time"')}${input('Fim','end',values.end,'type="time"')}</div>
        ${input('Local','venue',values.venue,'maxlength="100"')}
        <div class="field-row">${input('Bairro','neighborhood',values.neighborhood,'maxlength="80"')}${input('Cidade','city',values.city,'maxlength="80"')}</div>
        <hr><h2>Ingressos.</h2><p>Defina o tipo de ingresso e a capacidade de vagas.</p>
        <fieldset class="editor-type"><legend>Tipo de ingresso</legend><label><input type="radio" name="ticketType" value="free" ${values.price ? '' : 'checked'}> Gratuito</label><label><input type="radio" name="ticketType" value="paid" ${values.price ? 'checked' : ''}> Pago</label></fieldset>
        <div class="field-row">${input('Capacidade','capacity',String(values.capacity || ''),'type="number" min="1" max="100000" step="1"')}
          <div data-paid ${values.price ? '' : 'hidden'}>${input('Preço por pessoa (R$)','price',values.price ? (values.price/100).toFixed(2) : '','type="number" min="0.01" max="1000000" step="0.01"')}</div></div>
        <label class="field"><span>Programação <small>(opcional)</small></span><textarea name="schedule" rows="3" maxlength="1000" placeholder="17h | Abertura">${esc(values.schedule)}</textarea></label>
      </section>
      <section ${hidden(2)}><h2>Pronto para publicar?</h2><p>Confira a prévia. Depois de publicado, o evento aparecerá em Explorar e poderá receber inscrições demonstrativas.</p>
        <p class="notice">Tudo acontece localmente neste navegador.</p></section>
      ${errorSlot}
      <div class="editor-actions">${stage > 0 ? `<button class="btn outline" type="submit" name="action" value="back">${icon('back')} Voltar</button>` : '<a class="btn outline" href="/organizador/eventos">Cancelar</a>'}
        <button class="btn" type="submit" name="action" value="${stage === 2 ? 'publish' : 'next'}">${stage === 2 ? (event?.status === 'published' ? 'Salvar alterações' : 'Publicar evento') : 'Continuar'}${icon('arrow')}</button></div>
    </form><aside class="editor-preview" data-event-preview>${eventPreview(values)}</aside></div>`;
}

const checkedAt = (ticket: Registration) => ticket.checkedInAt
  ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(ticket.checkedInAt)) : '—';
export const participantStatus = (ticket: Registration) => ticket.checkedInAt ? 'Presente' : 'Aguardando';
export const participantTime = checkedAt;

export function participants(state: State, params: URLSearchParams, check = false) {
  const events = organizerEvents(state);
  const id = params.get('evento');
  const event = events.find(item => item.id === id) || events.find(item => item.id === 'som-no-patio') || events[0];
  if (!event) return `${panelTitle(check ? 'Check-in' : 'Participantes')}${empty('Nenhum evento disponível.', 'Crie um evento para começar.', ['Criar evento', '/organizador/eventos/novo'])}`;
  const records = registrationsFor(state,event.id);
  const q = params.get('q') || '';
  const filter = params.get('status') || '';
  const baseUrl = participantsUrl(event.id);
  const matching = records.filter(ticket => (!filter || (filter === 'presentes' ? Boolean(ticket.checkedInAt) : !ticket.checkedInAt))
    && normalize(`${ticket.name} ${ticket.email} ${ticket.code}`).includes(normalize(q)));
  const perPage = 7;
  const last = Math.max(1, Math.ceil(matching.length / perPage));
  const page = Math.min(Math.max(1, Math.trunc(Number(params.get('pagina')) || 1)),last);
  const visible = matching.slice((page-1)*perPage, page*perPage);
  const pageHref = (n: number, status = filter) => baseUrl + (q ? '&q=' + encodeURIComponent(q) : '') + (status ? '&status=' + encodeURIComponent(status) : '') + (n > 1 ? '&pagina=' + n : '');
  return `<div class="participants-grid"><section class="people-main">
    ${panelTitle(check ? 'Check-in' : 'Participantes', check ? 'Confirme a entrada com o código de um ingresso.' : 'Gerencie as inscrições e o check-in do seu evento.')}
    <label class="field event-switch"><span>Evento</span><select id="people-event" data-mode="${check ? 'check' : 'list'}">${events.map(item => `<option value="${esc(item.id)}" ${item.id===event.id?'selected':''}>${esc(item.title)}</option>`).join('')}</select></label>
    <div class="people-event"><img src="${picture(event,true)}" alt="" width="225" height="130"><div><h2>${esc(event.title)}</h2>${facts([['calendar',eventDate(event)],['pin',locationLabel(event)]])}</div></div>
    ${stats([['Inscritos',records.length], ['Check-ins',records.filter(ticket=>ticket.checkedInAt).length], ['Vagas totais',event.capacity]])}
    ${check ? `<form id="checkin" class="check-form" data-event="${esc(event.id)}"><h2>Digite o código.</h2><p>O código fica no ingresso, na carteira do participante.</p>
      ${input('Código do ingresso','code','','id="checkin-code" required maxlength="40" placeholder="EVT-00000000" autocomplete="off" spellcheck="false"')}
      ${errorSlot}<p class="notice success" data-check-result role="status" hidden></p>
      <div class="row-actions"><button class="btn" type="submit">${icon('check')} Confirmar entrada</button>${arrowLink('Ver participantes',baseUrl)}</div></form>`
    : `<div class="people-tools">
      <form id="people-search" data-event="${esc(event.id)}" data-filter="${esc(filter)}"><label>${icon('search')}<span class="sr-only">Buscar participante</span><input name="q" value="${esc(q)}" placeholder="Buscar participante" type="search"></label><button class="sr-only" type="submit">Buscar</button></form>
      <nav class="people-filters" aria-label="Status do check-in">${[['','Todos'],['presentes','Presentes'],['aguardando','Aguardando']].map(([key,label]) => `<a href="${esc(pageHref(1,key))}" ${filter===key?'aria-current="page"':''}>${label}</a>`).join('')}</nav>
      <div class="row-actions"><button class="text-link" data-export="${esc(event.id)}">${icon('download')} Exportar lista</button><a class="btn" href="${participantsUrl(event.id,true)}">${icon('scan')} Abrir check-in</a></div></div>
      ${visible.length ? `<div class="table-scroll"><table><thead><tr><th scope="col">Participante</th><th scope="col">Ingresso</th><th scope="col">Status</th><th scope="col">Entrada</th><th scope="col">Ações</th></tr></thead>
      <tbody>${visible.map(ticket => `<tr><td><div class="person">${avatar(ticket.name)}<span>${esc(ticket.name)}</span></div></td><td>Individual</td>
      <td><span class="status-pill ${ticket.checkedInAt ? 'good' : ''}">${participantStatus(ticket)}</span></td><td>${checkedAt(ticket)}</td>
      <td><button class="text-link" data-participant="${esc(ticket.id)}">Ver detalhes ${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div>
      <div class="pagination"><span>Exibindo ${(page-1)*perPage+1}–${(page-1)*perPage + visible.length} de ${matching.length}</span><nav aria-label="Páginas da lista">
        ${page > 1 ? `<a href="${esc(pageHref(page-1))}" aria-label="Página anterior">${icon('back')}</a>` : ''}
        <span aria-current="page">${page} / ${last}</span>
        ${page < last ? `<a href="${esc(pageHref(page+1))}" aria-label="Próxima página">${icon('arrow')}</a>` : ''}</nav></div>`
      : empty('Nenhum participante encontrado.', q || filter ? 'Tente outro nome, código ou status.' : 'A lista será preenchida quando chegarem inscrições.')}`}
    </section><aside class="people-aside"><div class="wallet-image"><img src="${picture(event,true)}" alt="" width="310" height="310">${dateFlag(event.date)}</div><h2>${esc(event.title)}</h2>
      ${facts([['calendar',eventDate(event)],['pin',locationLabel(event)],['ticket',priceLabel(event.price)],['users',`${records.length} de ${event.capacity} vagas reservadas`]])}
      ${arrowLink('Gerenciar evento',managedUrl(event.id))}</aside></div>`;
}
