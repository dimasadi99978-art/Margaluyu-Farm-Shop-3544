// Diagnosis server: membedakan API Vercel, konfigurasi Environment Variables,
// koneksi JSONBin, dan konfigurasi email. Tidak pernah menampilkan secret.
const API_ROOT = 'https://api.jsonbin.io/v3/b';

function send(res, status, payload) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  return res.json(payload);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'GET') return send(res, 405, { success: false, error: 'Method Not Allowed' });

  const masterKey = String(process.env.ORDERS_MASTER_KEY || '').trim();
  const binId = String(process.env.ORDERS_BIN_ID || '').trim();
  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  const notifyEmail = String(process.env.NOTIFY_EMAIL || '').trim();

  const result = {
    success: false,
    server: {
      online: true,
      runtime: 'vercel-node',
      vercel: Boolean(process.env.VERCEL),
      environment: process.env.VERCEL_ENV || 'unknown'
    },
    orders: {
      configured: Boolean(masterKey && binId),
      connected: false
    },
    email: {
      configured: Boolean(resendKey && notifyEmail)
    }
  };

  if (!masterKey || !binId) {
    result.error = 'API Vercel aktif, tetapi Environment Variables pesanan belum lengkap. Yang wajib: ORDERS_MASTER_KEY dan ORDERS_BIN_ID.';
    return send(res, 200, result);
  }

  try {
    const response = await fetch(`${API_ROOT}/${encodeURIComponent(binId)}/latest`, {
      method: 'GET',
      headers: { 'X-Master-Key': masterKey, 'Accept': 'application/json' },
      cache: 'no-store'
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) {}

    if (!response.ok) {
      result.error = `Environment Variables terbaca, tetapi JSONBin menolak koneksi (HTTP ${response.status}).`;
      result.orders.detail = data?.message || data?.error || text.slice(0, 300);
      return send(res, 200, result);
    }

    const record = data?.record;
    result.orders.connected = true;
    result.orders.count = Array.isArray(record)
      ? record.length
      : (Array.isArray(record?.items) ? record.items.length : 0);
    result.success = true;
    return send(res, 200, result);
  } catch (error) {
    result.error = 'API Vercel aktif, tetapi koneksi dari Vercel ke JSONBin gagal.';
    result.orders.detail = error?.message || String(error);
    return send(res, 200, result);
  }
}
