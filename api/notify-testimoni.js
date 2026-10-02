// Endpoint kecil khusus untuk mengirim notifikasi email ke admin setiap kali ada
// yang mengisi formulir Rating & Kritik/Saran. Tidak menyimpan apa pun di sini -
// penyimpanan sebenarnya tetap lewat TestimoniStore (JSONBin) dari sisi browser seperti biasa.
// Endpoint ini sengaja dibuat terpisah dan ringan supaya tidak menyentuh Master Key JSONBin.

import { sendNotification, esc } from '../lib/email.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const nama = String(body.nama || 'Pelanggan').slice(0, 120);
    const rating = Number(body.rating) || 0;
    const komentar = String(body.komentar || '').slice(0, 2000);
    const tanggal = String(body.tanggal || '').slice(0, 60);
    const foto = typeof body.foto === 'string' && body.foto.startsWith('data:image/') ? 'Ya' : 'Tidak';

    const bintang = rating > 0 ? '&#9733;'.repeat(rating) + '&#9734;'.repeat(5 - rating) + ` (${rating}/5)` : '(tanpa rating)';

    const result = await sendNotification({
      subject: `Rating/Saran baru dari ${esc(nama)}`,
      html: `
        <h2>Rating &amp; Kritik/Saran Baru - Margaluyu Farm</h2>
        <p><strong>Nama:</strong> ${esc(nama)}<br>
           <strong>Rating:</strong> ${bintang}<br>
           <strong>Tanggal:</strong> ${esc(tanggal)}<br>
           <strong>Foto:</strong> ${foto}</p>
        <p><strong>Isi:</strong><br>${esc(komentar).replace(/\n/g, '<br>')}</p>
        <p style="color:#666;font-size:13px;">Lihat semua ulasan di halaman Testimoni, atau data lengkapnya di halaman Admin &gt; Analitik.</p>
      `
    });

    // Selalu balas sukses ke browser pengunjung - gagal kirim email bukan tanggung jawab pengunjung,
    // dan masukan mereka sudah tersimpan lewat TestimoniStore terlepas dari email ini terkirim atau tidak.
    return res.status(200).json({ success: true, notified: result.sent === true });
  } catch (error) {
    console.error('notify-testimoni gagal:', error);
    return res.status(200).json({ success: true, notified: false });
  }
}
