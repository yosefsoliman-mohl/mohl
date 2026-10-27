(async () => {
  // Content and the signed-in user come from the server; saves and progress stay in this browser.
  let topics = [], courses = [], tools = [], resources = [], posts = [], me = null;
  const defaultSaved = { course: ['plan-measurement', 'app-funnel'], tool: ['appsflyer', 'firebase'], resource: ['event-tracking-plan', 'utm-naming'], lesson: [], post: [] };

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`/api/${path}`, {
      method, credentials: 'same-origin',
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong'), { status: res.status });
    return data;
  }
  async function loadContent() {
    const d = await api('content');
    ({ topics, courses, tools, resources, posts, me } = d);
  }

  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const topic = (id) => topics.find((t) => t.id === id);
  const course = (id) => courses.find((c) => c.id === id);
  const tool = (id) => tools.find((t) => t.id === id);
  const resource = (id) => resources.find((r) => r.id === id);
  const match = (q, ...fields) => !q || fields.join(' ').toLowerCase().includes(q.toLowerCase());

  // ---------- icons (lucide-style strokes) ----------
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.8a1.5 1.5 0 0 0 1.5-1.1L21 8H6"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-6 6.5-6s5.9 2.4 6.5 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.2c2.6.2 4.4 2.3 5 5.3"/>',
    bookmark: '<path d="M6 3h12v18l-6-4.5L6 21z"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 14H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8C10 4 7 4 7 6s3 2 5 2c2 0 5 0 5-2s-3-2-5 2z"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>',
    chevRight: '<path d="m9 6 6 6-6 6"/>',
    chevLeft: '<path d="m15 6-6 6 6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    book: '<path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z"/><path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".6" fill="currentColor"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    megaphone: '<path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    chart: '<path d="M6 20v-6M12 20V9M18 20V4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    pin: '<path d="M9 3h6l-1 6 4 4H6l4-4z"/><path d="M12 13v8"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
  };
  const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  const bookmarkIcon = (on) => `<svg class="ic" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">${P.bookmark}</svg>`;

  // ---------- illustrations ----------
  const O = '#E0712E', D = '#9A3F14', N = '#14185E', L = '#F6C9A8';
  const ILL = {
    measure: `<rect x="22" y="56" width="12" height="26" rx="2" fill="${L}"/><rect x="40" y="42" width="12" height="40" rx="2" fill="${O}" opacity=".7"/><rect x="58" y="24" width="12" height="58" rx="2" fill="${O}"/><circle cx="74" cy="66" r="14" fill="#fff" stroke="${D}" stroke-width="5"/><path d="M84 76l12 12" stroke="${D}" stroke-width="6" stroke-linecap="round"/>`,
    funnel: `<rect x="30" y="14" width="40" height="74" rx="8" fill="#fff" stroke="${N}" stroke-width="5"/><path d="M38 30h24l-9 12v10l-6 4V42z" fill="${O}"/><rect x="72" y="58" width="7" height="24" rx="1.5" fill="${O}"/><rect x="83" y="48" width="7" height="34" rx="1.5" fill="${O}"/><rect x="94" y="64" width="7" height="18" rx="1.5" fill="${L}"/>`,
    reengage: `<circle cx="60" cy="38" r="10" fill="${O}"/><path d="M44 66c2-10 8-15 16-15s14 5 16 15z" fill="${O}"/><path d="M36 40a26 26 0 0 1 44-16" fill="none" stroke="${D}" stroke-width="4" stroke-linecap="round"/><path d="M80 14v11H69" fill="none" stroke="${D}" stroke-width="4" stroke-linecap="round"/><path d="M22 70c10 14 40 18 66 4" fill="none" stroke="${O}" stroke-width="3" stroke-dasharray="5 5"/><circle cx="22" cy="62" r="5" fill="${L}"/><circle cx="56" cy="80" r="4" fill="${D}"/>`,
    push: `<rect x="22" y="14" width="40" height="74" rx="8" fill="#fff" stroke="${N}" stroke-width="5"/><rect x="40" y="38" width="56" height="26" rx="5" fill="#fff" stroke="${L}" stroke-width="2"/><path d="M46 52a6 6 0 0 1 12 0v4h-12z" fill="${O}"/><rect x="64" y="46" width="26" height="3" rx="1.5" fill="${L}"/><rect x="64" y="53" width="18" height="3" rx="1.5" fill="${L}"/><path d="M84 20l6-8M90 28l8-3" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`,
    ads: `<rect x="34" y="12" width="42" height="76" rx="8" fill="#fff" stroke="${N}" stroke-width="5"/><rect x="42" y="28" width="26" height="20" rx="2" fill="${L}"/><circle cx="50" cy="35" r="3" fill="#fff"/><rect x="62" y="52" width="28" height="22" rx="5" fill="${O}"/><text x="76" y="68" font-family="Inter,sans-serif" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">AD</text><path d="M18 34l10 4M16 50h10M20 64l9-4" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`,
    deeplink: `<rect x="12" y="16" width="30" height="62" rx="6" fill="#fff" stroke="${N}" stroke-width="4"/><rect x="78" y="16" width="30" height="62" rx="6" fill="#fff" stroke="${N}" stroke-width="4"/><rect x="18" y="30" width="18" height="16" rx="2" fill="${L}"/><rect x="84" y="30" width="18" height="16" rx="2" fill="${L}"/><path d="M54 52a6 6 0 0 1 0-8l4-4a6 6 0 0 1 8 8l-2 2M66 44a6 6 0 0 1 0 8l-4 4a6 6 0 0 1-8-8l2-2" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/>`,
    utm: `<rect x="14" y="18" width="84" height="64" rx="6" fill="#fff" stroke="${L}" stroke-width="2"/><rect x="14" y="18" width="84" height="12" rx="6" fill="${O}"/><circle cx="22" cy="24" r="2" fill="#fff"/><circle cx="29" cy="24" r="2" fill="#fff"/><circle cx="36" cy="24" r="2" fill="#fff"/><text x="22" y="48" font-family="Inter,sans-serif" font-size="10" fill="${N}">myapp://?</text><rect x="30" y="58" width="58" height="14" rx="3" fill="#fff" stroke="${L}"/><text x="35" y="68" font-family="Inter,sans-serif" font-size="8" fill="${N}">utm_source=…</text><path d="M10 70l12-8 8 10-12 8z" fill="${O}"/>`,
    sheet: `<rect x="26" y="16" width="70" height="64" rx="4" fill="#fff" stroke="${L}" stroke-width="2"/><rect x="26" y="16" width="70" height="8" rx="3" fill="#3BA776"/>${[32, 42, 52, 62, 72].map((y) => `<path d="M30 ${y}h62" stroke="#E6E1DC"/>`).join('')}<path d="M48 26v52M70 26v52" stroke="#E6E1DC"/><rect x="14" y="54" width="22" height="22" rx="4" fill="#1F7A45"/><text x="25" y="70" font-family="Inter,sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">X</text>`,
    checklist: `<rect x="30" y="12" width="60" height="74" rx="4" fill="#fff" stroke="${L}" stroke-width="2"/>${[30, 46, 62].map((y) => `<rect x="38" y="${y - 6}" width="12" height="12" rx="2" fill="#fff" stroke="${O}" stroke-width="2"/><path d="M40 ${y}l3 3 6-6" stroke="${O}" stroke-width="2.5" fill="none"/><rect x="56" y="${y - 2}" width="26" height="4" rx="2" fill="#D9D3CD"/>`).join('')}`,
    flow: `<rect x="44" y="18" width="32" height="18" rx="4" fill="#7E9BEA"/><rect x="14" y="56" width="32" height="18" rx="4" fill="#7E9BEA"/><rect x="74" y="56" width="32" height="18" rx="4" fill="${O}" opacity=".8"/><path d="M44 27H30v26M76 27h14v26M60 36v12h30" fill="none" stroke="${O}" stroke-width="2"/>`,
    phone: `<rect x="22" y="12" width="36" height="78" rx="7" fill="#fff" stroke="${N}" stroke-width="4"/><circle cx="34" cy="36" r="5" fill="${O}"/><rect x="42" y="33" width="10" height="5" rx="2" fill="${L}"/><rect x="64" y="30" width="40" height="46" rx="3" fill="#fff" stroke="${L}" stroke-width="2"/><rect x="70" y="40" width="26" height="3" rx="1.5" fill="#D9D3CD"/><rect x="70" y="48" width="20" height="3" rx="1.5" fill="#D9D3CD"/><path d="M84 78l16-26 5 3-16 26-6 2z" fill="${O}"/>`,
    doc: `<rect x="28" y="14" width="64" height="72" rx="4" fill="#fff" stroke="${L}" stroke-width="2"/><rect x="36" y="22" width="32" height="8" rx="2" fill="#7E9BEA"/>${[40, 48, 56, 64, 72].map((y, i) => `<rect x="36" y="${y}" width="${i % 2 ? 36 : 48}" height="3" rx="1.5" fill="#C7D3F3"/>`).join('')}`,
    phones: `${[10, 46, 82].map((x, i) => `<rect x="${x}" y="18" width="28" height="60" rx="6" fill="#fff" stroke="${N}" stroke-width="3.5"/>${i === 0 ? `<rect x="${x + 6}" y="36" width="16" height="14" rx="2" fill="${O}" opacity=".8"/>` : i === 1 ? `<rect x="${x + 6}" y="34" width="16" height="3" fill="#7E9BEA"/><rect x="${x + 6}" y="42" width="16" height="3" fill="#7E9BEA"/><rect x="${x + 6}" y="50" width="12" height="3" fill="#7E9BEA"/>` : `<circle cx="${x + 14}" cy="46" r="8" fill="${O}"/><path d="M${x + 10} 46l3 3 5-6" stroke="#fff" stroke-width="2" fill="none"/>`}`).join('')}<path d="M39 48h6M75 48h6" stroke="${O}" stroke-width="2"/>`,
  };
  const illus = (name) => `<svg viewBox="0 0 120 100" aria-hidden="true">${ILL[name] || ''}</svg>`;
  const toolLogo = (t, size = '') => `<span class="tool-logo ${size}" style="--c:${t.color}">${esc(t.mono)}</span>`;
  const FORMAT_COLOR = { XLSX: '#1F7A45', PDF: '#D32F2F', DOCX: '#2B5FD9' };
  const formatBadge = (f) => `<span class="fmt" style="--c:${FORMAT_COLOR[f]}">${f[0]}</span>`;

  // ---------- state ----------
  // Saves and lesson progress live only in this browser (kept separately for each account).
  const key = () => `mohl-state-v2:${me ? me.id : 'guest'}`;
  const state = {};
  const loadState = () => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(key())); } catch {}
    Object.assign(state, { saved: structuredClone(defaultSaved), progress: {} }, saved);
  };
  const persist = () => { try { localStorage.setItem(key(), JSON.stringify(state)); } catch {} };
  const isSaved = (kind, id) => state.saved[kind].includes(id);
  const toggleSave = (kind, id) => {
    const list = state.saved[kind];
    const i = list.indexOf(id);
    i >= 0 ? list.splice(i, 1) : list.push(id);
    persist();
    toast(i >= 0 ? 'Removed from My Library' : 'Saved to My Library');
    return i < 0;
  };
  const done = (cid) => state.progress[cid] || [];
  const courseStatus = (c) => {
    const n = done(c.id).length;
    return n === 0 ? 'Not started' : n >= c.lessons.length ? 'Completed' : 'In progress';
  };
  const nextLesson = (c) => {
    const d = done(c.id);
    const i = c.lessons.findIndex((_, idx) => !d.includes(idx));
    return i < 0 ? 0 : i;
  };
  const allPosts = () => posts;
  const post = (id) => posts.find((p) => p.id === id);
  const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  // Mirrors the server's permission table; the server is what actually enforces it.
  const ROLES = {
    admin: { label: 'Admin', desc: 'Everything, including members and roles' },
    editor: { label: 'Editor', desc: 'Adds and edits tools, courses, videos and resources' },
    moderator: { label: 'Moderator', desc: 'Manages community questions and replies' },
    member: { label: 'Member', desc: 'Asks questions and replies in the community' },
    viewer: { label: 'Viewer', desc: 'Views content only' },
  };
  const AREAS = { content: ['admin', 'editor'], community: ['admin', 'moderator'], members: ['admin'] };
  const can = (area) => !!me && AREAS[area].includes(me.role);
  const isStaff = () => can('content') || can('community');
  const canPost = () => !!me && me.role !== 'viewer';
  const roleLabel = (r) => (ROLES[r] || ROLES.member).label;
  // Sends signed-out visitors to log in, then back to where they were.
  const requireLogin = () => {
    if (me) return true;
    location.hash = `#/login?next=${encodeURIComponent(location.hash.slice(1) || '/home')}`;
    toast('Log in or create an account to continue');
    return false;
  };
  // Turns a YouTube / Vimeo / .mp4 link into an embedded player.
  function videoEmbed(url, title = 'Video') {
    if (!url) return '';
    let m;
    let src = null;
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/))) src = `https://www.youtube-nocookie.com/embed/${m[1]}`;
    else if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) src = `https://player.vimeo.com/video/${m[1]}`;
    if (src) return `<div class="video"><iframe src="${esc(src)}" title="${esc(title)}" allow="fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    if (/\.(mp4|webm)(\?|$)/i.test(url)) return `<div class="video"><video src="${esc(url)}" controls preload="metadata"></video></div>`;
    return `<a class="btn btn-outline" href="${esc(url)}" target="_blank" rel="noopener">${icon('video')} Watch video</a>`;
  }

  // ---------- shared UI ----------
  const statusPill = (c) => {
    const s = courseStatus(c);
    return `<span class="pill ${s === 'Completed' ? 'pill-green' : s === 'In progress' ? 'pill-blue' : 'pill-gray'}">${s}</span>`;
  };
  const startLabel = (c) => ({ 'Not started': 'Start Learning', 'In progress': 'Continue', Completed: 'Review' }[courseStatus(c)]);
  const courseHref = (c) => `#/learn/${c.id}/${nextLesson(c) + 1}`;
  const chips = (items, active, attr) => items.map(([v, label]) => `<button class="chip ${v === active ? 'active' : ''}" data-${attr}="${v}">${esc(label)}</button>`).join('');
  const saveBtn = (kind, id, extra = '') => `<button class="save-btn ${isSaved(kind, id) ? 'on' : ''} ${extra}" data-save="${kind}:${id}" aria-label="${isSaved(kind, id) ? 'Remove from' : 'Save to'} My Library" aria-pressed="${isSaved(kind, id)}">${bookmarkIcon(isSaved(kind, id))}</button>`;
  const header = (eyebrow, title, sub, right = '', badge = '') => `
    <div class="page-head">
      <div>
        <div class="eyebrow">${eyebrow}</div>
        <h1 class="title">${title}${badge}</h1>
        <p class="subtitle">${sub}</p>
      </div>
      ${right ? `<div class="page-head-right">${right}</div>` : ''}
    </div>`;
  const empty = (text) => `<div class="empty">${icon('search')}<p>${text}</p></div>`;
  const select = (id, options, value) => `<label class="select">${icon('chevDown')}<select id="${id}">${options.map(([v, l]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const searchBox = (id, ph, value = '', cls = '') => `<label class="search ${cls}">${icon('search')}<input id="${id}" type="search" placeholder="${ph}" value="${esc(value)}" autocomplete="off"></label>`;

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.innerHTML = `${icon('check')} ${esc(msg)}`;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function openModal(html, cls = '') {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true"><button class="icon-btn modal-close" data-close aria-label="Close">${icon('x')}</button>${html}</div>`;
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add('open'));
    ($('input,textarea,select', root) || $('.modal-close', root)).focus();
  }
  function closeModal() {
    const root = $('#modal-root');
    root.classList.remove('open');
    root.hidden = true;
    root.innerHTML = '';
  }

  // ---------- navigation chrome ----------
  const NAV = [
    ['home', 'Home', 'home'], ['learn', 'Learn', 'cap'], ['marketplace', 'Marketplace', 'cart'],
    ['resources', 'Resources', 'file'], ['community', 'Community', 'users'], null, ['library', 'My Library', 'bookmark'],
  ];
  const NAV_BOTTOM = [['help', 'Help', 'help'], ['settings', 'Settings', 'settings']];
  const navItem = ([r, label, ic]) => `<a href="#/${r}" data-route="${r}">${icon(ic)}<span>${label}</span></a>`;
  $('#menu-btn').innerHTML = icon('menu');
  $('.gs-icon').innerHTML = icon('search');

  // Sidebar + account area depend on who is signed in, so they re-render on login/logout.
  function renderChrome() {
    const bottom = isStaff() ? [['admin', 'Admin', 'shield'], ...NAV_BOTTOM] : NAV_BOTTOM;
    $('#nav-main').innerHTML = NAV.map((n) => (n ? navItem(n) : '<hr>')).join('');
    $('#nav-bottom').innerHTML = bottom.map(navItem).join('');
    const right = $('.topbar-right');
    if (!me) {
      right.innerHTML = `
        <a class="btn btn-outline" href="#/login">${icon('login')} Log in</a>
        <a class="btn btn-primary" href="#/signup">Create account</a>`;
      return;
    }
    right.innerHTML = `
      <span class="pill pill-peach member-pill">${icon(isStaff() ? 'shield' : 'gift')} ${me.role === 'member' ? 'Free Member' : roleLabel(me.role)}</span>
      <div class="user" id="user">
        <button class="user-btn" id="user-btn" aria-haspopup="menu">
          <span class="avatar">${esc(initials(me.name))}</span><span class="user-name">${esc(me.name)}</span>${icon('chevDown')}
        </button>
        <div class="menu" id="user-menu" role="menu" hidden>
          <div class="menu-head"><span class="avatar">${esc(initials(me.name))}</span><div><strong>${esc(me.name)}</strong><small>${esc(me.email)}</small></div></div>
          <a href="#/settings" role="menuitem">${icon('user')} Profile & settings</a>
          <a href="#/library" role="menuitem">${icon('bookmark')} My Library</a>
          ${isStaff() ? `<a href="#/admin" role="menuitem">${icon('shield')} Admin</a>` : ''}
          <a href="#/help" role="menuitem">${icon('help')} Help</a>
          <button role="menuitem" data-action="signout">${icon('logout')} Log out</button>
        </div>
      </div>`;
    $('#user-btn').addEventListener('click', (e) => { e.stopPropagation(); const m = $('#user-menu'); m.hidden = !m.hidden; });
  }
  const closeUserMenu = () => { const m = $('#user-menu'); if (m) m.hidden = true; };

  // ---------- pages ----------
  const ui = {
    learn: { q: '', topic: 'all', level: 'all' },
    market: { q: '', topic: 'all', savedOnly: false, selected: 'firebase' },
    res: { q: '', topic: 'all', format: 'all', type: 'all' },
    comm: { q: '', topic: 'all', tab: 'all' },
    lib: { q: '', topic: 'all', kind: 'all' },
  };

  const courseCardH = (c) => `
    <article class="card course-h">
      <div class="thumb">${illus(c.illus)}</div>
      <div class="course-body">
        <div class="row-between">${statusPill(c)}</div>
        <div class="kicker">${topic(c.topic).name}</div>
        <h3><a href="${courseHref(c)}">${c.title}</a></h3>
        <p>${c.homeBlurb || c.blurb}</p>
        <a class="btn btn-primary" href="${courseHref(c)}">${startLabel(c)}</a>
      </div>
    </article>`;

  const pages = {};

  pages.home = () => `
    ${header('Welcome to MoHL', 'Build your mobile growth skills.', 'Learn the foundations, discover tools, and put your knowledge into practice.',
      `<a class="btn btn-outline btn-lg" href="#/marketplace">${icon('cart')} Explore Marketplace</a>`)}
    <section class="hero">
      <div class="hero-text">
        <h2>Where would you like to start?</h2>
        <p>Choose a topic and take your first practical step.</p>
        <a class="btn btn-primary btn-lg" href="#/learn">Explore learning paths ${icon('arrow')}</a>
      </div>
      <div class="hero-art" aria-hidden="true">
        <svg viewBox="0 0 420 170"><circle cx="90" cy="150" r="70" fill="#F9DCC6"/><circle cx="330" cy="40" r="40" fill="#FBE5D5"/><circle cx="400" cy="140" r="50" fill="#F9DCC6"/>
          <rect x="150" y="30" width="150" height="100" rx="8" fill="#fff" stroke="#F1C8AA" stroke-width="2" transform="rotate(4 225 80)"/>
          <rect x="172" y="60" width="38" height="34" rx="6" fill="#C2571F"/><path d="M186 68v18l14-9z" fill="#fff"/>
          <rect x="220" y="62" width="60" height="5" rx="2.5" fill="#F1C8AA"/><rect x="220" y="74" width="48" height="5" rx="2.5" fill="#F1C8AA"/><rect x="220" y="86" width="54" height="5" rx="2.5" fill="#F1C8AA"/>
          <path d="M110 160c30-30 70-30 100-10 30-20 70-20 100 10z" fill="#fff" stroke="#9A3F14" stroke-width="3"/><path d="M210 150v14" stroke="#9A3F14" stroke-width="3"/>
          <rect x="310" y="6" width="64" height="160" rx="12" fill="#fff" stroke="#14185E" stroke-width="6" transform="rotate(8 342 86)"/>
          ${[50, 82, 114].map((y) => `<circle cx="${334 - (y - 50) * 0.14}" cy="${y}" r="7" fill="none" stroke="#E0712E" stroke-width="3.5"/><rect x="${348 - (y - 50) * 0.14}" y="${y - 2}" width="18" height="4" rx="2" fill="#F1C8AA"/>`).join('')}
          <path d="M392 40l10-14M398 60l14-4M120 70l-14-8" stroke="#E0712E" stroke-width="3" stroke-linecap="round"/></svg>
      </div>
      <span class="pill pill-peach hero-pill">${icon('gift')} Free launch access</span>
    </section>

    <section class="section">
      <h2 class="section-title">Start with a practical course</h2>
      <p class="section-sub">Build core skills with short, focused lessons you can apply right away.</p>
      <div class="grid-3">${courses.slice(0, 3).map(courseCardH).join('')}</div>
    </section>

    <section class="section">
      <h2 class="section-title">Explore by topic</h2>
      <p class="section-sub">Browse topics to find courses, guides and resources.</p>
      <div class="topic-row">${topics.map((t) => `<a class="topic-tile" href="#/learn?topic=${t.id}"><span class="topic-ic">${icon(t.icon)}</span><span>${t.name}</span>${icon('chevRight', 'sm')}</a>`).join('')}</div>
    </section>

    <section class="split-2">
      <div class="card pad">
        <div class="row-between"><h2 class="section-title sm">Put your learning to work</h2><a class="link" href="#/resources">View all resources ${icon('arrow', 'sm')}</a></div>
        <p class="section-sub">Use these free templates to plan, organize and take action.</p>
        <div class="res-list">${resources.slice(0, 3).map((r) => { return `
          <div class="res-row">${icon('file')}<strong>${r.title}</strong><span class="tag">${r.type}</span><button class="link" data-preview="${r.id}">View resource ${icon('chevRight', 'sm')}</button></div>`; }).join('')}</div>
      </div>
      <div class="card pad peach cta-card">
        <h2 class="section-title sm">Have a mobile growth question?</h2>
        <p class="section-sub">Ask the community and share what you are learning.</p>
        <a class="btn btn-outline" href="#/community">Explore the community</a>
        <div class="cta-art">${icon('message')}</div>
      </div>
    </section>`;

  // Learn
  pages.learn = (params) => {
    if (params.get('topic')) ui.learn.topic = params.get('topic');
    const s = ui.learn;
    return `
      ${header('Learn', 'Learn mobile marketing, one step at a time.', 'Practical courses with tools and resources to help you apply what you learn.',
        `<span class="pill pill-peach lg">${icon('gift')} All MoHL courses are free</span>`)}
      <div class="filter-bar card">
        ${searchBox('learn-q', 'What would you like to learn?', s.q, 'grow')}
        ${select('learn-level', [['all', 'All levels'], ['Beginner', 'Beginner'], ['Intermediate', 'Intermediate']], s.level)}
      </div>
      <div class="chips">${chips([['all', 'All'], ...topics.map((t) => [t.id, t.short])], s.topic, 'learn-topic')}</div>
      <div class="grid-3" data-list></div>`;
  };
  pages.learn.list = () => {
    const s = ui.learn;
    const list = courses.filter((c) => (s.topic === 'all' || c.topic === s.topic) && (s.level === 'all' || c.level === s.level) && match(s.q, c.title, c.blurb, topic(c.topic).name));
    const cards = list.map((c) => `
      <article class="card course-v">
        <div class="course-top">
          <div class="thumb">${illus(c.illus)}</div>
          <div>
            <div class="kicker">${topic(c.topic).name}</div>
            <h3><a href="${courseHref(c)}">${c.title}</a></h3>
            <p>${c.blurb}</p>
          </div>
        </div>
        <div class="row-between">
          <div class="pills"><span class="pill pill-green">Free</span>${statusPill(c)}</div>
          <a class="btn btn-primary" href="${courseHref(c)}">${startLabel(c)} ${icon('arrow')}</a>
        </div>
      </article>`).join('');
    const first = courses.find((c) => c.topic === 'measurement') || courses[0];
    const cta = s.topic === 'all' && !s.q && first ? `
      <article class="card peach begin-card">
        <div class="eyebrow">Get started</div>
        <h2>Not sure where to begin?</h2>
        <p>Start with measurement, then choose a path for your next goal.</p>
        <a class="btn btn-primary btn-lg" href="#/learn/${first.id}/1">Start with ${esc(topic(first.topic).short)} ${icon('arrow')}</a>
      </article>` : '';
    return list.length ? cards + cta : empty('No courses match your filters.');
  };

  // Lesson
  pages.lesson = (params, [cid, n]) => {
    const c = course(cid);
    if (!c) return empty('Course not found.');
    const idx = Math.min(Math.max(parseInt(n, 10) || 1, 1), c.lessons.length) - 1;
    const ls = c.lessons[idx];
    const d = done(c.id);
    const lessonKey = `${c.id}:${idx}`;
    const r = resource(c.resource), t = tool(c.tool);
    const pct = Math.round((d.length / c.lessons.length) * 100);
    return `
      <nav class="crumbs"><a href="#/learn">Learn</a><span>/</span><a href="#/learn?topic=${c.topic}">${topic(c.topic).name}</a><span>/</span><span class="current">${c.title}</span></nav>
      <h1 class="title">${ls.title}</h1>
      <div class="lesson-meta">
        <span class="pill pill-peach lg">${icon('book')} Practical lesson</span>
        <button class="ghost-btn" data-save="lesson:${lessonKey}">${bookmarkIcon(isSaved('lesson', lessonKey))} ${isSaved('lesson', lessonKey) ? 'Saved' : 'Save lesson'}</button>
      </div>
      <div class="lesson-grid">
        <aside class="card pad outline">
          <h2 class="section-title sm">${c.title}</h2>
          <p class="muted">${d.length} of ${c.lessons.length} lessons complete</p>
          <div class="progress"><span style="width:${pct}%"></span></div>
          <ol class="steps">${c.lessons.map((l, i) => `
            <li class="${i === idx ? 'active' : ''} ${d.includes(i) ? 'done' : ''}">
              <a href="#/learn/${c.id}/${i + 1}"><span class="num">${d.includes(i) ? icon('check', 'sm') : i + 1}</span><span>${l.title}</span></a>
              <button class="tick" data-toggle-done="${c.id}:${i}" aria-label="${d.includes(i) ? 'Mark incomplete' : 'Mark complete'}">${d.includes(i) ? icon('check', 'sm') : ''}</button>
            </li>`).join('')}</ol>
          <div class="pace">${icon('book')}<div><strong>Learn at your own pace</strong><p>Go through the lessons in order or jump to the topics you need.</p></div></div>
        </aside>

        <section class="card pad lesson-main">
          <div class="eyebrow">Lesson ${String(idx + 1).padStart(2, '0')}</div>
          <h2 class="lesson-h">${ls.heading}</h2>
          <p class="lead">${ls.intro}</p>
          ${videoEmbed(ls.video, ls.title)}
          ${ls.example && ls.example.title ? `<div class="example">
            <div class="example-ic">${icon('gift')}</div>
            <div><div class="kicker">Example · ${ls.example.label}</div><h3>${ls.example.title}</h3><p>${ls.example.text}</p></div>
          </div>` : ''}
          ${ls.steps.length ? `<h3 class="sub-h">Write down ${ls.steps.length === 3 ? 'three things' : 'these things'}</h3>
          <ol class="three">${ls.steps.map((s, i) => `<li><span class="num">${String(i + 1).padStart(2, '0')}</span>${s}</li>`).join('')}</ol>` : ''}
          ${ls.yourTurn ? `<div class="your-turn">
            <span class="yt-ic">${icon('pencil')}</span>
            <div><div class="kicker">Your turn</div><p>${ls.yourTurn}</p></div>
            ${r ? `<button class="btn btn-outline sm" data-preview="${r.id}">${icon('file')} Open worksheet</button>` : ''}
          </div>` : ''}
          <div class="lesson-nav">
            ${idx > 0 ? `<a class="btn btn-outline btn-lg" href="#/learn/${c.id}/${idx}">${icon('chevLeft')} Previous lesson</a>` : '<span></span>'}
            <button class="btn btn-primary btn-lg" data-complete="${c.id}:${idx}">${idx === c.lessons.length - 1 ? 'Mark complete & finish' : 'Mark complete & continue'} ${icon('chevRight')}</button>
          </div>
        </section>

        <aside class="side-col">
          <div class="card pad">
            <h2 class="section-title sm">Put it into practice</h2>
            <p class="muted">Use these resources to apply what you learned in this lesson.</p>
            ${r ? `<div class="mini-card">
              <div class="mini-thumb">${illus(r.illus)}</div>
              <div><strong>${r.title}</strong><span class="tag blue">Free ${r.type.toLowerCase()}</span><p>${r.blurb}</p><button class="link" data-preview="${r.id}">View resource ${icon('arrow', 'sm')}</button></div>
            </div>` : ''}
            ${t ? `<div class="mini-card">
              <div class="mini-thumb">${toolLogo(t, 'lg')}</div>
              <div><strong>${t.name}</strong><p>${t.blurb}</p><a class="btn btn-outline sm" href="#/marketplace/${t.id}">View tool ${icon('external', 'sm')}</a></div>
            </div>` : ''}
            ${!r && !t ? '<p class="muted">More resources coming soon.</p>' : ''}
          </div>
          <div class="card pad peach cta-card">
            <h2 class="section-title sm">Have a question?</h2>
            <p class="muted">Get help from the community and ask about this lesson.</p>
            <button class="btn btn-outline sm" data-ask="${c.topic}|${esc(ls.title)}">${icon('message')} Ask about this lesson</button>
            <div class="cta-art">${icon('message')}</div>
          </div>
        </aside>
      </div>`;
  };

  // Marketplace
  pages.marketplace = (params, [toolId]) => {
    if (toolId && tool(toolId)) ui.market.selected = toolId;
    const s = ui.market;
    return `
      <div class="market-grid">
        <div>
          ${header('Marketplace', 'Find tools for your next step.', 'Understand what each tool does and learn how to use it.')}
          <div class="notice">${icon('info')} MoHL guides are free. Third-party tools have their own plans.</div>
          <div class="filter-row">
            ${searchBox('market-q', 'Search tools…', s.q, 'grow filled')}
            <button class="btn btn-outline ${s.savedOnly ? 'pressed' : ''}" data-action="saved-tools" aria-pressed="${s.savedOnly}">${bookmarkIcon(s.savedOnly)} Saved tools</button>
          </div>
          <div class="chips">${chips([['all', 'All Tools'], ...topics.map((t) => [t.id, t.name])], s.topic, 'market-topic')}</div>
          <div class="grid-2" data-list></div>
        </div>
        <aside class="tool-panel card" id="tool-panel"></aside>
      </div>`;
  };
  pages.marketplace.list = () => {
    const s = ui.market;
    const list = tools.filter((t) => (s.topic === 'all' || t.topic === s.topic) && (!s.savedOnly || isSaved('tool', t.id)) && match(s.q, t.name, t.blurb, topic(t.topic).name));
    renderToolPanel();
    return list.length ? list.map((t) => `
      <article class="card tool-card ${t.id === s.selected ? 'selected' : ''}" data-select-tool="${t.id}" tabindex="0">
        ${toolLogo(t)}
        <div>
          <h3>${t.name}</h3>
          <span class="tag ${t.id === s.selected ? 'peach' : 'blue'}">${topic(t.topic).name}</span>
          <p>${t.blurb}</p>
          <span class="link">View Tool ${icon('arrow', 'sm')}</span>
        </div>
        ${saveBtn('tool', t.id, 'corner')}
      </article>`).join('') : empty(s.savedOnly ? 'No saved tools yet. Use the bookmark on any tool to save it.' : 'No tools match your search.');
  };
  function renderToolPanel() {
    const panel = $('#tool-panel');
    if (!panel) return;
    const t = tool(ui.market.selected);
    if (!t) { panel.hidden = true; $('.market-grid')?.classList.add('no-panel'); return; }
    panel.hidden = false;
    $('.market-grid')?.classList.remove('no-panel');
    const c = course(t.course), r = resource(t.resource);
    panel.innerHTML = `
      <div class="tp-head">
        ${toolLogo(t, 'xl')}
        <div><h2>${t.name}</h2><span class="tag peach lg">${topic(t.topic).name}</span></div>
        <div class="tp-actions">
          <button class="icon-btn" data-action="close-panel" aria-label="Close">${icon('x')}</button>
          ${saveBtn('tool', t.id)}
        </div>
      </div>
      <div class="tp-body">
        <h3>What it does</h3><p class="muted">${t.what || t.blurb}</p>
        ${t.video ? `<h3>Watch</h3>${videoEmbed(t.video, t.name)}` : ''}<hr>
        ${c ? `<h3>Learn with this tool</h3>
        <div class="card tp-course">
          <div class="thumb">${illus(c.illus)}</div>
          <div><strong>${c.title}</strong><p>${c.blurb}</p><a class="btn btn-primary block" href="${courseHref(c)}">${startLabel(c)}</a></div>
        </div>` : ''}
        ${t.guide.length ? `<h3>Getting started guide</h3>
        <div class="card list-card">${t.guide.map((g, i) => `<${c ? `a href="${courseHref(c)}"` : 'div'} class="list-row ${c ? '' : 'static'}">${icon(['file', 'settings', 'chart'][i % 3])}<span>${g}</span>${c ? icon('chevRight', 'sm') : ''}</${c ? 'a' : 'div'}>`).join('')}
          ${c ? `<a class="link pad-link" href="${courseHref(c)}">Read the guide ${icon('arrow', 'sm')}</a>` : ''}</div>` : ''}
        ${r ? `<h3>Related resource</h3>
        <div class="card list-card"><div class="list-row static">${icon('file')}<span>${r.title}</span><button class="link" data-preview="${r.id}">View template ${icon('arrow', 'sm')}</button></div></div>` : ''}
        ${t.url ? `<a class="btn btn-outline block btn-lg" href="${esc(t.url)}" target="_blank" rel="noopener">${icon('external')} Visit official website</a>
        <p class="fine">Provider pricing and terms apply.</p>` : ''}
      </div>`;
  }

  // Resources
  pages.resources = () => {
    const s = ui.res;
    return `
      ${header('Resource Library', 'Resources', 'Practical templates and guides for your mobile growth work.', `<span class="pill pill-peach lg">${icon('gift')} All MoHL resources are free</span>`)}
      <div class="filter-row">
        ${searchBox('res-q', 'Search resources…', s.q, 'grow filled')}
        ${select('res-topic', [['all', 'All categories'], ...topics.map((t) => [t.id, t.name])], s.topic)}
        ${select('res-format', [['all', 'All formats'], ['XLSX', 'XLSX'], ['PDF', 'PDF'], ['DOCX', 'DOCX']], s.format)}
      </div>
      <div class="chips">${chips([['all', 'All resources'], ['Template', 'Templates'], ['Checklist', 'Checklists'], ['Worksheet', 'Worksheets'], ['Guide', 'Guides']], s.type, 'res-type')}</div>
      <div class="grid-4" data-list></div>
      <div class="banner">${icon('bookmark')}<span>Save useful resources to find them again in My Library.</span><a class="link" href="#/library">Open My Library ${icon('arrow', 'sm')}</a></div>`;
  };
  const resourceCard = (r) => `
    <article class="card res-card">
      <div class="res-thumb">${illus(r.illus)}${saveBtn('resource', r.id, 'corner')}</div>
      <div class="kicker">${topic(r.topic).name}</div>
      <h3>${r.title}</h3>
      <p>${r.blurb}</p>
      <span class="tag fmt-tag">${formatBadge(r.format)} ${r.type} · ${r.format}</span>
      <div class="btn-pair">
        <button class="btn btn-outline" data-preview="${r.id}">${icon('eye')} Preview</button>
        <button class="btn btn-primary" data-download="${r.id}">${icon('download')} Download</button>
      </div>
    </article>`;
  pages.resources.list = () => {
    const s = ui.res;
    const list = resources.filter((r) => (s.topic === 'all' || r.topic === s.topic) && (s.format === 'all' || r.format === s.format) && (s.type === 'all' || r.type === s.type) && match(s.q, r.title, r.blurb, topic(r.topic).name));
    return list.length ? list.map(resourceCard).join('') : empty('No resources match your filters.');
  };

  function previewResource(id) {
    const r = resource(id);
    const rows = r.format === 'XLSX'
      ? `<table class="preview-table"><thead><tr><th>Event name</th><th>Trigger</th><th>Parameters</th><th>Owner</th></tr></thead><tbody>
          <tr><td>sign_up</td><td>Account created</td><td>method</td><td>Product</td></tr>
          <tr><td>onboarding_complete</td><td>Last onboarding step</td><td>steps_seen</td><td>Product</td></tr>
          <tr><td>add_to_cart</td><td>Item added</td><td>item_id, price, currency</td><td>Growth</td></tr>
          <tr><td>purchase</td><td>Order confirmed</td><td>value, currency, items</td><td>Growth</td></tr>
          <tr class="blank"><td>…</td><td></td><td></td><td></td></tr></tbody></table>`
      : `<div class="preview-doc"><h4>${r.title}</h4>${['Objective', 'Inputs you need', 'Steps', 'Review'].map((h) => `<h5>${h}</h5><div class="line"></div><div class="line short"></div>`).join('')}</div>`;
    openModal(`
      <div class="kicker">${topic(r.topic).name}</div>
      <h2 class="modal-title">${r.title}</h2>
      <p class="muted">${r.blurb}</p>
      <span class="tag fmt-tag">${formatBadge(r.format)} ${r.type} · ${r.format}</span>
      <div class="preview-box">${rows}</div>
      <div class="modal-actions">
        ${saveBtn('resource', r.id)}
        <button class="btn btn-primary" data-download="${r.id}">${icon('download')} Download ${r.format}</button>
      </div>`, 'wide');
  }
  function download(id) {
    const r = resource(id);
    const csv = 'Event name,Trigger,Parameters,Owner\nsign_up,Account created,method,Product\npurchase,Order confirmed,"value, currency, items",Growth\n';
    const blob = new Blob([r.format === 'XLSX' ? csv : `${r.title}\n\n${r.blurb}\n\n(MoHL demo file)\n`], { type: 'text/plain' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${r.id}${r.format === 'XLSX' ? '.csv' : '.txt'}` });
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Downloading ${r.title} (demo file)`);
  }

  // Community
  const avatar = (p) => `<span class="avatar lg" style="background:${p.hue};color:${p.ink}">${esc(p.author)}</span>`;
  pages.community = (params, [postId]) => {
    if (postId) return discussion(postId);
    const s = ui.comm;
    return `
      ${header('Learn together', 'Community', 'Ask questions, share experiences and learn with other mobile marketers.',
        `<button class="btn btn-primary btn-lg" data-ask="">${icon('plus')} Ask a Question</button>`, '<span class="pill pill-peach title-badge">Demo content</span>')}
      <div class="comm-grid">
        <div>
          <div class="card search-card">${searchBox('comm-q', 'Search discussions…', s.q, 'grow filled')}</div>
          <div class="chips">${chips([['all', 'All Topics'], ...topics.map((t) => [t.id, t.community])], s.topic, 'comm-topic')}</div>
          <div class="card pad">
            <h2 class="section-title">Discussions</h2>
            <div class="tabs" role="tablist">${[['all', 'All'], ['Question', 'Questions'], ['Shared learning', 'Shared learnings']].map(([v, l]) => `<button role="tab" aria-selected="${s.tab === v}" class="${s.tab === v ? 'active' : ''}" data-comm-tab="${v}">${l}</button>`).join('')}</div>
            <div class="posts" data-list></div>
          </div>
        </div>
        <aside class="side-col">
          <div class="card pad peach intro-card">
            <div class="eyebrow">${icon('pin', 'sm')} Start here</div>
            <h2 class="section-title">Introduce yourself</h2>
            <p class="muted">Share your role, what you are working on and what you want to learn.</p>
            <button class="btn btn-primary" data-ask="intro">Join the introduction</button>
            <div class="cta-art">${icon('users')}</div>
          </div>
          <div class="card pad">
            <h2 class="section-title">Ask a useful question</h2>
            <ol class="tips">${[['Add context', 'Share what you are working on and why.'], ['Explain your goal', 'Tell us what you want to achieve.'], ['Share what you have tried', 'Include what you have already tested.']].map(([h, p], i) => `<li><span class="num">${i + 1}</span><div><strong>${h}</strong><p>${p}</p></div></li>`).join('')}</ol>
            <button class="link" data-action="guidelines">Community guidelines ${icon('arrow', 'sm')}</button>
          </div>
          <div class="card pad">
            <h2 class="section-title">Keep learning</h2>
            <p class="muted">Explore these related courses to build your skills.</p>
            <div class="list-card card">${courses.slice(0, 2).map((c) => `<a class="list-row" href="${courseHref(c)}">${icon('book')}<span>${c.title}</span>${icon('chevRight', 'sm')}</a>`).join('')}</div>
          </div>
        </aside>
      </div>`;
  };
  pages.community.list = () => {
    const s = ui.comm;
    const list = allPosts().filter((p) => (s.topic === 'all' || p.topic === s.topic) && (s.tab === 'all' || p.kind === s.tab) && match(s.q, p.title, p.body));
    return list.length ? list.map((p) => `
      <article class="post">
        <div class="post-author">${avatar(p)}<small>${esc(p.name)}</small></div>
        <div class="post-main">
          <div class="pills"><span class="tag peach">${topic(p.topic).community}</span><span class="tag blue">${p.kind}</span></div>
          <h3><a href="#/community/${p.id}">${esc(p.title)}</a></h3>
          <p>${esc(p.body)}</p>
        </div>
        <div class="post-side">
          ${saveBtn('post', p.id)}
          <a class="link" href="#/community/${p.id}">Open Discussion ${icon('arrow', 'sm')}</a>
        </div>
      </article>`).join('') : empty('No discussions match. Be the first to ask!');
  };
  function discussion(id) {
    const p = post(id);
    if (!p) return empty('Discussion not found.');
    const replies = p.replies;
    return `
      <nav class="crumbs"><a href="#/community">Community</a><span>/</span><span class="current">${topic(p.topic).community}</span></nav>
      <div class="comm-grid">
        <div class="card pad">
          <div class="post-full">
            ${avatar(p)}
            <div>
              <div class="pills"><span class="tag peach">${topic(p.topic).community}</span><span class="tag blue">${p.kind}</span></div>
              <h1 class="title sm">${esc(p.title)}</h1>
              <p class="lead">${esc(p.body)}</p>
            </div>
            ${saveBtn('post', p.id)}
          </div>
          <h3 class="sub-h">${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}</h3>
          <div class="replies">${replies.map((r) => `<div class="reply"><span class="avatar">${esc(r.author)}</span><div class="reply-body">${r.name ? `<strong>${esc(r.name)}</strong>` : ''}<p>${esc(r.text)}</p></div>${can('community') && r.id ? `<button class="icon-btn" data-delete-reply="${p.id}:${r.id}" aria-label="Delete reply">${icon('trash')}</button>` : ''}</div>`).join('') || '<p class="muted">No replies yet — share what you know.</p>'}</div>
          ${me && !canPost() ? `<div class="banner">${icon('eye')}<span>Your account is view-only, so you can read discussions but not reply.</span></div>` : me ? `<form class="reply-form" data-reply="${p.id}">
            <span class="avatar">${esc(initials(me.name))}</span>
            <textarea name="text" rows="3" placeholder="Write a helpful reply…" required></textarea>
            <button class="btn btn-primary" type="submit">Post reply</button>
          </form>` : `<div class="banner">${icon('login')}<span>Log in to reply to this discussion.</span><a class="btn btn-primary sm" href="#/login?next=${encodeURIComponent(`/community/${p.id}`)}">Log in</a></div>`}
        </div>
        <aside class="side-col">
          <div class="card pad">
            <h2 class="section-title sm">Learn more about ${topic(p.topic).short.toLowerCase()}</h2>
            <div class="list-card card">${courses.filter((c) => c.topic === p.topic).map((c) => `<a class="list-row" href="${courseHref(c)}">${icon('book')}<span>${c.title}</span>${icon('chevRight', 'sm')}</a>`).join('')}
            ${resources.filter((r) => r.topic === p.topic).map((r) => `<button class="list-row" data-preview="${r.id}">${icon('file')}<span>${r.title}</span>${icon('chevRight', 'sm')}</button>`).join('')}</div>
          </div>
        </aside>
      </div>`;
  }
  function askModal(preset = '') {
    const [ptopic, lessonTitle] = preset.split('|');
    const intro = preset === 'intro';
    openModal(`
      <h2 class="modal-title">${intro ? 'Introduce yourself' : 'Ask a question'}</h2>
      <p class="muted">${intro ? 'Tell the community about your role and goals.' : 'Add context, explain your goal and share what you have tried.'}</p>
      <form class="form" id="ask-form">
        <label>Title<input name="title" required maxlength="120" placeholder="${intro ? 'Hi, I’m… and I work on…' : 'What do you want to know?'}" value="${lessonTitle ? `Question about “${lessonTitle}”` : ''}"></label>
        <label>Topic${select('ask-topic', topics.map((t) => [t.id, t.name]), ptopic && topic(ptopic) ? ptopic : 'measurement')}</label>
        <label>Type${select('ask-kind', [['Question', 'Question'], ['Shared learning', 'Shared learning']], intro ? 'Shared learning' : 'Question')}</label>
        <label>Details<textarea name="body" rows="4" required placeholder="Share what you are working on, your goal, and what you’ve tried."></textarea></label>
        <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" type="submit">Post</button></div>
      </form>`);
  }

  // Library
  const libItems = () => [
    ...state.saved.course.map(course).filter(Boolean).map((c) => ({ kind: 'course', id: c.id, topic: c.topic, title: c.title, item: c })),
    ...state.saved.tool.map(tool).filter(Boolean).map((t) => ({ kind: 'tool', id: t.id, topic: t.topic, title: t.name, item: t })),
    ...state.saved.resource.map(resource).filter(Boolean).map((r) => ({ kind: 'resource', id: r.id, topic: r.topic, title: r.title, item: r })),
    ...state.saved.lesson.map((k) => { const [cid, i] = k.split(':'); const c = course(cid); return c && c.lessons[i] && { kind: 'lesson', id: k, topic: c.topic, title: c.lessons[i].title, item: c, idx: +i }; }).filter(Boolean),
    ...state.saved.post.map(post).filter(Boolean).map((p) => ({ kind: 'post', id: p.id, topic: p.topic, title: p.title, item: p })),
  ];
  pages.library = () => {
    const s = ui.lib;
    return `
      ${header('Saved for you', 'My Library', 'Your saved courses, tools and resources, together.', `<a class="btn btn-outline btn-lg" href="#/marketplace">${icon('cart')} Explore more</a>`)}
      <div class="filter-row">
        ${searchBox('lib-q', 'Search saved items…', s.q, 'grow')}
        ${select('lib-topic', [['all', 'All topics'], ...topics.map((t) => [t.id, t.name])], s.topic)}
      </div>
      <div class="chips" id="lib-tabs"></div>
      <div class="grid-3" data-list></div>
      <div class="banner big">${icon('bookmark')}<div><strong>See something useful?</strong><span>Save it here with the bookmark icon.</span></div>
        <a class="link" href="#/learn">Browse courses ${icon('arrow', 'sm')}</a><a class="link" href="#/marketplace">Explore tools ${icon('arrow', 'sm')}</a><a class="link" href="#/resources">Find resources ${icon('arrow', 'sm')}</a></div>`;
  };
  pages.library.list = () => {
    const s = ui.lib;
    const base = libItems().filter((x) => (s.topic === 'all' || x.topic === s.topic) && match(s.q, x.title));
    const count = (k) => base.filter((x) => (k === 'other' ? ['lesson', 'post'].includes(x.kind) : x.kind === k)).length;
    const tabs = [['all', `All (${base.length})`], ['course', `Courses (${count('course')})`], ['tool', `Tools (${count('tool')})`], ['resource', `Resources (${count('resource')})`]];
    if (count('other')) tabs.push(['other', `Lessons & posts (${count('other')})`]);
    $('#lib-tabs').innerHTML = chips(tabs, s.kind, 'lib-kind');
    const list = base.filter((x) => s.kind === 'all' || x.kind === s.kind || (s.kind === 'other' && ['lesson', 'post'].includes(x.kind)));
    if (!list.length) return empty(libItems().length ? 'Nothing saved matches your filters.' : 'Your library is empty. Use the bookmark icon on any course, tool or resource to save it.');
    return list.map((x) => {
      const t = topic(x.topic);
      const parts = {
        course: () => ({ art: illus(x.item.illus), kick: `Course`, sub: t.name, p: x.item.blurb, extra: `<div class="pills"><span class="pill pill-green">Free</span>${statusPill(x.item)}</div>`, cta: `<a class="btn btn-primary block" href="${courseHref(x.item)}">${startLabel(x.item)} ${icon('arrow')}</a>` }),
        tool: () => ({ art: toolLogo(x.item, 'xl'), kick: 'Tool', sub: t.name, p: x.item.blurb, cta: `<a class="btn btn-primary block" href="#/marketplace/${x.id}">View Tool ${icon('arrow')}</a>` }),
        resource: () => ({ art: illus(x.item.illus), kick: 'Resource', sub: `${x.item.type} · ${x.item.format}`, p: x.item.blurb, cta: `<button class="btn btn-primary block" data-preview="${x.id}">Preview Resource ${icon('arrow')}</button>` }),
        lesson: () => ({ art: illus(x.item.illus), kick: 'Lesson', sub: x.item.title, p: x.item.lessons[x.idx].heading, cta: `<a class="btn btn-primary block" href="#/learn/${x.item.id}/${x.idx + 1}">Open Lesson ${icon('arrow')}</a>` }),
        post: () => ({ art: avatar(x.item), kick: 'Discussion', sub: t.community, p: esc(x.item.body), cta: `<a class="btn btn-primary block" href="#/community/${x.id}">Open Discussion ${icon('arrow')}</a>` }),
      }[x.kind]();
      return `
        <article class="card lib-card">
          <div class="thumb">${parts.art}</div>
          <div class="lib-body">
            <div class="kicker">${parts.kick}<br>${parts.sub}</div>
            <h3>${esc(x.title)}</h3>
            <p>${parts.p}</p>
            ${parts.extra || ''}
            ${parts.cta}
          </div>
          ${saveBtn(x.kind, x.id, 'corner')}
        </article>`;
    }).join('');
  };

  pages.help = () => `
    ${header('Help', 'How can we help?', 'Answers to common questions about MoHL.')}
    <div class="faq">${[
      ['Is MoHL free?', 'Yes. All MoHL courses and resources are free during launch. Third-party tools in the Marketplace have their own plans.'],
      ['How do I save something?', 'Use the bookmark icon on any course, lesson, tool, resource or discussion. Everything you save appears in My Library.'],
      ['Is my progress saved?', 'In this prototype, progress and saved items are stored in your browser.'],
      ['Who can see my community posts?', 'Community content in this prototype is demo content and stays in your browser.'],
    ].map(([q, a]) => `<details class="card pad"><summary>${q}${icon('chevDown')}</summary><p>${a}</p></details>`).join('')}</div>`;

  pages.settings = () => me ? `
    ${header('Settings', 'Settings', 'Manage your profile.')}
    <div class="card pad settings">
      <form class="form" id="settings-form">
        <label>Full name<input value="${esc(me.name)}" name="name" required maxlength="80"></label>
        <label>Email<input value="${esc(me.email)}" disabled></label>
        <div class="modal-actions"><button class="btn btn-outline" type="button" data-action="reset">Clear my saved items</button><button class="btn btn-primary" type="submit">Save changes</button></div>
      </form>
    </div>` : authPage('login');

  // ---------- accounts ----------
  function authPage(mode) {
    const signup = mode === 'signup';
    const next = new URLSearchParams(location.hash.split('?')[1] || '').get('next') || '';
    const q = next ? `?next=${encodeURIComponent(next)}` : '';
    return `
      <div class="auth">
        <div class="card pad auth-card">
          <div class="eyebrow">${signup ? 'Join MoHL' : 'Welcome back'}</div>
          <h1 class="title sm">${signup ? 'Create your account' : 'Log in to MoHL'}</h1>
          <p class="muted">${signup ? 'Free access to courses, tools and the community.' : 'Pick up where you left off.'}</p>
          <form class="form" id="auth-form" data-mode="${mode}" data-next="${esc(next)}">
            ${signup ? '<label>Full name<input name="name" autocomplete="name" required maxlength="80"></label>' : ''}
            <label>Email<input name="email" type="email" autocomplete="email" required></label>
            <label>Password<input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required ${signup ? 'minlength="8"' : ''}></label>
            ${signup ? '<p class="fine left">At least 8 characters.</p>' : ''}
            <p class="form-error" id="auth-error" role="alert" hidden></p>
            <button class="btn btn-primary btn-lg block" type="submit">${signup ? 'Create account' : 'Log in'}</button>
          </form>
          <p class="auth-switch">${signup ? `Already have an account? <a class="link" href="#/login${q}">Log in</a>` : `New to MoHL? <a class="link" href="#/signup${q}">Create an account</a>`}</p>
        </div>
      </div>`;
  }
  pages.login = () => (me ? (location.replace('#/home'), '') : authPage('login'));
  pages.signup = () => (me ? (location.replace('#/home'), '') : authPage('signup'));

  // ---------- admin ----------
  const ILLUS_OPTS = Object.keys(ILL).map((k) => [k, k]);
  const topicOpts = () => topics.map((t) => [t.id, t.name]);
  const none = (label) => [['', `— No ${label} —`]];
  // Field definitions drive both the admin forms and what gets sent to the server.
  const ADMIN = {
    tools: {
      label: 'Marketplace tools', single: 'tool', icon: 'cart', title: (x) => x.name,
      sub: (x) => topic(x.topic)?.name, list: () => tools,
      fields: () => [
        ['name', 'Name', 'text', { required: true }], ['topic', 'Category', 'select', { options: topicOpts() }],
        ['blurb', 'Short description', 'text', { required: true }], ['what', 'What it does', 'textarea'],
        ['url', 'Official website', 'url'], ['video', 'Video (YouTube, Vimeo or .mp4 link)', 'url'],
        ['course', 'Related course', 'select', { options: [...none('course'), ...courses.map((c) => [c.id, c.title])] }],
        ['resource', 'Related resource', 'select', { options: [...none('resource'), ...resources.map((r) => [r.id, r.title])] }],
        ['guide', 'Getting started steps (one per line)', 'lines'],
        ['mono', 'Logo letters (blank = from name)', 'text', { maxlength: 3 }], ['color', 'Logo colour', 'color'],
      ],
    },
    courses: {
      label: 'Courses & videos', single: 'course', icon: 'cap', title: (x) => x.title,
      sub: (x) => `${topic(x.topic)?.name} · ${x.lessons.length} lessons · ${x.lessons.filter((l) => l.video).length} videos`, list: () => courses,
      fields: () => [
        ['title', 'Title', 'text', { required: true }], ['topic', 'Topic', 'select', { options: topicOpts() }],
        ['level', 'Level', 'select', { options: ['Beginner', 'Intermediate', 'Advanced'].map((l) => [l, l]) }],
        ['blurb', 'Short description', 'text', { required: true }], ['illus', 'Illustration', 'select', { options: ILLUS_OPTS }],
        ['tool', 'Related tool', 'select', { options: [...none('tool'), ...tools.map((t) => [t.id, t.name])] }],
        ['resource', 'Related resource', 'select', { options: [...none('resource'), ...resources.map((r) => [r.id, r.title])] }],
      ],
    },
    resources: {
      label: 'Resources', single: 'resource', icon: 'file', title: (x) => x.title,
      sub: (x) => `${x.type} · ${x.format} · ${topic(x.topic)?.name}`, list: () => resources,
      fields: () => [
        ['title', 'Title', 'text', { required: true }], ['topic', 'Category', 'select', { options: topicOpts() }],
        ['type', 'Type', 'select', { options: ['Template', 'Checklist', 'Worksheet', 'Guide'].map((v) => [v, v]) }],
        ['format', 'Format', 'select', { options: ['XLSX', 'PDF', 'DOCX'].map((v) => [v, v]) }],
        ['blurb', 'Short description', 'text', { required: true }], ['illus', 'Illustration', 'select', { options: ILLUS_OPTS }],
      ],
    },
    posts: {
      label: 'Community questions', single: 'question', icon: 'users', title: (x) => x.title,
      sub: (x) => `${x.kind} · ${topic(x.topic)?.community} · ${x.replies.length} replies · by ${x.name}`, list: () => posts,
      fields: () => [
        ['title', 'Title', 'text', { required: true }], ['body', 'Details', 'textarea', { required: true }],
        ['topic', 'Topic', 'select', { options: topicOpts() }],
        ['kind', 'Type', 'select', { options: [['Question', 'Question'], ['Shared learning', 'Shared learning']] }],
      ],
    },
  };
  const LESSON_FIELDS = [
    ['title', 'Lesson title', 'text', { required: true }], ['video', 'Video (YouTube, Vimeo or .mp4 link)', 'url'],
    ['heading', 'Heading', 'text'], ['intro', 'Introduction', 'textarea'],
    ['example.label', 'Example — app type', 'text'], ['example.title', 'Example — title', 'text'], ['example.text', 'Example — text', 'textarea'],
    ['steps', 'Things to write down (one per line)', 'lines'], ['yourTurn', '“Your turn” task', 'textarea'],
  ];
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function field([name, label, type, opt = {}], value, prefix = '') {
    const n = `${prefix}${name}`;
    const v = value ?? '';
    const req = opt.required ? 'required' : '';
    let input;
    if (type === 'select') input = `<label class="select">${icon('chevDown')}<select name="${n}">${opt.options.map(([ov, ol]) => `<option value="${esc(ov)}" ${ov === v ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select></label>`;
    else if (type === 'textarea') input = `<textarea name="${n}" rows="3" ${req}>${esc(v)}</textarea>`;
    else if (type === 'lines') input = `<textarea name="${n}" rows="3">${esc((v || []).join('\n'))}</textarea>`;
    else if (type === 'color') input = `<input type="color" name="${n}" value="${esc(v || '#B4501E')}">`;
    else input = `<input type="${type === 'url' ? 'url' : 'text'}" name="${n}" value="${esc(v)}" ${req} ${opt.maxlength ? `maxlength="${opt.maxlength}"` : ''} ${type === 'url' ? 'placeholder="https://…"' : ''}>`;
    return `<label class="${type === 'textarea' || type === 'lines' ? 'wide' : ''}">${label}${input}</label>`;
  }
  const lessonBlock = (l = {}, i = 0) => `
    <fieldset class="lesson-block" data-lesson>
      <legend>Lesson <span data-lesson-num>${i + 1}</span></legend>
      <div class="lesson-tools">
        <button type="button" class="icon-btn" data-lesson-move="-1" aria-label="Move up">${icon('chevDown', 'flip')}</button>
        <button type="button" class="icon-btn" data-lesson-move="1" aria-label="Move down">${icon('chevDown')}</button>
        <button type="button" class="icon-btn" data-lesson-remove aria-label="Remove lesson">${icon('trash')}</button>
      </div>
      <div class="form-grid">${LESSON_FIELDS.map((f) => field(f, getPath(l, f[0]), 'l.')).join('')}</div>
    </fieldset>`;

  pages.admin = (params) => {
    if (!me) return authPage('login');
    if (!isStaff()) return empty('Your role doesn’t have access to the admin area.');
    // Each role only sees the tabs it is allowed to manage.
    const tabs = Object.keys(ADMIN).filter((k) => can(k === 'posts' ? 'community' : 'content'));
    if (can('members')) tabs.push('users');
    const tab = tabs.includes(params.get('tab')) ? params.get('tab') : tabs[0];
    const users = tab === 'users';
    const cfg = ADMIN[tab];
    const items = users ? [] : cfg.list();
    return `
      ${header('Admin', 'Manage content', `You’re signed in as <strong>${roleLabel(me.role)}</strong>: ${ROLES[me.role].desc.toLowerCase()}.`,
        users ? `<button class="btn btn-primary btn-lg" data-action="add-member">${icon('plus')} Add member</button>`
          : `<button class="btn btn-primary btn-lg" data-admin-new="${tab}">${icon('plus')} Add ${cfg.single}</button>`)}
      <div class="chips">${tabs.map((k) => `<a class="chip ${k === tab ? 'active' : ''}" href="#/admin?tab=${k}">${k === 'users' ? 'Members' : `${ADMIN[k].label} (${ADMIN[k].list().length})`}</a>`).join('')}</div>
      ${users ? '<div class="card" id="admin-users"><p class="muted pad-cell">Loading members…</p></div>' : `
      <div class="card admin-list">${items.map((x) => `
        <div class="admin-row">
          <span class="admin-ic">${icon(cfg.icon)}</span>
          <div class="admin-main"><strong>${esc(cfg.title(x))}</strong><small>${esc(cfg.sub(x) || '')}</small></div>
          <button class="btn btn-outline sm" data-admin-edit="${tab}:${x.id}">${icon('edit', 'sm')} Edit</button>
          <button class="icon-btn danger" data-admin-delete="${tab}:${x.id}" aria-label="Delete ${esc(cfg.title(x))}">${icon('trash')}</button>
        </div>`).join('') || empty(`No ${cfg.label.toLowerCase()} yet.`)}</div>`}`;
  };

  function adminForm(kind, id) {
    const cfg = ADMIN[kind];
    const item = id ? cfg.list().find((x) => x.id === id) : null;
    const defaults = { topic: topics[0]?.id, color: '#B4501E', lessons: [{}] };
    const data = item || defaults;
    openModal(`
      <h2 class="modal-title">${item ? 'Edit' : 'Add'} ${cfg.single}</h2>
      <form class="form" id="admin-form" data-kind="${kind}" data-id="${item ? item.id : ''}">
        <div class="form-grid">${cfg.fields().map((f) => field(f, data[f[0]])).join('')}</div>
        ${kind === 'courses' ? `
          <h3 class="sub-h">Lessons & videos</h3>
          <div id="lessons">${(data.lessons || []).map(lessonBlock).join('')}</div>
          <button type="button" class="btn btn-outline" data-lesson-add>${icon('plus')} Add lesson</button>` : ''}
        <p class="form-error" id="admin-error" role="alert" hidden></p>
        <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" type="submit">${item ? 'Save changes' : `Add ${cfg.single}`}</button></div>
      </form>`, 'wide');
  }
  function readAdminForm(form) {
    const kind = form.dataset.kind;
    const out = {};
    const val = (el, type) => (type === 'lines' ? el.value.split('\n').map((s) => s.trim()).filter(Boolean) : el.value);
    for (const [name, , type] of ADMIN[kind].fields()) out[name] = val(form.elements[name], type);
    if (kind === 'courses') {
      out.lessons = $$('[data-lesson]', form).map((fs) => {
        const l = { example: {} };
        for (const [name, , type] of LESSON_FIELDS) {
          const v = val($(`[name="l.${name}"]`, fs), type);
          if (name.startsWith('example.')) l.example[name.slice(8)] = v; else l[name] = v;
        }
        return l;
      });
    }
    return out;
  }
  function memberForm() {
    openModal(`
      <h2 class="modal-title">Add member</h2>
      <p class="muted">Create an account and choose what this person can do. Share the email and password with them so they can log in.</p>
      <form class="form" id="member-form">
        <div class="form-grid">
          <label>Full name<input name="name" required maxlength="80" autocomplete="off"></label>
          <label>Email<input name="email" type="email" required autocomplete="off"></label>
          <label class="wide">Password
            <span class="pw-row"><input name="password" type="text" required minlength="8" autocomplete="new-password" spellcheck="false">
            <button type="button" class="btn btn-outline sm" data-action="gen-password">Generate</button></span>
            <small class="muted">At least 8 characters.</small>
          </label>
        </div>
        <fieldset class="role-pick">
          <legend>Role</legend>
          ${Object.entries(ROLES).map(([r, info]) => `
            <label class="role-option"><input type="radio" name="role" value="${r}" ${r === 'member' ? 'checked' : ''}>
              <span><strong>${info.label}</strong><small>${info.desc}</small></span></label>`).join('')}
        </fieldset>
        <p class="form-error" id="member-error" role="alert" hidden></p>
        <div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary" type="submit">Add member</button></div>
      </form>`, 'wide');
  }
  const renumberLessons = () => $$('[data-lesson-num]').forEach((el, i) => (el.textContent = i + 1));
  async function loadMembers() {
    const box = $('#admin-users');
    if (!box) return;
    try {
      const users = await api('admin/users');
      box.innerHTML = `<div class="admin-list">${users.map((u) => `
        <div class="admin-row">
          <span class="avatar">${esc(initials(u.name))}</span>
          <div class="admin-main"><strong>${esc(u.name)}</strong><small>${esc(u.email)} · joined ${new Date(u.createdAt).toLocaleDateString()}</small></div>
          ${u.id === me.id
            ? `<span class="pill pill-peach">${roleLabel(u.role)}</span><span class="muted sm-text">You</span>`
            : `<label class="select role-select" title="${esc(ROLES[u.role]?.desc || '')}">${icon('chevDown')}<select data-role-for="${u.id}" aria-label="Role for ${esc(u.name)}">${Object.entries(ROLES).map(([r, info]) => `<option value="${r}" ${r === u.role ? 'selected' : ''}>${info.label}</option>`).join('')}</select></label>
              <button class="icon-btn danger" data-remove-member="${u.id}" data-name="${esc(u.name)}" aria-label="Remove ${esc(u.name)}">${icon('trash')}</button>`}
        </div>`).join('')}</div>
      <div class="role-legend">${Object.entries(ROLES).map(([, info]) => `<div><strong>${info.label}</strong><span>${info.desc}</span></div>`).join('')}</div>`;
    } catch (err) { box.innerHTML = `<p class="form-error pad-cell">${esc(err.message)}</p>`; }
  }

  // ---------- router ----------
  let current = null;
  function route() {
    const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
    const [name = 'home', ...rest] = path.split('/').filter(Boolean);
    const params = new URLSearchParams(query);
    let view = name, args = rest;
    if (name === 'learn' && rest.length) view = 'lesson';
    if (!pages[view]) view = 'home';
    current = view;
    const page = $('#page');
    page.innerHTML = pages[view](params, args);
    refreshList();
    const navKey = view === 'lesson' ? 'learn' : view;
    $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === navKey));
    document.body.classList.remove('nav-open');
    closeUserMenu();
    if (view === 'admin') loadMembers();
    window.scrollTo(0, 0);
    page.focus({ preventScroll: true });
  }
  function refreshList() {
    const el = $('[data-list]');
    if (el && pages[current].list) el.innerHTML = pages[current].list();
  }
  const rerender = () => {
    // keep the filter input focus while re-rendering lists only
    if (pages[current]?.list) refreshList(); else route();
  };

  // ---------- events ----------
  const INPUTS = {
    'learn-q': (v) => (ui.learn.q = v), 'learn-level': (v) => (ui.learn.level = v),
    'market-q': (v) => (ui.market.q = v),
    'res-q': (v) => (ui.res.q = v), 'res-topic': (v) => (ui.res.topic = v), 'res-format': (v) => (ui.res.format = v),
    'comm-q': (v) => (ui.comm.q = v),
    'lib-q': (v) => (ui.lib.q = v), 'lib-topic': (v) => (ui.lib.topic = v),
  };
  // Role picker in Admin → Members.
  document.addEventListener('change', (e) => {
    const uid = e.target.dataset && e.target.dataset.roleFor;
    if (!uid) return;
    api(`admin/users/${uid}`, { method: 'PUT', body: { role: e.target.value } })
      .then((u) => { toast(`${u.name} is now ${roleLabel(u.role)}`); loadMembers(); })
      .catch((err) => { toast(err.message); loadMembers(); });
  });

  document.addEventListener('input', (e) => {
    const fn = INPUTS[e.target.id];
    if (fn) { fn(e.target.value); refreshList(); }
  });

  const CHIP_GROUPS = {
    'learn-topic': (v) => (ui.learn.topic = v), 'market-topic': (v) => (ui.market.topic = v),
    'res-type': (v) => (ui.res.type = v), 'comm-topic': (v) => (ui.comm.topic = v), 'lib-kind': (v) => (ui.lib.kind = v),
  };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, [data-select-tool]');
    if (!e.target.closest('#user')) closeUserMenu();
    if (!t) return;
    const d = t.dataset;

    for (const key of Object.keys(CHIP_GROUPS)) {
      const attr = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (d[attr] !== undefined) {
        CHIP_GROUPS[key](d[attr]);
        $$(`[data-${key}]`).forEach((b) => b.classList.toggle('active', b === t));
        refreshList();
        return;
      }
    }

    if (d.save) {
      e.stopPropagation();
      const [kind, ...idParts] = d.save.split(':');
      toggleSave(kind, idParts.join(':'));
      if (t.closest('.modal')) { t.outerHTML = saveBtn(kind, idParts.join(':')); refreshList(); return; }
      if (current === 'lesson') return route();
      if (current === 'marketplace') return refreshList();
      if (current === 'community' && location.hash.split('/').length > 2) return route();
      return rerender();
    }
    if (d.selectTool) { ui.market.selected = d.selectTool; history.replaceState(null, '', `#/marketplace/${d.selectTool}`); refreshList(); if (innerWidth < 1100) $('#tool-panel').scrollIntoView({ behavior: 'smooth' }); return; }
    if (d.preview) return previewResource(d.preview);
    if (d.download) return download(d.download);
    if (d.ask !== undefined) {
      if (!requireLogin()) return;
      return canPost() ? askModal(d.ask) : toast('Your account is view-only, so you can’t post');
    }
    if (d.adminNew) return adminForm(d.adminNew);
    if (d.adminEdit) { const [k, id] = d.adminEdit.split(':'); return adminForm(k, id); }
    if (d.adminDelete) {
      const [k, id] = d.adminDelete.split(':');
      const item = ADMIN[k].list().find((x) => x.id === id);
      if (!confirm(`Delete “${ADMIN[k].title(item)}”? This cannot be undone.`)) return;
      api(`admin/${k}/${id}`, { method: 'DELETE' })
        .then(async () => { await loadContent(); route(); toast('Deleted'); })
        .catch((err) => toast(err.message));
      return;
    }
    if (d.deleteReply) {
      const [pid, rid] = d.deleteReply.split(':');
      if (!confirm('Delete this reply?')) return;
      api(`posts/${pid}/replies/${rid}`, { method: 'DELETE' })
        .then(async () => { await loadContent(); route(); toast('Reply deleted'); })
        .catch((err) => toast(err.message));
      return;
    }
    if (d.lessonAdd !== undefined) { $('#lessons').insertAdjacentHTML('beforeend', lessonBlock({}, $$('[data-lesson]').length)); $('#lessons [data-lesson]:last-child input').focus(); return; }
    if (d.lessonRemove !== undefined) {
      if ($$('[data-lesson]').length === 1) return toast('A course needs at least one lesson');
      t.closest('[data-lesson]').remove(); return renumberLessons();
    }
    if (d.lessonMove) {
      const fs = t.closest('[data-lesson]');
      const sib = d.lessonMove === '-1' ? fs.previousElementSibling : fs.nextElementSibling;
      if (sib) d.lessonMove === '-1' ? sib.before(fs) : sib.after(fs);
      return renumberLessons();
    }
    if (d.commTab) { ui.comm.tab = d.commTab; $$('[data-comm-tab]').forEach((b) => { b.classList.toggle('active', b === t); b.setAttribute('aria-selected', b === t); }); return refreshList(); }
    if (d.guide) { const [tid] = d.guide.split(':'); location.hash = courseHref(course(tool(tid).course)); return; }
    if (d.close !== undefined) return closeModal();

    if (d.complete || d.toggleDone) {
      const [cid, i] = (d.complete || d.toggleDone).split(':');
      const list = (state.progress[cid] ||= []);
      const idx = +i, has = list.includes(idx);
      if (d.toggleDone && has) list.splice(list.indexOf(idx), 1);
      else if (!has) list.push(idx);
      persist();
      const c = course(cid);
      if (d.complete) {
        if (idx < c.lessons.length - 1) { location.hash = `#/learn/${cid}/${idx + 2}`; toast('Lesson complete'); }
        else { toast(list.length === c.lessons.length ? `Course complete — nice work!` : 'Lesson complete'); route(); }
      } else route();
      return;
    }

    if (d.removeMember) {
      if (!confirm(`Remove ${d.name}? Their account will be deleted and they will be logged out.`)) return;
      api(`admin/users/${d.removeMember}`, { method: 'DELETE' }).then(() => { toast(`${d.name} removed`); loadMembers(); }).catch((err) => toast(err.message));
      return;
    }

    switch (d.action) {
      case 'add-member': return memberForm();
      case 'gen-password': {
        const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const pick = crypto.getRandomValues(new Uint32Array(12));
        $('#member-form').elements.password.value = [...pick].map((n) => chars[n % chars.length]).join('');
        return;
      }
      case 'saved-tools': ui.market.savedOnly = !ui.market.savedOnly; return route();
      case 'close-panel': ui.market.selected = null; history.replaceState(null, '', '#/marketplace'); return refreshList();
      case 'reset':
        try { localStorage.removeItem(key()); } catch {}
        loadState();
        toast('Saved items and progress cleared');
        return route();
      case 'signout':
        api('auth/logout', { method: 'POST' }).finally(() => {
          me = null;
          loadState();
          renderChrome();
          location.hash = '#/home';
          route();
          toast('Logged out');
        });
        return;
      case 'guidelines': return openModal(`<h2 class="modal-title">Community guidelines</h2><ul class="guidelines"><li>Be kind and assume good intent.</li><li>Share context so others can help.</li><li>No sharing of personal or customer data.</li><li>No promotion without disclosure.</li><li>Credit others’ work and ideas.</li></ul><div class="modal-actions"><button class="btn btn-primary" data-close>Got it</button></div>`);
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
    else if (e.key === 'Escape') { if (!$('#modal-root').hidden) closeModal(); closeUserMenu(); document.body.classList.remove('nav-open'); }
    else if (e.key === 'Enter' && e.target.matches('[data-select-tool]')) e.target.click();
  });

  // Disables the submit button while a request runs and shows server errors inline.
  async function submitting(form, errorEl, work) {
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    if (errorEl) errorEl.hidden = true;
    try { await work(); } catch (err) {
      if (err.status === 401 && form.id !== 'auth-form') { closeModal(); me = null; renderChrome(); requireLogin(); return; }
      if (errorEl) { errorEl.textContent = err.message; errorEl.hidden = false; } else toast(err.message);
    } finally { btn.disabled = false; }
  }

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'auth-form') {
      submitting(f, $('#auth-error'), async () => {
        const body = { email: f.email.value, password: f.password.value };
        if (f.dataset.mode === 'signup') body.name = f.name.value;
        ({ me } = await api(`auth/${f.dataset.mode}`, { method: 'POST', body }));
        loadState();
        renderChrome();
        toast(f.dataset.mode === 'signup' ? `Welcome to MoHL, ${me.name.split(' ')[0]}!` : `Welcome back, ${me.name.split(' ')[0]}`);
        location.hash = `#${f.dataset.next || (isStaff() && f.dataset.mode === 'signup' ? '/admin' : '/home')}`;
      });
    } else if (f.id === 'ask-form') {
      submitting(f, null, async () => {
        const p = await api('posts', { method: 'POST', body: { topic: $('#ask-topic').value, kind: $('#ask-kind').value, title: f.title.value, body: f.body.value } });
        await loadContent();
        closeModal();
        toast('Posted to the community');
        location.hash = `#/community/${p.id}`;
      });
    } else if (f.dataset.reply) {
      submitting(f, null, async () => {
        await api(`posts/${f.dataset.reply}/replies`, { method: 'POST', body: { text: f.text.value } });
        await loadContent();
        route();
        toast('Reply posted');
      });
    } else if (f.id === 'admin-form') {
      submitting(f, $('#admin-error'), async () => {
        const { kind, id } = f.dataset;
        await api(id ? `admin/${kind}/${id}` : `admin/${kind}`, { method: id ? 'PUT' : 'POST', body: readAdminForm(f) });
        await loadContent();
        closeModal();
        route();
        toast(id ? 'Changes saved' : `${ADMIN[kind].single[0].toUpperCase()}${ADMIN[kind].single.slice(1)} added`);
      });
    } else if (f.id === 'member-form') {
      submitting(f, $('#member-error'), async () => {
        const u = await api('admin/users', { method: 'POST', body: { name: f.elements.name.value, email: f.elements.email.value, password: f.elements.password.value, role: f.elements.role.value } });
        closeModal();
        toast(`${u.name} added as ${roleLabel(u.role)}`);
        loadMembers();
      });
    } else if (f.id === 'settings-form') {
      submitting(f, null, async () => {
        ({ me } = await api('auth/me', { method: 'PUT', body: { name: f.name.value } }));
        renderChrome();
        route();
        toast('Settings saved');
      });
    }
  });

  $('#modal-root').addEventListener('click', (e) => { if (e.target.id === 'modal-root') closeModal(); });
  $('#menu-btn').addEventListener('click', () => document.body.classList.add('nav-open'));
  $('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
  $('#global-search').addEventListener('click', openPalette);

  // ---------- command palette ----------
  function openPalette() {
    openModal(`
      ${searchBox('palette-q', 'Search courses, tools and resources…', '', 'grow filled')}
      <div class="palette-results" id="palette-results"></div>`, 'palette');
    const input = $('#palette-q');
    let sel = 0;
    const paint = () => {
      const q = input.value.trim();
      const groups = [
        ['Courses', courses.filter((c) => match(q, c.title, c.blurb, topic(c.topic).name)).map((c) => ({ label: c.title, sub: topic(c.topic).name, href: courseHref(c), ic: 'cap' }))],
        ['Tools', tools.filter((t) => match(q, t.name, t.blurb, topic(t.topic).name)).map((t) => ({ label: t.name, sub: topic(t.topic).name, href: `#/marketplace/${t.id}`, ic: 'cart' }))],
        ['Resources', resources.filter((r) => match(q, r.title, r.blurb, r.type)).map((r) => ({ label: r.title, sub: `${r.type} · ${r.format}`, preview: r.id, ic: 'file' }))],
        ['Discussions', allPosts().filter((p) => q && match(q, p.title, p.body)).map((p) => ({ label: p.title, sub: topic(p.topic).community, href: `#/community/${p.id}`, ic: 'users' }))],
      ].map(([g, items]) => [g, items.slice(0, q ? 6 : 3)]).filter(([, items]) => items.length);
      let i = 0;
      $('#palette-results').innerHTML = groups.length ? groups.map(([g, items]) => `<div class="pal-group">${g}</div>${items.map((it) => `
        <${it.href ? `a href="${it.href}"` : `button data-preview="${it.preview}"`} class="pal-item ${i++ === sel ? 'sel' : ''}">${icon(it.ic)}<span>${esc(it.label)}</span><small>${esc(it.sub)}</small></${it.href ? 'a' : 'button'}>`).join('')}`).join('') : empty(`No results for “${esc(q)}”`);
    };
    input.addEventListener('input', () => { sel = 0; paint(); });
    input.addEventListener('keydown', (e) => {
      const items = $$('.pal-item');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; paint(); $('.pal-item.sel')?.scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter') { e.preventDefault(); items[sel]?.click(); }
    });
    $('#palette-results').addEventListener('click', (e) => { if (e.target.closest('a.pal-item')) closeModal(); });
    paint();
  }

  window.addEventListener('hashchange', () => { closeModal(); route(); });
  if (!location.hash) history.replaceState(null, '', '#/home');
  try {
    await loadContent();
  } catch {
    $('#page').innerHTML = empty('Could not reach the MoHL server. Start it with “ruby server.rb” and reload.');
    return;
  }
  loadState();
  renderChrome();
  route();
})();
