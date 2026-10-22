// Halaman Lacak Pesanan.
// Fungsi lama dipertahankan: cari via nomor pesanan (MF-...) atau nomor HP, pilih dari daftar bila
// ada beberapa pesanan, stepper status, struk & cetak, dan pelacakan otomatis dari ?id=...
// Status yang dipakai sama dengan sistem saat ini (OrdersStore.STATUS_STEPS).
(function () {
    'use strict';

    var WA_URL = 'https://wa.me/62895635067289?text=Halo%20Margaluyu%20Farm%2C%20saya%20ingin%20menanyakan%20pesanan%20saya';

    var STATUS_LABELS = {
        'Dikonfirmasi': 'Pesanan Anda telah dikonfirmasi dan akan segera diproses.',
        'Dikemas': 'Pesanan Anda sedang dikemas.',
        'Dikirim': 'Pesanan Anda sedang dalam perjalanan menuju alamat pengiriman.',
        'Selesai': 'Pesanan Anda telah diterima. Terima kasih telah berbelanja di Margaluyu Farm!'
    };

    var form = document.getElementById('trackForm');
    if (!form) return;
    var input = document.getElementById('orderIdInput');
    var phoneInput = document.getElementById('phoneInput');
    var trackBtn = document.getElementById('trackBtn');
    var stateBox = document.getElementById('trackState');
    var listBox = document.getElementById('orderList');
    var resultBox = document.getElementById('resultBox');
    var orderIdField = document.getElementById('orderIdField');
    var forgotOrderBtn = document.getElementById('forgotOrderBtn');
    var trackHint = document.getElementById('trackHint');
    var busy = false;
    var phoneOnlyMode = false;

    function el(tag, className, text) {
        var n = document.createElement(tag);
        if (className) n.className = className;
        if (text != null) n.textContent = text;
        return n;
    }

    function rupiah(v) {
        var n = Number(v);
        return 'Rp ' + (isFinite(n) ? n : 0).toLocaleString('id-ID');
    }

    // ---------- Pesan status ----------
    function showState(kind, text, extraNode) {
        stateBox.className = 'track-state notice notice--' + kind;
        stateBox.textContent = text;
        if (extraNode) { stateBox.appendChild(document.createTextNode(' ')); stateBox.appendChild(extraNode); }
        stateBox.hidden = false;
    }
    function clearAll() {
        stateBox.hidden = true;
        stateBox.textContent = '';
        listBox.textContent = '';
        resultBox.hidden = true;
    }
    function waLink(label) {
        var a = el('a', null, label || 'WhatsApp');
        a.href = WA_URL; a.target = '_blank'; a.rel = 'noopener';
        return a;
    }

    function setBusy(state) {
        busy = state;
        trackBtn.disabled = state;
        trackBtn.textContent = '';
        if (state) {
            var sp = el('span', 'spinner'); sp.setAttribute('aria-hidden', 'true');
            trackBtn.appendChild(sp);
            trackBtn.appendChild(document.createTextNode(' Mencari...'));
        } else {
            var ic = el('i', 'fas fa-search'); ic.setAttribute('aria-hidden', 'true');
            trackBtn.appendChild(ic);
            trackBtn.appendChild(document.createTextNode(' Lacak'));
        }
        stateBox.setAttribute('aria-busy', state ? 'true' : 'false');
    }

    // ---------- Hasil ----------
    function row(label, value, cls) {
        var r = el('div', 'invoice-row' + (cls ? ' ' + cls : ''));
        r.appendChild(el('span', null, label));
        r.appendChild(el('span', null, value));
        return r;
    }

    function renderResult(order, fromLocal) {
        var steps = OrdersStore.STATUS_STEPS;
        var idx = steps.indexOf(order.status);

        document.querySelectorAll('#stepper .step').forEach(function (node, i) {
            node.classList.remove('done', 'current');
            node.removeAttribute('aria-current');
            if (idx >= 0 && i < idx) node.classList.add('done');
            else if (i === idx) { node.classList.add('current'); node.setAttribute('aria-current', 'step'); }
        });
        // Jam tiap tahap (dari riwayat di server). Pesanan lama tanpa riwayat tidak menampilkan jam.
        var waktu = {};
        (Array.isArray(order.riwayat) ? order.riwayat : []).forEach(function (h) {
            if (h && h.tipe === 'status' && h.at) waktu[h.nilai] = h.at;
        });
        document.querySelectorAll('#stepper .step').forEach(function (node, i) {
            var lama = node.querySelector('.step-time');
            if (lama) lama.remove();
            var at = waktu[steps[i]];
            if (!at) return;
            var d = new Date(at);
            if (isNaN(d)) return;
            var t = el('div', 'step-time', d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }));
            t.style.cssText = 'font-size:11px;opacity:.75;margin-top:2px;';
            node.appendChild(t);
        });
        var pct = idx <= 0 ? 0 : (idx / (steps.length - 1)) * 75;
        document.getElementById('progressLine').style.width = pct + '%';

        var sum = document.getElementById('orderSummary');
        sum.textContent = '';
        var head = el('div', 'invoice-head');
        head.appendChild(el('div', 'invoice-brand', 'Margaluyu Farm'));
        head.appendChild(el('div', 'invoice-sub', 'Struk Pesanan'));
        sum.appendChild(head);
        sum.appendChild(el('div', 'invoice-id', order.orderId || '-'));
        sum.appendChild(row('Tanggal', order.tanggal || '-'));
        sum.appendChild(row('Nama', order.nama || '-'));
        sum.appendChild(row('No. HP', order.telepon || '-'));
        sum.appendChild(row('Alamat', order.alamat || '-'));
        sum.appendChild(el('hr'));
        sum.appendChild(row(order.produk || '-', order.jumlah ? 'x' + order.jumlah : '-'));
        sum.appendChild(el('hr'));
        if (order.subtotal != null && order.ongkir != null) {
            sum.appendChild(row('Ongkir', Number(order.ongkir) === 0 ? 'Gratis' : rupiah(order.ongkir)));
            if (Number(order.diskon) > 0) sum.appendChild(row('Diskon' + (order.kodePromo ? ' (' + order.kodePromo + ')' : ''), '- ' + rupiah(order.diskon)));
        }
        sum.appendChild(row('Total', order.totalHarga ? rupiah(order.totalHarga) : 'Rp 0', 'invoice-total'));
        sum.appendChild(row('Pembayaran', (order.metodePembayaran || '-') + (order.statusPembayaran ? ' (' + order.statusPembayaran + ')' : '')));
        if (order.tanggalKirim || order.jamKirim) {
            var jd = order.tanggalKirim ? new Date(order.tanggalKirim + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
            sum.appendChild(row('Jadwal kirim', [jd, order.jamKirim].filter(Boolean).join(', ')));
        }
        sum.appendChild(row('Status', order.status || 'Dikonfirmasi'));

        document.getElementById('statusNote').textContent = STATUS_LABELS[order.status] || order.status || '';
        if (typeof MyOrders !== 'undefined' && order.orderId) MyOrders.add({ id: order.orderId, telepon: phoneInput.value.trim(), nama: order.nama, selesai: order.status === 'Selesai' });
        var lamaCta = document.getElementById('reviewCta'); if (lamaCta) lamaCta.remove();
        if (order.status === 'Selesai' && order.orderId) {
            var cta = el('a', 'btn', 'Beri ulasan & ambil voucher Rp5.000');
            cta.id = 'reviewCta';
            cta.href = 'rating.html?order=' + encodeURIComponent(order.orderId) + '&nama=' + encodeURIComponent(String(order.nama || '').split(' ')[0]);
            cta.style.cssText = 'display:block;margin-top:14px;text-align:center;';
            document.getElementById('statusNote').insertAdjacentElement('afterend', cta);
        }
        resultBox.hidden = false;
    }

    function renderPicker(orders, fromLocal) {
        listBox.textContent = '';
        if (!orders.length) return;

        listBox.appendChild(el('div', 'order-picks-title', 'Pesanan ditemukan. Pilih pesanan yang ingin dilihat:'));
        orders.forEach(function (o) {
            var b = el('button', 'order-pick');
            b.type = 'button';
            var id = el('span', 'pick-id', o.orderId || '-');
            b.appendChild(id);
            b.appendChild(document.createTextNode(' — ' + (o.status || '-')));
            b.appendChild(el('span', 'pick-meta', (o.produk || 'Pesanan') + (o.jumlah ? ' x' + o.jumlah : '') + ' · ' + (o.tanggal || '-')));
            b.addEventListener('click', function () {
                if (phoneOnlyMode) {
                    showNameConfirmation(o);
                } else {
                    renderResult(o, fromLocal);
                    resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            listBox.appendChild(b);
        });
    }

    function showNameConfirmation(order) {
        listBox.textContent = '';
        var box = el('div', 'privacy-confirm');
        box.appendChild(el('strong', null, 'Konfirmasi pesanan'));
        box.appendChild(el('p', null, 'Untuk menjaga privasi, masukkan nama penerima sesuai pesanan.'));

        var label = el('label', null, 'Nama penerima');
        label.setAttribute('for', 'confirmNameInput');
        box.appendChild(label);
        var nameInput = el('input', 'input');
        nameInput.type = 'text';
        nameInput.id = 'confirmNameInput';
        nameInput.autocomplete = 'name';
        nameInput.placeholder = 'Nama sesuai pesanan';
        box.appendChild(nameInput);

        var btn = el('button', 'btn', 'Lihat Pesanan');
        btn.type = 'button';
        btn.addEventListener('click', async function () {
            var name = nameInput.value.trim();
            if (!name) {
                showState('error', 'Masukkan nama penerima sesuai pesanan.');
                nameInput.focus();
                return;
            }
            setBusy(true);
            try {
                var verified = await OrdersStore.findByIdAndName(order.orderId, phoneInput.value.trim(), name);
                if (!verified.order) {
                    showState('error', 'Nama penerima tidak sesuai. Periksa kembali nama yang digunakan saat memesan.');
                    nameInput.focus();
                    return;
                }
                listBox.textContent = '';
                renderResult(verified.order, false);
                resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (e) {
                console.error('Gagal memverifikasi pesanan:', e);
                showState('error', 'Terjadi kendala saat memverifikasi pesanan. Silakan coba lagi.');
            } finally {
                setBusy(false);
            }
        });
        box.appendChild(btn);
        listBox.appendChild(box);
        nameInput.focus();
    }

    function showNotFound(online) {
        if (online === false) {
            showState('error', 'Data pesanan belum dapat dimuat. Periksa koneksi internet Anda lalu coba lagi. Jika masih gagal, hubungi kami lewat', waLink('WhatsApp'));
        } else {
            showState('error', 'Pesanan tidak ditemukan. Periksa kembali nomor pesanan atau nomor HP Anda. Butuh bantuan? Hubungi kami lewat', waLink('WhatsApp'));
        }
    }

    // ---------- Pencarian ----------
    async function trackOrder() {
        if (busy) return;
        var keyword = input.value.trim();
        var phone = phoneInput.value.trim();
        clearAll();

        if (!phone) {
            showState('error', 'Masukkan nomor HP yang digunakan saat memesan.');
            phoneInput.focus();
            return;
        }

        setBusy(true);
        try {
            if (phoneOnlyMode) {
                var rPhone = await OrdersStore.findByPhone(phone);
                if (!rPhone.orders.length) return showNotFound(rPhone.online);
                renderPicker(rPhone.orders, false);
                showState('success', 'Pesanan ditemukan. Pilih pesanan yang ingin dilihat.');
                return;
            }

            if (!keyword) {
                showState('error', 'Masukkan nomor pesanan. Jika lupa, pilih “Lupa nomor pesanan?” di bawah.');
                input.focus();
                return;
            }

            var r1 = await OrdersStore.findById(keyword, phone);
            if (!r1.order) return showNotFound(r1.online);
            renderResult(r1.order, !r1.online);
        } catch (e) {
            console.error('Gagal melacak pesanan:', e);
            showState('error', 'Terjadi kendala saat mencari pesanan. Silakan coba lagi.');
        } finally {
            setBusy(false);
        }
    }

    function setPhoneOnlyMode(enabled) {
        phoneOnlyMode = Boolean(enabled);
        orderIdField.hidden = phoneOnlyMode;
        input.required = !phoneOnlyMode;
        forgotOrderBtn.textContent = phoneOnlyMode ? 'Kembali ke nomor pesanan' : 'Lupa nomor pesanan?';
        trackHint.textContent = phoneOnlyMode
            ? 'Masukkan nomor HP. Kami akan menampilkan pesanan secara terbatas untuk menjaga privasi.'
            : 'Masukkan nomor pesanan dan nomor HP untuk melihat detail pesanan.';
        trackBtn.innerHTML = '<i class="fas fa-search" aria-hidden="true"></i> ' + (phoneOnlyMode ? 'Cari Pesanan' : 'Lacak');
        clearAll();
        if (phoneOnlyMode) phoneInput.focus(); else input.focus();
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); trackOrder(); });
    // Unduh struk sebagai gambar JPG (rancangan struk ada di receipt-image.js).
    document.getElementById('saveImgBtn').addEventListener('click', function () {
        var sum = document.getElementById('orderSummary'); if (!sum) return;
        var m = {}, produk = '', qty = 1, known = ['Tanggal', 'Nama', 'No. HP', 'Alamat', 'Total', 'Pembayaran', 'Status', 'Ongkir', 'Jadwal kirim'];
        Array.prototype.forEach.call(sum.querySelectorAll('.invoice-row'), function (r) {
            var l = r.children[0].textContent.trim(), v = r.children[1].textContent.trim();
            if (l.indexOf('Diskon') === 0) m['Diskon'] = v; else if (known.indexOf(l) > -1) m[l] = v; else { produk = l; qty = parseInt(String(v).replace(/\D/g, ''), 10) || 1; }
        });
        var idEl = sum.querySelector('.invoice-id'), total = parseInt(String(m['Total'] || '').replace(/\D/g, ''), 10) || 0;
        MFReceipt.download({ id: idEl ? idEl.textContent.trim() : 'pesanan', tanggal: m['Tanggal'] || '-', nama: m['Nama'] || '-', hp: m['No. HP'] || '-', alamat: m['Alamat'] || '-', produk: produk || '-', qty: qty, unit: qty ? Math.round(((total - (parseInt(String(m['Ongkir'] || '').replace(/\D/g, ''), 10) || 0) + (parseInt(String(m['Diskon'] || '').replace(/\D/g, ''), 10) || 0))) / qty) : total, total: total, bayar: m['Pembayaran'] || '-', status: m['Status'] || 'Dikonfirmasi' });
    });
    forgotOrderBtn.addEventListener('click', function () { setPhoneOnlyMode(!phoneOnlyMode); });

    // Dibuka dari link konfirmasi pesanan (?id=...): isi nomor pesanan saja.
    // Tetap meminta nomor HP sebelum data ditampilkan.
    var idFromUrl = new URLSearchParams(window.location.search).get('id');
    // Isi otomatis dari perangkat ini: nomor pesanan & nomor HP terakhir (atau yang cocok dengan ?id=).
    if (typeof MyOrders !== 'undefined') {
        var dl = document.getElementById('myOrderList');
        MyOrders.all().forEach(function (o) { var op = document.createElement('option'); op.value = o.id; op.label = o.id + (o.nama ? ' (' + o.nama + ')' : ''); if (dl) dl.appendChild(op); });
        var saved = idFromUrl ? MyOrders.find(idFromUrl) : MyOrders.latest();
        if (saved) { input.value = saved.id; if (saved.telepon) phoneInput.value = saved.telepon; }
        input.addEventListener('change', function () {
            var m = MyOrders.find(input.value);
            if (m && m.telepon) phoneInput.value = m.telepon;
        });
    }
    if (idFromUrl && !input.value) input.value = idFromUrl;
    if (idFromUrl && !phoneInput.value) phoneInput.focus();
})();
