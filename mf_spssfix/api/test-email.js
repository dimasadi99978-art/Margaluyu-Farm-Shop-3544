// Alat diagnosis notifikasi email. Buka di browser SETELAH deploy:
//   https://DOMAIN-ANDA/api/test-email?secret=ISI_CRON_SECRET_ANDA
// (nilai secret = Environment Variable CRON_SECRET di Vercel). Hasilnya menampilkan langsung apakah
// email berhasil dikirim, atau pesan error dari Resend jika gagal. Tanpa secret yang benar, ditolak.

import { timingSafeEqual } from 'node:crypto';
import { sendNotification, isEmailConfigured, buildStrukEmail } from '../lib/email.js';

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const expected = process.env.CRON_SECRET;
  const given = req.query && (Array.isArray(req.query.secret) ? req.query.secret[0] : req.query.secret);

  if (!expected || !safeEqual(given, expected)) {
    return res.status(401).json({ success: false, error: 'Tidak diizinkan. Tambahkan ?secret=NILAI_CRON_SECRET di akhir alamat.' });
  }

  if (!isEmailConfigured()) {
    return res.status(200).json({
      success: false,
      configured: false,
      error: 'RESEND_API_KEY dan/atau NOTIFY_EMAIL belum terbaca di server. Pastikan sudah diisi di Vercel > Settings > Environment Variables (untuk Production), lalu Redeploy.'
    });
  }

  // Tes memakai struk contoh, supaya persis seperti email pesanan asli yang akan Anda terima.
  const result = await sendNotification(buildStrukEmail({
    orderId: 'MF-CONTOH-0000',
    tanggal: 'Contoh tanggal pesanan',
    nama: 'Pelanggan Contoh',
    telepon: '081234567890',
    alamat: 'Jl. Contoh No. 1, Surabaya',
    produk: 'Susu Kambing Saanen 500ml',
    jumlah: 2,
    totalHarga: 40000,
    metodePembayaran: 'COD (Bayar di Tempat)',
    status: 'Dikonfirmasi',
    pesan: 'Ini hanya tes, bukan pesanan asli.'
  }, { sample: true }));

  return res.status(200).json({
    success: result.sent === true,
    configured: true,
    tujuan: process.env.NOTIFY_EMAIL,
    hasil: result,
    catatan: result.sent ? 'Terkirim. Cek Kotak Masuk dan folder Spam/Promosi Gmail.' :
      'Gagal. Baca isi "hasil.detail" - biasanya menjelaskan penyebab (mis. hanya boleh mengirim ke email pemilik akun Resend jika domain belum diverifikasi).'
  });
}
