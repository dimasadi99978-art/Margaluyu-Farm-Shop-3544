// Memuat Plausible atau Google Analytics sesuai analytics-config.js. Tidak dimuat di halaman admin.
(function () {
    var c = window.MF_ANALYTICS || {};
    if (/admin-/.test(location.pathname)) return;
    function add(src, attrs) {
        var s = document.createElement('script');
        s.async = true; s.src = src;
        Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
        document.head.appendChild(s);
    }
    if (c.plausibleDomain) {
        add('https://plausible.io/js/script.js', { defer: '', 'data-domain': c.plausibleDomain });
    } else if (/^G-[A-Z0-9]+$/.test(c.gaId || '')) {
        add('https://www.googletagmanager.com/gtag/js?id=' + c.gaId);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', c.gaId, { anonymize_ip: true });
    }
})();
