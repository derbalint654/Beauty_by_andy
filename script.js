/* =========================================================
   Beauty by Andi – bemutató oldal
   Sima JavaScript, szerver nélkül.
   ========================================================= */

/* ---------------------------------------------------------
   BEÁLLÍTÁSOK – ezeket nyugodtan át lehet írni
   --------------------------------------------------------- */
const CONFIG = {
  // Munkanapok: 0 = vasárnap, 1 = hétfő, … 6 = szombat.
  // Andi hétköznap és szombaton dolgozik, ezért a vasárnap (0) nincs benne.
  workDays: [1, 2, 3, 4, 5, 6],

  // A napi MINTA-időpontok (bemutató). Ide jönnek majd a valódi kezdési időpontok.
  slots: ['9:00', '10:30', '12:00', '13:30', '15:00', '16:30'],

  // Ekkora eséllyel jelenik meg egy időpont „foglaltként” (0 = mind szabad, 1 = mind foglalt).
  // Napról napra mindig ugyanazok a foglaltak, hogy élethű legyen.
  bookedChance: 0.35,

  // Hány hónapra előre lehet lapozni a naptárban.
  monthsAhead: 3,

  // Az üzenetküldés címei (Instagram DM és Facebook Messenger).
  instagramDM: 'https://ig.me/m/_andrasandrea.lashbrow_',
  messenger: 'https://m.me/100083006101030',
};

// A kezelések (a foglaló csempékhez és a teszthez).
const TREATMENTS = [
  { id: 'lifting',   n: '01', name: 'Szempilla lifting',        img: 'kepek/szempilla-lifting-2-utana.jpg', anchor: '#k-01' },
  { id: 'koreai',    n: '02', name: 'Koreai lifting',           img: 'kepek/szempilla-lifting-3-utana.jpg', anchor: '#k-02' },
  { id: 'laminalas', n: '03', name: 'Szemöldök laminálás',      img: 'kepek/szemoldok-laminalas-1-utana.jpg', anchor: '#k-03' },
  { id: 'airbrush',  n: '04', name: 'Airbrush szemöldökfestés', img: 'kepek/szemoldok-festes-1-utana.jpg', anchor: '#k-04' },
];

// „Melyik kezelés illik hozzád?” – válaszok → javasolt kezelés(ek).
// Kulcs: "<mit emelnél ki>|<milyen hatás>". Andi igény szerint átírhatja.
const QUIZ_MAP = {
  'pilla|termeszetes':     ['lifting'],
  'pilla|hangsulyos':      ['koreai'],
  'szemoldok|termeszetes': ['laminalas'],
  'szemoldok|hangsulyos':  ['airbrush'],
  'mindketto|termeszetes': ['lifting', 'laminalas'],
  'mindketto|hangsulyos':  ['koreai', 'airbrush'],
};

/* --------------------------------------------------------- */

document.documentElement.classList.add('js');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const byId = (id) => TREATMENTS.find((t) => t.id === id);

/* ===== Értesítés (toast) ===== */
const toastEl = $('#toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 4200);
}

/* ===== Előtte–utána csúszka ===== */
function initCompare(el) {
  const handle = $('.ba__handle', el);
  const labelBefore = $('.ba__label--before', el);
  const labelAfter = $('.ba__label--after', el);
  let pos = 50;
  let introRunning = false;

  function set(p) {
    pos = clamp(p, 0, 100);
    el.style.setProperty('--pos', pos + '%');
    const r = Math.round(pos);
    handle.setAttribute('aria-valuenow', r);
    handle.setAttribute('aria-valuetext', `${r}% előtte, ${100 - r}% utána`);
    if (labelBefore) labelBefore.style.opacity = pos < 14 ? 0 : 1;
    if (labelAfter) labelAfter.style.opacity = pos > 86 ? 0 : 1;
  }
  const fromEvent = (e) => {
    const rect = el.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * 100;
  };

  // Egér és érintés (Pointer Events). Érintésnél csak vízszintes húzásra reagál,
  // így a függőleges görgetés nem akad el.
  let drag = null;
  const capture = (id) => { try { el.setPointerCapture(id); } catch (_) { /* nincs aktív mutató */ } };
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    introRunning = false;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, active: e.pointerType === 'mouse', moved: false };
    if (drag.active) {
      capture(e.pointerId);
      el.classList.add('is-dragging');
      set(fromEvent(e));
      e.preventDefault();
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.active) {
      const dx = Math.abs(e.clientX - drag.x);
      const dy = Math.abs(e.clientY - drag.y);
      if (dx > 6 && dx > dy) {
        drag.active = true;
        capture(e.pointerId);
        el.classList.add('is-dragging');
      } else if (dy > 10) {
        drag = null; // görgetés
        return;
      } else return;
    }
    drag.moved = true;
    set(fromEvent(e));
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    // érintéses koppintás: oda ugrik a csúszka
    if (e.type === 'pointerup' && !drag.active && !drag.moved) set(fromEvent(e));
    drag = null;
    el.classList.remove('is-dragging');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  // Billentyűzet
  handle.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 5;
    const keys = {
      ArrowLeft: pos - step, ArrowDown: pos - step,
      ArrowRight: pos + step, ArrowUp: pos + step,
      PageDown: pos - 20, PageUp: pos + 20,
      Home: 0, End: 100,
    };
    if (e.key in keys) {
      e.preventDefault();
      introRunning = false;
      set(keys[e.key]);
    }
  });

  set(50);

  // Nyitóképen egy finom „átvarázsolás”, hogy látszódjon: húzható
  if (el.hasAttribute('data-intro') && !reduceMotion) {
    introRunning = true;
    const frames = [[0, 50], [700, 50], [1500, 88], [2600, 22], [3500, 50]];
    const t0 = performance.now();
    const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    (function tick(now) {
      if (!introRunning) return;
      const t = now - t0;
      for (let i = 1; i < frames.length; i++) {
        const [ta, pa] = frames[i - 1];
        const [tb, pb] = frames[i];
        if (t <= tb) {
          set(pa + (pb - pa) * ease((t - ta) / (tb - ta)));
          return requestAnimationFrame(tick);
        }
      }
      set(50);
      introRunning = false;
    })(t0);
  }
}
$$('.ba').forEach(initCompare);

/* ===== Görgetéses megjelenés ===== */
const revealTargets = $$('.reveal, .reveal-img, .feature');
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('is-in'));
}

/* ===== Időpontfoglalás ===== */
const booking = $('#foglalas');
const state = {
  step: 1,
  treatment: null,
  date: null,     // Date (éjfél)
  time: null,     // '13:30'
  view: null,     // { y, m } – a megjelenített hónap
};

const fmtDate = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
const fmtWeekday = new Intl.DateTimeFormat('hu-HU', { weekday: 'long' });
const fmtMonth = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long' });
const longDate = (d) => `${fmtDate.format(d)} (${fmtWeekday.format(d)})`;
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function today() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
function lastBookableDay() {
  const t = today();
  return new Date(t.getFullYear(), t.getMonth() + CONFIG.monthsAhead + 1, 0);
}

// Egyszerű, determinisztikus „véletlen” – ugyanarra a napra mindig ugyanazt adja.
function pseudoRandom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// Egy nap időpontjai: { time, free }
function slotsFor(date) {
  const now = new Date();
  const isToday = dayKey(date) === dayKey(now);
  const list = CONFIG.slots.map((time) => {
    const [h, m] = time.split(':').map(Number);
    const passed = isToday && (h * 60 + m) <= (now.getHours() * 60 + now.getMinutes() + 60);
    const booked = pseudoRandom(dayKey(date) + '|' + time) < CONFIG.bookedChance;
    return { time, free: !passed && !booked, passed };
  });
  // Mindig maradjon legalább egy szabad (ha még nem múlt el)
  if (!list.some((s) => s.free)) {
    const open = list.find((s) => !s.passed);
    if (open) open.free = true;
  }
  return list;
}

function isBookable(date) {
  if (date < today() || date > lastBookableDay()) return false;
  if (!CONFIG.workDays.includes(date.getDay())) return false;
  return slotsFor(date).some((s) => s.free);
}

/* --- Lépésváltás --- */
const panels = $$('.panel', booking);
const stepItems = $$('#stepper li');

function canReach(step) {
  if (step <= 1) return true;
  if (step === 2) return !!state.treatment;
  if (step === 3) return !!state.treatment && !!state.date;
  if (step === 4) return !!state.treatment && !!state.date && !!state.time;
  return false;
}

function goTo(step, { focus = true } = {}) {
  if (!canReach(step)) return;
  state.step = step;
  panels.forEach((p) => { p.hidden = Number(p.dataset.step) !== step; });
  stepItems.forEach((li, i) => {
    const n = i + 1;
    const btn = $('button', li);
    li.classList.toggle('is-current', n === step);
    li.classList.toggle('is-done', n < step || (n !== step && canReach(n + 1)));
    btn.disabled = !canReach(n);
    if (n === step) btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
    btn.setAttribute('aria-label', `${n}. lépés: ${$('.stepper__t', li).textContent}${n === step ? ' (jelenlegi)' : ''}`);
  });

  if (step === 2) renderCalendar();
  if (step === 3) renderSlots();
  if (step === 4) renderSummary();

  if (focus) {
    const stepper = $('#stepper');
    const top = stepper.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.6) {
      stepper.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
    const title = $(`.panel[data-step="${step}"] .panel__title`, booking);
    title && title.focus({ preventScroll: true });
  }
  updateNextButtons();
}

function updateNextButtons() {
  panels.forEach((p) => {
    const next = $('[data-next]', p);
    if (next) next.disabled = !canReach(Number(p.dataset.step) + 1);
  });
}

booking.addEventListener('click', (e) => {
  const next = e.target.closest('[data-next]');
  const prev = e.target.closest('[data-prev]');
  const jump = e.target.closest('[data-goto]');
  if (next) goTo(state.step + 1);
  if (prev) goTo(state.step - 1);
  if (jump) goTo(Number(jump.dataset.goto));
});

// rövid szünet automatikus továbblépés előtt, hogy látszódjon a kijelölés
const advance = (to) => setTimeout(() => goTo(to), reduceMotion ? 0 : 320);

/* --- 1. lépés: kezelés-csempék --- */
const tilesEl = $('#tiles');
function renderTiles() {
  tilesEl.innerHTML = '';
  TREATMENTS.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.setAttribute('aria-pressed', String(state.treatment === t.id));
    b.innerHTML = `<img src="${t.img}" alt="" loading="lazy"><span class="tile__n" aria-hidden="true">${t.n}</span><span class="tile__t">${t.name}</span>`;
    b.addEventListener('click', () => {
      const changed = state.treatment !== t.id;
      state.treatment = t.id;
      $$('.tile', tilesEl).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (changed) {
        $('#sent').hidden = true;
        $('#details').hidden = false;
      }
      updateNextButtons();
      advance(2);
    });
    tilesEl.appendChild(b);
  });
}

function preselect(id) {
  if (!byId(id)) return;
  state.treatment = id;
  renderTiles();
  goTo(1, { focus: false });
}

/* --- 2. lépés: naptár --- */
const calGrid = $('#cal-grid');
const calMonth = $('#cal-month');
const calPrev = $('#cal-prev');
const calNext = $('#cal-next');

function renderCalendar() {
  const t = today();
  if (!state.view) {
    // az első hónap, amelyben van foglalható nap
    state.view = { y: t.getFullYear(), m: t.getMonth() };
    const last = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    let any = false;
    for (let d = new Date(t); d <= last; d.setDate(d.getDate() + 1)) if (isBookable(d)) { any = true; break; }
    if (!any) state.view.m += 1;
  }
  const first = new Date(state.view.y, state.view.m, 1);
  state.view = { y: first.getFullYear(), m: first.getMonth() };
  const daysInMonth = new Date(state.view.y, state.view.m + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // hétfővel kezdődik a hét

  calMonth.textContent = fmtMonth.format(first);
  calPrev.disabled = first <= new Date(t.getFullYear(), t.getMonth(), 1);
  const lastDay = lastBookableDay();
  calNext.disabled = new Date(state.view.y, state.view.m + 1, 1) > lastDay;

  calGrid.innerHTML = '';
  for (let i = 0; i < offset; i++) calGrid.appendChild(document.createElement('span'));

  let focusable = null;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(state.view.y, state.view.m, day);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cal__day';
    b.textContent = day;
    b.dataset.day = day;
    const ok = isBookable(date);
    const label = `${fmtDate.format(date).replace(/\.$/, '')}., ${fmtWeekday.format(date)}`;
    let note = '';
    if (date.getDay() === 0) { b.classList.add('is-sunday'); note = ' – zárva'; }
    else if (!ok && date >= t) note = ' – nincs szabad időpont';
    b.setAttribute('aria-label', label + note);
    b.disabled = !ok;
    if (dayKey(date) === dayKey(t)) { b.classList.add('is-today'); b.setAttribute('aria-current', 'date'); }
    const selected = state.date && dayKey(state.date) === dayKey(date);
    b.setAttribute('aria-pressed', String(!!selected));
    b.tabIndex = -1;
    if (ok && (selected || !focusable)) focusable = b;
    if (selected) focusable = b;
    b.addEventListener('click', () => {
      state.date = date;
      state.time = null;
      $$('.cal__day', calGrid).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      updateNextButtons();
      advance(3);
    });
    calGrid.appendChild(b);
  }
  if (focusable) focusable.tabIndex = 0;
}

// Nyilakkal mozgás a napok között (csak a választható napokon)
calGrid.addEventListener('keydown', (e) => {
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  if (!(e.key in moves) && e.key !== 'Home' && e.key !== 'End') return;
  const days = $$('.cal__day', calGrid);
  const cur = days.indexOf(document.activeElement);
  if (cur < 0) return;
  e.preventDefault();
  let target = null;
  if (e.key === 'Home') target = days.find((d) => !d.disabled);
  else if (e.key === 'End') target = [...days].reverse().find((d) => !d.disabled);
  else {
    const dir = moves[e.key];
    for (let i = cur + dir; i >= 0 && i < days.length; i += Math.sign(dir) * (Math.abs(dir) === 7 ? 7 : 1)) {
      if (!days[i].disabled) { target = days[i]; break; }
    }
  }
  if (target) {
    days.forEach((d) => (d.tabIndex = -1));
    target.tabIndex = 0;
    target.focus();
  }
});

calPrev.addEventListener('click', () => { state.view.m -= 1; renderCalendar(); });
calNext.addEventListener('click', () => { state.view.m += 1; renderCalendar(); });

/* --- 3. lépés: időpontok --- */
const slotsEl = $('#slots');
function renderSlots() {
  $('#slots-day').textContent = longDate(state.date);
  slotsEl.innerHTML = '';
  slotsFor(state.date).forEach(({ time, free, passed }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot';
    b.textContent = time;
    b.disabled = !free;
    if (!free) b.setAttribute('aria-label', `${time} – ${passed ? 'elmúlt' : 'foglalt'}`);
    b.setAttribute('aria-pressed', String(state.time === time));
    b.addEventListener('click', () => {
      state.time = time;
      $$('.slot', slotsEl).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      updateNextButtons();
      advance(4);
    });
    slotsEl.appendChild(b);
  });
}

/* --- 4. lépés: adatok, összefoglaló, üzenet --- */
function renderSummary() {
  $('#sum-t').textContent = byId(state.treatment).name;
  $('#sum-d').textContent = longDate(state.date);
  $('#sum-h').textContent = state.time;
  $('#details').hidden = false;
  $('#sent').hidden = true;
}

function buildMessage(name, phone) {
  return `Szia Andi! Szeretnék időpontot foglalni: ${byId(state.treatment).name}, ${longDate(state.date)} ${state.time}. Név: ${name}, Tel.: ${phone}`;
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* tovább a tartalék megoldásra */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

function validateField(input, errEl, ok) {
  input.setAttribute('aria-invalid', String(!ok));
  if (ok) input.removeAttribute('aria-describedby');
  else input.setAttribute('aria-describedby', errEl.id);
  errEl.hidden = ok;
  return ok;
}

$('#details').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameEl = $('#f-name');
  const phoneEl = $('#f-phone');
  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const okName = validateField(nameEl, $('#f-name-err'), name.length >= 2);
  const okPhone = validateField(phoneEl, $('#f-phone-err'), phone.replace(/\D/g, '').length >= 7);
  if (!okName) return nameEl.focus();
  if (!okPhone) return phoneEl.focus();

  const msg = buildMessage(name, phone);
  $('#sent-msg').value = msg;
  $('#details').hidden = true;
  $('#sent').hidden = false;
  const copied = await copyText(msg);
  toast(copied ? 'Az üzenet a vágólapon, csak illeszd be!' : 'Nem sikerült másolni – jelöld ki és másold ki az üzenetet.');
  if (copied) $('#open-ig').focus({ preventScroll: true });
  else $('#sent-msg').select();
});

$('#copy-again').addEventListener('click', async () => {
  const copied = await copyText($('#sent-msg').value);
  toast(copied ? 'Az üzenet a vágólapon, csak illeszd be!' : 'Nem sikerült másolni – jelöld ki és másold ki az üzenetet.');
});

$('#open-ig').href = CONFIG.instagramDM;
$('#open-fb').href = CONFIG.messenger;

// „Ezt választom” linkek a kezelés-oldalakon
$$('[data-book]').forEach((a) => a.addEventListener('click', () => preselect(a.dataset.book)));

renderTiles();
goTo(1, { focus: false });

/* ===== Teszt: Melyik kezelés illik hozzád? ===== */
const quizForm = $('#quiz-form');
const quizResult = $('#quiz-result');
let quizPicks = [];
quizForm.addEventListener('change', () => {
  const focus = quizForm.elements.focus.value;
  const effect = quizForm.elements.effect.value;
  if (!focus || !effect) return;
  quizPicks = QUIZ_MAP[`${focus}|${effect}`] || [];
  $('#quiz-picks').innerHTML = quizPicks
    .map((id) => byId(id))
    .map((t) => `<li><a href="${t.anchor}"><small>${t.n}</small>${t.name}</a></li>`)
    .join('');
  const wasHidden = quizResult.hidden;
  quizResult.hidden = false;
  if (wasHidden) quizResult.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
});
$('#quiz-book').addEventListener('click', () => {
  if (quizPicks[0]) preselect(quizPicks[0]);
});

/* ===== Filmszalag nyilak ===== */
const track = $('#strip-track');
const stripStep = (dir) => {
  const frame = $('.frame', track);
  const w = frame ? frame.getBoundingClientRect().width + 14 : 300;
  track.scrollBy({ left: dir * w, behavior: reduceMotion ? 'auto' : 'smooth' });
};
$('#strip-prev').addEventListener('click', () => stripStep(-1));
$('#strip-next').addEventListener('click', () => stripStep(1));
track.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); stripStep(1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); stripStep(-1); }
});

/* ===== Lebegő „Időpont” gomb (mobilon) ===== */
const floatCta = $('#float-cta');
if ('IntersectionObserver' in window) {
  const seen = new Map();
  const update = () => {
    const show = !seen.get('hero') && !seen.get('booking');
    floatCta.classList.toggle('is-visible', show);
  };
  const ob = new IntersectionObserver((entries) => {
    entries.forEach((en) => seen.set(en.target === booking ? 'booking' : 'hero', en.isIntersecting));
    update();
  });
  ob.observe($('.hero'));
  ob.observe(booking);
}
