// ============================================================
// Halaman Testimoni
// - Data: testimoni statis (testimoni-static.js) + testimoni dari formulir (TestimoniStore).
// - Tampilan: grid responsif (3 / 2 / 1 kolom), dirender dari data — tidak ada posisi yang ditulis manual.
// - Tidak ada auto-slide / carousel / interval. Penambahan tampilan hanya lewat tombol "Muat lebih banyak".
// - Semua teks pengguna dirender dengan textContent (tidak ada innerHTML dari data pengguna).
// ============================================================
(function () {
    'use strict';

    var PAGE_SIZE = 12;

    var els = {};
    var state = { all: [], shown: 0, online: null, error: null, admin: false };

    function $(id) { return document.getElementById(id); }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    // ---------- Normalisasi data ----------
    function clampRating(value) {
        var n = Number(value);
        if (!isFinite(n)) return 0;
        n = Math.round(n);
        return Math.max(0, Math.min(5, n));
    }

    function normalize(item, isRemote) {
        if (!item || typeof item !== 'object') return null;
        var komentar = String(item.komentar == null ? '' : item.komentar).trim();
        var rating = clampRating(item.rating);
        if (!komentar && !rating) return null;
        return {
            nama: String(item.nama || '').trim() || 'Pelanggan',
            rating: rating,
            komentar: komentar || '(Tidak ada catatan tambahan)',
            tanggal: String(item.tanggal || '').trim(),
            foto: (typeof item.foto === 'string' && /^data:image\/(jpeg|png|webp);base64,/i.test(item.foto) && item.foto.length <= 180000) ? item.foto : '',
            // Kunci hanya untuk testimoni asli dari pelanggan (bisa dihapus admin); testimoni bawaan tidak punya kunci.
            key: isRemote && typeof TestimoniStore !== 'undefined' ? TestimoniStore.keyOf(item) : ''
        };
    }

    function buildList(remoteList) {
        // Dari server: entri terakhir = paling baru, jadi dibalik. Testimoni statis (lebih lama) menyusul.
        var remote = (Array.isArray(remoteList) ? remoteList : []).slice().reverse();
        var statics = (typeof TESTIMONI_STATIS !== 'undefined' && Array.isArray(TESTIMONI_STATIS)) ? TESTIMONI_STATIS.slice().reverse() : [];
        return remote.map(function (x) { return normalize(x, true); })
            .concat(statics.map(function (x) { return normalize(x, false); }))
            .filter(Boolean);
    }

    // ---------- Bagian tampilan ----------
    function stars(n) {
        var wrap = el('span', 'stars');
        wrap.setAttribute('role', 'img');
        wrap.setAttribute('aria-label', 'Rating ' + n + ' dari 5');
        for (var i = 1; i <= 5; i++) {
            var s = el('i', 'fas fa-star' + (i <= n ? '' : ' off'));
            s.setAttribute('aria-hidden', 'true');
            wrap.appendChild(s);
        }
        return wrap;
    }

    function renderSummary() {
        var box = els.summary;
        box.textContent = '';
        var rated = state.all.filter(function (t) { return t.rating > 0; });
        if (!rated.length) { box.hidden = true; return; }
        var sum = rated.reduce(function (a, t) { return a + t.rating; }, 0);
        var avg = sum / rated.length;

        var score = el('div', 'score', avg.toFixed(1).replace('.', ','));
        score.appendChild(el('small', null, ' / 5'));
        var right = el('div', 'summary-text');
        right.appendChild(stars(Math.round(avg)));
        right.appendChild(el('div', 'count', 'Berdasarkan ' + rated.length + ' ulasan'));
        box.appendChild(score);
        box.appendChild(right);
        box.hidden = false;
    }

    function renderCard(t) {
        var card = el('article', 'testi-card');

        var head = el('div', 'head');
        head.appendChild(el('div', 'name', t.nama));
        card.appendChild(head);

        if (t.rating > 0) card.appendChild(stars(t.rating));
        else card.appendChild(el('span', 'tag', 'Kritik & Saran'));

        if (t.foto) {
            var photo = document.createElement('img');
            photo.className = 'testi-photo';
            photo.src = t.foto;
            photo.alt = 'Foto dari ' + t.nama;
            photo.loading = 'lazy';
            photo.tabIndex = 0;
            photo.setAttribute('role', 'button');
            photo.setAttribute('aria-label', 'Lihat foto dari ' + t.nama);
            photo.title = 'Klik untuk melihat foto';
            photo.addEventListener('click', function () { openPhotoLightbox(t.foto, t.nama); });
            photo.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPhotoLightbox(t.foto, t.nama); } });
            card.appendChild(photo);
        }

        var text = el('p', 'text', '\u201C' + t.komentar + '\u201D');
        card.appendChild(text);

        var foot = el('div', 'foot');
        foot.appendChild(el('span', 'date', t.tanggal));
        var more = el('button', 'link-btn', 'Baca selengkapnya');
        more.type = 'button';
        more.hidden = true;
        more.addEventListener('click', function () { openDialog(t, text, more); });
        foot.appendChild(more);
        if (state.admin && t.key) {
            var del = el('button', 'link-btn', 'Hapus');
            del.type = 'button';
            del.style.color = '#b3261e';
            del.addEventListener('click', async function () {
                if (!confirm('Hapus testimoni dari "' + t.nama + '"? Tidak bisa dibatalkan.')) return;
                del.disabled = true;
                var r = await TestimoniStore.removeMany([t.key]);
                if (!r.success) { alert('Gagal menghapus: ' + r.error); del.disabled = false; return; }
                load();
            });
            foot.appendChild(del);
        }
        card.appendChild(foot);

        return card;
    }

    // Tombol "Baca selengkapnya" hanya muncul jika teks memang terpotong oleh line-clamp.
    function updateClamps() {
        var cards = els.grid.querySelectorAll('.testi-card');
        cards.forEach(function (card) {
            var text = card.querySelector('.text');
            var btn = card.querySelector('.link-btn');
            if (!text || !btn) return;
            if (text.classList.contains('is-short')) { btn.hidden = true; return; }
            btn.hidden = !(text.scrollHeight > text.clientHeight + 1);
        });
    }

    function renderMore() {
        var remaining = state.all.length - state.shown;
        els.more.textContent = '';
        if (remaining <= 0) { els.more.hidden = true; return; }
        var btn = el('button', 'btn btn--outline', 'Muat lebih banyak');
        btn.type = 'button';
        btn.addEventListener('click', function () { showMore(); });
        els.more.appendChild(btn);
        els.more.appendChild(el('span', 'remaining', remaining + ' testimoni lagi'));
        els.more.hidden = false;
    }

    function showMore() {
        var next = Math.min(state.shown + PAGE_SIZE, state.all.length);
        var frag = document.createDocumentFragment();
        var firstNew = null;
        for (var i = state.shown; i < next; i++) {
            var card = renderCard(state.all[i]);
            if (!firstNew) firstNew = card;
            frag.appendChild(card);
        }
        els.grid.appendChild(frag);
        state.shown = next;
        els.total.textContent = state.all.length + ' testimoni';
        renderMore();
        updateClamps();
        if (firstNew && state.shown > PAGE_SIZE) {
            firstNew.setAttribute('tabindex', '-1');
            firstNew.focus({ preventScroll: true });
        }
    }

    function showLoading() {
        els.summary.hidden = true;
        els.more.hidden = true;
        els.notice.hidden = true;
        els.state.hidden = true;
        els.grid.textContent = '';
        els.grid.setAttribute('aria-busy', 'true');
        for (var i = 0; i < 6; i++) {
            var sk = el('div', 'skeleton-card');
            sk.appendChild(el('div', 'skeleton-line w40'));
            sk.appendChild(el('div', 'skeleton-line w90'));
            sk.appendChild(el('div', 'skeleton-line w90'));
            sk.appendChild(el('div', 'skeleton-line w70'));
            els.grid.appendChild(sk);
        }
    }

    function showState(kind) {
        // kind: 'empty' | 'error'
        els.grid.textContent = '';
        els.grid.removeAttribute('aria-busy');
        els.summary.hidden = true;
        els.more.hidden = true;
        els.total.textContent = '';
        els.state.textContent = '';
        var box = el('div', kind === 'error' ? 'testi-error' : 'testi-empty');
        if (kind === 'error') {
            box.appendChild(el('p', null, 'Testimoni belum dapat dimuat. Silakan coba lagi.'));
            var retry = el('button', 'btn', 'Coba lagi');
            retry.type = 'button';
            retry.addEventListener('click', load);
            box.appendChild(retry);
        } else {
            box.appendChild(el('p', null, 'Belum ada testimoni. Jadilah salah satu yang pertama memberikan ulasan.'));
            var a = el('a', 'btn', 'Berikan Rating');
            a.href = 'rating.html';
            box.appendChild(a);
        }
        els.state.appendChild(box);
        els.state.hidden = false;
    }

    function showNotice(online, error) {
        var n = els.notice;
        n.textContent = '';
        n.className = 'notice testi-status-note';
        var configured = typeof TestimoniStore !== 'undefined' && TestimoniStore.isConfigured();
        if (online) { n.hidden = true; return; }
        if (!configured) {
            n.classList.add('notice--warn');
            n.appendChild(document.createTextNode('Testimoni baru dari formulir hanya tersimpan di perangkat ini.'));
            n.hidden = false;
            return;
        }
        n.classList.add('notice--warn');
        n.appendChild(document.createTextNode('Testimoni terbaru belum dapat dimuat dari server, sehingga yang tampil mungkin belum lengkap. '));
        var retry = el('button', 'link-btn', 'Coba lagi');
        retry.type = 'button';
        retry.addEventListener('click', load);
        n.appendChild(retry);
        n.hidden = false;
        if (error) console.warn('Detail kegagalan memuat testimoni:', error);
    }

    // ---------- Pratinjau foto fleksibel: zoom + geser ----------
    var testiPhotoLightbox = $('testiPhotoLightbox');
    var testiPhotoImg = $('testiPhotoLightboxImg');
    var testiPhotoViewport = $('testiPhotoViewport');
    var testiPhotoZoomIn = $('testiPhotoZoomIn');
    var testiPhotoZoomOut = $('testiPhotoZoomOut');
    var testiPhotoZoomReset = $('testiPhotoZoomReset');
    var testiPhotoZoomLabel = $('testiPhotoZoomLabel');
    var testiPhotoClose = $('testiPhotoLightboxClose');
    var testiZoom = 1, testiPanX = 0, testiPanY = 0, testiDragging = false, testiLastX = 0, testiLastY = 0;

    function applyTestiPhotoTransform() {
        if (!testiPhotoImg) return;
        testiPhotoImg.style.transform = 'translate3d(' + testiPanX + 'px,' + testiPanY + 'px,0) scale(' + testiZoom + ')';
        testiPhotoImg.style.cursor = testiZoom > 1 ? (testiDragging ? 'grabbing' : 'grab') : 'zoom-in';
        if (testiPhotoZoomLabel) testiPhotoZoomLabel.textContent = Math.round(testiZoom * 100) + '%';
    }
    function setTestiZoom(next, resetPan) {
        testiZoom = Math.max(1, Math.min(5, next));
        if (resetPan || testiZoom === 1) { testiPanX = 0; testiPanY = 0; }
        applyTestiPhotoTransform();
    }
    function openPhotoLightbox(src, name) {
        if (!testiPhotoLightbox || typeof testiPhotoLightbox.showModal !== 'function' || !src) return;
        testiZoom = 1; testiPanX = 0; testiPanY = 0;
        testiPhotoImg.src = src;
        testiPhotoImg.alt = 'Foto dari ' + (name || 'pelanggan');
        testiPhotoImg.onload = applyTestiPhotoTransform;
        testiPhotoLightbox.showModal();
    }
    if (testiPhotoClose) testiPhotoClose.addEventListener('click', function () { testiPhotoLightbox.close(); });
    if (testiPhotoLightbox) testiPhotoLightbox.addEventListener('click', function (e) { if (e.target === testiPhotoLightbox) testiPhotoLightbox.close(); });
    if (testiPhotoZoomIn) testiPhotoZoomIn.addEventListener('click', function () { setTestiZoom(testiZoom + .25, false); });
    if (testiPhotoZoomOut) testiPhotoZoomOut.addEventListener('click', function () { setTestiZoom(testiZoom - .25, false); });
    if (testiPhotoZoomReset) testiPhotoZoomReset.addEventListener('click', function () { setTestiZoom(1, true); });
    if (testiPhotoViewport) {
        testiPhotoViewport.addEventListener('wheel', function (e) { e.preventDefault(); setTestiZoom(testiZoom + (e.deltaY < 0 ? .2 : -.2), false); }, { passive: false });
        testiPhotoViewport.addEventListener('pointerdown', function (e) {
            if (testiZoom <= 1) return;
            testiDragging = true; testiLastX = e.clientX; testiLastY = e.clientY;
            testiPhotoViewport.setPointerCapture(e.pointerId); applyTestiPhotoTransform();
        });
        testiPhotoViewport.addEventListener('pointermove', function (e) {
            if (!testiDragging) return;
            testiPanX += e.clientX - testiLastX; testiPanY += e.clientY - testiLastY;
            testiLastX = e.clientX; testiLastY = e.clientY; applyTestiPhotoTransform();
        });
        ['pointerup','pointercancel','lostpointercapture'].forEach(function (ev) { testiPhotoViewport.addEventListener(ev, function () { testiDragging = false; applyTestiPhotoTransform(); }); });
    }

    // ---------- Dialog "Baca selengkapnya" ----------
    function openDialog(t, textEl, btn) {
        var dlg = els.dialog;
        if (!dlg || typeof dlg.showModal !== 'function') {
            // Cadangan untuk browser lama: buka teks langsung di kartu
            textEl.classList.add('is-short');
            btn.hidden = true;
            return;
        }
        var body = els.dialogBody;
        body.textContent = '';
        var close = el('button', 'btn btn--sm btn--outline dialog-close', 'Tutup');
        close.type = 'button';
        close.addEventListener('click', function () { dlg.close(); });
        body.appendChild(close);
        body.appendChild(el('div', 'dialog-name', t.nama));
        if (t.rating > 0) body.appendChild(stars(t.rating));
        if (t.foto) {
            var photo = document.createElement('img');
            photo.className = 'dialog-photo';
            photo.src = t.foto;
            photo.alt = 'Foto dari ' + t.nama;
            body.appendChild(photo);
        }
        body.appendChild(el('p', 'dialog-text', '\u201C' + t.komentar + '\u201D'));
        if (t.tanggal) body.appendChild(el('div', 'date', t.tanggal));
        dlg.showModal();
    }

    function initDialog() {
        var dlg = els.dialog;
        if (!dlg) return;
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    }

    // ---------- Alur utama ----------
    async function load() {
        showLoading();
        try {
            // Tombol hapus hanya muncul bila server mengonfirmasi kata sandi admin di sesi ini.
            if (typeof TestimoniStore !== 'undefined' && TestimoniStore.isAdmin) state.admin = await TestimoniStore.isAdmin();
            var result = { data: [], online: false, error: null };
            if (typeof TestimoniStore !== 'undefined') result = await TestimoniStore.load();
            state.all = buildList(result.data);
            state.online = result.online;
            state.shown = 0;
            els.grid.textContent = '';
            els.grid.removeAttribute('aria-busy');

            if (!state.all.length) {
                // Server dikonfigurasi tetapi gagal dimuat dan tidak ada data cadangan: itu error, bukan "belum ada testimoni".
                var configured = typeof TestimoniStore !== 'undefined' && TestimoniStore.isConfigured();
                if (!result.online && configured) {
                    if (result.error) console.warn('Detail kegagalan memuat testimoni:', result.error);
                    showState('error');
                    els.notice.hidden = true;
                } else {
                    showState('empty');
                    showNotice(result.online, result.error);
                }
                return;
            }
            els.state.hidden = true;
            renderSummary();
            showMore();
            showNotice(result.online, result.error);
        } catch (e) {
            console.error('Gagal memuat testimoni:', e);
            showState('error');
        }
    }

    function init() {
        els.summary = $('testiSummary');
        els.grid = $('testiGrid');
        els.more = $('testiMore');
        els.state = $('testiState');
        els.notice = $('testiNotice');
        els.total = $('testiTotal');
        els.dialog = $('testiDialog');
        els.dialogBody = $('testiDialogBody');
        if (!els.grid) return; // bukan halaman testimoni

        initDialog();

        // Hitung ulang teks yang terpotong saat ukuran layar berubah (satu kali per frame).
        var frame = 0;
        window.addEventListener('resize', function () {
            if (frame) return;
            frame = requestAnimationFrame(function () { frame = 0; updateClamps(); });
        });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateClamps);

        load();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
