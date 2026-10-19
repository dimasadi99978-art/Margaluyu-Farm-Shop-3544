// Perilaku header: menu HP (tutup saat pilih tautan / klik latar / Esc), bayangan saat di-scroll.
(function () {
    function init() {
        var toggle = document.getElementById('nav-toggle');
        var header = document.querySelector('header.site-top') || document.querySelector('header');
        if (!header) return;

        function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        if (!toggle) return;
        var root = document.documentElement;
        function sync() {
            toggle.setAttribute('aria-expanded', toggle.checked ? 'true' : 'false');
            root.classList.toggle('menu-open', toggle.checked);
        }
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
        window.addEventListener('resize', function () { if (window.innerWidth >= 900) close(); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
