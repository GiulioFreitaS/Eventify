export const categories = ['Música', 'Cultura', 'Aprender'] as const;
export type Category = typeof categories[number];
export const covers = {
  music: ['som-no-patio.jpg', 'Som no pátio'],
  clay: ['ceramica.jpg', 'Oficina de cerâmica'],
  cinema: ['cinema.jpg', 'Cinema no terraço'],
  fair: ['feira.jpg', 'Feira de arte'],
  jazz: ['jazz.jpg', 'Jazz no jardim'],
} as const;
export type Cover = keyof typeof covers;
export type EventStatus = 'draft' | 'published';
export type EventData = {
  title: string; category: Category; format: string; description: string; cover: Cover;
  date: string; time: string; end: string; venue: string; neighborhood: string; city: string;
  capacity: number; price: number; organizer: string; schedule: string;
};
export type Event = EventData & { id: string; status: EventStatus; managed: boolean };
export type Profile = { id: string; name: string; email: string; interests: Category[]; reminders: boolean };
export type Registration = {
  id: string; eventId: string; profileId: string | null; name: string; email: string;
  code: string; price: number; method: 'free' | 'pix' | 'card'; createdAt: string; checkedInAt: string | null;
};
export type State = {
  version: 1; events: Event[]; registrations: Registration[]; profiles: Profile[];
  activeProfile: string | null; saved: Record<string, string[]>;
};

export const demoId = 'demo';
export const emptyEvent: EventData = {
  title: '', category: 'Música', format: 'Ao ar livre', description: '', cover: 'jazz',
  date: '', time: '', end: '', venue: '', neighborhood: '', city: 'São Paulo',
  capacity: 80, price: 0, organizer: 'Coletivo Aurora', schedule: '',
};

const demoEvents: Event[] = [
  { ...emptyEvent, id: 'oficina-de-ceramica', title: 'Oficina de cerâmica', category: 'Aprender',
    format: 'Oficina', description: 'Uma tarde para desacelerar, colocar as mãos no barro e criar sua primeira peça de cerâmica. Materiais incluídos.',
    cover: 'clay', date: '2026-11-29', time: '14:00', end: '17:00', venue: 'Ateliê da Vila', neighborhood: 'Vila Madalena',
    capacity: 30, price: 9000, status: 'published', managed: true, schedule: '14h | Boas-vindas\n14h30 | Modelagem no torno\n17h | Encerramento' },
  { ...emptyEvent, id: 'cinema-no-terraco', title: 'Cinema no terraço', category: 'Cultura',
    description: 'Cinema a céu aberto, luzes acesas e uma sessão para dividir com os amigos. Chegue cedo para escolher seu lugar.',
    cover: 'cinema', date: '2026-11-23', time: '20:00', end: '22:00', venue: 'Terraço Bela Vista', neighborhood: 'Bela Vista',
    capacity: 60, organizer: 'Cinema de Bairro', status: 'published', managed: false, schedule: '19h30 | Abertura\n20h | Sessão de cinema' },
  { ...emptyEvent, id: 'feira-de-arte', title: 'Feira de arte independente', category: 'Cultura',
    description: 'Conheça artistas independentes e descubra ilustrações, gravuras e outras criações feitas em São Paulo.',
    cover: 'fair', date: '2026-11-29', time: '11:00', end: '16:00', venue: 'Praça do Cambuci', neighborhood: 'Cambuci',
    capacity: 120, organizer: 'Feira do Cambuci', status: 'published', managed: false },
  { ...emptyEvent, id: 'som-no-patio', title: 'Som no pátio', category: 'Música',
    description: 'Um encontro ao ar livre para celebrar a música brasileira, com apresentações de artistas independentes, clima de pátio e muita troca entre pessoas, arte e cultura.',
    cover: 'music', date: '2026-11-28', time: '17:00', end: '21:00', venue: 'Pátio Aurora', neighborhood: 'Pinheiros',
    status: 'published', managed: true, schedule: '16h30 | Abertura do pátio e recepção\n17h | Roda de música brasileira\n19h | Show com Marina Lacerda\n21h | Encerramento' },
  { ...emptyEvent, id: 'jazz-no-jardim', title: 'Jazz no jardim', cover: 'jazz', date: '2026-12-05', time: '16:00', end: '20:00',
    venue: 'Jardim Aurora', neighborhood: 'Pinheiros', description: 'Uma tarde de jazz, boa companhia e música ao ar livre.', status: 'draft', managed: true },
];

export function seed(): State {
  const profile: Profile = { id: demoId, name: 'Giulio Pimentel', email: 'demo@exemplo.com', interests: [], reminders: false };
  const names = ['Ana Souza', 'Lucas Santos', 'Marina Costa', 'Rafa Lima', 'João Dias', 'Lia Alves'];
  const registrations = [['som-no-patio', 38], ['oficina-de-ceramica', 26]].flatMap(([eventId, count]) => {
    const event = demoEvents.find(item => item.id === eventId)!;
    return Array.from({ length: Number(count) }, (_, index): Registration => {
      const number = String(index + 1).padStart(3, '0');
      const code = `EVT-${event.cover === 'music' ? 'SOM' : 'CER'}-${number}`;
      return { id: code, eventId: event.id, profileId: index === 0 ? demoId : null,
        name: index === 0 ? profile.name : names[index - 1] || `Participante demo ${number}`,
        email: index === 0 ? profile.email : `demo-${number}@exemplo.com`,
        code, price: event.price, method: event.price ? 'card' : 'free',
        createdAt: '2026-11-16T18:00:00.000Z', checkedInAt: null };
    });
  });
  return { version: 1, events: demoEvents.map(event => ({ ...event })), profiles: [profile], registrations,
    activeProfile: demoId, saved: { [demoId]: ['cinema-no-terraco', 'oficina-de-ceramica', 'som-no-patio'] } };
}

export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const priceLabel = (cents: number) => cents ? money(cents) : 'Gratuito';
export const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').trim();
export const dateValue = (date: string) => new Date(`${date}T12:00:00-03:00`);
export const localDay = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
export const dayMonth = (date: string) => {
  const value = dateValue(date);
  if (!date || Number.isNaN(value.getTime())) return { day: '–', month: 'DATA' };
  return { day: date.slice(-2), month: new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).format(value).replace('.', '') };
};
const hour = (value: string) => value.replace(':00', 'h').replace(':', 'h').replace(/^0/, '');
export const eventTime = (event: EventData) => [hour(event.time), hour(event.end)].filter(Boolean).join(' às ');
export function eventDate(event: EventData, full = true) {
  if (!event.date) return 'Data a definir';
  const { day, month } = dayMonth(event.date);
  return [`${day} ${month}${full ? ' ' + event.date.slice(0, 4) : ''}`, full && event.time && eventTime(event)].filter(Boolean).join(' · ');
}
export const locationLabel = (event: EventData) => [event.venue, event.neighborhood, event.city].filter(Boolean).join(' · ');
export const registrationsFor = (state: State, eventId: string) => state.registrations.filter(item => item.eventId === eventId);
export const availability = (state: State, event: Event) => Math.max(0, event.capacity - registrationsFor(state, event.id).length);
export const isPast = (event: EventData) => Boolean(event.date && event.date < localDay());
export const profileFor = (state: State) => state.profiles.find(profile => profile.id === state.activeProfile);
export const savedFor = (state: State) => state.saved[state.activeProfile || 'visitor'] || [];
export const ownerTickets = (state: State) => state.registrations.filter(ticket => ticket.profileId === (state.activeProfile || 'visitor'));
export const eventUrl = (id: string) => `/eventos/${encodeURIComponent(id)}`;
export const managedUrl = (id: string) => `/organizador/eventos/${encodeURIComponent(id)}`;
export const ticketUrl = (id: string) => `/ingressos/${encodeURIComponent(id)}`;
export const quantityLabel = (quantity: number) => `${quantity} ingresso${quantity !== 1 ? 's' : ''}`;

export function randomId() {
  // getRandomValues also works when testing the app over HTTP on the local network.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}
