/* Taller — agenda de estudio. Todo se guarda en localStorage del dispositivo. */
(() => {
'use strict';

const STORE_KEY = 'taller.v1';
const UI_KEY = 'taller.ui';
const HOUR_H = 48;

const CATS = [
  { id: 'uni', name: 'Uni' },
  { id: 'japones', name: 'Japonés' },
  { id: 'master', name: 'Máster' },
  { id: 'personal', name: 'Personal' },
];
const CAT_NAME = Object.fromEntries(CATS.map(c => [c.id, c.name]));
const EVENT_TYPES = [
  { id: 'entrega', name: 'Entrega' },
  { id: 'examen', name: 'Examen' },
  { id: 'evento', name: 'Evento' },
];
const TYPE_NAME = Object.fromEntries(EVENT_TYPES.map(t => [t.id, t.name]));
const TASK_KINDS = [
  { id: 'tarea', name: 'Tarea' },
  { id: 'ejercicio', name: 'Ejercicio' },
  { id: 'estudio', name: 'Estudio' },
];
const KIND_NAME = Object.fromEntries(TASK_KINDS.map(t => [t.id, t.name]));
const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/* ---------------- Dates ---------------- */
const pad = n => String(n).padStart(2, '0');
const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayIdx = d => (d.getDay() + 6) % 7; // 0 = lunes
const startOfWeek = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -dayIdx(x)); };
const todayKey = () => toKey(new Date());
const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000); // b - a
const toMin = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmt = (k, opts) => parseKey(k).toLocaleDateString('es-ES', opts);
const fmtShort = k => fmt(k, { day: 'numeric', month: 'short' }).replace('.', '');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function relDay(k) {
  const n = diffDays(todayKey(), k);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n === -1) return 'Ayer';
  if (n < 0) return `Hace ${-n} días`;
  if (n < 7) return cap(fmt(k, { weekday: 'long' }));
  return fmtShort(k);
}

/* ---------------- State ---------------- */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function emptyState() {
  return { version: 1, demo: false, classes: [], events: [], tasks: [],
    master: { name: 'Mi máster', projects: [], notes: [], links: [] } };
}

function demoState() {
  const t = new Date();
  const k = n => toKey(addDays(t, n));
  const s = emptyState();
  s.demo = true;
  s.master.name = 'Máster en Arquitectura';
  s.classes = [
    { id: uid(), title: 'Proyectos III', cat: 'uni', days: [0, 2], start: '09:00', end: '13:00', place: 'Aula Taller 2' },
    { id: uid(), title: 'Construcción', cat: 'uni', days: [1], start: '10:00', end: '12:00', place: 'Aula 1.4' },
    { id: uid(), title: 'Japonés A2', cat: 'japones', days: [1, 3], start: '18:30', end: '20:00', place: 'Escuela de idiomas' },
    { id: uid(), title: 'Seminario del máster', cat: 'master', days: [4], start: '16:00', end: '19:00', place: 'Sala de juntas' },
  ];
  s.events = [
    { id: uid(), title: 'Entrega maqueta 1:200', cat: 'uni', type: 'entrega', date: k(5), start: '12:00', end: '', notes: 'Llevar también las láminas impresas en A1.' },
    { id: uid(), title: 'Examen kanji (lección 10–12)', cat: 'japones', type: 'examen', date: k(9), start: '18:30', end: '19:15', notes: '' },
    { id: uid(), title: 'Pre-entrega TFM', cat: 'master', type: 'entrega', date: k(18), start: '', end: '', notes: '' },
  ];
  s.tasks = [
    { id: uid(), title: 'Subir láminas al campus virtual', cat: 'uni', kind: 'tarea', due: k(-1), priority: 1, done: false, notes: '' },
    { id: uid(), title: 'Repasar kanji lección 12', cat: 'japones', kind: 'estudio', due: k(0), priority: 0, done: false, notes: '' },
    { id: uid(), title: 'Ejercicios de gramática ～ている', cat: 'japones', kind: 'ejercicio', due: k(1), priority: 0, done: false, notes: 'Libro p. 84–86' },
    { id: uid(), title: 'Plantas y secciones a 1:100', cat: 'uni', kind: 'tarea', due: k(3), priority: 1, done: false, notes: '' },
    { id: uid(), title: 'Leer artículo para el seminario', cat: 'master', kind: 'estudio', due: k(6), priority: 0, done: false, notes: '' },
    { id: uid(), title: 'Comprar cartón pluma y cola', cat: 'personal', kind: 'tarea', due: '', priority: 0, done: false, notes: '' },
  ];
  s.master.projects = [
    { id: uid(), title: 'TFM — Vivienda colectiva', due: k(60), desc: 'Proyecto final del máster. Tutor: revisar en tutorías de los viernes.',
      milestones: [
        { id: uid(), title: 'Análisis del lugar', date: k(-20), done: true },
        { id: uid(), title: 'Programa y referentes', date: k(-6), done: true },
        { id: uid(), title: 'Anteproyecto', date: k(18), done: false },
        { id: uid(), title: 'Desarrollo y detalles', date: k(40), done: false },
        { id: uid(), title: 'Entrega final y panel', date: k(60), done: false },
      ] },
    { id: uid(), title: 'Workshop internacional', due: k(25), desc: 'Trabajo en grupo de 4 personas.',
      milestones: [
        { id: uid(), title: 'Formar grupo y tema', date: k(-2), done: true },
        { id: uid(), title: 'Propuesta inicial', date: k(10), done: false },
        { id: uid(), title: 'Presentación final', date: k(25), done: false },
      ] },
  ];
  s.master.notes = [
    { id: uid(), title: 'Tutorías TFM', body: 'Viernes de 12:00 a 14:00, despacho 3.12.\nPedir cita por correo con 2 días de antelación.', pinned: true },
    { id: uid(), title: 'Criterios de evaluación', body: 'Proceso 30%\nPropuesta 50%\nPresentación 20%', pinned: false },
    { id: uid(), title: 'Formato de entrega', body: 'Paneles A1 en vertical, PDF < 20 MB, nombre: APELLIDO_TFM_v1.pdf', pinned: false },
  ];
  s.master.links = [
    { id: uid(), title: 'Diccionario de japonés (Jisho)', url: 'https://jisho.org' },
    { id: uid(), title: 'Archdaily — referentes', url: 'https://www.archdaily.com' },
  ];
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* datos corruptos o almacenamiento bloqueado */ }
  return demoState();
}
function normalize(s) {
  const base = emptyState();
  const out = { ...base, ...s, master: { ...base.master, ...(s.master || {}) } };
  for (const key of ['classes', 'events', 'tasks']) if (!Array.isArray(out[key])) out[key] = [];
  for (const key of ['projects', 'notes', 'links']) if (!Array.isArray(out.master[key])) out.master[key] = [];
  out.master.projects.forEach(p => { if (!Array.isArray(p.milestones)) p.milestones = []; });
  return out;
}
let state = load();
function saveLocal() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('No se ha podido guardar en este navegador'); }
}
function save() {
  saveLocal();
  if (sync.api) sync.api.push(state);
}

/* ---------------- Sincronización (opcional, Firebase) ---------------- */
const FB_CONFIG = window.TALLER_FIREBASE && window.TALLER_FIREBASE.apiKey ? window.TALLER_FIREBASE : null;
const sync = { api: null, status: FB_CONFIG ? 'loading' : 'disabled', user: null, pending: null };
const SYNC_LABEL = {
  loading: 'Cargando…', connecting: 'Conectando…', signedout: 'Sin iniciar sesión', synced: 'Sincronizado',
  saving: 'Guardando…', offline: 'Sin conexión · se subirá al volver', error: 'Error de sincronización', unavailable: 'No disponible sin conexión',
};

function canRenderNow() {
  // Con un formulario abierto esperamos a que se cierre, para no perder lo que se está editando.
  if (modal.open && modalHandlers.onSave) return false;
  const a = document.activeElement;
  return !(a && view.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && a.value);
}
function applyPending() {
  if (!sync.pending || !canRenderNow()) return;
  state = sync.pending; sync.pending = null;
  saveLocal(); render();
  const demoBtn = modal.open && modalForm.querySelector('[data-action="clear-demo"]');
  if (demoBtn) demoBtn.outerHTML = '<button type="button" class="btn" data-action="load-demo">Ver datos de ejemplo</button>';
}
function replaceState(s) {
  s.demo = false;
  sync.pending = s;
  applyPending();
}
function syncStatusChanged(st, user) {
  sync.status = st; sync.user = user;
  const btn = document.getElementById('syncBtn');
  if (btn) {
    btn.hidden = !FB_CONFIG;
    btn.dataset.state = st;
    btn.title = SYNC_LABEL[st] || '';
    btn.setAttribute('aria-label', 'Sincronización: ' + (SYNC_LABEL[st] || ''));
  }
  const box = document.getElementById('syncBox');
  if (box) box.innerHTML = syncBoxHTML();
}
function syncBoxHTML() {
  const st = sync.status;
  if (st === 'signedout') return `<p class="hint">Inicia sesión con Google para tener los mismos datos en el móvil y en el ordenador. Lo que ya tengas aquí se sube a tu cuenta.</p>
    <div class="menu-list"><button type="button" class="btn primary" data-action="sign-in">${GOOGLE_G} Iniciar sesión con Google</button></div>`;
  if (st === 'loading' || st === 'unavailable') return `<p class="hint">${SYNC_LABEL[st]}</p>`;
  const who = sync.user ? esc(sync.user.email || sync.user.displayName || '') : '';
  return `<p class="hint sync-line"><i class="sync-dot" data-state="${st}"></i>${esc(SYNC_LABEL[st] || '')}${who ? ` · <b>${who}</b>` : ''}</p>
    <div class="menu-list"><button type="button" class="btn" data-action="sign-out">Cerrar sesión</button></div>`;
}
const GOOGLE_G = '<svg viewBox="0 0 48 48" style="stroke:none"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

function startSync() {
  if (!FB_CONFIG) return;
  syncStatusChanged('loading', null);
  import('./sync.bundle.js').then(m => {
    sync.api = m.start({
      config: FB_CONFIG,
      emptyState, normalize,
      getState: () => state,
      replaceState,
      onStatus: syncStatusChanged,
      onError: msg => toast(msg),
    });
  }).catch(err => { console.error('[Taller] no se pudo cargar la sincronización', err); syncStatusChanged('unavailable', null); });
}

let ui = { view: 'hoy', weekStart: null, selDay: null, taskStatus: 'pending', taskCat: 'all', theme: 'auto' };
try { Object.assign(ui, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); } catch (e) {}
ui.weekStart = toKey(startOfWeek(new Date()));
ui.selDay = todayKey();
const saveUI = () => { try { localStorage.setItem(UI_KEY, JSON.stringify({ view: ui.view, taskStatus: ui.taskStatus, taskCat: ui.taskCat, theme: ui.theme })); } catch (e) {} };

function applyTheme() {
  if (ui.theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', ui.theme);
}

/* ---------------- Derived data ---------------- */
function itemsForDate(k) {
  const d = parseKey(k);
  const di = dayIdx(d);
  const timed = [], allday = [];
  for (const c of state.classes) {
    if (!c.days.includes(di)) continue;
    if (c.from && k < c.from) continue;
    if (c.until && k > c.until) continue;
    timed.push({ kind: 'class', ref: c, id: c.id, title: c.title, cat: c.cat, start: c.start, end: c.end, sub: c.place });
  }
  for (const e of state.events) {
    if (e.date !== k) continue;
    const it = { kind: 'event', ref: e, id: e.id, title: e.title, cat: e.cat, type: e.type, start: e.start, end: e.end, sub: TYPE_NAME[e.type] };
    (e.start ? timed : allday).push(it);
  }
  for (const p of state.master.projects) for (const m of p.milestones) {
    if (m.date === k) allday.push({ kind: 'milestone', ref: m, project: p, id: m.id, title: `${m.title} · ${p.title}`, cat: 'master', type: 'entrega', done: m.done });
  }
  for (const t of state.tasks) {
    if (t.due === k && !t.done) allday.push({ kind: 'task', ref: t, id: t.id, title: t.title, cat: t.cat, sub: KIND_NAME[t.kind] || 'Tarea' });
  }
  timed.sort((a, b) => toMin(a.start) - toMin(b.start));
  allday.sort((a, b) => (a.kind === 'task') - (b.kind === 'task'));
  return { timed, allday };
}

function upcomingDeadlines(days = 45) {
  const tk = todayKey();
  const out = [];
  for (const e of state.events) {
    if (e.type === 'evento') continue;
    const n = diffDays(tk, e.date);
    if (n >= 0 && n <= days) out.push({ kind: 'event', ref: e, title: e.title, cat: e.cat, date: e.date, label: TYPE_NAME[e.type], n });
  }
  for (const p of state.master.projects) for (const m of p.milestones) {
    if (m.done || !m.date) continue;
    const n = diffDays(tk, m.date);
    if (n >= 0 && n <= days) out.push({ kind: 'milestone', ref: m, project: p, title: m.title, cat: 'master', date: m.date, label: p.title, n });
  }
  return out.sort((a, b) => a.n - b.n);
}

/* ---------------- Rendering helpers ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const ICON = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>',
  pin: '<svg class="pin" viewBox="0 0 24 24"><path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4-1-6z"/></svg>',
  link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

function timeLabel(it) {
  if (!it.start) return 'Todo el día';
  return it.end ? `${it.start}–${it.end}` : it.start;
}
function agendaRow(it) {
  const tag = it.kind === 'event' && it.type !== 'evento' ? `<span class="tag solid">${esc(TYPE_NAME[it.type])}</span>`
    : it.kind === 'milestone' ? '<span class="tag solid">Hito</span>'
    : it.kind === 'task' ? `<span class="tag">${esc(it.sub)}</span>` : '';
  const sub = it.kind === 'class' ? it.sub : '';
  return `<button class="row" data-cat="${it.cat}" data-open="${it.kind}:${it.id}">
    <span class="time">${it.kind === 'task' ? 'Para hoy' : timeLabel(it)}</span>
    <span class="bar"></span>
    <span class="body"><span class="title">${esc(it.title)}</span>
      <span class="meta"><span>${esc(CAT_NAME[it.cat])}</span>${sub ? `<span>· ${esc(sub)}</span>` : ''}${tag}</span></span>
  </button>`;
}

function deadlineRow(d) {
  const urgent = d.n <= 3;
  const big = d.n === 0 ? 'HOY' : d.n;
  const small = d.n === 0 ? '' : d.n === 1 ? 'día' : 'días';
  return `<button class="deadline" data-cat="${d.cat}" data-open="${d.kind}:${d.ref.id}">
    <span class="count ${urgent ? 'urgent' : ''}"><b>${big}</b><small>${small}</small></span>
    <span class="body"><span class="title">${esc(d.title)}</span>
      <span class="meta"><span>${esc(cap(fmt(d.date, { weekday: 'short', day: 'numeric', month: 'short' })))}</span><span>· ${esc(d.label)}</span></span></span>
  </button>`;
}

function taskRow(t) {
  const tk = todayKey();
  let due = '';
  if (t.due) {
    const late = !t.done && t.due < tk;
    due = `<span class="${late ? 'late' : ''}">${esc(relDay(t.due))}</span>`;
  }
  return `<div class="task ${t.done ? 'done' : ''}" data-cat="${t.cat}">
    <button class="check ${t.done ? 'on' : ''}" data-toggle-task="${t.id}" aria-label="${t.done ? 'Marcar como pendiente' : 'Marcar como hecha'}">${ICON.check}</button>
    <div class="body" data-open="task:${t.id}">
      <div class="title">${t.priority ? '<span class="prio">!</span> ' : ''}${esc(t.title)}</div>
      <div class="meta"><span class="tag">${esc(CAT_NAME[t.cat])}</span><span>${esc(KIND_NAME[t.kind] || 'Tarea')}</span>${due ? '<span>·</span>' + due : ''}</div>
    </div>
  </div>`;
}

const catOptions = sel => CATS.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.name}</option>`).join('');

/* ---------------- Views ---------------- */
function render() {
  document.querySelectorAll('.tab').forEach(b => {
    const on = b.dataset.view === ui.view;
    b.classList.toggle('active', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  ({ hoy: renderHoy, calendario: renderCal, tareas: renderTasks, master: renderMaster })[ui.view]();
}

function renderHoy() {
  const tk = todayKey();
  const now = new Date();
  const h = now.getHours();
  const greet = h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  const { timed, allday } = itemsForDate(tk);
  const nowMin = h * 60 + now.getMinutes();

  const dueTasks = state.tasks.filter(t => !t.done && t.due && t.due <= tk)
    .sort((a, b) => a.due.localeCompare(b.due) || b.priority - a.priority);
  const soonTasks = state.tasks.filter(t => !t.done && t.due && t.due > tk && diffDays(tk, t.due) <= 3)
    .sort((a, b) => a.due.localeCompare(b.due));
  const deadlines = upcomingDeadlines(45);
  const week = deadlines.filter(d => d.n <= 7).length;

  let agenda = '';
  const allNonTask = allday.filter(i => i.kind !== 'task');
  agenda += allNonTask.map(agendaRow).join('');
  let placedNow = false;
  for (const it of timed) {
    if (!placedNow && toMin(it.start) > nowMin) { agenda += '<div class="now-line" title="Ahora"></div>'; placedNow = true; }
    agenda += agendaRow(it);
  }
  if (!placedNow && timed.length) agenda += '<div class="now-line" title="Ahora"></div>';
  if (!agenda) agenda = '<div class="empty"><strong>Nada en el calendario hoy</strong>Buen día para adelantar tareas.</div>';

  const tomorrow = itemsForDate(toKey(addDays(now, 1)));
  const tmr = [...tomorrow.allday.filter(i => i.kind !== 'task'), ...tomorrow.timed];

  view.innerHTML = `
    ${state.demo ? `<div class="card" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:8px 0 4px">
      <span style="font-size:14px"><b>Estás viendo datos de ejemplo.</b> <span style="color:var(--muted)">Explora la app y, cuando quieras, empieza con la agenda vacía.</span></span>
      <button class="btn primary small" data-action="clear-demo">Empezar en blanco</button></div>` : ''}
    <div class="view-head"><div><div class="eyebrow">${esc(cap(fmt(tk, { weekday: 'long', day: 'numeric', month: 'long' })))}</div><h1>${greet}</h1></div></div>
    <div class="stats">
      <div class="stat"><b>${timed.filter(i => i.kind === 'class').length}</b><span>clases hoy</span></div>
      <div class="stat"><b>${dueTasks.length}</b><span>tareas para hoy</span></div>
      <div class="stat"><b>${week}</b><span>entregas en 7 días</span></div>
    </div>
    <div class="grid-2">
      <div class="stack">
        <section class="card"><div class="card-head"><h2>Agenda de hoy</h2><button class="btn ghost small" data-goto="calendario">Ver semana ${ICON.right}</button></div>
          <div class="list">${agenda}</div></section>
        <section class="card"><div class="card-head"><h2>Mañana</h2><span class="eyebrow">${esc(fmt(toKey(addDays(now, 1)), { weekday: 'long' }))}</span></div>
          <div class="list">${tmr.length ? tmr.map(agendaRow).join('') : '<div class="empty">Nada programado.</div>'}</div></section>
      </div>
      <div class="stack">
        <section class="card"><div class="card-head"><h2>Próximas entregas</h2><span class="eyebrow">45 días</span></div>
          <div class="list">${deadlines.length ? deadlines.slice(0, 6).map(deadlineRow).join('') : '<div class="empty"><strong>Sin entregas a la vista</strong>Añádelas desde el calendario con el botón +.</div>'}</div></section>
        <section class="card"><div class="card-head"><h2>Tareas de hoy</h2><button class="btn ghost small" data-goto="tareas">Todas ${ICON.right}</button></div>
          ${dueTasks.length ? dueTasks.map(taskRow).join('') : '<div class="empty">Todo al día ✓</div>'}
          ${soonTasks.length ? `<div class="group-label">Próximos días</div>${soonTasks.map(taskRow).join('')}` : ''}
        </section>
      </div>
    </div>`;
}

function renderCal() {
  const ws = parseKey(ui.weekStart);
  const days = Array.from({ length: 7 }, (_, i) => toKey(addDays(ws, i)));
  const tk = todayKey();
  if (!days.includes(ui.selDay)) ui.selDay = days.includes(tk) ? tk : days[0];
  const end = days[6];
  const sameMonth = parseKey(days[0]).getMonth() === parseKey(end).getMonth();
  const range = sameMonth
    ? `${parseKey(days[0]).getDate()} – ${fmt(end, { day: 'numeric', month: 'long', year: 'numeric' })}`
    : `${fmtShort(days[0])} – ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')}`;
  const data = days.map(itemsForDate);

  // horas visibles
  let minH = 8, maxH = 21;
  data.forEach(d => d.timed.forEach(it => {
    minH = Math.min(minH, Math.floor(toMin(it.start) / 60));
    maxH = Math.max(maxH, Math.ceil((toMin(it.end) ?? toMin(it.start) + 60) / 60));
  }));
  maxH = Math.min(24, maxH);
  const hours = Array.from({ length: maxH - minH }, (_, i) => minH + i);

  const head = `<div></div>` + days.map((k, i) => `<div class="${k === tk ? 'today' : ''}"><div class="dname">${DAY_SHORT[i]}</div><div class="dnum">${parseKey(k).getDate()}</div></div>`).join('');
  const allday = `<div>todo<br>el día</div>` + days.map((k, i) => `<div data-slot="${k}">${data[i].allday.map(it =>
    `<button class="pill ${it.kind === 'task' ? 'soft' : ''}" data-cat="${it.cat}" data-open="${it.kind}:${it.id}" title="${esc(it.title)}">${it.kind === 'task' ? '☐ ' : ''}${esc(it.title)}</button>`).join('')}</div>`).join('');

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const cols = days.map((k, i) => {
    const laid = layout(data[i].timed);
    const evs = laid.map(({ it, lane, lanes }) => {
      const s = toMin(it.start), e = toMin(it.end) ?? s + 60;
      const top = (s - minH * 60) / 60 * HOUR_H;
      const hgt = Math.max(22, (e - s) / 60 * HOUR_H - 2);
      const w = 100 / lanes;
      return `<button class="ev" data-cat="${it.cat}" data-open="${it.kind}:${it.id}" style="top:${top}px;height:${hgt}px;left:calc(${w * lane}% + 3px);right:auto;width:calc(${w}% - 6px)">
        <b>${it.kind === 'event' && it.type !== 'evento' ? esc(TYPE_NAME[it.type]) + ' · ' : ''}${esc(it.title)}</b><span>${esc(timeLabel(it))}</span>${hgt > 50 && it.sub && it.kind === 'class' ? `<span>${esc(it.sub)}</span>` : ''}</button>`;
    }).join('');
    const nowM = k === tk && nowMin >= minH * 60 && nowMin <= maxH * 60 ? `<div class="nowmark" style="top:${(nowMin - minH * 60) / 60 * HOUR_H}px"></div>` : '';
    return `<div class="daycol ${k === tk ? 'today' : ''}" data-col="${k}" style="height:${hours.length * HOUR_H}px">${evs}${nowM}</div>`;
  }).join('');

  const sel = ui.selDay;
  const sd = itemsForDate(sel);
  const selList = [...sd.allday, ...sd.timed];

  view.innerHTML = `
    <div class="view-head">
      <div><div class="eyebrow">Calendario</div><h1>${esc(range)}</h1></div>
      <div class="cal-nav">
        <button class="icon-btn" data-week="-1" aria-label="Semana anterior">${ICON.left}</button>
        <button class="btn" data-week="0">Hoy</button>
        <button class="icon-btn" data-week="1" aria-label="Semana siguiente">${ICON.right}</button>
      </div>
    </div>
    <div class="toolbar">
      <div class="legend">${CATS.map(c => `<span data-cat="${c.id}"><i class="dot"></i>${c.name}</span>`).join('')}</div>
      <div class="chips"><button class="btn small" data-action="new-class">${ICON.plus} Horario fijo</button><button class="btn small" data-action="new-event">${ICON.plus} Entrega / evento</button></div>
    </div>

    <div class="week desktop-only">
      <div class="week-head">${head}</div>
      <div class="week-allday">${allday}</div>
      <div class="week-body" id="weekBody">
        <div class="hours">${hours.map(h => `<div>${pad(h)}:00</div>`).join('')}</div>
        ${cols}
      </div>
    </div>

    <div class="mobile-only">
      <div class="daystrip">${days.map((k, i) => {
        const d = data[i];
        const cats = [...new Set([...d.allday, ...d.timed].map(x => x.cat))].slice(0, 4);
        return `<button class="daybtn ${k === sel ? 'sel' : ''} ${k === tk ? 'today' : ''}" data-sel="${k}">
          <span class="dname">${DAY_LETTER[i]}</span><span class="dnum">${parseKey(k).getDate()}</span>
          <span class="dots">${cats.map(c => `<i data-cat="${c}"></i>`).join('')}</span></button>`;
      }).join('')}</div>
      <section class="card">
        <div class="card-head"><h2>${esc(cap(fmt(sel, { weekday: 'long', day: 'numeric', month: 'long' })))}</h2><button class="btn small" data-action="new-on-day">${ICON.plus} Añadir</button></div>
        <div class="list">${selList.length ? selList.map(it => agendaRow(it).replace('Para hoy', 'Tarea')).join('') : '<div class="empty">Día libre.</div>'}</div>
      </section>
    </div>
    <p class="hint desktop-only" style="margin-top:10px">Consejo: haz clic en un hueco del calendario para añadir algo a esa hora.</p>`;

  const wb = $('#weekBody');
  if (wb && !renderCal.scrolled) {
    const first = Math.min(...data.flatMap(d => d.timed.map(it => toMin(it.start))), 9 * 60);
    wb.scrollTop = Math.max(0, (first - minH * 60) / 60 * HOUR_H - 12);
    renderCal.scrolled = true;
  }
  renderCal.minH = minH;
}

// reparte eventos solapados en carriles
function layout(items) {
  const res = [];
  let cluster = [], clusterEnd = -1;
  const flush = () => {
    const lanesEnd = [];
    const placed = cluster.map(it => {
      const s = toMin(it.start), e = toMin(it.end) ?? s + 60;
      let lane = lanesEnd.findIndex(x => x <= s);
      if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(e); } else lanesEnd[lane] = e;
      return { it, lane };
    });
    placed.forEach(p => res.push({ ...p, lanes: lanesEnd.length }));
    cluster = [];
  };
  for (const it of items) {
    const s = toMin(it.start), e = toMin(it.end) ?? s + 60;
    if (cluster.length && s >= clusterEnd) flush(), clusterEnd = -1;
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, e);
  }
  if (cluster.length) flush();
  return res;
}

function renderTasks() {
  const tk = todayKey();
  const byCat = t => ui.taskCat === 'all' || t.cat === ui.taskCat;
  const pending = state.tasks.filter(t => !t.done && byCat(t));
  const done = state.tasks.filter(t => t.done && byCat(t)).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const sortFn = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || b.priority - a.priority;

  let body = '';
  if (ui.taskStatus === 'pending') {
    const groups = [
      { label: 'Atrasadas', cls: 'late', f: t => t.due && t.due < tk },
      { label: 'Hoy', f: t => t.due === tk },
      { label: 'Mañana', f: t => t.due && diffDays(tk, t.due) === 1 },
      { label: 'Esta semana', f: t => t.due && diffDays(tk, t.due) > 1 && diffDays(tk, t.due) <= 7 },
      { label: 'Más adelante', f: t => t.due && diffDays(tk, t.due) > 7 },
      { label: 'Sin fecha', f: t => !t.due },
    ];
    for (const g of groups) {
      const list = pending.filter(g.f).sort(sortFn);
      if (!list.length) continue;
      body += `<div class="group-label ${g.cls || ''}">${g.label} <span>${list.length}</span></div>${list.map(taskRow).join('')}`;
    }
    if (!body) body = '<div class="empty"><strong>No hay tareas pendientes</strong>Escribe arriba la siguiente cosa que tengas que hacer.</div>';
  } else {
    body = done.length ? done.map(taskRow).join('') + `<div style="text-align:right;margin-top:10px"><button class="btn small danger" data-action="clear-done">Borrar hechas</button></div>`
      : '<div class="empty">Aún no has completado ninguna tarea.</div>';
  }

  view.innerHTML = `
    <div class="view-head"><div><div class="eyebrow">Tareas y ejercicios</div><h1>${pending.length} pendiente${pending.length === 1 ? '' : 's'}</h1></div></div>
    <form class="quick-add card" id="quickAdd" style="padding:10px">
      <input type="text" name="title" placeholder="Nueva tarea… p. ej. «Ejercicios de katakana»" aria-label="Nueva tarea" autocomplete="off" required>
      <select name="cat" aria-label="Categoría">${catOptions(ui.taskCat !== 'all' ? ui.taskCat : 'uni')}</select>
      <input type="date" name="due" aria-label="Fecha límite">
      <button class="btn primary" type="submit">${ICON.plus} Añadir</button>
    </form>
    <div class="toolbar">
      <div class="chips">
        <button class="chip ${ui.taskStatus === 'pending' ? 'on' : ''}" data-status="pending">Pendientes</button>
        <button class="chip ${ui.taskStatus === 'done' ? 'on' : ''}" data-status="done">Hechas</button>
      </div>
      <div class="chips">
        <button class="chip ${ui.taskCat === 'all' ? 'on' : ''}" data-tcat="all">Todas</button>
        ${CATS.map(c => `<button class="chip ${ui.taskCat === c.id ? 'on' : ''}" data-tcat="${c.id}" data-cat="${c.id}"><i class="dot"></i>${c.name}</button>`).join('')}
      </div>
    </div>
    <section class="card">${body}</section>`;
}

function renderMaster() {
  const m = state.master;
  const tk = todayKey();
  const projects = m.projects.map(p => {
    const total = p.milestones.length, dn = p.milestones.filter(x => x.done).length;
    const pct = total ? Math.round(dn / total * 100) : 0;
    const ms = [...p.milestones].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    const n = p.due ? diffDays(tk, p.due) : null;
    return `<article class="card project">
      <div class="project-top">
        <div style="min-width:0"><div class="eyebrow">${p.due ? (n < 0 ? 'Entregado / pasado' : n === 0 ? 'Entrega hoy' : `Entrega en ${n} día${n === 1 ? '' : 's'}`) + ' · ' + esc(fmtShort(p.due)) : 'Sin fecha final'}</div><h3>${esc(p.title)}</h3></div>
        <button class="icon-btn" data-open="project:${p.id}" aria-label="Editar proyecto">${ICON.edit}</button>
      </div>
      ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ''}
      <div><div class="progress-label"><span>Progreso</span><span>${dn}/${total} hitos · ${pct}%</span></div><div class="progress"><i style="width:${pct}%"></i></div></div>
      <div>${ms.map(x => `<div class="milestone ${x.done ? 'done' : ''}">
          <button class="check ${x.done ? 'on' : ''}" data-toggle-ms="${p.id}:${x.id}" aria-label="Completar hito">${ICON.check}</button>
          <span class="mt">${esc(x.title)}</span>
          <span class="mdate ${!x.done && x.date && x.date < tk ? 'late' : ''}">${x.date ? esc(fmtShort(x.date)) : ''}</span></div>`).join('')}</div>
      <form class="add-ms" data-add-ms="${p.id}">
        <input type="text" name="title" placeholder="Nuevo hito…" aria-label="Nuevo hito" required>
        <input type="date" name="date" aria-label="Fecha del hito" style="width:auto">
        <button class="btn small" type="submit" aria-label="Añadir hito">${ICON.plus}</button>
      </form>
    </article>`;
  }).join('');

  const notes = [...m.notes].sort((a, b) => b.pinned - a.pinned).map(n => `<button class="card note" data-open="note:${n.id}">
      <h3>${n.pinned ? ICON.pin : ''}${esc(n.title || 'Sin título')}</h3><p>${esc(n.body)}</p></button>`).join('');

  const links = m.links.map(l => {
    let host = ''; try { host = new URL(l.url).hostname.replace(/^www\./, ''); } catch (e) {}
    return `<div style="display:flex;align-items:center;gap:4px"><a class="link" style="flex:1;min-width:0" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${ICON.link}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.title || host)}</span><span class="host">${esc(host)}</span></a>
      <button class="icon-btn edit" style="border:0;background:none" data-open="link:${l.id}" aria-label="Editar enlace">${ICON.edit}</button></div>`;
  }).join('');

  view.innerHTML = `
    <div class="view-head">
      <div><div class="eyebrow">Lo principal del máster</div><h1>${esc(m.name)}</h1></div>
      <button class="btn small" data-action="rename-master">${ICON.edit} Renombrar</button>
    </div>
    <div class="section-title" style="margin-top:4px"><h2>Proyectos y entregas clave</h2><button class="btn small" data-action="new-project">${ICON.plus} Proyecto</button></div>
    ${projects ? `<div class="projects">${projects}</div>` : '<div class="card empty"><strong>Sin proyectos todavía</strong>Crea uno (p. ej. el TFM) y divídelo en hitos con fecha: aparecerán en el calendario.</div>'}
    <div class="section-title"><h2>Notas importantes</h2><button class="btn small" data-action="new-note">${ICON.plus} Nota</button></div>
    ${notes ? `<div class="notes">${notes}</div>` : '<div class="card empty">Apunta aquí tutorías, criterios de evaluación, formatos de entrega…</div>'}
    <div class="section-title"><h2>Enlaces y recursos</h2><button class="btn small" data-action="new-link">${ICON.plus} Enlace</button></div>
    <section class="card">${links ? `<div class="links">${links}</div>` : '<div class="empty">Campus virtual, drive del grupo, bibliografía…</div>'}</section>`;
}

const safeUrl = u => /^(https?:|mailto:)/i.test(u || '') ? u : 'https://' + String(u || '').replace(/^\/+/, '');

/* ---------------- Modal ---------------- */
const modal = $('#modal');
const modalForm = $('#modalForm');
let modalHandlers = {};

function openModal({ title, body, onSave, onDelete, saveLabel = 'Guardar', noFoot = false }) {
  modalHandlers = { onSave, onDelete };
  modalForm.innerHTML = `
    <div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Cerrar">${ICON.close}</button></div>
    <div class="modal-body">${body}</div>
    ${noFoot ? '<div style="height:14px"></div>' : `<div class="modal-foot">
      ${onDelete ? '<button type="button" class="btn danger" data-delete>Eliminar</button>' : ''}
      <span class="spacer"></span>
      <button type="button" class="btn" data-close>Cancelar</button>
      <button type="submit" class="btn primary">${esc(saveLabel)}</button></div>`}`;
  modal.showModal();
  const first = modalForm.querySelector('.modal-body input[type="text"], .modal-body textarea');
  if (first && !('ontouchstart' in window)) first.focus();
}
function closeModal() { modal.close(); modalHandlers = {}; setTimeout(applyPending, 0); }
modal.addEventListener('close', () => setTimeout(applyPending, 0));
document.addEventListener('focusout', () => setTimeout(applyPending, 0));

modalForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!modalHandlers.onSave) return;
  if (!modalForm.reportValidity()) return;
  const fd = new FormData(modalForm);
  const data = {};
  for (const [k, v] of fd.entries()) {
    if (k in data) data[k] = [].concat(data[k], v); else data[k] = typeof v === 'string' ? v.trim() : v;
  }
  if (modalHandlers.onSave(data, fd) === false) return;
  save(); closeModal(); render();
});
modalForm.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) closeModal();
  if (e.target.closest('[data-delete]') && modalHandlers.onDelete) {
    if (confirm('¿Eliminar definitivamente?')) { modalHandlers.onDelete(); save(); closeModal(); render(); }
  }
});
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

const field = (label, inner) => `<label class="field"><span>${label}</span>${inner}</label>`;
const segCats = (name, sel) => `<div class="field"><span>Categoría</span><div class="seg">${CATS.map(c =>
  `<label data-cat="${c.id}"><input type="radio" name="${name}" value="${c.id}" ${c.id === sel ? 'checked' : ''}><span class="chip"><i class="dot"></i>${c.name}</span></label>`).join('')}</div></div>`;
const segSimple = (label, name, opts, sel) => `<div class="field"><span>${label}</span><div class="seg">${opts.map(o =>
  `<label><input type="radio" name="${name}" value="${o.id}" ${o.id === sel ? 'checked' : ''}><span class="chip">${o.name}</span></label>`).join('')}</div></div>`;

function openClassForm(c, preset = {}) {
  const isNew = !c;
  c = c || { title: '', cat: preset.cat || 'uni', days: preset.day != null ? [preset.day] : [], start: preset.start || '09:00', end: preset.end || '11:00', place: '', from: '', until: '' };
  openModal({
    title: isNew ? 'Nuevo horario fijo' : 'Editar horario',
    body: `
      <p class="hint">Para clases que se repiten cada semana: uni, japonés, seminarios…</p>
      ${field('Nombre', `<input type="text" name="title" value="${esc(c.title)}" placeholder="p. ej. Japonés A2" required>`)}
      ${segCats('cat', c.cat)}
      <div class="field"><span>Días</span><div class="seg days">${DAY_SHORT.map((d, i) =>
        `<label><input type="checkbox" name="days" value="${i}" ${c.days.includes(i) ? 'checked' : ''}><span class="chip">${d}</span></label>`).join('')}</div></div>
      <div class="field-row">${field('Empieza', `<input type="time" name="start" value="${esc(c.start)}" required>`)}${field('Termina', `<input type="time" name="end" value="${esc(c.end)}" required>`)}</div>
      ${field('Lugar / aula', `<input type="text" name="place" value="${esc(c.place)}" placeholder="Opcional">`)}
      <div class="field-row">${field('Desde (opcional)', `<input type="date" name="from" value="${esc(c.from || '')}">`)}${field('Hasta (opcional)', `<input type="date" name="until" value="${esc(c.until || '')}">`)}</div>
      <p class="hint">Usa «desde / hasta» para que la clase solo aparezca durante el cuatrimestre.</p>`,
    onSave: (d, fd) => {
      const days = fd.getAll('days').map(Number);
      if (!days.length) { toast('Elige al menos un día'); return false; }
      if (toMin(d.end) <= toMin(d.start)) { toast('La hora de fin debe ser posterior al inicio'); return false; }
      const obj = { id: c.id || uid(), title: d.title, cat: d.cat, days, start: d.start, end: d.end, place: d.place, from: d.from, until: d.until };
      if (isNew) state.classes.push(obj); else Object.assign(c, obj);
      toast(isNew ? 'Horario añadido' : 'Horario guardado');
    },
    onDelete: isNew ? null : () => { state.classes = state.classes.filter(x => x.id !== c.id); },
  });
}

function openEventForm(ev, preset = {}) {
  const isNew = !ev;
  ev = ev || { title: '', cat: preset.cat || 'uni', type: preset.type || 'entrega', date: preset.date || todayKey(), start: preset.start || '', end: preset.end || '', notes: '' };
  openModal({
    title: isNew ? 'Nueva entrega o evento' : 'Editar',
    body: `
      ${segSimple('Tipo', 'type', EVENT_TYPES, ev.type)}
      ${field('Título', `<input type="text" name="title" value="${esc(ev.title)}" placeholder="p. ej. Entrega láminas Proyectos" required>`)}
      ${segCats('cat', ev.cat)}
      ${field('Fecha', `<input type="date" name="date" value="${esc(ev.date)}" required>`)}
      <div class="field-row">${field('Hora (opcional)', `<input type="time" name="start" value="${esc(ev.start)}">`)}${field('Hasta (opcional)', `<input type="time" name="end" value="${esc(ev.end)}">`)}</div>
      ${field('Notas', `<textarea name="notes" placeholder="Qué hay que entregar, formato, dónde…">${esc(ev.notes)}</textarea>`)}`,
    onSave: d => {
      if (d.end && !d.start) d.end = '';
      if (d.end && toMin(d.end) <= toMin(d.start)) { toast('La hora de fin debe ser posterior al inicio'); return false; }
      const obj = { id: ev.id || uid(), title: d.title, cat: d.cat, type: d.type, date: d.date, start: d.start, end: d.end, notes: d.notes };
      if (isNew) state.events.push(obj); else Object.assign(ev, obj);
      toast(isNew ? 'Añadido al calendario' : 'Guardado');
    },
    onDelete: isNew ? null : () => { state.events = state.events.filter(x => x.id !== ev.id); },
  });
}

function openTaskForm(t, preset = {}) {
  const isNew = !t;
  t = t || { title: '', cat: preset.cat || 'uni', kind: 'tarea', due: preset.due || '', priority: 0, notes: '', done: false };
  openModal({
    title: isNew ? 'Nueva tarea' : 'Editar tarea',
    body: `
      ${field('Qué hay que hacer', `<input type="text" name="title" value="${esc(t.title)}" placeholder="p. ej. Ejercicios del tema 8" required>`)}
      ${segSimple('Tipo', 'kind', TASK_KINDS, t.kind || 'tarea')}
      ${segCats('cat', t.cat)}
      <div class="field-row">${field('Fecha límite', `<input type="date" name="due" value="${esc(t.due)}">`)}
        ${field('Prioridad', `<select name="priority"><option value="0" ${!t.priority ? 'selected' : ''}>Normal</option><option value="1" ${t.priority ? 'selected' : ''}>Importante (!)</option></select>`)}</div>
      ${field('Notas', `<textarea name="notes" placeholder="Páginas, enunciado, enlaces…">${esc(t.notes)}</textarea>`)}`,
    onSave: d => {
      const obj = { id: t.id || uid(), title: d.title, kind: d.kind, cat: d.cat, due: d.due, priority: Number(d.priority), notes: d.notes, done: t.done, doneAt: t.doneAt };
      if (isNew) state.tasks.push(obj); else Object.assign(t, obj);
      toast(isNew ? 'Tarea añadida' : 'Tarea guardada');
    },
    onDelete: isNew ? null : () => { state.tasks = state.tasks.filter(x => x.id !== t.id); },
  });
}

function openProjectForm(p) {
  const isNew = !p;
  p = p || { title: '', due: '', desc: '', milestones: [] };
  openModal({
    title: isNew ? 'Nuevo proyecto del máster' : 'Editar proyecto',
    body: `
      ${field('Nombre', `<input type="text" name="title" value="${esc(p.title)}" placeholder="p. ej. TFM" required>`)}
      ${field('Entrega final', `<input type="date" name="due" value="${esc(p.due)}">`)}
      ${field('Descripción', `<textarea name="desc" placeholder="Tutor, grupo, enunciado…">${esc(p.desc)}</textarea>`)}
      ${!isNew && p.milestones.length ? `<div class="field"><span>Hitos (desmarca para eliminar)</span>${p.milestones.map(m =>
        `<label class="milestone"><input type="checkbox" name="keep" value="${m.id}" checked> <span class="mt">${esc(m.title)}</span><span class="mdate">${m.date ? esc(fmtShort(m.date)) : ''}</span></label>`).join('')}</div>` : ''}
      ${isNew ? '<p class="hint">Después podrás añadir hitos con fecha (análisis, anteproyecto, entrega…) desde la tarjeta del proyecto.</p>' : ''}`,
    onSave: (d, fd) => {
      if (isNew) {
        state.master.projects.push({ id: uid(), title: d.title, due: d.due, desc: d.desc, milestones: d.due ? [{ id: uid(), title: 'Entrega final', date: d.due, done: false }] : [] });
        toast('Proyecto creado');
      } else {
        const keep = new Set(fd.getAll('keep'));
        Object.assign(p, { title: d.title, due: d.due, desc: d.desc, milestones: p.milestones.filter(m => keep.has(m.id)) });
        toast('Proyecto guardado');
      }
    },
    onDelete: isNew ? null : () => { state.master.projects = state.master.projects.filter(x => x.id !== p.id); },
  });
}

function openNoteForm(n) {
  const isNew = !n;
  n = n || { title: '', body: '', pinned: false };
  openModal({
    title: isNew ? 'Nueva nota' : 'Nota',
    body: `
      ${field('Título', `<input type="text" name="title" value="${esc(n.title)}" placeholder="p. ej. Tutorías" required>`)}
      ${field('Contenido', `<textarea name="body" rows="8">${esc(n.body)}</textarea>`)}
      <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="pinned" ${n.pinned ? 'checked' : ''}> Fijar arriba</label>`,
    onSave: d => {
      const obj = { id: n.id || uid(), title: d.title, body: d.body, pinned: !!d.pinned };
      if (isNew) state.master.notes.push(obj); else Object.assign(n, obj);
    },
    onDelete: isNew ? null : () => { state.master.notes = state.master.notes.filter(x => x.id !== n.id); },
  });
}

function openLinkForm(l) {
  const isNew = !l;
  l = l || { title: '', url: '' };
  openModal({
    title: isNew ? 'Nuevo enlace' : 'Editar enlace',
    body: `${field('Nombre', `<input type="text" name="title" value="${esc(l.title)}" placeholder="p. ej. Campus virtual">`)}
      ${field('Dirección', `<input type="url" name="url" value="${esc(l.url)}" placeholder="https://…" inputmode="url" required>`)}`,
    onSave: d => {
      const obj = { id: l.id || uid(), title: d.title, url: safeUrl(d.url) };
      if (isNew) state.master.links.push(obj); else Object.assign(l, obj);
    },
    onDelete: isNew ? null : () => { state.master.links = state.master.links.filter(x => x.id !== l.id); },
  });
}

function openMilestone(m, p) {
  openModal({
    title: 'Hito del proyecto',
    body: `<p class="hint">${esc(p.title)}</p>
      ${field('Hito', `<input type="text" name="title" value="${esc(m.title)}" required>`)}
      ${field('Fecha', `<input type="date" name="date" value="${esc(m.date)}">`)}
      <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="done" ${m.done ? 'checked' : ''}> Completado</label>`,
    onSave: d => { Object.assign(m, { title: d.title, date: d.date, done: !!d.done }); },
    onDelete: () => { p.milestones = p.milestones.filter(x => x.id !== m.id); },
  });
}

function openChooser(preset = {}) {
  const opts = ui.view === 'master'
    ? [['project', 'Proyecto del máster', 'Con hitos y fecha final'], ['note', 'Nota importante', 'Tutorías, criterios, formatos…'], ['link', 'Enlace', 'Campus, drive, bibliografía'], ['event', 'Entrega del máster', 'Aparece en el calendario']]
    : [['event', 'Entrega, examen o evento', 'Un día concreto'], ['class', 'Horario fijo', 'Clases que se repiten cada semana'], ['task', 'Tarea o ejercicio', 'Para tu lista de tareas']];
  openModal({
    title: preset.date ? `Añadir · ${cap(fmt(preset.date, { weekday: 'long', day: 'numeric', month: 'short' }))}${preset.start ? ' ' + preset.start : ''}` : 'Añadir',
    noFoot: true,
    body: `<div class="menu-list">${opts.map(([k, t, s]) => `<button type="button" class="btn" data-choose="${k}"><span style="display:grid;text-align:left"><b style="font-weight:600">${t}</b><span style="color:var(--muted);font-size:13px">${s}</span></span></button>`).join('')}</div>`,
  });
  modalForm.querySelectorAll('[data-choose]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.choose;
    closeModal();
    const day = preset.date ? dayIdx(parseKey(preset.date)) : null;
    const end = preset.start ? `${pad(Math.min(23, Number(preset.start.slice(0, 2)) + 1))}:${preset.start.slice(3)}` : '';
    if (k === 'event') openEventForm(null, { date: preset.date, start: preset.start, end, cat: ui.view === 'master' ? 'master' : undefined });
    if (k === 'class') openClassForm(null, { day, start: preset.start, end: end || undefined });
    if (k === 'task') openTaskForm(null, { due: preset.date });
    if (k === 'project') openProjectForm();
    if (k === 'note') openNoteForm();
    if (k === 'link') openLinkForm();
  }));
}

function openMenu() {
  openModal({
    title: 'Ajustes',
    noFoot: true,
    body: `
      <div class="field"><span>Tema</span><div class="chips">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, n]) =>
        `<button type="button" class="chip ${ui.theme === v ? 'on' : ''}" data-theme-set="${v}">${n}</button>`).join('')}</div></div>
      ${FB_CONFIG ? `<div class="field"><span>Sincronizar móvil y ordenador</span><div id="syncBox">${syncBoxHTML()}</div></div>` : ''}
      <div class="field"><span>Copia de seguridad</span>
        <p class="hint">${FB_CONFIG ? 'Una copia en archivo, por si acaso.' : 'Los datos se guardan solo en este dispositivo y navegador. Exporta una copia de vez en cuando, o para pasarlos a otro dispositivo.'}</p>
        <div class="menu-list">
          <button type="button" class="btn" data-action="export">⤓ Exportar copia (.json)</button>
          <button type="button" class="btn" data-action="import">⤒ Importar copia</button>
        </div></div>
      <div class="field"><span>Datos</span><div class="menu-list">
        ${state.demo ? '<button type="button" class="btn" data-action="clear-demo">Quitar datos de ejemplo</button>' : '<button type="button" class="btn" data-action="load-demo">Ver datos de ejemplo</button>'}
        <button type="button" class="btn danger" data-action="wipe">Borrar todo</button></div></div>`,
  });
}

/* ---------------- Actions ---------------- */
let toastTimer;
function toast(msg, undo) {
  const el = $('#toast');
  el.innerHTML = esc(msg) + (undo ? ' <button type="button">Deshacer</button>' : '');
  if (undo) el.querySelector('button').onclick = () => { undo(); save(); render(); el.classList.remove('show'); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), undo ? 4500 : 2200);
}

function findOpen(spec) {
  const [kind, id] = spec.split(':');
  if (kind === 'class') return openClassForm(state.classes.find(x => x.id === id));
  if (kind === 'event') return openEventForm(state.events.find(x => x.id === id));
  if (kind === 'task') return openTaskForm(state.tasks.find(x => x.id === id));
  if (kind === 'project') return openProjectForm(state.master.projects.find(x => x.id === id));
  if (kind === 'note') return openNoteForm(state.master.notes.find(x => x.id === id));
  if (kind === 'link') return openLinkForm(state.master.links.find(x => x.id === id));
  if (kind === 'milestone') {
    for (const p of state.master.projects) { const m = p.milestones.find(x => x.id === id); if (m) return openMilestone(m, p); }
  }
}

function go(v) {
  ui.view = v; saveUI(); renderCal.scrolled = false;
  render(); window.scrollTo(0, 0);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `taller-copia-${todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Copia descargada');
}

document.addEventListener('click', e => {
  const t = e.target;
  const tab = t.closest('.tab'); if (tab) return go(tab.dataset.view);
  const gt = t.closest('[data-goto]'); if (gt) return go(gt.dataset.goto);

  const tg = t.closest('[data-toggle-task]');
  if (tg) {
    const task = state.tasks.find(x => x.id === tg.dataset.toggleTask);
    if (!task) return;
    task.done = !task.done; task.doneAt = task.done ? Date.now() : null;
    save(); render();
    const tid = task.id;
    if (task.done) toast('Tarea hecha ✓', () => { const x = state.tasks.find(y => y.id === tid); if (x) { x.done = false; x.doneAt = null; } });
    return;
  }
  const tm = t.closest('[data-toggle-ms]');
  if (tm) {
    const [pid, mid] = tm.dataset.toggleMs.split(':');
    const p = state.master.projects.find(x => x.id === pid); const m = p && p.milestones.find(x => x.id === mid);
    if (m) { m.done = !m.done; save(); render(); }
    return;
  }
  const op = t.closest('[data-open]'); if (op && !modal.open) return findOpen(op.dataset.open);

  const wk = t.closest('[data-week]');
  if (wk) {
    const n = Number(wk.dataset.week);
    ui.weekStart = n === 0 ? toKey(startOfWeek(new Date())) : toKey(addDays(parseKey(ui.weekStart), 7 * n));
    ui.selDay = n === 0 ? todayKey() : ui.weekStart;
    renderCal.scrolled = false; return render();
  }
  const sd = t.closest('[data-sel]'); if (sd) { ui.selDay = sd.dataset.sel; return render(); }
  const st = t.closest('[data-status]'); if (st) { ui.taskStatus = st.dataset.status; saveUI(); return render(); }
  const tc = t.closest('[data-tcat]'); if (tc) { ui.taskCat = tc.dataset.tcat; saveUI(); return render(); }
  const th = t.closest('[data-theme-set]');
  if (th) { ui.theme = th.dataset.themeSet; saveUI(); applyTheme(); modalForm.querySelectorAll('[data-theme-set]').forEach(b => b.classList.toggle('on', b === th)); return; }

  const col = t.closest('[data-col]');
  if (col && !t.closest('.ev')) {
    const rect = col.getBoundingClientRect();
    const mins = Math.floor(((e.clientY - rect.top) / HOUR_H * 60) / 30) * 30 + renderCal.minH * 60;
    return openChooser({ date: col.dataset.col, start: `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}` });
  }
  const slot = t.closest('[data-slot]'); if (slot && !t.closest('.pill')) return openChooser({ date: slot.dataset.slot });

  const ac = t.closest('[data-action]');
  if (!ac) return;
  const a = ac.dataset.action;
  if (a === 'new-class') openClassForm();
  else if (a === 'new-event') openEventForm(null, { date: ui.selDay });
  else if (a === 'new-on-day') openChooser({ date: ui.selDay });
  else if (a === 'new-project') openProjectForm();
  else if (a === 'new-note') openNoteForm();
  else if (a === 'new-link') openLinkForm();
  else if (a === 'clear-done') {
    const before = state.tasks;
    state.tasks = state.tasks.filter(x => !x.done || (ui.taskCat !== 'all' && x.cat !== ui.taskCat));
    save(); render(); toast('Tareas hechas borradas', () => { state.tasks = before; });
  }
  else if (a === 'rename-master') {
    openModal({ title: 'Nombre del máster', body: field('Nombre', `<input type="text" name="name" value="${esc(state.master.name)}" required>`),
      onSave: d => { state.master.name = d.name; } });
  }
  else if (a === 'sign-in') { if (sync.api) sync.api.signIn(); }
  else if (a === 'sign-out') {
    if (sync.api && confirm('¿Cerrar sesión? Los datos se quedan en este dispositivo, pero dejarán de sincronizarse.')) sync.api.signOut();
  }
  else if (a === 'export') exportData();
  else if (a === 'import') $('#importFile').click();
  else if (a === 'clear-demo') {
    if (modal.open) closeModal();
    const name = state.master.name;
    state = emptyState(); state.master.name = name === 'Máster en Arquitectura' ? 'Mi máster' : name;
    save(); render(); toast('Agenda vacía, ¡a por ello!');
  }
  else if (a === 'load-demo') {
    if (confirm('Esto sustituirá tus datos actuales por los de ejemplo' + (sync.user ? ', también en tus otros dispositivos' : '') + '. ¿Seguro? (Exporta una copia antes si quieres conservarlos)')) {
      state = demoState(); save(); closeModal(); render();
    }
  }
  else if (a === 'wipe') {
    if (confirm(sync.user ? '¿Borrar TODOS los datos? Se borrarán también en tus otros dispositivos sincronizados.' : '¿Borrar TODOS los datos de la app en este dispositivo?')) { state = emptyState(); save(); closeModal(); render(); toast('Datos borrados'); }
  }
});

document.addEventListener('submit', e => {
  const f = e.target;
  if (f.id === 'quickAdd') {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    if (!d.title.trim()) return;
    state.tasks.push({ id: uid(), title: d.title.trim(), cat: d.cat, kind: 'tarea', due: d.due, priority: 0, notes: '', done: false });
    save(); render(); $('#quickAdd input[name="title"]').focus(); toast('Tarea añadida');
  }
  if (f.dataset.addMs) {
    e.preventDefault();
    const p = state.master.projects.find(x => x.id === f.dataset.addMs);
    const d = Object.fromEntries(new FormData(f));
    if (!p || !d.title.trim()) return;
    p.milestones.push({ id: uid(), title: d.title.trim(), date: d.date, done: false });
    save(); render();
  }
});

$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || typeof data !== 'object' || !('tasks' in data || 'classes' in data)) throw new Error('formato');
    if (!confirm('Importar esta copia sustituirá los datos actuales. ¿Continuar?')) return;
    state = normalize(data); state.demo = false; save(); closeModal(); render(); toast('Copia importada');
  } catch (err) { toast('Ese archivo no es una copia válida de Taller'); }
});

$('#menuBtn').addEventListener('click', openMenu);
$('#syncBtn').addEventListener('click', openMenu);
$('#fab').addEventListener('click', () => {
  if (ui.view === 'tareas') return openTaskForm(null, { cat: ui.taskCat !== 'all' ? ui.taskCat : undefined });
  openChooser(ui.view === 'calendario' ? { date: ui.selDay } : {});
});

// refresca la vista al volver a la app (p. ej. al día siguiente)
document.addEventListener('visibilitychange', () => { if (!document.hidden && !modal.open) render(); });
setInterval(() => { if (!document.hidden && !modal.open && (ui.view === 'hoy' || ui.view === 'calendario')) render(); }, 60000);

applyTheme();
render();
syncStatusChanged(sync.status, null);
startSync();
try { if (!localStorage.getItem(STORE_KEY)) save(); } catch (e) {}

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
})();
