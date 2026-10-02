// ============================================================
// ORDERS STORE
// Penyimpanan pesanan bersama melalui /api/orders.
// Master Key JSONBin hanya berada di server/Vercel.
// ============================================================

const OrdersStore = (function () {
    const LOCAL_KEY = 'pesananMargaluyu';
    const API_URL = (typeof ORDERS_API_URL === 'string' && ORDERS_API_URL.trim())
        ? ORDERS_API_URL
        : '/api/orders';
    const IS_LOCAL_FILE = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
    const STATUS_STEPS = ['Dikonfirmasi', 'Dikemas', 'Dikirim', 'Selesai'];
    const ADMIN_KEY_STORAGE = 'mfAdminKey';

    // Kata sandi admin (hanya dipakai halaman admin) disimpan di sessionStorage dan dikirim
    // sebagai header X-Admin-Key. Server hanya memeriksanya jika ORDERS_ADMIN_KEY diaktifkan.
    function getAdminKey() {
        try { return sessionStorage.getItem(ADMIN_KEY_STORAGE) || ''; } catch (e) { return ''; }
    }

    function setAdminKey(key) {
        try {
            if (key) sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
            else sessionStorage.removeItem(ADMIN_KEY_STORAGE);
        } catch (e) { /* sessionStorage tidak tersedia */ }
    }

    function adminHeaders(extra) {
        const headers = Object.assign({ 'Accept': 'application/json' }, extra || {});
        const key = getAdminKey();
        if (key) headers['X-Admin-Key'] = key;
        return headers;
    }

    function isConfigured() {
        return true; // Konfigurasi sekarang dilakukan di Environment Variables Vercel.
    }

    function getLocal() {
        try {
            const raw = localStorage.getItem(LOCAL_KEY);
            const data = raw ? JSON.parse(raw) : [];
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.warn('Data lokal pesanan tidak dapat dibaca:', e);
            return [];
        }
    }

    function setLocal(list) {
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.isArray(list) ? list : []));
        } catch (e) {
            console.warn('Tidak bisa menyimpan cadangan lokal:', e);
        }
    }

    function normalizeOrderId(value) {
        return String(value || '').trim().toLowerCase();
    }

    function normalizePhone(value) {
        let s = String(value || '').replace(/[\s\-().]/g, '');
        if (s.startsWith('+')) s = s.slice(1);
        if (s.startsWith('0')) s = '62' + s.slice(1);
        return s;
    }

    function mergeOrders(...lists) {
        const map = new Map();
        for (const list of lists) {
            if (!Array.isArray(list)) continue;
            for (const order of list) {
                if (!order || !order.orderId) continue;
                map.set(normalizeOrderId(order.orderId), order);
            }
        }
        return Array.from(map.values());
    }

    // params: {} = seluruh daftar (admin); {orderId, telepon} = pelacakan publik.
    async function fetchRemote(params) {
        if (IS_LOCAL_FILE) {
            return { data: [], online: false, error: 'Halaman ini dibuka langsung dari file di komputer, sehingga belum bisa terhubung ke server. Setelah situs dipublikasikan (misalnya di Vercel), ini akan berjalan normal' };
        }
        try {
            const qs = params ? Object.keys(params)
                .filter(k => params[k])
                .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
                .join('&') : '';
            const res = await fetch(API_URL + (qs ? '?' + qs : ''), {
                method: 'GET',
                headers: params && (params.orderId || params.telepon) ? { 'Accept': 'application/json' } : adminHeaders(),
                cache: 'no-store'
            });
            const text = await res.text();
            let json = {};
            try { json = text ? JSON.parse(text) : {}; } catch (_) {}
            if (!res.ok) throw new Error(json.error || json.message || `Server mengembalikan ${res.status}`);

            const data = Array.isArray(json.data) ? json.data : [];
            return { data, online: true, error: null, protectedByServer: json.protected === true };
        } catch (e) {
            console.warn('Gagal membaca data pesanan dari server:', e);
            return {
                data: [],
                online: false,
                error: e && e.message ? e.message : String(e)
            };
        }
    }

    async function postRemote(order) {
        if (IS_LOCAL_FILE) {
            return { success: false, order: null, error: 'Halaman ini dibuka langsung dari file di komputer, sehingga data belum bisa dikirim ke server. Setelah situs dipublikasikan (misalnya di Vercel), ini akan berjalan normal' };
        }

        let lastError = 'Gagal menghubungi server.';
        // Coba sampai 3 kali untuk mengatasi kegagalan jaringan sesaat.
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 12000);
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ order }),
                    signal: controller.signal
                });
                clearTimeout(timer);

                const text = await res.text();
                let json = {};
                try { json = text ? JSON.parse(text) : {}; } catch (_) {}
                if (!res.ok) throw new Error(json.error || json.message || `Server mengembalikan HTTP ${res.status}`);
                return { success: true, order: json.order || order, error: null };
            } catch (e) {
                lastError = e && e.name === 'AbortError'
                    ? 'Server terlalu lama merespons (timeout).'
                    : (e && e.message ? e.message : String(e));
                console.warn(`Gagal menyimpan pesanan ke server (percobaan ${attempt}/3):`, lastError);
                if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 700 * attempt));
            }
        }
        return { success: false, order: null, error: lastError };
    }

    async function putRemote(order) {
        if (IS_LOCAL_FILE) {
            return { success: false, order: null, error: 'Halaman ini dibuka langsung dari file di komputer, sehingga data belum bisa dikirim ke server. Setelah situs dipublikasikan (misalnya di Vercel), ini akan berjalan normal' };
        }
        try {
            const res = await fetch(API_URL, {
                method: 'PUT',
                headers: adminHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ order })
            });
            const text = await res.text();
            let json = {};
            try { json = text ? JSON.parse(text) : {}; } catch (_) {}
            if (!res.ok) throw new Error(json.error || json.message || `Server mengembalikan ${res.status}`);
            return { success: true, order: json.order || order, error: null };
        } catch (e) {
            console.warn('Gagal memperbarui pesanan di server:', e);
            return { success: false, order: null, error: e && e.message ? e.message : String(e) };
        }
    }

    function generateOrderId() {
        const now = new Date();
        const y = String(now.getFullYear()).slice(2);
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const rand = Math.floor(1000 + Math.random() * 9000);
        return `MF-${y}${m}${d}-${rand}`;
    }

    async function load() {
        const remote = await fetchRemote();

        if (remote.online) {
            setLocal(remote.data);
            return { data: remote.data, online: true, error: null };
        }

        // Saat server sedang gagal, tampilkan cache lokal sebagai cadangan.
        return { data: getLocal(), online: false, error: remote.error };
    }

    async function add(orderData) {
        const orderId = generateOrderId();
        const entry = Object.assign({
            orderId,
            status: 'Dikonfirmasi',
            tanggal: new Date().toLocaleDateString('id-ID', {
                year: 'numeric', month: 'long', day: 'numeric'
            }),
            updatedAt: new Date().toISOString()
        }, orderData);

        // Saat file dibuka langsung di komputer, pertahankan perilaku lokal untuk pengujian.
        if (IS_LOCAL_FILE) {
            setLocal(mergeOrders(getLocal(), [entry]));
            return { success: true, online: false, local: true, orderId, error: null };
        }

        // Saat website online, pesanan HARUS berhasil masuk penyimpanan bersama.
        // Jangan membuat pelanggan menerima nomor pesanan seolah-olah sudah tersimpan
        // jika server gagal. postRemote sudah mencoba sampai 3 kali.
        const saved = await postRemote(entry);
        if (!saved.success) {
            return {
                success: false,
                online: false,
                orderId: null,
                error: saved.error
            };
        }

        const synced = Object.assign({}, saved.order);
        delete synced.syncStatus;
        setLocal(mergeOrders(getLocal(), [synced]));
        return { success: true, online: true, orderId, error: null };
    }

    async function findById(orderId, phone) {
        const cleanId = normalizeOrderId(orderId);
        const cleanPhone = normalizePhone(phone);
        if (!cleanId || !cleanPhone) return { order: null, online: false, error: null };

        // Saat file HTML dibuka langsung di komputer, server memang tidak dapat
        // diakses. Tetap izinkan pelacakan dengan cache lokal, tetapi WAJIB cocok
        // nomor pesanan + nomor HP agar tidak membuka pesanan milik orang lain.
        if (IS_LOCAL_FILE) {
            const foundLocal = getLocal().find(o =>
                o && normalizeOrderId(o.orderId) === cleanId
                && normalizePhone(o.telepon) === cleanPhone
            ) || null;
            return {
                order: foundLocal,
                online: false,
                local: Boolean(foundLocal),
                error: foundLocal ? null : 'Pesanan tidak ditemukan di data lokal.'
            };
        }

        const remote = await fetchRemote({ orderId: cleanId, telepon: cleanPhone });
        if (remote.online) {
            // Server sudah mencocokkan nomor pesanan DAN nomor HP.
            const found = remote.data.find(o =>
                o && normalizeOrderId(o.orderId) === cleanId
                && normalizePhone(o.telepon) === cleanPhone
            ) || null;
            if (found) setLocal(mergeOrders(getLocal(), [found]));
            return { order: found, online: true, error: null };
        }

        // Jangan gunakan cache lokal untuk pelacakan publik berdasarkan ID saja.
        // Ini mencegah data pesanan teman yang tersimpan di perangkat ikut tampil.
        return { order: null, online: false, error: remote.error };
    }

    async function findByIdAndName(orderId, phone, name) {
        const cleanId = normalizeOrderId(orderId);
        const cleanPhone = normalizePhone(phone);
        const cleanName = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (!cleanId || !cleanPhone || !cleanName) return { order: null, online: false, error: null };

        if (IS_LOCAL_FILE) {
            const foundLocal = getLocal().find(o =>
                o && normalizeOrderId(o.orderId) === cleanId
                && normalizePhone(o.telepon) === cleanPhone
                && String(o.nama || '').trim().toLowerCase().replace(/\s+/g, ' ') === cleanName
            ) || null;
            return {
                order: foundLocal,
                online: false,
                local: Boolean(foundLocal),
                error: foundLocal ? null : 'Pesanan tidak ditemukan di data lokal.'
            };
        }

        const remote = await fetchRemote({ orderId: cleanId, telepon: cleanPhone, nama: cleanName });
        if (remote.online) {
            const found = remote.data.find(o =>
                o && normalizeOrderId(o.orderId) === cleanId
                && normalizePhone(o.telepon) === cleanPhone
                && String(o.nama || '').trim().toLowerCase().replace(/\s+/g, ' ') === cleanName
            ) || null;
            if (found) setLocal(mergeOrders(getLocal(), [found]));
            return { order: found, online: true, error: null };
        }

        // Jangan gunakan cache lokal untuk verifikasi publik.
        return { order: null, online: false, error: remote.error };
    }

    async function findByPhone(phone) {
        const target = normalizePhone(phone);
        if (!target) return { orders: [], online: false, error: null };

        // Saat file HTML dibuka langsung di komputer, gunakan cache lokal.
        // Hanya data dengan nomor HP yang sama yang ditampilkan dan tetap dibatasi
        // ke informasi minimum, sama seperti aturan pelacakan online.
        if (IS_LOCAL_FILE) {
            const orders = getLocal()
                .filter(o => o && normalizePhone(o.telepon) === target)
                .map(o => ({
                    orderId: o.orderId || '',
                    tanggal: o.tanggal || '',
                    status: o.status || 'Dikonfirmasi',
                    produk: o.produk || 'Pesanan',
                    jumlah: o.jumlah || ''
                }))
                .reverse();
            return { orders, online: false, local: true, error: null };
        }

        // Pencarian publik berdasarkan nomor HP hanya boleh mengembalikan
        // data terbatas dari server. Jangan memakai cache lokal bila server online.
        const remote = await fetchRemote({ telepon: target });
        if (!remote.online) {
            return { orders: [], online: false, error: remote.error };
        }

        return {
            orders: remote.data.slice().reverse(),
            online: true,
            error: null
        };
    }

    // Dipakai halaman admin: memastikan kata sandi diterima server.
    // Hasil: { ok, protectedByServer, error }
    async function verifyAdmin(key) {
        setAdminKey(key);
        const r = await fetchRemote(null);
        if (r.online) return { ok: true, protectedByServer: r.protectedByServer === true, error: null };
        return { ok: false, protectedByServer: false, error: r.error };
    }

    async function updateStatus(orderId, newStatus, orderHint) {
        const cleanId = normalizeOrderId(orderId);
        const validStatus = STATUS_STEPS.includes(newStatus) ? newStatus : null;
        if (!cleanId || !validStatus) {
            return { success: false, online: false, error: 'Nomor pesanan atau status tidak valid.' };
        }

        // KHUSUS ADMIN: jangan memakai findById() karena fungsi tersebut memang
        // mewajibkan nomor HP untuk pelacakan publik. Admin sudah memiliki data
        // pesanan dari load(), jadi ambil pesanan berdasarkan orderId dari cache admin.
        const local = getLocal();
        const current = (orderHint && normalizeOrderId(orderHint.orderId) === cleanId)
            ? orderHint
            : (local.find(o => o && normalizeOrderId(o.orderId) === cleanId) || null);

        if (!current) {
            return { success: false, online: false, error: 'Pesanan tidak ditemukan.' };
        }

        const updated = Object.assign({}, current, {
            status: validStatus,
            updatedAt: new Date().toISOString()
        });

        // Saat masih membuka file HTML secara lokal, status tetap dapat diubah
        // dan disimpan di localStorage seperti perilaku website sebelumnya.
        if (IS_LOCAL_FILE) {
            setLocal(mergeOrders(local, [updated]));
            return { success: true, online: false, local: true, order: updated, error: null };
        }

        // Saat online, perubahan harus disimpan ke server. Header admin dikirim
        // agar endpoint dapat membedakan perubahan admin dari pelacakan publik.
        const result = await putRemote(updated);
        if (result.success) {
            setLocal(mergeOrders(getLocal(), [result.order || updated]));
            return { success: true, online: true, local: false, order: result.order || updated, error: null };
        }

        return { success: false, online: false, local: false, error: result.error };
    }

    // Hapus banyak pesanan sekaligus (hanya yang berstatus Selesai; server yang memastikan).
    async function removeMany(orderIds) {
        const ids = (Array.isArray(orderIds) ? orderIds : []).filter(Boolean);
        if (!ids.length) return { success: false, removed: [], error: 'Pilih minimal satu pesanan.' };
        if (IS_LOCAL_FILE) return { success: false, removed: [], error: 'Halaman dibuka dari file di komputer. Buka lewat alamat online (Vercel).' };
        try {
            const res = await fetch(API_URL, {
                method: 'DELETE',
                headers: adminHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ orderIds: ids })
            });
            const text = await res.text();
            let json = {};
            try { json = text ? JSON.parse(text) : {}; } catch (_) {}
            if (!res.ok) throw new Error(json.error || json.message || `Server mengembalikan ${res.status}`);
            const removed = Array.isArray(json.removed) ? json.removed : [];
            const gone = new Set(removed.map(normalizeOrderId));
            setLocal(getLocal().filter(o => !gone.has(normalizeOrderId(o && o.orderId))));
            return { success: true, removed, skipped: json.skipped || [], error: null };
        } catch (e) {
            return { success: false, removed: [], error: e && e.message ? e.message : String(e) };
        }
    }

    return {
        load,
        add,
        findById,
        findByIdAndName,
        findByPhone,
        updateStatus,
        removeMany,
        isConfigured,
        normalizePhone,
        setAdminKey,
        verifyAdmin,
        STATUS_STEPS
    };
})();
