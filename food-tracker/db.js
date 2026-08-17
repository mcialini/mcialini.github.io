// ============================================================
// db.js — Food Tracker Firestore Layer
//
// Backs the same public API the app previously got from IndexedDB
// (open, add, remove, getAll, getSuggestions) with Firestore, so
// entries survive independent of this device/browser storage.
//
// Access is locked via Firestore security rules (UID-based) and
// Firebase Auth with email/password (sign-up disabled in console).
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    orderBy,
    enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCM3QQ25DT1RG5sPKuOFWStsyksXckeeWE",
    authDomain: "food-tracker-a266c.firebaseapp.com",
    projectId: "food-tracker-a266c",
    storageBucket: "food-tracker-a266c.firebasestorage.app",
    messagingSenderId: "594747422251",
    appId: "1:594747422251:web:b4a9adc3acb47f47d0dc6e",
};

const ENTRIES_COLLECTION = "entries";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

// Offline cache so the app still works without a connection and
// syncs once back online. Fails silently in contexts that don't
// support it (e.g. multiple tabs open) — not fatal for this app.
enableIndexedDbPersistence(firestore).catch(err => {
    console.warn("[Firestore] Offline persistence unavailable:", err.code);
});

let _currentUser = null;

onAuthStateChanged(auth, user => {
    _currentUser = user;
});

const FoodDB = (() => {
    function isSignedIn() {
        return !!_currentUser;
    }

    function currentUser() {
        return _currentUser;
    }

    /** Subscribe to sign-in state changes. Returns an unsubscribe function. */
    function onAuthChange(callback) {
        return onAuthStateChanged(auth, callback);
    }

    /** Sign in with email and password. Returns a promise. */
    function signIn(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function signOutUser() {
        return signOut(auth);
    }

    /** Resolves once Firebase has reported the initial auth state. */
    function open() {
        return new Promise(resolve => {
            const unsub = onAuthStateChanged(auth, user => {
                unsub();
                resolve(user);
            });
        });
    }

    /** Add a new entry. Returns the entry (with generated id + timestamp). */
    function add(entry) {
        if (!isSignedIn()) return Promise.reject(new Error("Not signed in"));

        const record = {
            timestamp: entry.timestamp || Date.now(),
            name: entry.name.trim(),
            source: entry.source, // "cooked" | "premade" | "takeout"
            recipeUrl: entry.recipeUrl ? entry.recipeUrl.trim() : "",
            notes: entry.notes ? entry.notes.trim() : "",
        };

        return addDoc(collection(firestore, ENTRIES_COLLECTION), record)
            .then(ref => ({ id: ref.id, ...record }));
    }

    /** Delete an entry by id. */
    function remove(id) {
        if (!isSignedIn()) return Promise.reject(new Error("Not signed in"));
        return deleteDoc(doc(firestore, ENTRIES_COLLECTION, id));
    }

    /** Update an existing entry by id. */
    function update(id, fields) {
        if (!isSignedIn()) return Promise.reject(new Error("Not signed in"));
        const data = {
            timestamp: fields.timestamp || Date.now(),
            name: fields.name.trim(),
            source: fields.source,
            recipeUrl: fields.recipeUrl ? fields.recipeUrl.trim() : "",
            notes: fields.notes ? fields.notes.trim() : "",
        };
        return updateDoc(doc(firestore, ENTRIES_COLLECTION, id), data);
    }

    /** Get all entries, sorted newest-timestamp-first. */
    function getAll() {
        if (!isSignedIn()) return Promise.resolve([]);

        const q = query(collection(firestore, ENTRIES_COLLECTION), orderBy("timestamp", "desc"));
        return getDocs(q).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }

    /**
     * Get autocomplete suggestions for a prefix, matching against
     * individual comma-separated tokens from past entries.
     * Returns an array of { name, source, recipeUrl, notes, count }
     * sorted by frequency (most frequent first).
     */
    function getSuggestions(prefix) {
        if (!prefix) return Promise.resolve([]);
        if (!isSignedIn()) return Promise.resolve([]);

        const lower = prefix.toLowerCase();

        return getDocs(collection(firestore, ENTRIES_COLLECTION)).then(snap => {
            const rows = snap.docs.map(d => d.data());

            // Build a frequency map of individual semicolon-separated tokens
            const tokenMap = new Map();
            for (const row of rows) {
                const tokens = row.name.split(';').map(t => t.trim()).filter(Boolean);
                for (const token of tokens) {
                    const key = token.toLowerCase();
                    if (!key.startsWith(lower)) continue;

                    if (tokenMap.has(key)) {
                        const existing = tokenMap.get(key);
                        existing.count++;
                        if (row.timestamp > existing.timestamp) {
                            existing.name = token;
                            existing.timestamp = row.timestamp;
                        }
                    } else {
                        tokenMap.set(key, {
                            name: token,
                            count: 1,
                            timestamp: row.timestamp,
                        });
                    }
                }
            }

            // Also match full entry names (for single-item or first-token use)
            const fullMap = new Map();
            for (const row of rows) {
                const key = row.name.toLowerCase();
                if (!key.startsWith(lower)) continue;

                if (fullMap.has(key)) {
                    const existing = fullMap.get(key);
                    existing.count++;
                    if (row.timestamp > existing.timestamp) {
                        existing.source = row.source;
                        existing.recipeUrl = row.recipeUrl;
                        existing.notes = row.notes;
                        existing.name = row.name;
                        existing.timestamp = row.timestamp;
                    }
                } else {
                    fullMap.set(key, {
                        name: row.name,
                        source: row.source,
                        recipeUrl: row.recipeUrl,
                        notes: row.notes,
                        count: 1,
                        timestamp: row.timestamp,
                    });
                }
            }

            // Merge: full entries first, then individual tokens (deduped)
            const results = Array.from(fullMap.values())
                .sort((a, b) => b.count - a.count);

            const usedKeys = new Set(results.map(r => r.name.toLowerCase()));
            const tokenResults = Array.from(tokenMap.values())
                .filter(t => !usedKeys.has(t.name.toLowerCase()))
                .sort((a, b) => b.count - a.count);

            return results.concat(tokenResults).slice(0, 10);
        });
    }

    return {
        open,
        add,
        update,
        remove,
        getAll,
        getSuggestions,
        signIn,
        signOut: signOutUser,
        currentUser,
        isSignedIn,
        onAuthChange,
    };
})();

export { FoodDB };
