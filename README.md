# Xauhu AI Shop

A simple product storefront. Customers can browse products without creating an account and follow a product's supplied HTTPS checkout/payment URL.

## Vercel environment variable

Set `SILVEX_API_KEY` in Vercel Project Settings → Environment Variables for the product catalogue API, then redeploy.

## Checkout link behavior

The storefront looks for HTTPS payment-link fields on each product: `checkoutUrl`, `checkout_url`, `checkoutLink`, `checkout_link`, `paymentUrl`, `payment_url`, `paymentLink`, `payment_link`, `purchaseUrl`, `purchase_url`, `buyUrl`, `buy_url`, `orderUrl`, `order_url`, or `links.checkout` / `links.payment`. A Buy now link opens the supplied URL in a new tab. If the API does not include one of these fields, the product displays “Payment link unavailable.” The storefront does not invent a payment URL or collect card details.

Before accepting orders, verify the provider's actual product response and checkout links, final customer prices, payment completion, product delivery, refunds, and support arrangements. Product images also require image URLs in the API response.

## Customer accounts

Signup and login have been removed; customers do not need an account to browse or use a product payment link. `/account.html` redirects to the shop and `/api/auth` is disabled.

## Current limitations

- Payment-link field names must match the provider's actual API response; verify a sample product payload in the provider documentation/dashboard.
- Product price currently displays the API price with a 20% customer markup in the browser. Confirm this matches your reseller agreement and that the provider checkout charges the intended final amount.
- Customer accounts, cart persistence, wallet, and order history are not provided.
