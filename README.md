# Xauhu AI Shop

A no-account product storefront. Customers can browse products and use **Buy now** to receive an OxaPay hosted invoice.

## Required Vercel environment variables

- `SILVEX_API_KEY` — Silvex reseller catalog access.
- `OXAPAY_MERCHANT_API_KEY` — OxaPay Merchant API key. The checkout endpoint also accepts the existing Vercel variable name `XAUHU-API-KEY`.

Set values under Vercel Project → Settings → Environment Variables, then redeploy. Keep merchant keys server-side; never put them in frontend code or share them in chat.

## Buy flow

`POST /api/checkout` fetches the latest Silvex catalog server-side, matches the requested product ID, calculates the existing 20% markup server-side, creates an OxaPay USD invoice, validates that the returned hosted URL is HTTPS on an OxaPay domain, and returns it for the browser to open. The browser cannot submit its own amount. The OxaPay key is only used on the server.

## Important limitations before taking real orders

- A created invoice/payment page does not itself verify payment, credit an internal wallet, create an order record, or deliver a product. This implementation deliberately does not claim payment success. Add and test an OxaPay HMAC-verified webhook plus persistent order storage and the provider's fulfillment integration before promising automatic delivery.
- Confirm with OxaPay whether the configured merchant key supports the current invoice API and confirm the exact provider response in a sandbox first.
- Confirm Silvex product price currency and reseller terms. The current storefront applies a 20% markup; the OxaPay invoice is denominated in USD.
- Product images appear only if the product API supplies image URLs.

There is no signup/login, wallet balance, or local balance in this version.
