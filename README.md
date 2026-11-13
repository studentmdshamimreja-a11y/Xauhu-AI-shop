# Xauhu AI Shop

A small storefront for AI tools and digital products.

## Customer account setup

The account page is available at `/account.html` (or `/account` if your Vercel deployment serves extensionless static routes). It supports email/password signup, login, session checks, and logout through Supabase Auth. Passwords are never stored by this storefront; the session access token is placed in an `HttpOnly`, `SameSite=Lax` cookie.

Before signup/login can work, configure these environment variables in **Vercel → Project → Settings → Environment Variables** and redeploy:

- `SUPABASE_URL` — your Supabase project URL, e.g. `https://<project-ref>.supabase.co`
- `SUPABASE_ANON_KEY` — the project's public/anon key (do not use a service-role key)

In Supabase Authentication settings, configure the site URL and allowed redirect URLs for your deployed Vercel domain. Turn on email confirmation if you want verified accounts; signup will then ask customers to check their email. Supabase's auth rate limits and password policy also apply.

Until these settings are present, `/api/auth` deliberately returns a configuration error. The customer account page does not create local-only or fake accounts. Sessions use the access-token lifetime returned by Supabase; after it expires, the customer will need to sign in again.

## Product service setup

Set `SILVEX_API_KEY` in Vercel for `/api/products` to load reseller products. Product image display depends on the product API returning an image URL.

## Current limitations

- Checkout/payment and order fulfillment are not implemented.
- Customer wallet, order history, and persisted profiles are not backed by a database.
- Review the provider settings and test signup, email confirmation, login, session expiry, and logout on the deployed site before accepting customers.
