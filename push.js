/* Cold N' Dark – echter Web-Push-Client
 * Die VAPID Public Key ist öffentlich und darf im Frontend stehen.
 * Der private VAPID-Key bleibt ausschließlich als Server-Secret.
 */

const CND_VAPID_PUBLIC_KEY = 'BIezbnPTN27Six53rq_08FVhKxLUx6fe_gJiP4204RKyCd9R5zAsCrmt0NSrk3XpDy2T6_29njYrt4oQhccWgqo';

function base64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Data = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64Data);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
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

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { enabled: false, permission, subscribed: false };

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(CND_VAPID_PUBLIC_KEY)
      });
    }

    return {
      enabled: true,
      permission,
      subscribed: !!subscription,
      subscription
    };
  },

  async status() {
    const permission = await this.permission();
    if (permission === 'unsupported') return { supported: false, permission, subscribed: false };

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return {
      supported: true,
      permission,
      subscribed: !!subscription,
      subscription
    };
  }
};
