import { createSession, sessionCookie } from '../utils/auth.js';

export async function onRequestPost(context) {
  const secret = context.env.ADMIN_PASSWORD;
  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: 'ADMIN_PASSWORD ist in Cloudflare noch nicht eingerichtet.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await context.request.json();
    const password = String(body?.password || '');
    if (!password || password !== secret) {
      return new Response(JSON.stringify({ ok: false, error: 'Falsches Passwort.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const token = await createSession(secret);
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': sessionCookie(token),
        'Cache-Control': 'no-store'
      }
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Ungültige Anfrage.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
}
