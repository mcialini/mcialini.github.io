// ============================================================
// db.js — Food Tracker Firestore Layer
//
// Backs the same public API the app previously got from IndexedDB
// (open, add, remove, getAll, getSuggestions) with Firestore, so
// entries survive independent of this device/browser storage.
//
// Access is locked down two ways:
//   1. Firestore security rules only allow the signed-in Google
//      account matching ALLOWED_EMAIL to read/write anything.
//   2. This client also checks isAllowed() before calling out, so
//      the UI can fail fast/politely instead of relying on the
//      server rejection alone.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    orderBy,
    enableIndexedDbPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
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

const ALLOWED_EMAIL = "matt.cialini@gmail.com";
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
let _lastAuthError = null;

onAuthStateChanged(auth, user => {
    _currentUser = user;
});

// Surface whether a pending redirect sign-in actually completed, and
// capture any error instead of failing silently. This is especially
// useful for diagnosing iOS-standalone-PWA storage/redirect quirks.
// Exposed as a promise (redirectSettled) since callers need to wait
// for this to finish before lastAuthError() is meaningful.
const redirectSettled = getRedirectResult(auth)
    .then(result => {
        console.log("[Auth] getRedirectResult:", result ? result.user.email : "no pending redirect");
    })
    .catch(err => {
        _lastAuthError = err;
        console.error("[Auth] Redirect sign-in failed:", err.code, err.message);
    });

const FoodDB = (() => {
    function isAllowed() {
        return !!_currentUser && _currentUser.email === ALLOWED_EMAIL;
    }

    function currentUser() {
        return _currentUser;
    }

    function lastAuthError() {
        return _lastAuthError;
    }

    /** Resolves once any pending redirect sign-in has been checked
     *  (whether it succeeded, failed, or there was none to check). */
    function whenRedirectSettled() {
        return redirectSettled;
    }

    /** Subscribe to sign-in state changes. Returns an unsubscribe function. */
    function onAuthChange(callback) {
        return onAuthStateChanged(auth, callback);
    }

    /** Kick off Google sign-in. Uses redirect (not popup) since popups
     *  are unreliable inside an installed iOS PWA's standalone window. */
    function signIn() {
        const provider = new GoogleAuthProvider();
        return signInWithRedirect(auth, provider);
    }

    function signOutUser() {
        return signOut(auth);
    }

    /** Resolves once Firebase has reported the initial auth state
     *  (signed in, signed out, or redirect-in-progress resolved). */
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
        if (!isAllowed()) return Promise.reject(new Error("Not signed in as an allowed user"));

        const record = {
            timestamp: Date.now(),
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
        if (!isAllowed()) return Promise.reject(new Error("Not signed in as an allowed user"));
        return deleteDoc(doc(firestore, ENTRIES_COLLECTION, id));
    }

    /** Get all entries, sorted newest-timestamp-first. */
    function getAll() {
        if (!isAllowed()) return Promise.resolve([]);

        const q = query(collection(firestore, ENTRIES_COLLECTION), orderBy("timestamp", "desc"));
        return getDocs(q).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }

    /**
     * Get autocomplete suggestions for a prefix.
     * Returns an array of { name, source, recipeUrl, notes, count }
     * sorted by frequency (most frequent first).
     */
    function getSuggestions(prefix) {
        if (!prefix) return Promise.resolve([]);
        if (!isAllowed()) return Promise.resolve([]);

        const lower = prefix.toLowerCase();

        return getDocs(collection(firestore, ENTRIES_COLLECTION)).then(snap => {
            const rows = snap.docs.map(d => d.data());

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

    return {
        open,
        add,
        remove,
        getAll,
        getSuggestions,
        signIn,
        signOut: signOutUser,
        currentUser,
        lastAuthError,
        whenRedirectSettled,
        isAllowed,
        onAuthChange,
    };
})();

export { FoodDB };
