// Beranda: bilah progres baca, navigasi antarbagian (scrollspy), dan bar pesan di HP.
(function () {
    var doc = document;
    var header = doc.querySelector('header.site-top');
    var subnav = doc.getElementById('lpSubnav');
    var progress = doc.getElementById('lpProgress');
    var hero = doc.querySelector('.lp-hero');
    var ticking = false;

    function headerH() { return header ? Math.round(header.getBoundingClientRect().height) : 73; }

    function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
            ticking = false;
            var max = doc.documentElement.scrollHeight - window.innerHeight;
            if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
            if (subnav && hero) {
                var past = hero.getBoundingClientRect().bottom < headerH();
                subnav.classList.toggle('is-on', past);
                subnav.setAttribute('aria-hidden', past ? 'false' : 'true');
                subnav.style.top = headerH() + 'px';
            }
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    // Scrollspy: tandai bagian yang sedang dibaca.
    if (subnav && 'IntersectionObserver' in window) {
        var links = Array.prototype.slice.call(subnav.querySelectorAll('a[href^="#"]'));
        var map = {};
        links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                links.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
                var a = map[e.target.id];
                if (a) {
                    a.classList.add('is-active');
                    a.setAttribute('aria-current', 'true');
                    // Pada HP, geser daftar agar tautan aktif selalu terlihat.
                    var box = subnav.querySelector('.container');
                    if (box && box.scrollWidth > box.clientWidth) {
                        box.scrollTo({ left: a.offsetLeft - 24, behavior: 'smooth' });
                    }
                }
            });
        }, { rootMargin: '-35% 0px -60% 0px' });
        Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) spy.observe(s); });
    }
})();
