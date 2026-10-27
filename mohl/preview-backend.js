// Preview mode: a stand-in for server.rb that runs entirely in the visitor's browser.
// Used when the app is hosted without its server (e.g. GitHub Pages). It mirrors the
// server's routes and permission rules, but everything is stored in this browser only.
window.MOHL_PREVIEW = (() => {
  const DB_KEY = 'mohl-preview-db-v1';
  const SESSION_KEY = 'mohl-preview-session-v1';
  const ROLES = ['admin', 'editor', 'moderator', 'member', 'viewer'];
  const AREAS = { content: ['admin', 'editor'], community: ['admin', 'moderator'], members: ['admin'] };
  const PALETTE = [['#FCE3D2', '#B4501E'], ['#E1E9FB', '#1F3A8A'], ['#DDF3E6', '#1E7B43'], ['#EEE3FA', '#6B3FA0']];
  let db = null;

  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const store = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const save = () => store(DB_KEY, JSON.stringify(db));
  const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const clean = (v) => (typeof v === 'string' ? v.replace(/[<>]/g, '').trim()
    : Array.isArray(v) ? v.map(clean) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v);
  const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, role: u.role };
  const lines = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((s) => s.trim()).filter(Boolean);
  const req = (o, k, label) => { const v = String(o[k] ?? '').trim(); if (!v) fail(422, `${label} is required`); return v; };
  const url = (v, label) => { v = String(v || '').trim(); if (v && !/^https?:\/\/\S+$/.test(v)) fail(422, `${label} must start with http:// or https://`); return v; };
  const topic = (id) => { if (!db.topics.some((t) => t.id === id)) fail(422, 'Pick a valid topic'); return id; };
  const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);

  async function hash(password, salt) {
    const bytes = new TextEncoder().encode(`${salt}:${password}`);
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function init() {
    if (db) return;
    try { db = JSON.parse(read(DB_KEY)); } catch {}
    if (!db) {
      const seed = await (await fetch('seed.json')).json();
      db = { topics: seed.topics, courses: seed.courses, tools: seed.tools, resources: seed.resources, posts: seed.posts, videos: seed.videos || [], users: [] };
      save();
    }
    // Preview data saved before the videos section existed starts with the seed videos.
    if (!db.videos) { db.videos = (await (await fetch('seed.json')).json()).videos || []; save(); }
  }

  const me = () => db.users.find((u) => u.id === read(SESSION_KEY));
  const user = () => me() || fail(401, 'Please log in first');
  const allowed = (area) => { const u = user(); if (!AREAS[area].includes(u.role)) fail(403, `Your role can't manage ${area}`); return u; };
  const poster = () => { const u = user(); if (u.role === 'viewer') fail(403, 'Your account can view content but not post'); return u; };

  async function createUser(b, role) {
    const name = clean(String(b.name || ''));
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!name) fail(422, 'Please enter a name');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(422, 'Please enter a valid email');
    if (password.length < 8) fail(422, 'Password must be at least 8 characters');
    if (db.users.some((u) => u.email === email)) fail(409, 'An account with this email already exists');
    const salt = hex(16);
    const u = { id: `u${hex(6)}`, name, email, salt, hash: await hash(password, salt), role, createdAt: new Date().toISOString() };
    db.users.push(u);
    save();
    return u;
  }

  function buildItem(kind, b) {
    if (kind === 'tools') return {
      name: req(b, 'name', 'Name'), topic: topic(b.topic), mono: (String(b.mono || '').trim() || initials(b.name)).slice(0, 3),
      color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#B4501E', blurb: req(b, 'blurb', 'Short description'), what: String(b.what || ''),
      course: String(b.course || ''), resource: String(b.resource || ''), guide: lines(b.guide), url: url(b.url, 'Website'), video: url(b.video, 'Video URL'),
    };
    if (kind === 'resources') return {
      title: req(b, 'title', 'Title'), topic: topic(b.topic), type: pick(b.type, ['Template', 'Checklist', 'Worksheet', 'Guide'], 'Template'),
      format: pick(b.format, ['XLSX', 'PDF', 'DOCX'], 'PDF'), blurb: req(b, 'blurb', 'Short description'), illus: b.illus || 'doc',
    };
    if (kind === 'courses') {
      const lessons = (b.lessons || []).map((l) => ({
        title: req(l, 'title', 'Lesson title'), heading: String(l.heading || ''), intro: String(l.intro || ''), video: url(l.video, 'Lesson video URL'),
        example: { label: String(l.example?.label || ''), title: String(l.example?.title || ''), text: String(l.example?.text || '') },
        steps: lines(l.steps), yourTurn: String(l.yourTurn || ''),
      }));
      if (!lessons.length) fail(422, 'A course needs at least one lesson');
      return {
        title: req(b, 'title', 'Title'), topic: topic(b.topic), level: pick(b.level, ['Beginner', 'Intermediate', 'Advanced'], 'Beginner'),
        illus: b.illus || 'measure', blurb: req(b, 'blurb', 'Short description'), resource: String(b.resource || ''), tool: String(b.tool || ''), lessons,
      };
    }
    if (kind === 'videos') {
      const link = url(b.url, 'Video link');
      if (!link) fail(422, 'Video link is required');
      return { title: req(b, 'title', 'Title'), url: link, topic: topic(b.topic), tool: String(b.tool || '').trim(), blurb: String(b.blurb || '').trim() };
    }
    if (kind === 'posts') return { title: req(b, 'title', 'Title'), body: req(b, 'body', 'Details'), topic: topic(b.topic), kind: b.kind === 'Shared learning' ? 'Shared learning' : 'Question' };
    fail(404, 'Unknown collection');
  }

  const newPost = (fields, u) => {
    const [hue, ink] = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    return { ...fields, id: `p${hex(4)}`, author: initials(u.name), name: u.name, userId: u.id, hue, ink, replies: [], createdAt: new Date().toISOString() };
  };
  const slug = (text, list) => {
    const base = String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'item';
    let id = base;
    while (list.some((x) => x.id === id)) id = `${base}-${hex(2)}`;
    return id;
  };
  const find = (list, id, what) => list.find((x) => x.id === id) || fail(404, `${what} not found`);

  // Same paths and methods as server.rb.
  async function handle(path, method, rawBody) {
    await init();
    const parts = path.split('/').filter(Boolean);
    const b = parts[0] === 'auth' || (parts[0] === 'admin' && parts[1] === 'users') ? rawBody : clean(rawBody);
    const key = `${method} ${parts.join('/')}`;
    const [, kind, id] = parts;
    const CONTENT = /^(courses|tools|resources|posts|videos)$/;

    if (key === 'GET content') {
      // Guests only get topic names (for the landing page), like the server.
      const u = me();
      if (!u) return { topics: db.topics, courses: [], tools: [], resources: [], posts: [], videos: [], me: null, preview: true };
      return { topics: db.topics, courses: db.courses, tools: db.tools, resources: db.resources, posts: db.posts, videos: db.videos, me: publicUser(u), preview: true };
    }
    if (key === 'GET auth/me') return { me: publicUser(me()) };
    if (key === 'POST auth/signup') {
      const u = await createUser(b, db.users.some((x) => x.role === 'admin') ? 'member' : 'admin');
      store(SESSION_KEY, u.id);
      return { me: publicUser(u) };
    }
    if (key === 'POST auth/login') {
      const u = db.users.find((x) => x.email === String(b.email || '').trim().toLowerCase());
      if (!u || (await hash(String(b.password || ''), u.salt)) !== u.hash) fail(401, 'Email or password is incorrect');
      store(SESSION_KEY, u.id);
      return { me: publicUser(u) };
    }
    if (key === 'POST auth/logout') { store(SESSION_KEY, ''); return { ok: true }; }
    if (key === 'PUT auth/me') {
      const u = user(); const name = clean(String(b.name || ''));
      if (!name) fail(422, 'Please enter your name');
      u.name = name; save(); return { me: publicUser(u) };
    }
    if (key === 'POST posts') { const p = newPost(buildItem('posts', b), poster()); db.posts.unshift(p); save(); return p; }
    if (method === 'POST' && parts[0] === 'posts' && parts[2] === 'replies' && parts.length === 3) {
      const u = poster(); const p = find(db.posts, parts[1], 'Discussion');
      p.replies.push({ id: `r${hex(4)}`, author: initials(u.name), name: u.name, userId: u.id, text: req(b, 'text', 'Reply') });
      save(); return p;
    }
    if (method === 'DELETE' && parts[0] === 'posts' && parts[2] === 'replies' && parts.length === 4) {
      allowed('community'); const p = find(db.posts, parts[1], 'Discussion');
      p.replies = p.replies.filter((r) => r.id !== parts[3]); save(); return p;
    }
    if (parts[0] === 'admin' && kind === 'users') {
      if (key === 'GET admin/users') { allowed('members'); return db.users.map((u) => ({ ...publicUser(u), createdAt: u.createdAt })); }
      if (key === 'POST admin/users') {
        allowed('members');
        if (!ROLES.includes(b.role)) fail(422, 'Pick a role');
        const u = await createUser(b, b.role); return { ...publicUser(u), createdAt: u.createdAt };
      }
      const self = allowed('members');
      const target = find(db.users, id, 'User');
      if (method === 'PUT') {
        if (target.id === self.id) fail(422, 'You cannot change your own role');
        if (!ROLES.includes(b.role)) fail(422, 'Unknown role');
        target.role = b.role; save(); return publicUser(target);
      }
      if (method === 'DELETE') {
        if (target.id === self.id) fail(422, 'You cannot remove your own account');
        db.users = db.users.filter((u) => u.id !== id); save(); return { ok: true };
      }
    }
    if (parts[0] === 'admin' && CONTENT.test(kind || '')) {
      const u = allowed(kind === 'posts' ? 'community' : 'content');
      const list = db[kind];
      if (method === 'POST' && parts.length === 2) {
        const fields = buildItem(kind, b);
        const item = kind === 'posts' ? newPost(fields, u) : { ...fields, id: slug(fields.title || fields.name, list) };
        list.unshift(item); save(); return item;
      }
      if (method === 'PUT' && parts.length === 3) {
        const item = find(list, id, 'Item'); Object.assign(item, buildItem(kind, b)); delete item.homeBlurb; save(); return item;
      }
      if (method === 'DELETE' && parts.length === 3) {
        find(list, id, 'Item'); db[kind] = list.filter((x) => x.id !== id); save(); return { ok: true };
      }
    }
    return fail(404, 'Not found');
  }

  return {
    async request(path, { method = 'GET', body } = {}) {
      return structuredClone(await handle(path, method, body || {}));
    },
    reset() { store(DB_KEY, ''); store(SESSION_KEY, ''); db = null; },
  };
})();
