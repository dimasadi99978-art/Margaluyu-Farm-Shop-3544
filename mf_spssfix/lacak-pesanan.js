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
        sum.appendChild(row('Total', order.totalHarga ? rupiah(order.totalHarga) : 'Rp 0', 'invoice-total'));
        sum.appendChild(row('Pembayaran', order.metodePembayaran || '-'));
        sum.appendChild(row('Status', order.status || 'Dikonfirmasi'));

        document.getElementById('statusNote').textContent = STATUS_LABELS[order.status] || order.status || '';
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
    document.getElementById('printBtn').addEventListener('click', function () { window.print(); });
    forgotOrderBtn.addEventListener('click', function () { setPhoneOnlyMode(!phoneOnlyMode); });

    // Dibuka dari link konfirmasi pesanan (?id=...): isi nomor pesanan saja.
    // Tetap meminta nomor HP sebelum data ditampilkan.
    var idFromUrl = new URLSearchParams(window.location.search).get('id');
    if (idFromUrl) { input.value = idFromUrl; phoneInput.focus(); }
})();
