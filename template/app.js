// ============================================================
// app.js — Template App
//
// Responsibilities:
//   1. Register the service worker
//   2. Define <install-banner> Web Component (iOS install prompt)
//   3. Handle Android/Chrome beforeinstallprompt for the #install-btn
//
// When copying for a new app, no changes needed here —
// the SW path is the only thing to update (see comment below).
// ============================================================

// ---- 1. Service Worker Registration ----
if ('serviceWorker' in navigator) {
    // Update the SW path when copying this template to a new app.
    navigator.serviceWorker
        .register('/template/sw.js', { scope: '/template/' })
        .catch(err => console.warn('[SW] Registration failed:', err));
}

// ---- 2. iOS Install Banner Web Component ----
class InstallBanner extends HTMLElement {
    static get observedAttributes() { return ['app-name']; }

    connectedCallback() {
        if (this._shouldShow()) this._render();
    }

    _shouldShow() {
        // Already installed as standalone — no prompt needed
        if (this._isStandalone()) return false;
        // User already dismissed the banner
        if (localStorage.getItem('install-dismissed')) return false;
        // Only show on iOS Safari (Android gets beforeinstallprompt instead)
        return this._isIosSafari();
    }

    _isIosSafari() {
        const ua = navigator.userAgent;
        const isIos = /iP(hone|od|ad)/.test(ua);
        const isWebKit = /WebKit/.test(ua);
        // Exclude Chrome for iOS, Firefox for iOS, Opera for iOS
        const isBrowserChrome = /(CriOS|FxiOS|OPiOS|mercury)/.test(ua);
        return isIos && isWebKit && !isBrowserChrome;
    }

    _isStandalone() {
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            navigator.standalone === true
        );
    }

    _render() {
        const appName = this.getAttribute('app-name') || 'this app';

        // Shadow DOM isolates banner styles from the page
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        .banner {
          position: fixed;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          left: 16px;
          right: 16px;
          background: #1a73e8;
          color: #fff;
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          line-height: 1.45;
          animation: slide-up 0.25s ease-out;
        }

        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        .icon {
          font-size: 22px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .text { flex: 1; }

        .title {
          font-weight: 600;
          margin-bottom: 2px;
        }

        .close {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.75);
          font-size: 22px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          flex-shrink: 0;
          /* Minimum tap target */
          min-width: 44px;
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .close:hover { color: #fff; }
      </style>

      <div class="banner" role="status" aria-live="polite">
        <span class="icon">📲</span>
        <div class="text">
          <div class="title">Install ${appName}</div>
          <div>Tap <strong>Share</strong> &#x2197;, then <strong>Add to Home Screen</strong></div>
        </div>
        <button class="close" aria-label="Dismiss install prompt">&times;</button>
      </div>
    `;

        this.shadowRoot.querySelector('.close').addEventListener('click', () => {
            localStorage.setItem('install-dismissed', '1');
            this.remove();
        });
    }
}

customElements.define('install-banner', InstallBanner);

// ---- 3. Android / Chrome Install Prompt ----
let _deferredPrompt = null;

window.addEventListener('beforeinstallprompt', event => {
    // Prevent the mini-infobar from appearing automatically
    event.preventDefault();
    _deferredPrompt = event;

    // Reveal the install button in the header (if it exists)
    const btn = document.getElementById('install-btn');
    if (!btn) return;
    btn.hidden = false;

    btn.addEventListener('click', async () => {
        if (!_deferredPrompt) return;
        _deferredPrompt.prompt();
        const { outcome } = await _deferredPrompt.userChoice;
        if (outcome === 'accepted') btn.hidden = true;
        _deferredPrompt = null;
    }, { once: true });
});

// Hide install button after successful installation
window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('install-btn');
    if (btn) btn.hidden = true;
    _deferredPrompt = null;
});
