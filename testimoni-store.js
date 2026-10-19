// ============================================================
// TESTIMONI STORE
// Menyimpan & mengambil data testimoni dari penyimpanan bersama
// (jsonbin.io) jika sudah dikonfigurasi di testimoni-config.js.
// Jika belum dikonfigurasi, atau jika koneksi gagal, otomatis
// menggunakan localStorage (mode lokal) sebagai cadangan supaya
// website tetap berjalan normal.
//
// Aturan keselamatan data (penting):
//  - Menyimpan = baca data terbaru -> tambahkan -> tulis -> BACA ULANG untuk memastikan masuk.
//  - Jika pembacaan gagal, penulisan TIDAK dilakukan (dulu bisa menimpa seluruh testimoni).
//  - Testimoni yang gagal terkirim ditandai _pending dan dikirim ulang otomatis saat halaman dibuka.
// ============================================================

const TestimoniStore = (function () {
    const LOCAL_KEY = 'testimoni';          // testimoni yang BELUM terkirim ke server (ditandai _pending)
    const CACHE_KEY = 'testimoniCache';     // salinan terakhir dari server, untuk tampilan saat offline
    const MAX_BIN_CHARS = 90000;            // JSONBin gratis membatasi satu bin sekitar 100KB
    const API_ROOT = 'https://api.jsonbin.io/v3/b';

    function isConfigured() {
        return typeof TESTIMONI_MASTER_KEY === 'string' && TESTIMONI_MASTER_KEY.trim() !== '' &&
            typeof TESTIMONI_BIN_ID === 'string' && TESTIMONI_BIN_ID.trim() !== '';
    }

    function getLocal() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function setLocal(list) {
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
        } catch (e) {
            console.warn('Tidak bisa menyimpan cadangan lokal:', e);
        }
    }

    // jsonbin menolak data yang akar datanya berupa array, sehingga data selalu
    // dibungkus menjadi { items: [...] }. Fungsi ini membaca kedua format
    // (format lama berupa array, maupun format baru yang dibungkus objek).
    function unwrap(record) {
        if (Array.isArray(record)) return record;
        if (record && Array.isArray(record.items)) return record.items;
        return [];
    }

    function wrap(list) {
        return { items: list };
    }

    function getCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || []; } catch (e) { return []; }
    }
    function setCache(list) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch (e) { /* abaikan */ }
    }

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function stripFlags(entry) {
        const copy = Object.assign({}, entry);
        delete copy._pending;
        return copy;
    }

    async function remoteGet() {
        const res = await fetch(`${API_ROOT}/${TESTIMONI_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': TESTIMONI_MASTER_KEY },
            cache: 'no-store'
        });
        if (!res.ok) throw new Error('Gagal membaca server testimoni (HTTP ' + res.status + ')');
        const json = await res.json();
        return unwrap(json.record);
    }

    async function remotePut(list) {
        const res = await fetch(`${API_ROOT}/${TESTIMONI_BIN_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': TESTIMONI_MASTER_KEY },
            body: JSON.stringify(wrap(list))
        });
        if (!res.ok) {
            let detail = '';
            try { detail = (await res.json()).message || ''; } catch (_) {}
            const err = new Error('Gagal menyimpan ke server testimoni (HTTP ' + res.status + (detail ? ': ' + detail : '') + ')');
            if (res.status === 413 || /size/i.test(detail)) err.code = 'SIZE';
            throw err;
        }
    }

    // Tambahkan entri ke server dengan aman: selalu mulai dari data terbaru, dan verifikasi hasilnya.
    async function appendRemote(entries) {
        const wanted = entries.map(stripFlags);
        let lastErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const current = await remoteGet();            // gagal baca -> lompat ke catch, TIDAK menulis
                const have = new Set(current.map(keyOf));
                const toAdd = wanted.filter(e => !have.has(keyOf(e)));
                if (!toAdd.length) return current;            // sudah ada di server
                const next = current.concat(toAdd);
                if (JSON.stringify(wrap(next)).length > MAX_BIN_CHARS) {
                    const err = new Error('Penyimpanan testimoni di server penuh. Hapus testimoni lama lewat admin, atau gunakan Cloudinary untuk foto.');
                    err.code = 'SIZE';
                    throw err;
                }
                await remotePut(next);
                const after = await remoteGet();              // verifikasi: pastikan benar-benar tersimpan
                const seen = new Set(after.map(keyOf));
                if (wanted.every(e => seen.has(keyOf(e)))) return after;
                lastErr = new Error('Data belum terverifikasi di server (kemungkinan tertimpa pengiriman lain).');
            } catch (e) {
                lastErr = e;
                if (e && e.code === 'SIZE') throw e;
            }
            await sleep(600 * (attempt + 1) + Math.random() * 400);
        }
        throw lastErr || new Error('Gagal menyimpan ke server testimoni.');
    }

    function pendingList() {
        return getLocal().filter(function (x) { return x && x._pending; });
    }

    // Kirim ulang testimoni yang sebelumnya gagal terkirim. Aman dipanggil berkali-kali.
    async function syncPending() {
        if (!isConfigured()) return { synced: 0, remaining: 0 };
        const pending = pendingList();
        if (!pending.length) return { synced: 0, remaining: 0 };
        try {
            const after = await appendRemote(pending);
            const have = new Set(after.map(keyOf));
            const still = pending.filter(p => !have.has(keyOf(p)));
            setLocal(still);
            setCache(after);
            return { synced: pending.length - still.length, remaining: still.length };
        } catch (e) {
            console.warn('Kirim ulang testimoni tertunda belum berhasil:', e);
            return { synced: 0, remaining: pending.length, error: e && e.message ? e.message : String(e) };
        }
    }

    // Ambil seluruh data testimoni.
    // Mengembalikan { data, online, error } — online=true jika berhasil ambil dari server bersama.
    async function load() {
        if (!isConfigured()) {
            return { data: getLocal(), online: false };
        }

        try {
            let serverList = await remoteGet();

            // Kirim ulang testimoni yang tertunda (jika ada), lalu muat ulang daftar dari server.
            if (pendingList().length) {
                await syncPending();
                try { serverList = await remoteGet(); } catch (_) { /* pakai daftar sebelumnya */ }
            }

            // Tampilkan data server + testimoni tertunda milik perangkat ini yang belum ada di server.
            // Testimoni lain yang sudah dihapus admin TIDAK dimunculkan kembali dari cadangan lokal.
            const have = new Set(serverList.map(keyOf));
            const stillPending = pendingList().filter(p => !have.has(keyOf(p)));
            setLocal(stillPending);
            setCache(serverList);
            return { data: serverList.concat(stillPending), online: true, pending: stillPending.length };
        } catch (e) {
            console.warn('Gagal mengambil data dari server bersama, memakai salinan terakhir:', e);
            return {
                data: getCache().concat(pendingList()),
                online: false,
                error: e && e.message ? e.message : String(e)
            };
        }
    }

    // Tambahkan satu entri testimoni baru.
    // Mengembalikan { success, online, error }. online=false berarti BELUM terlihat oleh pengunjung lain.
    async function add(entry) {
        if (!isConfigured()) {
            const list = getLocal();
            list.push(entry);
            setLocal(list);
            return { success: true, online: false };
        }

        try {
            let after;
            let fotoDibuang = false;
            try {
                after = await appendRemote([entry]);
            } catch (e) {
                // Penyimpanan gratis penuh karena foto: simpan teks ulasannya saja, jangan gagal total.
                if (e && e.code === 'SIZE' && typeof entry.foto === 'string' && entry.foto.indexOf('data:image/') === 0) {
                    after = await appendRemote([Object.assign({}, entry, { foto: '' })]);
                    fotoDibuang = true;
                } else {
                    throw e;
                }
            }
            setCache(after);
            return { success: true, online: true, fotoDibuang: fotoDibuang };
        } catch (e) {
            console.warn('Gagal menyimpan ke server bersama, disimpan sementara di perangkat ini:', e);
            // Simpan sementara dan tandai agar dikirim ulang otomatis.
            const list = getLocal();
            list.push(Object.assign({}, entry, { _pending: true }));
            setLocal(list);
            return { success: true, online: false, error: e && e.message ? e.message : String(e) };
        }
    }

    // ---------- Khusus admin ----------
    // Kunci unik testimoni (harus sama dengan api/testimoni.js).
    function keyOf(t) {
        const clean = v => String(v == null ? '' : v).trim();
        return [clean(t && t.nama), clean(t && t.tanggal), clean(t && t.komentar)].join('|');
    }

    function adminHeaders(extra) {
        const headers = Object.assign({ 'Accept': 'application/json' }, extra || {});
        try {
            const k = sessionStorage.getItem('mfAdminKey');
            if (k) headers['X-Admin-Key'] = k;
        } catch (e) { /* sessionStorage tidak tersedia */ }
        return headers;
    }

    // true hanya bila server menerima kata sandi admin yang tersimpan di sesi ini.
    async function isAdmin() {
        try {
            const k = sessionStorage.getItem('mfAdminKey');
            if (!k) return false;
            const res = await fetch('/api/testimoni?check=1', { headers: adminHeaders(), cache: 'no-store' });
            return res.ok;
        } catch (e) { return false; }
    }

    async function removeMany(keys) {
        const list = (Array.isArray(keys) ? keys : []).filter(Boolean);
        if (!list.length) return { success: false, removed: 0, error: 'Pilih minimal satu testimoni.' };
        try {
            const res = await fetch('/api/testimoni', {
                method: 'DELETE',
                headers: adminHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ keys: list })
            });
            const text = await res.text();
            let json = {};
            try { json = text ? JSON.parse(text) : {}; } catch (_) {}
            if (!res.ok) throw new Error(json.error || json.message || `Server mengembalikan ${res.status}`);
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
