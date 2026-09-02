import { isValidSession } from '../utils/auth.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function supabase(context, path, options = {}) {
  const base = context.env.SUPABASE_URL || 'https://jvgqvtnqncelbhuordzy.supabase.co';
  const key = context.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ist nicht eingerichtet.');
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(options.headers || {}) };
  const response = await fetch(`${base}/rest/v1/${path}`, { ...options, headers });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase HTTP ${response.status}`);
  return text ? JSON.parse(text) : null;
}

export async function onRequest(context) {
  if (!(await isValidSession(context.request, context.env.ADMIN_PASSWORD))) return json({ ok: false, error: 'Nicht autorisiert.' }, 401);
  try {
    if (context.request.method === 'GET') {
      const [wars, members, clanMembers] = await Promise.all([
        supabase(context, 'clan_wars?select=*&order=created_at.desc'),
        supabase(context, 'clan_war_members?select=*&order=id.asc'),
        supabase(context, 'clan_members?select=id,name,role&active=eq.true&order=name.asc')
      ]);
      return json({ ok: true, wars, members, clanMembers });
    }
    if (!['POST', 'PATCH', 'DELETE'].includes(context.request.method)) return json({ ok: false, error: 'Methode nicht erlaubt.' }, 405);
    const body = await context.request.json();
    const table = body?.table === 'clan_wars' ? 'clan_wars' : body?.table === 'clan_war_members' ? 'clan_war_members' : null;
    if (!table) return json({ ok: false, error: 'Ungültige Tabelle.' }, 400);
    const id = body?.id;
    const payload = body?.data || {};
    if (context.request.method === 'DELETE') {
      if (id == null) return json({ ok: false, error: 'ID fehlt.' }, 400);
      await supabase(context, `${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    } else if (context.request.method === 'PATCH') {
      if (id == null) return json({ ok: false, error: 'ID fehlt.' }, 400);
      await supabase(context, `${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      await supabase(context, table, { method: 'POST', body: JSON.stringify(payload) });
    }
    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: error?.message || 'Serverfehler.' }, 500);
  }
}
