// Margaluyu Farm - endpoint diagnosis deployment.
// Sengaja TIDAK mengimpor modul lain agar kegagalan import tidak menyamarkan masalah deployment.
const API_ROOT = 'https://api.jsonbin.io/v3/b';

async function parseResponse(response) {
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) {}
  return { ok: response.ok, status: response.status, data, text };
}

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

  const masterKey = process.env.ORDERS_MASTER_KEY || '';
  const binId = process.env.ORDERS_BIN_ID || '';
  const resendKey = process.env.RESEND_API_KEY || '';
  const notifyEmail = process.env.NOTIFY_EMAIL || '';

  const result = {
    success: false,
    server: { online: true, runtime: 'vercel-node', vercel: Boolean(process.env.VERCEL), environment: process.env.VERCEL_ENV || 'unknown' },
    orders: { configured: Boolean(masterKey && binId), connected: false },
    email: { configured: Boolean(resendKey && notifyEmail) }
  };

  if (!masterKey || !binId) {
    result.error = 'API Vercel hidup, tetapi ORDERS_MASTER_KEY dan/atau ORDERS_BIN_ID belum tersedia pada deployment ini.';
    return send(res, 500, result);
  }

  try {
    const response = await fetch(`${API_ROOT}/${encodeURIComponent(binId)}/latest`, {
      method: 'GET',
      headers: { 'X-Master-Key': masterKey, 'Accept': 'application/json' },
      cache: 'no-store'
    });
    const checked = await parseResponse(response);

    if (!checked.ok) {
      result.error = `API Vercel hidup, tetapi JSONBin menolak permintaan (HTTP ${checked.status}).`;
      result.orders.detail = checked.data?.message || checked.data?.error || checked.text.slice(0, 300);
      return send(res, 502, result);
    }

    const record = checked.data?.record;
    result.orders.connected = true;
    result.orders.count = Array.isArray(record) ? record.length : (Array.isArray(record?.items) ? record.items.length : 0);
    result.success = true;
    return send(res, 200, result);
  } catch (error) {
    result.error = 'API Vercel hidup, tetapi koneksi dari Vercel ke JSONBin gagal.';
    result.orders.detail = error?.message || String(error);
    return send(res, 502, result);
  }
}
