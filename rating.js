// Formulir Rating & Kritik/Saran.
// Mekanisme penyimpanan tidak berubah: data dikirim lewat TestimoniStore.add()
// (penyimpanan bersama jika sudah dikonfigurasi, dengan cadangan lokal).
(function () {
    'use strict';

    var HINTS = { 1: 'Kurang', 2: 'Cukup', 3: 'Baik', 4: 'Sangat baik', 5: 'Istimewa' };

    var form = document.getElementById('ratingForm');
    if (!form) return;

    var namaEl = document.getElementById('nama');
    var namaError = document.getElementById('namaError');
    var anonEl = document.getElementById('anonim');
    var orderIdRewardEl = document.getElementById('orderIdReward');
    var phoneRewardEl = document.getElementById('phoneReward');
    var voucherRewardText = document.getElementById('voucherRewardText');

    // Opsi samarkan nama: nama tetap diisi, tetapi hanya sebagian yang ditampilkan (mis. "Budi S.").
    // Pembuatan nama samaran dilakukan di server, sehingga nama lengkap tidak pernah disimpan.
    function syncAnon() {}
    if (anonEl) anonEl.addEventListener('change', syncAnon);
    var komentarEl = document.getElementById('komentar');
    var kritikSaranEl = document.getElementById('kritiksaran');
    var fotoEl = document.getElementById('foto');
    var fotoError = document.getElementById('fotoError');
    var photoPreview = document.getElementById('photoPreview');
    var photoPreviewImg = document.getElementById('photoPreviewImg');
    var photoRemove = document.getElementById('photoRemove');
    var photoPreviewTrigger = document.getElementById('photoPreviewTrigger');
    var photoLightbox = document.getElementById('ratingPhotoLightbox');
    var photoLightboxImg = document.getElementById('ratingPhotoLightboxImg');
    var photoLightboxClose = document.getElementById('ratingPhotoLightboxClose');
    var successCard = document.getElementById('ratingSuccessCard');
    var submitBtn = document.getElementById('submitBtn');
    var msg = document.getElementById('formMsg');
    var hint = document.getElementById('starHint');
    var busy = false;
    var fotoData = '';
    var mediaOn = typeof TestimoniMedia !== 'undefined' && TestimoniMedia.isConfigured();
    // Foto yang diunggah ke Cloudinary boleh lebih besar. Tanpa Cloudinary, foto disimpan langsung di
    // data testimoni (JSONBin gratis hanya ±100KB per bin), jadi harus sangat kecil.
    var MAX_PHOTO_BYTES = mediaOn ? 150 * 1024 : 20 * 1024;

    // Kirim ulang masukan yang sebelumnya gagal terkirim (jika ada).
    if (typeof TestimoniStore !== 'undefined' && TestimoniStore.isConfigured()) {
        TestimoniStore.syncPending().catch(function () {});
    }

    function showMsg(kind, text) {
        msg.className = 'form-msg notice notice--' + kind;
        msg.textContent = text;
        msg.hidden = false;
    }
    function clearMsg() { msg.hidden = true; msg.textContent = ''; }

    function setBusy(state) {
        busy = state;
        submitBtn.disabled = state;
        submitBtn.textContent = '';
        if (state) {
            var sp = document.createElement('span');
            sp.className = 'spinner';
            sp.setAttribute('aria-hidden', 'true');
            submitBtn.appendChild(sp);
            submitBtn.appendChild(document.createTextNode(' Mengirim...'));
        } else {
            submitBtn.textContent = 'Kirim';
        }
    }

    function selectedRating() {
        var checked = form.querySelector('input[name="rating"]:checked');
        return checked ? Number(checked.value) : 0;
    }

    function clearPhoto() {
        fotoData = '';
        fotoEl.value = '';
        photoPreview.hidden = true;
        photoPreviewImg.removeAttribute('src');
        fotoError.textContent = '';
    }

    function compressPhoto(file) {
        return new Promise(function (resolve, reject) {
            if (!file || !file.type || file.type.indexOf('image/') !== 0) {
                reject(new Error('Pilih file gambar.'));
                return;
            }
            var reader = new FileReader();
            reader.onerror = function () { reject(new Error('Foto tidak dapat dibaca.')); };
            reader.onload = function () {
                var img = new Image();
                img.onerror = function () { reject(new Error('Foto tidak dapat diproses.')); };
                img.onload = function () {
                    var sides = mediaOn ? [1000, 800] : [640, 520, 440, 360, 300];
                    var result = '';
                    for (var si = 0; si < sides.length; si++) {
                        var maxSide = sides[si];
                        var scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
                        var canvas = document.createElement('canvas');
                        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
                        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
                        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                        var quality = 0.78;
                        var dataUrl = canvas.toDataURL('image/jpeg', quality);
                        // Turunkan kualitas bertahap agar data tetap ringan.
                        while (dataUrl.length * 0.75 > MAX_PHOTO_BYTES && quality > 0.45) {
                            quality -= 0.08;
                            dataUrl = canvas.toDataURL('image/jpeg', quality);
                        }
                        if (dataUrl.length * 0.75 <= MAX_PHOTO_BYTES) { result = dataUrl; break; }
                    }
                    if (!result) {
                        reject(new Error('Ukuran foto masih terlalu besar. Pilih foto yang lebih kecil.'));
                        return;
                    }
                    resolve(result);
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    fotoEl.addEventListener('change', async function () {
        fotoError.textContent = '';
        var file = fotoEl.files && fotoEl.files[0];
        if (!file) { clearPhoto(); return; }
        if (file.size > 8 * 1024 * 1024) {
            clearPhoto();
            fotoError.textContent = 'Ukuran foto maksimal 8 MB.';
            return;
        }
        try {
            fotoData = await compressPhoto(file);
            photoPreviewImg.src = fotoData;
            photoPreview.hidden = false;
        } catch (e) {
            clearPhoto();
            fotoError.textContent = e && e.message ? e.message : 'Foto belum dapat diproses.';
        }
    });

    photoRemove.addEventListener('click', clearPhoto);

    var photoZoom = 1, photoPanX = 0, photoPanY = 0, photoDragging = false, photoLastX = 0, photoLastY = 0;
    var photoZoomIn = document.getElementById('ratingPhotoZoomIn');
    var photoZoomOut = document.getElementById('ratingPhotoZoomOut');
    var photoZoomReset = document.getElementById('ratingPhotoZoomReset');
    var photoZoomLabel = document.getElementById('ratingPhotoZoomLabel');
    var photoViewport = document.getElementById('ratingPhotoViewport');

    function applyPhotoTransform() {
        photoLightboxImg.style.transform = 'translate3d(' + photoPanX + 'px,' + photoPanY + 'px,0) scale(' + photoZoom + ')';
        photoLightboxImg.style.cursor = photoZoom > 1 ? (photoDragging ? 'grabbing' : 'grab') : 'zoom-in';
        if (photoZoomLabel) photoZoomLabel.textContent = Math.round(photoZoom * 100) + '%';
    }
    function setPhotoZoom(next, resetPan) {
        photoZoom = Math.max(1, Math.min(5, next));
        if (resetPan || photoZoom === 1) { photoPanX = 0; photoPanY = 0; }
        applyPhotoTransform();
    }
    function openPhotoPreview(src) {
        if (!src) return;
        if (photoLightbox && typeof photoLightbox.showModal === 'function') {
            photoZoom = 1; photoPanX = 0; photoPanY = 0;
            photoLightboxImg.src = src;
            photoLightboxImg.onload = applyPhotoTransform;
            photoLightbox.showModal();
        } else window.open(src, '_blank', 'noopener');
    }
    if (photoPreviewTrigger) photoPreviewTrigger.addEventListener('click', function () { openPhotoPreview(fotoData || photoPreviewImg.src); });
    if (photoLightboxClose) photoLightboxClose.addEventListener('click', function () { photoLightbox.close(); });
    if (photoLightbox) photoLightbox.addEventListener('click', function (e) { if (e.target === photoLightbox) photoLightbox.close(); });
    if (photoZoomIn) photoZoomIn.addEventListener('click', function () { setPhotoZoom(photoZoom + .25, false); });
    if (photoZoomOut) photoZoomOut.addEventListener('click', function () { setPhotoZoom(photoZoom - .25, false); });
    if (photoZoomReset) photoZoomReset.addEventListener('click', function () { setPhotoZoom(1, true); });
    if (photoViewport) {
        photoViewport.addEventListener('wheel', function (e) { e.preventDefault(); setPhotoZoom(photoZoom + (e.deltaY < 0 ? .2 : -.2), false); }, { passive: false });
        photoViewport.addEventListener('pointerdown', function (e) {
            if (photoZoom <= 1) return;
            photoDragging = true; photoLastX = e.clientX; photoLastY = e.clientY;
            photoViewport.setPointerCapture(e.pointerId); applyPhotoTransform();
        });
        photoViewport.addEventListener('pointermove', function (e) {
            if (!photoDragging) return;
            photoPanX += e.clientX - photoLastX; photoPanY += e.clientY - photoLastY;
            photoLastX = e.clientX; photoLastY = e.clientY; applyPhotoTransform();
        });
        ['pointerup','pointercancel','lostpointercapture'].forEach(function (ev) { photoViewport.addEventListener(ev, function () { photoDragging = false; applyPhotoTransform(); }); });
    }

    form.addEventListener('change', function (e) {
        if (e.target && e.target.name === 'rating') {
            var v = selectedRating();
            hint.textContent = v ? (v + ' dari 5 — ' + HINTS[v]) : 'Ketuk bintang untuk memberi nilai';
        }
    });

    // Datang dari ajakan di halaman Lacak Pesanan (?bintang=5&nama=Ani): isi bintang & nama otomatis.
    (function prefillFromLink() {
        try {
            var q = new URLSearchParams(window.location.search);
            var n = parseInt(q.get('bintang'), 10);
            if (n >= 1 && n <= 5) {
                var radio = document.getElementById('star' + n);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            var ord = (q.get('order') || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 30);
            if (/^MF-[A-Z0-9-]{6,24}$/.test(ord) && orderIdRewardEl) {
                orderIdRewardEl.value = ord;
                var ro = document.getElementById('rewardOrder'); document.getElementById('rewardOrderText').textContent = ord; ro.hidden = false;
                document.getElementById('rewardOrderClear').addEventListener('click', function () { orderIdRewardEl.value = ''; ro.hidden = true; });
            }
            // Tanpa tautan: pakai pesanan selesai terakhir yang diingat perangkat ini.
            if (typeof MyOrders !== 'undefined') {
                var mine = (orderIdRewardEl && orderIdRewardEl.value && MyOrders.find(orderIdRewardEl.value)) || MyOrders.latestDone() || MyOrders.latest();
                if (mine) {
                    if (phoneRewardEl && !phoneRewardEl.value && mine.telepon) phoneRewardEl.value = mine.telepon;
                    if (mine.selesai && orderIdRewardEl && !orderIdRewardEl.value) {
                        orderIdRewardEl.value = mine.id;
                        var ro2 = document.getElementById('rewardOrder'); document.getElementById('rewardOrderText').textContent = mine.id; ro2.hidden = false;
                        document.getElementById('rewardOrderClear').addEventListener('click', function () { orderIdRewardEl.value = ''; ro2.hidden = true; });
                    }
                    if (!q.get('nama') && mine.nama && !namaEl.value) namaEl.value = mine.nama;
                }
            }
            var nm = (q.get('nama') || '').trim().slice(0, 60);
            if (nm && !namaEl.value) namaEl.value = nm;
        } catch (e) { /* abaikan: form tetap bisa diisi manual */ }
    })();

    namaEl.addEventListener('input', function () {
        namaEl.classList.remove('is-invalid');
        namaError.textContent = '';
    });

    function rp(n) { return 'Rp' + Number(n).toLocaleString('id-ID'); }
    function tglIndo(iso) {
        var d = new Date(String(iso) + 'T00:00:00');
        return isNaN(d) ? String(iso) : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    function voucherImage(v) {
        var c = document.createElement('canvas'); c.width = 900; c.height = 480;
        var g = c.getContext('2d');
        g.fillStyle = '#f6eee0'; g.fillRect(0, 0, 900, 480);
        g.fillStyle = '#fff'; g.fillRect(30, 30, 840, 420);
        g.setLineDash([14, 10]); g.strokeStyle = '#1b6b3a'; g.lineWidth = 4; g.strokeRect(30, 30, 840, 420); g.setLineDash([]);
        g.textAlign = 'center'; g.fillStyle = '#0a3d38';
        g.font = '700 34px sans-serif'; g.fillText('Margaluyu Farm', 450, 100);
        g.fillStyle = '#52645a'; g.font = '24px sans-serif'; g.fillText('VOUCHER APRESIASI ULASAN', 450, 145);
        g.fillStyle = '#0a3d38'; g.font = '800 64px monospace'; g.fillText(v.kode, 450, 255);
        g.fillStyle = '#1b6b3a'; g.font = '700 40px sans-serif'; g.fillText('Potongan ' + rp(v.nilai), 450, 320);
        g.fillStyle = '#3b4a42'; g.font = '24px sans-serif';
        g.fillText('Minimal belanja ' + rp(v.min_belanja) + ' \u2022 Berlaku sampai ' + tglIndo(v.berlaku_sampai), 450, 372);
        g.font = '20px sans-serif'; g.fillStyle = '#6b776f';
        g.fillText('Berlaku satu kali, hanya untuk nomor WhatsApp pemilik voucher.', 450, 418);
        return c.toDataURL('image/png');
    }
    function showVoucher(v, telepon) {
        var t = document.getElementById('voucherTicket'); if (!t) return;
        document.getElementById('vtCode').textContent = v.kode;
        document.getElementById('vtMeta').textContent = 'Potongan ' + rp(v.nilai) + ' \u2022 minimal belanja ' + rp(v.min_belanja) + ' \u2022 berlaku sampai ' + tglIndo(v.berlaku_sampai);
        document.getElementById('vtUse').href = 'order-sekarang.html?voucher=' + encodeURIComponent(v.kode);
        var wa = String(telepon || '').replace(/[^0-9]/g, '').replace(/^0/, '62');
        var pesan = 'Voucher Margaluyu Farm: ' + v.kode + '\nPotongan ' + rp(v.nilai) + ', min. belanja ' + rp(v.min_belanja) + ', berlaku sampai ' + tglIndo(v.berlaku_sampai) + '.\nPakai di: ' + location.origin + '/order-sekarang.html?voucher=' + encodeURIComponent(v.kode);
        document.getElementById('vtWa').href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(pesan);
        var copyBtn = document.getElementById('vtCopy');
        copyBtn.onclick = function () {
            var done = function () { copyBtn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Tersalin'; };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v.kode).then(done, function () {});
            else { var r = document.createRange(); r.selectNodeContents(document.getElementById('vtCode')); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); try { document.execCommand('copy'); done(); } catch (e) {} }
        };
        document.getElementById('vtImage').onclick = function () {
            var a = document.createElement('a'); a.href = voucherImage(v); a.download = 'voucher-' + v.kode + '.png';
            document.body.appendChild(a); a.click(); a.remove();
        };
        try { localStorage.setItem('mf_voucher', JSON.stringify({ kode: v.kode, nilai: v.nilai, min_belanja: v.min_belanja, berlaku_sampai: v.berlaku_sampai })); } catch (e) { /* penyimpanan browser dinonaktifkan */ }
        t.hidden = false;
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (busy) return;
        clearMsg();
        if (successCard) successCard.hidden = true;

        var anon = !!(anonEl && anonEl.checked);
        var nama = namaEl.value.trim();
        var rating = selectedRating();
        var komentar = komentarEl.value.trim();
        var kritikSaran = kritikSaranEl.value.trim();
        if (fotoEl.files && fotoEl.files.length && !fotoData) {
            showMsg('error', 'Foto belum siap. Silakan pilih foto kembali atau hapus foto tersebut.');
            return;
        }

        if (!nama) {
            namaEl.classList.add('is-invalid');
            namaError.textContent = 'Mohon isi nama Anda.';
            namaEl.focus();
            return;
        }
        if (!rating && !komentar && !kritikSaran) {
            showMsg('error', 'Mohon isi minimal salah satu: rating, ulasan, atau kritik & saran.');
            return;
        }

        setBusy(true);

        // Gabungkan semua masukan menjadi satu komentar (format sama seperti sebelumnya)
        var bagian = [];
        if (komentar) bagian.push(komentar);
        if (kritikSaran) bagian.push('Kritik & Saran: ' + kritikSaran);

        var dataBaru = {
            nama: nama,
            rating: rating,
            komentar: bagian.length ? bagian.join(' | ') : '(Tidak ada catatan tambahan)',
            tanggal: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
            foto: fotoData || '',
            anonim: anon,
            orderId: orderIdRewardEl ? orderIdRewardEl.value.trim().toUpperCase() : '',
            telepon: phoneRewardEl ? phoneRewardEl.value.trim() : ''
        };

        // Jika Cloudinary dikonfigurasi, foto diunggah ke sana dan hanya alamatnya yang disimpan.
        // Jika gagal, form TIDAK dikosongkan sehingga isian tidak hilang.
        try {
            if (mediaOn && fotoData) {
                var f = await TestimoniMedia.upload(fotoData, 'image');
                dataBaru.foto = f.url;
            }
        } catch (e) {
            setBusy(false);
            showMsg('error', (e && e.message ? e.message : 'Unggahan foto gagal.') + ' Isian Anda masih tersimpan di formulir; silakan coba lagi atau hapus foto lalu kirim.');
            return;
        }

        var result;
        try {
            result = await TestimoniStore.add(dataBaru);
        } catch (e) {
            console.error('Gagal menyimpan masukan:', e);
            setBusy(false);
            showMsg('error', 'Masukan belum berhasil dikirim. Silakan coba lagi.');
            return;
        }

        // Berhasil tersimpan di server bersama (terlihat oleh semua pengunjung) -> kartu sukses.
        // Jika tidak: jujur ke pengguna bahwa baru tersimpan di perangkat ini, dan akan dikirim ulang otomatis.
        form.reset();
        syncAnon();
        clearPhoto();
        hint.textContent = 'Ketuk bintang untuk memberi nilai';
        setBusy(false);

        var rewardOrderBox = document.getElementById('rewardOrder'); if (rewardOrderBox) rewardOrderBox.hidden = true;
        var ticket = document.getElementById('voucherTicket');
        if (ticket) ticket.hidden = true;
        if (voucherRewardText) {
            if (result && result.voucher && result.voucher.kode) {
                voucherRewardText.textContent = 'Voucher apresiasi sudah terbit. Simpan kodenya sekarang:';
                showVoucher(result.voucher, dataBaru.telepon);
            } else if (dataBaru.orderId || dataBaru.telepon) voucherRewardText.textContent = (result && result.voucherInfo) || 'Ulasan diterima. Voucher hanya dapat diberikan untuk pesanan yang sudah selesai dan nomor WhatsApp yang cocok.';
            else voucherRewardText.textContent = '';
        }
        if (result && !result.online && TestimoniStore.isConfigured()) {
            showMsg('warn', 'Masukan Anda sudah kami simpan di perangkat ini, tetapi BELUM terkirim ke server sehingga belum tampil untuk umum. ' +
                'Jangan hapus data browser; kami akan mencoba mengirim ulang otomatis saat Anda membuka halaman Rating atau beranda lagi dengan koneksi yang baik.');
            if (result.error) console.warn('Detail kegagalan sinkronisasi testimoni:', result.error);
            msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (result && result.moderasi) {
            showMsg('warn', 'Terima kasih! Ulasan Anda sudah kami terima dan akan tampil di halaman Testimoni setelah kami periksa.');
        }
        if (result && result.fotoDibuang) {
            showMsg('warn', 'Ulasan Anda sudah terkirim dan tampil di beranda, tetapi fotonya tidak muat di penyimpanan gratis sehingga tidak ikut tampil.');
        }
        if (successCard) {
            successCard.hidden = false;
            successCard.classList.remove('is-visible');
            void successCard.offsetWidth;
            successCard.classList.add('is-visible');
            successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            showMsg('success', 'Terima kasih! Rating dan masukan Anda berhasil diberikan.');
        }
        if (!successCard) msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
})();
