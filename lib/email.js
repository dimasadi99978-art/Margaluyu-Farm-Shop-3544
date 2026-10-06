// Pengirim notifikasi email lewat Resend (https://resend.com).
// Dipakai oleh api/orders.js (pesanan baru) dan api/notify-testimoni.js (rating/kritik/saran baru).
//
// CARA MENGAKTIFKAN (gratis, ±5 menit):
// 1. Daftar akun gratis di https://resend.com (bisa pakai Google/GitHub).
// 2. Buka menu "API Keys" di dashboard Resend, klik "Create API Key", salin key-nya.
// 3. Di Vercel: buka project ini > Settings > Environment Variables, tambahkan:
//      RESEND_API_KEY   = (API key dari langkah 2)
//      NOTIFY_EMAIL     = margaluyufarm354@gmail.com   (tujuan notifikasi)
// 4. Redeploy. Selesai — pesanan baru & rating baru otomatis mengirim email.
//
// Jika RESEND_API_KEY belum diisi, fungsi ini diam saja (tidak mengirim apa pun dan tidak membuat
// pesanan/rating gagal tersimpan) — supaya situs tetap berjalan normal sebelum notifikasi diaktifkan.
//
// Catatan soal alamat pengirim ("from"): tanpa domain sendiri yang diverifikasi di Resend, email hanya
// bisa dikirim dari alamat bawaan "onboarding@resend.dev" (tetap sampai ke Gmail dengan baik, hanya
// saja nama pengirimnya bukan "Margaluyu Farm"). Jika nanti Margaluyu Farm punya domain sendiri
// (misalnya margaluyufarm.com), verifikasi domain itu di Resend lalu isi Environment Variable
// RESEND_FROM = "Margaluyu Farm <pesanan@margaluyufarm.com>" agar nama pengirim lebih rapi.

const RESEND_API = 'https://api.resend.com/emails';

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL);
}

// Tidak pernah melempar error ke pemanggil — kegagalan kirim email tidak boleh menggagalkan
// penyimpanan pesanan/rating itu sendiri. Kegagalan hanya dicatat di log server (Vercel > Logs).
export async function sendNotification({ subject, html, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) {
    console.warn('Notifikasi email dilewati: RESEND_API_KEY atau NOTIFY_EMAIL belum diatur di Vercel.');
    return { sent: false, reason: 'not_configured' };
  }

  const from = process.env.RESEND_FROM || 'Margaluyu Farm <onboarding@resend.dev>';

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(Object.assign({ from, to, subject, html },
        Array.isArray(attachments) && attachments.length ? { attachments } : {}))
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('Gagal mengirim notifikasi email:', res.status, text.slice(0, 500));
      return { sent: false, reason: 'api_error', status: res.status, detail: text.slice(0, 500) };
    }
    return { sent: true, detail: text.slice(0, 200) };
  } catch (e) {
    console.error('Gagal mengirim notifikasi email (jaringan):', e && e.message ? e.message : e);
    return { sent: false, reason: 'network_error' };
  }
}

// Ubah foto bukti bayar (data URL base64 dari browser) menjadi lampiran email Resend.
// Mengembalikan [] bila bukan data URL gambar yang valid.
export function buktiAttachment(dataUrl, orderId) {
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i.exec(String(dataUrl || ''));
  if (!m) return [];
  const ext = m[1].toLowerCase() === 'jpg' ? 'jpeg' : m[1].toLowerCase();
  const safeId = String(orderId || 'pesanan').replace(/[^A-Za-z0-9_-]/g, '');
  return [{ filename: `bukti-${safeId}.${ext === 'jpeg' ? 'jpg' : ext}`, content: m[2] }];
}

// Sedikit perlindungan dasar dari HTML injection saat menyisipkan data pengguna ke isi email.
export function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- Struk pesanan (isi email notifikasi pesanan baru) ----------
function rupiah(n) {
  const num = Number(n);
  if (!isFinite(num) || num <= 0) return '-';
  return 'Rp ' + String(Math.round(num)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Ubah 0812xxx / +62812xxx / 812xxx menjadi 62812xxx untuk tautan WhatsApp. Kosong bila tidak valid.
function waNumber(phone) {
  let d = String(phone == null ? '' : phone).replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d.length >= 10 && d.startsWith('62') ? d : '';
}

function siteUrl() {
  const host = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '';
  if (!host) return '';
  return /^https?:\/\//i.test(host) ? host.replace(/\/$/, '') : 'https://' + host.replace(/\/$/, '');
}

// Mengembalikan { subject, html } berbentuk struk. Memakai tabel + gaya inline agar tampil rapi di Gmail.
// Subjek memuat nama & total, dan teks pratinjau tersembunyi (preheader) memuat ringkasan,
// sehingga notifikasi Gmail di HP sudah menampilkan info pentingnya tanpa membuka email.
export function buildStrukEmail(order, { sample = false } = {}) {
  const o = order || {};
  const total = rupiah(o.totalHarga);
  const nama = String(o.nama || 'Pelanggan').trim();
  const produk = String(o.produk || '-');
  const jumlah = o.jumlah ? `x${o.jumlah}` : '';
  const bayar = String(o.metodePembayaran || '-');
  const wa = waNumber(o.telepon);
  const base = siteUrl();

  const subject = `${sample ? '[CONTOH] ' : ''}Struk Pesanan Baru ${o.orderId || ''} - ${nama} - ${total}`
    .replace(/[\r\n\t]+/g, ' ').slice(0, 150);
  const preheader = `${nama} memesan ${produk} ${jumlah} | Total ${total} | ${bayar}`;

  const row = (label, value, strong) => `
    <tr>
      <td style="padding:6px 0;color:#7a715f;font-size:14px;vertical-align:top;width:34%;">${esc(label)}</td>
      <td style="padding:6px 0;color:#292319;font-size:14px;text-align:right;vertical-align:top;${strong ? 'font-weight:700;' : ''}">${value}</td>
    </tr>`;
  const line = '<tr><td colspan="2" style="border-top:1px dashed #cdbf9f;font-size:0;line-height:0;padding:6px 0;">&nbsp;</td></tr>';
  const button = (href, text, bg) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:4px 4px 0;padding:12px 22px;background:${bg};color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${esc(text)}</a>`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f2ead9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2ead9;padding:20px 10px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr><td style="background:#0a3d38;padding:22px 24px;text-align:center;">
          <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">Margaluyu Farm</div>
          <div style="color:#e7d3a8;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">${sample ? 'Struk Contoh' : 'Struk Pesanan Baru'}</div>
        </td></tr>
        <tr><td style="padding:22px 24px 8px;">
          <div style="text-align:center;font-size:20px;font-weight:700;color:#0a3d38;letter-spacing:1px;">${esc(o.orderId || '-')}</div>
          <div style="text-align:center;font-size:13px;color:#7a715f;margin-top:2px;">${esc(o.tanggal || '')}</div>
        </td></tr>
        <tr><td style="padding:8px 24px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row('Nama', esc(nama))}
            ${row('No. HP', esc(o.telepon || '-'))}
            ${row('Alamat', esc(o.alamat || '-'))}
            ${line}
            ${row(esc(produk), esc(jumlah))}
            ${line}
            <tr>
              <td style="padding:8px 0;font-size:16px;font-weight:700;color:#0a3d38;">Total</td>
              <td style="padding:8px 0;font-size:20px;font-weight:700;color:#0a3d38;text-align:right;">${esc(total)}</td>
            </tr>
            ${row('Pembayaran', esc(bayar))}
            ${row('Status', esc(o.status || 'Dikonfirmasi'))}
          </table>
        </td></tr>
        ${o.pesan ? `<tr><td style="padding:6px 24px;"><div style="background:#fff8e1;border:1px solid #e7d3a8;border-radius:8px;padding:10px 12px;font-size:13px;color:#564d3f;"><strong>Catatan pelanggan:</strong> ${esc(o.pesan)}</div></td></tr>` : ''}
        ${bayar.toLowerCase().includes('qris') ? '<tr><td style="padding:6px 24px;"><div style="font-size:13px;color:#7a5c00;">Pembayaran QRIS: foto bukti transfer pelanggan ada di lampiran email ini (juga bisa dilihat di halaman Admin Pesanan).</div></td></tr>' : ''}
        <tr><td style="padding:14px 24px 24px;text-align:center;">
          ${wa ? button('https://wa.me/' + wa, 'Chat pelanggan di WhatsApp', '#25a244') : ''}
          ${base ? button(base + '/admin-pesanan.html', 'Buka Admin Pesanan', '#0a3d38') : ''}
        </td></tr>
        <tr><td style="background:#f9f3e7;padding:12px 24px;text-align:center;font-size:11px;color:#7a715f;">
          Email otomatis dari situs Margaluyu Farm. Tidak perlu dibalas.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html };
}
