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

// typewriter tagline that cycles through gothic one-liners with a blinking caret.
// exposed via `taglineRotator` so the avatar easter egg can flash a temp line.
let taglineRotator = null;
function initTaglineRotator() {
  const el = $('#tagline');
  if (!el) return;
  const h = new Date().getHours();
  const tod = h < 5  ? 'up past 3am again'
            : h < 12 ? 'running on too little sleep'
            : h < 17 ? 'should be doing reps'
            : h < 21 ? 'winding down, sort of'
            :          'just some guy (night shift)';
  const PHRASES = [
    'just some guy · california',
    tod,
    'nocturnal by design',
    'probably at the gym',
    'watching anime instead of sleeping',
    'still figuring out the code thing',
  ];

  el.textContent = '';
  const textSpan = document.createElement('span');
  textSpan.className = 'tagline-text';
  const caret = document.createElement('span');
  caret.className = 'tagline-caret';
  caret.setAttribute('aria-hidden', 'true');
  el.append(textSpan, caret);

  if (reducedMotion) {
    textSpan.textContent = PHRASES[0];
    caret.style.display = 'none';
    return;
  }

  let pi = 0, ci = 0, deleting = false, paused = false, hold = 0, timer = null;
  const set = (s) => { textSpan.textContent = s; };
  function schedule(ms) { timer = setTimeout(tick, ms); }
  function tick() {
    if (paused) { schedule(120); return; }
    if (hold > performance.now()) { schedule(80); return; }
    const phrase = PHRASES[pi];
    if (!deleting) {
      ci++; set(phrase.slice(0, ci));
      if (ci >= phrase.length) { deleting = true; hold = performance.now() + 2200; }
      schedule(deleting ? 0 : 52 + Math.random() * 46);
    } else {
      ci--; set(phrase.slice(0, ci));
      if (ci <= 0) { deleting = false; pi = (pi + 1) % PHRASES.length; hold = performance.now() + 320; }
      schedule(26 + Math.random() * 20);
    }
  }
  taglineRotator = {
    // avatar "now offline" easter egg: freeze, show a temp line, then resume typing
    flash(text, ms) {
      paused = true;
      clearTimeout(timer);
      set(text);
      setTimeout(() => { ci = 0; deleting = false; hold = 0; paused = false; schedule(200); }, ms);
    }
  };
  schedule(650);
}

// the hero name reacts to the cursor (letters shove away) and shatters on click
function initReactiveName() {
  const name = $('.hero-name');
  if (!name || reducedMotion) return;
  const letters = Array.from(name.querySelectorAll('.ink'));
  if (!letters.length) return;

  const RADIUS = 115;
  let raf = null, px = -9999, py = -9999, active = false, ready = false;

  // wait for the ink-in load animation to finish, then take over transforms.
  // bake the inkIn end-state into inline styles first, because `animation:none`
  // strips the `forwards` fill and would otherwise revert the letters to opacity:0.
  setTimeout(() => {
    ready = true;
    letters.forEach(l => {
      l.style.opacity = '1';
      l.style.filter = 'none';
      l.style.transform = 'none';
      l.style.animation = 'none';                                   // stop inkIn so it can't replay
      l.style.transition = 'transform 0.34s cubic-bezier(.2,.7,.2,1)';
    });
  }, 1150);

  function apply() {
    raf = null;
    if (!ready) return;
    for (const l of letters) {
      if (l.dataset.shatter === '1') continue;                      // don't fight the shatter anim
      const r = l.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = cx - px, dy = cy - py;
      const dist = Math.hypot(dx, dy);
      if (active && dist < RADIUS) {
        const f = 1 - dist / RADIUS;
        const ux = dx / (dist || 1), uy = dy / (dist || 1);
        l.style.transform = `translate(${ux * f * 26}px, ${uy * f * 26}px) rotate(${ux * f * 13}deg)`;
      } else {
        l.style.transform = 'none';
      }
    }
  }
  window.addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY; active = true;
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });
  window.addEventListener('blur', () => { active = false; if (!raf) raf = requestAnimationFrame(apply); });

  name.style.cursor = 'pointer';
  name.addEventListener('click', () => {
    letters.forEach(l => {
      const ang = Math.random() * Math.PI * 2;
      const mag = 18 + Math.random() * 28;
      l.style.setProperty('--sx', `${Math.cos(ang) * mag}px`);
      l.style.setProperty('--sy', `${Math.sin(ang) * mag - 10}px`);
      l.style.setProperty('--sr', `${(Math.random() * 2 - 1) * 40}deg`);
      l.dataset.shatter = '1';
      l.style.animation = 'none';
      void l.offsetWidth;                                           // restart the animation each click
      l.style.animation = 'inkShatter 0.5s cubic-bezier(.2,.7,.2,1)';
    });
  });
  letters.forEach(l => {
    l.addEventListener('animationend', (e) => {
      if (e.animationName === 'inkShatter') { l.style.animation = 'none'; l.dataset.shatter = '0'; }
    });
  });
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
      if (taglineRotator) taglineRotator.flash('now offline', 4000);
      else tagline.textContent = 'now offline';
      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(() => {
        avatar.classList.remove('offline');
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

// flex the full set of real Discord profile badges (every rare one), regardless of flags
const ALL_BADGES = [
  ...DISCORD_BADGES.map(b => ({ name: b.name, hash: b.hash })),
  { name: 'Discord Nitro',     hash: NITRO_BADGE_HASH },
  { name: 'Completed a Quest', hash: QUEST_BADGE_HASH },
];

function renderDiscordBadges() {
  const wrap = $('#discordBadges');
  if (!wrap || wrap.dataset.rendered) return;   // render once — don't re-trigger the pop-in
  wrap.dataset.rendered = '1';
  wrap.innerHTML = '';
  ALL_BADGES.forEach((b, i) => {
    const span = document.createElement('span');
    span.className = 'dbadge';
    span.setAttribute('data-label', b.name);
    span.style.setProperty('--i', i);
    const img = document.createElement('img');
    img.src = `https://cdn.discordapp.com/badge-icons/${b.hash}.png`;
    img.alt = b.name;
    img.loading = 'lazy';
    img.onerror = () => span.remove();
    span.appendChild(img);
    wrap.appendChild(span);
  });
}

// Discord-style profile hover card on the avatar
function initAvatarCard() {
  const avatar = $('#avatar');
  const card = $('#avatarCard');
  if (!avatar || !card) return;

  // render the badge wall into the card
  const badgeWrap = $('#acBadges');
  if (badgeWrap) {
    ALL_BADGES.forEach(b => {
      const img = document.createElement('img');
      img.src = `https://cdn.discordapp.com/badge-icons/${b.hash}.png`;
      img.alt = b.name;
      img.title = b.name;
      img.loading = 'lazy';
      img.onerror = () => img.remove();
      badgeWrap.appendChild(img);
    });
  }

  // "member since" — derived from the Discord snowflake (account creation time)
  const id = document.body.dataset.discordId;
  const ms = $('#acMemberSince');
  if (id && ms) {
    try {
      const created = new Date(Number((BigInt(id) >> 22n)) + 1420070400000);
      ms.textContent = created.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { ms.textContent = '—'; }
  }

  // show / hide (card is a child of #avatar, so hovering it keeps #avatar hovered)
  let hideT = null;
  const show = () => { clearTimeout(hideT); card.classList.add('show'); };
  const hide = () => { hideT = setTimeout(() => card.classList.remove('show'), 160); };
  avatar.addEventListener('mouseenter', show);
  avatar.addEventListener('mouseleave', hide);
  card.addEventListener('mouseenter', show);
  card.addEventListener('mouseleave', hide);
  if (window.matchMedia('(hover: none)').matches) {
    avatar.addEventListener('click', () => card.classList.toggle('show'));
  }
}

const STATUS_LABEL = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' };
function updateAvatarCard(data) {
  const card = $('#avatarCard');
  if (!card || !data) return;
  const status = data.discord_status || 'offline';
  card.dataset.status = status;
  const st = $('#acStatus'); if (st) st.textContent = STATUS_LABEL[status] || 'Offline';
  const u = data.discord_user || {};
  const nm = $('#acName'); if (nm) nm.textContent = u.global_name || u.username || 'cail';
  const un = $('#acUser'); if (un) un.textContent = '@' + (u.username || 'cail');
  const act = $('#acActivity'), actLabel = $('#acActivityLabel'), actText = $('#acActivityText');
  if (data.listening_to_spotify && data.spotify) {
    if (actLabel) actLabel.textContent = 'listening to spotify';
    if (actText) actText.textContent = `${data.spotify.song} — ${data.spotify.artist}`;
    if (act) act.hidden = false;
  } else {
    const game = Array.isArray(data.activities) ? data.activities.find(a => a.type === 0) : null;
    if (game) {
      if (actLabel) actLabel.textContent = 'playing';
      if (actText) actText.textContent = game.name;
      if (act) act.hidden = false;
    } else if (act) {
      act.hidden = true;
    }
  }
}

function applyDiscordAvatar(user) {
  if (!user || !user.id || !user.avatar) return;
  const av = $('#avatar');
  if (!av) return;
  const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
  const url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
  av.style.backgroundImage = `url('${url}'), linear-gradient(135deg, #2a2d4a, #1a1c2e)`;
  const acPfp = $('#acPfp');
  if (acPfp) acPfp.style.backgroundImage = `url('${url}')`;
  const deco = $('#avatarDeco');
  if (deco && user.avatar_decoration_data && user.avatar_decoration_data.asset) {
    deco.src = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=240&passthrough=true`;
    deco.classList.add('show');
  } else if (deco) {
    deco.classList.remove('show');
    deco.removeAttribute('src');
  }
}

// rotating "currently:" lines shown when Discord activity is idle
const ABOUT_NOW_IDLE = [
  'watching the moon',
  'lifting in the dark',
  'reading the manga',
  'tweaking the css',
  'overthinking it',
  'rewatching frieren',
  'making tea, probably',
  'staring at the gym ceiling',
  'losing at snake',
];
let _aboutNowIdleIdx = -1;
let _aboutNowIdleTimer = null;
let _aboutNowLive = false; // true while real Discord activity is showing

function setAboutNow(text, opts = {}) {
  const el = document.getElementById('aboutNowText');
  const wrap = document.getElementById('aboutNow');
  if (!el || !wrap) return;
  if (el.textContent === text) return;
  el.classList.add('fade');
  setTimeout(() => {
    el.textContent = text;
    wrap.classList.toggle('spotify', !!opts.spotify);
    el.classList.remove('fade');
  }, 220);
}

function startAboutNowIdleRotation() {
  if (_aboutNowIdleTimer) return;
  const tick = () => {
    if (_aboutNowLive) return; // don't fight a real status
    _aboutNowIdleIdx = (_aboutNowIdleIdx + 1) % ABOUT_NOW_IDLE.length;
    setAboutNow(ABOUT_NOW_IDLE[_aboutNowIdleIdx]);
  };
  tick();
  _aboutNowIdleTimer = setInterval(tick, 7000);
}

function initAboutPursuits() {
  // gym → easter-egg toast (anime + code already have href anchors)
  document.querySelectorAll('.as-word[data-word="gym"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof showToast === 'function') showToast('no rest day. no skip day. 🏋️');
    });
  });
}

// ===== visitor geo + live weather + souls map (Cloudflare /api/visit) =====
const VISIT_API = '/api/visit';
const LS_SOUL = 'cails-bio:soul';
const WX_GLYPH = { clear: '✦', clouds: '☁', rain: '🌧', storm: '⛈', snow: '❄', fog: '🌫' };

function flagEmoji(cc) {
  if (!cc || cc.length !== 2) return '';
  const A = 0x1f1e6;
  const u = cc.toUpperCase();
  return String.fromCodePoint(A + u.charCodeAt(0) - 65) + String.fromCodePoint(A + u.charCodeAt(1) - 65);
}

// approximate centroids (lat, lon) for placing pins — common countries
const COUNTRY_LATLON = {
  US:[38,-97],CA:[56,-106],MX:[23,-102],BR:[-10,-55],AR:[-34,-64],CL:[-30,-71],CO:[4,-73],PE:[-10,-76],VE:[8,-66],
  GB:[54,-2],IE:[53,-8],FR:[46,2],ES:[40,-4],PT:[39,-8],DE:[51,10],NL:[52,5],BE:[50,4],LU:[49,6],CH:[47,8],AT:[47,14],
  IT:[42,12],GR:[39,22],PL:[52,19],CZ:[49,15],SK:[48,19],HU:[47,19],RO:[46,25],BG:[42,25],UA:[49,32],BY:[53,28],
  SE:[62,15],NO:[62,10],FI:[64,26],DK:[56,9],IS:[65,-18],EE:[59,26],LV:[57,24],LT:[55,24],RU:[61,90],
  TR:[39,35],IL:[31,35],SA:[24,45],AE:[24,54],QA:[25,51],IR:[32,53],IQ:[33,44],EG:[26,30],MA:[32,-6],DZ:[28,3],TN:[34,9],
  ZA:[-29,24],NG:[10,8],KE:[0,38],GH:[8,-1],ET:[9,40],TZ:[-6,35],
  IN:[22,79],PK:[30,70],BD:[24,90],LK:[7,81],NP:[28,84],
  CN:[36,104],JP:[36,138],KR:[37,128],TW:[24,121],HK:[22,114],
  TH:[15,101],VN:[16,108],PH:[13,122],ID:[-2,118],MY:[4,102],SG:[1,104],
  AU:[-25,134],NZ:[-42,172],
};

let _rainRAF = null;
let _precipCanvas = null;
function startPrecip(kind, intensity = 1) {
  if (reducedMotion || _rainRAF) return;
  const c = document.createElement('canvas');
  c.id = 'rain';
  c.setAttribute('aria-hidden', 'true');
  document.body.appendChild(c);
  _precipCanvas = c;
  const ctx = c.getContext('2d');
  let W, H;
  const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);
  const snow = kind === 'snow';
  const count = Math.floor((snow ? 70 : 100) * intensity);
  const drops = [];
  for (let i = 0; i < count; i++) {
    drops.push(snow
      ? { x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 1.8, v: 0.5 + Math.random() * 1.1, sway: Math.random() * Math.PI * 2 }
      : { x: Math.random() * W, y: Math.random() * H, l: 8 + Math.random() * 14, v: 6 + Math.random() * 6 });
  }
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    if (snow) {
      ctx.fillStyle = 'rgba(226, 226, 236, 0.55)';
      for (const d of drops) {
        d.sway += 0.02; d.y += d.v; d.x += Math.sin(d.sway) * 0.5;
        if (d.y > H) { d.y = -4; d.x = Math.random() * W; }
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(198, 170, 192, 0.20)';
      ctx.lineWidth = 1;
      for (const d of drops) {
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1.4, d.y + d.l); ctx.stroke();
        d.y += d.v; d.x -= 0.5;
        if (d.y > H) { d.y = -d.l; d.x = Math.random() * W; }
      }
    }
    _rainRAF = requestAnimationFrame(draw);
  };
  draw();
}

function scheduleStorm() {
  if (reducedMotion) return;
  const fire = () => {
    if (typeof triggerThunder === 'function') triggerThunder();
    setTimeout(fire, 13000 + Math.random() * 20000);
  };
  setTimeout(fire, 4000 + Math.random() * 6000);
}

function applyGeoGreeting(d) {
  if (!d.city) return;
  const glyph = WX_GLYPH[d.weather] || '🌙';
  let msg;
  if (d.weather === 'rain') msg = `it's raining in ${d.city} right now ${glyph}`;
  else if (d.weather === 'storm') msg = `storms over ${d.city} right now ${glyph}`;
  else if (d.weather === 'snow') msg = `it's snowing in ${d.city} ${glyph}`;
  else if (d.weather === 'fog') msg = `${d.city} is fogged in right now ${glyph}`;
  else msg = `welcome, soul from ${d.city} ${glyph}`;
  setTimeout(() => { if (typeof showToast === 'function') showToast(msg); }, 1500);
}

function applyWeather(d) {
  const w = d.weather;
  if (w === 'fog' || w === 'clouds') document.body.classList.add('wx-fog');
  if (d.isDay === false) document.body.classList.add('night-mode');
  if (reducedMotion) return;
  if (w === 'rain') startPrecip('rain', 1);
  else if (w === 'storm') { startPrecip('rain', 1.4); scheduleStorm(); }
  else if (w === 'snow') startPrecip('snow', 1);
}

function renderSoulsMap(souls) {
  if (!souls) return;
  const cEl = document.getElementById('soulsCountries');
  const tEl = document.getElementById('soulsTotal');
  if (cEl) cEl.textContent = souls.countries;
  if (tEl) tEl.textContent = (souls.total || 0).toLocaleString();
  const map = document.getElementById('soulsMap');
  if (!map) return;
  map.querySelectorAll('.soul-pin').forEach(p => p.remove());
  const by = souls.byCountry || {};
  const counts = Object.values(by);
  const max = counts.length ? Math.max(...counts) : 1;
  for (const [cc, n] of Object.entries(by)) {
    const ll = COUNTRY_LATLON[cc];
    if (!ll) continue;
    const [lat, lon] = ll;
    const x = (lon + 180) / 360 * 100;
    const y = (90 - lat) / 180 * 100;
    const size = 5 + (n / max) * 9;
    const pin = document.createElement('span');
    pin.className = 'soul-pin';
    pin.style.left = x + '%';
    pin.style.top = y + '%';
    pin.style.width = size + 'px';
    pin.style.height = size + 'px';
    pin.title = `${flagEmoji(cc)} ${cc} · ${n}`;
    map.appendChild(pin);
  }
}

async function initVisit() {
  let isNew = false;
  try { isNew = localStorage.getItem(LS_SOUL) !== '1'; } catch {}
  // show whatever souls we already have right away
  fetch('/api/souls', { cache: 'no-store' }).then(r => r.json()).then(j => {
    if (j.ok) renderSoulsMap(j);
  }).catch(() => {});
  try {
    const res = await fetch(VISIT_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isNew }),
    });
    const data = await res.json();
    if (!data.ok) return;
    window.__visit = data;
    if (isNew) { try { localStorage.setItem(LS_SOUL, '1'); } catch {} }
    applyGeoGreeting(data);
    applyWeather(data);
    renderSoulsMap(data.souls);
  } catch {}
}

// ===== live ghost cursors — Cloudflare Durable Object presence (wss://.../api/presence) =====
function initPresence() {
  let ws = null;
  let myId = null;
  let reconnectT = null;
  const ghosts = new Map(); // id -> { el, x, y, tx, ty, lastSeen }
  let lastSend = 0;

  let chip = document.getElementById('soulsNow');
  if (!chip) {
    chip = document.createElement('div');
    chip.id = 'soulsNow';
    chip.className = 'souls-now';
    chip.innerHTML = '<span class="souls-now-dot" aria-hidden="true"></span><span class="souls-now-text"></span>';
    document.body.appendChild(chip);
  }
  const chipText = chip.querySelector('.souls-now-text');

  function updateCount(n) {
    // only reveal when someone ELSE is here (n >= 2) — keeps it magical
    if (n >= 2) {
      chipText.textContent = `${n} souls haunting this page`;
      chip.classList.add('show');
    } else {
      chip.classList.remove('show');
    }
  }

  function moveGhost(id, x, y) {
    if (id === myId || reducedMotion) return;
    let g = ghosts.get(id);
    const px = x * window.innerWidth;
    const py = y * window.innerHeight;
    if (!g) {
      const el = document.createElement('div');
      el.className = 'ghost-cursor';
      el.innerHTML = '<span class="ghost-wisp"></span><span class="ghost-label">a soul</span>';
      document.body.appendChild(el);
      g = { el, x: px, y: py, tx: px, ty: py };
      ghosts.set(id, g);
    }
    g.tx = px; g.ty = py; g.lastSeen = performance.now();
  }
  function removeGhost(id) {
    const g = ghosts.get(id);
    if (g) { g.el.remove(); ghosts.delete(id); }
  }
  function clearGhosts() { ghosts.forEach(g => g.el.remove()); ghosts.clear(); }

  // smooth drift loop
  if (!reducedMotion) {
    const loop = () => {
      const now = performance.now();
      ghosts.forEach((g, id) => {
        if (now - (g.lastSeen || 0) > 10000) { removeGhost(id); return; }
        g.x += (g.tx - g.x) * 0.16;
        g.y += (g.ty - g.y) * 0.16;
        g.el.style.transform = `translate(${g.x}px, ${g.y}px)`;
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  window.addEventListener('pointermove', (e) => {
    if (!ws || ws.readyState !== 1) return;
    const now = performance.now();
    if (now - lastSend < 60) return; // ~16 msgs/sec
    lastSend = now;
    try {
      ws.send(JSON.stringify({
        type: 'move',
        x: +(e.clientX / window.innerWidth).toFixed(4),
        y: +(e.clientY / window.innerHeight).toFixed(4),
      }));
    } catch {}
  }, { passive: true });

  function connect() {
    try {
      const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
      ws = new WebSocket(proto + location.host + '/api/presence');
    } catch { return; }
    ws.addEventListener('message', (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === 'welcome') { myId = m.id; updateCount(m.count); }
      else if (m.type === 'count') updateCount(m.count);
      else if (m.type === 'cursor') moveGhost(m.id, m.x, m.y);
      else if (m.type === 'leave') removeGhost(m.id);
    });
    ws.addEventListener('close', () => {
      clearGhosts();
      chip.classList.remove('show');
      clearTimeout(reconnectT);
      reconnectT = setTimeout(connect, 6000); // gentle reconnect
    });
    ws.addEventListener('error', () => { try { ws.close(); } catch {} });
  }

  connect();
}

function initLanyard() {
  const id = document.body.dataset.discordId;
  if (!id) { startAboutNowIdleRotation(); return; }
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
      renderDiscordBadges();
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

    // mirror the live activity into the about-me "currently:" line
    if (label) {
      _aboutNowLive = true;
      // strip the existing prefix glyph so the badge handles it visually
      const clean = label.replace(/^[▶♪]\s*/, '').trim();
      setAboutNow(clean, { spotify: isSpotify });
    } else {
      _aboutNowLive = false;
      startAboutNowIdleRotation();
    }

    // drive the mood ring + lyric ticker off the live Spotify track
    if (isSpotify) onTrackChange(data.spotify.artist, data.spotify.song);
    else onTrackStop();

    updateAvatarCard(data);
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

// ===== music identity: "on repeat" shrine + lyric ticker + mood ring =====
// driven by the live Spotify track (via Lanyard) + Last.fm, reusing LASTFM_KEY.
function mClean(s) { return String(s == null ? '' : s).replace(/[<>&]/g, ''); }

// ---- mood ring: shift the site's accent + ambient tint by genre ----
const MOOD_TAGS = {
  cold: ['sad','melancholy','melancholic','ambient','slowcore','shoegaze','dream pop','dreampop','lo-fi','lofi','sadcore','ethereal','emo','singer-songwriter','folk','soul','rnb','r&b','chill','downtempo','indie'],
  hot:  ['hip hop','hip-hop','rap','trap','phonk','drill','metal','hardcore','punk','hyperpop','edm','dance','electronic','house','techno','dubstep','breakcore','industrial','rage','party'],
};
async function fetchArtistTags(artist) {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_KEY}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = await res.json();
    return (j?.toptags?.tag || []).slice(0, 8).map(t => (t.name || '').toLowerCase());
  } catch { return []; }
}
function setMood(mood) { document.body.dataset.mood = mood; }
async function applyMood(artist) {
  const tags = await fetchArtistTags(artist);
  let cold = 0, hot = 0;
  for (const t of tags) {
    if (MOOD_TAGS.cold.some(k => t.includes(k))) cold++;
    if (MOOD_TAGS.hot.some(k => t.includes(k)))  hot++;
  }
  setMood(hot > cold ? 'hot' : cold > hot ? 'cold' : 'crimson');
}

// ---- lyric ticker: one rotating line from lrclib, drifting across the bottom ----
let _lyricLines = [], _lyricIdx = 0, _lyricReq = 0;
function hideLyricTicker() {
  const el = $('#lyricTicker');
  if (el) { el.classList.remove('show'); el.innerHTML = ''; }
  _lyricLines = [];
}
function crawlNext() {
  const el = $('#lyricTicker');
  if (!el || !el.classList.contains('show') || !_lyricLines.length) return;
  const line = _lyricLines[_lyricIdx % _lyricLines.length];
  _lyricIdx++;
  el.innerHTML = `<span class="lyric-line">${mClean(line)}</span>`;
  el.firstChild.addEventListener('animationend', crawlNext, { once: true });
}
async function loadLyricsFor(artist, song) {
  const el = $('#lyricTicker');
  if (!el || reducedMotion) return;            // no crawl under reduced-motion
  const req = ++_lyricReq;
  hideLyricTicker();
  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(song)}`;
    const res = await fetch(url);
    if (!res.ok || req !== _lyricReq) return;   // 404 = no lyrics → stay hidden
    const j = await res.json();
    if (req !== _lyricReq) return;              // a newer track superseded this
    const raw = j.plainLyrics || (j.syncedLyrics || '').replace(/\[\d+:\d+[.\d]*\]/g, '');
    const lines = (raw || '').split('\n').map(s => s.trim())
      .filter(s => s && !/^\[.*\]$/.test(s) && s.length > 6 && s.length < 90);
    if (!lines.length) return;
    _lyricLines = lines; _lyricIdx = 0;
    el.classList.add('show');
    crawlNext();
  } catch { /* no lyrics / CORS → stay hidden */ }
}

// ---- track-change dispatch (called from Lanyard's applyPresence) ----
let _curTrackKey = null;
function onTrackChange(artist, song) {
  const key = `${artist} — ${song}`;
  if (key === _curTrackKey) return;
  _curTrackKey = key;
  applyMood(artist);
  loadLyricsFor(artist, song);
}
function onTrackStop() {
  if (_curTrackKey === null) return;
  _curTrackKey = null;
  setMood('crimson');
  hideLyricTicker();
}

// ---- "on repeat" shrine: this week's #1 Last.fm track as a spinning vinyl ----
async function initOnRepeat() {
  const host = $('#onRepeat');
  if (!host) return;
  let tracks = [];
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${LASTFM_USER}&api_key=${LASTFM_KEY}&period=7day&limit=5&format=json`;
    const res = await fetch(url);
    if (res.ok) tracks = (await res.json())?.toptracks?.track || [];
  } catch { tracks = []; }
  if (!Array.isArray(tracks)) tracks = [tracks];      // last.fm returns an object when there's only one
  const top = tracks[0];
  if (!top) { host.style.display = 'none'; return; }
  const name = top.name || '';
  const artist = top.artist?.name || top.artist?.['#text'] || '';
  const plays = parseInt(top.playcount || '0', 10);
  let art = '';
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(name)}&api_key=${LASTFM_KEY}&format=json`;
    const res = await fetch(url);
    if (res.ok) {
      const imgs = (await res.json())?.track?.album?.image || [];
      art = (imgs.find(i => i.size === 'extralarge') || imgs.find(i => i.size === 'large') || {})['#text'] || '';
    }
  } catch {}
  // last.fm serves a placeholder "star" png when it has no real art — treat that as none
  const PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f';
  if (art.includes(PLACEHOLDER)) art = '';
  if (!art) {
    const fb = (top.image && top.image.find(i => i.size === 'large')?.['#text']) || '';
    if (fb && !fb.includes(PLACEHOLDER)) art = fb;
  }
  const rest = tracks.slice(1, 5).map((t, i) => {
    const nm = mClean(t.name || '');
    const ar = mClean(t.artist?.name || t.artist?.['#text'] || '');
    const pl = parseInt(t.playcount || '0', 10);
    return `<li class="or-row"><span class="or-rank">${i + 2}</span><span class="or-trk"><span class="or-name">${nm}</span> <span class="or-artist">— ${ar}</span></span><span class="or-plays">${pl}</span></li>`;
  }).join('');
  const restHtml = rest
    ? `<div class="on-repeat-rest"><ol class="or-list">${rest}</ol><a class="or-link" href="https://www.last.fm/user/${LASTFM_USER}/library/tracks?date_preset=LAST_7_DAYS" target="_blank" rel="noopener">the week's rotation → last.fm</a></div>`
    : '';
  host.innerHTML = `
    <div class="on-repeat-hero">
      <div class="vinyl-frame">
        <div class="vinyl">
          ${art ? `<img class="vinyl-label" src="${art}" alt="" />` : `<div class="vinyl-label vinyl-label-empty"></div>`}
          <div class="vinyl-hole"></div>
        </div>
        <div class="vinyl-arm"></div>
      </div>
      <div class="on-repeat-meta">
        <div class="on-repeat-kicker">on repeat this week</div>
        <div class="on-repeat-track">${mClean(name)}</div>
        <div class="on-repeat-sub">${mClean(artist)} · ${plays} play${plays === 1 ? '' : 's'}</div>
      </div>
    </div>
    ${restHtml}`;
  host.classList.add('show');
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
// GUESTBOOK — backed by the same-origin Cloudflare Worker (/api/guestbook) + KV
const GB_API = '/api/guestbook';
const GB_LIKED_KEY = 'cails-bio:gb-liked'; // soft client-side dedupe for likes
const GB_ADMIN_LS = 'cails-bio:gb-admin'; // owner key (only cail ever sets this)

function gbAdminKey() {
  try { return localStorage.getItem(GB_ADMIN_LS) || ''; } catch { return ''; }
}
function gbIsOwner() {
  return !!gbAdminKey();
}
function gbOwnerLogin() {
  if (gbIsOwner()) {
    if (confirm('sign out of owner mode?')) {
      try { localStorage.removeItem(GB_ADMIN_LS); } catch {}
      loadGuestbook();
      if (typeof refreshLbOwner === 'function') refreshLbOwner();
      if (typeof showToast === 'function') showToast('owner mode off');
    }
    return;
  }
  const k = prompt('admin key');
  if (k && k.trim()) {
    try { localStorage.setItem(GB_ADMIN_LS, k.trim()); } catch {}
    loadGuestbook();
    if (typeof refreshLbOwner === 'function') refreshLbOwner();
    if (typeof showToast === 'function') showToast('owner mode on — reply + clear-board live');
  }
}

function gbLikedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(GB_LIKED_KEY) || '[]')); }
  catch { return new Set(); }
}
function gbMarkLiked(id) {
  const s = gbLikedSet();
  s.add(id);
  localStorage.setItem(GB_LIKED_KEY, JSON.stringify([...s]));
}

function renderGuestbook(messages) {
  const list = $('#gbList');
  const countEl = $('#gbCount');
  if (!list) return;
  if (countEl) countEl.textContent = messages.length ? `${messages.length} message${messages.length === 1 ? '' : 's'}` : '';
  list.innerHTML = '';
  if (!messages || messages.length === 0) {
    const li = document.createElement('li');
    li.className = 'gb-empty';
    li.textContent = 'no signatures yet — be the first.';
    list.appendChild(li);
    return;
  }
  const liked = gbLikedSet();
  const owner = gbIsOwner();
  messages.forEach(m => {
    const li = document.createElement('li');
    li.className = 'gb-entry';
    const when = m.ts ? timeAgo(Math.floor(m.ts / 1000)) : '';
    const isLiked = liked.has(m.id);
    const replies = Array.isArray(m.replies) ? m.replies : [];
    const repliesHtml = replies.map(r => {
      const rwhen = r.ts ? timeAgo(Math.floor(r.ts / 1000)) : '';
      const rdel = owner ? `<button class="gb-del" data-id="${m.id}" data-rid="${r.id}" aria-label="delete reply" title="delete reply">✕</button>` : '';
      return `<div class="gb-reply">` +
        `<span class="gb-reply-author">↳ cail</span>` +
        `<span class="gb-reply-text">${escapeHtml(r.text)}</span>` +
        `<span class="gb-reply-time">${rwhen}</span>` +
        rdel +
      `</div>`;
    }).join('');
    const ownerCtrls = owner
      ? `<button class="gb-reply-btn" data-id="${m.id}">reply</button>` +
        `<button class="gb-del" data-id="${m.id}" aria-label="delete message" title="delete message">✕</button>`
      : '';
    li.innerHTML =
      `<div class="gb-entry-top">` +
        `<span class="gb-author">${escapeHtml(m.name)}</span>` +
        `<span class="gb-time">${when}</span>` +
        ownerCtrls +
        `<button class="gb-like${isLiked ? ' liked' : ''}" data-id="${m.id}" aria-label="like" ${isLiked ? 'disabled' : ''}>` +
          `<span class="gb-like-heart">♥</span><span class="gb-like-count">${m.likes || 0}</span>` +
        `</button>` +
      `</div>` +
      `<div class="gb-text">${escapeHtml(m.text)}</div>` +
      (repliesHtml ? `<div class="gb-replies">${repliesHtml}</div>` : '');
    list.appendChild(li);
  });

  if (owner) wireOwnerControls(list);

  list.querySelectorAll('.gb-like:not(.liked)').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (gbLikedSet().has(id)) return;
      btn.classList.add('liked');
      btn.disabled = true;
      const countSpan = btn.querySelector('.gb-like-count');
      countSpan.textContent = (parseInt(countSpan.textContent, 10) || 0) + 1;
      gbMarkLiked(id);
      try {
        const res = await fetch(GB_API + '/like', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        if (data.ok && typeof data.likes === 'number') countSpan.textContent = data.likes;
      } catch {}
    });
  });
}

function wireOwnerControls(list) {
  // reply: reveal an inline box under the entry, post to /reply with the admin key
  list.querySelectorAll('.gb-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const entry = btn.closest('.gb-entry');
      if (!entry || entry.querySelector('.gb-reply-form')) return;
      const id = btn.dataset.id;
      const form = document.createElement('form');
      form.className = 'gb-reply-form';
      form.innerHTML =
        `<input type="text" maxlength="200" placeholder="reply as cail…" autocomplete="off" />` +
        `<button type="submit">send</button>`;
      entry.appendChild(form);
      const input = form.querySelector('input');
      input.focus();
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim().slice(0, 200);
        if (!text) return;
        const sendBtn = form.querySelector('button');
        sendBtn.disabled = true;
        try {
          const res = await fetch(GB_API + '/reply', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id, text, key: gbAdminKey() }),
          });
          if (res.status === 401) {
            try { localStorage.removeItem(GB_ADMIN_LS); } catch {}
            if (typeof showToast === 'function') showToast('wrong admin key — owner mode off');
            loadGuestbook();
            return;
          }
          const data = await res.json();
          if (data.ok) { await loadGuestbook(); }
          else if (typeof showToast === 'function') showToast(data.error || 'could not reply');
        } catch {
          if (typeof showToast === 'function') showToast('network error — try again');
        } finally {
          sendBtn.disabled = false;
        }
      });
    });
  });

  // delete: message (id) or single reply (id + rid)
  list.querySelectorAll('.gb-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const rid = btn.dataset.rid;
      if (!confirm(rid ? 'delete this reply?' : 'delete this message?')) return;
      try {
        const url = GB_API + '?id=' + encodeURIComponent(id) +
          (rid ? '&rid=' + encodeURIComponent(rid) : '') +
          '&key=' + encodeURIComponent(gbAdminKey());
        const res = await fetch(url, { method: 'DELETE' });
        if (res.status === 401) {
          try { localStorage.removeItem(GB_ADMIN_LS); } catch {}
          if (typeof showToast === 'function') showToast('wrong admin key — owner mode off');
        }
        await loadGuestbook();
      } catch {
        if (typeof showToast === 'function') showToast('network error — try again');
      }
    });
  });
}

async function loadGuestbook() {
  const list = $('#gbList');
  if (!list) return;
  try {
    const res = await fetch(GB_API, { cache: 'no-store' });
    const data = await res.json();
    renderGuestbook(data.messages || []);
  } catch {
    list.innerHTML = '<li class="gb-empty">couldn\'t load the guestbook right now.</li>';
  }
}

function initGuestbook() {
  const form = $('#gbForm');
  if (!form) return;
  loadGuestbook();

  // collapsible form (akryst-style): toggle button reveals the form
  const toggle = $('#gbToggle');
  const cancel = $('#gbCancel');
  const openForm = () => {
    form.hidden = false;
    if (toggle) toggle.hidden = true;
    const msgEl = $('#gbMsg');
    if (msgEl) msgEl.focus();
  };
  const closeForm = () => {
    form.hidden = true;
    if (toggle) toggle.hidden = false;
  };
  if (toggle) toggle.addEventListener('click', openForm);
  if (cancel) cancel.addEventListener('click', closeForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameEl = $('#gbName');
    const msgEl = $('#gbMsg');
    const honeyEl = $('#gbWebsite');
    const btn = form.querySelector('.gb-submit');
    const name = nameEl.value.trim().slice(0, 24);
    const message = msgEl.value.trim().slice(0, 200);
    if (!message) return;

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'signing...';
    try {
      const res = await fetch(GB_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, message, website: honeyEl ? honeyEl.value : '' }),
      });
      const data = await res.json();
      if (data.ok) {
        msgEl.value = '';
        if ($('#gbCharCount')) $('#gbCharCount').textContent = '0/200';
        closeForm();
        await loadGuestbook();
      } else if (typeof showToast === 'function') {
        showToast(data.error || 'could not post — try again');
      }
    } catch {
      if (typeof showToast === 'function') showToast('network error — try again');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  // live char counter
  const msgEl = $('#gbMsg');
  const charEl = $('#gbCharCount');
  if (msgEl && charEl) {
    msgEl.addEventListener('input', () => {
      charEl.textContent = `${msgEl.value.length}/200`;
    });
  }
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
  const colors = ['#ff8aab','#a01a40','#ff5e5b','#ffd47a','#d8dce4','#8a1538'];
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

// "secret ?" — a different cryptic line each click + a random atmospheric flourish
const SECRET_LINES = [
  'the moon remembers every name written in the book.',
  'you found a door. there are others. keep looking.',
  'death note taught me patience.',
  'every petal that falls is a second you will not get back.',
  'if you are reading this, you scroll too much. (so do i.)',
  'try the konami code. up up down down...',
  'cail.exe has been running since 2026. no crashes yet.',
  'press / and type help. that is where the real secrets live.',
];
let _secretIdx = Math.floor(Math.random() * SECRET_LINES.length);
function revealSecret() {
  _secretIdx = (_secretIdx + 1) % SECRET_LINES.length;
  showToast(SECRET_LINES[_secretIdx]);
  // a random on-screen flourish so it genuinely *does* something
  const fx = [];
  if (typeof spawnCrowNow === 'function')  fx.push(spawnCrowNow);
  if (typeof spawnWindGust === 'function') fx.push(spawnWindGust);
  if (typeof triggerThunder === 'function') fx.push(triggerThunder);
  if (fx.length) { try { fx[Math.floor(Math.random() * fx.length)](); } catch {} }
}

// "hand coded" — cycle through real build-flex facts instead of one static toast
const BUILD_FACTS = [
  '0 dependencies. 0 frameworks. 0 build step.',
  'just html, css, and vanilla js. that is it.',
  'every animation is hand-written css.',
  'deployed on cloudflare workers — no server to babysit.',
  'the guestbook runs on a worker + kv i wrote myself.',
  'view source if you want. it is all right there.',
];
let _factIdx = -1;
function devFlex() {
  _factIdx = (_factIdx + 1) % BUILD_FACTS.length;
  showToast(BUILD_FACTS[_factIdx]);
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
    { icon: '✎', name: 'owner mode — reply to guestbook', tag: 'owner', run: () => gbOwnerLogin() },
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
        case 'devflex':   devFlex();                      break;
        case 'nosleep':   showNoSleep();                  break;
        case 'snake':     openGame();                     break;
        case 'shuffle':   triggerShuffle();               break;
        case 'hint':      revealSecret();                 break;
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

const LS_LEADERBOARD = 'cails-bio:snake-leaderboard'; // local fallback cache
const LB_API = '/api/leaderboard';
const SNAKE_GRID = 20;       // cells per side
const SNAKE_TICK = 110;      // ms per move (lower = faster)
const SNAKE_TICK_MIN = 55;   // floor for speed-up
const BONUS_TTL = 60;        // ticks a golden apple stays on board
const BONUS_CHANCE = 0.012;  // per-tick chance to spawn a golden apple
const BONUS_POINTS = 5;
const COMBO_WINDOW = 2600;   // ms within which consecutive eats keep the combo

const snakeState = {
  running: false,
  paused: false,
  loop: null,
  raf: null,
  tick: SNAKE_TICK,
  dir: { x: 1, y: 0 },
  nextDir: { x: 1, y: 0 },
  snake: [],
  food: { x: 10, y: 10 },
  bonus: null,          // { x, y, ttl }
  particles: [],        // { x, y, vx, vy, life, max, color, size }
  combo: 1,
  lastEat: 0,
  score: 0,
  level: 1,
  cell: 20,
  shake: 0,
  pulse: 0,
  ctx: null,
};

// local cache (offline fallback for the global board)
function loadLeaderboardLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_LEADERBOARD) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}
function saveLeaderboardLocal(list) {
  try { localStorage.setItem(LS_LEADERBOARD, JSON.stringify(list.slice(0, 10))); } catch {}
}

function renderLeaderboard(entries, highlightIdx = -1) {
  const list = $('#lbList');
  if (!list) return;
  list.innerHTML = '';
  if (!entries || entries.length === 0) {
    const li = document.createElement('li');
    li.className = 'lb-empty';
    li.textContent = 'no scores yet — be the first.';
    list.appendChild(li);
    return;
  }
  entries.slice(0, 10).forEach((e, i) => {
    const li = document.createElement('li');
    if (i === highlightIdx) li.classList.add('you');
    li.innerHTML = `<span class="lb-name">${escapeHtml(e.n)}</span><span class="lb-score">${e.s}</span>`;
    list.appendChild(li);
  });
}

// show the owner-only "clear board" button when owner mode is active
function refreshLbOwner() {
  const btn = $('#lbClear');
  if (btn) btn.hidden = !(typeof gbIsOwner === 'function' && gbIsOwner());
}

// pull the global board; fall back to the local cache if offline
async function fetchLeaderboard() {
  refreshLbOwner();
  try {
    const res = await fetch(LB_API, { cache: 'no-store' });
    const data = await res.json();
    if (data.ok && Array.isArray(data.scores)) {
      saveLeaderboardLocal(data.scores);
      renderLeaderboard(data.scores);
      return data.scores;
    }
  } catch {}
  renderLeaderboard(loadLeaderboardLocal());
  return null;
}

// submit a score to the global board; highlight your row on return
async function submitScore(name, score) {
  const cleanName = (name || '').replace(/\s+/g, ' ').trim().slice(0, 12) || 'anon';
  try {
    const res = await fetch(LB_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: cleanName, score }),
    });
    const data = await res.json();
    if (data.ok && Array.isArray(data.scores)) {
      saveLeaderboardLocal(data.scores);
      renderLeaderboard(data.scores, typeof data.rank === 'number' ? data.rank : -1);
      return;
    }
  } catch {}
  // offline fallback: update local cache only
  const entries = loadLeaderboardLocal();
  entries.push({ n: cleanName, s: score });
  entries.sort((a, b) => b.s - a.s);
  const trimmed = entries.slice(0, 10);
  saveLeaderboardLocal(trimmed);
  renderLeaderboard(trimmed, trimmed.findIndex(e => e.n === cleanName && e.s === score));
}

function snakeFreeCell() {
  const s = snakeState;
  const taken = new Set(s.snake.map(p => `${p.x},${p.y}`));
  if (s.food) taken.add(`${s.food.x},${s.food.y}`);
  if (s.bonus) taken.add(`${s.bonus.x},${s.bonus.y}`);
  let x, y, tries = 0;
  do {
    x = Math.floor(Math.random() * SNAKE_GRID);
    y = Math.floor(Math.random() * SNAKE_GRID);
    tries++;
  } while (taken.has(`${x},${y}`) && tries < 300);
  return { x, y };
}

function snakeRandomFood() {
  snakeState.food = snakeFreeCell();
}

function spawnBonus() {
  const cell = snakeFreeCell();
  snakeState.bonus = { x: cell.x, y: cell.y, ttl: BONUS_TTL };
}

// burst of particles at a grid cell (canvas-space)
function snakeBurst(gx, gy, color, n = 14) {
  const s = snakeState;
  const cx = gx * s.cell + s.cell / 2;
  const cy = gy * s.cell + s.cell / 2;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.6 + Math.random() * 2.6;
    const max = 18 + Math.random() * 16;
    s.particles.push({
      x: cx, y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: max, max,
      color,
      size: 1.5 + Math.random() * 2.5,
    });
  }
}

// rounded-rect helper
function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function snakeDraw() {
  const s = snakeState;
  const { ctx, cell, snake, food, bonus } = s;
  if (!ctx) return;
  const w = SNAKE_GRID * cell;

  ctx.save();
  // screen shake (decays in the render loop)
  if (s.shake > 0.2) {
    const sx = (Math.random() - 0.5) * s.shake;
    const sy = (Math.random() - 0.5) * s.shake;
    ctx.translate(sx, sy);
  }

  // bg
  ctx.fillStyle = '#0a0509';
  ctx.fillRect(-8, -8, w + 16, w + 16);
  // faint crimson grid
  ctx.strokeStyle = 'rgba(180, 30, 70, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i < SNAKE_GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, w); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(w, i * cell); ctx.stroke();
  }

  // pulse factor (0..1) shared by food + bonus
  const pulse = 0.5 + 0.5 * Math.sin(s.pulse);

  // food — pulsing crimson glow dot
  {
    const pad = 3 - pulse * 1.2;
    ctx.fillStyle = '#ff5878';
    ctx.shadowColor = '#ff2d5e';
    ctx.shadowBlur = 10 + pulse * 10;
    roundRectPath(ctx, food.x * cell + pad, food.y * cell + pad, cell - pad * 2, cell - pad * 2, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // bonus — golden apple with a TTL ring
  if (bonus) {
    const bx = bonus.x * cell + cell / 2;
    const by = bonus.y * cell + cell / 2;
    const rad = cell / 2 - 2;
    // ttl ring
    const frac = Math.max(0, bonus.ttl / BONUS_TTL);
    ctx.strokeStyle = 'rgba(255, 210, 120, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, rad + 2, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    // apple
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = '#ffb300';
    ctx.shadowBlur = 12 + pulse * 12;
    ctx.beginPath();
    ctx.arc(bx, by, rad - 1.5 + pulse * 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // snake — head bright frost-pink → body gradient to deep crimson
  const n = snake.length;
  snake.forEach((seg, i) => {
    const isHead = i === 0;
    const t = n <= 1 ? 0 : i / n; // 0 head → ~1 tail
    if (isHead) {
      ctx.fillStyle = '#ffd9e3';
      ctx.shadowColor = '#ff5878';
      ctx.shadowBlur = 14;
    } else {
      // lerp #c8285a (near head) → #6a0e2a (tail)
      const r = Math.round(200 - 110 * t);
      const g = Math.round(40 - 26 * t);
      const b = Math.round(90 - 48 * t);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.shadowBlur = 0;
    }
    const pad = isHead ? 1 : 1.5;
    roundRectPath(ctx, seg.x * cell + pad, seg.y * cell + pad, cell - pad * 2, cell - pad * 2, isHead ? 5 : 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // tiny eyes on the head, facing travel direction
    if (isHead) {
      ctx.fillStyle = '#3a0512';
      const ex = seg.x * cell + cell / 2;
      const ey = seg.y * cell + cell / 2;
      const dx = s.dir.x, dy = s.dir.y;
      const off = cell * 0.18;
      const perp = cell * 0.18;
      ctx.beginPath();
      ctx.arc(ex + dx * off - dy * perp, ey + dy * off - dx * perp, 1.6, 0, Math.PI * 2);
      ctx.arc(ex + dx * off + dy * perp, ey + dy * off + dx * perp, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // particles (canvas-space, smooth via rAF)
  for (const p of s.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

// rAF render loop — smooth pulse + particles even though the snake is grid-snapped
function snakeRenderLoop() {
  const s = snakeState;
  s.pulse += 0.12;
  if (s.shake > 0) s.shake *= 0.86;
  // advance particles
  for (const p of s.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= 1;
  }
  s.particles = s.particles.filter(p => p.life > 0);
  snakeDraw();
  // keep looping while game is open (running, paused, or particles settling)
  s.raf = requestAnimationFrame(snakeRenderLoop);
}

function startRenderLoop() {
  if (snakeState.raf == null) snakeState.raf = requestAnimationFrame(snakeRenderLoop);
}
function stopRenderLoop() {
  if (snakeState.raf != null) { cancelAnimationFrame(snakeState.raf); snakeState.raf = null; }
}

function snakeUpdateHud() {
  const s = snakeState;
  const sc = $('#snakeScore'); if (sc) sc.textContent = s.score;
  const lv = $('#snakeLevel'); if (lv) lv.textContent = 'lvl ' + s.level;
  const cb = $('#snakeCombo');
  if (cb) {
    if (s.combo > 1) {
      cb.textContent = '×' + s.combo;
      cb.hidden = false;
      cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop');
    } else {
      cb.hidden = true;
    }
  }
}

function snakeSpeedUp() {
  const s = snakeState;
  if (s.tick > SNAKE_TICK_MIN) {
    s.tick = Math.max(SNAKE_TICK_MIN, s.tick - 5);
    clearInterval(s.loop);
    s.loop = setInterval(snakeStep, s.tick);
  }
  s.level = Math.max(1, Math.round((SNAKE_TICK - s.tick) / 5) + 1);
}

function snakeStep() {
  const s = snakeState;
  if (s.paused) return;
  s.dir = s.nextDir;
  const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

  // wall / self collision — exclude the tail cell (it vacates this tick, so the
  // head may legally follow directly behind it)
  const body = s.snake;
  const hitsSelf = body.some((seg, i) => i !== body.length - 1 && seg.x === head.x && seg.y === head.y);
  if (head.x < 0 || head.x >= SNAKE_GRID || head.y < 0 || head.y >= SNAKE_GRID || hitsSelf) {
    snakeGameOver();
    return;
  }
  s.snake.unshift(head);

  // bonus lifetime + occasional spawn
  if (s.bonus) { s.bonus.ttl--; if (s.bonus.ttl <= 0) s.bonus = null; }
  else if (s.score >= 3 && Math.random() < BONUS_CHANCE) spawnBonus();

  let ate = false;

  // golden apple
  if (s.bonus && head.x === s.bonus.x && head.y === s.bonus.y) {
    const now = performance.now();
    s.combo = (now - s.lastEat <= COMBO_WINDOW) ? s.combo + 1 : 1;
    s.lastEat = now;
    s.score += BONUS_POINTS * s.combo;
    snakeBurst(s.bonus.x, s.bonus.y, '#ffd166', 22);
    beep(1040, 0.08, 'square', 0.06);
    s.bonus = null;
    ate = true;
  }

  // normal food
  if (head.x === s.food.x && head.y === s.food.y) {
    const now = performance.now();
    s.combo = (now - s.lastEat <= COMBO_WINDOW) ? s.combo + 1 : 1;
    s.lastEat = now;
    s.score += s.combo;
    snakeBurst(s.food.x, s.food.y, '#ff5878', 14);
    beep(660 + Math.min(s.score, 40) * 10, 0.05, 'square', 0.05);
    snakeRandomFood();
    snakeSpeedUp();
    ate = true;
  }

  if (!ate) s.snake.pop(); // grew this tick if we ate either item

  snakeUpdateHud();
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
  s.bonus = null;
  s.particles = [];
  s.combo = 1;
  s.level = 1;
  s.lastEat = 0;
  s.shake = 0;
  s.paused = false;
  snakeRandomFood();
  snakeUpdateHud();
  s.running = true;
  $('#gameOverlay').hidden = true;
  clearInterval(s.loop);
  s.loop = setInterval(snakeStep, s.tick);
  startRenderLoop();
}

function snakeGameOver() {
  const s = snakeState;
  s.running = false;
  clearInterval(s.loop);
  s.shake = 16; // kick the screen-shake (decays in the render loop)
  // death burst at the head
  if (s.snake[0]) snakeBurst(s.snake[0].x, s.snake[0].y, '#ff5878', 24);
  beep(180, 0.25, 'sawtooth', 0.06);
  setTimeout(() => beep(120, 0.4, 'sawtooth', 0.05), 120);

  // let the shake + death particles play before the panel covers the board
  setTimeout(() => {
    if (s.running) return; // a new game already started during the delay
    const overlay = $('#gameOverlay');
    const title = $('#gameOverlayTitle');
    const sub = $('#gameOverlaySub');
    const initials = $('#snakeInitials');
    const startBtn = $('#gameStart');

    title.textContent = `game over — ${s.score}`;
    startBtn.hidden = false;

    if (s.score > 0) {
      sub.textContent = 'enter your name for the global board';
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
  }, 480);
}

function openGame() {
  const g = $('#game');
  g.hidden = false;
  const overlay = $('#gameOverlay');
  $('#gameOverlayTitle').textContent = 'ready?';
  $('#gameOverlaySub').textContent = 'arrows / wasd · gold apple = bonus · P to pause';
  $('#snakeInitials').hidden = true;
  $('#gameStart').textContent = 'start';
  overlay.hidden = false;
  // reset HUD
  snakeState.score = 0; snakeState.level = 1; snakeState.combo = 1;
  snakeUpdateHud();
  // size the canvas based on layout (keeps it crisp on hi-dpi)
  const canvas = $('#snakeCanvas');
  snakeState.ctx = canvas.getContext('2d');
  snakeState.cell = canvas.width / SNAKE_GRID;
  if (snakeState.snake.length === 0) snakeRandomFood();
  startRenderLoop();
  fetchLeaderboard(); // refresh the global board on open
}

function closeGame() {
  $('#game').hidden = true;
  clearInterval(snakeState.loop);
  stopRenderLoop();
  snakeState.running = false;
  snakeState.paused = false;
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
      submitScore(initials.value.trim(), snakeState.score);
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

    // pause / resume with P (only mid-run)
    if ((e.key === 'p' || e.key === 'P') && snakeState.running && e.target !== initials) {
      e.preventDefault();
      snakeState.paused = !snakeState.paused;
      const sub = $('#gameOverlaySub');
      const overlay = $('#gameOverlay');
      if (snakeState.paused) {
        $('#gameOverlayTitle').textContent = 'paused';
        sub.textContent = 'press P to resume';
        $('#snakeInitials').hidden = true;
        $('#gameStart').hidden = true;
        overlay.hidden = false;
      } else {
        overlay.hidden = true;
        $('#gameStart').hidden = false;
      }
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

    if (!snakeState.running || snakeState.paused) return;
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

  // owner-only: wipe the global board (reuses guestbook owner mode)
  const lbClear = $('#lbClear');
  if (lbClear) {
    lbClear.addEventListener('click', async () => {
      if (!confirm('wipe the entire global leaderboard?')) return;
      try {
        const res = await fetch(LB_API + '?key=' + encodeURIComponent(gbAdminKey()), { method: 'DELETE' });
        if (res.status === 401) {
          try { localStorage.removeItem(GB_ADMIN_LS); } catch {}
          if (typeof showToast === 'function') showToast('wrong admin key — owner mode off');
          refreshLbOwner();
          return;
        }
        const data = await res.json();
        if (data.ok) {
          if (typeof showToast === 'function') showToast('leaderboard cleared');
          fetchLeaderboard();
        }
      } catch {
        if (typeof showToast === 'function') showToast('network error — try again');
      }
    });
  }

  fetchLeaderboard();
}

// kick off ambient particles ASAP — aurora is pure CSS, no JS needed
initAmbientParticles();

runBoot().then(() => {
  startClock();
  initTaglineRotator();
  initReactiveName();
  renderDiscordBadges();
  initAvatarCard();
  initMusic();
  initVisitorCounter();
  typeBio();
  initKonami();
  initAvatarStreak();
  initLanyard();
  initVisit();
  initPresence();
  initAboutPursuits();
  // if Lanyard hasn't delivered a live status within 4s, start the idle rotation
  setTimeout(() => { if (!_aboutNowLive) startAboutNowIdleRotation(); }, 4000);
  initAniList();
  initLastfm();
  initOnRepeat();
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
