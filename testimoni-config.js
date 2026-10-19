// ============================================================
// KONFIGURASI PENYIMPANAN TESTIMONI BERSAMA
// ============================================================
// Selama dua nilai di bawah ini masih kosong ("") , testimoni
// HANYA tersimpan di browser masing-masing pengunjung (mode lokal).
// Isi keduanya agar semua pengunjung bisa melihat testimoni yang sama.
//
// CARA MENGISI (gratis, sekali setup, ±5 menit):
// 1. Buka https://jsonbin.io lalu daftar akun gratis (bisa pakai email atau Google).
// 2. Setelah login, buka menu "API Keys" lalu salin "X-Master-Key".
//    Tempel di TESTIMONI_MASTER_KEY di bawah ini.
// 3. Buka file "setup-testimoni.html" (sudah disediakan satu paket dengan web ini)
//    di browser, tempel Master Key tadi, lalu klik tombol "Buat Penyimpanan Baru".
// 4. Salin "Bin ID" yang muncul, tempel di TESTIMONI_BIN_ID di bawah ini.
// 5. Simpan file ini, lalu upload ulang seluruh folder web ke hosting Anda.
//
// Setelah itu, isi form Rating dan Kritik & Saran akan otomatis tersimpan
// di server bersama dan bisa dilihat oleh siapa pun yang membuka halaman Testimoni.
// ============================================================

const TESTIMONI_MASTER_KEY = "$2a$10$X0ip421qot.S.LRG6NImjOPINvtIZDClGj92HMwchCB8MnXfR60Ge";
const TESTIMONI_BIN_ID = "6aa785bdffd5d1605303a7ef";

// ============================================================
// PENYIMPANAN FOTO (Cloudinary, gratis) - OPSIONAL
// ============================================================
// JSONBin gratis hanya muat sekitar 100KB per bin, sehingga foto ulasan cepat membuatnya penuh.
// Jika dua nilai ini diisi, foto ulasan disimpan di Cloudinary dan JSONBin hanya menyimpan alamatnya.
// Selama kosong (""), foto dikecilkan dan disimpan langsung di JSONBin (jumlahnya terbatas).
//
// CARA MENGISI (sekali saja, ±5 menit):
// 1. Daftar gratis di https://cloudinary.com, lalu buka Dashboard.
//    Salin "Cloud name" dan tempel di MEDIA_CLOUD_NAME.
// 2. Klik ikon gerigi (Settings) > Upload > "Upload presets" > "Add upload preset".
//    - Signing mode : Unsigned   (wajib)
//    - Beri nama, misalnya: margaluyu_testimoni
//    - Klik Save, lalu tempel nama itu di MEDIA_UPLOAD_PRESET.
// 3. Simpan file ini dan upload ulang folder web.
// Nilai ini boleh terlihat publik (bukan kunci rahasia).
const MEDIA_CLOUD_NAME = "";
const MEDIA_UPLOAD_PRESET = "";
