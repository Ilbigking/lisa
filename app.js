/* ---------- Config ---------- */
const ONESIGNAL_APP_ID = '8bdecce3-a71c-4b3d-98ce-ad06517eb468';
const KEY = 'fortnight.v1'; // unchanged on purpose so existing tasks survive the rename
const BASE = { School: '#4f8cff', Personal: '#a066ff', Urgent: '#ff5a6a', Fun: '#ffa733' };
const VIBES = ['⭐', '🔥', '🌿', '🎉', '💤'];
const SWATCHES = ['#7c5cff', '#ff6fb1', '#4f8cff', '#22c55e', '#ffa733', '#ef4444'];
const EMPTY = ['Nothing planned. Enjoy the breathing room ✨', 'A free day! Maybe plan something fun? 🎈', 'Clear skies ahead ☀️', 'Blank canvas. Add a tiny win? 🌱'];

/* ---------- Helpers & storage ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const next14 = () => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
const norm = j => ({ tasks: Array.isArray(j && j.tasks) ? j.tasks : [], notified: (j && j.notified) || {}, cats: (j && j.cats) || {}, theme: (j && j.theme) || '#7c5cff', view: (j && j.view) === 'grid' ? 'grid' : 'list' });
let db; try { db = norm(JSON.parse(localStorage.getItem(KEY))); } catch (e) { db = norm(null); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
const cats = () => ({ ...BASE, ...db.cats });
const dayLabel = (d, i) => i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long' });

/* ---------- Theme & layout ---------- */
function applyTheme(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = d ? (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) : 0;
  h = Math.round((h * 60 + 360) % 360);
  const s = document.documentElement.style;
  s.setProperty('--a1', hex); s.setProperty('--a2', `hsl(${(h + 45) % 360} 90% 66%)`);
  s.setProperty('--bg', `hsl(${h} 30% 8%)`); s.setProperty('--card', `hsl(${h} 26% 15%)`); s.setProperty('--card2', `hsl(${h} 24% 21%)`);
  $('meta[name=theme-color]').content = `hsl(${h} 30% 8%)`;
}
const setTheme = c => { db.theme = c; save(); applyTheme(c); $('#themeColor').value = c; };
function applyView() {
  $('#days').className = $('#app').className = db.view;
  $('#viewBtn').textContent = db.view === 'list' ? '▦' : '☰';
  $$('#viewSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === db.view));
}
const setView = v => { db.view = v; save(); applyView(); };

/* ---------- Rendering ---------- */
const taskHTML = t => `<div class="task ${t.done ? 'done' : ''}" data-id="${t.id}" style="--c:${cats()[t.cat] || '#a066ff'}">
  <button class="check" aria-label="Toggle done"></button>
  <div class="body"><span class="title">${esc(t.title)}</span><small>${t.time ? t.time + ' · ' : ''}${esc(t.cat)}</small>${t.desc ? `<span class="desc">${esc(t.desc)}</span>` : ''}</div>
  <span class="vibe">${t.vibe}</span><button class="del" aria-label="Delete">✕</button></div>`;

function render() {
  $('#days').innerHTML = next14().map((d, i) => {
    const k = iso(d);
    const ts = db.tasks.filter(t => t.date === k).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    const done = ts.filter(t => t.done).length, pct = ts.length ? done / ts.length : 0;
    return `<article class="day ${i === 0 ? 'today' : ''}" style="--i:${i}" data-d="${k}">
      <div class="day-head"><div><h2>${dayLabel(d, i)}</h2><small>${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div>
        <svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15"/><circle class="fg" cx="18" cy="18" r="15" style="stroke-dashoffset:${94.25 * (1 - pct)}"/><text x="18" y="21" text-anchor="middle">${ts.length ? done + '/' + ts.length : '–'}</text></svg>
        <button class="add" data-add="${k}" aria-label="Add task">+</button></div>
      ${ts.length ? ts.map(taskHTML).join('') : `<p class="empty">${EMPTY[i % 4]}</p>`}</article>`;
  }).join('');
}

function renderArchive() {
  const today = iso(new Date()), by = {};
  db.tasks.filter(t => t.done || t.date < today).sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || '')).forEach(t => (by[t.date] = by[t.date] || []).push(t));
  const keys = Object.keys(by);
  $('#arcList').innerHTML = keys.length ? keys.map(k => `<p class="sec">${new Date(k + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>` + by[k].map(taskHTML).join('')).join('')
    : '<p class="empty">Nothing here yet. Finished and past tasks will land here 📦</p>';
}
const refresh = () => { render(); if ($('#arcSheet').classList.contains('open')) renderArchive(); };

function updateRing(el) {
  const ts = db.tasks.filter(t => t.date === el.dataset.d), n = ts.filter(t => t.done).length;
  el.querySelector('.fg').style.strokeDashoffset = 94.25 * (1 - (ts.length ? n / ts.length : 0));
  el.querySelector('text').textContent = ts.length ? `${n}/${ts.length}` : '–';
  return ts.length > 0 && n === ts.length;
}

function confetti(x, y) {
  const colors = Object.values(BASE).concat('#4ade80', '#ff6fb1');
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('i'); s.className = 'confetti';
    s.style.cssText = `left:${x}px;top:${y}px;--dx:${(Math.random() - .5) * 300}px;--dy:${-80 - Math.random() * 200}px;--r:${Math.random() * 720}deg;background:${colors[i % 6]}`;
    document.body.appendChild(s); setTimeout(() => s.remove(), 1000);
  }
}

/* ---------- Interactions ---------- */
function onTask(e) {
  const add = e.target.closest('[data-add]'); if (add) return openAdd(add.dataset.add);
  const el = e.target.closest('.task'); if (!el) return;
  const t = db.tasks.find(x => x.id === el.dataset.id); if (!t) return;
  if (e.target.closest('.del')) {
    el.classList.add('out');
    return setTimeout(() => { db.tasks = db.tasks.filter(x => x !== t); save(); refresh(); }, 250);
  }
  if (e.target.closest('.check')) {
    t.done = !t.done; save(); el.classList.toggle('done', t.done);
    const day = el.closest('.day'), complete = day && updateRing(day);
    if (!day) render();
    if (t.done) {
      const c = el.querySelector('.check'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
      const r = c.getBoundingClientRect(); if (complete) confetti(r.left + 14, r.top + 14);
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }
}
$('#days').addEventListener('click', onTask);
$('#arcList').addEventListener('click', onTask);

const sel = (id, v) => $$(`#${id} .chip`).forEach(x => x.classList.toggle('on', x.dataset.v === v));
const pick = id => $(`#${id} .on`)?.dataset.v;
function buildCats() {
  $('#fCats').innerHTML = Object.entries(cats()).map(([c, col]) => `<button type="button" class="chip" data-v="${esc(c)}" style="--c:${col}">${esc(c)}</button>`).join('') + '<button type="button" class="chip" id="plusCat">＋ New</button>';
}
function buildCatList() {
  $('#catList').innerHTML = Object.entries(cats()).map(([c, col]) => `<span class="chip on" style="--c:${col}">${esc(c)}${BASE[c] ? '' : `<b class="x" data-del="${esc(c)}">✕</b>`}</span>`).join('') + '<small>Add new ones from the “New task” screen.</small>';
}
$('#fVibes').innerHTML = VIBES.map(v => `<button type="button" class="chip" data-v="${v}">${v}</button>`).join('');
document.addEventListener('click', e => {
  const c = e.target.closest('#fCats .chip, #fVibes .chip'); if (!c) return;
  if (c.id === 'plusCat') { $('#newCat').hidden = !$('#newCat').hidden; return; }
  sel(c.parentNode.id, c.dataset.v);
});
$('#ncAdd').onclick = () => {
  const n = $('#ncName').value.trim().slice(0, 16); if (!n) return;
  if (!cats()[n]) db.cats[n] = $('#ncColor').value;
  save(); buildCats(); sel('fCats', n); $('#ncName').value = ''; $('#newCat').hidden = true;
};
$('#catList').addEventListener('click', e => {
  const d = e.target.closest('[data-del]'); if (!d) return;
  delete db.cats[d.dataset.del]; save(); buildCatList(); render();
});

function openAdd(dateKey) {
  $('#fDate').innerHTML = next14().map((d, i) => `<option value="${iso(d)}">${dayLabel(d, i)} · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</option>`).join('');
  $('#fDate').value = dateKey || iso(new Date());
  $('#fTitle').value = ''; $('#fDesc').value = ''; $('#fTime').value = ''; $('#newCat').hidden = true;
  buildCats(); sel('fCats', 'Personal'); sel('fVibes', '⭐');
  $('#addSheet').classList.add('open'); $('#fTitle').focus();
}
const closeAll = () => $$('.sheet').forEach(s => s.classList.remove('open'));
$$('.sheet').forEach(s => s.addEventListener('click', e => { if (e.target === s) closeAll(); }));
$$('.close').forEach(b => b.onclick = closeAll);
$('#fab').onclick = () => openAdd();
$('#arcBtn').onclick = () => { renderArchive(); $('#arcSheet').classList.add('open'); };
$('#viewBtn').onclick = () => setView(db.view === 'list' ? 'grid' : 'list');
$$('#viewSeg button').forEach(b => b.onclick = () => setView(b.dataset.v));
$('#openSettings').onclick = () => { buildCatList(); refreshBanner(); applyView(); $('#themeColor').value = db.theme; $('#setSheet').classList.add('open'); };
$('#swatches').innerHTML = SWATCHES.map(c => `<button class="sw" data-c="${c}" style="background:${c}" aria-label="Theme ${c}"></button>`).join('');
$('#swatches').addEventListener('click', e => { const s = e.target.closest('.sw'); if (s) setTheme(s.dataset.c); });
$('#themeColor').oninput = e => setTheme(e.target.value);

$('#addForm').onsubmit = e => {
  e.preventDefault();
  db.tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: $('#fTitle').value.trim(), desc: $('#fDesc').value.trim(), date: $('#fDate').value, time: $('#fTime').value, cat: pick('fCats') || 'Personal', vibe: pick('fVibes') || '⭐', done: false });
  save(); render(); closeAll(); checkDue();
};

/* ---------- Backup ---------- */
$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
  a.download = 'lisas-planner-backup.json'; a.click();
};
$('#import').onchange = async e => {
  try {
    const j = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(j.tasks)) throw 0;
    db = norm(j); save(); applyTheme(db.theme); applyView(); render(); closeAll();
  } catch (_) { alert("That file doesn't look like a valid backup."); }
  e.target.value = '';
};

/* ---------- Notifications ---------- */
async function notify(title, body) {
  const reg = await navigator.serviceWorker?.ready;
  if (reg) reg.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: './' } });
  else new Notification(title, { body });
}

// LOCAL reminders: only fire while the app is open/active (iOS suspends JS when locked).
function checkDue() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), k = iso(now);
  db.tasks.forEach(t => {
    if (t.date !== k || !t.time || t.done || db.notified[t.id]) return;
    const diff = (now - new Date(`${k}T${t.time}`)) / 60000;
    if (diff >= 0 && diff < 60) { db.notified[t.id] = 1; notify(`${t.vibe} ${t.title}`, `Due ${t.time} · ${t.cat}`); }
  });
  save();
}

function refreshBanner() {
  const ok = 'Notification' in window, p = ok && Notification.permission;
  $('#notifState').textContent = !ok ? 'Add to Home Screen first' : p === 'granted' ? 'On ✓' : p === 'denied' ? 'Blocked in iOS Settings' : 'Off';
  $$('.enNotif').forEach(x => x.hidden = !ok || p !== 'default');
  $('#notifBanner').hidden = ok && p !== 'default';
  if (!ok) $('#notifBanner span').textContent = '📲 Add to Home Screen to enable reminders';
}

// requestPermission must run directly inside a tap handler on iOS.
$$('.enNotif').forEach(b => b.onclick = async () => {
  const p = await Notification.requestPermission();
  if (p === 'granted') {
    notify('Notifications on 🎉', "You'll get reminders for timed tasks.");
    window.OneSignalDeferred?.push(OS => OS.User.PushSubscription.optIn());
  }
  refreshBanner();
});
$('#testNotif').onclick = () => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return alert('Enable notifications first.');
  notify('Test notification 🔔', 'It works!');
};

// OneSignal: index.html already loads the SDK, so only add the script if it is missing.
function initOneSignal() {
  if (!ONESIGNAL_APP_ID) return;
  if (!document.querySelector('script[src*="OneSignalSDK.page"]')) {
    const s = document.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'; s.defer = true; document.head.appendChild(s);
  }
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(OS => OS.init({ appId: ONESIGNAL_APP_ID, serviceWorkerPath: 'sw.js', serviceWorkerParam: { scope: location.pathname.replace(/[^/]*$/, '') } }));
}

/* ---------- Boot ---------- */
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
const h = new Date().getHours();
$('#hello').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', Lisa ✨';
applyTheme(db.theme); applyView(); render(); refreshBanner(); initOneSignal();
setInterval(checkDue, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); checkDue(); } });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
