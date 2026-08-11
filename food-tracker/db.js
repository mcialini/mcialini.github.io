// ============================================================
// db.js — Food Tracker IndexedDB Layer
//
// Provides a simple promise-based API over IndexedDB.
// Store: "entries" — one object per food entry.
// Index: "by-timestamp" — for sorted retrieval.
// ============================================================

const FoodDB = (() => {
    const DB_NAME = 'food-tracker';
    const DB_VERSION = 1;
    const STORE = 'entries';

    let _db = null;

    function open() {
        if (_db) return Promise.resolve(_db);

        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    const store = db.createObjectStore(STORE, { keyPath: 'id' });
                    store.createIndex('by-timestamp', 'timestamp', { unique: false });
                }
            };

            req.onsuccess = () => {
                _db = req.result;
                resolve(_db);
            };

            req.onerror = () => reject(req.error);
        });
    }

    function _tx(mode) {
        return open().then(db => {
            const tx = db.transaction(STORE, mode);
            return tx.objectStore(STORE);
        });
    }

    function _req(idbRequest) {
        return new Promise((resolve, reject) => {
            idbRequest.onsuccess = () => resolve(idbRequest.result);
            idbRequest.onerror = () => reject(idbRequest.error);
        });
    }

    // ---- Public API ----

    /** Add a new entry. Returns the entry (with generated id + timestamp). */
    function add(entry) {
        const record = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            name: entry.name.trim(),
            source: entry.source,       // "cooked" | "premade" | "takeout"
            recipeUrl: entry.recipeUrl ? entry.recipeUrl.trim() : '',
            notes: entry.notes ? entry.notes.trim() : '',
        };

        return _tx('readwrite')
            .then(store => _req(store.add(record)))
            .then(() => record);
    }

    /** Delete an entry by id. */
    function remove(id) {
        return _tx('readwrite').then(store => _req(store.delete(id)));
    }

    /** Get all entries, sorted newest-timestamp-first. */
    function getAll() {
        return _tx('readonly').then(store => {
            return _req(store.index('by-timestamp').getAll());
        }).then(rows => {
            // Reverse so newest comes first (for day-group ordering)
            rows.reverse();
            return rows;
        });
    }

    /**
     * Get autocomplete suggestions for a prefix.
     * Returns an array of { name, source, recipeUrl, notes, count }
     * sorted by frequency (most frequent first).
     */
    function getSuggestions(prefix) {
        if (!prefix) return Promise.resolve([]);

        const lower = prefix.toLowerCase();

        return _tx('readonly').then(store => _req(store.getAll())).then(rows => {
            // Count frequency of each name, and keep the most recent entry per name
            const map = new Map();
            for (const row of rows) {
                const key = row.name.toLowerCase();
                if (!key.startsWith(lower)) continue;

                if (map.has(key)) {
                    const existing = map.get(key);
                    existing.count++;
                    // Keep the most recent entry's data for pre-fill
                    if (row.timestamp > existing.timestamp) {
                        existing.source = row.source;
                        existing.recipeUrl = row.recipeUrl;
                        existing.notes = row.notes;
                        existing.name = row.name; // preserve original casing
                        existing.timestamp = row.timestamp;
                    }
                } else {
                    map.set(key, {
                        name: row.name,
                        source: row.source,
                        recipeUrl: row.recipeUrl,
                        notes: row.notes,
                        count: 1,
                        timestamp: row.timestamp,
                    });
                }
            }

            // Sort by count descending
            return Array.from(map.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
        });
    }

    return { open, add, remove, getAll, getSuggestions };
})();
