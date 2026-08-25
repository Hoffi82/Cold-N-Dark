import { sendPushNotification } from '@mmmike/web-push/send';

const VAPID_PUBLIC_KEY = 'BHpVx5iUmx4PbCIMaEOMcyB0k1597YLp7bgGik1RndYd2sLrourcaH9rvrKttPusSyZp6zBWUcjF_x5Y-JtimAU';

export async function onRequestPost({ request, env }) {
  try {
    const subscription = await request.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return new Response(JSON.stringify({ ok: false, error: 'Ungültige Push-Subscription.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    if (!env.CND_VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Push-Server ist noch nicht vollständig eingerichtet: CND_VAPID_PRIVATE_KEY fehlt.'
      }), {
        status: 503,
        headers: { 'content-type': 'application/json' }
      });
    }

    const delivered = await sendPushNotification(
      subscription,
      {
        title: "Cold N' Dark",
        body: '🔔 Test-Push erfolgreich! Deine Clan-App kann Push-Nachrichten empfangen.',
        url: './mehr-app.html',
        tag: 'cold-n-dark-test'
      },
      {
        vapid: {
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: env.CND_VAPID_PRIVATE_KEY,
          subject: env.CND_VAPID_SUBJECT || "mailto:cold-n-dark@example.com"
        },
        ttl: 300,
        urgency: 'high'
      }
    );

    return new Response(JSON.stringify({ ok: delivered }), {
      status: delivered ? 200 : 410,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error?.message || 'Push-Versand fehlgeschlagen.' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
