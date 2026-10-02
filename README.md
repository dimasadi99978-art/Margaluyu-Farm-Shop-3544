
### Perilaku saat server gagal
Pada versi revisi ini, website tidak lagi menampilkan nomor pesanan seolah-olah sudah diterima jika server online gagal menyimpan data. Pengiriman dicoba hingga 3 kali. Jika semuanya gagal, pelanggan diminta mencoba lagi dan pesanan tidak dianggap masuk ke sistem admin.


## Penting saat upload ke Vercel
Struktur project yang benar harus langsung seperti ini di **Root Directory** Vercel:
- `index.html`
- `api/orders.js`
- `api/health.js`
- `lib/email.js`
- `orders-store.js`
- dan file website lainnya.

Jangan sampai hasil upload menjadi `mf_spssfix/api/orders.js` sementara Root Directory Vercel berada satu tingkat di atas folder `mf_spssfix`. Jika memakai ZIP, buka/extract ZIP lalu pilih **folder `mf_spssfix` sebagai project**, atau upload isi folder tersebut sebagai root project.

Untuk memeriksa server, buka `/cek-pesanan-server.html` setelah deploy. Tes koneksi sekarang memakai `/api/health`, sehingga tidak lagi salah dianggap gagal hanya karena endpoint pesanan meminta nomor HP.

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
- `ORDERS_ADMIN_KEY` (opsional) = kata sandi tambahan agar daftar pesanan lengkap dan perubahan status di `/api/orders` hanya bisa diakses lewat halaman Admin. Jika dikosongkan, halaman Admin tetap terkunci lewat kata sandi lama (`ADMIN_PASSWORD` di `orders-config.js`), hanya saja proteksinya ada di sisi tampilan, bukan di server.

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
- `ORDERS_ADMIN_KEY` (opsional, lihat di atas)

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

## Diagnosis deployment V2
- `/api/ping` hanya mengecek apakah fungsi API Vercel benar-benar ter-deploy.
- `/api/health` mengecek Environment Variables dan koneksi JSONBin tanpa menampilkan secret.
- Jika `/api/ping` gagal: masalah deployment/routing Vercel, bukan JSONBin.
- Jika `/api/ping` berhasil tetapi `/api/health` menunjukkan `configured:false`: isi Environment Variables Production lalu Redeploy.
- Jika `configured:true` tetapi `connected:false`: nilai Master Key/Bin ID atau akses JSONBin bermasalah.
- Jika `orders.connected:true` tetapi `email.configured:false`: pesanan tetap tersimpan, tetapi email belum dikonfigurasi.
