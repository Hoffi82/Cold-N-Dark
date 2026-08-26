import webpush from 'npm:web-push@3.6.7';
import { isValidSession } from '../utils/auth.js';

const VAPID_PUBLIC_KEY = 'BPtU7frOuV8YW2LV_ZirYYJ1JgHjdEBwNWKWxr30uxb4B-2JytXIepFQ8X_oIyeOgSTWH41KC7BwXCDJv0-T8-E';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function supabaseRequest(env, path, options = {}) {
  const supabaseUrl = String(env?.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = String(env?.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase-Speicher ist serverseitig noch nicht konfiguriert.');

  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

export async function onRequestPost(context) {
  if (!(await isValidSession(context.request, context.env.ADMIN_PASSWORD))) {
    return json({ ok: false, error: 'Nicht autorisiert.' }, 401);
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json({ ok: false, error: 'Ungültige Anfrage.' }, 400);
  }

  const title = String(payload?.title || "Cold N' Dark").trim().slice(0, 80);
  const category = String(payload?.category || '📢 Allgemein').trim().slice(0, 40);
  const body = String(payload?.body || '').trim().slice(0, 300);
  const url = String(payload?.url || './app.html').trim().slice(0, 300);

  if (!body) return json({ ok: false, error: 'Nachricht fehlt.' }, 400);

  const privateKey = context.env.CND_VAPID_PRIVATE_KEY;
  const subject = context.env.CND_VAPID_SUBJECT;
  if (!privateKey || !subject) return json({ ok: false, error: 'VAPID-Secrets fehlen.' }, 503);

  try {
    const response = await supabaseRequest(context.env, 'push_subscriptions?select=endpoint,p256dh,auth');
    if (!response.ok) {
      console.error('Push-Subscriptions konnten nicht geladen werden:', response.status, await response.text());
      return json({ ok: false, error: 'Gespeicherte Push-Geräte konnten nicht geladen werden.' }, 502);
    }

    const subscriptions = await response.json();
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return json({ ok: false, error: 'Es ist noch kein Push-Gerät registriert.' }, 404);
    }

    webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, privateKey);

    let sent = 0;
    let removed = 0;
    const failed = [];

    for (const item of subscriptions) {
      const subscription = {
        endpoint: item.endpoint,
        keys: { p256dh: item.p256dh, auth: item.auth }
      };

      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title,
            body: `${category}: ${body}`,
            url,
            tag: `cold-n-dark-${Date.now()}`
          }),
          { TTL: 300, urgency: 'high' }
        );
        sent++;
      } catch (error) {
        const status = Number(error?.statusCode || 0);
        if (status === 404 || status === 410) {
          const endpoint = encodeURIComponent(item.endpoint);
          const deleteResponse = await supabaseRequest(context.env, `push_subscriptions?endpoint=eq.${endpoint}`, {
            method: 'DELETE',
            headers: { Prefer: 'return=minimal' }
          });
          if (deleteResponse.ok) removed++;
        } else {
          failed.push({ status, endpoint: item.endpoint });
          console.error('Push an ein Gerät fehlgeschlagen:', status, error);
        }
      }
    }

    if (sent === 0 && failed.length > 0) {
      return json({ ok: false, error: 'Der Push konnte an kein registriertes Gerät gesendet werden.', sent, removed, failed: failed.length }, 502);
    }

    return json({
      ok: true,
      message: `Push wurde an ${sent} Gerät${sent === 1 ? '' : 'e'} gesendet${removed ? `, ${removed} alte Registrierung${removed === 1 ? '' : 'en'} entfernt` : ''}.`,
      sent,
      removed,
      failed: failed.length
    });
  } catch (error) {
    console.error('Admin-Push fehlgeschlagen:', error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Push-Versand fehlgeschlagen.' }, 500);
  }
}
