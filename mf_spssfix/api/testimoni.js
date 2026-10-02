// Margaluyu Farm - API khusus ADMIN untuk menghapus testimoni.
// Membaca/menulis JSONBin dari server (Master Key ada di Environment Variables Vercel):
//   TESTIMONI_MASTER_KEY = Master Key JSONBin (sama dengan yang dipakai testimoni-config.js)
//   TESTIMONI_BIN_ID     = ID bin testimoni
//   ORDERS_ADMIN_KEY     = kata sandi admin (sama dengan yang dipakai Admin Pesanan)
//
// GET  ?check=1              -> 200 bila kata sandi admin benar (dipakai untuk menampilkan tombol hapus)
// DELETE {keys:[...]}        -> hapus testimoni yang kuncinya cocok (kunci = nama|tanggal|komentar)

import { timingSafeEqual } from 'node:crypto';

const API_ROOT = 'https://api.jsonbin.io/v3/b';

function unwrap(record) {
  if (Array.isArray(record)) return record;
  if (record && Array.isArray(record.items)) return record.items;
  return [];
}

function testiKey(t) {
  const clean = v => String(v == null ? '' : v).trim();
  return [clean(t && t.nama), clean(t && t.tanggal), clean(t && t.komentar)].join('|');
}

function isAdmin(req, adminKey) {
  if (!adminKey) return false; // wajib diaktifkan untuk fitur admin
  const given = String((req.headers && (req.headers['x-admin-key'] || req.headers['X-Admin-Key'])) || '');
  const a = Buffer.from(given);
  const b = Buffer.from(String(adminKey));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Admin-Key');
  return res.status(status).json(payload);
}

async function readJson(response, label) {
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_) {}
  if (!response.ok) throw new Error(`${label}: ${data.message || data.error || text || response.status}`);
  return data;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (!['GET', 'DELETE'].includes(req.method)) {
    return json(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  const adminKey = process.env.ORDERS_ADMIN_KEY || '';
  if (!adminKey) {
    return json(res, 403, { success: false, error: 'Fitur admin belum aktif. Isi ORDERS_ADMIN_KEY di Vercel lalu Redeploy.' });
  }
  if (!isAdmin(req, adminKey)) {
    return json(res, 401, { success: false, error: 'Tidak diizinkan. Kata sandi admin diperlukan.' });
  }
  if (req.method === 'GET') return json(res, 200, { success: true, admin: true });

  const masterKey = process.env.TESTIMONI_MASTER_KEY;
  const binId = process.env.TESTIMONI_BIN_ID;
  if (!masterKey || !binId) {
    return json(res, 500, { success: false, error: 'Isi TESTIMONI_MASTER_KEY dan TESTIMONI_BIN_ID di Vercel (Settings > Environment Variables), lalu Redeploy.' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); }
      catch (_) { return json(res, 400, { success: false, error: 'Body JSON tidak valid.' }); }
    }
    const keys = new Set((Array.isArray(body.keys) ? body.keys : []).map(String));
    if (!keys.size) return json(res, 400, { success: false, error: 'Pilih minimal satu testimoni.' });

    const getRes = await fetch(`${API_ROOT}/${encodeURIComponent(binId)}/latest`, {
      headers: { 'X-Master-Key': masterKey, 'Accept': 'application/json' },
      cache: 'no-store'
    });
    const current = unwrap((await readJson(getRes, 'JSONBin GET gagal')).record);

    const kept = current.filter(t => !keys.has(testiKey(t)));
    const removed = current.length - kept.length;
    if (removed > 0) {
      const putRes = await fetch(`${API_ROOT}/${encodeURIComponent(binId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': masterKey, 'Accept': 'application/json' },
        body: JSON.stringify({ items: kept })
      });
      await readJson(putRes, 'JSONBin PUT gagal');
    }
    return json(res, 200, { success: true, removed });
  } catch (error) {
    console.error('API testimoni gagal:', error);
    return json(res, 500, { success: false, error: error && error.message ? error.message : 'Server testimoni mengalami kesalahan.' });
  }
}
