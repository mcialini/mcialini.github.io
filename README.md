# mcialini.github.io

A collection of independently installable PWA mini-apps hosted on GitHub Pages. No build step. No frameworks. Vanilla JS + Web Components.

---

## Architecture

- **Root (`/`)** — Plain HTML launcher page linking to all apps. Not a PWA (no manifest, no service worker). This is intentional: a root PWA with `scope: "/"` would suppress install prompts for all sub-apps.
- **Sub-apps (`/{app-name}/`)** — Each app is fully self-contained with its own manifest, service worker, icons, and logic. Each can be independently installed to the home screen on iOS and Android.

---

## Project Structure

```
mcialini.github.io/
├── .nojekyll                        ← disables Jekyll; ensures correct MIME types on GitHub Pages
├── index.html                       ← launcher page (NOT a PWA)
├── shared/
│   └── styles.css                   ← CSS design tokens, reset, shared components
└── {app-name}/
    ├── index.html                   ← app shell
    ├── manifest.webmanifest         ← PWA manifest
    ├── sw.js                        ← service worker (scoped to /{app-name}/)
    ├── app.js                       ← SW registration, install prompts, Web Components
    └── icons/
        ├── icon.svg                 ← source icon (export PNGs from this)
        ├── icon-180.png             ← apple-touch-icon (iOS home screen)
        ├── icon-192.png             ← Android home screen
        ├── icon-512.png             ← Android splash screen
        └── icon-maskable-512.png    ← Android adaptive icon (content in center 80%)
```

---

## Adding a New App

### 1. Copy the template

Duplicate the entire `template/` folder and rename it to your app name (lowercase, hyphenated, no spaces):

```
cp -r template/ my-app/
```

### 2. Update `index.html`

| What to change | Where |
|---|---|
| `<title>` | `<head>` |
| `<link rel="manifest" href="...">` | point to `/my-app/manifest.webmanifest` |
| `<meta name="apple-mobile-web-app-title">` | your app's short name |
| `<link rel="apple-touch-icon" href="...">` | point to `/my-app/icons/icon-180.png` |
| `<meta name="theme-color">` | your app's brand color |
| `<h1>` in the header | app name |
| `app-name` attribute on `<install-banner>` | app name |
| `<script src="...">` | point to `/my-app/app.js` |

### 3. Update `manifest.webmanifest`

```json
{
  "name": "My App Full Name",
  "short_name": "My App",
  "id": "/my-app/",
  "start_url": "/my-app/",
  "scope": "/my-app/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#your-color",
  "description": "What this app does.",
  "icons": [
    { "src": "/my-app/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/my-app/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/my-app/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Rules:**
- All paths must be absolute from origin root (start with `/`), not relative.
- `scope` must not overlap with any other installed app's scope.
- `id` decouples the app's identity from its URL — set it and don't change it.

### 4. Update `sw.js`

Change the two values at the top:

```js
const CACHE_NAME = 'my-app-v1';  // bump version (e.g. v2) when you want to invalidate the cache

const PRECACHE = [
  '/my-app/',
  '/my-app/index.html',
  '/my-app/app.js',
  '/my-app/manifest.webmanifest',
  '/shared/styles.css',
  // add any other files your app needs to work offline
];
```

### 5. Update `app.js`

Change the service worker registration path:

```js
navigator.serviceWorker.register('/my-app/sw.js', { scope: '/my-app/' })
```

No other changes are needed in `app.js` — the install logic is generic.

### 6. Create icons

Export from `icons/icon.svg` (or create your own design):

| File | Size | Purpose |
|---|---|---|
| `icon-180.png` | 180×180 | iOS home screen (`apple-touch-icon`) |
| `icon-192.png` | 192×192 | Android home screen |
| `icon-512.png` | 512×512 | Android splash screen |
| `icon-maskable-512.png` | 512×512 | Android adaptive icon — keep content inside center 80% (410×410px) |

Tools: Figma, Inkscape, or `npx pwa-asset-generator icon.svg icons/`.

### 7. Add a card to the root launcher

In the root `index.html`, add an `<a class="app-card">` inside `.app-grid`:

```html
<a class="app-card" href="/my-app/" style="--app-color: #your-color;">
  <div class="app-card-icon">🔥</div>
  <span class="app-card-name">My App</span>
</a>
```

---

## iOS vs Android Install Behaviour

| | iOS Safari | Android Chrome |
|---|---|---|
| Install trigger | Manual: Share → Add to Home Screen | Automatic `beforeinstallprompt` event |
| Prompt UI | `<install-banner>` Web Component (built-in) | `#install-btn` in the app header (built-in) |
| Home screen icon source | `<link rel="apple-touch-icon">` | Manifest `icons` array |
| App title source | `<meta name="apple-mobile-web-app-title">` | Manifest `short_name` |
| Standalone mode | `navigator.standalone === true` | `display-mode: standalone` |
| Service workers | Supported (iOS 11.3+) | Supported |
| Offline | Works via cache-first SW strategy | Works via cache-first SW strategy |

---

## Updating an App's Cache

When you change files in an app, bump the cache version in `sw.js`:

```js
const CACHE_NAME = 'my-app-v2';  // was v1
```

The old cache is automatically deleted in the SW `activate` event.

---

## GitHub Pages Notes

- `.nojekyll` at the repo root disables Jekyll processing and ensures `.webmanifest` files are served with the correct MIME type.
- HTTPS is provided automatically — service workers work out of the box.
- Custom HTTP headers (e.g. `Cache-Control`, `Service-Worker-Allowed`) are not available. All caching is handled client-side in `sw.js`.
- Always use trailing slashes on `start_url` and `scope` (e.g. `/my-app/` not `/my-app`).
- Link to apps with trailing slashes to avoid a redirect.
