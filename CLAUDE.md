# CLAUDE.md — cail.love

> Project memory for Claude Code. Read this first. It lets a fresh session pick up
> the site without re-explaining anything.

## What this is
**cail.love** — cail's personal bio / "corner of the internet." A single-page,
gothic **cold-crimson** site with heavy atmosphere, easter eggs, and a fake
terminal. Vibe: nocturnal, hand-coded, "made for dark mode." Owner: **cail**
(Discord `cail`, GitHub `cailfn1`, Last.fm/AniList `cailfn`).

## Stack & deploy (NO build step)
- **Vanilla** HTML + CSS + JS. No framework, no bundler, no node_modules. Keep it that way.
- Hosted on **Cloudflare Workers** (static assets + a hand-written `worker.js`).
  - `worker.js`: `/api/*` → `handleApi(...)`; everything else → `env.ASSETS.fetch(request)`
    (so static files like `robots.txt`, `sitemap.xml`, a manifest, etc. just serve).
  - Bindings: **Workers KV** `GUESTBOOK` (guestbook + snake leaderboard + rate limits + weather cache),
    secret **`ADMIN_KEY`** (owner mode). `wrangler.jsonc` holds config. Free plan.
- **Repo:** `github.com/cailfn1/me`. **Deploy = `git push`** (Cloudflare auto-builds on push to default branch). No `wrangler deploy`, no interactive `wrangler login`.
- **Cache busting:** `index.html` references `style.css?v=N` and `cail.js?v=N`. **Bump BOTH `N` on every change.** Currently **v119**. `index.html`/`worker.js` themselves aren't versioned (served fresh).

## Files
- `index.html` — markup + `<head>` meta/OG.
- `style.css` — all styles (~4.7k lines).
- `cail.js` — all JS (~3.6k lines), one big file of `initX()` functions wired in a `runBoot().then(...)` chain near the bottom.
- `worker.js` — Cloudflare Worker (guestbook, leaderboard, + dormant endpoints).
- `404.html` — custom crimson 404.
- `og-generator.html` — standalone canvas tool that renders the 1200×630 share card (see "Share card" below).
- `assets/` — `avatar.jpg`, `dante.jpg`, `og.png` (share card), music files (`*.mp3`, `*.m4a`).

## Working conventions (do it this way)
- **ALWAYS** `node --check cail.js` (and `node --check worker.js` if touched) before committing.
- **Verify live after deploy:** poll `https://cail.love/?cb=$RANDOM` for the new `?v=N` and grep for markers (the deploy takes ~30–90s). Example loop used every time:
  ```bash
  for i in $(seq 1 30); do html=$(curl -s "https://cail.love/?cb=$RANDOM");
    echo "$html" | grep -q "v=N" && { echo LIVE; break; }; sleep 5; done
  ```
- Cloudflare drops `.html` (e.g. `/og-generator.html` → 307 → `/og-generator`).
- Edit existing files; don't add new ones unless needed. No new dependencies.
- Commit trailer in use this project: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Secrets:** never handle/ask for `ADMIN_KEY` in chat. Owner mode is set client-side via the guestbook admin prompt → `localStorage['cails-bio:gb-admin']`; the frontend sends it as `?key=` and the Worker validates against the `ADMIN_KEY` secret. Only 2-letter country codes were ever stored server-side (now removed).

## Design system (cold crimson, dark-only — intentional)
- `--accent: #ff8aab` (frost-pink). Crimson family: `#c81e46`, `#8a1538`, `#a01a40`, `#ff5878`, `rgba(180,30,70,...)`. Frost neutral: `#d8dce4`. BG `#0a0a0a` / `#070407`.
- Fonts (Google): **Pirata One** (display/name), **Instrument Serif** (italic headings/taglines), **JetBrains Mono** (UI/terminal/code).
- **No warm "islands"** — kill stray blue/purple/green/orange; keep everything in the crimson palette (the snake's gold apple + power-up colors are the deliberate exception inside the game canvas).
- **No Discord blurple** (`#7289da`) anywhere except the deliberately brand-colored tech-skill icon row.
- Respect `prefers-reduced-motion` (every animation gates on it; `const reducedMotion` at top of cail.js).
- Mood ring: `body[data-mood='cold'|'hot']` re-tints `--accent` based on the current track's genre (Last.fm tags). Night mode: `body.night-mode` (11pm–5am local).

## What's built (feature inventory)
- **Hero:** reactive name (cursor-tilt + click-shatter + periodic blood-drip), typewriter tagline, Discord badge wall (all 14 via Lanyard), now-playing, holographic **character card** (3D tilt + flip + crimson holo foil).
- **Atmosphere:** stars, shooting stars, constellation, comets, petals, fog, ground-fog, **blood-moon** (+ a scroll/idle **eclipse event**), thunder/lightning, crow, sleeping-cat mascot.
- **Cursor:** custom crimson ring (spring-lag) + dot + magnetic lock-on + crimson/ash ember burst on click. Konami → Ryuk cursor. (Gated `hover:fine` + no-reduced-motion.)
- **Scroll:** sections "ink in" on reveal (blade-dash draw) + **decrypt headings** (glyph scramble → resolve).
- **Sections:** about, "find me at" (SVG brand icons, crimson), anime (AniList top-rated), music (Last.fm recent + on-repeat vinyl + lyric ticker via lrclib), work/projects, **arcade (snake)**, guestbook, "cool stuff" buttons.
- **Snake:** food=heart, golden apple + **power-ups** (x2 / slow / shrink / phase), combos, levels, particles, screen-shake, **3·2·1 countdown**, **personal best** (`localStorage cails-bio:snake-best`), **mobile swipe**, **game modes** (classic/wrap/hardcore), HUD bar + power-up legend, global **leaderboard** (KV) with **best-per-name dedup** + **admin per-row delete**.
- **Terminal (`/`):** real **zsh-powerline** modal — CSS-drawn segment arrows (no Nerd Font), blinking block cursor, ANSI colors, red-dot closes. Commands: help/about/whoami/ls/pwd/cat/skills/projects/links/date/echo/clear/exit + **neofetch** (crimson skull + sysinfo) + **tab-completion**.
- **Boot loader:** terminal window that types `./cail.sh` and streams a technical launch log, then fades in (first visit waits on `press ⏎ to launch`, which also unlocks audio).
- **Misc:** command palette (Cmd/Ctrl-K), status bar (visitor count + petals), music widget (audio player + EQ + analyser `__analyser`), toasts, lots of easter eggs.
- **Share card:** OG/Twitter `summary_large_image` → `/assets/og.png` (the designed 1200×630 crimson card).

## Worker endpoints (`worker.js`)
- **Live:** `/api/guestbook` (GET/POST/DELETE+like), `/api/leaderboard` (GET/POST + `DELETE ?key=..[&ts=..]` for admin clear/one-delete). `dedupBest()` keeps one row per player.
- **Dormant (intentionally left, nothing calls them):** `/api/visit`, `/api/souls`, `/api/presence` + a `PresenceRoom` Durable Object in `wrangler.jsonc`. The souls/geo/weather/ghost-cursor features were removed from the frontend; the DO is left because deleting it needs a risky `deleted_classes` migration. Safe to ignore; only scrub if doing a careful Worker cleanup.

## Gotchas / non-obvious things
- `applyPresence` (Discord/Lanyard) ≠ `initPresence` (was ghost cursors — removed).
- Powerline arrows are **CSS triangles** (`clip-path`), NOT `` glyphs — visitors have no Nerd Font.
- **OG image is manual:** this env has no SVG→PNG rasterizer (the only `convert` is the Windows disk tool). To regen the card: open `cail.love/og-generator`, click download, save to `assets/og.png`, bump `?v=` on the meta image URLs.
- Anime covers use **`background-image`** (not `<img>`) — so "lazy-load + alt" needs a real `<img>` swap, not a one-liner.
- The holo card floats `position:absolute; right:-12px; width:248px` only at `≥1024px`, tuned so it never overlaps the badge row.
- Boot/scroll-reveal run inside `runBoot().then(...)` synchronously → no FOUC.

## Roadmap (in progress — user approved all four; do in phases)
1. **SEO/findability:** `robots.txt`, `sitemap.xml`, **JSON-LD Person schema**, canonical link.
2. **Health & a11y:** `:focus-visible` states (currently 0), image `alt` + lazy-load (anime covers), **pause animation loops when `document.hidden`** (15 rAF + 7 intervals run always-on), **web manifest** (installable + crimson icon).
3. **Substance:** a `/now` section + a notes/changelog feed + deeper project write-ups + a sharper, specific bio.
4. **Wow:** **audio-reactive atmosphere** (drive stars/fog/blood-moon from `__analyser` when the music widget plays), View-Transitions scene-cuts, or scroll-velocity ghost typography + blood-drip progress bar.

> Note: this folder is `cails bio`. A sibling `cail/` folder is a separate
> claude-flow scratch project (skills/MCP), unrelated to the website.
