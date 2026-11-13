function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function productList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.products ?? payload?.data ?? payload?.items ?? [];
}

function getProductId(product) {
  return String(product?.id ?? product?.productId ?? product?.product_id ?? product?._id ?? product?.slug ?? '');
}

function getResellerPrice(product) {
  const raw = Number(product?.resellerPrice ?? product?.reseller_price ?? product?.price ?? product?.amount ?? product?.cost);
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed' });
  }

  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'Cross-origin request rejected.' });
    } catch {
      return send(res, 403, { error: 'Invalid request origin.' });
    }
  }

  const silvexKey = process.env.SILVEX_API_KEY;
  const oxapayKey = process.env.OXAPAY_MERCHANT_API_KEY || process.env['XAUHU-API-KEY'];
  if (!silvexKey) return send(res, 503, { error: 'Product service is not configured.' });
  if (!oxapayKey) return send(res, 503, { error: 'OxaPay is not configured. Add its merchant key in Vercel Environment Variables.' });

  const productId = String(req.body?.productId ?? '').trim();
  if (!productId || productId.length > 200) return send(res, 400, { error: 'A valid product is required.' });

  try {
    const catalogResponse = await fetch('https://silvex-ai.com/api/public/reseller/products', {
      headers: { 'x-api-key': silvexKey, accept: 'application/json' }
    });
    if (!catalogResponse.ok) {
      console.error('Silvex checkout catalog returned HTTP', catalogResponse.status);
      return send(res, 502, { error: 'Could not verify the product price. Please try again later.' });
    }
    const catalog = productList(await catalogResponse.json());
    if (!Array.isArray(catalog)) return send(res, 502, { error: 'Product catalog response was invalid.' });
    const product = catalog.find(item => getProductId(item) === productId);
    if (!product) return send(res, 404, { error: 'This product is no longer available.' });

    const resellerPrice = getResellerPrice(product);
    if (resellerPrice === null) return send(res, 400, { error: 'This product has no valid price and cannot be purchased.' });
    // Keep the storefront's existing 20% markup; determine the amount on the server, not from browser input.
    const amount = Math.round(resellerPrice * 1.2 * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) return send(res, 400, { error: 'Invalid product price.' });

    const orderId = `XH-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const siteOrigin = `https://${req.headers.host}`;
    const invoiceResponse = await fetch('https://api.oxapay.com/v1/payment/invoice', {
      method: 'POST',
      headers: { merchant_api_key: oxapayKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        amount,
        currency: 'USD',
        order_id: orderId,
        description: `Xauhu AI Shop: ${String(product.name ?? product.title ?? 'Digital product').slice(0, 120)}`,
        return_url: `${siteOrigin}/?payment=return`
      })
    });
    const invoice = await invoiceResponse.json().catch(() => ({}));
    const invoiceData = invoice?.data ?? invoice;
    const paymentUrl = invoiceData?.payment_url ?? invoiceData?.paymentUrl ?? invoiceData?.url;
    if (!invoiceResponse.ok || typeof paymentUrl !== 'string') {
      console.error('OxaPay invoice creation failed:', invoiceResponse.status, invoice?.message ?? invoice?.error ?? 'Invalid invoice response');
      return send(res, 502, { error: 'OxaPay could not create a payment link. Please try again later.' });
    }

    let validatedUrl;
    try {
      validatedUrl = new URL(paymentUrl);
      if (validatedUrl.protocol !== 'https:' || !(validatedUrl.hostname === 'oxapay.com' || validatedUrl.hostname.endsWith('.oxapay.com'))) {
        return send(res, 502, { error: 'OxaPay returned an invalid payment link.' });
      }
    } catch {
      return send(res, 502, { error: 'OxaPay returned an invalid payment link.' });
    }

    return send(res, 200, { paymentUrl: validatedUrl.href, orderId, amount });
  } catch (error) {
    console.error('Checkout invoice request failed:', error);
    return send(res, 502, { error: 'Could not create a payment link. Please try again later.' });
  }
};
