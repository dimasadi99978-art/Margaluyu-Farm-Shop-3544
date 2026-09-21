// Mengatur posisi vertikal menu dropdown agar selalu presisi tepat di bawah
// header (termasuk bar media sosial di atasnya), berapa pun tingginya di
// halaman yang berbeda-beda atau saat teks header melipat ke baris baru.
(function () {
    function updateHeaderHeight() {
        var header = document.querySelector('header');
        if (!header) return;
        var bottom = header.getBoundingClientRect().bottom;
        document.documentElement.style.setProperty('--header-h', Math.max(bottom, 0) + 'px');
    }

    window.addEventListener('DOMContentLoaded', updateHeaderHeight);
    window.addEventListener('load', updateHeaderHeight);
    window.addEventListener('resize', updateHeaderHeight);
    window.addEventListener('orientationchange', updateHeaderHeight);

    // Elemen web font baru termuat belakangan bisa mengubah tinggi header sedikit;
    // ukur ulang sesaat setelahnya untuk jaga-jaga.
    setTimeout(updateHeaderHeight, 300);
    setTimeout(updateHeaderHeight, 1000);
})();
