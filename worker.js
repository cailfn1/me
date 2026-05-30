// cail.love — guestbook API (Cloudflare Worker + KV)
// routes live under /api/*, everything else falls through to static assets.

const MSG_KEY = 'messages';
const MAX_MESSAGES = 300;
const NAME_MAX = 24;
const TEXT_MAX = 200;
const RATE_LIMIT_SEC = 60; // KV expirationTtl minimum is 60s

// light hate-only filter (swearing is fine, slurs are not)
const BANNED = ['nigger', 'nigga', 'faggot', 'retard', 'kike', 'chink', 'spic', 'tranny'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function clean(str, max) {
  return String(str == null ? '' : str).replace(/\s+/g, ' ').trim().slice(0, max);
}

function hasBanned(text) {
  const low = text.toLowerCase();
  return BANNED.some(w => low.includes(w));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function getMessages(env) {
  const raw = await env.GUESTBOOK.get(MSG_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function putMessages(env, msgs) {
  await env.GUESTBOOK.put(MSG_KEY, JSON.stringify(msgs.slice(-MAX_MESSAGES)));
}

async function handleApi(request, env, url) {
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const path = url.pathname;

  // GET /api/guestbook → newest-first list
  if (path === '/api/guestbook' && request.method === 'GET') {
    const msgs = await getMessages(env);
    return json({ ok: true, count: msgs.length, messages: msgs.slice().reverse() });
  }

  // POST /api/guestbook → add a message
  if (path === '/api/guestbook' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, error: 'bad request' }, 400); }

    // honeypot — bots fill hidden fields; humans never see it
    if (body.website) return json({ ok: true, skipped: true });

    const name = clean(body.name, NAME_MAX) || 'anon';
    const text = clean(body.message, TEXT_MAX);
    if (!text) return json({ ok: false, error: 'message required' }, 400);
    if (hasBanned(name + ' ' + text)) return json({ ok: false, error: 'be nice.' }, 400);

    // per-IP rate limit
    const rlKey = 'rl:' + ip;
    if (await env.GUESTBOOK.get(rlKey)) {
      return json({ ok: false, error: 'slow down — wait a moment before posting again' }, 429);
    }
    await env.GUESTBOOK.put(rlKey, '1', { expirationTtl: RATE_LIMIT_SEC });

    const msgs = await getMessages(env);
    const msg = {
      id: genId(),
      name,
      text,
      ts: Date.now(),
      likes: 0,
    };
    msgs.push(msg);
    await putMessages(env, msgs);
    return json({ ok: true, message: msg });
  }

  // POST /api/guestbook/like → +1 like
  if (path === '/api/guestbook/like' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, error: 'bad request' }, 400); }
    const id = String(body.id || '');
    const msgs = await getMessages(env);
    const m = msgs.find(x => x.id === id);
    if (!m) return json({ ok: false, error: 'not found' }, 404);
    m.likes = (m.likes || 0) + 1;
    await putMessages(env, msgs);
    return json({ ok: true, likes: m.likes });
  }

  // POST /api/guestbook/reply → owner reply under a message (key = ADMIN_KEY secret)
  if (path === '/api/guestbook/reply' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, error: 'bad request' }, 400); }
    if (!env.ADMIN_KEY || body.key !== env.ADMIN_KEY) return json({ ok: false, error: 'unauthorized' }, 401);
    const id = String(body.id || '');
    const text = clean(body.text, TEXT_MAX);
    if (!text) return json({ ok: false, error: 'reply required' }, 400);
    if (hasBanned(text)) return json({ ok: false, error: 'be nice.' }, 400);
    const msgs = await getMessages(env);
    const m = msgs.find(x => x.id === id);
    if (!m) return json({ ok: false, error: 'not found' }, 404);
    if (!Array.isArray(m.replies)) m.replies = [];
    const reply = { id: genId(), text, ts: Date.now() };
    m.replies.push(reply);
    await putMessages(env, msgs);
    return json({ ok: true, reply });
  }

  // DELETE /api/guestbook?id=..&key=..[&rid=..] → admin moderation (key = ADMIN_KEY secret)
  // with rid → delete a single reply; without → delete the whole message
  if (path === '/api/guestbook' && request.method === 'DELETE') {
    const key = url.searchParams.get('key');
    if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return json({ ok: false, error: 'unauthorized' }, 401);
    const id = url.searchParams.get('id');
    const rid = url.searchParams.get('rid');
    let msgs = await getMessages(env);
    if (rid) {
      const m = msgs.find(x => x.id === id);
      if (m && Array.isArray(m.replies)) m.replies = m.replies.filter(r => r.id !== rid);
    } else {
      msgs = msgs.filter(x => x.id !== id);
    }
    await putMessages(env, msgs);
    return json({ ok: true });
  }

  return json({ ok: false, error: 'not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }
    return env.ASSETS.fetch(request);
  },
};
