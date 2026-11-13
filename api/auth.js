module.exports = async function handler(req, res) {
  const baseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  function send(status, body) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json(body);
  }
  function sessionCookie(token, maxAge) {
    const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `xauhu_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
  }
  function clearSession() {
    const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `xauhu_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  }
  function getSession(req) {
    const cookies = String(req.headers.cookie || '').split(';');
    const item = cookies.find(value => value.trim().startsWith('xauhu_session='));
    if (!item) return '';
    try { return decodeURIComponent(item.trim().slice('xauhu_session='.length)); }
    catch { return ''; }
  }
  function sameOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return true;
    try { return new URL(origin).host === req.headers.host; }
    catch { return false; }
  }

  if (!baseUrl || !anonKey) {
    return send(503, { error: 'Authentication is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel settings.' });
  }

  if (req.method === 'GET' && req.query?.action === 'me') {
    const token = getSession(req);
    if (!token) return send(200, { user: null });
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        clearSession();
        return send(200, { user: null });
      }
      const user = await response.json();
      return send(200, { user: { id: user.id, email: user.email, name: user.user_metadata?.display_name || '' } });
    } catch (error) {
      console.error('Auth session check failed:', error);
      return send(502, { error: 'Could not verify the session. Try again.' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return send(405, { error: 'Method not allowed' });
  }
  if (!sameOrigin(req)) return send(403, { error: 'Cross-origin request rejected.' });

  const action = req.body?.action;
  if (action === 'logout') {
    const token = getSession(req);
    clearSession();
    if (token) {
      try {
        await fetch(`${baseUrl.replace(/\/$/, '')}/auth/v1/logout`, {
          method: 'POST',
          headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Auth sign-out request failed:', error);
      }
    }
    return send(200, { ok: true });
  }

  if (action !== 'signup' && action !== 'login') return send(400, { error: 'Unknown authentication action.' });
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const name = String(req.body?.name || '').trim().slice(0, 80);
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return send(400, { error: 'Enter a valid email address.' });
  if (password.length < 10 || password.length > 128) return send(400, { error: 'Password must be 10–128 characters.' });
  if (action === 'signup' && !name) return send(400, { error: 'Enter your name.' });

  const endpoint = action === 'signup'
    ? `${baseUrl.replace(/\/$/, '')}/auth/v1/signup`
    : `${baseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
  const payload = action === 'signup'
    ? { email, password, data: { display_name: name } }
    : { email, password };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status === 429 ? 429 : 400;
      const message = action === 'login'
        ? 'Email or password is incorrect.'
        : (response.status === 429 ? 'Too many attempts. Please wait and try again.' : 'Could not create account. Check the details and try again.');
      return send(status, { error: message });
    }
    if (result.access_token) {
      const age = Math.max(60, Math.min(Number(result.expires_in) || 3600, 86400));
      sessionCookie(result.access_token, age);
      return send(200, { user: { id: result.user?.id, email: result.user?.email, name: result.user?.user_metadata?.display_name || name }, message: action === 'signup' ? 'Account created.' : 'Signed in.' });
    }
    return send(200, { user: null, needsEmailConfirmation: true, message: 'Account created. Check your email to confirm it, then sign in.' });
  } catch (error) {
    console.error('Auth provider request failed:', error);
    return send(502, { error: 'Authentication service is temporarily unavailable.' });
  }
};
