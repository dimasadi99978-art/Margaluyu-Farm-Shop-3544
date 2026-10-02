// Endpoint paling sederhana untuk memastikan fungsi /api benar-benar ter-deploy di Vercel.
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  return res.status(200).json({ success: true, api: true, message: 'API Margaluyu Farm aktif.', time: new Date().toISOString() });
}
