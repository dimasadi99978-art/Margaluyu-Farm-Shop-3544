// ============================================================
// TESTIMONI STORE
// Semua baca/tulis testimoni lewat /api/testimoni (server Vercel).
// Master Key JSONBin hanya ada di Environment Variables Vercel, TIDAK di browser.
// Jika server gagal dihubungi saat mengirim, testimoni disimpan sementara di perangkat
// (ditandai _pending) dan dikirim ulang otomatis saat halaman dibuka lagi.
// ============================================================

const TestimoniStore = (function () {
    const LOCAL_KEY = 'testimoni';        // testimoni yang BELUM terkirim (_pending)
    const CACHE_KEY = 'testimoniCache';   // salinan terakhir dari server untuk tampilan offline
    const API_URL = '/api/testimoni';
    const TOKEN_KEY = 'mfAdminToken';

    function isConfigured() { return true; } // konfigurasi ada di server

    function getLocal() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch (e) { return []; } }
    function setLocal(list) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch (e) { /* abaikan */ } }
    function getCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch (e) { return []; } }
    function setCache(list) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (e) { /* abaikan */ } }

    function keyOf(t) {
        if (t && t.id != null) return 'id:' + t.id; // testimoni dari server dikenali lewat ID
        const clean = v => String(v == null ? '' : v).trim();
        return [clean(t && t.nama), clean(t && t.tanggal), clean(t && t.komentar)].join('|');
    }

    function honeypotValue() {
        try { const el = document.querySelector('input[name="website"]'); return el ? String(el.value || '') : ''; } catch (e) { return ''; }
    }

    function adminToken() {
        try {
            const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
            return t && t.token && t.expiresAt > Date.now() ? t.token : '';
        } catch (e) { return ''; }
    }

    function adminHeaders(extra) {
        const h = Object.assign({ 'Accept': 'application/json' }, extra || {});
        const t = adminToken();
        if (t) h['Authorization'] = 'Bearer ' + t;
        return h;
    }

    async function remoteGet() {
        const res = await fetch(API_URL, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || ('Gagal membaca testimoni (HTTP ' + res.status + ')'));
        return Array.isArray(json.data) ? json.data : [];
    }

    async function remotePost(entry) {
        const clean = Object.assign({}, entry); delete clean._pending;
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ testimoni: clean, website: honeypotValue() })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(json.error || ('Gagal mengirim testimoni (HTTP ' + res.status + ')'));
            err.status = res.status; // 4xx = ditolak server, jangan dikirim ulang terus-menerus
            throw err;
        }
        return json;
    }

    function pendingList() { return getLocal().filter(x => x && x._pending); }

    async function syncPending() {
        const pending = pendingList();
        if (!pending.length) return { synced: 0, remaining: 0 };
        let synced = 0;
        const still = [];
        for (const p of pending) {
            try { await remotePost(p); synced++; }
            catch (e) { if (!(e && e.status >= 400 && e.status < 500 && e.status !== 429)) still.push(p); }
        }
        setLocal(still);
        return { synced, remaining: still.length };
    }

    async function load() {
        try {
            if (pendingList().length) await syncPending();
            const serverList = await remoteGet();
            const have = new Set(serverList.map(keyOf));
            const stillPending = pendingList().filter(p => !have.has(keyOf(p)));
            setLocal(stillPending);
            setCache(serverList);
            return { data: serverList.concat(stillPending), online: true, pending: stillPending.length };
        } catch (e) {
            console.warn('Gagal mengambil testimoni dari server:', e);
            return { data: getCache().concat(pendingList()), online: false, error: e && e.message ? e.message : String(e) };
        }
    }

    async function add(entry) {
        try {
            const r = await remotePost(entry);
            return { success: true, online: true, moderasi: r.moderasi === true, fotoDibuang: false };
        } catch (e) {
            console.warn('Gagal mengirim testimoni ke server:', e);
            // Ditolak server (data tidak valid / spam): jangan disimpan ulang.
            if (e && e.status >= 400 && e.status < 500 && e.status !== 429) throw e;
            const list = getLocal();
            list.push(Object.assign({}, entry, { _pending: true }));
            setLocal(list);
            return { success: true, online: false, error: e && e.message ? e.message : String(e) };
        }
    }

    // ---------- Khusus admin ----------
    async function isAdmin() {
        if (!adminToken()) return false;
        try {
            const res = await fetch(API_URL + '?check=1', { headers: adminHeaders(), cache: 'no-store' });
            return res.ok;
        } catch (e) { return false; }
    }

    async function removeMany(keys) {
        const list = (Array.isArray(keys) ? keys : []).filter(Boolean);
        if (!list.length) return { success: false, removed: 0, error: 'Pilih minimal satu testimoni.' };
        try {
            const res = await fetch(API_URL, {
                method: 'DELETE',
                headers: adminHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ keys: list })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || `Server mengembalikan ${res.status}`);
            const gone = new Set(list);
            setLocal(getLocal().filter(t => !gone.has(keyOf(t))));
            setCache(getCache().filter(t => !gone.has(keyOf(t))));
            return { success: true, removed: json.removed || 0, error: null };
        } catch (e) {
            return { success: false, removed: 0, error: e && e.message ? e.message : String(e) };
        }
    }

    return { load, add, syncPending, isConfigured, keyOf, isAdmin, removeMany };
})();
