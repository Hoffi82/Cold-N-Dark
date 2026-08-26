import webpush from 'npm:web-push@3.6.7';
import { isValidSession } from '../utils/auth.js';

const VAPID_PUBLIC_KEY = 'BPtU7frOuV8YW2LV_ZirYYJ1JgHjdEBwNWKWxr30uxb4B-2JytXIepFQ8X_oIyeOgSTWH41KC7BwXCDJv0-T8-E';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost(context) {
  if (!(await isValidSession(context.request, context.env.ADMIN_PASSWORD))) return json({ ok: false, error: 'Nicht autorisiert.' }, 401);

  let payload;
  try { payload = await context.request.json(); } catch { return json({ ok: false, error: 'Ungültige Anfrage.' }, 400); }

  const title = String(payload?.title || "Cold N' Dark").trim().slice(0, 80);
  const category = String(payload?.category || '📢 Allgemein').trim().slice(0, 40);
  const body = String(payload?.body || '').trim().slice(0, 300);
  const url = String(payload?.url || './app.html').trim().slice(0, 300);
  const subscription = payload?.subscription;

  if (!body) return json({ ok: false, error: 'Nachricht fehlt.' }, 400);
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return json({ ok: false, error: 'Keine gültige Push-Subscription übergeben.' }, 400);

  const privateKey = context.env.CND_VAPID_PRIVATE_KEY;
  const subject = context.env.CND_VAPID_SUBJECT;
  if (!privateKey || !subject) return json({ ok: false, error: 'VAPID-Secrets fehlen.' }, 503);

  try {
    webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, privateKey);
    await webpush.sendNotification(subscription, JSON.stringify({ title, body: `${category}: ${body}`, url, tag: `cold-n-dark-${Date.now()}` }), { TTL: 300, urgency: 'high' });
    return json({ ok: true, message: 'Push wurde erfolgreich gesendet.' });
  } catch (error) {
    console.error('Admin-Push fehlgeschlagen:', error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'Push-Versand fehlgeschlagen.' }, 500);
  }
}
