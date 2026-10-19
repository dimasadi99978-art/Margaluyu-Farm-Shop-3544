// ============================================================
// KONFIGURASI TESTIMONI
// Penyimpanan testimoni sekarang lewat /api/testimoni (server).
// TESTIMONI_MASTER_KEY dan TESTIMONI_BIN_ID WAJIB diisi di Vercel > Settings > Environment Variables,
// BUKAN di file ini. (Kunci lama yang pernah ada di file ini harus di-revoke di jsonbin.io.)
// ============================================================

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
