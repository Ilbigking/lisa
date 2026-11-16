/* ---------- Config ---------- */
const ONESIGNAL_APP_ID = ''; // optional: paste your OneSignal App ID for background push (see instructions)
const KEY = 'fortnight.v1';
const CATS = { School: '#4f8cff', Personal: '#a066ff', Urgent: '#ff5a6a', Fun: '#ffa733' };
const VIBES = ['⭐', '🔥', '🌿', '🎉', '💤'];
const EMPTY = ['Nothing planned. Enjoy the breathing room ✨', 'A free day! Maybe plan something fun? 🎈', 'Clear skies ahead ☀️', 'Blank canvas. Add a tiny win? 🌱'];

/* ---------- Helpers & storage ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const next14 = () => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
let db; try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
db = db && Array.isArray(db.tasks) ? db : { tasks: [], notified: {} };
db.notified = db.notified || {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
const dayLabel = (d, i) => i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long' });

/* ---------- Rendering ---------- */
const taskHTML = t => `<div class="task ${t.done ? 'done' : ''}" data-id="${t.id}" style="--c:${CATS[t.cat] || '#a066ff'}">
  <button class="check" aria-label="Toggle done"></button>
  <div class="body"><span class="title">${esc(t.title)}</span><small>${t.time ? t.time + ' · ' : ''}${esc(t.cat)}</small></div>
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

function updateRing(el) {
  const ts = db.tasks.filter(t => t.date === el.dataset.d), n = ts.filter(t => t.done).length;
  el.querySelector('.fg').style.strokeDashoffset = 94.25 * (1 - (ts.length ? n / ts.length : 0));
  el.querySelector('text').textContent = ts.length ? `${n}/${ts.length}` : '–';
  return ts.length > 0 && n === ts.length;
}

function confetti(x, y) {
  const colors = Object.values(CATS).concat('#4ade80', '#ff6fb1');
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('i'); s.className = 'confetti';
    s.style.cssText = `left:${x}px;top:${y}px;--dx:${(Math.random() - .5) * 300}px;--dy:${-80 - Math.random() * 200}px;--r:${Math.random() * 720}deg;background:${colors[i % 6]}`;
    document.body.appendChild(s); setTimeout(() => s.remove(), 1000);
  }
}

/* ---------- Interactions ---------- */
$('#days').addEventListener('click', e => {
  const add = e.target.closest('[data-add]'); if (add) return openAdd(add.dataset.add);
  const el = e.target.closest('.task'); if (!el) return;
  const t = db.tasks.find(x => x.id === el.dataset.id); if (!t) return;
  if (e.target.closest('.del')) {
    el.classList.add('out');
    return setTimeout(() => { db.tasks = db.tasks.filter(x => x !== t); save(); render(); }, 250);
  }
  if (e.target.closest('.check')) {
    t.done = !t.done; save(); el.classList.toggle('done', t.done);
    const complete = updateRing(el.closest('.day'));
    if (t.done) {
      const c = el.querySelector('.check'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
      const r = c.getBoundingClientRect(); if (complete) confetti(r.left + 14, r.top + 14);
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }
});

const sel = (id, v) => $$(`#${id} .chip`).forEach(x => x.classList.toggle('on', x.dataset.v === v));
const pick = id => $(`#${id} .on`)?.dataset.v;
$('#fCats').innerHTML = Object.keys(CATS).map(c => `<button type="button" class="chip" data-v="${c}" style="--c:${CATS[c]}">${c}</button>`).join('');
$('#fVibes').innerHTML = VIBES.map(v => `<button type="button" class="chip" data-v="${v}">${v}</button>`).join('');
document.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) sel(c.parentNode.id, c.dataset.v); });

function openAdd(dateKey) {
  $('#fDate').innerHTML = next14().map((d, i) => `<option value="${iso(d)}">${dayLabel(d, i)} · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</option>`).join('');
  $('#fDate').value = dateKey || iso(new Date());
  $('#fTitle').value = ''; $('#fTime').value = ''; sel('fCats', 'Personal'); sel('fVibes', '⭐');
  $('#addSheet').classList.add('open'); $('#fTitle').focus();
}
const closeAll = () => $$('.sheet').forEach(s => s.classList.remove('open'));
$$('.sheet').forEach(s => s.addEventListener('click', e => { if (e.target === s) closeAll(); }));
$('#fab').onclick = () => openAdd();
$('#openSettings').onclick = () => $('#setSheet').classList.add('open');
$('#closeSet').onclick = closeAll;

$('#addForm').onsubmit = e => {
  e.preventDefault();
  db.tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: $('#fTitle').value.trim(), date: $('#fDate').value, time: $('#fTime').value, cat: pick('fCats') || 'Personal', vibe: pick('fVibes') || '⭐', done: false });
  save(); render(); closeAll(); checkDue();
};

/* ---------- Backup ---------- */
$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
  a.download = 'fortnight-backup.json'; a.click();
};
$('#import').onchange = async e => {
  try {
    const j = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(j.tasks)) throw 0;
    db = { tasks: j.tasks, notified: j.notified || {} }; save(); render(); closeAll();
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
  const b = $('#notifBanner');
  if (!('Notification' in window)) { // iOS only exposes this once installed to the Home Screen
    b.hidden = false; b.querySelector('span').textContent = '📲 Add to Home Screen to enable reminders';
    b.querySelector('button').hidden = true; return;
  }
  b.hidden = Notification.permission !== 'default';
}

// requestPermission must run directly inside a tap handler on iOS.
$('#enableNotif').onclick = async () => {
  const p = await Notification.requestPermission();
  if (p === 'granted') {
    notify('Notifications on 🎉', "You'll get reminders for timed tasks.");
    window.OneSignalDeferred?.push(OS => OS.User.PushSubscription.optIn());
  }
  refreshBanner();
};
$('#testNotif').onclick = () => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return alert('Enable notifications first (banner on the main screen).');
  notify('Test notification 🔔', 'It works!');
};

// OPTIONAL: OneSignal Web SDK for background push (paste App ID at the top of this file).
function initOneSignal() {
  if (!ONESIGNAL_APP_ID) return;
  const s = document.createElement('script');
  s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'; s.defer = true; document.head.appendChild(s);
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(OS => OS.init({ appId: ONESIGNAL_APP_ID, serviceWorkerPath: 'sw.js', serviceWorkerParam: { scope: location.pathname.replace(/[^/]*$/, '') } }));
}

/* ---------- Boot ---------- */
['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
const h = new Date().getHours();
$('#hello').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ' ✨';
render(); refreshBanner(); initOneSignal();
setInterval(checkDue, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); checkDue(); } });
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
