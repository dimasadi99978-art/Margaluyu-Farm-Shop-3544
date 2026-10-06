// Media Library: filter kategori + lightbox (Esc / klik latar / panah untuk berpindah).
(function () {
    'use strict';

    var grid = document.getElementById('galleryGrid');
    if (!grid) return;
    var items = Array.prototype.slice.call(grid.querySelectorAll('.media-item'));
    var buttons = document.querySelectorAll('.filter-btn');
    var emptyMsg = document.getElementById('galleryEmpty');

    var box = document.getElementById('lightbox');
    var img = document.getElementById('lbImg');
    var video = document.getElementById('lbVideo');
    var caption = document.getElementById('lbCaption');
    var current = -1;
    var lastFocus = null;

    function visibleItems() { return items.filter(function (i) { return !i.hidden; }); }

    // ---------- Filter ----------
    buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var filter = btn.getAttribute('data-filter');
            buttons.forEach(function (b) { b.classList.remove('active'); b.removeAttribute('aria-pressed'); });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            items.forEach(function (item) {
                item.hidden = !(filter === 'all' || item.getAttribute('data-category') === filter);
            });
            emptyMsg.hidden = visibleItems().length > 0;
        });
    });

    // ---------- Lightbox ----------
    function show(item) {
        var vid = item.querySelector('video');
        var pic = item.querySelector('img');
        var title = item.querySelector('figcaption h4');
        var desc = item.querySelector('figcaption p');

        video.pause();
        if (vid) {
            var src = vid.currentSrc || vid.getAttribute('src') || (vid.querySelector('source') && vid.querySelector('source').src) || '';
            video.src = src;
            video.hidden = false;
            img.hidden = true;
            img.removeAttribute('src');
        } else if (pic) {
            img.src = pic.currentSrc || pic.src;
            img.alt = pic.alt || '';
            img.hidden = false;
            video.hidden = true;
            video.removeAttribute('src');
        }
        caption.textContent = '';
        if (title) { var s = document.createElement('strong'); s.textContent = title.textContent; caption.appendChild(s); }
        if (desc) caption.appendChild(document.createTextNode(desc.textContent));
    }

    function open(item) {
        lastFocus = document.activeElement;
        current = visibleItems().indexOf(item);
        show(item);
        updateNav();
        if (typeof box.showModal === 'function') box.showModal(); else box.setAttribute('open', '');
        document.getElementById('lbClose').focus();
    }

    function updateNav() {
        var many = visibleItems().length > 1;
        document.getElementById('lbPrev').hidden = !many;
        document.getElementById('lbNext').hidden = !many;
    }

    function step(dir) {
        var list = visibleItems();
        if (list.length < 2) return;
        current = (current + dir + list.length) % list.length;
        show(list[current]);
    }

    function close() {
        video.pause();
        if (typeof box.close === 'function') box.close(); else box.removeAttribute('open');
    }

    box.addEventListener('close', function () {
        video.pause();
        video.removeAttribute('src');
        img.removeAttribute('src');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    });

    grid.addEventListener('click', function (e) {
        var thumb = e.target.closest ? e.target.closest('.media-thumb') : null;
        if (!thumb) return;
        open(thumb.closest('.media-item'));
    });
    document.getElementById('lbClose').addEventListener('click', close);
    document.getElementById('lbPrev').addEventListener('click', function () { step(-1); });
    document.getElementById('lbNext').addEventListener('click', function () { step(1); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.id === 'lbStage') close(); });
    box.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
    });
})();
