// Menyesuaikan label stok di beranda & halaman produk dengan stok sebenarnya dari server.
(function () {
    var els = document.querySelectorAll('.lp-badge-s, .pdx-stock');
    if (!els.length || location.protocol === 'file:') return;
    fetch('/api/config', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
        var p = j && j.products && j.products[0];
        if (!p) return;
        var text = !p.tersedia ? 'Stok habis' : (p.sisa ? 'Stok tinggal ' + p.sisa + ' botol' : 'Stok tersedia');
        els.forEach(function (el) {
            var n = el.lastChild;
            if (n && n.nodeType === 3) n.textContent = ' ' + text; else el.appendChild(document.createTextNode(' ' + text));
            if (!p.tersedia) el.style.opacity = '.75';
        });
    }).catch(function () { /* biarkan teks bawaan */ });
})();
