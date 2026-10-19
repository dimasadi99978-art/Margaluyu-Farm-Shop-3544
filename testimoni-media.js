// ============================================================
// TESTIMONI MEDIA
// OPSIONAL: unggah foto ulasan ke Cloudinary lewat "unsigned upload", lalu hanya menyimpan
// ALAMAT (URL)-nya di data testimoni, sehingga data di JSONBin tetap kecil.
// Konfigurasi ada di testimoni-config.js (MEDIA_CLOUD_NAME, MEDIA_UPLOAD_PRESET).
// ============================================================
const TestimoniMedia = (function () {
    'use strict';

    function clean(v) { return String(v == null ? '' : v).trim(); }
    function cloud() { return typeof MEDIA_CLOUD_NAME === 'string' ? clean(MEDIA_CLOUD_NAME) : ''; }
    function preset() { return typeof MEDIA_UPLOAD_PRESET === 'string' ? clean(MEDIA_UPLOAD_PRESET) : ''; }
    function isConfigured() { return cloud() !== '' && preset() !== ''; }

    // Hanya URL Cloudinary milik akun kita yang boleh ditampilkan (melindungi dari URL sembarangan).
    function isSafeUrl(url) {
        var c = cloud();
        if (!c || typeof url !== 'string' || url.length > 600) return false;
        var re = new RegExp('^https://res\\.cloudinary\\.com/' + c.replace(/[^A-Za-z0-9_-]/g, '') +
            '/image/upload/[A-Za-z0-9_\\-/.%,]+$');
        return re.test(url);
    }

    function swapExt(url, ext) {
        var i = url.lastIndexOf('.');
        var slash = url.lastIndexOf('/');
        return (i > slash ? url.slice(0, i) : url) + '.' + ext;
    }

    // Unggah ke Cloudinary. source: File atau data URL (gambar).
    // onProgress(persen 0-100). Mengembalikan { url, duration, bytes }.
    function upload(source, kind, onProgress) {
        return new Promise(function (resolve, reject) {
            if (!isConfigured()) { reject(new Error('Penyimpanan media belum dikonfigurasi.')); return; }
            var type = 'image';
            var form = new FormData();
            form.append('file', source);
            form.append('upload_preset', preset());
            var xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(cloud()) + '/' + type + '/upload');
            xhr.timeout = 15 * 60 * 1000;
            if (xhr.upload && onProgress) {
                xhr.upload.onprogress = function (e) {
                    if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
                };
            }
            xhr.onerror = function () { reject(new Error('Koneksi terputus saat mengunggah. Periksa sinyal internet lalu coba lagi.')); };
            xhr.ontimeout = function () { reject(new Error('Unggahan terlalu lama. Coba lagi dengan koneksi yang lebih baik.')); };
            xhr.onload = function () {
                var json = {};
                try { json = JSON.parse(xhr.responseText || '{}'); } catch (_) {}
                if (xhr.status < 200 || xhr.status >= 300) {
                    var m = json && json.error && json.error.message ? json.error.message : ('HTTP ' + xhr.status);
                    reject(new Error('Gagal mengunggah ' + 'foto' + ': ' + m));
                    return;
                }
                var url = json.secure_url;
                if (!isSafeUrl(url, type)) { reject(new Error('Alamat hasil unggahan tidak dikenali.')); return; }
                resolve({ url: url, duration: Number(json.duration) || 0, bytes: Number(json.bytes) || 0 });
            };
            xhr.send(form);
        });
    }

    return { isConfigured: isConfigured, isSafeUrl: isSafeUrl, upload: upload };
})();
