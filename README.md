# Margaluyu Farm

## Penyimpanan pesanan & testimoni
- Data pesanan disimpan di JSONBin. **Tidak ada penghapusan otomatis**: pesanan (termasuk yang Selesai) dan testimoni hanya terhapus bila admin menghapusnya manual (centang pesanan berstatus **Selesai** lalu **Hapus terpilih**; testimoni lewat tombol **Hapus** di halaman Testimoni setelah login admin). Endpoint pembersihan otomatis (`cleanup-orders`) sudah dihapus.
- Satu-satunya hal yang dibuang otomatis: **foto bukti pembayaran** saat pesanan ditandai Selesai (agar bin JSONBin gratis ~100KB tidak penuh). Datanya (nama, produk, total, status) tetap ada.
- Daftar pesanan di Admin dan fitur hapus **wajib** `ORDERS_ADMIN_KEY` terisi di Vercel (kata sandi yang Anda ketik saat login admin).
- Hapus testimoni butuh tambahan `TESTIMONI_MASTER_KEY` dan `TESTIMONI_BIN_ID` di Vercel (nilainya sama dengan di `testimoni-config.js`).

## Foto testimoni
Fitur video tidak dipakai. Foto ulasan dikecilkan (maks. ±20 KB) dan disimpan langsung di JSONBin, yang gratisnya hanya muat ±100 KB per bin, jadi hanya beberapa foto yang muat. Jika bin penuh, teks ulasan tetap tersimpan tanpa foto. Untuk banyak foto, isi `MEDIA_CLOUD_NAME` dan `MEDIA_UPLOAD_PRESET` di `testimoni-config.js` (Cloudinary gratis, langkahnya tertulis di file itu); foto lalu disimpan di Cloudinary.

## Email pesanan
Tombol "Chat pelanggan di WhatsApp" membuka chat ke nomor yang diisi pelanggan di form (bukan nomor toko). Bila nomor itu sama dengan nomor WhatsApp toko, email memberi peringatan. Nomor toko bisa diubah lewat variabel `OWNER_WHATSAPP`.

## Pengaturan Vercel
- `ORDERS_MASTER_KEY` = Master Key JSONBin (wajib). `ORDERS_BIN_ID` opsional (dicari/dibuat otomatis).
- `ORDERS_ADMIN_KEY` = kata sandi admin (wajib agar Admin bisa membaca pesanan).
- `RESEND_API_KEY`, `NOTIFY_EMAIL` = untuk email notifikasi pesanan & testimoni.

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

## Struktur situs (disederhanakan)
- Menu: **Beranda, Produk, Lacak Pesanan, Hubungi Kami**.
- **Beranda (`index.html`)** kini landing page satu halaman: hero, kenapa Saanen, perbandingan susu (hanya di sini), kenal kambing Saanen, kandungan, cara penyajian, ulasan pelanggan, tentang, ajakan memesan.
- **Hubungi Kami (`contact.html`)** memuat kartu kontak + form **Rating & Saran** (ada opsi **anonim**).
- Halaman lama (`Pengenalan susu saanen`, `Pengenalan Kambing Saanen`, `kandungan & manfaat`, `penyajian`, `rating`) sudah digabung; berkas dengan nama itu kini hanya pengalih otomatis ke bagian yang sesuai (agar tautan lama tidak mati). Aman dihapus bila tidak diperlukan.
- `testimoni.html` tetap ada (tidak di menu) untuk daftar lengkap ulasan dan tempat admin menghapus ulasan.

## Desain (v2)
- `css/ui.css` = gaya bersama semua halaman publik (judul halaman bersih, font Bricolage Grotesque + Inter, tombol, kartu, form order). Ubah di sini agar semua halaman ikut berubah.
- `css/landing.css` = khusus beranda. `css/menu.css` = menu atas.
- `justify.css` tidak lagi dipakai (teks rata kanan-kiri membuat jarak antarkata renggang di HP).
- Beranda: hero, kenapa Saanen, cara pesan, perbandingan (tabel), kambing Saanen, kandungan, penyajian, ulasan, FAQ, tentang, ajakan memesan, plus bar "Pesan sekarang" di HP.

## Animasi & navigasi beranda
- `reveal.js`: animasi muncul saat di-scroll (beri class `rv`; atribut `data-stagger` pada induk agar anak muncul bergantian). Otomatis mati bila peramban memilih "kurangi gerakan" atau tidak mendukung.
- `landing.js`: bilah progres baca di atas layar, navigasi antarbagian (muncul setelah hero, menandai bagian yang sedang dibaca), dan bar "Pesan sekarang" di HP.

## Header & menu
- Desktop: menu terbuka langsung (Beranda, Produk, Lacak Pesanan, Hubungi Kami) + tombol "Pesan sekarang". HP/tablet: tombol hamburger membuka panel penuh dengan latar redup.
- Satu sumber gaya: `css/menu.css`; perilaku: `nav-fix.js`. Logo kecil: `img/logo-mark.png` (potongan siluet dari `logo-mf.png`).
- Bar paling atas (`.topbar`) berisi info ongkir dan nomor telepon; ikon sosial media ada di footer.

## Skala ukuran (ringkas)
Judul hero 30-44 px, judul bagian 24-32 px, teks isi 15-16.5 px, tombol tinggi 44 px, jarak antarbagian 64 px (HP 40 px), header 64 px (HP 56 px). Ubah nilai di `css/landing.css`, `css/menu.css`, dan `css/ui.css`.

## Prinsip tampilan (v4): mengalir, tanpa kotak, tanpa garis
- Tidak ada kartu berbingkai dan tidak ada garis pembatas antarbagian. Pemisah = ruang kosong dan pergantian warna yang memudar (`.lp-sec--tint`, `.page-hero`), bentuk foto organik (lengkung besar).
- Header transparan di atas halaman (bayangan lembut hanya saat di-scroll); footer bersudut atas melengkung dan menyatu dengan bagian penutup di beranda.
- HP: menu berupa panel samping hijau tua. Desktop: menu terbuka + tombol "Pesan sekarang".
- Foto web ringan: `img/*-web.jpg` (aslinya tetap ada).
- File gaya: `css/ui.css` (semua halaman), `css/landing.css` (beranda), `css/menu.css` (header/menu).

## Struktur halaman (final)
- Menu: Beranda, Produk, Lacak Pesanan, Hubungi Kami. Halaman lain: `order sekarang.html` (form 3 langkah), `rating.html` (Tulis Ulasan, juga terhubung dari beranda & halaman Testimoni), `testimoni.html` (semua ulasan + hapus oleh admin), `privasi.html`, `404.html`.
- `contact.html` hanya berisi kontak + formulir pesan yang membuka WhatsApp. Form rating dipisah ke `rating.html`.
- SEO/teknis: `/sitemap.xml` dan `/robots.txt` dibuat otomatis (api/sitemap.js, api/robots.js lewat rewrite di vercel.json), header keamanan di vercel.json, data terstruktur JSON-LD di beranda, favicon.
- Admin Pesanan: tombol **Unduh CSV** untuk cadangan data.
