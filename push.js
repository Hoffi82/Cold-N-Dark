/* Cold N' Dark – Web-Push Client
 * Die VAPID Public Key darf im Frontend stehen.
 * Der private VAPID-Key darf niemals hier gespeichert werden.
 */

const CND_VAPID_PUBLIC_KEY = 'BIezbnPTN27Six53rq_08FVhKxLUx6fe_gJiP4204RKyCd9R5zAsCrmt0NSrk3XpDy2T6_29njYrt4oQhccWgqo';
const CND_SW_PATH = './service-worker.js';
const CND_PUSH_STORAGE = 'cnd_push_enabled_v2';

function base64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Data = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64Data);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

async function getRegistration() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker wird von diesem Browser nicht unterstützt.');
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register(CND_SW_PATH);
}

function saveLocalState(enabled) {
  try {
    if (enabled) localStorage.setItem(CND_PUSH_STORAGE, '1');
    else localStorage.removeItem(CND_PUSH_STORAGE);
  } catch (_) {}
}

function localState() {
  try { return localStorage.getItem(CND_PUSH_STORAGE) === '1'; } catch (_) { return false; }
}

window.CND_PUSH = {
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  },

  async permission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  async enable() {
    if (!this.isSupported()) throw new Error('Push wird von diesem Browser nicht unterstützt.');

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isIOS && !isStandalone) {
      throw new Error('Auf dem iPhone zuerst „Zum Home-Bildschirm hinzufügen“ und die App von dort öffnen.');
    }

    // Die Berechtigungsabfrage erfolgt nur nach dem Klick auf „Aktivieren“.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      saveLocalState(false);
      return { enabled: false, permission, subscribed: false };
    }

    const registration = await getRegistration();
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(CND_VAPID_PUBLIC_KEY)
      });
    }

    saveLocalState(true);

    return {
      enabled: true,
      permission,
      subscribed: !!subscription,
      subscription,
      endpoint: subscription.endpoint
    };
  },

  async status() {
    const permission = await this.permission();
    if (permission === 'unsupported') return { supported: false, permission, subscribed: false, saved: false };

    try {
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      const saved = localState();
      if (subscription) saveLocalState(true);

      return {
        supported: true,
        permission,
        subscribed: !!subscription,
        subscription,
        saved: !!subscription || saved
      };
    } catch (_) {
      return { supported: true, permission, subscribed: false, saved: localState() };
    }
  },

  async localTest() {
    if (!this.isSupported()) throw new Error('Push wird von diesem Browser nicht unterstützt.');
    if (Notification.permission !== 'granted') throw new Error('Push-Berechtigung wurde noch nicht erteilt.');
    const registration = await getRegistration();
    await registration.showNotification("Cold N' Dark", {
      body: '🔔 Test erfolgreich – Benachrichtigungen sind auf diesem Gerät aktiviert.',
      icon: './Clan%20logo.png',
      badge: './Clan%20logo.png',
      tag: 'cold-n-dark-local-test',
      data: { url: './app.html' }
    });
    return true;
  }
};
