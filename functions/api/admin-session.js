import { isValidSession } from '../utils/auth.js';
export async function onRequestGet(context) {
  const ok = await isValidSession(context.request, context.env?.ADMIN_PASSWORD);
  return new Response(JSON.stringify({ ok }), { status: ok ? 200 : 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
