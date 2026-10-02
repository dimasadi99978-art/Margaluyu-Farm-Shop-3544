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
    var MAX_PHOTO_BYTES = 120 * 1024;

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
                    var maxSide = 1000;
                    var scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
                    var canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
                    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    var quality = 0.78;
                    var dataUrl = canvas.toDataURL('image/jpeg', quality);
                    // Turunkan kualitas bertahap agar data tetap ringan untuk penyimpanan bersama.
                    while (dataUrl.length * 0.75 > MAX_PHOTO_BYTES && quality > 0.45) {
                        quality -= 0.08;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }
                    if (dataUrl.length * 0.75 > MAX_PHOTO_BYTES) {
                        reject(new Error('Ukuran foto masih terlalu besar. Pilih foto yang lebih kecil.'));
                        return;
                    }
                    resolve(dataUrl);
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
            var nm = (q.get('nama') || '').trim().slice(0, 60);
            if (nm && !namaEl.value) namaEl.value = nm;
        } catch (e) { /* abaikan: form tetap bisa diisi manual */ }
    })();

    namaEl.addEventListener('input', function () {
        namaEl.classList.remove('is-invalid');
        namaError.textContent = '';
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (busy) return;
        clearMsg();
        if (successCard) successCard.hidden = true;

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
            foto: fotoData || ''
        };

        var result;
        try {
            result = await TestimoniStore.add(dataBaru);
        } catch (e) {
            console.error('Gagal menyimpan masukan:', e);
            setBusy(false);
            showMsg('error', 'Masukan belum berhasil dikirim. Silakan coba lagi.');
            return;
        }

        // Notifikasi email ke admin. Sengaja tidak menunggu (fire-and-forget) dan tidak pernah
        // menggagalkan alur ini - masukan pelanggan sudah aman tersimpan di atas, terlepas dari
        // email ini berhasil terkirim atau tidak (misalnya karena belum online / belum dikonfigurasi).
        try {
            fetch('/api/notify-testimoni', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataBaru)
            }).catch(function () { /* diamkan - notifikasi bersifat best-effort */ });
        } catch (e) { /* fetch tidak tersedia / halaman dibuka dari file lokal - abaikan */ }

        form.reset();
        clearPhoto();
        hint.textContent = 'Ketuk bintang untuk memberi nilai';

        setBusy(false);

        // Selalu tampilkan kartu konfirmasi setelah data berhasil disimpan.
        // Jika server bersama sedang tidak tersedia, data tetap tersimpan di
        // perangkat ini dan tetap dapat ditampilkan di halaman Testimoni.
        if (successCard) {
            successCard.hidden = false;
            successCard.classList.remove('is-visible');
            void successCard.offsetWidth;
            successCard.classList.add('is-visible');
            successCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            showMsg('success', 'Terima kasih! Rating dan masukan Anda berhasil diberikan.');
        }
        if (result && !result.online && result.error) {
            console.warn('Detail kegagalan sinkronisasi testimoni:', result.error);
        }
        if (!successCard) msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
})();
