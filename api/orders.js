// Margaluyu Farm - API pesanan untuk Vercel + JSONBin
// Master Key hanya dibaca di server melalui Environment Variables Vercel.

import { timingSafeEqual } from 'node:crypto';
import { sendNotification, buildStrukEmail } from '../lib/email.js';

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

function normalizePhone(value) {
  let s = String(value || '').replace(/[\s\-().]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0')) s = '62' + s.slice(1);
  return s;
}

// Hasil pencarian publik (Lacak Pesanan) tidak perlu membawa foto bukti pembayaran.
function publicView(order) {
  const { buktiPembayaran, ...rest } = order || {};
  return rest;
}

// Pencarian dengan nomor HP saja hanya menampilkan informasi minimum.
// Detail pribadi tetap harus dibuka dengan nomor pesanan + nomor HP + nama penerima.
function publicPhoneLookupView(order) {
  const o = order || {};
  return {
    orderId: o.orderId || '',
    tanggal: o.tanggal || '',
    status: o.status || 'Dikonfirmasi',
    produk: o.produk || 'Pesanan',
    jumlah: o.jumlah || ''
  };
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// ORDERS_ADMIN_KEY (opsional, Environment Variable Vercel):
// jika diisi, daftar seluruh pesanan (GET tanpa parameter) dan perubahan status (PUT)
// hanya bisa dilakukan dengan header X-Admin-Key yang sama. Jika tidak diisi, perilaku lama dipertahankan.
function isAdmin(req, adminKey) {
  if (!adminKey) return true;
  const given = String((req.headers && (req.headers['x-admin-key'] || req.headers['X-Admin-Key'])) || '');
  const a = Buffer.from(given);
  const b = Buffer.from(String(adminKey));
  return a.length === b.length && timingSafeEqual(a, b);
}

function firstQuery(value) {
  return Array.isArray(value) ? value[0] : value;
}

function json(res, status, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  // Aman bila suatu saat frontend/API dipisah domain.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Admin-Key');
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
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, X-Admin-Key');
    return res.status(204).end();
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
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
    const adminKey = process.env.ORDERS_ADMIN_KEY || '';

    if (req.method === 'GET') {
      const query = req.query || {};
      const wantId = normalizeId(firstQuery(query.orderId));
      const wantPhone = normalizePhone(firstQuery(query.telepon));
      const wantName = normalizeName(firstQuery(query.nama));

      // Pelacakan detail: nomor pesanan + nomor HP.
      // Jika nama juga dikirim (mode lupa nomor pesanan), nama menjadi lapisan konfirmasi tambahan.
      if (wantId || wantPhone || wantName) {
        if (!wantPhone) {
          return json(res, 400, { success: false, error: 'Nomor HP wajib diisi.' });
        }

        const all = await jsonbinGet(masterKey, binId);

        // Mode lupa nomor pesanan: nomor HP saja hanya boleh mengembalikan
        // informasi terbatas agar data pribadi pelanggan tidak terbuka.
        if (!wantId && !wantName) {
          const data = all
            .filter(o => o && o.orderId && normalizePhone(o.telepon) === wantPhone)
            .map(publicPhoneLookupView);
          return json(res, 200, { success: true, data, limited: true });
        }

        if (!wantId) {
          return json(res, 400, { success: false, error: 'Nomor pesanan wajib diisi untuk membuka detail pesanan.' });
        }

        const data = all
          .filter(o => o && o.orderId
            && normalizeId(o.orderId) === wantId
            && normalizePhone(o.telepon) === wantPhone
            && (!wantName || normalizeName(o.nama) === wantName))
          .map(publicView);
        return json(res, 200, { success: true, data });
      }

      // Daftar lengkap (halaman admin)
      if (!isAdmin(req, adminKey)) {
        return json(res, 401, { success: false, error: 'Tidak diizinkan. Kata sandi admin diperlukan.' });
      }
      const data = await jsonbinGet(masterKey, binId);
      return json(res, 200, { success: true, data, protected: Boolean(adminKey) });
    }

    // Hapus pesanan (hanya yang berstatus "Selesai"). Wajib kunci admin dari server.
    // Sengaja TIDAK berlaku bila ORDERS_ADMIN_KEY kosong, agar pengunjung umum tidak bisa menghapus data.
    if (req.method === 'DELETE') {
      if (!adminKey) {
        return json(res, 403, { success: false, error: 'Fitur hapus butuh ORDERS_ADMIN_KEY di Vercel (Settings > Environment Variables), lalu Redeploy.' });
      }
      if (!isAdmin(req, adminKey)) {
        return json(res, 401, { success: false, error: 'Tidak diizinkan. Kata sandi admin diperlukan.' });
      }
      let delBody = req.body || {};
      if (typeof delBody === 'string') {
        try { delBody = JSON.parse(delBody || '{}'); }
        catch (_) { return json(res, 400, { success: false, error: 'Body JSON tidak valid.' }); }
      }
      const ids = new Set((Array.isArray(delBody.orderIds) ? delBody.orderIds : []).map(normalizeId).filter(Boolean));
      if (!ids.size) {
        return json(res, 400, { success: false, error: 'Pilih minimal satu pesanan.' });
      }
      const existing = await jsonbinGet(masterKey, binId);
      const kept = [];
      const removed = [];
      const skipped = [];
      for (const o of existing) {
        const id = o && o.orderId ? normalizeId(o.orderId) : '';
        if (id && ids.has(id)) {
          if (o.status === 'Selesai') removed.push(o.orderId);
          else skipped.push(o.orderId);
          if (o.status !== 'Selesai') kept.push(o);
        } else {
          kept.push(o);
        }
      }
      if (removed.length) await jsonbinPut(masterKey, binId, kept);
      return json(res, 200, { success: true, removed, skipped });
    }

    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); }
      catch (_) { return json(res, 400, { success: false, error: 'Body JSON tidak valid.' }); }
    }

    // Perubahan pesanan yang sudah ada (mis. status) hanya untuk admin bila ORDERS_ADMIN_KEY diaktifkan.
    if (req.method === 'PUT' && !isAdmin(req, adminKey)) {
      return json(res, 401, { success: false, error: 'Tidak diizinkan. Kata sandi admin diperlukan.' });
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

      // Notifikasi email ke admin. Ditunggu (await) supaya benar-benar terkirim sebelum fungsi
      // server berhenti, tetapi kegagalan kirim email TIDAK menggagalkan pesanan yang sudah tersimpan.
      const emailResult = await sendNotification(buildStrukEmail(saved)).catch((error) => ({ sent: false, reason: 'exception', detail: error?.message || String(error) }));

      return json(res, 200, { success: true, order: saved, notification: { sent: Boolean(emailResult?.sent), reason: emailResult?.reason || null } });
    }

    const idx = current.findIndex(o => normalizeId(o.orderId) === normalizeId(order.orderId));
    if (idx === -1) {
      return json(res, 404, { success: false, error: 'Pesanan tidak ditemukan di penyimpanan bersama.' });
    }

    current[idx] = { ...current[idx], ...order };
    // Foto bukti pembayaran besar; setelah pesanan Selesai tidak diperlukan lagi, buang agar penyimpanan hemat.
    if (current[idx].status === 'Selesai' && current[idx].buktiPembayaran) {
      current[idx].buktiPembayaran = null;
    }
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
