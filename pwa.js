// Mendaftarkan service worker (agar bisa "Tambahkan ke layar utama").
if ('serviceWorker' in navigator && location.protocol === 'https:' && !/admin-/.test(location.pathname)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () { /* abaikan */ }); });
}
