const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const pad = (n, size = 2) => n.toString().padStart(size, '0');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BOOT_MANTRAS = [
  'opening the door',
  'writing your name',
  'counting petals',
  'summoning the dusk',
  'waking the cat',
  'lighting the moon',
];

function runBoot() {
  const bootEl = $('#boot');
  const status = $('#bootStatus');
  const isFirstVisit = sessionStorage.getItem('cails-bio:booted') !== '1';
  const minWait = isFirstVisit ? 2200 : 900;

  // pick a random gothic mantra for this load
  if (status) {
    const mantra = BOOT_MANTRAS[Math.floor(Math.random() * BOOT_MANTRAS.length)];
    status.innerHTML = mantra + '<span class="boot-dots"></span>';
  }

  return new Promise((resolve) => {
    if (reducedMotion) {
      sessionStorage.setItem('cails-bio:booted', '1');
      bootEl.classList.add('fade');
      setTimeout(() => { bootEl.remove(); resolve(); }, 200);
      return;
    }

    setTimeout(() => {
      if (isFirstVisit) {
        status.innerHTML = 'click anywhere to continue';
        bootEl.classList.add('clickable');

        const onEnter = (e) => {
          if (e.type === 'keydown' && (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta')) return;
          bootEl.removeEventListener('click', onEnter);
          window.removeEventListener('keydown', onEnter);
          sessionStorage.setItem('cails-bio:booted', '1');
          try {
            if (typeof getCtx === 'function') getCtx();
          } catch {}

          bootEl.classList.add('fade');
          setTimeout(() => { bootEl.remove(); resolve(); }, 500);
        };

        bootEl.addEventListener('click', onEnter);
        window.addEventListener('keydown', onEnter);
      } else {
        sessionStorage.setItem('cails-bio:booted', '1');
        bootEl.classList.add('fade');
        setTimeout(() => { bootEl.remove(); resolve(); }, 500);
      }
    }, minWait);
  });
}

function startClock() {
  const clockEl = $('#clock');
  const update = () => {
    const d = new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    clockEl.textContent = `${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
  };
  update();
  setInterval(update, 1000);
}

function setGreeting() {
  const tagline = $('#tagline');
  if (!tagline) return;
  const h = new Date().getHours();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  let greeting;
  if (h < 5) greeting = 'late-night gamer';
  else if (h < 12) greeting = 'good morning ☕';
  else if (h < 17) greeting = 'afternoon vibes';
  else if (h < 21) greeting = 'evening hours';
  else greeting = 'just some guy (night shift)';
  tagline.textContent = `${greeting} · California`;
  tagline.dataset.original = greeting;
}
const TRACKS = [
  { title: 'see u in hell — papa roach × hanumankind', src: 'assets/see-u-in-hell.mp3' },
  { title: '少女A — siinamota', src: 'assets/shoujo-a.mp3' },
];

let trackIdx = 0;

function loadTrack(i) {
  const audio = $('#musicAudio');
  const titleEl = $('#musicTitle');
  trackIdx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
  const t = TRACKS[trackIdx];
  audio.src = t.src;
  titleEl.textContent = t.title;
  $('#musicBarFill').style.width = '0%';
}

function initMusic() {
  const audio = $('#musicAudio');
  const btn = $('#musicBtn');
  const icon = $('#musicIcon');
  const prev = $('#musicPrev');
  const next = $('#musicNext');
  const vol = $('#musicVolume');
  const barFill = $('#musicBarFill');

  const PLAY = '▶';
  const PAUSE = '⏸';

  loadTrack(0);
  audio.volume = 0.5;

  // try to autoplay on first user interaction (browsers block raw autoplay)
  let autoplayed = false;
  const tryAutoplay = () => {
    if (autoplayed || !audio.paused) return;
    autoplayed = true;
    const p = audio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        icon.textContent = PAUSE;
        btn.setAttribute('aria-label', 'pause');
      }).catch(() => { autoplayed = false; });
    }
    cleanup();
  };
  const cleanup = () => {
    window.removeEventListener('click', tryAutoplay);
    window.removeEventListener('keydown', tryAutoplay);
    window.removeEventListener('touchstart', tryAutoplay);
    window.removeEventListener('scroll', tryAutoplay);
  };
  window.addEventListener('click', tryAutoplay);
  window.addEventListener('keydown', tryAutoplay);
  window.addEventListener('touchstart', tryAutoplay, { passive: true });
  window.addEventListener('scroll', tryAutoplay, { passive: true });

  btn.addEventListener('click', () => {
    if (audio.paused) {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => { icon.textContent = PLAY; });
      }
      icon.textContent = PAUSE;
      btn.setAttribute('aria-label', 'pause');
    } else {
      audio.pause();
      icon.textContent = PLAY;
      btn.setAttribute('aria-label', 'play');
    }
  });

  prev.addEventListener('click', () => {
    const wasPlaying = !audio.paused;
    loadTrack(trackIdx - 1);
    if (wasPlaying) audio.play().catch(() => {});
  });

  next.addEventListener('click', () => {
    const wasPlaying = !audio.paused;
    loadTrack(trackIdx + 1);
    if (wasPlaying) audio.play().catch(() => {});
  });

  vol.addEventListener('input', () => {
    audio.volume = vol.value / 100;
  });

  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      barFill.style.width = (audio.currentTime / audio.duration * 100) + '%';
    }
  });

  audio.addEventListener('ended', () => {
    // auto-advance to next track
    loadTrack(trackIdx + 1);
    audio.play().catch(() => {
      icon.textContent = PLAY;
      btn.setAttribute('aria-label', 'play');
    });
  });

  audio.addEventListener('error', () => {
    icon.textContent = PLAY;
    btn.setAttribute('aria-label', 'play');
    setEqPlaying(false);
  });

  // EQ bars react to actual play/pause state
  audio.addEventListener('play', () => setEqPlaying(true));
  audio.addEventListener('pause', () => setEqPlaying(false));
  audio.addEventListener('ended', () => setEqPlaying(false));
}

function setEqPlaying(on) {
  const eq = $('#musicEq');
  if (!eq) return;
  eq.classList.toggle('playing', !!on);
}

const COUNTER_READ = 'https://api.counterapi.dev/v1/caillove/v2/';
const COUNTER_UP   = 'https://api.counterapi.dev/v1/caillove/v2/up';
const LS_COUNTED   = 'cails-bio:counted-v2';

function animateCount(target) {
  const el = $('#visitorCount');
  if (!el) return;
  // set the final value first so it's correct even if RAF never fires
  // (background tabs pause RAF; without this the count would never show)
  el.textContent = target.toLocaleString();
  if (target === 0 || document.hidden || reducedMotion) return;
  const duration = 1200;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(ease * target);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  };
  // start from 0 for the count-up effect
  el.textContent = '0';
  requestAnimationFrame(step);
}

function initVisitorCounter() {
  const alreadyCounted = localStorage.getItem(LS_COUNTED) === '1';
  const url = alreadyCounted ? COUNTER_READ : COUNTER_UP;
  fetch(url, { cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      const n = data?.count ?? data?.value;
      if (typeof n === 'number') {
        animateCount(n);
        if (!alreadyCounted) localStorage.setItem(LS_COUNTED, '1');
      } else {
        throw new Error('no count in response');
      }
    })
    .catch((err) => {
      const el = $('#visitorCount');
      if (el) el.textContent = '—';
      console.warn('visitor counter failed:', err);
    });
}

function typeBio() {
  const el = $('#bioText');
  if (!el) return;
  const text = el.getAttribute('data-text') || '';
  if (reducedMotion) {
    el.textContent = text;
    el.classList.add('done');
    return;
  }
  let i = 0;
  const step = () => {
    if (i <= text.length) {
      el.textContent = text.slice(0, i);
      i++;
      setTimeout(step, 25);
    } else {
      el.classList.add('done');
    }
  };
  setTimeout(step, 400);
}

function initAvatarStreak() {
  const avatar = $('#avatar');
  const tagline = $('#tagline');
  if (!avatar || !tagline) return;
  let clicks = 0;
  let resetTimer = null;
  let restoreTimer = null;

  avatar.addEventListener('click', () => {
    clicks++;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { clicks = 0; }, 2000);

    if (clicks >= 5) {
      clicks = 0;
      avatar.classList.add('offline');
      const original = tagline.textContent;
      tagline.textContent = 'now offline';
      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        avatar.classList.remove('offline');
        tagline.textContent = original;
      }, 4000);
    }
  });
}

// requires the user to join https://discord.gg/lanyard
// if not joined, this silently falls back to the static profile.
// Discord public_flags bitfield → badge icon hashes (Discord CDN)
const DISCORD_BADGES = [
  { flag: 1 << 0,  name: 'Discord Staff',                  hash: '5e74e9b61934fc1f67c65515d1f7e60d' },
  { flag: 1 << 1,  name: 'Partner',                        hash: '3f9748e53446a137a052f3454e2de41e' },
  { flag: 1 << 2,  name: 'HypeSquad Events',               hash: 'bf01d1073931f921909045f3a39fd264' },
  { flag: 1 << 3,  name: 'Bug Hunter Level 1',             hash: '2717692c7dca7289b35297368a940dd0' },
  { flag: 1 << 6,  name: 'HypeSquad Bravery',              hash: '8a88d63823d8a71cd5e390baa45efa02' },
  { flag: 1 << 7,  name: 'HypeSquad Brilliance',           hash: '011940fd013da3f7fb926e4a1cd2e618' },
  { flag: 1 << 8,  name: 'HypeSquad Balance',              hash: '3aa41de486fa12454c3761e8e223442e' },
  { flag: 1 << 9,  name: 'Early Supporter',                hash: '7060786766c9c840eb3019e725d2b358' },
  { flag: 1 << 14, name: 'Bug Hunter Level 2',             hash: '848f79194d4be5ff5f81505cbd0ce1e6' },
  { flag: 1 << 17, name: 'Early Verified Bot Developer',   hash: '6df5892e0f35b051f8b61eace34f4967' },
  { flag: 1 << 18, name: 'Moderator Programs Alumni',      hash: 'fee1624003e2fee35cb398e125dc479b' },
  { flag: 1 << 22, name: 'Active Developer',               hash: '6bdc42827a38498929a4920da12695d9' },
];
const NITRO_BADGE_HASH = '2ba85e8026a8614b640c2837bcdfe21b';

// Manually-added badges (Lanyard doesn't expose Nitro/Quest reliably)
const QUEST_BADGE_HASH = '7d9ae358c8c5e118768335dbe68b4fb8';
const MANUAL_BADGES = [
  { name: 'Completed a Quest', hash: QUEST_BADGE_HASH },
];

function renderDiscordBadges(user) {
  const wrap = $('#discordBadges');
  if (!wrap || !user) return;
  wrap.innerHTML = '';
  const addBadge = (name, hash) => {
    const img = document.createElement('img');
    img.src = `https://cdn.discordapp.com/badge-icons/${hash}.png`;
    img.alt = name;
    img.title = name;
    img.loading = 'lazy';
    img.onerror = () => img.remove();
    wrap.appendChild(img);
  };
  const flags = user.public_flags || 0;
  DISCORD_BADGES.forEach(b => {
    if (flags & b.flag) addBadge(b.name, b.hash);
  });
  // Nitro — detect via avatar_decoration_data presence (decorations are Nitro-only)
  // OR premium_type if Lanyard ever exposes it
  const hasNitro = (user.premium_type && user.premium_type > 0) ||
                   (user.avatar_decoration_data && user.avatar_decoration_data.asset);
  if (hasNitro) addBadge('Discord Nitro', NITRO_BADGE_HASH);
  // Manual badges (Quest, etc.)
  MANUAL_BADGES.forEach(b => addBadge(b.name, b.hash));
}

function applyDiscordAvatar(user) {
  if (!user || !user.id || !user.avatar) return;
  const av = $('#avatar');
  if (!av) return;
  const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
  const url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
  av.style.backgroundImage = `url('${url}'), linear-gradient(135deg, #2a2d4a, #1a1c2e)`;
  const deco = $('#avatarDeco');
  if (deco && user.avatar_decoration_data && user.avatar_decoration_data.asset) {
    deco.src = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=240&passthrough=true`;
    deco.classList.add('show');
  } else if (deco) {
    deco.classList.remove('show');
    deco.removeAttribute('src');
  }
}

function initLanyard() {
  const id = document.body.dataset.discordId;
  if (!id) return;
  const statusDot = $('#statusDot');
  const avatarEl = $('#avatar');
  const activity = $('#activity');
  const activityRow = $('#activityRow');
  const activityArt = $('#activityArt');

  const applyPresence = (data) => {
    if (!data) return;
    const status = data.discord_status || 'offline';
    statusDot.classList.remove('idle', 'dnd', 'offline');
    if (status === 'idle') statusDot.classList.add('idle');
    else if (status === 'dnd') statusDot.classList.add('dnd');
    else if (status === 'offline') statusDot.classList.add('offline');
    if (avatarEl) avatarEl.dataset.status = status;
    if (data.discord_user) {
      applyDiscordAvatar(data.discord_user);
      renderDiscordBadges(data.discord_user);
    }
    let label = '';
    let art = '';
    if (data.listening_to_spotify && data.spotify) {
      label = `♪ ${data.spotify.song} — ${data.spotify.artist}`;
      art = data.spotify.album_art_url || '';
    } else if (Array.isArray(data.activities)) {
      const game = data.activities.find(a => a.type === 0);
      const custom = data.activities.find(a => a.type === 4);
      if (game) label = `▶ ${game.name}`;
      else if (custom && custom.state) label = custom.state;
    }
    const isSpotify = !!(data.listening_to_spotify && data.spotify);
    if (label) {
      activity.textContent = label;
      activity.classList.add('show');
      if (activityRow) {
        activityRow.classList.add('show');
        activityRow.classList.toggle('spotify', isSpotify);
      }
      if (activityArt) {
        if (art) {
          activityArt.src = art;
          activityArt.classList.add('show');
        } else {
          activityArt.classList.remove('show');
          activityArt.removeAttribute('src');
        }
      }
    } else {
      activity.classList.remove('show');
      if (activityRow) {
        activityRow.classList.remove('show');
        activityRow.classList.remove('spotify');
      }
      if (activityArt) activityArt.classList.remove('show');
    }
  };
  let ws;
  let heartbeat;
  try {
    ws = new WebSocket('wss://api.lanyard.rest/socket');
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: id } }));
    });
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.op === 1 && msg.d?.heartbeat_interval) {
        heartbeat = setInterval(() => {
          try { ws.send(JSON.stringify({ op: 3 })); } catch {}
        }, msg.d.heartbeat_interval);
      } else if (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') {
        applyPresence(msg.d);
      }
    });
    ws.addEventListener('close', () => clearInterval(heartbeat));
    ws.addEventListener('error', () => {
      clearInterval(heartbeat);
      fetch(`https://api.lanyard.rest/v1/users/${id}`)
        .then(r => r.json())
        .then(j => { if (j.success) applyPresence(j.data); })
        .catch(() => {});
    });
  } catch {
    fetch(`https://api.lanyard.rest/v1/users/${id}`)
      .then(r => r.json())
      .then(j => { if (j.success) applyPresence(j.data); })
      .catch(() => {});
  }
}

const TERM_COMMANDS = {
  help: () => [
    'available commands:',
    '  help       — this list',
    '  about      — short bio',
    '  whoami     — who am i',
    '  skills     — list skills',
    '  projects   — list projects',
    '  links      — show socials',
    '  date       — current date/time',
    '  echo <txt> — echo text back',
    '  clear      — clear terminal',
    '  exit / q   — close terminal',
  ],
  about: () => [$('#bioText').getAttribute('data-text') || ''],
  whoami: () => ['cail'],
  skills: () => ['skills: ' + [...$$('.skill-icon')].map(p => p.getAttribute('title') || p.dataset.label).filter(Boolean).join(', ')],
  projects: () => [...$$('.work-card')].map(p => {
    const name = p.querySelector('.work-name')?.textContent || '?';
    const desc = p.querySelector('.work-desc')?.textContent || '';
    return `- ${name} — ${desc}`;
  }),
  links: () => [...$$('.links-list a')].map(a => {
    const platform = a.querySelector('.link-platform')?.textContent.trim() || '';
    const handle = a.querySelector('.link-handle')?.textContent.trim() || '';
    return `${platform}: ${handle} (${a.href})`;
  }),
  date: () => [new Date().toString()],
  clear: () => { $('#termBody').innerHTML = ''; return null; },
  exit: () => { closeTerminal(); return null; },
  q: () => { closeTerminal(); return null; },
};

function termPrint(line, cls = '') {
  const div = document.createElement('div');
  div.className = 'term-line' + (cls ? ' ' + cls : '');
  div.innerHTML = line;
  $('#termBody').appendChild(div);
  $('#termBody').scrollTop = $('#termBody').scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function runCommand(raw) {
  const input = raw.trim();
  if (!input) return;
  termPrint(`<span class="term-prompt">$</span> ${escapeHtml(input)}`, 'cmd-echo');

  const [cmd, ...rest] = input.split(/\s+/);
  const arg = rest.join(' ');

  if (cmd === 'echo') {
    termPrint(escapeHtml(arg) || '');
    return;
  }
  if (cmd === 'sudo' && rest[0] === 'rm' && rest.includes('-rf') && rest.some(r => r === '/' || r === '/*')) {
    termPrint('permission denied. nice try.', 'error');
    return;
  }

  const fn = TERM_COMMANDS[cmd];
  if (!fn) {
    termPrint(`unknown command: ${escapeHtml(cmd)} — try <span class="term-cmd">help</span>`, 'error');
    return;
  }
  const out = fn();
  if (out) out.forEach(l => termPrint(escapeHtml(l)));
}

let termHistory = [];
let termHistIdx = -1;

function openTerminal() {
  const term = $('#terminal');
  term.hidden = false;
  $('#termInput').focus();
}

function closeTerminal() {
  $('#terminal').hidden = true;
}

const ANILIST_USER = 'cailfn';
const ANILIST_CACHE_KEY = 'cails-bio:anilist-cache-v3';
const ANILIST_CACHE_TTL = 15 * 60 * 1000;

async function fetchAniListData(user) {
  const query = `query ($name: String) {
    User(name: $name) {
      statistics {
        anime {
          count
          episodesWatched
          minutesWatched
          meanScore
          genres(limit: 1, sort: COUNT_DESC) { genre }
        }
      }
    }
    MediaListCollection(userName: $name, type: ANIME, status: COMPLETED, sort: SCORE_DESC) {
      lists { entries {
        score
        media {
          title { romaji english }
          coverImage { large }
          siteUrl
          episodes
        }
      } }
    }
  }`;
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables: { name: user } }),
  });
  if (!res.ok) throw new Error('anilist ' + res.status);
  const json = await res.json();
  const stats = json?.data?.User?.statistics?.anime || null;
  const lists = json?.data?.MediaListCollection?.lists || [];
  const entries = lists.flatMap(l => l.entries || [])
    .filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  return { stats, entries };
}

function renderAniStats(stats) {
  const el = $('#animeStats');
  if (!el || !stats) return;
  const days = (stats.minutesWatched / 60 / 24).toFixed(1);
  const mean = stats.meanScore ? (stats.meanScore / 10).toFixed(1) : '—';
  const topGenre = stats.genres?.[0]?.genre || '—';
  el.innerHTML = `
    <div class="stat-box"><div class="stat-val">${stats.count}</div><div class="stat-label">watched</div></div>
    <div class="stat-box"><div class="stat-val">${stats.episodesWatched.toLocaleString()}</div><div class="stat-label">episodes</div></div>
    <div class="stat-box"><div class="stat-val">${days}</div><div class="stat-label">days</div></div>
    <div class="stat-box"><div class="stat-val">${mean}</div><div class="stat-label">avg score</div></div>
    <div class="stat-box stat-box-wide"><div class="stat-val">${topGenre.toLowerCase()}</div><div class="stat-label">most watched genre</div></div>
  `;
}

function renderAniList(entries) {
  const grid = $('#animeGrid');
  if (!grid) return;
  if (!entries || entries.length === 0) {
    grid.innerHTML = '<div class="anime-loading">nothing rated yet</div>';
    return;
  }
  grid.innerHTML = '';
  entries.forEach(e => {
    const title = e.media.title.english || e.media.title.romaji || 'untitled';
    const cover = e.media.coverImage.large;
    const url = e.media.siteUrl || '#';
    const score = e.score;
    // score class: 9+ gold, 7-8 pink, <7 dim
    const tier = score >= 9 ? 'gold' : (score >= 7 ? 'pink' : 'dim');
    const a = document.createElement('a');
    a.className = 'anime-card';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `
      <div class="anime-cover" style="background-image: url('${cover}')">
        <span class="anime-score anime-score-${tier}">${score}<span class="anime-score-max">/10</span></span>
      </div>
      <div class="anime-title">${title.replace(/[<>]/g, '')}</div>
    `;
    grid.appendChild(a);
  });
}

async function initAniList() {
  const grid = $('#animeGrid');
  if (!grid) return;
  try {
    const cached = JSON.parse(localStorage.getItem(ANILIST_CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.t < ANILIST_CACHE_TTL) {
      renderAniStats(cached.stats);
      renderAniList(cached.entries);
      return;
    }
  } catch {}
  try {
    const data = await fetchAniListData(ANILIST_USER);
    renderAniStats(data.stats);
    renderAniList(data.entries);
    if (data.stats || data.entries.length > 0) {
      localStorage.setItem(ANILIST_CACHE_KEY, JSON.stringify({ t: Date.now(), stats: data.stats, entries: data.entries }));
    }
  } catch (err) {
    const section = $('#anime');
    if (section) section.style.display = 'none';
    console.warn('anilist failed:', err);
  }
}

// ===== last.fm recent tracks =====
const LASTFM_USER = 'cailfn';
const LASTFM_KEY = 'fb9a4ca51fab76634131f4db77e36fd8'; // read-only public key
const LASTFM_COUNT = 8;

function timeAgo(unixSec) {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return 'just now';
  const m = Math.floor(diff / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd ago';
  const w = Math.floor(d / 7);
  return w + 'w ago';
}

function renderTracks(tracks) {
  const host = $('#tracksList');
  if (!host) return;
  if (!tracks || tracks.length === 0) {
    host.innerHTML = '<div class="tracks-loading">nothing scrobbled yet</div>';
    return;
  }
  host.innerHTML = tracks.map(t => {
    const name = (t.name || 'unknown').replace(/[<>]/g, '');
    const artist = (t.artist?.['#text'] || '').replace(/[<>]/g, '');
    const url = t.url || '#';
    const img = (t.image && t.image.find(i => i.size === 'large')?.['#text']) || '';
    const nowPlaying = t['@attr']?.nowplaying === 'true';
    const when = nowPlaying
      ? '<span class="track-now">now playing</span>'
      : `<span class="track-when">${t.date ? timeAgo(parseInt(t.date.uts, 10)) : ''}</span>`;
    const art = img
      ? `<img class="track-art" src="${img}" alt="" loading="lazy" />`
      : `<div class="track-art"></div>`;
    return `<a class="track-row${nowPlaying ? ' playing' : ''}" href="${url}" target="_blank" rel="noopener">
      ${art}
      <div class="track-meta">
        <span class="track-name">${name}</span>
        <span class="track-artist">${artist}</span>
      </div>
      ${when}
    </a>`;
  }).join('');
}

async function fetchTracks() {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_KEY}&format=json&limit=${LASTFM_COUNT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('lastfm ' + res.status);
  const json = await res.json();
  return json?.recenttracks?.track || [];
}

async function initLastfm() {
  const host = $('#tracksList');
  if (!host) return;
  async function refresh() {
    try {
      const tracks = await fetchTracks();
      renderTracks(tracks);
    } catch (err) {
      console.warn('lastfm failed:', err);
      const section = $('#music');
      if (section && !host.querySelector('.track-row')) section.style.display = 'none';
    }
  }
  await refresh();
  // refresh every 30s to keep "now playing" fresh
  setInterval(refresh, 30000);
}

function initTerminal() {
  const input = $('#termInput');
  const closeBtn = $('#termClose');

  const isTypingTarget = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && !isTypingTarget(e.target) && $('#cmdk')?.hidden !== false) {
      e.preventDefault();
      openTerminal();
    }
    if (e.key === 'Escape' && !$('#terminal').hidden) {
      closeTerminal();
    }
  });

  closeBtn.addEventListener('click', closeTerminal);
  $('#terminal').addEventListener('click', (e) => {
    if (e.target.id === 'terminal') closeTerminal();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeTerminal();
      return;
    }
    if (e.key === 'Enter') {
      const v = input.value;
      if (v.trim()) {
        termHistory.push(v);
        if (termHistory.length > 50) termHistory.shift();
      }
      termHistIdx = termHistory.length;
      runCommand(v);
      input.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (termHistIdx > 0) {
        termHistIdx--;
        input.value = termHistory[termHistIdx];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (termHistIdx < termHistory.length - 1) {
        termHistIdx++;
        input.value = termHistory[termHistIdx];
      } else {
        termHistIdx = termHistory.length;
        input.value = '';
      }
    }
  });
}

// stored in localStorage by default (per-browser, not global).
// GUESTBOOK BACKEND: to make it global, replace loadEntries/saveEntries
// with calls to Firebase, Cusdis, or any JSON backend.
const LS_GUESTBOOK = 'cails-bio:guestbook';
const MAX_ENTRIES = 50;

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(LS_GUESTBOOK) || '[]');
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(LS_GUESTBOOK, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

function renderGuestbook() {
  const list = $('#gbList');
  const entries = loadEntries();
  list.innerHTML = '';
  if (entries.length === 0) {
    const li = document.createElement('li');
    li.className = 'gb-empty';
    li.textContent = 'no signatures yet — be the first.';
    list.appendChild(li);
    return;
  }
  entries.slice().reverse().forEach(e => {
    const li = document.createElement('li');
    li.className = 'gb-entry';
    const when = new Date(e.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    li.innerHTML = `<span class="gb-author">${escapeHtml(e.n)}</span>${escapeHtml(e.m)}<span class="gb-time">${when}</span>`;
    list.appendChild(li);
  });
}

function initGuestbook() {
  const form = $('#gbForm');
  if (!form) return;
  renderGuestbook();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#gbName').value.trim().slice(0, 20);
    const msg = $('#gbMsg').value.trim().slice(0, 120);
    if (!name || !msg) return;
    const entries = loadEntries();
    entries.push({ n: name, m: msg, t: Date.now() });
    saveEntries(entries);
    $('#gbMsg').value = '';
    renderGuestbook();
  });
}

let audioCtx = null;
function getCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function beep(freq = 440, duration = 0.06, type = 'square', gain = 0.04) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0;
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

let _toastTimer = null;
function showToast(msg) {
  let el = document.querySelector('.site-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'site-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function triggerLightMode() {
  document.body.classList.add('light-chaos');
  showToast('MY EYES 🤕');
  setTimeout(() => document.body.classList.remove('light-chaos'), 1500);
}

function triggerConfetti(btn) {
  const rect = btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = ['#7289da','#9b59dc','#3aa5b3','#dc5082','#f7df1e','#ff5e5b'];
  for (let i = 0; i < 30; i++) {
    const bit = document.createElement('div');
    bit.className = 'confetti-bit';
    bit.style.left = cx + 'px';
    bit.style.top  = cy + 'px';
    bit.style.background = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist  = 60 + Math.random() * 100;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 40;
    const rot = (Math.random() - 0.5) * 720 + 'deg';
    bit.style.setProperty('--tx', `translate(${tx}px, ${ty}px)`);
    bit.style.setProperty('--rot', rot);
    bit.style.animationDelay = (Math.random() * 0.15) + 's';
    document.body.appendChild(bit);
    setTimeout(() => bit.remove(), 1100);
  }
}

function showNoSleep() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  showToast(`it's ${h}:${m}. why am i still awake`);
}

function triggerShuffle() {
  if (!TRACKS || TRACKS.length === 0) return;
  let newIdx = Math.floor(Math.random() * TRACKS.length);
  if (TRACKS.length > 1 && newIdx === trackIdx) {
    newIdx = (newIdx + 1) % TRACKS.length;
  }
  loadTrack(newIdx);
  const audio = $('#musicAudio');
  const icon = $('#musicIcon');
  const p = audio.play();
  if (p && typeof p.catch === 'function') p.catch(() => {});
  if (icon) icon.textContent = '⏸';
  showToast(`now playing: ${TRACKS[newIdx].title}`);
}

function initStarfield() {
  const stars = $('#stars');
  if (!stars) return;
  stars.innerHTML = '';
  const count = 380;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left  = (Math.random() * 100).toFixed(2) + 'vw';
    s.style.top   = (Math.random() * 100).toFixed(2) + 'vh';
    const roll = Math.random();
    let size, color, glow;
    if (roll < 0.04) {
      // rare big glowy star, occasionally faint red-tinted to match the blood moon
      size = 3.2;
      const reddish = Math.random() < 0.25;
      color = reddish ? '#ffd0d6' : '#ffffff';
      glow  = reddish ? '0 0 10px rgba(255, 110, 130, 0.7)' : '0 0 8px rgba(255,255,255,0.85)';
    } else if (roll < 0.2) {
      size = 2;
      color = '#ffffff';
      glow  = '0 0 5px rgba(255,255,255,0.7)';
    } else {
      size = Math.random() < 0.5 ? 1.4 : 1;
      color = '#ffffff';
      glow  = '0 0 3px rgba(255,255,255,0.55)';
    }
    s.style.width  = size + 'px';
    s.style.height = size + 'px';
    s.style.background = color;
    s.style.boxShadow  = glow;
    s.style.opacity = (Math.random() * 0.55 + 0.45).toFixed(2);
    s.style.animationDelay = (Math.random() * 6).toFixed(1) + 's';
    s.style.animationDuration = (3.5 + Math.random() * 5).toFixed(1) + 's';
    stars.appendChild(s);
  }
  // cache positions for the constellation feature
  cacheStarPositions();
}

let __starCache = [];
let __starParallax = 0;
function cacheStarPositions() {
  __starCache = [];
  document.querySelectorAll('.star').forEach(el => {
    const r = el.getBoundingClientRect();
    __starCache.push({
      x: r.left + r.width / 2,
      y: r.top + r.height / 2 - __starParallax,
    });
  });
}
window.addEventListener('resize', () => setTimeout(cacheStarPositions, 100));

function initConstellation() {
  const lines = [$('#conLine1'), $('#conLine2'), $('#conLine3')];
  if (!lines[0]) return;
  let lastMove = 0;
  let fadeTimer = null;

  function update(cx, cy) {
    if (!__starCache.length) return;
    // find 3 nearest stars within 230px
    const cands = [];
    const MAX_DIST = 230;
    for (let i = 0; i < __starCache.length; i++) {
      const s = __starCache[i];
      const dx = s.x - cx;
      const dy = (s.y + __starParallax) - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < MAX_DIST * MAX_DIST) cands.push({ d2, x: s.x, y: s.y + __starParallax });
    }
    cands.sort((a, b) => a.d2 - b.d2);
    for (let i = 0; i < 3; i++) {
      const ln = lines[i];
      if (cands[i]) {
        ln.setAttribute('x1', cx);
        ln.setAttribute('y1', cy);
        ln.setAttribute('x2', cands[i].x);
        ln.setAttribute('y2', cands[i].y);
        const closeness = 1 - Math.sqrt(cands[i].d2) / MAX_DIST;
        ln.setAttribute('opacity', (closeness * 0.75).toFixed(2));
      } else {
        ln.setAttribute('opacity', 0);
      }
    }
  }

  let ticking = false;
  let lastX = 0, lastY = 0;
  window.addEventListener('mousemove', e => {
    lastX = e.clientX;
    lastY = e.clientY;
    lastMove = performance.now();
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update(lastX, lastY);
      ticking = false;
    });
    // fade out after stillness
    fadeTimer = setTimeout(() => lines.forEach(l => l.setAttribute('opacity', 0)), 400);
  }, { passive: true });
}

function initComets() {
  const host = $('#comets');
  if (!host) return;
  window.addEventListener('click', e => {
    // only on bg clicks — not on buttons, links, inputs, the music widget, etc.
    if (e.target.closest('a, button, input, textarea, .music, .terminal, .game, .mascot, .gb-form, .work-card, .anime-card, .skill-icon, .webbtn')) return;
    const c = document.createElement('div');
    c.className = 'comet';
    c.style.left = e.clientX + 'px';
    c.style.top  = e.clientY + 'px';
    // angle: mostly diagonal, biased slightly down-right or down-left
    const baseAngle = Math.random() < 0.5 ? 25 : 155;
    const angle = baseAngle + (Math.random() * 20 - 10);
    const dist  = 600 + Math.random() * 300;
    c.style.setProperty('--angle', angle + 'deg');
    c.style.setProperty('--dist',  dist + 'px');
    host.appendChild(c);
    setTimeout(() => c.remove(), 1500);
  });
}

// right-click anywhere on empty bg → JACKPOT! (dante's signature move)
function initJackpot() {
  document.addEventListener('contextmenu', e => {
    // let real right-click work on links/inputs/etc so people can copy / open in new tab
    if (e.target.closest('a, button, input, textarea, select, img, .music, .terminal, .game, .mascot, .gb-form, .work-card, .anime-card, .skill-icon, .webbtn, audio, video')) return;
    e.preventDefault();
    spawnJackpot(e.clientX, e.clientY);
  });
}

// right click = quiet petal scatter from click point (gothic & on-theme, no shouting)
function spawnJackpot(x, y) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const startX = (x / vw) * 100;
  const startY = (y / vh) * 100;
  // 5-7 petals burst outward from click point with random drift directions
  const count = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const drift = (Math.random() - 0.5) * 320;
      spawnPetalAt(startX + (Math.random() - 0.5) * 1.5, startY + (Math.random() - 0.5) * 1, {
        drift,
        dur: 7 + Math.random() * 5,
        size: 10 + Math.random() * 8,
      });
    }, i * 50);
  }
}

let __audioCtx = null;
let __analyser = null;
function initAudioViz() {
  const audio = $('#musicAudio');
  const eq = $('#musicEq');
  if (!audio || !eq) return;
  const bars = [...eq.querySelectorAll('span')];

  function ensureCtx() {
    if (__audioCtx) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      __audioCtx = new Ctx();
      const src = __audioCtx.createMediaElementSource(audio);
      __analyser = __audioCtx.createAnalyser();
      __analyser.fftSize = 64;
      __analyser.smoothingTimeConstant = 0.78;
      src.connect(__analyser);
      __analyser.connect(__audioCtx.destination);
      return true;
    } catch (err) {
      return false;
    }
  }

  let running = false;
  const data = new Uint8Array(32);
  function loop() {
    if (!running || !__analyser) return;
    __analyser.getByteFrequencyData(data);
    // map 32 bins to 4 buckets (bass, low-mid, high-mid, treble)
    const buckets = [
      avg(data, 0, 4),     // bass
      avg(data, 4, 10),    // low-mid
      avg(data, 10, 18),   // high-mid
      avg(data, 18, 28),   // treble
    ];
    for (let i = 0; i < 4; i++) {
      const h = Math.max(20, Math.min(100, (buckets[i] / 255) * 130));
      bars[i].style.height = h + '%';
    }
    requestAnimationFrame(loop);
  }
  function avg(arr, a, b) {
    let s = 0;
    for (let i = a; i < b; i++) s += arr[i];
    return s / (b - a);
  }

  audio.addEventListener('play', () => {
    if (!ensureCtx()) {
      eq.classList.add('fake');
      return;
    }
    if (__audioCtx.state === 'suspended') __audioCtx.resume();
    eq.classList.remove('fake');
    running = true;
    loop();
  });
  audio.addEventListener('pause', () => {
    running = false;
    bars.forEach(b => b.style.height = '25%');
  });
  audio.addEventListener('ended', () => {
    running = false;
    bars.forEach(b => b.style.height = '25%');
  });
}

function initShootingStars() {
  const host = $('#shootingStars');
  if (!host) return;
  function spawn() {
    const s = document.createElement('div');
    s.className = 'shooting-star';
    const startX = Math.random() * 60 + 30;   // 30vw–90vw
    const startY = Math.random() * 40;        // top 40vh
    s.style.left = startX + 'vw';
    s.style.top  = startY + 'vh';
    s.style.setProperty('--dx', -(280 + Math.random() * 220) + 'px');
    s.style.setProperty('--dy',  (140 + Math.random() * 140) + 'px');
    host.appendChild(s);
    setTimeout(() => s.remove(), 2000);
  }
  function loop() {
    spawn();
    const next = 7000 + Math.random() * 14000; // every 7–21s
    setTimeout(loop, next);
  }
  setTimeout(loop, 3500);
}

// persistent counter of petals dropped (per device)
const PETAL_KEY = 'cails-bio:petals-fallen';
let __petalCount = 0;
try { __petalCount = parseInt(localStorage.getItem(PETAL_KEY) || '0', 10) || 0; } catch {}

function bumpPetalCount(n = 1) {
  __petalCount += n;
  const el = document.getElementById('petalCount');
  if (el) el.textContent = __petalCount.toLocaleString();
  try { localStorage.setItem(PETAL_KEY, String(__petalCount)); } catch {}
}

function spawnPetalAt(originX, originY, opts = {}) {
  const host = $('#petals');
  if (!host) return;
  const p = document.createElement('div');
  p.className = 'petal';
  const drift = opts.drift !== undefined ? opts.drift : -(120 + Math.random() * 280);
  const dur   = opts.dur   !== undefined ? opts.dur   : (13 + Math.random() * 9);
  const size  = opts.size  !== undefined ? opts.size  : (11 + Math.random() * 8);
  const tilt  = Math.random() * 360;
  p.style.left = originX + 'vw';
  p.style.top  = originY + 'vh';
  p.style.width  = size + 'px';
  p.style.height = (size * 1.25).toFixed(1) + 'px';
  p.style.setProperty('--drift', drift + 'px');
  p.style.setProperty('--dur', dur + 's');
  p.style.setProperty('--start-rot', tilt + 'deg');
  host.appendChild(p);
  setTimeout(() => p.remove(), dur * 1000 + 600);
  bumpPetalCount(1);
}

// nighttime mode: 11pm–5am local time → bg dims, fog thickens, petals fall slower, cat sleeps deeper
function initNightMode() {
  function check() {
    const h = new Date().getHours();
    const isNight = h >= 23 || h < 5;
    document.body.classList.toggle('night-mode', isNight);
  }
  check();
  // re-check every minute to catch the 11pm / 5am transitions
  setInterval(check, 60 * 1000);
}

function initPetals() {
  const host = $('#petals');
  if (!host) return;

  function ambient() {
    const startX = 58 + Math.random() * 40;
    const startY = Math.random() * 18;
    spawnPetalAt(startX, startY);
  }

  // seed a few in air immediately on load
  for (let i = 0; i < 4; i++) setTimeout(ambient, i * 900 + 300);

  function loop() {
    ambient();
    // at night: petals fall less often, like the tree is sleeping too
    const isNight = document.body.classList.contains('night-mode');
    const next = isNight ? (5500 + Math.random() * 5500) : (2200 + Math.random() * 3000);
    setTimeout(loop, next);
  }
  setTimeout(loop, 4200);

  // wind gust: every 25-45s, spawn 6-9 petals at once with shared strong drift
  function gust() {
    const sharedDrift = -(220 + Math.random() * 220);
    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const sx = 60 + Math.random() * 36;
        const sy = Math.random() * 16;
        spawnPetalAt(sx, sy, { drift: sharedDrift + (Math.random() - 0.5) * 60, dur: 12 + Math.random() * 6 });
      }, i * 180);
    }
    setTimeout(gust, 25000 + Math.random() * 20000);
  }
  setTimeout(gust, 18000);

  // branch click: petal explosion + shake
  document.querySelectorAll('.tree-branch').forEach(branch => {
    branch.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      branch.classList.remove('shake');
      void branch.offsetWidth; // restart animation
      branch.classList.add('shake');
      const rect = branch.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      for (let i = 0; i < 14; i++) {
        setTimeout(() => {
          const px = ((rect.left + Math.random() * rect.width) / vw) * 100;
          const py = ((rect.top  + Math.random() * rect.height * 0.6) / vh) * 100;
          spawnPetalAt(px, py, { drift: (Math.random() - 0.5) * 400, dur: 9 + Math.random() * 5, size: 12 + Math.random() * 8 });
        }, i * 60);
      }
    });
  });

  // init counter display
  bumpPetalCount(0);
}

// thunder rumble: periodic + on click in the blood moon area
function initThunder() {
  const flash = $('#thunderFlash');
  const moon = document.querySelector('.blood-moon');
  if (!flash) return;

  const bolt = $('#lightning');
  function rumble() {
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
    if (bolt) {
      bolt.classList.remove('active');
      void bolt.offsetWidth;
      bolt.classList.add('active');
    }
    if (moon) {
      moon.classList.remove('struck');
      void moon.offsetWidth;
      moon.classList.add('struck');
    }
    setTimeout(() => {
      flash.classList.remove('active');
      bolt && bolt.classList.remove('active');
      moon && moon.classList.remove('struck');
    }, 1200);
  }

  // periodic atmospheric rumble every 2-4 min
  function loop() {
    rumble();
    setTimeout(loop, 130000 + Math.random() * 110000);
  }
  setTimeout(loop, 60000); // first one after 1 min

  // click in upper-right quadrant (where the moon visually sits) → manual strike
  document.addEventListener('click', e => {
    if (e.target.closest('a, button, input, textarea, .music, .terminal, .game, .work-card, .anime-card, .skill-icon, .webbtn, .mascot, .tree-branch, .gb-form')) return;
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    if (x > 0.62 && y < 0.38) rumble();
  });
}

// command palette: cmd/ctrl + K opens it
function initCmdK() {
  const modal = $('#cmdk');
  const input = $('#cmdkInput');
  const list  = $('#cmdkList');
  const backdrop = $('#cmdkBackdrop');
  if (!modal || !input || !list) return;

  const COMMANDS = [
    { icon: '🌸', name: 'trigger wind gust',     tag: 'fx',   run: () => spawnWindGust() },
    { icon: '⚡', name: 'thunder rumble',         tag: 'fx',   run: () => triggerThunder() },
    { icon: '🦅', name: 'send a crow',            tag: 'fx',   run: () => spawnCrowNow() },
    { icon: '🍎', name: 'ryuk mode (10s)',        tag: 'easter', run: () => triggerRyuk() },
    { icon: '🎮', name: 'open snake game',        tag: 'play', run: () => { const b = document.querySelector('[data-action="snake"]'); b && b.click(); } },
    { icon: '>_', name: 'open terminal',          tag: 'play', run: () => { const t = document.querySelector('[data-action="terminal"]'); if (t) t.click(); else if (typeof openTerminal === 'function') openTerminal(); } },
    { icon: '♪', name: 'play / pause music',      tag: 'music', run: () => $('#musicBtn') && $('#musicBtn').click() },
    { icon: '⏭', name: 'next track',              tag: 'music', run: () => $('#musicNext') && $('#musicNext').click() },
    { icon: '🔀', name: 'shuffle a random track', tag: 'music', run: () => triggerShuffle() },
    { icon: '↓', name: 'jump to about',           tag: 'nav',  run: () => location.hash = '#about' },
    { icon: '↓', name: 'jump to anime stats',     tag: 'nav',  run: () => location.hash = '#anime' },
    { icon: '↓', name: 'jump to my work',         tag: 'nav',  run: () => location.hash = '#work' },
    { icon: '↓', name: 'jump to arcade',          tag: 'nav',  run: () => location.hash = '#arcade' },
    { icon: '🎌', name: 'open anime.cail.love',   tag: 'link', run: () => window.open('https://anime.cail.love', '_blank', 'noopener') },
    { icon: '☆', name: 'open github',             tag: 'link', run: () => window.open('https://github.com/cailfn1', '_blank', 'noopener') },
  ];

  let active = 0;
  let filtered = COMMANDS.slice();

  function render() {
    if (filtered.length === 0) {
      list.innerHTML = '<li class="cmdk-empty">no commands match. try `petal`, `music`, `ryuk`...</li>';
      return;
    }
    list.innerHTML = filtered.map((c, i) =>
      `<li class="cmdk-item${i === active ? ' active' : ''}" data-i="${i}" role="option">
        <span class="cmdk-icon">${c.icon}</span>
        <span class="cmdk-name">${c.name}</span>
        <span class="cmdk-tag">${c.tag}</span>
      </li>`
    ).join('');
    // hover/click handlers
    list.querySelectorAll('.cmdk-item').forEach(el => {
      el.addEventListener('mouseenter', () => { active = +el.dataset.i; render(); });
      el.addEventListener('click', () => execute());
    });
    // scroll active into view
    const cur = list.querySelector('.cmdk-item.active');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  function filter(query) {
    const q = query.toLowerCase().trim();
    if (!q) { filtered = COMMANDS.slice(); }
    else { filtered = COMMANDS.filter(c => (c.name + ' ' + c.tag).toLowerCase().includes(q)); }
    active = 0;
    render();
  }

  function open() {
    modal.hidden = false;
    input.value = '';
    filter('');
    setTimeout(() => input.focus(), 30);
  }
  function close() {
    modal.hidden = true;
    input.blur();
  }
  function execute() {
    const cmd = filtered[active];
    close();
    if (cmd) setTimeout(() => cmd.run(), 60);
  }

  window.addEventListener('keydown', e => {
    const cmdOrCtrl = e.metaKey || e.ctrlKey;
    if (cmdOrCtrl && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      modal.hidden ? open() : close();
      return;
    }
    if (modal.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1); render(); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); active = Math.max(active - 1, 0); render(); return; }
    if (e.key === 'Enter')     { e.preventDefault(); execute(); return; }
  });

  input.addEventListener('input', () => filter(input.value));
  backdrop && backdrop.addEventListener('click', close);
}

// helper functions for cmd palette
function spawnWindGust() {
  const drift = -(220 + Math.random() * 220);
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      spawnPetalAt(60 + Math.random() * 36, Math.random() * 16, { drift: drift + (Math.random() - 0.5) * 60, dur: 12 + Math.random() * 5 });
    }, i * 150);
  }
}
function triggerThunder() {
  const flash = $('#thunderFlash');
  const bolt = $('#lightning');
  const moon = document.querySelector('.blood-moon');
  if (!flash) return;
  flash.classList.remove('active'); void flash.offsetWidth; flash.classList.add('active');
  if (bolt) { bolt.classList.remove('active'); void bolt.offsetWidth; bolt.classList.add('active'); }
  if (moon) { moon.classList.remove('struck'); void moon.offsetWidth; moon.classList.add('struck'); }
  setTimeout(() => {
    flash.classList.remove('active');
    bolt && bolt.classList.remove('active');
    moon && moon.classList.remove('struck');
  }, 1200);
}
function spawnCrowNow() {
  const host = $('#crowHost');
  if (!host) return;
  const c = document.createElement('div');
  c.className = 'crow';
  c.innerHTML = `<svg viewBox="0 0 40 24" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="14" rx="5.5" ry="2.4"/>
    <circle cx="14" cy="13" r="2.4"/>
    <path d="M 11.5 13 L 8.5 13.5 L 11.5 14 Z"/>
    <path d="M 20 12 L 8 4 Q 14 9 18 11 Z"/>
    <path d="M 20 12 L 32 4 Q 26 9 22 11 Z"/>
  </svg>`;
  c.style.animation = 'crowWingBeat 0.32s ease-in-out infinite alternate, crowFlyPath 8.5s linear forwards';
  host.appendChild(c);
  setTimeout(() => c.remove(), 9000);
}

// konami code → cursor becomes ryuk holding an apple for 10s
function initKonami() {
  const SEQ = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
  let idx = 0;
  window.addEventListener('keydown', e => {
    // ignore when typing in inputs
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    const k = e.key.toLowerCase();
    if (k === SEQ[idx]) {
      idx++;
      if (idx >= SEQ.length) {
        idx = 0;
        triggerRyuk();
      }
    } else {
      idx = (k === SEQ[0]) ? 1 : 0;
    }
  });
}

function triggerRyuk() {
  document.body.classList.add('ryuk-mode');
  if (typeof showToast === 'function') showToast('found one of em 🍎');
  setTimeout(() => document.body.classList.remove('ryuk-mode'), 10000);
}

// lone crow: flies across the sky every 2-3 minutes
function initCrow() {
  const host = $('#crowHost');
  if (!host) return;
  function fly() {
    const c = document.createElement('div');
    c.className = 'crow';
    c.innerHTML = `<svg viewBox="0 0 40 24" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="14" rx="5.5" ry="2.4"/>
      <circle cx="14" cy="13" r="2.4"/>
      <path d="M 11.5 13 L 8.5 13.5 L 11.5 14 Z"/>
      <path d="M 20 12 L 8 4 Q 14 9 18 11 Z"/>
      <path d="M 20 12 L 32 4 Q 26 9 22 11 Z"/>
    </svg>`;
    c.style.animation = 'crowWingBeat 0.32s ease-in-out infinite alternate, crowFlyPath 8.5s linear forwards';
    host.appendChild(c);
    setTimeout(() => c.remove(), 9000);
    setTimeout(fly, 130000 + Math.random() * 70000); // 2:10 to 3:20 minutes between
  }
  setTimeout(fly, 45000); // first crow after 45s
}

// each .row section gently lifts + fades in as it enters the viewport
function initScrollReveal() {
  if (reducedMotion) return;
  const rows = document.querySelectorAll('.row');
  if (!rows.length || !('IntersectionObserver' in window)) return;
  rows.forEach(r => r.classList.add('reveal-pending'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('reveal-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  rows.forEach(r => io.observe(r));
}

function initParallax() {
  const stars  = $('#stars');
  const fog    = document.querySelector('.fog');
  const blobs  = document.querySelector('.blobs');
  if (!stars && !fog && !blobs) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      __starParallax = y * -0.18;
      if (stars) stars.style.transform = `translate3d(0, ${__starParallax}px, 0)`;
      if (fog)   fog.style.transform   = `translate3d(0, ${y * -0.32}px, 0)`;
      if (blobs) blobs.style.transform = `translate3d(0, ${y * -0.45}px, 0)`;
      ticking = false;
    });
  }, { passive: true });
}

function initWebBtns() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      switch (btn.dataset.action) {
        case 'lightmode': triggerLightMode();             break;
        case 'confetti':  triggerConfetti(btn);           break;
        case 'terminal':  openTerminal();                 break;
        case 'toast':     showToast(btn.dataset.msg);     break;
        case 'nosleep':   showNoSleep();                  break;
        case 'snake':     openGame();                     break;
        case 'shuffle':   triggerShuffle();               break;
        case 'hint':      showToast('there are hidden things. press / and type help'); break;
      }
    });
  });
}

function initSounds() {
  // first interaction unlocks audio context (browser autoplay policies)
  let unlocked = false;
  const unlock = () => { if (!unlocked) { getCtx(); unlocked = true; } };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  // soft hover tick
  $$('a, button, .skill-icon, .work-card, .avatar').forEach(el => {
    el.addEventListener('mouseenter', () => beep(880, 0.03, 'sine', 0.015));
  });
  // crisper click
  document.addEventListener('click', (e) => {
    if (e.target.closest('a, button, .skill-icon, .work-card, .avatar')) {
      beep(440, 0.05, 'square', 0.03);
    }
  });
}

function initMatrixRain() {
  const canvas = $('#matrixCanvas');
  if (!canvas || reducedMotion) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  // characters: katakana + binary + some symbols for variety
  const KATA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  const DIGITS = '0123456789';
  const SYMS = '∆∇∑∏√∫≈≠≤≥<>{}[]/\\';
  const POOL = KATA + KATA + DIGITS + SYMS;

  // tuning
  const FONT_SIZE = 16;
  const FALL_SPEED = 0.55;
  const SPIKE_SPEED = 1.4;          // fast meteor columns
  const SPIKE_CHANCE = 0.04;        // % of columns that are spikes
  const TRAIL_FADE = 0.09;          // higher = shorter trails (uses destination-out so canvas stays transparent)
  const ACTIVE_RATE = 0.78;         // % of frames a column emits (higher = denser)
  const REPEL_RADIUS = 140;         // px — columns near cursor dim
  const LEAD_BRIGHT = 'rgba(190, 210, 255, 0.7)';
  const TAIL_COLOR  = 'rgba(114, 137, 218, 0.45)';
  const SPIKE_LEAD  = 'rgba(220, 230, 255, 0.95)';
  const SPIKE_TAIL  = 'rgba(150, 170, 235, 0.65)';

  let cols = 0;
  let drops = [], spikes = [], prevChar = [];
  let mouseX = -9999, mouseY = -9999;

  window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(window.innerWidth / FONT_SIZE);
    drops = new Array(cols).fill(0).map(() => Math.random() * (window.innerHeight / FONT_SIZE));
    spikes = new Array(cols).fill(false).map(() => Math.random() < SPIKE_CHANCE);
    prevChar = new Array(cols).fill('');
    ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;
    ctx.textBaseline = 'top';
  }
  resize();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  function frame() {
    // transparent fade — subtracts alpha so blobs behind show through
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0, 0, 0, ${TRAIL_FADE})`;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.globalCompositeOperation = 'source-over';

    ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;

    for (let i = 0; i < cols; i++) {
      const isSpike = spikes[i];
      const speed = isSpike ? SPIKE_SPEED : FALL_SPEED;

      // skip some columns for sparser texture
      if (!isSpike && Math.random() > ACTIVE_RATE) {
        drops[i] += speed;
        continue;
      }

      const ch = POOL[(Math.random() * POOL.length) | 0];
      const x = i * FONT_SIZE;
      const y = drops[i] * FONT_SIZE;

      // mouse repulsion — dim columns near the cursor
      const dx = x - mouseX;
      const dy = y - mouseY;
      const dist = Math.hypot(dx, dy);
      const repel = dist < REPEL_RADIUS ? (dist / REPEL_RADIUS) : 1;   // 0..1
      const alphaScale = 0.3 + 0.7 * repel;

      // tail (previous char position, muted color)
      if (prevChar[i]) {
        const tailBase = isSpike ? SPIKE_TAIL : TAIL_COLOR;
        ctx.fillStyle = scaleAlpha(tailBase, alphaScale);
        ctx.fillText(prevChar[i], x, y - FONT_SIZE);
      }

      // lead char — with glow on spikes for that meteor look
      const leadBase = isSpike ? SPIKE_LEAD : LEAD_BRIGHT;
      ctx.fillStyle = scaleAlpha(leadBase, alphaScale);
      if (isSpike) {
        ctx.shadowColor = 'rgba(180, 200, 255, 0.9)';
        ctx.shadowBlur = 8;
      }
      ctx.fillText(ch, x, y);
      if (isSpike) ctx.shadowBlur = 0;

      prevChar[i] = ch;
      drops[i] += speed;

      // reset off-screen
      if (y > window.innerHeight && Math.random() > (isSpike ? 0.96 : 0.974)) {
        drops[i] = -Math.random() * 20;
        prevChar[i] = '';
        // occasionally re-roll spike status when resetting
        if (Math.random() < 0.15) spikes[i] = Math.random() < SPIKE_CHANCE;
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// helper: multiply the alpha of an "rgba(r, g, b, a)" string by a factor
function scaleAlpha(rgba, factor) {
  const m = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) return rgba;
  const a = (m[4] !== undefined ? parseFloat(m[4]) : 1) * factor;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${a.toFixed(3)})`;
}

function initAmbientParticles() {
  if (reducedMotion) return;
  const COUNT = 32;
  // ~75% warm white, ~25% accent blurple, occasional teal
  const colors = [
    { rgb: '255, 255, 255', weight: 0.75 },
    { rgb: '160, 180, 240', weight: 0.20 },
    { rgb: '120, 200, 210', weight: 0.05 },
  ];
  function pickColor() {
    const r = Math.random();
    let acc = 0;
    for (const c of colors) { acc += c.weight; if (r < acc) return c.rgb; }
    return colors[0].rgb;
  }

  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('div');
    p.className = 'ambient-particle';
    const startX = Math.random() * 100;            // vw
    const drift = (Math.random() - 0.5) * 100;     // px sideways drift
    const dur = 20 + Math.random() * 22;           // 20–42s (slower, meditative)
    const delay = -Math.random() * dur;
    const size = 1.5 + Math.random() * 3.5;        // 1.5–5px
    const opacity = 0.35 + Math.random() * 0.55;
    const colorRgb = pickColor();
    const glowR = (size * 4).toFixed(0);

    p.style.left = startX + 'vw';
    p.style.width = p.style.height = size.toFixed(1) + 'px';
    p.style.setProperty('--drift', drift.toFixed(0) + 'px');
    p.style.animationDuration = dur.toFixed(1) + 's';
    p.style.animationDelay = delay.toFixed(1) + 's';
    p.style.background = `rgba(${colorRgb}, ${opacity.toFixed(2)})`;
    p.style.boxShadow = `0 0 ${glowR}px rgba(${colorRgb}, ${(opacity * 0.7).toFixed(2)})`;
    document.body.appendChild(p);
  }
}

// downsample dante + quantize colors to ~8 levels per channel for a real "8-bit sprite" feel
function pixelateDante() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const PX = 36;
    const c = document.createElement('canvas');
    c.width = PX;
    c.height = PX;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // crop tight to dante's face + a bit of his coat
    const w = img.width;
    const h = img.height;
    const cropSize = Math.min(w, h * 0.78);
    const sx = (w - cropSize) / 2;
    const sy = h * 0.04;
    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, PX, PX);

    // color quantization — bucket each rgb channel into 6 levels so it looks like sprite art
    const LEVELS = 6;
    const STEP = Math.floor(255 / (LEVELS - 1));
    const data = ctx.getImageData(0, 0, PX, PX);
    for (let i = 0; i < data.data.length; i += 4) {
      data.data[i]     = Math.round(data.data[i]     / STEP) * STEP;
      data.data[i + 1] = Math.round(data.data[i + 1] / STEP) * STEP;
      data.data[i + 2] = Math.round(data.data[i + 2] / STEP) * STEP;
      // push dark city background toward transparent
      const lum = data.data[i] * 0.3 + data.data[i + 1] * 0.59 + data.data[i + 2] * 0.11;
      if (lum < 70) data.data[i + 3] = 0;
      else if (lum < 100) data.data[i + 3] = 140;
    }
    ctx.putImageData(data, 0, 0);

    try {
      const url = c.toDataURL('image/png');
      document.documentElement.style.setProperty('--dante-pixel', `url("${url}")`);
    } catch (e) {
      // shouldn't happen, same-origin
    }
  };
  img.src = 'assets/dante.jpg';
}

function initCursor() {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine || reducedMotion) return;

  // native CSS cursor handles tracking — JS only spawns ambient trail + click bursts at raw mouse coords
  let lastTrail = 0;
  const TRAIL_INTERVAL = 55; // less frequent than before for a cleaner look

  function spawnTrail(x, y) {
    const t = document.createElement('div');
    t.className = 'cursor-trail';
    // tiny jitter so the trail isn't a perfectly rigid line
    const jx = (Math.random() - 0.5) * 4;
    const jy = (Math.random() - 0.5) * 4;
    t.style.left = (x + jx) + 'px';
    t.style.top  = (y + jy) + 'px';
    const scale = 0.7 + Math.random() * 0.5;
    t.style.setProperty('--scale', scale);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 900);
  }

  // cold expanding ring ripple on click — single clean element, no warm particles
  function spawnClickRipple(x, y) {
    const r = document.createElement('div');
    r.className = 'click-ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }

  window.addEventListener('mousemove', (e) => {
    const now = performance.now();
    if (now - lastTrail > TRAIL_INTERVAL) {
      spawnTrail(e.clientX, e.clientY);
      lastTrail = now;
    }
  }, { passive: true });

  window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // only left clicks
    const tag = e.target.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
      spawnClickRipple(e.clientX, e.clientY);
    }
  }, { passive: true });
}

const LS_LEADERBOARD = 'cails-bio:snake-leaderboard';
const SNAKE_GRID = 20;       // cells per side
const SNAKE_TICK = 110;      // ms per move (lower = faster)
const SNAKE_TICK_MIN = 60;   // floor for speed-up

const snakeState = {
  running: false,
  loop: null,
  tick: SNAKE_TICK,
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  snake: [],
  food: { x: 10, y: 10 },
  score: 0,
  cell: 20,
  ctx: null,
};

function loadLeaderboard() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_LEADERBOARD) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

function saveLeaderboard(list) {
  localStorage.setItem(LS_LEADERBOARD, JSON.stringify(list.slice(0, 5)));
}

function renderLeaderboard(highlightIdx = -1) {
  const list = $('#lbList');
  if (!list) return;
  const entries = loadLeaderboard();
  list.innerHTML = '';
  if (entries.length === 0) {
    const li = document.createElement('li');
    li.className = 'lb-empty';
    li.textContent = 'no scores yet — be the first.';
    list.appendChild(li);
    return;
  }
  entries.forEach((e, i) => {
    const li = document.createElement('li');
    if (i === highlightIdx) li.classList.add('you');
    li.innerHTML = `<span class="lb-name">${escapeHtml(e.n)}</span><span class="lb-score">${e.s}</span>`;
    list.appendChild(li);
  });
}

function addScore(name, score) {
  const entries = loadLeaderboard();
  entries.push({ n: name.toUpperCase().slice(0, 3) || '???', s: score });
  entries.sort((a, b) => b.s - a.s);
  const trimmed = entries.slice(0, 5);
  saveLeaderboard(trimmed);
  const idx = trimmed.findIndex(e => e.n === name.toUpperCase().slice(0, 3) && e.s === score);
  renderLeaderboard(idx);
}

function snakeRandomFood() {
  const taken = new Set(snakeState.snake.map(s => `${s.x},${s.y}`));
  let x, y, tries = 0;
  do {
    x = Math.floor(Math.random() * SNAKE_GRID);
    y = Math.floor(Math.random() * SNAKE_GRID);
    tries++;
  } while (taken.has(`${x},${y}`) && tries < 200);
  snakeState.food = { x, y };
}

function snakeDraw() {
  const { ctx, cell, snake, food } = snakeState;
  if (!ctx) return;
  const w = SNAKE_GRID * cell;
  // bg
  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, w, w);
  // subtle grid
  ctx.strokeStyle = 'rgba(114, 137, 218, 0.04)';
  ctx.lineWidth = 1;
  for (let i = 1; i < SNAKE_GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, w); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
  }
  // food (glowing dot)
  ctx.fillStyle = '#e84a4a';
  ctx.shadowColor = '#e84a4a';
  ctx.shadowBlur = 12;
  ctx.fillRect(food.x * cell + 3, food.y * cell + 3, cell - 6, cell - 6);
  ctx.shadowBlur = 0;
  // snake
  snake.forEach((seg, i) => {
    const isHead = i === 0;
    ctx.fillStyle = isHead ? '#8ea1e1' : '#7289da';
    if (isHead) {
      ctx.shadowColor = '#7289da';
      ctx.shadowBlur = 14;
    }
    ctx.fillRect(seg.x * cell + 1, seg.y * cell + 1, cell - 2, cell - 2);
    ctx.shadowBlur = 0;
  });
}

function snakeStep() {
  const s = snakeState;
  s.dir = s.nextDir;
  const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

  // wall collision
  if (head.x < 0 || head.x >= SNAKE_GRID || head.y < 0 || head.y >= SNAKE_GRID) {
    snakeGameOver();
    return;
  }
  // self collision
  if (s.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
    snakeGameOver();
    return;
  }
  s.snake.unshift(head);

  if (head.x === s.food.x && head.y === s.food.y) {
    s.score++;
    $('#snakeScore').textContent = s.score;
    beep(660 + s.score * 12, 0.05, 'square', 0.05);
    snakeRandomFood();
    // speed up slightly every 3 foods
    if (s.score % 3 === 0 && s.tick > SNAKE_TICK_MIN) {
      s.tick = Math.max(SNAKE_TICK_MIN, s.tick - 6);
      clearInterval(s.loop);
      s.loop = setInterval(snakeStep, s.tick);
    }
  } else {
    s.snake.pop();
  }
  snakeDraw();
}

function snakeStart() {
  const s = snakeState;
  s.snake = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  s.dir = { x: 1, y: 0 };
  s.nextDir = { x: 1, y: 0 };
  s.score = 0;
  s.tick = SNAKE_TICK;
  $('#snakeScore').textContent = '0';
  snakeRandomFood();
  snakeDraw();
  s.running = true;
  $('#gameOverlay').hidden = true;
  clearInterval(s.loop);
  s.loop = setInterval(snakeStep, s.tick);
}

function snakeGameOver() {
  const s = snakeState;
  s.running = false;
  clearInterval(s.loop);
  beep(180, 0.25, 'sawtooth', 0.06);
  setTimeout(() => beep(120, 0.4, 'sawtooth', 0.05), 120);

  const overlay = $('#gameOverlay');
  const title = $('#gameOverlayTitle');
  const sub = $('#gameOverlaySub');
  const initials = $('#snakeInitials');
  const startBtn = $('#gameStart');

  title.textContent = `game over — ${s.score}`;
  const top = loadLeaderboard();
  const qualifies = top.length < 5 || s.score > (top[top.length - 1]?.s ?? 0);

  if (s.score > 0 && qualifies) {
    sub.textContent = 'new high score! enter initials';
    initials.hidden = false;
    initials.value = '';
    startBtn.textContent = 'submit & play again';
    overlay.hidden = false;
    setTimeout(() => initials.focus(), 50);
  } else {
    sub.textContent = 'press space or click to retry';
    initials.hidden = true;
    startBtn.textContent = 'play again';
    overlay.hidden = false;
  }
}

function openGame() {
  const g = $('#game');
  g.hidden = false;
  const overlay = $('#gameOverlay');
  $('#gameOverlayTitle').textContent = 'ready?';
  $('#gameOverlaySub').textContent = 'arrows or wasd to move · eat the red pixels';
  $('#snakeInitials').hidden = true;
  $('#gameStart').textContent = 'start';
  overlay.hidden = false;
  // size the canvas based on layout (keeps it crisp on hi-dpi)
  const canvas = $('#snakeCanvas');
  snakeState.ctx = canvas.getContext('2d');
  snakeState.cell = canvas.width / SNAKE_GRID;
  snakeDraw();
}

function closeGame() {
  $('#game').hidden = true;
  clearInterval(snakeState.loop);
  snakeState.running = false;
}

function initSnake() {
  const playBtn = $('#snakePlay');
  const startBtn = $('#gameStart');
  const closeBtn = $('#gameClose');
  const initials = $('#snakeInitials');

  if (playBtn) playBtn.addEventListener('click', openGame);
  if (closeBtn) closeBtn.addEventListener('click', closeGame);

  startBtn.addEventListener('click', () => {
    if (!initials.hidden && initials.value.trim()) {
      addScore(initials.value.trim(), snakeState.score);
    }
    snakeStart();
  });

  initials.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      startBtn.click();
    }
  });

  // global keybinds for the game
  window.addEventListener('keydown', (e) => {
    // 'g' opens the game when not typing
    if ((e.key === 'g' || e.key === 'G') && $('#game').hidden &&
        !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'))) {
      e.preventDefault();
      openGame();
      return;
    }
    if ($('#game').hidden) return;

    if (e.key === 'Escape') {
      closeGame();
      return;
    }

    // start / restart with space
    if ((e.key === ' ' || e.code === 'Space') && !snakeState.running &&
        e.target !== initials) {
      e.preventDefault();
      startBtn.click();
      return;
    }

    // ignore movement keys while typing initials
    if (e.target === initials) return;

    if (!snakeState.running) return;
    const d = snakeState.dir;
    let nd = null;
    if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && d.y !== 1) nd = { x: 0, y: -1 };
    else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && d.y !== -1) nd = { x: 0, y: 1 };
    else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && d.x !== 1) nd = { x: -1, y: 0 };
    else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && d.x !== -1) nd = { x: 1, y: 0 };
    if (nd) {
      snakeState.nextDir = nd;
      e.preventDefault();
    }
  });

  // click backdrop to close
  $('#game').addEventListener('click', (e) => {
    if (e.target.id === 'game') closeGame();
  });

  renderLeaderboard();
}

// kick off ambient particles ASAP — aurora is pure CSS, no JS needed
initAmbientParticles();

runBoot().then(() => {
  startClock();
  setGreeting();
  initMusic();
  initVisitorCounter();
  typeBio();
  initKonami();
  initAvatarStreak();
  initLanyard();
  initAniList();
  initLastfm();
  initTerminal();
  initGuestbook();
  initWebBtns();
  initStarfield();
  initShootingStars();
  initNightMode();
  initPetals();
  initCrow();
  initThunder();
  initCmdK();
  initScrollReveal();
  initParallax();
  initConstellation();
  initComets();
  initJackpot();
  initAudioViz();
  initSnake();
  initSounds();
  initCursor();
});
