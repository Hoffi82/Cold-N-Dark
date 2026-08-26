/* Cold N' Dark – Web-Push Client
 * Die VAPID Public Key darf im Frontend stehen.
 * Der private VAPID-Key darf niemals hier gespeichert werden.
 */

const CND_VAPID_PUBLIC_KEY = 'BGzFlDGmXbvCd-tMKYnYUZD9aPHxPLaYGl0jodSSZFfZf2Dgxe7b6vj-CzM1qBMWBMF2XH3kYt1nQTgg6poOGFY';
const CND_VAPID_KEY_VERSION = 'v3';
const CND_SW_PATH = './service-worker.js';
const CND_PUSH_STORAGE = 'cnd_push_enabled_v2';
const CND_PUSH_KEY_STORAGE = 'cnd_push_vapid_key_version';

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

function keyVersion() {
  try { return localStorage.getItem(CND_PUSH_KEY_STORAGE); } catch (_) { return null; }
}

function saveKeyVersion() {
  try { localStorage.setItem(CND_PUSH_KEY_STORAGE, CND_VAPID_KEY_VERSION); } catch (_) {}
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

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      saveLocalState(false);
      return { enabled: false, permission, subscribed: false, localTest: false };
    }

    const registration = await getRegistration();
    await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // Wenn sich der VAPID-Key geändert hat, muss die alte Subscription weg.
    if (subscription && keyVersion() !== CND_VAPID_KEY_VERSION) {
      try { await subscription.unsubscribe(); } catch (_) {}
      subscription = null;
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(CND_VAPID_PUBLIC_KEY)
      });
    }

    saveLocalState(true);
    saveKeyVersion();

    let localTest = false;
    try {
      await registration.showNotification("Cold N' Dark", {
        body: '🔔 Push-Test erfolgreich – Benachrichtigungen sind auf diesem Gerät aktiviert.',
        icon: './Clan%20logo.png',
        badge: './Clan%20logo.png',
        tag: 'cold-n-dark-local-test',
        data: { url: './app.html' }
      });
      localTest = true;
    } catch (_) {}

    return {
      enabled: true,
      permission,
      subscribed: !!subscription,
      subscription,
      endpoint: subscription.endpoint,
      localTest
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
  }
};
