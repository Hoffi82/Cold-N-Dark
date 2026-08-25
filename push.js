/* Cold N' Dark – Push-Client
 * Dieser Client verwaltet nur die Browser-Berechtigung.
 * Der eigentliche Push-Versand kommt später über einen sicheren Server.
 */
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
    if (permission !== 'granted') return { enabled: false, permission };
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return { enabled: true, permission, subscribed: !!subscription };
  },
  async status() {
    const permission = await this.permission();
    if (permission === 'unsupported') return { supported: false, permission };
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return { supported: true, permission, subscribed: !!subscription };
  }
};
