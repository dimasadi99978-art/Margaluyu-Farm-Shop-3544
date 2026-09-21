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
    // Mengembalikan { data, online } — online=true jika berhasil ambil dari server bersama.
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
            const list = unwrap(json.record);
            setLocal(list); // sinkronkan cadangan lokal
            return { data: list, online: true };
        } catch (e) {
            console.warn('Gagal mengambil data dari server bersama, memakai data lokal:', e);
            return { data: getLocal(), online: false };
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
            return { success: true, online: false };
        }
    }

    return { load, add, isConfigured };
})();
