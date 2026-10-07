# Margaluyu Farm

## Penyimpanan pesanan
- Data pesanan disimpan di JSONBin.
- Pesanan **tidak lagi dihapus otomatis** (cron dinonaktifkan di `vercel.json`) supaya grafik analitik tetap lengkap. Hapus manual lewat Admin Pesanan: centang pesanan berstatus **Selesai** lalu **Hapus terpilih**. Analitik (jumlah & pendapatan) langsung menyesuaikan.
- Foto bukti pembayaran otomatis dibuang saat pesanan ditandai **Selesai** (hemat tempat).
- Hapus pesanan/testimoni **wajib** `ORDERS_ADMIN_KEY` terisi di Vercel.
- Hapus testimoni butuh tambahan `TESTIMONI_MASTER_KEY` dan `TESTIMONI_BIN_ID` (nilainya sama dengan di `testimoni-config.js`). Tombol Hapus muncul di halaman Testimoni setelah login admin di Admin Pesanan/Analitik pada browser yang sama.
- Untuk mengaktifkan lagi pembersihan otomatis 6 bulan, tambahkan kembali blok `crons` (`/api/cleanup-orders`, `0 17 * * *`) di `vercel.json`.

## Pengaturan Vercel
Tambahkan Environment Variables berikut di Vercel Production:
- `ORDERS_MASTER_KEY` = Master Key JSONBin untuk Bin Pesanan
- `ORDERS_BIN_ID` = ID Bin Pesanan
- `CRON_SECRET` = string rahasia acak minimal 16 karakter
- `ORDERS_ADMIN_KEY` = kata sandi admin yang wajib disimpan sebagai Environment Variable Vercel. Daftar pesanan lengkap dan perubahan status/hapus pesanan hanya dapat dilakukan melalui server dengan kunci ini. Jangan mengandalkan `ADMIN_PASSWORD` di frontend sebagai satu-satunya pengaman.

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
- `ORDERS_ADMIN_KEY` (wajib untuk akses admin)

Karena versi sebelumnya pernah memuat Master Key di `orders-config.js`, Master Key lama sebaiknya segera di-rotate/revoke di JSONBin lalu ganti nilai `ORDERS_MASTER_KEY` di Vercel.

## Jika muncul "Failed to fetch" atau "belum bisa terhubung ke server"
Ini **wajar** dan bukan tanda ada yang rusak, selama munculnya pada salah satu dari dua kondisi berikut:
1. Anda menguji dengan membuka file HTML langsung dari komputer (alamatnya diawali `file:///...`), atau
2. Situs belum selesai dipublikasikan / baru saja di-deploy.

File HTML yang dibuka langsung (`file://`) tidak mempunyai server Vercel, sehingga `/api/orders` tidak dapat berjalan sama sekali — ini normal dan akan hilang begitu situs sudah online.

Setelah project di-deploy ke Vercel, buka `https://DOMAIN-ANDA/cek-pesanan-server.html` lalu tekan **Tes Koneksi** (atau gunakan `cek-koneksi.html` untuk pengujian yang lebih lengkap, termasuk testimoni).
- Jika HTTP 200: API dan Environment Variables sudah terbaca.
- Jika HTTP 500: periksa `ORDERS_MASTER_KEY` dan `ORDERS_BIN_ID`, lalu Redeploy Production.
- Jika 404: pastikan folder `api` ikut berada di root repository dan file `api/orders.js` ikut ter-upload.


## Notifikasi email (pesanan baru & rating/kritik/saran baru)
Tambahkan di Vercel > Settings > Environment Variables (Production), **jangan pernah menulis key di file kode**:
- `RESEND_API_KEY` = API key dari dashboard Resend
- `NOTIFY_EMAIL` = email tujuan notifikasi (mis. margaluyufarm354@gmail.com)
- `RESEND_FROM` (opsional) = pengirim, mis. `Margaluyu Farm <pesanan@domainanda.com>` (hanya setelah domain diverifikasi di Resend)

Setelah menambah/mengubah variabel, **wajib Redeploy** agar terbaca.

**Cara menguji:** buka `https://DOMAIN-ANDA/api/test-email?secret=ISI_CRON_SECRET` (nilai `CRON_SECRET` di Vercel). Hasilnya menampilkan terkirim atau pesan error dari Resend.

**Catatan penting Resend:** selama domain sendiri belum diverifikasi di Resend, email hanya bisa dikirim ke **alamat email yang dipakai mendaftar akun Resend**. Jika `NOTIFY_EMAIL` berbeda dari email akun Resend, kirim akan ditolak (lihat `hasil.detail` di halaman tes). Solusi: daftar Resend dengan email yang sama dengan `NOTIFY_EMAIL`, atau verifikasi domain di Resend.
Cek juga folder Spam/Promosi di Gmail.

## Urutan pengecekan jika Analitik kosong / email tidak masuk
1. Buka website lewat alamat online (https://....vercel.app), **bukan** file di komputer (file://). Fungsi `/api/*` dan email hanya jalan di server Vercel.
2. Buka `/cek-pesanan-server.html` -> Tes Koneksi. Harus "Server terhubung". Jika error 500: isi `ORDERS_MASTER_KEY` & `ORDERS_BIN_ID` di Vercel lalu Redeploy.
3. Buat 1 pesanan uji. Halaman konfirmasi tidak boleh menampilkan peringatan "belum berhasil terkirim".
4. Buka Admin Pesanan: pesanan harus tampil. Lalu Admin Analitik > Muat Ulang Data. Jika masih kosong, kotak merah di atas halaman akan menyebutkan penyebabnya.
5. Email: buka `/api/test-email?secret=NILAI_CRON_SECRET` dan baca hasilnya (lihat bagian Notifikasi email di atas).

## Diagnosis cepat (baru)
Buka `https://DOMAIN-ANDA/api/health` (atau `/cek-pesanan-server.html`). Hasilnya menyebut variabel Vercel mana yang belum terbaca, apakah JSONBin bisa diakses, berapa persen ruang penyimpanan terpakai, dan apakah email sudah dikonfigurasi. Struktur deploy yang benar: folder `api/`, `lib/`, `index.html` berada langsung di root repository (bukan di dalam subfolder).

## Jika muncul "Konfigurasi server belum lengkap"
Pesanan disimpan lewat server Vercel, jadi kunci JSONBin TIDAK dibaca dari `orders-config.js` (itu cara versi lama). Isi di Vercel > Settings > Environment Variables (Production): `ORDERS_MASTER_KEY` dan `ORDERS_BIN_ID`. Bin pesanan dibuat lewat `setup-testimoni.html` (Langkah 3), lalu **Redeploy**. Untuk email pesanan masuk tambahkan `RESEND_API_KEY` dan `NOTIFY_EMAIL`. Verifikasi di `/api/health`.

## Update: Bin ID pesanan otomatis
`ORDERS_BIN_ID` kini opsional. Server (`lib/bin.js`) memakai ORDERS_BIN_ID bila valid; jika tidak, mencari bin bernama "Margaluyu Farm - Pesanan" di akun JSONBin yang sama dengan Master Key; jika belum ada, membuatnya. Yang wajib hanya `ORDERS_MASTER_KEY`. Halaman Admin Pesanan membaca daftar lewat `/api/orders` yang sama, jadi otomatis memakai bin yang sama.
