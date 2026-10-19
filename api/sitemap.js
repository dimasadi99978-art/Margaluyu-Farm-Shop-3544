// Peta situs otomatis: memakai alamat domain yang sedang dipakai pengunjung, jadi tidak perlu diubah manual.
const PAGES = ['/', '/product.html', '/lacak-pesanan.html', '/contact.html', '/testimoni.html', '/rating.html', '/privasi.html'];

export default function handler(req, res) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').replace(/[^A-Za-z0-9.:-]/g, '');
  const base = `https://${host}`;
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    PAGES.map(p => `  <url><loc>${base}${p}</loc></url>`).join('\n') + '\n</urlset>\n';
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).end(body);
}
