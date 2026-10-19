// Konfigurasi pesanan.
// Penyimpanan pesanan sekarang melewati /api/orders sehingga Master Key
// JSONBin tidak lagi dikirim ke browser.
//
// ORDERS_MASTER_KEY dan ORDERS_BIN_ID WAJIB disimpan sebagai Environment Variables
// di Vercel Production. Jangan menaruh Master Key di file frontend.
const ORDERS_API_URL = '/api/orders';

// Kata sandi admin untuk login halaman admin-pesanan.
const ADMIN_PASSWORD = "354005";
