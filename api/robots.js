// robots.txt dinamis: mengarahkan mesin pencari ke peta situs dan menyembunyikan halaman admin.
export default function handler(req, res) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').replace(/[^A-Za-z0-9.:-]/g, '');
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin-pesanan.html',
    'Disallow: /admin-analitik.html',
    'Disallow: /setup-testimoni.html',
    'Disallow: /cek-koneksi.html',
    'Disallow: /cek-pesanan-server.html',
    'Disallow: /api/',
    `Sitemap: https://${host}/sitemap.xml`,
    ''
  ].join('\n');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).end(body);
}
