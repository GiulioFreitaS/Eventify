import { availability, categories, eventDate, eventTime, eventUrl, isPast, locationLabel, money, ownerTickets, priceLabel, profileFor, quantityLabel, savedFor, ticketUrl } from './model.ts';
import type { Event, Registration, State } from './model.ts';
import { arrowLink, avatar, bookmark, dateFlag, empty, errorSlot, esc, eventCard, facts, icon, input, logo, panelTitle, picture, stepper } from './ui.ts';

export function eventDetails(state: State, event: Event, exploreUrl: string) {
  const available = availability(state, event);
  const upcoming = !isPast(event);
  const sections = event.schedule.split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts[0]);
  return `<div class="container page-body">
    <nav class="breadcrumbs" aria-label="Localização da página"><a href="${esc(exploreUrl)}">Explorar</a><span>/</span><a href="/?categoria=${encodeURIComponent(event.category)}">${esc(event.category)}</a><span>/</span><span>${esc(event.title)}</span></nav>
    <div class="details-grid">
      <img class="details-photo" src="${picture(event)}" alt="" width="884" height="433">
      <div class="details-story">
        <nav class="tabs section-tabs" aria-label="Informações do evento"><a href="#sobre" aria-current="location">Sobre</a><a href="#programacao">Programação</a><a href="#local">Local</a></nav>
        <section id="sobre" class="story-section"><p>${esc(event.description)}</p><p>Por <strong class="accent">${esc(event.organizer)}</strong></p></section>
        <section id="programacao" class="story-section"><h2>Programação</h2>${sections.length ? `<ol class="schedule">${sections.map(([time, label]) => `<li><b>${esc(time)}</b>${label ? `<span>${esc(label)}</span>` : ''}</li>`).join('')}</ol>` : '<p>Programação a confirmar.</p>'}</section>
        <section id="local" class="story-section"><h2>Local</h2>${facts([['pin', locationLabel(event)]])}</section>
      </div>
      <div class="details-booking">
        <p class="eyebrow accent">${esc(event.category)}${event.format ? ' · ' + esc(event.format) : ''}</p><h1>${esc(event.title)}</h1>
        <p class="detail-intro">${esc(event.description.split(/(?<=\.)\s/)[0])}</p>
        ${facts([['calendar', eventDate(event)], ['pin', locationLabel(event)]])}
        <div class="booking-box">
          <h2>${event.price ? money(event.price) : 'Entrada gratuita'}</h2>
          ${available && upcoming ? `<form id="reserve" data-event="${esc(event.id)}">
            <label class="quantity-control">${icon('ticket')}${available <= 12
              ? `<select name="quantity" aria-label="Quantidade de ingressos">${Array.from({length: available}, (_,i) => `<option value="${i+1}">${quantityLabel(i+1)}</option>`).join('')}</select>`
              : `<input name="quantity" aria-label="Quantidade de ingressos" type="number" min="1" max="${available}" step="1" value="1" required><span aria-hidden="true" data-quantity-label>ingresso</span>`}</label>
            <div class="book-availability"><span>${event.capacity - available} de ${event.capacity} vagas reservadas</span><strong data-reserve-total>${priceLabel(event.price)}</strong></div>
            <button type="submit" class="btn block">Garantir ingresso ${icon('arrow')}</button>
          </form>` : `<p class="notice">${upcoming ? 'Evento esgotado. Todas as vagas foram reservadas.' : 'Inscrições encerradas.'}</p>`}
          <div class="booking-bottom"><button class="text-link" data-terms>Termos do evento</button>${bookmark(state, event, true)}</div>
        </div>
      </div>
    </div>
  </div>`;
}

export function checkout(state: State, event: Event, quantity: number, orderId: string) {
  const profile = profileFor(state);
  const allowed = availability(state, event);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > allowed || isPast(event)) {
    return `<section class="container page-body">${empty('Inscrição indisponível.', 'Confira as vagas e a quantidade antes de continuar.', ['Voltar ao evento', eventUrl(event.id)])}</section>`;
  }
  const payable = Boolean(event.price);
  return `<section class="container page-body checkout-page">
    <div class="checkout-top"><a class="back-link" href="${eventUrl(event.id)}">${icon('back')} Voltar ao evento</a>
      ${stepper(['Ingresso', payable ? 'Pagamento' : 'Inscrição', 'Confirmação'], 1)}</div>
    ${panelTitle('Seu próximo encontro está perto.')}
    <div class="checkout-grid">
      <form id="checkout" data-event="${esc(event.id)}" data-quantity="${quantity}" data-price="${event.price}" data-order="${esc(orderId)}">
        <h2>${payable ? 'Forma de pagamento' : 'Dados da inscrição'}</h2>
        <p class="notice"><strong>Demonstração local.</strong> ${payable ? 'Nenhuma cobrança será feita. Use apenas dados fictícios.' : 'O ingresso será emitido neste navegador.'}</p>
        ${payable ? `<fieldset class="payment-types"><legend class="sr-only">Escolha uma forma de pagamento demonstrativa</legend>
          <label><input type="radio" name="method" value="pix">${icon('pix')} Pix</label><label><input type="radio" name="method" value="card" checked>${icon('card')} Cartão</label></fieldset>
          <div class="demo-method" data-method-info>Cartão de teste ·•••• 4242</div>` : '<input type="hidden" name="method" value="free">'}
        ${payable ? '<h3 class="form-subtitle">Dados do participante</h3>' : ''}
        ${input('Nome do participante', 'name', profile?.name, 'required minlength="2" maxlength="80" autocomplete="name"')}
        ${input('E-mail', 'email', profile?.email, 'type="email" required maxlength="160" autocomplete="email"')}
        <div class="accept"><label><input type="checkbox" name="terms" required> Aceito os termos da inscrição.</label> <button type="button" class="text-link" data-terms>Ler termos</button></div>
        ${errorSlot}
        <button class="btn block" type="submit">${payable ? 'Simular pagamento de ' + money(event.price * quantity) : 'Confirmar inscrição'} ${icon('arrow')}</button>
      </form>
      <aside class="checkout-summary"><div class="ticket-paper">
        <img src="${picture(event)}" alt="" width="550" height="230">
        <div><h2>${esc(event.title)}</h2>${facts([['calendar', eventDate(event)], ['pin', locationLabel(event)]])}
        <p class="checkout-item"><span>${quantityLabel(quantity)}</span><span>${priceLabel(event.price)}</span></p>
        <p class="checkout-total"><b>Total</b><b>${priceLabel(event.price * quantity)}</b></p></div>
      </div><p>Confira os dados antes de confirmar.</p></aside>
    </div>
  </section>`;
}

const barcode = '<div class="barcode" aria-hidden="true"></div>';
export function ticketPaper(ticket: Registration, event: Event) {
  return `<div class="ticket-paper wallet-paper">
    <div class="wallet-image"><img src="${picture(event, true)}" alt="" width="440" height="250">${dateFlag(event.date)}</div>
    <div><h2>${esc(event.title)}</h2>${facts([['calendar', eventDate(event)], ['pin', locationLabel(event)], ['user', ticket.name]])}
    <div class="ticket-code">${barcode}<p class="eyebrow">Código do ingresso</p><strong>${esc(ticket.code)}</strong>${ticket.checkedInAt ? '<p class="status-pill good">Entrada confirmada</p>' : ''}</div></div>
  </div>`;
}

function ticketDeck(event: Event, tickets: Registration[], ticket: Registration, selected: boolean) {
  const index = tickets.indexOf(ticket);
  const stacked = tickets.length > 1;
  const position = `${index + 1} de ${tickets.length}`;
  const openTicket = arrowLink('Abrir ingresso', ticketUrl(ticket.id) + '?ver=ingresso');
  return `<article class="ticket-deck" data-ticket-stack="${esc(event.id)}" data-ticket-ids="${esc(JSON.stringify(tickets.map(item => item.id)))}" data-ticket-current="${index}">
    <div class="${stacked ? 'ticket-deck-pile' : ''}"${tickets.length > 2 ? ' data-extra-layer' : ''}>
      <div class="ticket-row${stacked ? ' ticket-deck-face' : ''}${selected ? ' selected' : ''}" ${stacked ? `data-ticket-swipe tabindex="0" role="group" aria-label="${esc(event.title)}, ingresso ${position}"` : ''}>
        <div class="ticket-row-photo"><img src="${picture(event, true)}" alt="" width="420" height="250" draggable="false">${dateFlag(event.date)}</div>
        ${stacked ? `<div class="ticket-deck-stub">
          <div class="ticket-deck-title"><h2>${esc(event.title)}</h2><span class="ticket-deck-code">${esc(ticket.code)}</span></div>
          <p><strong>${esc(eventDate(event))}</strong></p>
          <p>${esc(locationLabel(event))}</p>
          <div class="ticket-deck-links"><span>${esc(ticket.name)}</span>${openTicket}</div>
        </div>` : `<div class="ticket-row-content"><h2>${esc(event.title)}</h2>
          ${facts([['calendar', eventDate(event)], ['pin', locationLabel(event)], ['ticket', '1 ingresso'], ['user', ticket.name]])}
          ${openTicket}
        </div>`}
      </div>
    </div>
    ${stacked ? `<div class="ticket-deck-controls" role="group" aria-label="Ingressos de ${esc(event.title)}">
      ${tickets.length <= 5 ? `<div class="ticket-deck-dots">${tickets.map((item, i) => `<button type="button" data-ticket-index="${i}" aria-label="Ingresso ${i + 1}, ${esc(item.code)}"${i === index ? ' aria-current="true"' : ''}></button>`).join('')}</div>` : ''}
      <p class="ticket-deck-count">Ingresso ${position}<span> · Deslize para folhear</span></p>
      <div class="ticket-deck-arrows">
        <button type="button" data-ticket-step="-1" aria-label="Ingresso anterior">${icon('back')}</button>
        <button type="button" data-ticket-step="1" aria-label="Próximo ingresso">${icon('arrow')}</button>
      </div>
    </div>` : ''}
  </article>`;
}

export function wallet(state: State, selectedId: string | undefined, params: URLSearchParams, deckChoices: ReadonlyMap<string, string>) {
  const all = ownerTickets(state).flatMap(ticket => {
    const event = state.events.find(item => item.id === ticket.eventId);
    return event ? [{ ticket, event }] : [];
  });
  const selected = all.find(pair => pair.ticket.id === selectedId);
  const past = selected ? isPast(selected.event) : params.get('periodo') === 'anteriores';
  const visible = all.filter(pair => isPast(pair.event) === past).sort((a,b) => past ? b.event.date.localeCompare(a.event.date) : a.event.date.localeCompare(b.event.date));
  const groups = new Map<string, { event: Event; tickets: Registration[] }>();
  for (const { event, ticket } of visible) {
    const group = groups.get(event.id);
    if (group) group.tickets.push(ticket);
    else groups.set(event.id, { event, tickets: [ticket] });
  }
  const first = visible[0];
  const preview = selected || visible.find(pair => pair.event.id === first?.event.id && pair.ticket.id === deckChoices.get(pair.event.id)) || first;
  const decks = [...groups.values()].map(({ event, tickets }) => {
    const isSelected = event.id === preview?.event.id;
    const ticket = isSelected ? preview.ticket : tickets.find(item => item.id === deckChoices.get(event.id)) || tickets[0];
    return ticketDeck(event, tickets, ticket, isSelected);
  });
  const confirmed = selected && params.get('confirmado') === '1';
  const open = Boolean(selected && (params.get('ver') !== 'lista' || confirmed));
  const listUrl = past ? '/ingressos?periodo=anteriores' : '/ingressos';
  return `<div class="wallet-layout${preview ? '' : ' single'}${open ? ' wallet-open' : ''}">
    <section class="wallet-list">
      ${panelTitle('Meus ingressos', 'Seu próximo encontro está aqui.')}
      ${confirmed ? `<div class="notice success" role="status">${icon('check')} Inscrição confirmada. Seu ingresso já está na carteira.</div>` : ''}
      ${selectedId && !selected ? '<p class="notice">Ingresso indisponível para este perfil local.</p>' : ''}
      <nav class="tabs section-tabs" aria-label="Período dos ingressos"><a href="/ingressos" ${past ? '' : 'aria-current="page"'}>Próximos</a><a href="/ingressos?periodo=anteriores" ${past ? 'aria-current="page"' : ''}>Anteriores</a></nav>
      <div class="ticket-list">${decks.length ? decks.join('') : empty(past ? 'Nenhum ingresso anterior.' : 'Sua carteira está vazia.', 'Descubra um evento e faça sua inscrição para receber o ingresso aqui.', ['Explorar eventos', '/'])}</div>
    </section>
    ${preview ? `<aside class="wallet-preview" aria-label="Ingresso selecionado">
      <div class="mobile-only ticket-mobile-header"><a href="${listUrl}" aria-label="Voltar para meus ingressos">${icon('back')}</a>${logo('light-logo')}</div>
      <p class="eyebrow">Seu ingresso</p><h1 class="mobile-only ticket-view-title">É dia de encontro.</h1>${ticketPaper(preview.ticket, preview.event)}
      ${confirmed ? '<p class="notice success mobile-only" role="status">Inscrição confirmada. Seu ingresso já está na carteira.</p>' : ''}
      <div class="wallet-actions"><button class="btn light" data-download-ticket="${esc(preview.ticket.id)}">${icon('download')} Salvar ingresso</button>
      ${preview.event.status === 'published' ? arrowLink('Ver evento', eventUrl(preview.event.id), 'btn accent-btn') : ''}</div>
    </aside>` : ''}
  </div>`;
}

export function saved(state: State, params: URLSearchParams) {
  const byName = params.get('ordem') === 'nome';
  const events = state.events.filter(event => event.status === 'published' && savedFor(state).includes(event.id))
    .sort((a,b) => byName ? a.title.localeCompare(b.title,'pt-BR') : a.date.localeCompare(b.date));
  return `<section class="container page-body saved-page">
    <div class="saved-heading">${panelTitle('Encontros para depois.', '', 'Sua coleção')}
    <div><span>${String(events.length).padStart(2, '0')} ${events.length === 1 ? 'salvo' : 'salvos'}</span>
    <label class="sr-only" for="saved-sort">Ordenar eventos salvos</label><select id="saved-sort"><option value="data">Por data</option><option value="nome" ${byName ? 'selected' : ''}>Por nome</option></select></div></div>
    ${events.length ? `<div class="event-grid saved-grid">${events.map(event => eventCard(state, event)).join('')}</div>` : empty('Nenhum evento salvo.', 'Use o marcador de um evento para encontrar sua seleção aqui.', ['Explorar eventos', '/'])}
  </section>`;
}

export function access(state: State, signup: boolean) {
  const demo = state.profiles.find(profile => profile.id === 'demo');
  return `<div class="access-layout">
    <section class="access-photo"><img src="/assets/entrar.jpg" alt="" width="817" height="562">${logo('light-logo')}
      <div><h2>Os melhores<br>encontros<br>começam aqui.</h2><p>Entre para descobrir o que acontece perto de você.</p></div>
    </section>
    <section class="access-panel"><a class="back-link" href="/">${icon('back')} Voltar para explorar</a>
      <form id="${signup ? 'signup' : 'login'}" class="access-form">
        <p class="eyebrow">Bom ter você por aqui</p><h1>${signup ? 'Criar conta' : 'Entrar'}</h1>
        <p class="local-note">Perfil de demonstração neste navegador. Use um nome e um e-mail fictícios.</p>
        ${signup ? input('Nome', 'name', '', 'required minlength="2" maxlength="80" autocomplete="name"') : ''}
        ${input('E-mail', 'email', '', 'type="email" placeholder="seuemail@exemplo.com" required maxlength="160" autocomplete="email"')}
        ${errorSlot}
        <button class="btn block" type="submit">${signup ? 'Criar perfil local' : 'Entrar'}</button>
        ${!signup && demo ? `<button class="btn outline block" type="button" data-demo>Entrar na demonstração</button>` : ''}
        <p class="access-switch">${signup ? 'Já tem um perfil? <a class="text-link" href="/entrar">Entrar</a>' : 'Novo por aqui? <a class="text-link" href="/cadastro">Criar conta</a>'}</p>
      </form>
    </section>
  </div>`;
}

export function profilePage(state: State, section: string) {
  const profile = profileFor(state);
  if (!profile) return `<section class="container page-body">${empty('Seu perfil local.', 'Entre ou crie um perfil para personalizar a Eventify neste navegador.', ['Entrar', '/entrar'])}</section>`;
  const preferences = section === 'preferencias';
  const notifications = section === 'notificacoes';
  const help = section === 'ajuda';
  const active = preferences || notifications || help;
  return `<div class="profile-page">
    <img class="profile-banner" src="/assets/patio.jpg" alt="" width="1478" height="201">
    <div class="container">
      <header class="profile-header">${avatar(profile.name)}<div><h1>${esc(profile.name)}</h1><p>Participante · Perfil local</p></div><a class="back-link" href="/perfil" data-profile-focus>${icon('edit')} Editar perfil</a></header>
      <div class="profile-grid">
        <nav class="profile-nav" aria-label="Minha conta">
          <a href="/perfil" ${!active ? 'aria-current="page"' : ''}>${icon('user')} Dados pessoais</a>
          <a href="/perfil?secao=preferencias" ${preferences ? 'aria-current="page"' : ''}>${icon('sliders')} Preferências</a>
          <a href="/perfil?secao=notificacoes" ${notifications ? 'aria-current="page"' : ''}>${icon('bell')} Notificações</a>
          <a href="/perfil?secao=ajuda" ${help ? 'aria-current="page"' : ''}>${icon('help')} Ajuda</a>
          <button data-logout>${icon('logout')} Sair da conta</button>
        </nav>
        <div class="profile-body">
        ${help ? '<h2>Ajuda</h2><p>Ingressos, eventos e preferências ficam no navegador atual. Para testar a entrada no evento, abra a carteira e use o código exibido no check-in.</p>' : `<form id="profile" data-section="${esc(section)}">
          <h2>${preferences ? 'Preferências' : notifications ? 'Notificações' : 'Dados pessoais'}</h2>
          <p>${preferences ? 'Escolha os tipos de encontro que mais interessam a você.' : notifications ? 'Salve sua preferência neste perfil local. O envio de notificações depende de integração futura.' : 'Atualize as informações do seu perfil.'}</p>
          ${preferences ? `<fieldset class="checklist"><legend>Seus interesses</legend>${categories.map(category => `<label><input name="interest" type="checkbox" value="${category}" ${profile.interests.includes(category) ? 'checked' : ''}> ${category}</label>`).join('')}</fieldset>`
          : notifications ? `<label class="pref-check"><input type="checkbox" name="reminders" ${profile.reminders ? 'checked' : ''}> Lembretes de eventos</label>`
          : input('Nome', 'name', profile.name, 'required minlength="2" maxlength="80" autocomplete="name"') + input('E-mail', 'email', profile.email, 'type="email" required maxlength="160" autocomplete="email"')}
          ${errorSlot}<button class="btn" type="submit">Salvar alterações</button>
        </form>`}
        </div>
        <aside class="profile-aside">
          <div class="profile-counters"><a href="/ingressos"><b>${String(ownerTickets(state).length).padStart(2,'0')}</b> Ingressos</a><a href="/salvos"><b>${String(savedFor(state).filter(id => state.events.some(event => event.id === id && event.status === 'published')).length).padStart(2,'0')}</b> Salvos</a></div>
          <div class="profile-organizer"><img src="/assets/microfone.jpg" alt="" width="440" height="238"><div><h2>Faça acontecer.</h2>
          <p>Seu próximo evento começa aqui.</p>${arrowLink('Área do organizador', '/organizador')}</div></div>
        </aside>
      </div>
    </div>
  </div>`;
}

