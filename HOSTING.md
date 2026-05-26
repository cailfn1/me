# Hosting cail's bio site

The site is plain HTML/CSS/JS — host it anywhere that serves static files. Here are three free options, easiest first.

## Before you start

Make sure these files exist and you've added your real avatar/music/wallpaper if you want them:

```
index.html
style.css
script.js
assets/
  README.txt
  avatar.png      (optional)
  wallpaper.jpg   (optional)
  music.mp3       (optional — referenced from script.js TRACKS array)
```

## Option 1 — Neocities (easiest, indie vibe)

1. Go to https://neocities.org and create a free account.
2. Pick a username (this becomes your URL: `username.neocities.org`).
3. On the dashboard, click **Edit Site**.
4. Delete the default `index.html`.
5. Drag-and-drop **every file** from `cails bio/` into the file uploader, including the `assets/` folder.
6. Done — your site is live at `https://your-name.neocities.org`.

Pros: free forever, fits the indie aesthetic, supports custom domains on the $5/mo plan.

## Option 2 — GitHub Pages

1. Install Git for Windows: https://git-scm.com/download/win
2. Open PowerShell in the `cails bio` folder and run:
   ```powershell
   git init
   git add .
   git commit -m "initial bio site"
   ```
3. Create a new repo on GitHub called `cails-bio` (public).
4. Push:
   ```powershell
   git remote add origin https://github.com/YOUR-USERNAME/cails-bio.git
   git branch -M main
   git push -u origin main
   ```
5. On GitHub, go to **Settings → Pages**. Set **Source** to `Deploy from a branch`, **Branch** = `main`, **Folder** = `/ (root)`. Save.
6. After ~30 seconds the site is live at `https://YOUR-USERNAME.github.io/cails-bio/`.

Pros: free, version-controlled, easy to update (`git push` redeploys).

## Option 3 — Vercel (fastest deploys, custom domain free)

1. Sign up at https://vercel.com using your GitHub account.
2. Click **Add New → Project → Import** and pick the `cails-bio` repo (push it to GitHub first, see Option 2 steps 1–4).
3. Framework Preset: **Other**. Root Directory: leave empty. Build Command: leave empty. Output: leave empty.
4. Click **Deploy**. Live in ~10 seconds at `https://cails-bio.vercel.app`.
5. To use a custom domain, go to **Settings → Domains** and add yours.

Pros: instant deploys on every git push, free SSL, free custom domain.

## After deploying

Once you have a real URL, update `index.html` so previews look right:

```html
<meta property="og:url" content="https://your-real-url.com/" />
<meta property="og:image" content="https://your-real-url.com/assets/avatar.png" />
```

## Lanyard live Discord status

For the profile card to show your real-time Discord status:

1. Join the Lanyard Discord server: https://discord.gg/lanyard
2. That's it — within a minute the site will pick up your status automatically.

If you leave the Lanyard server, the live indicator silently falls back to the static "online" dot.

## Guestbook

By default the guestbook stores entries in **localStorage** — each visitor only sees their own messages. To make it global:

- Open `script.js` and search for `GUESTBOOK BACKEND`.
- Replace `loadEntries()` and `saveEntries()` with calls to a hosted backend like:
  - **Firebase Firestore** — free tier, no backend code needed.
  - **Cusdis** — drop-in comment widget, free hosted.
  - **A Cloudflare Worker** — 100% free for personal sites, takes ~10 minutes to set up.

Each one gives you a writable JSON endpoint that survives across visitors.
