// ============================================================
// TESTIMONI STORE
// Menyimpan & mengambil data testimoni dari penyimpanan bersama
// (jsonbin.io) jika sudah dikonfigurasi di testimoni-config.js.
// Jika belum dikonfigurasi, atau jika koneksi gagal, otomatis
// menggunakan localStorage (mode lokal) sebagai cadangan supaya
// website tetap berjalan normal.
// ============================================================

const TestimoniStore = (function () {
    const LOCAL_KEY = 'testimoni';
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

    // Ambil seluruh data testimoni.
    // Mengembalikan { data, online, error } — online=true jika berhasil ambil dari server bersama;
    // error berisi alasan kegagalan (jika ada) agar UI dapat menampilkan pesan yang jelas.
    async function load() {
        if (!isConfigured()) {
            return { data: getLocal(), online: false };
        }

        try {
            const res = await fetch(`${API_ROOT}/${TESTIMONI_BIN_ID}/latest`, {
                headers: { 'X-Master-Key': TESTIMONI_MASTER_KEY },
                cache: 'no-store'
            });
            if (!res.ok) throw new Error('Respons server tidak OK: ' + res.status);
            const json = await res.json();
            const serverList = unwrap(json.record);

            // Jangan menghapus testimoni yang baru tersimpan secara lokal
            // ketika sinkronisasi server belum sempat berhasil. Gabungkan
            // data server + data lokal dan hilangkan duplikat.
            const localList = getLocal();
            const merged = serverList.slice();
            const seen = new Set(merged.map(keyOf));
            localList.forEach(function (item) {
                const key = keyOf(item);
                if (!seen.has(key)) {
                    merged.push(item);
                    seen.add(key);
                }
            });
            setLocal(merged); // simpan hasil gabungan sebagai cadangan lokal
            return { data: merged, online: true };
        } catch (e) {
            console.warn('Gagal mengambil data dari server bersama, memakai data lokal:', e);
            return { data: getLocal(), online: false, error: e && e.message ? e.message : String(e) };
        }
    }

    // Tambahkan satu entri testimoni baru.
    // Mengembalikan { success, online }.
    async function add(entry) {
        // Selalu simpan ke lokal dulu sebagai cadangan, supaya data tidak hilang
        // walau koneksi ke server bersama gagal.
        const localList = getLocal();
        localList.push(entry);
        setLocal(localList);

        if (!isConfigured()) {
            return { success: true, online: false };
        }

        try {
            // Ambil data terbaru dulu, supaya tidak menimpa testimoni orang lain
            // yang mungkin baru saja dikirim dari perangkat lain.
            const getRes = await fetch(`${API_ROOT}/${TESTIMONI_BIN_ID}/latest`, {
                headers: { 'X-Master-Key': TESTIMONI_MASTER_KEY },
                cache: 'no-store'
            });
            let currentList = [];
            if (getRes.ok) {
                const json = await getRes.json();
                currentList = unwrap(json.record);
            }
            currentList.push(entry);

            const putRes = await fetch(`${API_ROOT}/${TESTIMONI_BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': TESTIMONI_MASTER_KEY
                },
                body: JSON.stringify(wrap(currentList))
            });

            if (!putRes.ok) throw new Error('Gagal menyimpan ke server bersama: ' + putRes.status);
            setLocal(currentList);
            return { success: true, online: true };
        } catch (e) {
            console.warn('Gagal menyimpan ke server bersama, tersimpan di perangkat ini saja:', e);
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
            return { success: true, removed: json.removed || 0, error: null };
        } catch (e) {
            return { success: false, removed: 0, error: e && e.message ? e.message : String(e) };
        }
    }

    return { load, add, isConfigured, keyOf, isAdmin, removeMany };
})();
