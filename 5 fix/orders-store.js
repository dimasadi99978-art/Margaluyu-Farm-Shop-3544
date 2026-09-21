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

    async function fetchRemote() {
        if (IS_LOCAL_FILE) {
            return { data: [], online: false, error: 'Website sedang dibuka langsung dari file komputer (file://). Upload ke Vercel untuk mengaktifkan /api/orders.' };
        }
        try {
            const res = await fetch(API_URL, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            });
            const text = await res.text();
            let json = {};
            try { json = text ? JSON.parse(text) : {}; } catch (_) {}
            if (!res.ok) throw new Error(json.error || json.message || `Server mengembalikan ${res.status}`);

            const data = Array.isArray(json.data) ? json.data : [];
            return { data, online: true, error: null };
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
            return { success: false, order: null, error: 'Website dibuka dari file komputer. /api/orders hanya berjalan setelah website dipublish di Vercel.' };
        }
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ order })
            });
            const text = await res.text();
            let json = {};
            try { json = text ? JSON.parse(text) : {}; } catch (_) {}
            if (!res.ok) throw new Error(json.error || json.message || `Server mengembalikan ${res.status}`);
            return { success: true, order: json.order || order, error: null };
        } catch (e) {
            console.warn('Gagal menyimpan pesanan ke server:', e);
            return { success: false, order: null, error: e && e.message ? e.message : String(e) };
        }
    }

    async function putRemote(order) {
        if (IS_LOCAL_FILE) {
            return { success: false, order: null, error: 'Website dibuka dari file komputer. /api/orders hanya berjalan setelah website dipublish di Vercel.' };
        }
        try {
            const res = await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
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

        // Tampilkan/simpan lokal segera agar struk langsung muncul.
        setLocal(mergeOrders(getLocal(), [entry]));

        const saved = await postRemote(entry);
        if (!saved.success) {
            // Tandai pending agar bisa dicoba lagi dari perangkat yang sama.
            const pending = Object.assign({}, entry, { syncStatus: 'pending' });
            setLocal(mergeOrders(getLocal(), [pending]));
            return {
                success: true,
                online: false,
                orderId,
                error: saved.error
            };
        }

        const synced = Object.assign({}, saved.order);
        delete synced.syncStatus;
        setLocal(mergeOrders(getLocal(), [synced]));
        return { success: true, online: true, orderId, error: null };
    }

    async function findById(orderId) {
        const cleanId = normalizeOrderId(orderId);
        if (!cleanId) return { order: null, online: false, error: null };

        const remote = await fetchRemote();
        if (remote.online) {
            const found = remote.data.find(o => normalizeOrderId(o.orderId) === cleanId) || null;
            setLocal(remote.data);
            return { order: found, online: true, error: null };
        }

        const localFound = getLocal().find(o => normalizeOrderId(o.orderId) === cleanId) || null;
        return { order: localFound, online: false, error: remote.error };
    }

    async function findByPhone(phone) {
        const target = normalizePhone(phone);
        if (!target) return { orders: [], online: false, error: null };

        const remote = await fetchRemote();
        const data = remote.online ? remote.data : getLocal();

        if (remote.online) setLocal(data);

        const matches = data.filter(o =>
            o && o.telepon && normalizePhone(o.telepon) === target
        );

        return {
            orders: matches.slice().reverse(),
            online: remote.online,
            error: remote.error || null
        };
    }

    async function updateStatus(orderId, newStatus) {
        const current = await findById(orderId);
        if (!current.order) {
            return { success: false, online: current.online, error: 'Pesanan tidak ditemukan.' };
        }

        const updated = Object.assign({}, current.order, {
            status: newStatus,
            updatedAt: new Date().toISOString()
        });

        const result = await putRemote(updated);
        if (result.success) {
            const local = getLocal();
            setLocal(mergeOrders(local, [result.order || updated]));
            return { success: true, online: true, error: null };
        }

        // Jangan menghapus data lokal ketika server gagal.
        setLocal(mergeOrders(getLocal(), [updated]));
        return { success: false, online: false, error: result.error };
    }

    return {
        load,
        add,
        findById,
        findByPhone,
        updateStatus,
        isConfigured,
        normalizePhone,
        STATUS_STEPS
    };
})();
