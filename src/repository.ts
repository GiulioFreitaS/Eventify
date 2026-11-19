import { availability, categories, covers, demoId, isPast, profileFor, randomId, registrationsFor, savedFor, seed } from './model.ts';
import type { Category, Cover, Event, EventData, Profile, Registration, State } from './model.ts';

const legacyKey = 'eventify.desktop.v1';
const recordKey = 'desktop';
const objectStore = 'state';
type Stored = { revision: number; state: State };
let database: Promise<IDBDatabase> | undefined;
let current: Stored | undefined;
const changes = new BroadcastChannel('eventify.desktop.changes');

export class ValidationError extends Error {}

function initialState(): State {
  try {
    const value = localStorage.getItem(legacyKey);
    if (value) {
      const state = JSON.parse(value) as State;
      if (state.version === 1 && Array.isArray(state.events) && Array.isArray(state.registrations)
        && Array.isArray(state.profiles) && state.saved) return state;
    }
  } catch {
    // Uma base interrompida ou incompatível volta para o conjunto demonstrativo.
  }
  return seed();
}

export function readState(): State {
  current ??= { revision: 0, state: initialState() };
  return current.state;
}

function openDatabase() {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('eventify.desktop', 1);
      request.onupgradeneeded = () => { request.result.createObjectStore(objectStore); };
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); database = undefined; };
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('A base local está aberta em outra versão da Eventify.'));
    });
    database.catch(() => { database = undefined; });
  }
  return database;
}

function useRecord(record: Stored | undefined) {
  if (!record || record.revision <= (current?.revision ?? 0)) return false;
  current = record;
  return true;
}

export async function hydrate() {
  const db = await openDatabase();
  return new Promise<boolean>((resolve, reject) => {
    const request = db.transaction(objectStore).objectStore(objectStore).get(recordKey);
    request.onsuccess = () => resolve(useRecord(request.result as Stored | undefined));
    request.onerror = () => reject(request.error);
  });
}

export function observeUpdates(listener: () => void) {
  changes.addEventListener('message', () => {
    void hydrate().then(updated => { if (updated) listener(); }).catch(() => {});
  });
}

async function write<T>(operation: (state: State) => T): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(objectStore, 'readwrite', { durability: 'strict' });
    const store = transaction.objectStore(objectStore);
    const request = store.get(recordKey);
    let record: Stored;
    let result: T;
    let failure: unknown;
    request.onsuccess = () => {
      const relative = request.result as Stored | undefined;
      const state = relative?.state ?? initialState();
      try {
        result = operation(state);
        record = { revision: (relative?.revision ?? 0) + 1, state };
        store.put(record, recordKey);
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => {
      useRecord(record);
      changes.postMessage(record.revision);
      resolve(result);
    };
    transaction.onabort = () => reject(failure ?? transaction.error);
  });
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const take = (data: FormData, name: string) => String(data.get(name) ?? '').trim();

function identity(name: string, email: string) {
  if (name.length < 2 || name.length > 80) throw new ValidationError('Informe um nome de 2 a 80 caracteres.');
  if (!emailPattern.test(email) || email.length > 160) throw new ValidationError('Informe um e-mail válido.');
}

export function toggleSave(eventId: string) {
  return write(state => {
    if (!state.events.some(event => event.id === eventId && event.status === 'published')) throw new ValidationError('O evento não está disponível.');
    const current = savedFor(state);
    const removing = current.includes(eventId);
    state.saved[state.activeProfile || 'visitor'] = removing ? current.filter(id => id !== eventId) : [...current, eventId];
    return !removing;
  });
}

export function enter(email: string) {
  return write(state => {
    const found = state.profiles.find(profile => profile.email === email.trim().toLowerCase());
    if (!found) throw new ValidationError('Perfil local não encontrado. Crie uma conta ou entre na demonstração.');
    state.activeProfile = found.id;
  });
}

export function enterDemo() { return write(state => { state.activeProfile = demoId; }); }
export function exitProfile() { return write(state => { state.activeProfile = null; }); }

export function registerProfile(name: string, email: string) {
  return write(state => {
    email = email.toLowerCase();
    identity(name, email);
    if (state.profiles.some(profile => profile.email === email)) throw new ValidationError('Já existe um perfil local com este e-mail.');
    const id = randomId();
    state.profiles.push({ id, name, email, interests: [], reminders: false });
    state.activeProfile = id;
  });
}

export function updateProfile(patch: Partial<Pick<Profile, 'name' | 'email' | 'interests' | 'reminders'>>) {
  return write(state => {
    const profile = profileFor(state);
    if (!profile) throw new ValidationError('Entre para editar seu perfil.');
    const next = { ...profile, ...patch, email: (patch.email ?? profile.email).toLowerCase() };
    identity(next.name, next.email);
    if (state.profiles.some(item => item.id !== profile.id && item.email === next.email)) throw new ValidationError('Este e-mail já está em uso neste navegador.');
    Object.assign(profile, next);
  });
}

export function reserve(input: {
  eventId: string; quantity: number; name: string; email: string;
  method: Registration['method']; expectedPrice: number; orderId: string; accepted: boolean;
}) {
  return write(state => {
    const profileId = state.activeProfile || 'visitor';
    const prior = state.registrations.find(item => item.id === `${input.orderId}-1`);
    if (prior) {
      if (prior.profileId !== profileId || prior.eventId !== input.eventId) throw new ValidationError('Esta solicitação de inscrição já foi usada.');
      return prior.id;
    }
    const event = state.events.find(item => item.id === input.eventId && item.status === 'published');
    if (!event || isPast(event)) throw new ValidationError('As inscrições para este evento estão encerradas.');
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > availability(state, event)) {
      throw new ValidationError('A quantidade solicitada supera o número de ingressos disponíveis.');
    }
    if (!input.accepted) throw new ValidationError('Aceite os termos da inscrição para continuar.');
    identity(input.name, input.email);
    if (event.price !== input.expectedPrice) throw new ValidationError('O valor foi atualizado. Volte ao evento para conferir o preço.');
    if (event.price ? !['pix', 'card'].includes(input.method) : input.method !== 'free') throw new ValidationError('Escolha uma modalidade válida.');
    const now = new Date().toISOString();
    const codes = new Set(state.registrations.map(item => item.code));
    const tickets = Array.from({ length: input.quantity }, (_, index): Registration => {
      let code: string;
      do { code = 'EVT-' + randomId().slice(0, 8).toUpperCase(); } while (codes.has(code));
      codes.add(code);
      return { id: `${input.orderId}-${index + 1}`, eventId: event.id, profileId,
        name: input.name, email: input.email.toLowerCase(), code, price: event.price,
        method: input.method, createdAt: now, checkedInAt: null };
    });
    state.registrations.push(...tickets);
    return tickets[0].id;
  });
}

export function formEvent(form: FormData): EventData {
  return {
    title: take(form, 'title'), category: take(form, 'category') as Category, format: take(form, 'format'),
    description: take(form, 'description'), cover: take(form, 'cover') as Cover,
    date: take(form, 'date'), time: take(form, 'time'), end: take(form, 'end'), venue: take(form, 'venue'),
    neighborhood: take(form, 'neighborhood'), city: take(form, 'city'),
    capacity: Number(take(form, 'capacity')),
    price: take(form, 'ticketType') === 'paid' ? Math.round(Number(take(form, 'price')) * 100) : 0,
    organizer: take(form, 'organizer'), schedule: take(form, 'schedule'),
  };
}

export function validateEvent(data: EventData, stage: 1 | 2) {
  if (stage === 1 && (data.title.length < 3 || !data.description || !data.organizer
    || !categories.includes(data.category) || !Object.hasOwn(covers, data.cover))) {
    throw new ValidationError('Preencha o nome do evento, a categoria, a organização e a descrição.');
  }
  if (stage === 2) {
    if (!datePattern.test(data.date) || data.date < '1900-01-01' || data.date > '2100-12-31'
      || !timePattern.test(data.time) || !data.venue || !data.neighborhood || !data.city) {
      throw new ValidationError('Preencha data, horário de início, local, bairro e cidade.');
    }
    if (data.end && (!timePattern.test(data.end) || data.end <= data.time)) throw new ValidationError('O horário de fim precisa ser posterior ao início.');
    if (!Number.isInteger(data.capacity) || data.capacity < 1 || data.capacity > 100000) throw new ValidationError('A capacidade deve ficar entre 1 e 100.000 pessoas.');
    if (!Number.isSafeInteger(data.price) || data.price < 0 || data.price > 100000000) throw new ValidationError('Informe um valor de ingresso válido.');
  }
}

export function saveEvent(id: string | undefined, data: EventData, status: Event['status']) {
  return write(state => {
    const current = state.events.find(event => event.id === id && event.managed);
    if (id && !current) throw new ValidationError('Evento do organizador não encontrado.');
    if (!data.title) throw new ValidationError('Dê um nome ao evento para salvar o rascunho.');
    if (status === 'published') {
      validateEvent(data, 1);
      validateEvent(data, 2);
    }
    if (current && data.capacity < registrationsFor(state, current.id).length) {
      throw new ValidationError('A capacidade não pode ser menor que o número de ingressos já emitidos.');
    }
    const event: Event = { ...data, id: current?.id || randomId(), status, managed: true };
    if (current) Object.assign(current, event);
    else state.events.push(event);
    return event.id;
  });
}

export function changePublication(eventId: string, status: Event['status']) {
  return write(state => {
    const event = state.events.find(item => item.id === eventId && item.managed);
    if (!event) throw new ValidationError('Evento do organizador não encontrado.');
    if (status === 'published') {
      validateEvent(event, 1);
      validateEvent(event, 2);
    }
    event.status = status;
  });
}

export function checkIn(eventId: string, code: string) {
  return write(state => {
    if (!state.events.some(event => event.id === eventId && event.managed)) throw new ValidationError('Selecione um evento do organizador.');
    const found = state.registrations.find(item => item.eventId === eventId && item.code === code.trim().toUpperCase());
    if (!found) throw new ValidationError('Código de ingresso não encontrado neste evento.');
    if (found.checkedInAt) return { ticket: found, repeated: true };
    found.checkedInAt = new Date().toISOString();
    return { ticket: found, repeated: false };
  });
}
