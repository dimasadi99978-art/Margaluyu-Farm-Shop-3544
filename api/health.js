// Diagnosis server (aman dibuka publik: tidak menampilkan data pelanggan maupun isi key).
// Buka: https://DOMAIN-ANDA/api/health
// Memeriksa: (1) Environment Variables terbaca, (2) JSONBin bisa dibaca, (3) sisa ruang penyimpanan,
// (4) email notifikasi sudah dikonfigurasi.

import { isEmailConfigured } from '../lib/email.js';
import { resolveOrdersBin, cleanEnv } from '../lib/bin.js';

const API_ROOT = 'https://api.jsonbin.io/v3/b';
const MAX_BIN_CHARS = 90000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const masterKey = cleanEnv(process.env.ORDERS_MASTER_KEY);
  const envBinId = cleanEnv(process.env.ORDERS_BIN_ID);

  const report = {
    server: 'ok',
    env: {
      ORDERS_MASTER_KEY: Boolean(masterKey),
      ORDERS_BIN_ID: Boolean(envBinId),
      ORDERS_ADMIN_KEY: Boolean(process.env.ORDERS_ADMIN_KEY),
      CRON_SECRET: Boolean(process.env.CRON_SECRET),
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
      NOTIFY_EMAIL: Boolean(process.env.NOTIFY_EMAIL)
    },
    penyimpanan: { status: 'belum dicek' },
    email: { dikonfigurasi: isEmailConfigured() },
    saran: []
  };

  if (!masterKey) {
    report.penyimpanan = { status: 'gagal', sebab: 'ORDERS_MASTER_KEY belum terbaca di server.' };
    report.saran.push('Isi ORDERS_MASTER_KEY (X-Master-Key JSONBin) di Vercel > Settings > Environment Variables (centang Production), lalu Redeploy.');
  } else {
    try {
      const r = await resolveOrdersBin(masterKey, envBinId, { create: false });
      if (!r.binId) {
        report.penyimpanan = { status: 'ok', catatan: 'Belum ada bin pesanan di akun JSONBin. Bin akan dibuat otomatis saat pesanan pertama masuk.', jumlahPesanan: 0, terpakaiPersen: 0 };
      } else {
        const g = await fetch(`${API_ROOT}/${encodeURIComponent(r.binId)}/latest`, {
          headers: { 'X-Master-Key': masterKey, 'Accept': 'application/json' }, cache: 'no-store'
        });
        const text = await g.text();
        if (!g.ok) {
          report.penyimpanan = { status: 'gagal', httpJSONBin: g.status, pesan: text.slice(0, 200) };
        } else {
          const rec = JSON.parse(text).record;
          const list = Array.isArray(rec) ? rec : (rec && Array.isArray(rec.items) ? rec.items : []);
          const size = JSON.stringify({ items: list }).length;
          const pakai = Math.round(size / MAX_BIN_CHARS * 100);
          report.penyimpanan = {
            status: 'ok', jumlahPesanan: list.length, terpakaiPersen: pakai,
            sumberBin: r.source === 'env' ? 'dari ORDERS_BIN_ID' : (r.source === 'ditemukan' ? 'ditemukan otomatis di akun JSONBin' : r.source)
          };
          if (r.source !== 'env' && envBinId) report.saran.push('ORDERS_BIN_ID di Vercel tidak valid, tetapi sistem memakai bin pesanan yang ditemukan otomatis. Anda boleh menghapus variabel ORDERS_BIN_ID itu.');
          if (pakai >= 80) report.saran.push('Penyimpanan JSONBin hampir penuh (' + pakai + '%). Hapus pesanan berstatus Selesai di Admin Pesanan.');
        }
      }
    } catch (e) {
      report.penyimpanan = { status: 'gagal', sebab: String(e && e.message || e) };
    }
  }

  if (!report.email.dikonfigurasi) {
    report.saran.push('Email belum aktif: isi RESEND_API_KEY dan NOTIFY_EMAIL di Vercel lalu Redeploy.');
  }

  const ok = report.penyimpanan.status === 'ok';
  report.ringkasan = ok
    ? 'Server dan penyimpanan pesanan berfungsi.' + (report.email.dikonfigurasi ? '' : ' Email belum aktif.')
    : 'Ada masalah di penyimpanan pesanan, lihat bagian "penyimpanan" dan "saran".';
  return res.status(ok ? 200 : 500).end(JSON.stringify(report, null, 2));
}
