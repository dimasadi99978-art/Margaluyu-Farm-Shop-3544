// Perilaku menu hamburger: tutup saat memilih menu, klik di luar, atau menekan Escape.
// Posisi panel diatur oleh CSS (menempel pada header), jadi tidak perlu hitungan JS.
(function () {
    function init() {
        var toggle = document.getElementById('nav-toggle');
        var header = document.querySelector('header');
        if (!toggle || !header) return;

        function sync() { toggle.setAttribute('aria-expanded', toggle.checked ? 'true' : 'false'); }
        function close() { if (toggle.checked) { toggle.checked = false; sync(); } }

        toggle.addEventListener('change', sync);
        sync();

        header.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('.menu-panel a')) close();
        });
        document.addEventListener('click', function (e) {
            if (toggle.checked && !header.contains(e.target)) close();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && toggle.checked) {
                close();
                var label = header.querySelector('.nav-toggle-label');
                if (label && label.focus) label.focus();
            }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
