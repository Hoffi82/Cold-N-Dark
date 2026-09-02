import { isValidSession } from '../utils/auth.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function supabaseRequest(env, path, options = {}) {
  const base = String(env?.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(env?.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!base || !key) throw new Error('Supabase-Speicher ist serverseitig nicht konfiguriert.');
  return fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function authorized(context) {
  return isValidSession(context.request, context.env?.ADMIN_PASSWORD);
}

export async function onRequestGet(context) {
  if (!(await authorized(context))) return json({ ok: false, error: 'Nicht autorisiert.' }, 401);
  try {
    const response = await supabaseRequest(context.env, 'clan_members?select=id,name,role,trophies,town_hall_level,sort_order,active,created_at,updated_at&order=sort_order.asc,id.asc');
    if (!response.ok) return json({ ok: false, error: 'Mitglieder konnten nicht geladen werden.' }, 502);
    return json({ ok: true, members: await response.json() });
  } catch (error) {
    return json({ ok: false, error: error?.message || 'Mitglieder konnten nicht geladen werden.' }, 500);
  }
}

export async function onRequestPost(context) {
  if (!(await authorized(context))) return json({ ok: false, error: 'Nicht autorisiert.' }, 401);

  let payload;
  try { payload = await context.request.json(); }
  catch { return json({ ok: false, error: 'Ungültige Anfrage.' }, 400); }

  const action = String(payload?.action || '');
  try {
    if (action === 'create') {
      const name = String(payload?.name || '').trim().slice(0, 40);
      const role = String(payload?.role || 'member');
      const trophies = Math.max(0, Number(payload?.trophies || 0));
      const townHallLevel = Math.min(18, Math.max(1, Number(payload?.townHallLevel || 18)));
      if (!name) return json({ ok: false, error: 'Spielername fehlt.' }, 400);
      if (!['member','admin','coLeader','leader'].includes(role)) return json({ ok: false, error: 'Ungültige Rolle.' }, 400);
      const response = await supabaseRequest(context.env, 'clan_members', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ name, role, trophies, town_hall_level: townHallLevel, active: true })
      });
      if (!response.ok) return json({ ok: false, error: `Mitglied konnte nicht angelegt werden (HTTP ${response.status}).` }, 502);
      return json({ ok: true, message: `${name} wurde hinzugefügt.`, member: (await response.json())[0] || null });
    }

    if (action === 'update') {
      const id = String(payload?.id || '').trim();
      if (!id) return json({ ok: false, error: 'Mitglied-ID fehlt.' }, 400);
      const patch = {};
      if (payload.name !== undefined) patch.name = String(payload.name || '').trim().slice(0, 40);
      if (payload.role !== undefined) {
        const role = String(payload.role);
        if (!['member','admin','coLeader','leader'].includes(role)) return json({ ok: false, error: 'Ungültige Rolle.' }, 400);
        patch.role = role;
      }
      if (payload.trophies !== undefined) patch.trophies = Math.max(0, Number(payload.trophies || 0));
      if (payload.townHallLevel !== undefined) patch.town_hall_level = Math.min(18, Math.max(1, Number(payload.townHallLevel || 18)));
      if (payload.active !== undefined) patch.active = Boolean(payload.active);
      patch.updated_at = new Date().toISOString();
      if (patch.name === '') return json({ ok: false, error: 'Spielername fehlt.' }, 400);
      const response = await supabaseRequest(context.env, `clan_members?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch)
      });
      if (!response.ok) return json({ ok: false, error: `Mitglied konnte nicht geändert werden (HTTP ${response.status}).` }, 502);
      const rows = await response.json();
      return json({ ok: true, message: 'Mitglied wurde aktualisiert.', member: rows[0] || null });
    }

    return json({ ok: false, error: 'Unbekannte Aktion.' }, 400);
  } catch (error) {
    return json({ ok: false, error: error?.message || 'Mitglied konnte nicht gespeichert werden.' }, 500);
  }
}
