// Margaluyu Farm - API pesanan untuk Vercel + JSONBin
// Master Key hanya dibaca di server melalui Environment Variables Vercel.

const API_ROOT = 'https://api.jsonbin.io/v3/b';

function unwrap(record) {
  if (Array.isArray(record)) return record;
  if (record && Array.isArray(record.items)) return record.items;
  return [];
}

function wrap(list) {
  return { items: Array.isArray(list) ? list : [] };
}

function normalizeId(value) {
  return String(value || '').trim().toLowerCase();
}

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  // Aman bila suatu saat frontend/API dipisah domain.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  return res.status(status).json(payload);
}

function mergeOrders(...lists) {
  const map = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const order of list) {
      if (!order || !order.orderId) continue;
      map.set(normalizeId(order.orderId), order);
    }
  }
  return Array.from(map.values());
}

async function readJsonResponse(response, label) {
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) {}
  if (!response.ok) {
    const detail = data.message || data.error || text || `HTTP ${response.status}`;
    throw new Error(`${label}: ${detail}`);
  }
  return data;
}

async function jsonbinGet(masterKey, binId) {
  const response = await fetch(`${API_ROOT}/${encodeURIComponent(binId)}/latest`, {
    headers: { 'X-Master-Key': masterKey, 'Accept': 'application/json' },
    cache: 'no-store'
  });
  const data = await readJsonResponse(response, 'JSONBin GET gagal');
  return unwrap(data.record);
}

async function jsonbinPut(masterKey, binId, list) {
  const response = await fetch(`${API_ROOT}/${encodeURIComponent(binId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': masterKey,
      'Accept': 'application/json'
    },
    body: JSON.stringify(wrap(list))
  });
  return readJsonResponse(response, 'JSONBin PUT gagal');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.status(204).end();
  }

  if (!['GET', 'POST', 'PUT'].includes(req.method)) {
    return json(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  const masterKey = process.env.ORDERS_MASTER_KEY;
  const binId = process.env.ORDERS_BIN_ID;

  if (!masterKey || !binId) {
    return json(res, 500, {
      success: false,
      error: 'Konfigurasi server belum lengkap. Atur ORDERS_MASTER_KEY dan ORDERS_BIN_ID di Vercel > Settings > Environment Variables, lalu Redeploy.'
    });
  }

  try {
    if (req.method === 'GET') {
      const data = await jsonbinGet(masterKey, binId);
      return json(res, 200, { success: true, data });
    }

    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); }
      catch (_) { return json(res, 400, { success: false, error: 'Body JSON tidak valid.' }); }
    }

    const current = await jsonbinGet(masterKey, binId);
    const order = body && body.order;

    if (!order || !order.orderId) {
      return json(res, 400, { success: false, error: 'Data pesanan tidak lengkap: orderId wajib ada.' });
    }

    if (req.method === 'POST') {
      const merged = mergeOrders(current, [order]);
      await jsonbinPut(masterKey, binId, merged);
      const verify = await jsonbinGet(masterKey, binId);
      const saved = verify.find(o => normalizeId(o.orderId) === normalizeId(order.orderId));
      if (!saved) {
        return json(res, 500, { success: false, error: 'Pesanan dikirim tetapi belum dapat diverifikasi di penyimpanan bersama.' });
      }
      return json(res, 200, { success: true, order: saved });
    }

    const idx = current.findIndex(o => normalizeId(o.orderId) === normalizeId(order.orderId));
    if (idx === -1) {
      return json(res, 404, { success: false, error: 'Pesanan tidak ditemukan di penyimpanan bersama.' });
    }

    current[idx] = { ...current[idx], ...order };
    await jsonbinPut(masterKey, binId, mergeOrders(current));
    const verify = await jsonbinGet(masterKey, binId);
    const saved = verify.find(o => normalizeId(o.orderId) === normalizeId(order.orderId));

    return json(res, 200, { success: true, order: saved || current[idx] });
  } catch (error) {
    console.error('API pesanan gagal:', error);
    return json(res, 500, {
      success: false,
      error: error && error.message ? error.message : 'Server pesanan mengalami kesalahan.'
    });
  }
}
