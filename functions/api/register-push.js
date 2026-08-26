function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost({ request, env }) {
  let subscription;
  try {
    subscription = await request.json();
  } catch {
    return json({ ok: false, error: 'Ungültige Anfrage.' }, 400);
  }

  const endpoint = String(subscription?.endpoint || '').trim();
  const p256dh = String(subscription?.keys?.p256dh || '').trim();
  const auth = String(subscription?.keys?.auth || '').trim();

  if (!endpoint || !p256dh || !auth) {
    return json({ ok: false, error: 'Ungültige Push-Subscription.' }, 400);
  }

  const supabaseUrl = String(env?.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = String(env?.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: 'Supabase-Speicher ist serverseitig noch nicht konfiguriert.' }, 503);
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?on_conflict=endpoint`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({ endpoint, p256dh, auth, updated_at: new Date().toISOString() })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Push-Subscription speichern fehlgeschlagen:', response.status, text);
      return json({ ok: false, error: 'Push-Subscription konnte nicht gespeichert werden.' }, 502);
    }

    return json({ ok: true, message: 'Push-Subscription gespeichert.' });
  } catch (error) {
    console.error('Supabase-Verbindung fehlgeschlagen:', error);
    return json({ ok: false, error: 'Supabase-Speicher ist nicht erreichbar.' }, 502);
  }
}
