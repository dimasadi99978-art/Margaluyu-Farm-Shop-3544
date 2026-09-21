# Margaluyu Farm

## Penyimpanan pesanan
- Data pesanan disimpan di JSONBin.
- Pesanan dengan status **Selesai** akan dihapus otomatis setelah **90 hari** sejak `updatedAt` terakhir.
- Testimoni disimpan di Bin terpisah dan **tidak ikut dihapus**.
- Vercel Cron menjalankan pembersihan setiap hari.

## Pengaturan Vercel
Tambahkan Environment Variables berikut di Vercel Production:
- `ORDERS_MASTER_KEY` = Master Key JSONBin untuk Bin Pesanan
- `ORDERS_BIN_ID` = ID Bin Pesanan
- `CRON_SECRET` = string rahasia acak minimal 16 karakter

Cron: `/api/cleanup-orders`
Jadwal: setiap hari 17:00 UTC (00:00 WIB).

Catatan: Vercel Hobby menjalankan Cron maksimal sekali per hari dan waktu eksekusinya dapat bergeser dalam jam yang ditentukan. Cron hanya aktif pada Production deployment.


## Perbaikan penyimpanan pesanan
Halaman Order, Lacak Pesanan, dan Admin sekarang memakai `/api/orders`.
Master Key JSONBin tidak lagi diletakkan di JavaScript frontend.

Di Vercel Production, pastikan Environment Variables berikut tersedia:
- `ORDERS_MASTER_KEY`
- `ORDERS_BIN_ID`
- `CRON_SECRET`

Karena versi sebelumnya pernah memuat Master Key di `orders-config.js`, Master Key lama sebaiknya segera di-rotate/revoke di JSONBin lalu ganti nilai `ORDERS_MASTER_KEY` di Vercel.

## Jika muncul "Failed to fetch"
Jangan tes dengan membuka file HTML langsung (alamat `file:///...`). File HTML tidak mempunyai server Vercel sehingga `/api/orders` tidak dapat berjalan.

Setelah project di-deploy ke Vercel, buka `https://DOMAIN-ANDA/cek-pesanan-server.html` lalu tekan **Tes Koneksi**.
- Jika HTTP 200: API dan Environment Variables sudah terbaca.
- Jika HTTP 500: periksa `ORDERS_MASTER_KEY` dan `ORDERS_BIN_ID`, lalu Redeploy Production.
- Jika 404: pastikan folder `api` ikut berada di root repository dan file `api/orders.js` ikut ter-upload.
