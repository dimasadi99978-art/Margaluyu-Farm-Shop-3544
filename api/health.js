// Diagnosis server (aman dibuka publik: tidak menampilkan data pelanggan maupun isi key).
// Buka: https://DOMAIN-ANDA/api/health
// Memeriksa: (1) Environment Variables terbaca, (2) JSONBin bisa dibaca, (3) sisa ruang penyimpanan,
// (4) email notifikasi sudah dikonfigurasi.

import { isEmailConfigured } from '../lib/email.js';

const API_ROOT = 'https://api.jsonbin.io/v3/b';
const MAX_BIN_CHARS = 90000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const masterKey = process.env.ORDERS_MASTER_KEY;
  const binId = process.env.ORDERS_BIN_ID;

  const report = {
    server: 'ok',
    env: {
      ORDERS_MASTER_KEY: Boolean(masterKey),
      ORDERS_BIN_ID: Boolean(binId),
      ORDERS_ADMIN_KEY: Boolean(process.env.ORDERS_ADMIN_KEY),
      CRON_SECRET: Boolean(process.env.CRON_SECRET),
      RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY),
      NOTIFY_EMAIL: Boolean(process.env.NOTIFY_EMAIL)
    },
    penyimpanan: { status: 'belum dicek' },
    email: { dikonfigurasi: isEmailConfigured() },
    saran: []
  };

  if (!masterKey || !binId) {
    report.penyimpanan = { status: 'gagal', sebab: 'ORDERS_MASTER_KEY / ORDERS_BIN_ID belum terbaca di server.' };
    report.saran.push('Isi ORDERS_MASTER_KEY dan ORDERS_BIN_ID di Vercel > Settings > Environment Variables (centang Production), lalu Redeploy.');
  } else {
    try {
      const r = await fetch(`${API_ROOT}/${encodeURIComponent(binId)}/latest`, {
        headers: { 'X-Master-Key': masterKey, 'Accept': 'application/json' },
        cache: 'no-store'
      });
      const text = await r.text();
      if (!r.ok) {
        report.penyimpanan = { status: 'gagal', httpJSONBin: r.status, pesan: text.slice(0, 200) };
        if (r.status === 401 || r.status === 403) report.saran.push('Master Key JSONBin ditolak. Salin ulang Master Key (bukan Access Key) dari jsonbin.io > API Keys.');
        if (r.status === 404) report.saran.push('Bin ID tidak ditemukan. Periksa ORDERS_BIN_ID (ID bin, bukan nama bin).');
      } else {
        const data = JSON.parse(text);
        const rec = data.record;
        const list = Array.isArray(rec) ? rec : (rec && Array.isArray(rec.items) ? rec.items : []);
        const size = JSON.stringify({ items: list }).length;
        const pakai = Math.round(size / MAX_BIN_CHARS * 100);
        report.penyimpanan = { status: 'ok', jumlahPesanan: list.length, terpakaiPersen: pakai };
        if (pakai >= 80) report.saran.push('Penyimpanan JSONBin hampir penuh (' + pakai + '%). Hapus pesanan berstatus Selesai di Admin Pesanan.');
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
