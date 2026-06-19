// cail.love — guestbook API (Cloudflare Worker + KV)
// routes live under /api/*, everything else falls through to static assets.

const MSG_KEY = 'messages';
const MAX_MESSAGES = 300;
const NAME_MAX = 24;
const TEXT_MAX = 200;
const RATE_LIMIT_SEC = 60; // KV expirationTtl minimum is 60s

// snake global leaderboard
const LB_KEY = 'snake-scores';
const LB_MAX = 25;        // how many we retain in KV
const LB_NAME_MAX = 12;   // max chars for a leaderboard name
const SCORE_CAP = 99999;  // sanity clamp on submitted scores

// visitor geo / weather / souls
const SOULS_KEY = 'souls-geo'; // { "US": 12, "JP": 3, ... } — country codes ONLY, never IPs/cities
const WX_TTL = 600;            // weather cache seconds (keyed by coarse lat/lon)

// per-IP anti-spam (counts within a rolling 60s window — KV TTL minimum)
const LB_RATE_MAX = 3;   // max score submits / minute / IP
const SOUL_RATE_MAX = 3; // max new-soul increments / minute / IP

// light hate-only filter (swearing is fine, slurs are not)
const BANNED = ['nigger', 'nigga', 'faggot', 'retard', 'kike', 'chink', 'spic', 'tranny'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://cail.love',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS_HEADERS },
  });
}

async function timingSafeEqualStr(a, b) {
  const enc = new TextEncoder();
  const ka = await crypto.subtle.importKey('raw', enc.encode(a), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const kb = await crypto.subtle.importKey('raw', enc.encode(b), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const nonce = enc.encode('cail.love');
  const [sa, sb] = await Promise.all([
    crypto.subtle.sign('HMAC', ka, nonce),
    crypto.subtle.sign('HMAC', kb, nonce),
  ]);
  const va = new Uint8Array(sa), vb = new Uint8Array(sb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

function clean(str, max) {
  return String(str == null ? '' : str).replace(/\s+/g, ' ').trim().slice(0, max);
}

// collapse a score list to one entry per player (case-insensitive name), keeping
// each player's highest score; sorted best-first (ties broken by earliest ts)
function dedupBest(scores) {
  const best = new Map();
  for (const x of scores) {
    const k = (x.n || '').toLowerCase();
    const cur = best.get(k);
    if (!cur || x.s > cur.s) best.set(k, x);
  }
  return [...best.values()].sort((a, b) => b.s - a.s || a.ts - b.ts);
}

function hasBanned(text) {
  const low = text.toLowerCase();
  return BANNED.some(w => low.includes(w));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// WMO weather code → our simple atmosphere buckets
function wmoToWeather(code) {
  if (code == null) return 'clear';
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'clouds';
  if (code === 3) return 'clouds';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';   // drizzle + rain
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';    // rain showers
  if (code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';                 // thunderstorm
  return 'clouds';
}

// 2-letter country code → flag emoji (regional indicators)
function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '';
  const A = 0x1f1e6;
  const up = cc.toUpperCase();
  return String.fromCodePoint(A + (up.charCodeAt(0) - 65)) +
         String.fromCodePoint(A + (up.charCodeAt(1) - 65));
}

async function getWeather(env, lat, lon) {
  if (lat == null || lon == null) return { weather: 'clear', temp: null, isDay: true };
  const key = `wx:${(+lat).toFixed(1)},${(+lon).toFixed(1)}`;
  const cached = await env.GUESTBOOK.get(key);
  if (cached) { try { return JSON.parse(cached); } catch {} }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${(+lat).toFixed(2)}&longitude=${(+lon).toFixed(2)}&current=temperature_2m,weather_code,is_day`;
    const r = await fetch(url, { cf: { cacheTtl: WX_TTL } });
    const j = await r.json();
    const cur = j.current || {};
    const out = {
      weather: wmoToWeather(cur.weather_code),
      temp: typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null,
      isDay: cur.is_day !== 0,
    };
    await env.GUESTBOOK.put(key, JSON.stringify(out), { expirationTtl: WX_TTL });
    return out;
  } catch {
    return { weather: 'clear', temp: null, isDay: true };
  }
}

// per-IP counter limiter: returns true if over the limit (and won't refresh TTL when blocked)
async function bumpRate(env, key, max) {
  const cur = parseInt(await env.GUESTBOOK.get(key) || '0', 10);
  if (cur >= max) return true;
  await env.GUESTBOOK.put(key, String(cur + 1), { expirationTtl: 60 });
  return false;
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
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
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

  // GET /api/leaderboard → global snake high scores (top 10)
  if (path === '/api/leaderboard' && request.method === 'GET') {
    const raw = await env.GUESTBOOK.get(LB_KEY);
    let scores = [];
    try { scores = raw ? JSON.parse(raw) : []; } catch { scores = []; }
    const deduped = dedupBest(scores);
    if (deduped.length !== scores.length) {
      await env.GUESTBOOK.put(LB_KEY, JSON.stringify(deduped)); // permanently clean lurking dupes
    }
    return json({ ok: true, scores: deduped.slice(0, 10) });
  }

  // POST /api/leaderboard → submit a snake score { name, score }
  if (path === '/api/leaderboard' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, error: 'bad request' }, 400); }
    if (await bumpRate(env, 'rl-lb:' + ip, LB_RATE_MAX)) {
      return json({ ok: false, error: 'slow down — too many submissions' }, 429);
    }
    const name = clean(body.name, LB_NAME_MAX) || 'anon';
    if (hasBanned(name)) return json({ ok: false, error: 'be nice.' }, 400);
    let score = parseInt(body.score, 10);
    if (!Number.isFinite(score) || score < 1) return json({ ok: false, error: 'invalid score' }, 400);
    score = Math.min(score, SCORE_CAP);
    const raw = await env.GUESTBOOK.get(LB_KEY);
    let scores = [];
    try { scores = raw ? JSON.parse(raw) : []; } catch { scores = []; }
    const entry = { n: name, s: score, ts: Date.now() };
    scores.push(entry);
    scores = dedupBest(scores).slice(0, LB_MAX); // one row per player, best kept
    await env.GUESTBOOK.put(LB_KEY, JSON.stringify(scores));
    const rank = scores.findIndex(x => (x.n || '').toLowerCase() === name.toLowerCase());
    return json({ ok: true, scores: scores.slice(0, 10), rank });
  }

  // DELETE /api/leaderboard?key=..[&ts=..] → admin clear (key = ADMIN_KEY secret)
  // with ts → remove one score; without → wipe the whole board
  if (path === '/api/leaderboard' && request.method === 'DELETE') {
    const key = url.searchParams.get('key');
    if (!env.ADMIN_KEY || !(await timingSafeEqualStr(key || '', env.ADMIN_KEY))) return json({ ok: false, error: 'unauthorized' }, 401);
    const ts = url.searchParams.get('ts');
    if (ts) {
      const raw = await env.GUESTBOOK.get(LB_KEY);
      let scores = [];
      try { scores = raw ? JSON.parse(raw) : []; } catch { scores = []; }
      scores = scores.filter(x => String(x.ts) !== String(ts));
      await env.GUESTBOOK.put(LB_KEY, JSON.stringify(scores));
    } else {
      await env.GUESTBOOK.delete(LB_KEY);
    }
    return json({ ok: true });
  }

  // POST /api/visit → geo + live weather + log the soul's country (privacy: country only)
  if (path === '/api/visit' && request.method === 'POST') {
    let body = {};
    try { body = await request.json(); } catch {}
    const cf = request.cf || {};
    const country = (cf.country && cf.country !== 'XX') ? cf.country : '';
    const wx = await getWeather(env, cf.latitude, cf.longitude);

    // souls tally — only increment for a genuinely new visitor
    let souls = {};
    const rawSouls = await env.GUESTBOOK.get(SOULS_KEY);
    try { souls = rawSouls ? JSON.parse(rawSouls) : {}; } catch { souls = {}; }
    if (body.isNew && country && !(await bumpRate(env, 'rl-soul:' + ip, SOUL_RATE_MAX))) {
      souls[country] = (souls[country] || 0) + 1;
      await env.GUESTBOOK.put(SOULS_KEY, JSON.stringify(souls));
    }
    const total = Object.values(souls).reduce((a, b) => a + b, 0);

    return json({
      ok: true,
      city: cf.city || '',
      region: cf.region || '',
      country,
      flag: countryFlag(country),
      timezone: cf.timezone || '',
      weather: wx.weather,
      temp: wx.temp,
      isDay: wx.isDay,
      souls: { total, countries: Object.keys(souls).length, byCountry: souls },
    });
  }

  // GET /api/souls → the global souls tally (country codes only)
  if (path === '/api/souls' && request.method === 'GET') {
    let souls = {};
    const rawSouls = await env.GUESTBOOK.get(SOULS_KEY);
    try { souls = rawSouls ? JSON.parse(rawSouls) : {}; } catch { souls = {}; }
    const total = Object.values(souls).reduce((a, b) => a + b, 0);
    return json({ ok: true, total, countries: Object.keys(souls).length, byCountry: souls });
  }

  // POST /api/guestbook/reply → owner reply under a message (key = ADMIN_KEY secret)
  if (path === '/api/guestbook/reply' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, error: 'bad request' }, 400); }
    if (!env.ADMIN_KEY || !(await timingSafeEqualStr(body.key || '', env.ADMIN_KEY))) return json({ ok: false, error: 'unauthorized' }, 401);
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
    if (!env.ADMIN_KEY || !(await timingSafeEqualStr(key || '', env.ADMIN_KEY))) return json({ ok: false, error: 'unauthorized' }, 401);
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

// ===== live presence (ghost cursors) — Durable Object with WebSocket hibernation =====
export class PresenceRoom {
  constructor(state) {
    this.state = state;
  }

  broadcast(obj, except) {
    const msg = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets()) {
      if (ws === except) continue;
      try { ws.send(msg); } catch {}
    }
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    const id = Math.random().toString(36).slice(2, 8);
    server.serializeAttachment({ id });
    const count = this.state.getWebSockets().length;
    try { server.send(JSON.stringify({ type: 'welcome', id, count })); } catch {}
    this.broadcast({ type: 'count', count }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    let data;
    try { data = JSON.parse(message); } catch { return; }
    if (data.type === 'move') {
      const att = ws.deserializeAttachment() || {};
      this.broadcast({ type: 'cursor', id: att.id, x: data.x, y: data.y }, ws);
    }
  }

  async webSocketClose(ws) {
    const att = ws.deserializeAttachment() || {};
    this.broadcast({ type: 'leave', id: att.id }, ws);
    this.broadcast({ type: 'count', count: this.state.getWebSockets().length - 1 }, ws);
  }

  async webSocketError(ws) {
    try { ws.close(); } catch {}
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // live presence websocket → Durable Object (single global room)
    if (url.pathname === '/api/presence') {
      if (!env.PRESENCE) return new Response('presence unavailable', { status: 503 });
      const stub = env.PRESENCE.get(env.PRESENCE.idFromName('global'));
      return stub.fetch(request);
    }
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        return json({ ok: false, error: 'service temporarily unavailable' }, 503);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
