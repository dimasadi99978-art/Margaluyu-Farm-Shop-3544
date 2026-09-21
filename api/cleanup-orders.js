// Vercel Cron: hapus seluruh pesanan yang sudah berstatus Selesai
// dan sudah lebih dari 90 hari sejak status terakhir diperbarui.
// Testimoni tidak disentuh karena memakai JSONBin terpisah.

const API_ROOT = 'https://api.jsonbin.io/v3/b';
const RETENTION_DAYS = 90;

function unwrap(record) {
  if (Array.isArray(record)) return record;
  if (record && Array.isArray(record.items)) return record.items;
  return [];
}

function wrap(list) {
  return { items: Array.isArray(list) ? list : [] };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const masterKey = process.env.ORDERS_MASTER_KEY;
  const binId = process.env.ORDERS_BIN_ID;
  if (!masterKey || !binId) {
    return res.status(500).json({
      success: false,
      error: 'ORDERS_MASTER_KEY atau ORDERS_BIN_ID belum diatur di Vercel.'
    });
  }

  try {
    const getRes = await fetch(`${API_ROOT}/${binId}/latest`, {
      headers: { 'X-Master-Key': masterKey },
      cache: 'no-store'
    });

    const getText = await getRes.text();
    let getJson = {};
    try { getJson = getText ? JSON.parse(getText) : {}; } catch (_) {}

    if (!getRes.ok) {
      throw new Error(getJson.message || `JSONBin GET gagal (${getRes.status})`);
    }

    const orders = unwrap(getJson.record);
    const cutoff = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const kept = [];
    let deleted = 0;

    for (const order of orders) {
      if (!order || order.status !== 'Selesai') {
        kept.push(order);
        continue;
      }

      const updatedAt = Date.parse(order.updatedAt || '');
      const expired = Number.isFinite(updatedAt) && updatedAt <= cutoff;

      if (expired) deleted += 1;
      else kept.push(order);
    }

    if (deleted === 0) {
      return res.status(200).json({
        success: true,
        deleted: 0,
        remaining: kept.length,
        message: 'Tidak ada pesanan Selesai yang melewati 90 hari.'
      });
    }

    const putRes = await fetch(`${API_ROOT}/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': masterKey
      },
      body: JSON.stringify(wrap(kept))
    });

    const putText = await putRes.text();
    let putJson = {};
    try { putJson = putText ? JSON.parse(putText) : {}; } catch (_) {}

    if (!putRes.ok) {
      throw new Error(putJson.message || `JSONBin PUT gagal (${putRes.status})`);
    }

    return res.status(200).json({
      success: true,
      deleted,
      remaining: kept.length,
      cutoff: new Date(cutoff).toISOString()
    });
  } catch (error) {
    console.error('Cleanup pesanan gagal:', error);
    return res.status(500).json({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}
