import { covers, dayMonth, eventUrl, priceLabel, savedFor } from './model.ts';
import type { Event, EventData, State } from './model.ts';

export const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

const icons = {
  arrow: '<path d="M3 12h17m-7-7 7 7-7 7"/>', back: '<path d="M21 12H4m7-7-7 7 7 7"/>',
  search: '<circle cx="10.6" cy="10.6" r="6.7"/><path d="m16 16 5 5"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  bookmark: '<path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1Z"/>',
  ticket: '<path d="M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a3 3 0 0 0 0 6v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a3 3 0 0 0 0-6Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 16 0M17 4a4 4 0 0 1 0 8m3 3a7 7 0 0 1 2 6"/>',
  scan: '<path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4m0 8v4a1 1 0 0 1-1 1h-4M3 16v4a1 1 0 0 0 1 1h4M6 12h12"/>',
  home: '<path d="m3 10 9-7 9 7v10H15v-6H9v6H3Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.4 5.6L8 16l2.4-5.6L16 8Z"/>',
  plus: '<path d="M12 4v16M4 12h16"/>', check: '<path d="m4 12 5 5L20 6"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L21 6l-4-4L4 15Z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>', close: '<path d="m5 5 14 14M19 5 5 19"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20m-15 5h3"/>',
  pix: '<path d="m12 2 10 10-10 10L2 12Zm-7 7 7 7 7-7M5 15l7-7 7 7"/>',
  external: '<path d="M13 3h8v8m0-8-11 11m0-10H4v16h16v-6"/>',
  link: '<path d="m10 14 4-4m-6 6-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0m5-1 2-2a3 3 0 0 1 4 4l-5 5a3 3 0 0 1-4 0"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  logout: '<path d="M11 4H4v16h7m-1-8h11m-4-4 4 4-4 4"/>',
  sliders: '<path d="M3 6h18M3 12h18M3 18h18"/><path d="M7 4v4m10 2v4M9 16v4" stroke-width="4"/>',
  bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3a2 2 0 0 0 4 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M10 8a2.5 2.5 0 1 1 4 2c-1.3 1-2 1.1-2 3m0 3h.01"/>',
};
export type Icon = keyof typeof icons;
export const icon = (key: Icon) => `<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key]}</svg>`;
export const logo = (variant = '') => `<a class="logo ${variant}" href="/" aria-label="Eventify · Explorar"><img src="/assets/eventify.png" width="2050" height="451" alt="Eventify"></a>`;
export const avatar = (name = 'Visitante') => `<span class="avatar" aria-hidden="true">${esc([...name.trim()][0]?.toUpperCase() || 'V')}</span>`;
export const picture = (event: EventData, card = false) => {
  const name = covers[event.cover]?.[0] || covers.music[0];
  return `/assets/${card ? name.replace('.jpg', '-card.jpg') : name}`;
};
export const options = (values: readonly string[], selected: string) => values.map(value => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(value)}</option>`).join('');
export const arrowLink = (label: string, href: string, css = 'text-link') => `<a class="${css}" href="${esc(href)}">${esc(label)}${icon('arrow')}</a>`;
export const facts = (lines: [Icon, string][]) => `<ul class="facts">${lines.map(([key, value]) => `<li>${icon(key)}<span>${esc(value)}</span></li>`).join('')}</ul>`;
export const empty = (title: string, detail: string, link?: [string, string]) => `<div class="empty"><h2>${esc(title)}</h2><p>${esc(detail)}</p>${link ? arrowLink(...link) : ''}</div>`;
export const dateFlag = (date: string) => {
  const { day, month } = dayMonth(date);
  return `<span class="date-flag" aria-hidden="true"><b>${day}</b><span>${month}</span></span>`;
};
export function bookmark(state: State, event: Event, text = false) {
  const isSaved = savedFor(state).includes(event.id);
  return `<button type="button" class="bookmark ${isSaved ? 'marked' : ''} ${text ? 'with-label' : ''}" data-save="${esc(event.id)}" aria-pressed="${isSaved}" aria-label="${isSaved ? 'Remover dos salvos: ' : 'Salvar evento: '}${esc(event.title)}">${icon('bookmark')}${text ? (isSaved ? 'Salvo' : 'Salvar evento') : ''}</button>`;
}
export function eventCard(state: State, event: Event, discovery = false) {
  return `<article class="event-card" data-event-card="${esc(event.id)}">
    <div class="event-media">
      <a href="${eventUrl(event.id)}" aria-label="${esc(event.title)}"><img src="${picture(event, true)}" alt="" width="1280" height="853" loading="lazy" decoding="async">${dateFlag(event.date)}</a>
      ${bookmark(state, event)}
    </div>
    <h3><a href="${eventUrl(event.id)}">${esc(event.title)}</a></h3>
    <div class="card-meta">${discovery ? esc(event.neighborhood)
      : `${icon('pin')}<span>${esc(event.neighborhood)} · ${esc(event.time.replace(':00', 'h').replace(':','h'))}</span><span class="card-price">${priceLabel(event.price)}</span>`}</div>
  </article>`;
}
export const panelTitle = (title: string, description = '', eyebrow = '') => `<header class="page-heading">${eyebrow ? `<p class="eyebrow accent">${esc(eyebrow)}</p>` : ''}<h1>${esc(title)}</h1>${description ? `<p>${esc(description)}</p>` : ''}</header>`;
export const errorSlot = '<p class="form-error" data-error role="alert" hidden></p>';
export const input = (label: string, name: string, value = '', attrs = '') => `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" value="${esc(value)}" ${attrs}></label>`;
export const stepper = (steps: string[], current: number) => `<ol class="stepper" aria-label="Etapas">${steps.map((label, i) => `<li class="${i === current ? 'current' : i < current ? 'complete' : ''}" ${i === current ? 'aria-current="step"' : ''}><span>${i < current ? icon('check') : String(i+1).padStart(2, '0')}</span>${esc(label)}</li>`).join('')}</ol>`;
