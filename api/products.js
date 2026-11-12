export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.SILVEX_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Product service is not configured' });
  }

  try {
    const response = await fetch(
      'https://silvex-ai.com/api/public/reseller/products',
      { headers: { 'x-api-key': apiKey, 'accept': 'application/json' } }
    );

    const body = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(body);
  } catch {
    return res.status(502).json({ error: 'Could not reach the product service' });
  }
}
