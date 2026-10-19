// Animasi muncul saat di-scroll (fade + naik pelan). Aman: tanpa JS / IntersectionObserver / mode
// "kurangi gerakan" semua isi langsung terlihat. Pakai: beri class "rv" pada elemen;
// beri atribut data-stagger pada induknya agar anak-anaknya muncul bergantian.
(function () {
    var d = document, root = d.documentElement, io = null, ready = false;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.MFReveal = { add: function (el) { if (el) el.classList.add('rv'); } };
    if (!('IntersectionObserver' in window)) return;

    root.classList.add('js');

    function init() {
        var groups = d.querySelectorAll('[data-stagger]');
        Array.prototype.forEach.call(groups, function (g) {
            var kids = Array.prototype.filter.call(g.children, function (c) { return c.classList.contains('rv'); });
            kids.forEach(function (c, i) { c.style.setProperty('--d', Math.min(i, 6) * 90 + 'ms'); });
        });
        io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                var t = e.target;
                if (e.isIntersecting) { t.classList.add('is-in'); }
                else {
                    // Keluar lewat atas -> nanti masuk lagi dari atas (saat scroll naik); lewat bawah -> dari bawah.
                    t.setAttribute('data-from', e.boundingClientRect.top < 0 ? 'up' : 'down');
                    t.classList.remove('is-in');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
        Array.prototype.forEach.call(d.querySelectorAll('.rv'), function (el) { io.observe(el); });
        window.MFReveal.add = function (el) { if (!el) return; el.classList.add('rv'); io.observe(el); };
        ready = true;
    }
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();

    // Jaring pengaman: bila skrip gagal berjalan, jangan biarkan konten tersembunyi.
    setTimeout(function () {
        if (ready) return;
        Array.prototype.forEach.call(d.querySelectorAll('.rv'), function (el) { el.classList.add('is-in'); });
    }, 4000);
})();
