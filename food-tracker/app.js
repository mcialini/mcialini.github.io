// ============================================================
// app.js — Food Tracker
//
// 0. Auth gate (email/password sign-in)
// 1. Service worker registration
// 2. Bottom sheet / FAB interaction
// 3. Entry form with autocomplete
// 4. Feed rendering (grouped by day)
// 5. Delete entries
// ============================================================

import { FoodDB } from './db.js';

// ---- Version indicator (derived from SW cache name) ----
caches.keys().then(keys => {
    const appCache = keys.find(k => k.startsWith('food-tracker-'));
    if (appCache) {
        const ts = appCache.replace('food-tracker-', '');
        const fmt = ts.length === 14
            ? `v${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}-${ts.slice(8, 10)}-${ts.slice(10, 12)}-${ts.slice(12, 14)}`
            : `v${ts}`;
        document.getElementById('version-indicator').textContent = fmt;
    }
});

// ---- 0. Auth Gate ----
const authGate = document.getElementById('auth-gate');
const appRoot = document.getElementById('app-root');
const loginForm = document.getElementById('login-form');
const authError = document.getElementById('auth-error');

loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('sign-in-btn');

    btn.disabled = true;
    authError.style.display = 'none';

    try {
        await FoodDB.signIn(email, password);
    } catch (err) {
        authError.textContent = err.code === 'auth/invalid-credential'
            ? 'Invalid email or password.'
            : `Sign-in error: ${err.message}`;
        authError.style.display = '';
        btn.disabled = false;
    }
});

FoodDB.onAuthChange(user => {
    if (user) {
        authGate.style.display = 'none';
        appRoot.style.display = 'flex';
        renderFeed();
    } else {
        authGate.style.display = '';
        appRoot.style.display = 'none';
    }
});

// ---- 1. Service Worker Registration ----
if ('serviceWorker' in navigator) {
    // Reload the page when a new SW takes over (ensures fresh assets are used)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });

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
const sheetTitle = document.getElementById('sheet-title');
const submitBtn = document.getElementById('submit-btn');
const sheetDeleteBtn = document.getElementById('sheet-delete-btn');

const dateInput = document.getElementById('entry-date');
const timeInput = document.getElementById('entry-time');

// Track whether we're editing an existing entry
let _editingId = null;

// ---- Meal time presets ----
const MEALS = [
    { name: 'Breakfast', hour: 9, minute: 0 },
    { name: 'Lunch', hour: 12, minute: 30 },
    { name: 'Dinner', hour: 19, minute: 0 },
];

const mealChipsContainer = document.getElementById('meal-chips');

/** Build the 6 most recent meal slots going backwards from now. */
function buildMealChips() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Generate meal timestamps for today and the previous 2 days
    const slots = [];
    for (let daysBack = 0; daysBack <= 2; daysBack++) {
        for (const meal of MEALS) {
            const d = new Date(today);
            d.setDate(d.getDate() - daysBack);
            d.setHours(meal.hour, meal.minute, 0, 0);
            if (d <= now) {
                slots.push({
                    label: meal.name + (daysBack > 0 ? ` -${daysBack}` : ''),
                    date: d,
                });
            }
        }
    }

    // Sort by most recent first, take 6
    slots.sort((a, b) => b.date - a.date);
    const recent = slots.slice(0, 6);

    mealChipsContainer.innerHTML = recent.map(s =>
        `<button type="button" class="meal-chip" data-ts="${s.date.getTime()}">${s.label}</button>`
    ).join('');
}

mealChipsContainer.addEventListener('click', e => {
    const chip = e.target.closest('.meal-chip');
    if (!chip) return;
    setDateTimeInputs(new Date(parseInt(chip.dataset.ts, 10)));
});

function openSheet(entry) {
    if (entry) {
        // Edit mode
        _editingId = entry.id;
        sheetTitle.textContent = 'Edit Entry';
        submitBtn.textContent = 'Save Changes';
        sheetDeleteBtn.style.display = '';

        // Pre-fill form
        foodNameInput.value = entry.name;
        setDateTimeInputs(new Date(entry.timestamp));
        const sourceRadio = form.querySelector(`input[name="source"][value="${entry.source}"]`);
        if (sourceRadio) sourceRadio.checked = true;
        updateRecipeVisibility();
        document.getElementById('recipe-url').value = entry.recipeUrl || '';
        document.getElementById('notes').value = entry.notes || '';
    } else {
        // Add mode
        _editingId = null;
        sheetTitle.textContent = 'Add Entry';
        submitBtn.textContent = 'Add Entry';
        sheetDeleteBtn.style.display = 'none';
        setDateTimeInputs(new Date());
    }

    sheet.classList.add('open');
    overlay.classList.add('open');
    fab.style.display = 'none';
    buildMealChips();
    setTimeout(() => foodNameInput.focus(), 260);
}

function setDateTimeInputs(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    dateInput.value = `${y}-${m}-${d}`;
    timeInput.value = `${h}:${min}`;
}

function closeSheet() {
    sheet.classList.remove('open');
    overlay.classList.remove('open');
    fab.style.display = '';
    form.reset();
    acList.classList.remove('visible');
    _editingId = null;
    updateRecipeVisibility();
}

fab.addEventListener('click', () => openSheet());
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

/** Extract the current semicolon-separated token being typed. */
function getCurrentToken() {
    const val = foodNameInput.value;
    const before = val.slice(0, foodNameInput.selectionStart || val.length);
    const parts = before.split(';');
    return parts[parts.length - 1].trim();
}

foodNameInput.addEventListener('input', async () => {
    const token = getCurrentToken();
    if (token.length < 1) {
        acList.classList.remove('visible');
        return;
    }

    const suggestions = await FoodDB.getSuggestions(token);
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

    // Replace only the current semicolon-separated token
    const val = foodNameInput.value;
    const cursorPos = foodNameInput.selectionStart || val.length;
    const before = val.slice(0, cursorPos);
    const after = val.slice(cursorPos);

    const lastSemi = before.lastIndexOf(';');
    const prefix = lastSemi >= 0 ? before.slice(0, lastSemi + 1) + ' ' : '';

    foodNameInput.value = prefix + s.name + after;

    // Pre-fill source/recipe/notes only for full-entry suggestions (ones with source data)
    if (s.source) {
        const sourceRadio = form.querySelector(`input[name="source"][value="${s.source}"]`);
        if (sourceRadio) sourceRadio.checked = true;
        updateRecipeVisibility();

        document.getElementById('recipe-url').value = s.recipeUrl || '';
        document.getElementById('notes').value = s.notes || '';
    }

    acList.classList.remove('visible');
    foodNameInput.focus();
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

    // Use the user-selected date + time, or fallback to now
    const timestamp = (dateInput.value && timeInput.value)
        ? new Date(`${dateInput.value}T${timeInput.value}`).getTime()
        : Date.now();

    const entry = {
        name,
        source: form.elements['source'].value,
        recipeUrl: form.elements['source'].value === 'cooked' ? document.getElementById('recipe-url').value : '',
        notes: document.getElementById('notes').value,
        timestamp,
    };

    if (_editingId) {
        await FoodDB.update(_editingId, entry);
    } else {
        await FoodDB.add(entry);
    }
    closeSheet();
    renderFeed();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ---- Delete (from edit sheet) ----
sheetDeleteBtn.addEventListener('click', async () => {
    if (!_editingId) return;
    if (!confirm('Delete this entry?')) return;
    await FoodDB.remove(_editingId);
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
    const spinner = document.getElementById('loading-spinner');
    spinner.style.display = 'flex';
    emptyState.style.display = 'none';

    // Force a paint so the spinner is visible before the async fetch
    await new Promise(r => setTimeout(r, 0));

    const entries = await FoodDB.getAll(); // newest day first

    spinner.style.display = 'none';

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
            html += `<div class="entry-card" data-id="${e.id}" data-entry='${escapeAttr(JSON.stringify(e))}'>`;
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

// ---- 8. Tap entry to edit ----
feed.addEventListener('click', e => {
    const card = e.target.closest('.entry-card');
    if (!card) return;
    // Don't open edit if user tapped a link inside the card
    if (e.target.closest('a')) return;

    try {
        const entry = JSON.parse(card.dataset.entry);
        openSheet(entry);
    } catch (err) {
        console.warn('[Edit] Could not parse entry data:', err);
    }
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
