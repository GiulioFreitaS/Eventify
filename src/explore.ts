import { categories, eventDate, eventUrl, normalize } from './model.ts';
import type { State } from './model.ts';
import { empty, esc, eventCard, icon, options, picture } from './ui.ts';

export function explore(state: State, search: URLSearchParams) {
  const published = state.events.filter(event => event.status === 'published');
  const featured = published.find(event => event.id === 'som-no-patio') || published[0];
  const [q, category, date, location] = ['q', 'categoria', 'data', 'local'].map(key => search.get(key) || '');
  const locations = [...new Set(published.flatMap(event => [event.city, event.neighborhood]))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (location && !locations.includes(location)) locations.push(location);
  const filtered = published.filter(event => (!category || event.category === category)
    && (!date || event.date === date)
    && (!location || event.city === location || event.neighborhood === location)
    && normalize(q).split(/\s+/).every(term => normalize([event.title, event.description, event.category, event.venue, event.neighborhood, event.city].join(' ')).includes(term)));
  const filteredView = Boolean(q || category || date || location);
  const displayed = filteredView ? filtered : filtered.filter(event => event.id !== featured?.id).concat(featured ? [featured] : []);
  return `<section class="hero">
      <div class="hero-image"><img src="${featured ? picture(featured) : '/assets/som-no-patio.jpg'}" alt="" fetchpriority="high"></div>
      <h1>AO VIVO<span>.</span></h1>
      <div class="hero-copy"><p class="eyebrow">Encontros que ficam <span></span></p>
        <p class="hero-line">Descubra o que acontece<br>perto de você.</p>
        <a class="btn light" href="#busca" data-focus="search">Explorar eventos ${icon('arrow')}</a>
      </div>
      ${featured ? `<a class="hero-pick" href="${eventUrl(featured.id)}"><span><strong>${esc(featured.title)}</strong><small>${icon('calendar')}${eventDate(featured, false)} · ${esc(featured.neighborhood)}</small></span>${icon('arrow')}</a>` : ''}
    </section>
    <section class="container browse" id="busca">
      <div class="search-line">
        <h2>Seu próximo encontro.</h2>
        <form id="search" class="search-form" role="search">
          <div class="search-fields">
            <label class="query">${icon('search')}<span class="sr-only">Busque um evento ou experiência</span><input id="search-query" type="search" name="q" value="${esc(q)}" placeholder="Busque um evento ou experiência"></label>
            <label class="date-filter">${icon('calendar')}<span class="sr-only">Data do evento</span>${date ? '' : '<span class="date-placeholder" aria-hidden="true">Quando?</span>'}<input type="date" name="data" value="${esc(date)}">${icon('chevron')}</label>
            <label class="location-filter">${icon('pin')}<select name="local" aria-label="Localização"><option value="">Todos os locais</option>${options(locations, location)}</select>${icon('chevron')}</label>
            <input type="hidden" name="categoria" value="${esc(category)}">
          </div>
          <button class="btn icon-button" type="submit" aria-label="Buscar eventos">${icon('search')}</button>
        </form>
      </div>
      <div class="browse-heading"><h2>A cidade está acontecendo.</h2>
        <nav class="tabs categories" aria-label="Categorias">${['', ...categories].map(value => `<button type="button" data-category="${esc(value)}" aria-pressed="${category === value}">${value || 'Tudo'}</button>`).join('')}</nav>
      </div>
      ${filteredView ? `<div class="filter-summary" role="status"><span>${displayed.length} ${displayed.length === 1 ? 'evento encontrado' : 'eventos encontrados'}</span><button class="text-link" data-clear-filters>Limpar filtros</button></div>` : ''}
      ${displayed.length ? `<div class="event-grid">${displayed.map(event => eventCard(state, event)).join('')}</div>` : empty('Nenhum encontro por aqui.', 'Tente outro termo, data ou localização.')}
    </section>`;
}
