# Margaluyu Farm

Situs statis (HTML/JS) + fungsi serverless Vercel (`/api`) + database Supabase (Postgres).
Pemasangan dan pengujian lengkap: **PANDUAN-SUPABASE.md**. Analitik: README_ANALITIK.md.

## Struktur penting
- `supabase/schema.sql` skema + fungsi atomik (stok, promo, batas spam). `supabase/test.sql` uji logika database.
- `api/orders.js` pesanan · `api/testimoni.js` testimoni (moderasi) · `api/config.js` harga/stok/area (publik) · `api/promo.js` cek kode promo · `api/admin-login.js` login admin · `api/admin-settings.js` stok/area/promo (admin) · `api/health.js` diagnosis.
- `lib/db.js` akses Supabase · `lib/security.js` CORS, batas spam, sesi admin · `lib/email.js` email (Resend) · `lib/wa.js` WhatsApp otomatis opsional (Fonnte).
- `scripts/` migrasi data JSONBin, uji situs live, penggantian domain untuk SEO.

## Variabel lingkungan Vercel
Wajib: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ORDERS_ADMIN_KEY` (kata sandi admin panjang).
Email: `RESEND_API_KEY`, `NOTIFY_EMAIL`. Opsional: `FONNTE_TOKEN` (WhatsApp otomatis), `ALLOWED_ORIGINS` (domain tambahan untuk CORS).
Kunci rahasia hanya boleh ada di Vercel, tidak pernah di file frontend.

## Halaman admin
`/admin-pesanan.html` (pesanan, status pengiriman & pembayaran) · `/admin-pengaturan.html` (produk & stok, area & ongkir, kode promo, moderasi testimoni) · `/admin-analitik.html`.
