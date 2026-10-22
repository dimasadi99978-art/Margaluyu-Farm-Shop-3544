// Service worker minimal agar situs bisa dipasang di HP (PWA). Sengaja TIDAK menyimpan cache halaman,
// sehingga stok, harga, dan status pesanan selalu terbaru dan pembaruan situs langsung terlihat.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* biarkan jaringan menangani semua permintaan */ });
