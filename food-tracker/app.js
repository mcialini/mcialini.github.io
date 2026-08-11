// ============================================================
// app.js — Food Tracker
//
// 0. Auth gate (Google sign-in, locked to one account by Firestore rules)
// 1. Service worker registration
// 2. Install prompt (iOS banner + Android beforeinstallprompt)
// 3. Bottom sheet / FAB interaction
// 4. Entry form with autocomplete
// 5. Feed rendering (grouped by day)
// 6. Delete entries
// ============================================================

import { FoodDB } from './db.js';

// ---- 0. Auth Gate ----
const authGate = document.getElementById('auth-gate');
const authDenied = document.getElementById('auth-denied');
const appRoot = document.getElementById('app-root');
const signInBtn = document.getElementById('sign-in-btn');
const signOutBtn = document.getElementById('sign-out-btn');

signInBtn.addEventListener('click', () => {
    signInBtn.disabled = true;
    FoodDB.signIn().catch(err => {
        console.error('[Auth] Sign-in failed:', err);
        signInBtn.disabled = false;
    });
});

signOutBtn.addEventListener('click', () => FoodDB.signOut());

FoodDB.onAuthChange(user => {
    if (user && FoodDB.isAllowed()) {
        authGate.style.display = 'none';
        authDenied.style.display = 'none';
        appRoot.style.display = 'flex';
        renderFeed();
    } else if (user) {
        // Signed in, but not the allowed account.
        authGate.style.display = 'none';
        authDenied.style.display = '';
        appRoot.style.display = 'none';
    } else {
        authGate.style.display = '';
        authDenied.style.display = 'none';
        appRoot.style.display = 'none';
    }
});

// ---- 1. Service Worker Registration ----
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/food-tracker/sw.js', { scope: '/food-tracker/', updateViaCache: 'none' })
        .then(reg => {
            // Check for a new SW on every page load
            reg.update();
            // Also check whenever the user returns to the tab
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') reg.update();
            });
        })
        .catch(err => console.warn('[SW] Registration failed:', err));
}

// ---- 2. Bottom Sheet ----
const fab = document.getElementById('fab-btn');
const sheet = document.getElementById('sheet');
const overlay = document.getElementById('sheet-overlay');
const form = document.getElementById('entry-form');
const foodNameInput = document.getElementById('food-name');
const recipeGroup = document.getElementById('recipe-group');
const acList = document.getElementById('autocomplete-list');

function openSheet() {
    sheet.classList.add('open');
    overlay.classList.add('open');
    fab.style.display = 'none';
    // Small delay so the sheet animation finishes before focusing
    setTimeout(() => foodNameInput.focus(), 260);
}

function closeSheet() {
    sheet.classList.remove('open');
    overlay.classList.remove('open');
    fab.style.display = '';
    form.reset();
    acList.classList.remove('visible');
    updateRecipeVisibility();
}

fab.addEventListener('click', openSheet);
overlay.addEventListener('click', closeSheet);

// ---- 4. Source radio → recipe URL visibility ----
function updateRecipeVisibility() {
    const source = form.elements['source'].value;
    recipeGroup.style.display = source === 'cooked' ? '' : 'none';
}

document.querySelectorAll('input[name="source"]').forEach(radio => {
    radio.addEventListener('change', updateRecipeVisibility);
});
updateRecipeVisibility();

// ---- 5. Autocomplete ----
let acActiveIndex = -1;

foodNameInput.addEventListener('input', async () => {
    const val = foodNameInput.value.trim();
    if (val.length < 1) {
        acList.classList.remove('visible');
        return;
    }

    const suggestions = await FoodDB.getSuggestions(val);
    if (suggestions.length === 0) {
        acList.classList.remove('visible');
        return;
    }

    acList.innerHTML = suggestions.map((s, i) =>
        `<div class="autocomplete-item" data-index="${i}">
            <span>${escapeHtml(s.name)}</span>
            <span class="freq">${s.count}×</span>
        </div>`
    ).join('');

    // Store suggestion data for pre-fill
    acList._suggestions = suggestions;
    acActiveIndex = -1;
    acList.classList.add('visible');
});

// Keyboard navigation in autocomplete
foodNameInput.addEventListener('keydown', e => {
    const items = acList.querySelectorAll('.autocomplete-item');
    if (!items.length || !acList.classList.contains('visible')) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        acActiveIndex = Math.min(acActiveIndex + 1, items.length - 1);
        updateAcHighlight(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        acActiveIndex = Math.max(acActiveIndex - 1, 0);
        updateAcHighlight(items);
    } else if (e.key === 'Enter' && acActiveIndex >= 0) {
        e.preventDefault();
        selectSuggestion(acActiveIndex);
    } else if (e.key === 'Escape') {
        acList.classList.remove('visible');
    }
});

function updateAcHighlight(items) {
    items.forEach((el, i) => el.classList.toggle('active', i === acActiveIndex));
}

// Click on autocomplete item
acList.addEventListener('click', e => {
    const item = e.target.closest('.autocomplete-item');
    if (!item) return;
    selectSuggestion(parseInt(item.dataset.index, 10));
});

function selectSuggestion(index) {
    const s = acList._suggestions[index];
    if (!s) return;

    // Pre-fill form with previous entry data
    foodNameInput.value = s.name;

    const sourceRadio = form.querySelector(`input[name="source"][value="${s.source}"]`);
    if (sourceRadio) sourceRadio.checked = true;
    updateRecipeVisibility();

    document.getElementById('recipe-url').value = s.recipeUrl || '';
    document.getElementById('notes').value = s.notes || '';

    acList.classList.remove('visible');
}

// Close autocomplete when clicking outside
document.addEventListener('click', e => {
    if (!e.target.closest('.autocomplete-wrapper')) {
        acList.classList.remove('visible');
    }
});

// ---- 6. Form Submit ----
form.addEventListener('submit', async e => {
    e.preventDefault();

    const name = foodNameInput.value.trim();
    if (!name) return;

    const entry = {
        name,
        source: form.elements['source'].value,
        recipeUrl: form.elements['source'].value === 'cooked' ? document.getElementById('recipe-url').value : '',
        notes: document.getElementById('notes').value,
    };

    await FoodDB.add(entry);
    closeSheet();
    renderFeed();
});

// ---- 7. Feed Rendering ----
const feed = document.getElementById('feed');
const emptyState = document.getElementById('empty-state');

const SOURCE_LABELS = {
    cooked: '🍳 Cooked',
    premade: '📦 Premade',
    takeout: '🥡 Takeout',
};

function formatDayLabel(dateStr) {
    const today = new Date();
    const d = new Date(dateStr + 'T00:00:00');
    const diffDays = Math.floor((today.setHours(0, 0, 0, 0) - d.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function dateKey(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

async function renderFeed() {
    const entries = await FoodDB.getAll(); // newest day first

    if (entries.length === 0) {
        emptyState.style.display = '';
        // Remove day groups but keep empty state
        feed.querySelectorAll('.day-group').forEach(el => el.remove());
        return;
    }

    emptyState.style.display = 'none';

    // Group by day
    const groups = new Map();
    for (const entry of entries) {
        const key = dateKey(entry.timestamp);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(entry);
    }

    // Within each day, sort oldest-first (ascending timestamp)
    for (const [, dayEntries] of groups) {
        dayEntries.sort((a, b) => a.timestamp - b.timestamp);
    }

    // Build HTML
    let html = '';
    for (const [day, dayEntries] of groups) {
        html += `<div class="day-group">`;
        html += `<div class="day-label">${formatDayLabel(day)}</div>`;
        for (const e of dayEntries) {
            html += `<div class="entry-card" data-id="${e.id}">`;
            html += `<button class="entry-delete" aria-label="Delete entry" data-id="${e.id}">&times;</button>`;
            html += `<div class="entry-name">${escapeHtml(e.name)}</div>`;
            html += `<div class="entry-meta">`;
            html += `<span class="entry-source">${SOURCE_LABELS[e.source] || e.source}</span>`;
            html += `<span>${formatTime(e.timestamp)}</span>`;
            html += `</div>`;
            if (e.notes) {
                html += `<div class="entry-notes">${escapeHtml(e.notes)}</div>`;
            }
            if (e.recipeUrl) {
                html += `<div class="entry-recipe"><a href="${escapeAttr(e.recipeUrl)}" target="_blank" rel="noopener">View Recipe ↗</a></div>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
    }

    // Remove old day groups, keep empty state element
    feed.querySelectorAll('.day-group').forEach(el => el.remove());
    feed.insertAdjacentHTML('beforeend', html);
}

// ---- 8. Delete ----
feed.addEventListener('click', async e => {
    const btn = e.target.closest('.entry-delete');
    if (!btn) return;

    const id = btn.dataset.id;
    if (!confirm('Delete this entry?')) return;

    await FoodDB.remove(id);
    renderFeed();
});

// ---- Helpers ----
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Init ----
// Rendering is now driven by FoodDB.onAuthChange() above, once the
// signed-in user is confirmed to be the allowed account.
