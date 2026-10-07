// Menentukan bin JSONBin untuk pesanan secara otomatis, supaya pemilik web tidak harus mengurus Bin ID.
// Urutan: (1) ORDERS_BIN_ID dari Vercel bila valid, (2) cari bin bernama "Margaluyu Farm - Pesanan"
// di akun JSONBin yang sama, (3) jika belum ada sama sekali, buat bin baru.
// Bin baru TIDAK pernah dibuat bila pencarian gagal, supaya tidak terbentuk bin kosong yang menutupi data lama.

const API = 'https://api.jsonbin.io/v3';
export const ORDERS_BIN_NAME = 'Margaluyu Farm - Pesanan';

let cache = null; // { sig, binId, source }

export function cleanEnv(value) {
  return String(value || '').trim().replace(/^["']+|["']+$/g, '').trim();
}

export function isBinId(s) {
  return /^[0-9a-f]{24}$/i.test(String(s || ''));
}

async function readText(res) {
  const t = await res.text();
  let j = {};
  try { j = t ? JSON.parse(t) : {}; } catch (_) {}
  return { t, j };
}

async function checkBin(masterKey, binId) {
  const res = await fetch(`${API}/b/${encodeURIComponent(binId)}/latest`, {
    headers: { 'X-Master-Key': masterKey, 'Accept': 'application/json' }, cache: 'no-store'
  });
  if (res.ok) return 'ok';
  const { t, j } = await readText(res);
  if (res.status === 401 || res.status === 403) {
    throw new Error('Master Key ditolak JSONBin. Pastikan ORDERS_MASTER_KEY berisi X-Master-Key (bukan Access Key) dari jsonbin.io > API Keys. Detail: ' + (j.message || t).slice(0, 120));
  }
  if (res.status === 400 || res.status === 404) return 'invalid';
  throw new Error(`JSONBin tidak dapat dihubungi (HTTP ${res.status}): ${(j.message || t).slice(0, 120)}`);
}

async function listBins(masterKey) {
  const all = [];
  let last = '';
  for (let page = 0; page < 6; page++) {
    const headers = { 'X-Master-Key': masterKey, 'Accept': 'application/json' };
    if (last) headers['Last-Bin-Id'] = last;
    const res = await fetch(`${API}/c/uncollected/bins`, { headers, cache: 'no-store' });
    const { t, j } = await readText(res);
    if (!res.ok) throw new Error(`Gagal mencari bin pesanan otomatis (HTTP ${res.status}): ${(j.message || t).slice(0, 120)}`);
    const rows = Array.isArray(j) ? j : [];
    for (const r of rows) {
      const id = r.record || r.id || (r.metadata && r.metadata.id) || '';
      const name = (r.snippetMeta && r.snippetMeta.name) || r.name || '';
      if (isBinId(id)) all.push({ id, name: String(name), createdAt: r.createdAt || '' });
    }
    if (rows.length < 10) break;
    last = all.length ? all[all.length - 1].id : '';
    if (!last) break;
  }
  return all;
}

async function createBin(masterKey) {
  const res = await fetch(`${API}/b`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'X-Master-Key': masterKey,
      'X-Bin-Name': ORDERS_BIN_NAME, 'X-Bin-Private': 'true'
    },
    body: JSON.stringify({ items: [] })
  });
  const { t, j } = await readText(res);
  const id = j && j.metadata && j.metadata.id;
  if (!res.ok || !isBinId(id)) throw new Error(`Gagal membuat bin pesanan otomatis (HTTP ${res.status}): ${(j.message || t).slice(0, 120)}`);
  return id;
}

// opts.create=false: hanya mencari (dipakai /api/health agar tidak membuat bin saat sekadar diperiksa).
export async function resolveOrdersBin(masterKey, envBinId, opts = {}) {
  const create = opts.create !== false;
  const sig = masterKey + '|' + envBinId;
  if (cache && cache.sig === sig) return cache;

  if (isBinId(envBinId) && (await checkBin(masterKey, envBinId)) === 'ok') {
    cache = { sig, binId: envBinId, source: 'env' };
    return cache;
  }

  const bins = await listBins(masterKey);
  const found = bins
    .filter(b => b.name.trim().toLowerCase() === ORDERS_BIN_NAME.toLowerCase())
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))[0];
  if (found) {
    cache = { sig, binId: found.id, source: 'ditemukan' };
    return cache;
  }
  if (!create) return { binId: null, source: 'belum-ada' };

  const id = await createBin(masterKey);
  cache = { sig, binId: id, source: 'dibuat' };
  return cache;
}
